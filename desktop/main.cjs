const path = require('node:path');
const { app, BrowserWindow, shell } = require('electron');

const isDev = !app.isPackaged;

function createMainWindow() {
  const win = new BrowserWindow({
    width: 430,
    height: 860,
    minWidth: 390,
    minHeight: 720,
    title: '持有',
    backgroundColor: '#F3F5F0',
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const demoUrl = new URL(`file://${path.join(__dirname, '..', 'demo', 'index.html')}`);
    const nextUrl = new URL(url);
    if (nextUrl.protocol !== 'file:' || nextUrl.pathname !== demoUrl.pathname) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.loadFile(path.join(__dirname, '..', 'demo', 'index.html'));
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
