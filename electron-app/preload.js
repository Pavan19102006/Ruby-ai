const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  hideWindow: () => ipcRenderer.send('hide-window'),
  onScreenshotCaptured: (callback) => {
    ipcRenderer.on('screenshot-captured', (event, data) => callback(data));
  }
});
