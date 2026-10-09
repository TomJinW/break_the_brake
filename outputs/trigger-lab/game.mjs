import {drawCar} from './car-renderer.mjs';
import {drawTitleDrive} from './title-drive.mjs';
import {inputSessionKey} from './input-session.mjs';
import {roundOutcome} from './round-outcome.mjs';
import {FinishVerdicts,finishTitle} from './finish-verdict.mjs?v=29';
import {nearMissReward,failureReport,BrakeReplay} from './round-extras.mjs?v=30';
import {downloadScore} from './score-image.mjs?v=32';
import {RandomResistance} from './trigger-resistance.mjs?v=25';
import {MenuNavigation,navigationState} from './menu-navigation.mjs';
import {DEVICE_LABELS,inputCategory,readBest,recordBest} from './records.mjs?v=16';
import {rawInput,mappedInput,defaultBinding,actuator,Rumble} from './gamepad.mjs?v=30';
import {usbReport,usbInput,hasUsbOutput,LatestWriter} from './protocol.mjs';
import {fresh,advance,DISTANCE_MULTIPLIER} from './physics.mjs?v=30';
import {createBrakeAudio} from './brake-audio.mjs?v=20';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
let state='ready',previous='run',sim=fresh(),brake=0,held=false,hardware=0,device=null,writer=null,ready=false,connecting=false,lastInput=0;
let controllerKind=null,hidMenu={},roundDeviceName='键盘 / 触摸屏';
let selectedPad=null,pad=null,binding=null,padSignature='',autoPick=true,padPollAt=0;
const rumble=new Rumble(()=>{status('浏览器震动输出失败，仍可正常操作刹车。');updateConnection();});
function readPads(){try{return Array.from(navigator.getGamepads?.()||[]).filter(p=>p?.connected);}catch{return [];}}
function saveBinding(){if(pad&&binding)try{localStorage.setItem('brake-binding:'+pad.id,JSON.stringify(binding));}catch{}}
function loadBinding(p){let b;try{b=JSON.parse(localStorage.getItem('brake-binding:'+p.id));}catch{}if(b&&['axis','button'].includes(b.kind)&&Number.isInteger(b.index)&&b.index>=0&&b.index<(b.kind==='axis'?p.axes.length:p.buttons.length)&&Number.isFinite(b.rest)&&Number.isFinite(b.full))return b;return defaultBinding(p);}
function selectPad(p){release();if(['run','countdown'].includes(state))pauseGame('输入设备变化，请确认后继续。');pad=p;selectedPad=p?.index??null;rumble.set(p);binding=p?loadBinding(p):null;const list=$('bindingSelect');list.replaceChildren();if(p){list.add(new Option('请选择刹车轴或按键',''));p.buttons.forEach((_,i)=>list.add(new Option('按键 '+i+(p.mapping==='standard'&&i===7?' · RT / R2':''),'button:'+i)));p.axes.forEach((_,i)=>list.add(new Option('轴 '+i,'axis:'+i)));list.value=binding?binding.kind+':'+binding.index:'';$('digitalInput').checked=!!binding?.digital;}$('mappingPanel').hidden=!p;checkRoundInput();updateConnection();}
function pollPads(now){if(now<padPollAt)return;padPollAt=now+50;const pads=readPads();const signature=pads.map(p=>p.index+':'+p.id).join('|');if(signature!==padSignature){padSignature=signature;const sel=$('padSelect');sel.replaceChildren(new Option('不用通用手柄 / 键盘触屏',''));for(const p of pads)sel.add(new Option(p.id,String(p.index)));if(selectedPad!==null&&!pads.some(p=>p.index===selectedPad&&p.id===pad?.id)){autoPick=false;selectPad(null);}if(selectedPad===null&&autoPick&&pads.length){autoPick=false;selectPad(pads[0]);}sel.value=selectedPad===null?'':String(selectedPad);}
 const current=pads.find(p=>p.index===selectedPad);if(current){pad=current;rumble.set(pad);}if(pad&&!$('settings').hidden){const raw=rawInput(pad,binding),v=mappedInput(raw,binding);$('padLive').textContent=binding?'原始 '+raw.toFixed(3)+' → 刹车 '+Math.round(v*100)+'% · 松开 '+binding.rest.toFixed(2)+' / 全压 '+binding.full.toFixed(2):'选择输入，再分别记录松开与压到底的位置';$('rawInputs').textContent='按键 '+pad.buttons.map((b,i)=>i+':'+b.value.toFixed(2)).join('  ')+'\n轴 '+pad.axes.map((a,i)=>i+':'+a.toFixed(2)).join('  ');}}
