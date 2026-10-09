from pathlib import Path
r=Path('outputs/trigger-lab')
p=r/'index.html';s=p.read_text();s=s.replace('PS5 DUALSENSE / USB','CONTROLLER / 通用手柄 & DUALSENSE')
s=s.replace('用 USB 数据线连接普通 DualSense，<br>点击下方按钮，在弹窗中选择手柄。','通用手柄先通过 USB / 蓝牙连接电脑，再按一下按键。<br>标准映射自动使用 RT；非标准映射请在下面设置。')
s=s.replace('<button id="pair"', '''<div class="generic-controls"><label for="padSelect">通用手柄</label><select id="padSelect"><option value="">自动识别中 · 请按手柄任意键</option></select><p id="padStatus" role="status">尚未检测到浏览器可用的手柄。</p><div id="mappingPanel" hidden><label for="bindingSelect">刹车输入</label><select id="bindingSelect"></select><div class="test-buttons"><button id="calRest">记录松开位置</button><button id="calFull">记录压到底位置</button></div><label class="digital-option"><input id="digitalInput" type="checkbox">按键渐进加压（非线性扳机）</label><output id="padLive">等待输入</output><details><summary>所有输入实时读数（查找 DInput 刹车轴）</summary><pre id="rawInputs"></pre></details></div></div><button id="pair"''')
s=s.replace('>连接手柄</button>','>连接 DualSense 专用力反馈</button>')
s=s.replace('连接 PS5 手柄 · 测试反馈 ↗','连接手柄 · 测试反馈 ↗').replace('R2 控制刹车深度，感受路面震动与扳机阻力。','RT / R2 控制刹车深度；DualSense 可额外开启扳机阻力。').replace('手柄模式：USB 连接普通 DualSense，驾驶时同时输出震动和扳机阻力。','通用手柄：连接电脑后按任意键识别。DualSense 可在设置里额外授权自适应阻力。').replace('game.mjs?v=6','game.mjs?v=7').replace('style.css?v=3','style.css?v=7')
p.write_text(s)
p=r/'game.mjs';s=p.read_text();s="import {rawInput,mappedInput,defaultBinding,actuator,Rumble} from './gamepad.mjs';\n"+s
pos=s.index('let testUntil=0')
s=s[:pos]+'''let selectedPad=null,pad=null,binding=null,padSignature='',autoPick=true,padPollAt=0;
const rumble=new Rumble(()=>{status('浏览器震动输出失败，仍可正常操作刹车。');updateConnection();});
function readPads(){try{return Array.from(navigator.getGamepads?.()||[]).filter(p=>p?.connected);}catch{return [];}}
function saveBinding(){if(pad&&binding)try{localStorage.setItem('brake-binding:'+pad.id,JSON.stringify(binding));}catch{}}
function loadBinding(p){let b;try{b=JSON.parse(localStorage.getItem('brake-binding:'+p.id));}catch{}if(b&&['axis','button'].includes(b.kind)&&Number.isInteger(b.index)&&b.index>=0&&b.index<(b.kind==='axis'?p.axes.length:p.buttons.length)&&Number.isFinite(b.rest)&&Number.isFinite(b.full))return b;return defaultBinding(p);}
function selectPad(p){release();if(['run','countdown'].includes(state))pauseGame('输入设备变化，请确认后继续。');pad=p;selectedPad=p?.index??null;rumble.set(p);binding=p?loadBinding(p):null;const list=$('bindingSelect');list.replaceChildren();if(p){list.add(new Option('请选择刹车轴或按键',''));p.buttons.forEach((_,i)=>list.add(new Option('按键 '+i+(p.mapping==='standard'&&i===7?' · RT / R2':''),'button:'+i)));p.axes.forEach((_,i)=>list.add(new Option('轴 '+i,'axis:'+i)));list.value=binding?binding.kind+':'+binding.index:'';$('digitalInput').checked=!!binding?.digital;}$('mappingPanel').hidden=!p;updateConnection();}
function pollPads(now){if(now<padPollAt)return;padPollAt=now+50;const pads=readPads();const signature=pads.map(p=>p.index+':'+p.id).join('|');if(signature!==padSignature){padSignature=signature;const sel=$('padSelect');sel.replaceChildren(new Option('不用通用手柄 / 键盘触屏',''));for(const p of pads)sel.add(new Option(p.id,String(p.index)));if(selectedPad!==null&&!pads.some(p=>p.index===selectedPad&&p.id===pad?.id)){autoPick=false;selectPad(null);}if(selectedPad===null&&autoPick&&pads.length){autoPick=false;selectPad(pads[0]);}sel.value=selectedPad===null?'':String(selectedPad);}
 const current=pads.find(p=>p.index===selectedPad);if(current){pad=current;rumble.set(pad);}if(pad&&!$('settings').hidden){const raw=rawInput(pad,binding),v=mappedInput(raw,binding);$('padLive').textContent=binding?'原始 '+raw.toFixed(3)+' → 刹车 '+Math.round(v*100)+'% · 松开 '+binding.rest.toFixed(2)+' / 全压 '+binding.full.toFixed(2):'选择输入，再分别记录松开与压到底的位置';$('rawInputs').textContent='按键 '+pad.buttons.map((b,i)=>i+':'+b.value.toFixed(2)).join('  ')+'\\n轴 '+pad.axes.map((a,i)=>i+':'+a.toFixed(2)).join('  ');}}
$('padSelect').onchange=()=>{autoPick=false;selectPad(readPads().find(p=>String(p.index)===$('padSelect').value)||null);};
$('bindingSelect').onchange=()=>{release();const value=$('bindingSelect').value;if(!value){binding=null;return;}const [kind,index]=value.split(':');binding={kind,index:Number(index),rest:0,full:kind==='button'?1:0,digital:false};$('digitalInput').checked=false;saveBinding();updateConnection();};
for(const [id,key] of [['calRest','rest'],['calFull','full']])$(id).onclick=()=>{if(!pad||!binding)return;binding[key]=rawInput(pad,binding);saveBinding();updateConnection();};
$('digitalInput').onchange=()=>{if(binding){binding.digital=$('digitalInput').checked;saveBinding();}};
'''+s[pos:]
s=s.replace("function release(){testUntil=0;outputAt=0;return send();}","function release(){testUntil=0;outputAt=0;rumble.stop();return send();}")
a=s.index('function updateConnection()');b=s.index('function input(',a)
s=s[:a]+'''function updateConnection(){ $('pair').disabled=connecting;$('pair').textContent=device?'断开 DualSense 专用连接':connecting?'等待授权…':'连接 DualSense 专用力反馈';$('connect').textContent='设置 / 手柄';const mapped=pad&&binding&&Math.abs(binding.full-binding.rest)>=.1;$('connection').textContent=ready?'● DualSense 专用连接 · R2 刹车':mapped?'● 通用手柄 · '+(binding.kind==='button'?'按键 ':'轴 ')+binding.index:pad?'通用手柄已检测 · 请配置刹车输入':'键盘 / 触屏也能玩';$('setupStatus').textContent=ready?'专用连接已启用，优先使用 R2；可测试震动与阻力。':device?'轻按 R2 确认专用 USB 输入。':'普通手柄无需下方专用授权；自适应阻力仅限 DualSense。';$('padStatus').textContent=pad?(pad.mapping==='standard'?'标准映射':'非标准映射 · 请校准')+' · '+(actuator(pad)&&!rumble.failed?'可测试震动':'浏览器未提供可用震动')+(ready?' · 当前优先使用专用 R2':''):'未检测到手柄：连接电脑后，在此页面按一下手柄按键。';$('testRumble').disabled=!(ready||(actuator(pad)&&!rumble.failed));$('testForce').disabled=!ready;}
'''+s[b:]
s=s.replace("$('testRumble').onclick=()=>{if(!ready)return;soundInit();release();send(false,.55);", "$('testRumble').onclick=()=>{if(!ready&&!actuator(pad))return;soundInit();release();if(ready)send(false,.55);else rumble.play(.55,3000,true);")
s=s.replace("clock+=dt;", "clock+=dt;pollPads(now);")
s=s.replace("brake=ready?hardware:Math.max(0,Math.min(1,brake+(held?dt*.68:-dt*1.3)));", "const mapped=pad&&binding&&Math.abs(binding.full-binding.rest)>=.1;const p=mapped?mappedInput(rawInput(pad,binding),binding):0;\n   brake=ready?hardware:mapped&&!binding.digital?p:Math.max(0,Math.min(1,brake+((held||(mapped&&p>.5))?dt*.68:-dt*1.3)));")
s=s.replace("send(true,rumble,.48+brake*.5);", "if(ready)send(true,rumble,.48+brake*.5);else genericRumble(rumble);")
# Avoid shadowing the Rumble instance by the existing per-frame amount variable.
s=s.replace("const rumble=.045", "const rumbleAmount=.045").replace("send(true,rumble,.48", "send(true,rumbleAmount,.48").replace("genericRumble(rumble)","rumble.play(rumbleAmount)")
p.write_text(s)
