const { app, BrowserWindow, ipcMain, dialog, desktopCapturer } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { exec } = require('child_process');
const FormData = require('form-data');
require('dotenv').config();

// In CommonJS, __dirname is already available automatically

// Set FFmpeg paths for packaged app
const isDev = !app.isPackaged;
if (!isDev) {
  // In production, FFmpeg should be in PATH
  // We'll rely on system FFmpeg installation
  console.log('Production mode: Using system FFmpeg');
} else {
  console.log('Development mode');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security to allow file:// protocol
      allowRunningInsecureContent: true,
    },
    titleBarStyle: 'hiddenInset', // macOS style
  });

  // Always try to load from dev server first, fallback to production build
  const isDev = !app.isPackaged;
  
  if (isDev) {
    console.log('Loading from Vite dev server: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Loading from production build');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
console.log('Electron main process started');

// Handle video metadata extraction
ipcMain.handle('video:getMetadata', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    // Check if ffprobe is available
    ffmpeg.getAvailableEncoders((err, encoders) => {
      if (err) {
        console.log('FFmpeg not available, returning placeholder metadata');
        // Return placeholder metadata if FFmpeg is not installed
        resolve({
          duration: 10, // Placeholder duration
          resolution: 'Unknown',
          fileSize: 0,
          format: 'mp4',
          hasAudio: true,
        });
        return;
      }
      
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('Error probing video:', err);
          // Try to get file stats as fallback
          let fileSize = 0;
          try {
            const stats = fs.statSync(filePath);
            fileSize = stats.size;
          } catch (statErr) {
            console.warn('Could not get file stats:', statErr);
          }
          
          // Return placeholder on error
          resolve({
            duration: 10,
            resolution: 'Unknown',
            fileSize: fileSize,
            format: filePath.toLowerCase().endsWith('.webm') ? 'webm' : 'mp4',
            hasAudio: true,
          });
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
          
          // Ensure duration is valid
          let duration = metadata.format.duration;
          if (!duration || isNaN(duration) || duration <= 0) {
            // Try to calculate from video stream if available
            if (videoStream && videoStream.duration) {
              duration = parseFloat(videoStream.duration);
            } else {
              duration = 10; // Default fallback
            }
          }
          
          const result = {
            duration: Math.ceil(duration),
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'Unknown',
            fileSize: metadata.format.size || 0,
            format: metadata.format.format_name?.split(',')[0] || (filePath.toLowerCase().endsWith('.webm') ? 'webm' : 'mp4'),
            hasAudio: !!audioStream,
          };
          
          console.log('Video metadata:', result);
          resolve(result);
        }
      });
    });
  });
});

// Handle file open dialog
ipcMain.handle('dialog:open', async (event, options) => {
  console.log('Dialog open requested');
  const result = await dialog.showOpenDialog(mainWindow, {
    ...options,
    title: options.title || 'Select Files',
  });
  console.log('Dialog result:', result);
  return result;
});

// Handle file save dialog
ipcMain.handle('dialog:save', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    ...options,
    title: options.title || 'Save File',
  });
  return result;
});