$('padSelect').onchange=()=>{autoPick=false;selectPad(readPads().find(p=>String(p.index)===$('padSelect').value)||null);};
$('bindingSelect').onchange=()=>{release();const value=$('bindingSelect').value;if(!value){binding=null;checkRoundInput();updateConnection();return;}const [kind,index]=value.split(':');binding={kind,index:Number(index),rest:0,full:kind==='button'?1:0,digital:false};$('digitalInput').checked=false;saveBinding();checkRoundInput();updateConnection();};
for(const [id,key] of [['calRest','rest'],['calFull','full']])$(id).onclick=()=>{if(!pad||!binding)return;binding[key]=rawInput(pad,binding);saveBinding();checkRoundInput();updateConnection();};
$('digitalInput').onchange=()=>{if(binding){binding.digital=$('digitalInput').checked;saveBinding();checkRoundInput();}};
const drivingResistance=new RandomResistance({interval:3});
const replay=new BrakeReplay();
const finishVerdicts=new FinishVerdicts();
let earnedReward=false,lastFailureReport='',captureFinish=false;
let testUntil=0,countdownBeat=null;
let last=performance.now(),clock=0,count=0,cut=0,outputAt=0,w=1000,h=540,frameId=0,usbTimer;
let roundInputKey='keyboard';
function checkRoundInput(){if(['run','countdown','paused'].includes(state)&&inputSessionKey(ready,pad,binding)!==roundInputKey)mixedInput=true;}
let roundDevice='keyboard',mixedInput=false,finishedAt=null,roundDifficulty='standard';
const difficultyLabels={easy:'简单',hard:'困难',standard:'标准'};
let selectedDifficulty='easy';
try{if(localStorage.getItem('brake-ds-difficulty')==='hard')selectedDifficulty='hard';}catch{}
$('difficultySelect').value=selectedDifficulty;
$('difficultySelect').onchange=()=>{selectedDifficulty=$('difficultySelect').value;try{localStorage.setItem('brake-ds-difficulty',selectedDifficulty);}catch{}};
function currentDifficulty(){return ready?selectedDifficulty:'standard';}

let scoreStorage;try{scoreStorage=localStorage;}catch{const scores=new Map();scoreStorage={getItem:k=>scores.get(k),setItem:(k,v)=>scores.set(k,v)};}
function deviceName(){if(ready)return 'DualSense（PS5 手柄） · USB 自适应阻力';if(currentDevice()==='keyboard')return '键盘 / 触摸屏';if(currentDevice()==='ds5')return 'DualSense（PS5 手柄） · 通用模式';return (pad?.id||'普通手柄')+' · 普通手柄';}
function currentDevice(){return inputCategory(ready,pad,binding);}
function showBest(){const inRound=['countdown','run','paused','result','failed','limit'].includes(state);const category=inRound?roundDevice:currentDevice();const difficulty=inRound?roundDifficulty:currentDifficulty();const best=readBest(scoreStorage,category,difficulty);$('bestDevice').textContent=DEVICE_LABELS[category]+(category==='ds5'?' · '+difficultyLabels[difficulty]:'');$('best').textContent=Number.isFinite(best)?best.toFixed(1):'—';$('currentDevice').textContent='当前设备：'+deviceName()+(ready?' · '+difficultyLabels[difficulty]:'');$('difficultyOptions').hidden=!ready;}

