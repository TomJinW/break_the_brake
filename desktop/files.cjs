const path = require('node:path');
function assetPath(root, raw) {
 const url = new URL(raw);
 if(url.protocol !== 'brake:' || url.hostname !== 'game') return null;
 let name;try{name=decodeURIComponent(url.pathname);}catch{return null;}
 if(name.endsWith('/')) name+='index.html';
 if(!/^\/(?:lab\/)?[a-zA-Z0-9_-]+\.(?:html|css|mjs)$/.test(name)) return null;
 return path.join(root,name.slice(1));
}
function pngPayload(data){
 if(typeof data!=='string'||data.length>16*1024*1024||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('无效的图片');
 const bytes=Buffer.from(data.split(',')[1],'base64');
 if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('无效的 PNG');
 return bytes;
}
module.exports={assetPath,pngPayload};