// Handle export video
ipcMain.handle('video:export', async (event, config) => {
  console.log('Export video called with config:', config);
  
  return new Promise((resolve, reject) => {
    // Check if FFmpeg is available
    ffmpeg.getAvailableEncoders((err, encoders) => {
      if (err) {
        console.error('FFmpeg not available:', err);
        resolve({ 
          success: false, 
          message: 'FFmpeg not found. Please install FFmpeg: brew install ffmpeg' 
        });
        return;
      }
      
      // Support both timeline clips and direct trim export
      let inputPath, outputPath, inPoint, outPoint;
      
      if (config.inputPath) {
        // Direct trim export (from trim button)
        inputPath = config.inputPath;
        outputPath = config.outputPath;
        inPoint = config.startTime || 0;
        outPoint = config.endTime || 0;
      } else {
        // Export from timeline clips
        const timelineClips = config.timelineClips || [];
        
        if (timelineClips.length === 0) {
          resolve({ 
            success: false, 
            message: 'No clips on timeline to export' 
          });
          return;
        }
        
        const firstClip = timelineClips[0];
        
        if (!firstClip.filePath) {
          resolve({ 
            success: false, 
            message: 'Clip missing file path' 
          });
          return;
        }

        inputPath = firstClip.filePath;
        outputPath = config.outputPath;
        inPoint = firstClip.trimStart || firstClip.startTime || 0;
        outPoint = firstClip.trimEnd || (firstClip.startTime + firstClip.duration);
      }
      
      console.log('Starting export from', inputPath, 'to', outputPath);
      
      // Build the FFmpeg command
      let command = ffmpeg(inputPath);
      
      // Apply trim if in/out points are set
      const duration = outPoint - inPoint;
      
      console.log('Trim settings - In:', inPoint, 'Out:', outPoint, 'Duration:', duration);
      
      if (duration > 0) {
        command.seekInput(inPoint);
        command.duration(duration);
      }
      
      const ffmpegCommand = command
        .on('start', (cmdline) => {
          console.log('FFmpeg started:', cmdline);
        })
        .on('progress', (progress) => {
          // Send progress updates to renderer
          event.sender.send('export:progress', progress.percent || 0);
        })
        .on('end', () => {
          console.log('Export finished');
          resolve({ success: true, message: 'Export completed successfully!', outputPath });
        })
        .on('error', (err) => {
          console.error('Export error:', err);
          reject(new Error(`Export failed: ${err.message}`));
        });
      
      // Apply settings based on config
      if (config.resolution !== 'source') {
        if (config.resolution === '1080p') {
          ffmpegCommand.size('1920x1080');
        } else if (config.resolution === '720p') {
          ffmpegCommand.size('1280x720');
        } else if (config.resolution === '480p') {
          ffmpegCommand.size('640x480');
        }
      }
      
      ffmpegCommand.output(outputPath).run();
    });
  });
});

// Get OpenAI API key from environment
ipcMain.handle('getOpenAIApiKey', async () => {
  return process.env.OPENAI_API_KEY || '';
});

// Handle transcription
ipcMain.handle('video:transcribe', async (event, { inputPath, apiKey }) => {
  console.log('Transcription requested for:', inputPath);
  
  return new Promise(async (resolve, reject) => {
    try {
      // Step 1: Extract audio from video using FFmpeg
      const tempDir = app.getPath('temp');
      const audioFile = path.join(tempDir, `audio_${Date.now()}.mp3`);
      
      console.log('Extracting audio to:', audioFile);
      
      ffmpeg(inputPath)
        .output(audioFile)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .on('end', async () => {
          console.log('Audio extraction complete');
          
          try {
            // Step 2: Send audio to OpenAI Whisper API
            const fileStats = fs.statSync(audioFile);
            const fileSize = fileStats.size;
            
            console.log('File size:', fileSize, 'bytes');
            
            // Check if file is too large (>25MB)
            const maxSize = 25 * 1024 * 1024; // 25MB in bytes
            if (fileSize > maxSize) {
              reject(new Error('Audio file is too large (>25MB). Please use a shorter video.'));
              return;
            }
            
            // Read the audio file
            const audioBuffer = fs.readFileSync(audioFile);
            
            // Create form data
            const form = new FormData();
            form.append('file', audioBuffer, {
              filename: 'audio.mp3',
              contentType: 'audio/mpeg'
            });
            form.append('model', 'whisper-1');
            form.append('response_format', 'verbose_json');
            
            console.log('Sending to OpenAI Whisper API...');
            
            // Dynamic import for node-fetch (ES Module)
            const { default: fetch } = await import('node-fetch');
            
            // Send to OpenAI Whisper API
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                ...form.getHeaders()
              },
              body: form
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Transcription API error:', errorText);
              reject(new Error(`Transcription failed: ${response.statusText}`));
              return;
            }
            
            const result = await response.json();
            console.log('Transcription result:', result);
            
            // Clean up temp file
            fs.unlinkSync(audioFile);
            
            resolve({
              success: true,
              text: result.text,
              segments: result.segments || []
            });
            
          } catch (error) {
            console.error('Transcription error:', error);
            // Clean up temp file
            if (fs.existsSync(audioFile)) {
              fs.unlinkSync(audioFile);
            }
            reject(error);
          }
        })
        .on('error', (err) => {
          console.error('Audio extraction error:', err);
          reject(err);
        })
        .run();
        
    } catch (error) {
      console.error('Transcription setup error:', error);
      reject(error);
    }
  });
});

