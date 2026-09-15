import { contextBridge, ipcRenderer } from "electron";

// Define the API for the renderer
const electronAPI = {
  proxyRequest: (options) => ipcRenderer.invoke("proxy-request", options),
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld("electronAPI", electronAPI);