const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Video operations
  importVideo: (filePath) => ipcRenderer.invoke('video:import', filePath),
  exportVideo: (config) => ipcRenderer.invoke('video:export', config),
  getVideoMetadata: (filePath) => ipcRenderer.invoke('video:getMetadata', filePath),
  transcribeVideo: ({ inputPath, apiKey }) => ipcRenderer.invoke('video:transcribe', { inputPath, apiKey }),
  
  // File dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:open', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),
  
  // Recording
  getRecorderSources: () => ipcRenderer.invoke('recorder:getSources'),
  getAudioInputDevices: () => ipcRenderer.invoke('recorder:getAudioInputDevices'),
  // Streaming recording handlers (send chunks as they arrive, avoid memory accumulation)
  initStreamingFile: ({ fileName }) => {
    return ipcRenderer.invoke('recorder:initTempFile', { fileName });
  },
  writeStreamingChunk: ({ tempFilePath, chunk }) => {
    return ipcRenderer.invoke('recorder:writeChunk', { tempFilePath, chunk, offset: 0, isLast: false });
  },
  finalizeStreamingFile: ({ tempFilePath }) => {
    return ipcRenderer.invoke('recorder:finalizeTempFile', { tempFilePath });
  },
  // Save blob to temp file (avoids base64 IPC for large files/audio)
  saveBlobToTempFile: async ({ blob, fileName }) => {
    // Convert blob to array buffer, then to base64 chunks if needed
    // Or better: use a streaming approach
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const arrayBuffer = reader.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          const chunkSize = 256 * 1024; // 256KB chunks - even safer for IPC
          
          // First, create the temp file
          const initResult = await ipcRenderer.invoke('recorder:initTempFile', { fileName });
          if (!initResult.success) {
            throw new Error(initResult.error || 'Failed to initialize temp file');
          }
          
          const tempFilePath = initResult.tempFilePath;
          
          // Send data in chunks (use smaller chunks and add delays to prevent IPC overload)
          const totalChunks = Math.ceil(uint8Array.length / chunkSize);
          let chunkIndex = 0;
          
          for (let offset = 0; offset < uint8Array.length; offset += chunkSize) {
            chunkIndex++;
            const chunk = uint8Array.slice(offset, offset + chunkSize);
            
            // Convert chunk to regular array (small enough to be safe)
            // Use spread operator which might be more memory efficient
            const chunkArray = [...chunk];
            
            try {
              const chunkResult = await ipcRenderer.invoke('recorder:writeChunk', {
                tempFilePath,
                chunk: chunkArray,
                offset,
                isLast: offset + chunkSize >= uint8Array.length
              });
              
              if (!chunkResult.success) {
                throw new Error(chunkResult.error || 'Failed to write chunk');
              }
              
              // Add small delay every 10 chunks to prevent IPC overload
              if (chunkIndex % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            } catch (chunkErr) {
              console.error(`Error writing chunk ${chunkIndex}/${totalChunks}:`, chunkErr);
              throw chunkErr;
            }
          }
          
          // Finalize the file
          const finalResult = await ipcRenderer.invoke('recorder:finalizeTempFile', { tempFilePath });
          if (!finalResult.success) {
            throw new Error(finalResult.error || 'Failed to finalize temp file');
          }
          
          resolve({ success: true, tempFilePath, fileSize: finalResult.fileSize });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsArrayBuffer(blob);
    });
  },
  // Save temp file to final location (convert if needed)
  saveBlobFile: ({ tempFilePath, finalFilePath, convertToMp4 }) => {
    return ipcRenderer.invoke('recorder:saveBlobFile', {
      tempFilePath,
      finalFilePath,
      convertToMp4: convertToMp4 !== false
    });
  },
  saveRecordingFile: ({ filePath, base64Data, convertToMp4 }) => {
    // Strict validation before sending through IPC to prevent "bad IPC message" errors
    if (!filePath || typeof filePath !== 'string' || filePath.length === 0) {
      return Promise.reject(new Error('Invalid file path'));
    }
    if (!base64Data || typeof base64Data !== 'string' || base64Data.length === 0) {
      return Promise.reject(new Error('Invalid or empty base64 data'));
    }
    
    // Strict size limit - reject anything over 8MB base64 to absolutely prevent crashes
    if (base64Data.length > 8 * 1024 * 1024) {
      return Promise.reject(new Error(`File too large for IPC (${(base64Data.length / 1024 / 1024).toFixed(2)}MB base64). Maximum is 8MB. Record a shorter clip.`));
    }
    
    // Validate base64 format strictly
    if (!/^[A-Za-z0-9+\/]*={0,2}$/.test(base64Data)) {
      console.error('Invalid base64 detected. Length:', base64Data.length, 'First 100 chars:', base64Data.substring(0, 100));
      return Promise.reject(new Error('Invalid base64 data format'));
    }
    
    try {
      return ipcRenderer.invoke('recorder:saveFile', { 
        filePath: String(filePath).trim(), 
        base64Data: String(base64Data), 
        convertToMp4: convertToMp4 !== false // default true
      });
    } catch (ipcErr) {
      console.error('IPC invoke error:', ipcErr);
      return Promise.reject(new Error(`IPC communication failed: ${ipcErr.message}`));
    }
  },
  
  // Export progress
  onExportProgress: (callback) => {
    ipcRenderer.on('export:progress', (event, progress) => callback(progress));
  },
  
  // Platform info
  platform: process.platform,
});