// Screen recording handlers
ipcMain.handle('recorder:getSources', async () => {
  try {
    // Request sources with audio support - this enables system audio capture
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 200, height: 200 }
    });
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('Error getting sources:', error);
    return [];
  }
});

// Get available audio input devices (microphones)
ipcMain.handle('recorder:getAudioInputDevices', async () => {
  // Note: This requires calling from renderer with navigator.mediaDevices.enumerateDevices()
  // We'll expose this capability but the actual enumeration happens in renderer
  return { success: true };
});

// Initialize temp file for chunked writing
ipcMain.handle('recorder:initTempFile', async (event, { fileName }) => {
  try {
    const tempDir = app.getPath('temp');
    const tempFilePath = path.join(tempDir, fileName || `temp_recording_${Date.now()}.webm`);
    
    // Create empty file (will be written to chunk by chunk)
    fs.writeFileSync(tempFilePath, Buffer.alloc(0));
    
    console.log('Initialized temp file:', tempFilePath);
    return { success: true, tempFilePath };
  } catch (error) {
    console.error('Error initializing temp file:', error);
    return { success: false, error: error.message };
  }
});

// Write a chunk to the temp file
ipcMain.handle('recorder:writeChunk', async (event, { tempFilePath, chunk, offset, isLast }) => {
  try {
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Temp file does not exist');
    }
    
    // Convert array to Buffer
    const chunkBuffer = Buffer.from(chunk);
    
    // Append chunk to file (simpler and safer than seeking)
    fs.appendFileSync(tempFilePath, chunkBuffer);
    
    return { success: true };
  } catch (error) {
    console.error('Error writing chunk:', error);
    return { success: false, error: error.message };
  }
});

// Finalize temp file and verify
ipcMain.handle('recorder:finalizeTempFile', async (event, { tempFilePath }) => {
  try {
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Temp file does not exist');
    }
    
    const stats = fs.statSync(tempFilePath);
    if (stats.size === 0) {
      throw new Error('Temp file is empty');
    }
    
    console.log('Finalized temp file:', tempFilePath, 'Size:', stats.size);
    return { success: true, fileSize: stats.size };
  } catch (error) {
    console.error('Error finalizing temp file:', error);
    return { success: false, error: error.message };
  }
});

// Save blob file directly (alternative to base64 IPC)
ipcMain.handle('recorder:saveBlobFile', async (event, { tempFilePath, finalFilePath, convertToMp4 = true }) => {
  try {
    if (!tempFilePath || !fs.existsSync(tempFilePath)) {
      throw new Error('Temporary file not found');
    }
    
    const tempStats = fs.statSync(tempFilePath);
    if (tempStats.size === 0) {
      throw new Error('Temporary file is empty');
    }
    
    console.log('Found temp file:', tempFilePath, 'Size:', tempStats.size);
    
    // If converting to MP4, convert the temp file
    if (convertToMp4 || finalFilePath.toLowerCase().endsWith('.mp4')) {
      const mp4Path = finalFilePath.toLowerCase().endsWith('.mp4') 
        ? finalFilePath 
        : finalFilePath.replace(/\.webm$/i, '.mp4');
      
      console.log('Converting to MP4:', tempFilePath, '->', mp4Path);
      
      return new Promise((resolve, reject) => {
        ffmpeg(tempFilePath)
          .output(mp4Path)
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('end', () => {
            try {
              const outputStats = fs.statSync(mp4Path);
              if (outputStats.size === 0) {
                reject(new Error('Conversion produced empty file'));
                return;
              }
              
              // Clean up temp file
              try {
                fs.unlinkSync(tempFilePath);
              } catch (e) {
                console.warn('Could not delete temp file:', e);
              }
              
              resolve({ success: true, filePath: mp4Path, fileSize: outputStats.size });
            } catch (statErr) {
              reject(new Error(`Failed to verify output: ${statErr.message}`));
            }
          })
          .on('error', (err) => {
            console.error('Conversion error:', err);
            // If conversion fails, just copy temp file to final location
            try {
              fs.copyFileSync(tempFilePath, finalFilePath);
              const stats = fs.statSync(finalFilePath);
              resolve({ success: true, filePath: finalFilePath, fileSize: stats.size });
            } catch (copyErr) {
              reject(new Error(`Conversion failed: ${err.message}`));
            }
          })
          .run();
      });
    } else {
      // Just move temp file to final location
      fs.renameSync(tempFilePath, finalFilePath);
      const stats = fs.statSync(finalFilePath);
      return { success: true, filePath: finalFilePath, fileSize: stats.size };
    }
  } catch (error) {
    console.error('Error in saveBlobFile:', error);
    return { success: false, error: error.message };
  }
});

