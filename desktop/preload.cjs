const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktopApp',{
 saveScore:(data,name)=>ipcRenderer.invoke('save-score',data,name),
 onBeforeQuit:callback=>ipcRenderer.on('release-before-quit',async()=>{
  try{await callback();}finally{ipcRenderer.send('released-before-quit');}
 })
});
