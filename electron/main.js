const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

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
  // TODO: Implement actual FFmpeg export
  // For now, just return a success message
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate export time
  return { success: true, message: 'Export completed (stub - FFmpeg not integrated yet)' };
});
