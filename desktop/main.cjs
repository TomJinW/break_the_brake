const {app,BrowserWindow,protocol,net,session,ipcMain,dialog,Menu}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {writeFile}=require('node:fs/promises');
const {assetPath,pngPayload}=require('./files.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'brake',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
let win,closing=false,closeTimer;
const trusted=url=>typeof url==='string'&&/^brake:\/\/game(?:\/|$)/.test(url);
const supported=d=>d.vendorId===0x054c&&d.productId===0x0ce6;
function finishClose(){clearTimeout(closeTimer);win?.destroy();}
app.whenReady().then(()=>{
 const root=path.join(app.getAppPath(),'outputs/trigger-lab');
 protocol.handle('brake',request=>{const file=assetPath(root,request.url);return file?net.fetch(pathToFileURL(file).toString()):new Response('Not found',{status:404});});
 const ses=session.defaultSession;
 ses.setPermissionCheckHandler((contents,permission,origin,details)=>permission==='hid'&&trusted(contents?.getURL())&&trusted(details.securityOrigin||origin));
 ses.setPermissionRequestHandler((contents,permission,callback)=>callback(permission==='hid'&&trusted(contents.getURL())));
 ses.on('select-hid-device',async(event,details,callback)=>{
  event.preventDefault();
  if(!trusted(details.frame?.url)){callback('');return;}
  const devices=details.deviceList.filter(supported);
  if(devices.length===1){callback(devices[0].deviceId);return;}
  if(!devices.length){callback('');return;}
  try{const result=await dialog.showMessageBox(win,{type:'question',message:'选择 DualSense 手柄',buttons:[...devices.map((d,i)=>`${i+1}. ${d.name||'DualSense'}`),'取消'],cancelId:devices.length});callback(devices[result.response]?.deviceId||'');}catch{callback('');}
 });
 win=new BrowserWindow({width:1220,height:1000,minWidth:760,minHeight:820,backgroundColor:'#e9e5d9',title:'差一点就断了',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 Menu.setApplicationMenu(Menu.buildFromTemplate([
  ...(process.platform==='darwin'?[{label:app.name,submenu:[{role:'about'},{type:'separator'},{role:'quit'}]}]:[]),
  {label:'游戏',submenu:[{label:'全屏',role:'togglefullscreen'}, {role:'close',label:'退出'}]},
  {label:'编辑',submenu:[{role:'copy'},{role:'paste'},{role:'selectAll'}]}
 ]));
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(!trusted(url))event.preventDefault();});
 win.on('close',event=>{event.preventDefault();if(closing)return;closing=true;win.webContents.send('release-before-quit');closeTimer=setTimeout(finishClose,1500);});
 win.loadURL('brake://game/index.html');
});
ipcMain.on('released-before-quit',event=>{if(closing&&event.sender===win?.webContents)finishClose();});
ipcMain.handle('save-score',async(event,data,name)=>{
 if(event.sender!==win?.webContents||!trusted(event.senderFrame?.url))throw Error('不允许的来源');
 const bytes=pngPayload(data);
 const filename=typeof name==='string'?path.basename(name).replace(/[\\/:*?"<>|]/g,'-'):'成绩.png';
 const {canceled,filePath}=await dialog.showSaveDialog(win,{title:'保存成绩截图',defaultPath:path.join(app.getPath('pictures'),filename),filters:[{name:'PNG 图片',extensions:['png']}]});
 if(canceled||!filePath)return false;
 await writeFile(filePath,bytes);return true;
});
app.on('window-all-closed',()=>app.quit());
