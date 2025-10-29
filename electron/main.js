const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

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
          // Return placeholder on error
          resolve({
            duration: 10,
            resolution: 'Unknown',
            fileSize: 0,
            format: 'mp4',
            hasAudio: true,
          });
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
          
          const result = {
            duration: metadata.format.duration || 10,
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'Unknown',
            fileSize: metadata.format.size || 0,
            format: metadata.format.format_name || 'mp4',
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
