const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const drivelist = require('drivelist');
const Store = require('electron-store');
const Registry = require('winreg');

const appPath = app.isPackaged 
  ? path.dirname(app.getPath('exe'))
  : app.getAppPath();
  
const configDir = path.join(appPath, 'config');
fs.mkdir(configDir, { recursive: true }).catch(err => {
  console.error('Error creating config directory:', err);
});

const store = new Store({
  cwd: configDir,
  defaults: {
    settings: {
      steam3Id: '',
      language: 'english',
      countryCode: 'us',
      supportedLanguage: '0',
      steamPath: ''
    }
  }
});

let mainWindow;
let steamPath = store.get('settings.steamPath');

const findSteamPathRegistry = () => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve(null);
    }
    const regKey = new Registry({
      hive: Registry.HKCU,
      key: '\\Software\\Valve\\Steam'
    });
    regKey.get('SteamPath', (err, item) => {
      if (err || !item || !item.value) {
        console.log('SteamPath not found in HKCU. Trying HKLM...');
        const regKeyLM = new Registry({
          hive: Registry.HKLM,
          key: '\\Software\\WOW6432Node\\Valve\\Steam'
        });
        regKeyLM.get('InstallPath', (errLM, itemLM) => {
          if (errLM || !itemLM || !itemLM.value) {
            console.log('InstallPath not found in HKLM.');
            resolve(null);
          } else {
            console.log(`Found Steam via HKLM Registry: ${itemLM.value}`);
            resolve(itemLM.value);
          }
        });
      } else {
        console.log(`Found Steam via HKCU Registry: ${item.value}`);
        resolve(item.value);
      }
    });
  });
};

const findSteamPathFallback = async () => {
  const drives = await drivelist.list();
  for (const drive of drives) {
    for (const mountpoint of drive.mountpoints) {
      const possiblePaths = [
        path.join(mountpoint.path, 'Program Files (x86)', 'Steam'),
        path.join(mountpoint.path, 'Program Files', 'Steam'),
        path.join(mountpoint.path, 'Steam'),
      ];
      for (const possiblePath of possiblePaths) {
        try {
          await fs.access(possiblePath);
          console.log(`Found Steam via fallback search: ${possiblePath}`);
          return possiblePath;
        } catch (err) {}
      }
    }
  }
  return null;
};

const findSteamPath = async () => {
    if (steamPath) {
        try {
            await fs.access(steamPath);
            console.log(`Using stored Steam path: ${steamPath}`);
            return steamPath;
        } catch (e) {
            console.log('Stored Steam path is invalid, searching again.');
        }
    }
    let foundPath = await findSteamPathRegistry();
    if (!foundPath) {
        foundPath = await findSteamPathFallback();
    }
    if (foundPath) {
        steamPath = foundPath.replace(/\//g, '\\');
        store.set('settings.steamPath', steamPath);
    } else {
        console.error('Steam installation path not found automatically.');
    }
    return foundPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 820,
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

ipcMain.on('start-process', async (event, { steam3Id, language, countryCode, supportedLanguage }) => {
  store.set('settings.steam3Id', steam3Id);
  store.set('settings.language', language);
  store.set('settings.countryCode', countryCode);
  store.set('settings.supportedLanguage', supportedLanguage);
  
  const currentSteamPath = await findSteamPath();
  const { main } = require('./index.js');
  main(steam3Id, language, countryCode, supportedLanguage, (progress, status) => {
    event.reply('process-update', { progress, status });
  }, currentSteamPath);
});

ipcMain.on('minimize-window', () => mainWindow?.minimize());
ipcMain.on('close-window', () => mainWindow?.close());

ipcMain.handle('get-steam-path', findSteamPath);

ipcMain.handle('select-steam-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select your Steam installation folder'
    });
    if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        try {
            await fs.access(path.join(selectedPath, 'steam.exe'));
            steamPath = selectedPath;
            store.set('settings.steamPath', steamPath);
            return steamPath;
        } catch (e) {
            return null;
        }
    }
    return null;
});


ipcMain.handle('get-userdata-ids', async () => {
  const currentSteamPath = await findSteamPath();
  if (!currentSteamPath) {
    return [];
  }
  const userdataPath = path.join(currentSteamPath, 'userdata');
  try {
    await fs.access(userdataPath);
    const folders = await fs.readdir(userdataPath);
    return folders.filter(folder => /^\d+$/.test(folder));
  } catch (err) {
    return [];
  }
});

ipcMain.handle('is-steam-running', async () => {
  try {
    const psList = await import('ps-list');
    const processes = await psList.default();
    return processes.some(process => process.name.toLowerCase() === 'steam.exe');
  } catch (e) {
      console.error("Failed to check for Steam process:", e);
      return false;
  }
});

ipcMain.handle('get-settings', () => {
  return store.get('settings');
});