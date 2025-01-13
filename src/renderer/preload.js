const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  startProcess: (steam3Id, language, countryCode, supportedLanguage) => ipcRenderer.send('start-process', { steam3Id, language, countryCode, supportedLanguage }),
  onProcessUpdate: (callback) => ipcRenderer.on('process-update', callback),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  getUserdataIds: () => ipcRenderer.invoke('get-userdata-ids'),
  isSteamRunning: () => ipcRenderer.invoke('is-steam-running'),
  getSettings: () => ipcRenderer.invoke('get-settings')
});