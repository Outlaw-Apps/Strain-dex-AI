import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fetch from "node-fetch"; // For Node.js < 18 (which has built-in fetch)

/**
 * @typedef {Object} ProxyRequest
 * @property {string} url
 * @property {string} [method]
 * @property {Record<string, string>} [headers]
 * @property {any} [body]
 */

// Create the main window
const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load your React app (Vite dev server or production build)
  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

// Handle the proxy request
ipcMain.handle(
  "proxy-request",
  async (_, { url, method = "GET", headers = {}, body }) => {
    try {
      // Validate the URL (basic security)
      if (!url || typeof url !== "string") {
        throw new Error("Invalid URL");
      }

      // Block private IPs (security)
      const targetUrl = new URL(url);
      if (
        targetUrl.hostname === "localhost" ||
        targetUrl.hostname === "127.0.0.1" ||
        /^10\./.test(targetUrl.hostname) ||
        /^192\.168\./.test(targetUrl.hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(targetUrl.hostname)
      ) {
        throw new Error("Access to private IPs is not allowed");
      }

      // Forward the request using Node.js fetch
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

// Initialize the app
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});