// Save recording file from base64 and optionally convert to MP4
ipcMain.handle('recorder:saveFile', async (event, { filePath, base64Data, convertToMp4 = true }) => {
  try {
    // Validate inputs
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Invalid base64 data');
    }
    
    // Check base64 string length (sanity check)
    if (base64Data.length === 0) {
      throw new Error('Empty base64 data');
    }
    
    // Validate base64 format (basic check)
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(base64Data)) {
      throw new Error('Invalid base64 format');
    }
    
    // Always save as temp webm first, then convert if needed
    const tempWebmPath = filePath.replace(/\.(webm|mp4)$/i, '.temp.webm');
    
    // Write the webm file first
    console.log('Writing temp WebM file:', tempWebmPath);
    console.log('Base64 data length:', base64Data.length, 'characters');
    
    let buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch (bufferErr) {
      console.error('Failed to create buffer from base64:', bufferErr);
      throw new Error(`Failed to decode base64: ${bufferErr.message}`);
    }
    
    console.log('Buffer size:', buffer.length, 'bytes');
    
    if (buffer.length === 0) {
      throw new Error('No data to write - buffer is empty');
    }
    
    fs.writeFileSync(tempWebmPath, buffer);
    
    // Verify file was written
    const tempStats = fs.statSync(tempWebmPath);
    console.log('Temp WebM file size:', tempStats.size, 'bytes');
    
    if (tempStats.size === 0) {
      throw new Error('Failed to write file - file size is 0');
    }
    
    // If converting to MP4 (default) or if file extension is .mp4, convert
    if (convertToMp4 || filePath.toLowerCase().endsWith('.mp4')) {
      // Determine output path - use .mp4 extension
      const mp4Path = filePath.toLowerCase().endsWith('.mp4') 
        ? filePath 
        : filePath.replace(/\.webm$/i, '.mp4');
      
      console.log('Converting WebM to MP4:', tempWebmPath, '->', mp4Path);
      
      return new Promise((resolve, reject) => {
        ffmpeg(tempWebmPath)
          .output(mp4Path)
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('start', (cmdline) => {
            console.log('FFmpeg conversion started:', cmdline);
          })
          .on('progress', (progress) => {
            console.log('Conversion progress:', progress.percent, '%');
          })
          .on('end', () => {
            console.log('Conversion completed');
            
            // Verify output file exists and has size
            try {
              const outputStats = fs.statSync(mp4Path);
              console.log('Output MP4 file size:', outputStats.size, 'bytes');
              
              if (outputStats.size === 0) {
                reject(new Error('Conversion produced empty file'));
                return;
              }
              
              // Delete temp webm file
              try {
                fs.unlinkSync(tempWebmPath);
              } catch (err) {
                console.warn('Could not delete temp webm file:', err);
              }
              
              resolve({ success: true, filePath: mp4Path, fileSize: outputStats.size });
            } catch (statErr) {
              reject(new Error(`Failed to verify output file: ${statErr.message}`));
            }
          })
          .on('error', (err) => {
            console.error('Conversion error:', err);
            // If conversion fails, rename temp file to original path
            try {
              if (fs.existsSync(tempWebmPath)) {
                fs.renameSync(tempWebmPath, filePath);
                const stats = fs.statSync(filePath);
                resolve({ success: true, filePath: filePath, fileSize: stats.size });
              } else {
                reject(new Error(`Conversion failed and temp file missing: ${err.message}`));
              }
            } catch (renameErr) {
              console.error('Error renaming temp file:', renameErr);
              reject(new Error(`Conversion failed: ${err.message}`));
            }
          })
          .run();
      });
    } else {
      // Just rename temp file if not converting
      fs.renameSync(tempWebmPath, filePath);
      const stats = fs.statSync(filePath);
      return { success: true, filePath: filePath, fileSize: stats.size };
    }
  } catch (error) {
    console.error('Error saving recording file:', error);
    return { success: false, error: error.message };
  }
});
