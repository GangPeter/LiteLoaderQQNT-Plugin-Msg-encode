// Electron 主进程 与 渲染进程 交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");

// 在window对象下导出只读对象
contextBridge.exposeInMainWorld('qqencodeMsg', {
  getSettings: () => ipcRenderer.invoke(
    'LiteLoader.qqencodeMsg.getSettings'
  ),
  getDefaultSettings: () => ipcRenderer.invoke(
    'LiteLoader.qqencodeMsg.getDefaultSettings',
  ),
  getIcons: () => ipcRenderer.invoke(
    'LiteLoader.qqencodeMsg.getIcons'
  ),
  setIcons: (config) => ipcRenderer.invoke(
    'LiteLoader.qqencodeMsg.getIcons',
    config
  ),
  writelog: (log) => ipcRenderer.invoke(
    'LiteLoader.qqencodeMsg.getDefaultSettings',
    log
  ),
  setSettings: (config) => ipcRenderer.invoke(
    'LiteLoader.qqencodeMsg.setSettings',
    config
  ),
  encrypt: (data, key) => ipcRenderer.invoke(
    'LiteLoader.qqencodeMsg.encrypt',
    data,
    key
  ),
  decrypt: (data, key) => ipcRenderer.invoke(
    'LiteLoader.qqencodeMsg.decrypt',
    data,
    key
  ),
  openWeb: url => ipcRenderer.send(
    "LiteLoader.qqencodeMsg.openWeb",
    url
  )
});