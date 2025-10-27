const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// In CommonJS, __dirname is already available automatically

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
      
      // For MVP: simple copy/export (will be enhanced)
      const inputPath = config.inputPath || '/path/to/input.mp4';
      const outputPath = config.outputPath || './output.mp4';
      
      console.log('Starting export from', inputPath, 'to', outputPath);
      
      const command = ffmpeg(inputPath)
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
          command.size('1920x1080');
        } else if (config.resolution === '720p') {
          command.size('1280x720');
        } else if (config.resolution === '480p') {
          command.size('640x480');
        }
      }
      
      command.save(outputPath);
    });
  });
});
