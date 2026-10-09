import {finishTitle} from './finish-verdict.mjs?v=29';
// Render a self-contained PNG without external fonts, images or upload services.
export function scoreImage({scene,distance,device,tag,best,remaining,date,difficulty='标准',reward=false}){
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1080;
 const c=canvas.getContext('2d');
 c.fillStyle='#f6f1e4';c.fillRect(0,0,1200,1080);
 c.strokeStyle='#292a25';c.lineWidth=3;c.strokeRect(26,26,1148,1028);
 const label=(text,x,y,size=24,color='#292a25')=>{c.fillStyle=color;c.font=`${size>=40?'bold ':''}${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;c.fillText(text,x,y);};
 label('差一点就断了',64,104,52);label('100 → 0 km/h · MPV 刹停挑战',64,148,24,'#807e72');
 const height=Math.min(360,1072*scene.height/scene.width),width=height*scene.width/scene.height;
 c.drawImage(scene,(1200-width)/2,180,width,height);
 label(tag,64,594,24,'#b50926');label(finishTitle(distance,reward)+(reward?' · 惊险刹停奖':''),64,658,44);
 label(distance.toFixed(1),64,784,108);label('米',64+c.measureText(distance.toFixed(1)).width+24,782,30);
 label(`难度：${difficulty}    ·    踏板剩余 ${Math.round(remaining*100)}%`,64,838,25);
 label(Number.isFinite(best)?`同类设备个人最佳：${best.toFixed(1)} 米`:'本局不计入个人最佳',64,883,25);
 c.font='22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
 let line='',row=0;
 for(const ch of '本局设备：'+device){if(c.measureText(line+ch).width>1060){label(line,64,931+row*30,22);line='';row++;if(row===2){line='…';break;}}line+=ch;}
 label(line,64,931+row*30,22);
 label(date.toLocaleString('zh-CN',{hour12:false}),64,1023,18,'#807e72');
 label('虚构车辆与参数 · 不代表真实驾驶性能',730,1023,18,'#807e72');
 return canvas.toDataURL('image/png');
}
export async function downloadScore(options){
 const png=scoreImage(options);
 const filename=`差一点就断了-${options.difficulty||'标准'}-${options.distance.toFixed(1)}米-${options.date.getTime()}.png`;
 if(window.desktopApp)return window.desktopApp.saveScore(png,filename);
 const bytes=Uint8Array.from(atob(png.split(',')[1]),ch=>ch.charCodeAt(0));
 const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
 const link=document.createElement('a');link.href=url;
 link.download=filename;
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 return true;
}
