const { app, BrowserWindow, globalShortcut, session, desktopCapturer, ipcMain, screen } = require("electron");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    center: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Enable OS-Level Anti-Screen Capture Protection (Invisible to Google Meet, Zoom, MS Teams)
  try {
    mainWindow.setContentProtection(true);
    console.log("🛡️ Stealth Screen-Capture Protection Activated!");
  } catch (err) {
    console.error("Failed to enable content protection:", err);
  }

  // Initial load opens Copilot or Dashboard Homepage on Production Vercel App
  const initialUrl = process.env.COPILOT_URL || "https://my-agent-mauve-omega.vercel.app/copilot?desktop=true";
  mainWindow.loadURL(initialUrl);

  // IPC Event: Switch to Floating HUD Mode
  ipcMain.on("enter-hud-mode", () => {
    if (!mainWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;

    mainWindow.setSize(780, 260);
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

  // IPC Event: Toggle Screen-Capture Stealth Protection
  ipcMain.on("toggle-stealth-protection", (event, enable) => {
    if (mainWindow) {
      mainWindow.setContentProtection(enable);
    }
  });

  // IPC Event: Toggle Click-Through Mode
  ipcMain.on("set-ignore-mouse-events", (event, ignore) => {
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  // IPC Event: Switch Workspace Agent Engine (Cross-Platform Routing for Windows, macOS, Linux)
  ipcMain.on("switch-agent-engine", (event, routePath) => {
    if (!mainWindow) return;
    const baseUrl = process.env.COPILOT_URL || "https://my-agent-mauve-omega.vercel.app";
    const cleanPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
    const targetUrl = `${baseUrl.replace(/\/+$/, "")}${cleanPath}${cleanPath.includes("?") ? "&" : "?"}desktop=true`;
    console.log(`🚀 Switching Agent Engine to: ${targetUrl}`);
    mainWindow.loadURL(targetUrl);
  });

  // Global Keyboard Shortcuts
  // Alt+Shift+H: Hide / Show Window (Stealth Toggle)
  let isStealthHidden = false;
  let isClickThrough = false;

  globalShortcut.register("Alt+Shift+H", () => {
    if (mainWindow) {
      if (isStealthHidden) {
        mainWindow.show();
        isStealthHidden = false;
      } else {
        mainWindow.hide();
        isStealthHidden = true;
      }
    }
  });

  // Alt+Shift+T: Toggle Click-Through Mouse Pass-Through
  globalShortcut.register("Alt+Shift+T", () => {
    if (mainWindow) {
      isClickThrough = !isClickThrough;
      mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
      mainWindow.webContents.send("click-through-toggled", isClickThrough);
    }
  });

  // Alt+S: Snap Screen OCR
  globalShortcut.register("Alt+S", () => {
    if (mainWindow) {
      mainWindow.webContents.send("trigger-snap-screen");
    }
  });

  // Alt+L: Toggle Audio Listening
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
