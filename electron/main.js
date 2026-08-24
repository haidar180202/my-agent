const { app, BrowserWindow, globalShortcut } = require("electron");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 780,
    height: 220,
    x: undefined,
    y: 20,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Pinned at OS level above all Windows apps (Zoom, Meet, VS Code)
  mainWindow.setAlwaysOnTop(true, "screen-saver");

  // Load Next.js Local Server Copilot Route with desktop query param
  const copilotUrl = process.env.COPILOT_URL || "http://localhost:3000/copilot?desktop=true";
  mainWindow.loadURL(copilotUrl);

  // Global Keyboard Shortcuts (Alt+S, Alt+L, Alt+H)
  globalShortcut.register("Alt+S", () => {
    if (mainWindow) {
      mainWindow.webContents.send("trigger-snap-screen");
    }
  });

  globalShortcut.register("Alt+L", () => {
    if (mainWindow) {
      mainWindow.webContents.send("trigger-toggle-listen");
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
