import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'Remix Fiber Source Diagnostic Pro',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
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
