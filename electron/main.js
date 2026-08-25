const { app, BrowserWindow, globalShortcut, session, desktopCapturer, ipcMain, screen } = require("electron");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    center: true,
    transparent: true,
    frame: false,
    alwaysOnTop: false,
    resizable: true,
    hasShadow: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Initial load opens Dashboard Homepage
  const initialUrl = process.env.COPILOT_URL || "http://localhost:3000/";
  mainWindow.loadURL(initialUrl);

  // IPC Event: Switch to Floating HUD Mode
  ipcMain.on("enter-hud-mode", () => {
    if (!mainWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;

    mainWindow.setSize(780, 220);
    mainWindow.setPosition(Math.floor((width - 780) / 2), 20);
    mainWindow.setAlwaysOnTop(true, "screen-saver");
  });

  // IPC Event: Switch to Dashboard Mode
  ipcMain.on("exit-hud-mode", () => {
    if (!mainWindow) return;
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSize(1100, 750);
    mainWindow.center();
  });

  // Global Keyboard Shortcuts (Alt+S, Alt+L)
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
  if (session.defaultSession) {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources) => {
        if (sources.length > 0) {
          callback({ video: sources[0] });
        }
      }).catch((err) => {
        console.error("Display media request handler error:", err);
      });
    });
  }

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
