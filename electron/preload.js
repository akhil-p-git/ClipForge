const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Video operations
  importVideo: (filePath) => ipcRenderer.invoke('video:import', filePath),
  exportVideo: (config) => ipcRenderer.invoke('video:export', config),
  
  // File dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:open', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),
  
  // Recording
  getRecorderSources: () => ipcRenderer.invoke('recorder:getSources'),
  startRecording: (config) => ipcRenderer.invoke('recorder:start', config),
  stopRecording: (id) => ipcRenderer.invoke('recorder:stop', id),
  
  // Transcription
  transcribeVideo: (videoPath) => ipcRenderer.invoke('transcription:create', videoPath),
  
  // Export progress
  onExportProgress: (callback) => {
    ipcRenderer.on('export:progress', (event, progress) => callback(progress));
  },
  
  // Platform info
  platform: process.platform,
});

