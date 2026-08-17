import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'MAYUR FIBER DIAGNOSIS',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Setup autoUpdater IPC Events
  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('auto-update-event', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('auto-update-event', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    mainWindow.webContents.send('auto-update-event', {
      status: 'not-available',
      version: info.version
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('auto-update-event', {
      status: 'downloading',
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('auto-update-event', {
      status: 'downloaded',
      version: info.version
    });
  });

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('auto-update-event', {
      status: 'error',
      message: err ? err.message || String(err) : 'Unknown auto-update error'
    });
  });

  // Handle Renderer IPC Messages
  ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdates().catch((err) => {
      mainWindow.webContents.send('auto-update-event', { status: 'error', message: err.message });
    });
  });

  ipcMain.on('start-download-update', () => {
    autoUpdater.downloadUpdate().catch((err) => {
      mainWindow.webContents.send('auto-update-event', { status: 'error', message: err.message });
    });
  });

  ipcMain.on('quit-and-install', () => {
    autoUpdater.quitAndInstall();
  });

  // Native Windows Folder Picker for SQLite FSDP_Database.db
  ipcMain.handle('select-database-folder', async (event) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Folder for MAYUR FIBER DIAGNOSIS Database (FSDP_Database.db)',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'Select Folder'
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const selectedFolder = result.filePaths[0];
      const dbPath = path.join(selectedFolder, 'FSDP_Database.db');
      const exists = fs.existsSync(dbPath);

      return {
        canceled: false,
        folderPath: selectedFolder,
        dbPath: dbPath,
        exists: exists
      };
    } catch (err) {
      console.error('Error selecting database folder:', err);
      return { canceled: true, error: err.message || String(err) };
    }
  });

  // Open Database Folder in Windows Explorer
  ipcMain.handle('open-database-folder', async (event, filePath) => {
    if (!filePath) return false;
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      const dirPath = path.dirname(fullPath);
      if (fs.existsSync(dirPath)) {
        await shell.openPath(dirPath);
        return true;
      } else if (fs.existsSync(fullPath)) {
        shell.showItemInFolder(fullPath);
        return true;
      }
    } catch (e) {
      console.error('Failed to open database folder in Windows Explorer:', e);
    }
    return false;
  });

  // Check if database file exists on disk
  ipcMain.handle('check-database-file-exists', async (event, filePath) => {
    if (!filePath) return false;
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      return fs.existsSync(fullPath);
    } catch (e) {
      return false;
    }
  });

  // Remove menu bar for clean app look, but keep F12 DevTools shortcut
  mainWindow.setMenuBarVisibility(false);

  // Enable Web Serial API permission & auto-select serial port in Electron
  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    if (portList && portList.length > 0) {
      // Automatically connect to the first available COM / Serial port (e.g. ESP32-S3)
      callback(portList[0].portId);
    } else {
      callback('');
    }
  });

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'serial') return true;
    return true;
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') return true;
    return true;
  });

  // Enable F12 to open Developer Tools for debugging if needed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load index.html:', err);
    });
  }
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
