const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const drivelist = require('drivelist');
const Store = require('electron-store');

// Define the base path for the application
const appPath = app.isPackaged 
  ? path.dirname(app.getPath('exe')) // For packaged version, use the directory of the executable
  : app.getAppPath(); // For development, use the app's root directory

// Define the config directory path
const configDir = path.join(appPath, 'config');

// Ensure the config directory exists
fs.mkdir(configDir, { recursive: true }).catch(err => {
  console.error('Error creating config directory:', err);
});

// Initialize the store with custom config directory
const store = new Store({
  cwd: configDir,  // Save the config file in the app directory
  defaults: {
    settings: {
      steam3Id: '',
      language: 'english',
      countryCode: 'us',
      supportedLanguage: '0'
    }
  }
});

let mainWindow;

// Function to find Steam installation path
const findSteamPath = async () => {
  const drives = await drivelist.list();

  for (const drive of drives) {
    const mountpoints = drive.mountpoints;
    for (const mountpoint of mountpoints) {
      const possiblePaths = [
        path.join(mountpoint.path, 'Program Files (x86)', 'Steam'),
        path.join(mountpoint.path, 'Program Files', 'Steam'),
        path.join(mountpoint.path, 'Steam'),
      ];

      for (const possiblePath of possiblePaths) {
        try {
          await fs.access(possiblePath);
          return possiblePath;
        } catch (err) {
          // Skip if folder not found
        }
      }
    }
  }

  return null;
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 780,
    resizable: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    frame: false,
    backgroundColor: '#1b2838'
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('resize', () => {
    mainWindow.webContents.send('window-resized');
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('start-process', (event, { steam3Id, language, countryCode, supportedLanguage }) => {
  // Save settings to store
  store.set('settings', { steam3Id, language, countryCode, supportedLanguage });

  const { main } = require('./index.js');
  main(steam3Id, language, countryCode, supportedLanguage, (progress, status) => {
    event.reply('process-update', { progress, status });
  });
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('get-userdata-ids', async () => {
  const steamPath = await findSteamPath();

  if (!steamPath) {
    return [];
  }

  const userdataPath = path.join(steamPath, 'userdata');

  try {
    await fs.access(userdataPath);
    const folders = await fs.readdir(userdataPath);
    return folders.filter(folder => /^\d+$/.test(folder));
  } catch (err) {
    return [];
  }
});

ipcMain.handle('is-steam-running', async () => {
  const psList = await import('ps-list');
  const processes = await psList.default();
  return processes.some(process => process.name.toLowerCase() === 'steam.exe');
});

// Add this handler to get saved settings
ipcMain.handle('get-settings', () => {
  return store.get('settings');
});