let brakeAudio=null,brakeSoundEnabled=true;
try{brakeSoundEnabled=localStorage.getItem('brake-sketch-brake-sound')!=='off';}catch{}
$('brakeSoundToggle').checked=brakeSoundEnabled;
$('brakeSoundToggle').addEventListener('change',()=>{brakeSoundEnabled=$('brakeSoundToggle').checked;try{localStorage.setItem('brake-sketch-brake-sound',brakeSoundEnabled?'on':'off');}catch{}});
let audio=null,engine=null,engineGain=null,master=null,muted=false;
function soundLabel(){
 $('sound').textContent=muted?'声音：关':audio&&audio.state!=='running'?'声音：点此启用':'声音：开';
}
function soundInit(){
 try{
  if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){$('sound').textContent='声音不可用';return false;}
   audio=new Audio();master=audio.createGain();master.gain.value=muted?0:.6;master.connect(audio.destination);
   engine=audio.createOscillator();engine.type='triangle';engineGain=audio.createGain();engineGain.gain.value=0;engine.connect(engineGain).connect(master);engine.start();brakeAudio=createBrakeAudio(audio,master);
   audio.addEventListener('statechange',soundLabel);
  }
  audio.resume().then(soundLabel).catch(soundLabel);soundLabel();return true;
 }catch{try{audio?.close().catch(()=>{});}catch{}audio=null;master=null;engine=null;engineGain=null;brakeAudio=null;$('sound').textContent='声音不可用';return false;}
}
// A physical pointer/keyboard gesture can unlock audio after a gamepad start.
function unlockAudio(e){if(e.target?.closest?.('#sound'))return;if(e.isTrusted&&audio&&audio.state!=='running')audio.resume().catch(()=>{});}
window.addEventListener('pointerdown',unlockAudio,{capture:true});
window.addEventListener('keydown',unlockAudio,{capture:true});
function crack(big=false){if(!audio||audio.state!=='running')return;const duration=big?.38:.055,b=audio.createBuffer(1,audio.sampleRate*duration,audio.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.exp(-i/(a.length*.16));const n=audio.createBufferSource();n.buffer=b;const g=audio.createGain();g.gain.value=big?.70:.13;n.connect(g).connect(master);n.start();if(big){const o=audio.createOscillator(),q=audio.createGain();o.type='square';o.frequency.setValueAtTime(210,audio.currentTime);o.frequency.exponentialRampToValueAtTime(45,audio.currentTime+.19);q.gain.setValueAtTime(.18,audio.currentTime);q.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.22);o.connect(q).connect(master);o.start();o.stop(audio.currentTime+.23);}}
function tone(go=false){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=go?990:660;g.gain.setValueAtTime(.16,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);o.connect(g).connect(master);o.start();o.stop(audio.currentTime+.2);}
$('sound').onclick=()=>{const locked=audio&&audio.state!=='running'&&!muted;if(!soundInit())return;if(!locked)muted=!muted;master.gain.value=muted?0:.6;soundLabel();};
function status(t){$('status').textContent=t;$('setupStatus').textContent=t;}
function send(active=false,rumble=0,strength=.65){return writer?writer.put(usbReport({active,start:.12,strength,rumble})):Promise.resolve(true);}
function release(){testUntil=0;outputAt=0;rumble.stop();return send();}
function updateConnection(){ $('pair').disabled=connecting||!navigator.hid;$('hidUnavailable').hidden=!!navigator.hid;$('useGeneric').hidden=!!navigator.hid;$('pair').textContent=device?'断开 DualSense 专用连接':connecting?'等待授权…':'连接 DualSense 专用力反馈';$('connect').textContent='设置 / 手柄';const mapped=pad&&binding&&Math.abs(binding.full-binding.rest)>=.1;$('connection').textContent=ready?'● DualSense 专用连接 · R2 刹车':mapped?'● 通用手柄 · '+(binding.kind==='button'?'按键 ':'轴 ')+binding.index:pad?'通用手柄已检测 · 请配置刹车输入':'键盘 / 触屏也能玩';$('setupStatus').textContent=ready?'专用连接已启用，优先使用 R2；可测试震动与阻力。':device?'轻按 R2 确认专用 USB 输入。':'普通手柄无需下方专用授权；自适应阻力仅限 DualSense。';$('padStatus').textContent=pad?(pad.mapping==='standard'?'标准映射':'非标准映射 · 请校准')+' · '+(actuator(pad)&&!rumble.failed?'可测试震动':'浏览器未提供可用震动')+(ready?' · 当前优先使用专用 R2':''):'未检测到手柄：连接电脑后，在此页面按一下手柄按键。';$('testRumble').disabled=!(ready||(actuator(pad)&&!rumble.failed));$('testForce').disabled=!ready;if(controllerKind==='other'){$('setupStatus').textContent=pad?'标准映射可直接使用 RT；输入不对时可在上方校准。':'不需要授权弹窗，按手柄任意键后等待识别。';}if(controllerKind==='dualsense'){$('setupStatus').textContent=ready?'连接成功，R2 输入已就绪。':device?'轻按 R2，确认 USB 输入。':!navigator.hid?'请选择通用手柄模式，或换用 Chromium 浏览器开启专用阻力。':'尚未连接，请点击上方按钮授权。';$('testRumble').disabled=!ready;}}
function input(e){if(e.device!==device)return;const v=usbInput(e.reportId,e.data);if(v===null)return;hardware=v;lastInput=performance.now();const bits=e.data.getUint8(7),extra=e.data.getUint8(8),d=bits&15;hidMenu={up:[0,1,7].includes(d),down:[3,4,5].includes(d),left:[5,6,7].includes(d),right:[1,2,3].includes(d),confirm:!!(bits&32),back:!!(bits&64),menu:!!(extra&32)};const hx=e.data.getUint8(0),hy=e.data.getUint8(1);hidMenu.left ||= hx<57;hidMenu.right ||= hx>198;hidMenu.up ||= hy<57;hidMenu.down ||= hy>198;if(!ready&&!writer.failed){ready=true;checkRoundInput();clearTimeout(usbTimer);updateConnection();status('手柄就绪。R2 控制刹车；行驶时有震动与阻力，Esc 暂停并释放。');}}
async function closeDevice(){clearTimeout(usbTimer);await release();const d=device;if(d){d.removeEventListener('inputreport',input);try{await d.close();}catch{}}device=null;writer=null;ready=false;hardware=0;checkRoundInput();updateConnection();}
$('pair').onclick=async()=>{
 if(device){pauseGame('手柄已断开，可用键盘或触屏继续。');await closeDevice();return;}
 if(!navigator.hid){status('这个浏览器不支持 WebHID，请使用桌面 Chrome / Edge。仍可用键盘或触屏游玩。');return;}
 connecting=true;updateConnection();let d;
 try{[d]=await navigator.hid.requestDevice({filters:[{vendorId:0x054c,productId:0x0ce6,usagePage:1,usage:5}]});if(!d)return;await d.open();if(!hasUsbOutput(d.collections))throw Error('本版请使用 USB 数据线连接普通 DualSense。');device=d;writer=new LatestWriter(d,e=>{ready=false;checkRoundInput();pauseGame('手柄通信失败，请拔插后重新连接。');status('输出失败，释放未确认：'+e.message);updateConnection();});device.addEventListener('inputreport',input);await release();usbTimer=setTimeout(()=>{if(!ready){closeDevice();status('没有收到 USB 输入，请确认使用数据线并关闭占用设备的程序。');}},8000);status('轻按 R2 确认输入，再开始游戏。');}
 catch(e){status('连接未完成：'+e.message);if(d&&d!==device&&d.opened)try{await d.close();}catch{}}
 finally{connecting=false;updateConnection();}
};
if(navigator.hid)navigator.hid.addEventListener('disconnect',e=>{if(e.device!==device)return;device=null;writer=null;ready=false;hardware=0;checkRoundInput();clearTimeout(usbTimer);pauseGame('手柄连接中断。可重连，也可以用键盘继续。');updateConnection();});
function start(){replay.reset();earnedReward=false;captureFinish=false;$('rewardReplay').hidden=true;soundInit();release();drivingResistance.reset();document.body.classList.remove('failed');$('settings').hidden=true;sim=fresh();brake=0;held=false;roundDevice=currentDevice();roundDifficulty=currentDifficulty();roundDeviceName=deviceName();mixedInput=false;roundInputKey=inputSessionKey(ready,pad,binding);count=3;countdownBeat=null;last=performance.now();cut=0;state='countdown';$('splash').hidden=true;$('result').hidden=true;$('pause').hidden=true;$('banner').textContent='3 · 松开刹车，准备出发';}
function pauseGame(text='已释放手柄效果，准备好后继续。'){held=false;if(['run','countdown'].includes(state)){previous=state;state='paused';$('pauseText').textContent=text;$('pause').hidden=false;}release();}
function finish(reason=roundOutcome(sim)){
 const limited=reason==='limit',good=reason==='stopped';earnedReward=good&&nearMissReward(sim);captureFinish=earnedReward;
 finishedAt=new Date();$('downloadScore').hidden=!good;$('downloadStatus').textContent='';
 state=good?'result':limited?'limit':'failed';release();held=false;document.body.classList.toggle('failed',sim.broken);
 const newBest=recordBest(scoreStorage,roundDevice,sim.distance,good&&!mixedInput,roundDifficulty);showBest();
 $('resultTag').textContent=good?(mixedInput?'混合输入 / 不计入最佳':DEVICE_LABELS[roundDevice]+' / '+(newBest?'新的个人最佳！':'完整刹停')):limited?'超出 250 米测试范围 / 本局无成绩':'踏板断裂 / 本局无成绩';
 $('resultTitle').textContent=good?finishTitle(sim.distance,earnedReward):limited?'测试到此为止':'游戏失败';
 $('resultReward').hidden=!earnedReward;
 $('resultReward').textContent='惊险刹停奖 · 剩余耐久 '+((1-sim.damage)*100).toFixed(1)+'%';
 $('rewardReplay').hidden=!earnedReward;
 $('resultNumber').hidden=!good;if(good)$('resultDistance').textContent=sim.distance.toFixed(1);
 if(sim.broken)lastFailureReport=failureReport(lastFailureReport);
 $('resultText').textContent=good?finishVerdicts.pick(sim.distance,earnedReward)+(mixedInput?'（混合输入，本局不计入最佳。）':''):limited?'路还很长，但本次测试只到这里。下次记得早点刹车。':'检测报告：'+lastFailureReport;
 $('resultDevice').textContent='本局设备：'+roundDeviceName;$('resultDifficulty').textContent='难度：'+difficultyLabels[roundDifficulty];
 $('result').hidden=false;$('banner').textContent=good?(earnedReward?'惊险刹停奖！':'停住了。脚法不错！'):limited?'测试已叫停 · 画面定格':'踏板断裂';if(good)tone();
}
$('downloadScore').onclick=async()=>{
 if(state!=='result'||sim.broken)return;
 try{const saved=await downloadScore({scene:canvas,distance:sim.distance,device:roundDeviceName,reward:earnedReward,difficulty:difficultyLabels[roundDifficulty],tag:$('resultTag').textContent,best:mixedInput?null:readBest(scoreStorage,roundDevice,roundDifficulty),remaining:Math.max(0,1-sim.damage),date:finishedAt});$('downloadStatus').textContent=saved?(window.desktopApp?'成绩图已保存。':'已请求下载 PNG 成绩图。'):'已取消保存。';}
 catch{ $('downloadStatus').textContent='图片生成失败，请重试。'; }
};
function title(){replay.reset();earnedReward=false;captureFinish=false;$('rewardReplay').hidden=true;release();state='ready';held=false;brake=0;sim=fresh();document.body.classList.remove('failed');$('splash').hidden=false;$('result').hidden=true;$('pause').hidden=true;$('settings').hidden=true;$('banner').textContent='准备出发';}
function showControllerStep(kind=null){controllerKind=kind;release();$('controllerChoice').hidden=!!kind;$('controllerDetails').hidden=!kind;$('dualSenseOptions').hidden=kind!=='dualsense';$('otherOptions').hidden=kind!=='other';$('testForce').hidden=kind!=='dualsense';$('wizardStep').textContent=kind?'02 / 连接与测试':'01 / 选择手柄';$('wizardTitle').textContent=kind==='dualsense'?'连接 DualSense':kind==='other'?'连接你的手柄':'你用哪种手柄？';$('testHint').textContent=kind==='dualsense'?'每项测试 3 秒。测试力回馈时，轻按 R2。':'震动测试持续 3 秒；无震动功能也可以正常游玩。';$('settings').scrollTop=0;updateConnection();}
$('chooseDualSense').onclick=()=>showControllerStep('dualsense');
$('useGeneric').onclick=()=>showControllerStep('other');
$('chooseOther').onclick=async()=>{if(device)await closeDevice();showControllerStep('other');};
$('changeType').onclick=()=>showControllerStep();
let settingsFromGame=false;
function openSettings(){settingsFromGame=['run','countdown','paused'].includes(state);pauseGame();release();held=false;$('backTitle').textContent=settingsFromGame?'← 返回游戏':'← 返回标题画面';$('splash').hidden=true;$('result').hidden=true;$('pause').hidden=true;$('settings').hidden=false;showControllerStep();}
$('setup').addEventListener('click',openSettings);$('connect').addEventListener('click',openSettings);$('backTitle').onclick=()=>{if(settingsFromGame){release();$('settings').hidden=true;$('pause').hidden=false;}else title();};$('toTitle').onclick=title;
$('testRumble').onclick=()=>{if(!ready&&!actuator(pad))return;soundInit();release();if(ready)send(false,.55);else rumble.play(.55,3000,true);testUntil=performance.now()+3000;status('震动测试中 · 3 秒后自动停止。');};
$('testForce').onclick=()=>{if(!ready)return;soundInit();release();send(true,0,.85);testUntil=performance.now()+3000;status('力回馈测试中 · 轻按 R2，3 秒后自动释放。');};
$('testStop').onclick=()=>{release();status('已发送停止测试与释放指令。');};
$('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;$('pauseButton').onclick=()=>pauseGame();$('resume').onclick=()=>{soundInit();state=previous;held=false;last=performance.now();$('pause').hidden=true;};
function menuBack(){if(!$('settings').hidden){if(controllerKind)showControllerStep();else $('backTitle').click();}else if(!$('pause').hidden)$('resume').click();else if(!$('result').hidden)title();}
function menuSource(){const p=pad||readPads()[0];return ready&&performance.now()-lastInput<1500?hidMenu:navigationState(p);}
const menuNav=new MenuNavigation({source:menuSource,back:menuBack,pause:()=>pauseGame()});
window.addEventListener('keydown',e=>{if(menuNav.key(e))return;if(e.code==='Space'){if(!['run','countdown'].includes(state))return;e.preventDefault();held=true;}if(e.code==='Escape')pauseGame();if(e.code==='Enter'&&['ready','result','failed','limit'].includes(state)&&$('settings').hidden){e.preventDefault();start();}});
window.addEventListener('keyup',e=>{if(e.code==='Space'){held=false;e.preventDefault();}});
const bb=$('brakeButton');bb.addEventListener('pointerdown',e=>{held=true;bb.setPointerCapture(e.pointerId);e.preventDefault();});for(const name of ['pointerup','pointercancel','lostpointercapture'])bb.addEventListener(name,()=>held=false);
window.addEventListener('blur',()=>pauseGame());document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});window.addEventListener('pagehide',release);
function line(points,color='#292a25',width=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
function ellipse(x,y,rx,ry,fill,stroke='#292a25',lw=2){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
function text(t,x,y,size=16,color='#292a25',align='left'){ctx.fillStyle=color;ctx.font=`${size>=25?'bold ':''}${size}px -apple-system, "PingFang SC", sans-serif`;ctx.textAlign=align;ctx.fillText(t,x,y);}
function path(points,fill){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#292a25';ctx.lineWidth=2.4;ctx.stroke();}
function car(x,y,scale){drawCar(ctx,x,y,scale,{distance:sim.distance/DISTANCE_MULTIPLIER,brake,broken:sim.broken,time:clock,skid:state==='run'});}
function pedal(cx,cy,s,broken=false){ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);ellipse(0,-95,13,13,'#e9e4d7');const angle=broken?.4:brake*.25;ctx.rotate(angle);if(broken){line([[0,-81],[8,-20],[0,-10],[15,0]],'#292a25',13);ctx.save();ctx.translate(32,36+Math.min(cut*20,45));ctx.rotate(.4);line([[0,-6],[-8,3],[4,12],[1,38]],'#292a25',12);path([[-30,30],[31,29],[38,70],[-33,74]],'#cf0a2c');ctx.restore();}else{line([[0,-81],[12,30]],'#292a25',13);path([[-21,27],[42,25],[49,70],[-27,75]],'#b4ba96');for(let i=0;i<4;i++)line([[-17,37+i*9],[37,35+i*9]],'#686e58',2);if(sim.damage>.15)line([[-3,-25],[10,-19],[4,-11],[15,-7]],'#cf0a2c',3);}ctx.restore();}
function draw(){ctx.clearRect(0,0,w,h);ctx.fillStyle='#f6f1e4';ctx.fillRect(0,0,w,h);const road=h*.77,move=sim.distance/DISTANCE_MULTIPLIER*35;
 // Paper flecks and quiet notebook lines.
 ctx.fillStyle='#c8c0aa44';for(let i=0;i<100;i++)ctx.fillRect((i*137.7)%w,(i*71.3)%h,1,1);
 ellipse(w*.83,149,25,25,'#edcf79','#b7a979',1.5);for(let i=0;i<7;i++){const x=((i*260-move*.13)%(w+350)+w+350)%(w+350)-160;line([[x,road-65],[x+65,road-142],[x+131,road-65]],'#b9bbaa',1.5);}
 // Near roadside row: fixed world spacing; displacement follows integrated distance.
 const treeSpacing=185,treeTravel=sim.distance/DISTANCE_MULTIPLIER*35*.94,firstTree=Math.floor(treeTravel/treeSpacing)-1;
 for(let i=firstTree;i<=firstTree+Math.ceil(w/treeSpacing)+2;i++){
  const x=i*treeSpacing-treeTravel,base=road-8,th=135+((i%3+3)%3)*13;
  line([[x-4,base],[x-2,base-th*.52],[x+4,base-th*.52],[x+5,base]],'#696d52',3);
  ellipse(x,base-th*.74,33,th*.29,'#d3d8ad','#7b8160',1.8);
  ellipse(x-23,base-th*.60,25,29,'#d3d8ad','#7b8160',1.6);
  ellipse(x+24,base-th*.61,24,32,'#d3d8ad','#7b8160',1.6);
  line([[x,base-25],[x-1,base-th*.65],[x-15,base-th*.75]],'#8d9370',1.3);
  line([[x-17,base+2],[x+21,base+2]],'#a9ad8f',1.4);
 }
 line([[0,road],[w*.35,road+1],[w*.67,road-1],[w,road]],'#292a25',2.5);line([[0,road+49],[w,road+47]],'#c3bba7',1);
 for(let i=0;i<18;i++){let x=((i*120-move)%(w+140)+w+140)%(w+140)-70;line([[x,road+27],[x+44,road+27]],'#b5ad9c',2);}
 for(let i=0;i<7;i++){let x=((i*220-move*.8)%(w+240)+w+240)%(w+240)-100;line([[x,road-1],[x-5,road-11],[x+2,road-4],[x+8,road-13]],'#9caa82',1.5);}
 const scale=Math.min(1.25,w/500),cx=w*.43,cy=road-26*scale;car(cx,cy+Math.sin(clock*13)*Math.min(sim.speed/28,1)*1.3,scale);
 if(state==='run'&&sim.speed>4){const k=sim.speed/(100/3.6);for(let i=0;i<18;i++){const sx=((i*173-sim.distance/DISTANCE_MULTIPLIER*65)%(w+350)+w+350)%(w+350)-170;const sy=125+(i*47)%(road-145);line([[sx,sy],[sx+25+k*100,sy]],'#aaa693',.7+k);}text('100 km/h → 0',24,road+85,12,'#807e72');}
 if(state==='run'&&brake>.74){text(sim.damage>.2?'有点撑不住了…':'再一点点？',cx-45,cy-151*scale,18,sim.damage>.2?'#cf0a2c':'#77745f');}
 if(w>700){ctx.save();ctx.translate(w-103,road-81);ctx.setLineDash([4,6]);ellipse(0,0,66,83,null,'#b6b09f',1);ctx.setLineDash([]);ctx.restore();pedal(w-103,road-75,.55,sim.broken);text('踏板小窗',w-103,road+25,10,'#807e72','center');}
 if(state==='countdown'){text(String(Math.max(1,Math.ceil(count))),w/2,h*.37,86,'#cf0a2c','center');}
 if(state==='failed'){ctx.fillStyle='#f6f1e4f5';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(Math.sin(cut*70)*Math.max(0,1-cut)*6,0);text('咔 嚓 ！',w*.3,h*.26,Math.min(65,w/8),'#cf0a2c','center');pedal(w*.3,h*.6,1.1,true);for(let i=0;i<9;i++){const a=i*Math.PI*2/9,r=95+cut*35;line([[w*.3+Math.cos(a)*r,h*.63+Math.sin(a)*r*.7],[w*.3+Math.cos(a)*(r+24),h*.63+Math.sin(a)*(r+24)*.7]],'#cf0a2c',2);}ctx.restore();}
}
function resize(){const rect=canvas.getBoundingClientRect();w=rect.width;h=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}new ResizeObserver(resize).observe(canvas);
let creakAt=0;
function tick(now){const dt=Math.min((now-last)/1000,.04);last=now;if(state!=='limit')clock+=dt;pollPads(now);checkRoundInput();menuNav.update(now);if((state==='run'||(state==='paused'&&previous==='run'))&&(currentDevice()!==roundDevice||(roundDifficulty!=='standard'&&!ready)))mixedInput=true;showBest();
 if(state==='countdown'){
  // Keep the visual clock independent of autoplay permission. tone() skips
  // locked audio, so missed beats are never queued or replayed after unlock.
  if(countdownBeat!==null)count=Math.max(0,count-dt);
  const digit=Math.ceil(count);
  if(digit!==countdownBeat){countdownBeat=digit;tone(digit===0);}
  if(digit===0){checkRoundInput();state='run';$('banner').textContent='开始刹车！';}
  else $('banner').textContent=digit+' · 松开刹车，准备出发';
 }
 if(state==='failed')cut+=dt;
 if(testUntil&&now>=testUntil){release();status('测试结束，已发送释放指令。');}
 if(state==='run'){
  if(ready&&now-lastInput>1800){pauseGame('USB 输入中断，已尝试释放。请检查连接。');}
  else{
   const mapped=pad&&binding&&Math.abs(binding.full-binding.rest)>=.1;const p=mapped?mappedInput(rawInput(pad,binding),binding):0;if(!ready&&mapped&&binding.digital&&held)mixedInput=true;
   brake=ready?hardware:mapped&&!binding.digital?p:Math.max(0,Math.min(1,brake+((held||(mapped&&p>.5))?dt*.68:-dt*1.3)));

   advance(sim,brake,dt);
   const outcome=roundOutcome(sim);
   if(outcome){if(outcome==='broken'){cut=0;crack(true);}finish(outcome);}
   if(state==='run'){$('banner').textContent=brake>.86?'收一点！踏板快撑不住了':brake>.65?'就是这个分寸，稳住。':'踩下刹车，把距离收短。';if(sim.damage>.1&&now-creakAt>380){creakAt=now;crack();}}
   if(state==='run'&&now-outputAt>65){outputAt=now;const rumbleAmount=.045+sim.speed/28*.08+brake*.16*(.6+.4*Math.sin(clock*45));if(ready){const hard=roundDifficulty==='hard';const warning=hard?drivingResistance.warningAt(sim.time):0;send(true,Math.min(1,rumbleAmount+warning),hard?drivingResistance.at(sim.time):.48+brake*.5);}else rumble.play(rumbleAmount);}

  }
 }
 if(brakeAudio)brakeAudio.update(brake,sim.speed,brakeSoundEnabled,state==='run');
 if(engineGain){const running=state==='run';engine.frequency.setTargetAtTime(42+sim.speed*2.2,audio.currentTime,.1);engineGain.gain.setTargetAtTime(running?.028:0,audio.currentTime,.06);}
 $('speed').textContent=Math.round(sim.speed*3.6);$('distance').textContent=sim.distance.toFixed(1);$('inputLabel').textContent='刹车行程 '+Math.round(brake*100)+'%';$('brakeFill').style.width=brake*100+'%';$('brakeFill').style.background=brake>.86?'#cf0a2c':'#292a25';$('healthValue').textContent=Math.round((1-sim.damage)*100)+'%';$('healthFill').style.width=(1-sim.damage)*100+'%';$('healthFill').style.background=sim.damage>.4?'#cf0a2c':'#8a9565';$('warning').textContent=sim.broken?'踏板已断裂':sim.damage>.1?'出现裂纹！松一点，避免继续损伤。':'听到异响，就收一点。';draw();if(!$('splash').hidden&&!document.hidden&&$('settings').hidden)drawTitleDrive($('titleScene'),dt);if(state==='run'||captureFinish){replay.capture(canvas,sim.time,Math.max(0,1-sim.damage),captureFinish);captureFinish=false;}if(state==='result'&&earnedReward&&!$('result').hidden){const remaining=replay.draw($('replayScene'),dt);$('replayHealth').textContent='回放耐久 '+(remaining*100).toFixed(1)+'%';}frameId=requestAnimationFrame(tick);
}
updateConnection();resize();requestAnimationFrame(tick);

if(window.desktopApp){document.body.classList.add('desktop');document.querySelectorAll('.browser-note').forEach(el=>el.hidden=true);window.desktopApp.onBeforeQuit(async()=>{pauseGame();await closeDevice();});}
