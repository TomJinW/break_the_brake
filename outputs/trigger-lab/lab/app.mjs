import {usbReport,usbInput,hasUsbOutput,LatestWriter} from './protocol.mjs';
const $=id=>document.getElementById(id);
let device=null,writer=null,demo=false,ready=false,connecting=false,closing=false;
let value=0,mode='off',deadline=0,overload=0,last=performance.now(),pulseOn=null,connectTimer=null;
let lastInput=0,lastSample=0;const history=Array(180).fill(0);
const supported=!!navigator.hid && window.isSecureContext;
const labels={off:'扳机效果已关闭',resistance:'持续阻力',pulse:'节奏脉冲',breakTest:'踩断体验 · 85% 为临界点',broken:'已模拟断裂 · 阻力已释放'};
function log(message){const line=document.createElement('div');line.textContent=new Date().toLocaleTimeString('zh-CN',{hour12:false})+'  '+message;$('log').prepend(line);while($('log').children.length>15)$('log').lastChild.remove();}
function notice(message){$('notice').textContent=message;}
function updateUI(){
  $('connect').hidden=!!device;$('connect').disabled=!supported||connecting||closing;
  $('connect').textContent=connecting?'等待授权…':'连接 DualSense ↗';
  $('disconnect').hidden=!device;$('disconnect').disabled=closing;
  $('demo').disabled=!!device||connecting||closing;$('demo').textContent=demo?'退出演示':'先看演示';
  $('demoPanel').hidden=!demo;
  for(const name of ['resistance','pulse','breakTest']) {$(name).disabled=(!ready&&!demo)||closing;$(name).classList.toggle('active',mode===name);}
  $('release').disabled=(!ready&&!demo)||closing;
  $('connection').textContent=demo?'界面演示 · 未输出到手柄':ready?'DualSense 已连接':device?'等待 USB 输入…':'尚未连接手柄';
  $('source').textContent=demo?'SIMULATED INPUT':ready?'USB · LIVE INPUT':'WAITING FOR INPUT';
  $('deviceLabel').textContent=device?device.productName+' · USB':demo?'拖动行程滑块，仅模拟画面和测试逻辑':'普通 DualSense · USB 数据线 · 桌面 Chrome / Edge';
  $('dot').classList.toggle('on',ready||demo);
  $('effectLabel').textContent=(demo?'演示 / ':'')+labels[mode];
  document.body.classList.toggle('broken',mode==='broken');
}
function output(active){return writer?writer.put(usbReport({active,start:Number($('start').value)/100,strength:Number($('strength').value)/100})):Promise.resolve(true);}
function writeError(error){
  mode='off';deadline=0;overload=0;ready=false;
  notice('设备写入失败，释放未能确认。请拔下 USB 后重新连接。'+error.message);
  log('HID 写入失败：'+error.message);updateUI();
}
async function stop(reason='已停止测试',broken=false){
  mode=broken?'broken':'off';deadline=0;overload=0;pulseOn=null;updateUI();
  const ok=await output(false);
  if(ok){log(reason+(demo?'（演示）':device?' · 释放指令已发送':''));}
  return ok;
}
async function disconnect(){
  if(!device||closing)return;
  closing=true;updateUI();clearTimeout(connectTimer);
  const current=device;await stop('断开前释放');
  current.removeEventListener('inputreport',onInput);
  try{await current.close();}catch(e){log('关闭设备：'+e.message);}
  device=null;writer=null;ready=false;value=0;closing=false;updateUI();
}
function onInput(event){
  if(event.device!==device||closing)return;
  const reading=usbInput(event.reportId,event.data);
  if(reading===null)return;
  value=reading;lastInput=performance.now();
  if(!ready&&!writer?.failed){ready=true;clearTimeout(connectTimer);log('USB 输入已确认');notice('已连接。选择一种效果，然后缓慢按压 R2。Esc 可随时释放。');updateUI();}
}
$('connect').addEventListener('click',async()=>{
  if(!supported||connecting||device)return;
  connecting=true;updateUI();
  let candidate;
  try{
    // Must remain inside the user gesture; do not await other work before requestDevice.
    const devices=await navigator.hid.requestDevice({filters:[{vendorId:0x054c,productId:0x0ce6,usagePage:1,usage:5}]});
    candidate=devices[0];if(!candidate){notice('已取消选择。可以重新连接，也可以先看演示。');return;}
    if(!candidate.opened)await candidate.open();
    if(!hasUsbOutput(candidate.collections))throw new Error('本版只支持 USB。请断开蓝牙，改用 USB 数据线连接。');
    demo=false;value=0;mode='off';deadline=0;overload=0;
    device=candidate;writer=new LatestWriter(device,writeError);
    device.addEventListener('inputreport',onInput);
    await output(false);if(writer.failed)return;
    log('设备已打开，等待 USB 输入');notice('设备已打开。请轻按一下 R2，以确认 USB 输入。');
    connectTimer=setTimeout(async()=>{if(!ready&&device===candidate){await disconnect();notice('未收到 USB 输入。请确认数据线可传输数据，并关闭占用手柄的其他程序，再重试。');}},8000);
  }catch(error){
    if(candidate&&candidate!==device&&candidate.opened)try{await candidate.close();}catch{}
    notice(error.name==='NotFoundError'?'已取消选择，可以重新连接。':'连接失败：'+error.message);log('连接未完成：'+error.message);
  }finally{connecting=false;updateUI();}
});
$('disconnect').addEventListener('click',async()=>{await disconnect();notice('已断开连接。');});
$('demo').addEventListener('click',async()=>{
  if(device||connecting)return;await stop('切换演示');demo=!demo;value=0;$('demoValue').value=0;
  notice(demo?'演示模式不会连接或驱动手柄。拖动左侧滑块，观察行程和踩断逻辑。':'用 USB 数据线连接手柄，再点击「连接 DualSense」。');log(demo?'进入界面演示':'退出界面演示');updateUI();
});
$('demoValue').addEventListener('input',()=>{if(demo)value=Number($('demoValue').value)/100;});
for(const name of ['resistance','pulse','breakTest'])$(name).addEventListener('click',()=>{
  if((!ready&&!demo)||closing||document.hidden)return;
  mode=name;deadline=performance.now()+12000;overload=0;pulseOn=true;updateUI();output(true);
  log((demo?'演示：':'发送效果：')+labels[name]);
});
$('release').addEventListener('click',()=>stop('手动释放'));
for(const name of ['strength','start'])$(name).addEventListener('input',()=>{
  $(name+'Text').textContent=$(name).value+'%';
  if(['resistance','breakTest'].includes(mode)||(mode==='pulse'&&pulseOn))output(true);
});
window.addEventListener('keydown',event=>{if(event.key==='Escape')stop('Esc 释放');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode!=='off')stop('页面进入后台，停止测试');});
window.addEventListener('pagehide',()=>{if(writer)writer.put(usbReport());});
if(navigator.hid)navigator.hid.addEventListener('disconnect',event=>{
  if(event.device!==device)return;
  device.removeEventListener('inputreport',onInput);clearTimeout(connectTimer);device=null;writer=null;ready=false;value=0;mode='off';deadline=0;overload=0;
  notice('手柄已断开。重新连接后需再次选择效果。');log('USB 连接断开');updateUI();
});
function frame(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(deadline&&now>=deadline)stop('12 秒测试结束');
  if(ready&&mode!=='off'&&mode!=='broken'&&now-lastInput>2000){stop('输入中断，停止测试');notice('两秒未收到输入，已尝试释放阻力。请检查 USB 连接。');}
  if(mode==='pulse'){
    const next=Math.floor(now/125)%2===0;
    if(next!==pulseOn){pulseOn=next;output(next);}
  }
  if(mode==='breakTest'){
    overload=value>=.85?overload+dt:0;
    if(overload>=.3)stop('超过临界行程，模拟断裂',true);
  }
  $('value').textContent=Math.round(value*100);$('fill').style.width=value*100+'%';$('needle').style.left=`calc(${value*100}% - 1px)`;
  $('timer').textContent=deadline?Math.max(0,(deadline-now)/1000).toFixed(1)+'s':'—';
  if(now-lastSample>=33){lastSample=now;history.push(value);history.shift();$('wave').setAttribute('points',history.map((v,i)=>`${(i*600/179).toFixed(1)},${98-v*94}`).join(' '));}
  requestAnimationFrame(frame);
}
updateUI();log('实验室已就绪');
if(!supported)notice('当前浏览器不支持 WebHID。请在桌面 Chrome / Edge 中打开此 localhost 地址；也可先看演示。');
requestAnimationFrame(frame);

// Keep native long-press menus and text selection off game buttons.
for(const eventName of ['contextmenu','selectstart'])document.addEventListener(eventName,event=>{if(event.target?.closest?.('button'))event.preventDefault();});
