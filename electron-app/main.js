const { app, BrowserWindow, globalShortcut, Tray, Menu, screen, ipcMain, nativeImage, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isVisible = false;

// Server URL - change this if deployed
// For local: http://localhost:3000
// For production: https://your-app.onrender.com
const SERVER_URL = process.env.RUBY_AI_SERVER || 'https://ruby-ai.onrender.com';

// Hide dock icon on macOS to make it a proper utility app
if (process.platform === 'darwin') {
  app.dock.hide();
}

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // Window size
  const windowWidth = 420;
  const windowHeight = 600;

  // Position at right side of screen
  const x = screenWidth - windowWidth - 20;
  const y = Math.floor((screenHeight - windowHeight) / 2);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    // macOS specific - show above fullscreen apps
    visibleOnAllWorkspaces: true,
    fullscreenable: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set window level to float above fullscreen apps on macOS
  if (process.platform === 'darwin') {
    // Use 'screen-saver' level which is the highest and appears above fullscreen
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.setFullScreenable(false);
  }

  mainWindow.loadFile('index.html');

  // Hide instead of close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      hideWindow();
    }
  });

  mainWindow.on('blur', () => {
    // Optional: hide on blur
    // hideWindow();
  });
}

function showWindow() {
  if (mainWindow) {
    // Ensure window appears above fullscreen apps
    if (process.platform === 'darwin') {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
    mainWindow.show();
    mainWindow.focus();
    isVisible = true;
  }
}

function hideWindow() {
  if (mainWindow) {
    mainWindow.hide();
    isVisible = false;
  }
}

function toggleWindow() {
  if (isVisible) {
    hideWindow();
  } else {
    showWindow();
  }
}

function createTray() {
  // Create a simple tray icon
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAABx0lEQVR4nO2Wvy8EQRTHv7tLiMI/4AoJhUKjU4noFKKRKBQKhUIh0UkUCk6hkVDoJBQKyU1CoZNQKBQKnUKhkFBINBKdRO56H5mNu2h2ZnZ3b+/ir5zsy7yZ7/fNzJsJEBERERER/kF0AdgDcAlgnVINYQ4F5gG0KOXYZ0BgBsA+gAGlFMNMAJgCEFFKMUo+ACcALiilmFBCANwhf5TTGPQQhCHwYAPAGYVeYgILAM4BHCCgMawQRPL6JYBRAEMApgHMArBqrQVQBLCrFCoFBYB1ylaCwSgxDmAVgAmgH8AQgASlKvUdkJWlAmkWYBSAFcIUgB0AJpWKA9gEYFBKsQFAkW5OAtwHUE/bsQZgBcCMFKwTRPIbkFwcALAPYJqSB3ABYJxSBuXfAmCB7pOL0wDmAJyhxmCSXAYwR3c5APKBv4qwKqBh2pYADFEMAhik9AOYoHuUg3UKDnhZYALlXyaYVGKVrlNOAAIYBeXfAOCQ4gCfNKNEgfdblFUAAoB2AO2UVm5A9kIJyjGAJhRYBKDRBgRBOQUYANa4/5sAnOIe8E0RCl2BYd4XBLAOYJ3SlFIDrwCwSAe7ADCKe0JExL/nFyCfb/GGFUqiAAAAAElFTkSuQmCC'
  );

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Ruby AI',
      click: showWindow,
      accelerator: 'CommandOrControl+Shift+Space'
    },
    { type: 'separator' },
    {
      label: 'Capture Screenshot',
      click: captureAndShow,
      accelerator: 'CommandOrControl+Shift+S'
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Ruby AI - Press Cmd+Shift+Space');
  tray.setContextMenu(contextMenu);

  tray.on('click', toggleWindow);
}

async function captureAndShow() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail.toDataURL();
      showWindow();

      // Send screenshot to renderer after window is ready
      setTimeout(() => {
        mainWindow.webContents.send('screenshot-captured', screenshot);
      }, 300);
    }
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
  }
}

function registerShortcuts() {
  // Main toggle shortcut: Cmd+Shift+Space
  globalShortcut.register('CommandOrControl+Shift+Space', toggleWindow);

  // Screenshot shortcut: Cmd+Shift+S
  globalShortcut.register('CommandOrControl+Shift+S', captureAndShow);

  // Escape to hide
  globalShortcut.register('Escape', () => {
    if (isVisible) hideWindow();
  });
}

// IPC Handlers
ipcMain.handle('get-server-url', () => SERVER_URL);

ipcMain.handle('capture-screenshot', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  } catch (error) {
    console.error('Screenshot error:', error);
    return null;
  }
});

ipcMain.on('hide-window', hideWindow);

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcuts();

  console.log('Ruby AI Desktop is running!');
  console.log('Press Cmd+Shift+Space to toggle the window');
  console.log('Press Cmd+Shift+S to capture screenshot');
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Don't quit on window close (keep in tray)
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    showWindow();
  }
});
