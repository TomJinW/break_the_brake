from pathlib import Path
r=Path('outputs/trigger-lab');p=r/'records.mjs';s=p.read_text().replace("ds5:'DS5'","ds5:'DualSense（PS5 手柄）'").replace("keyboard:'键盘触摸屏'","keyboard:'键盘 / 触摸屏'");p.write_text(s)
p=r/'game.mjs';s=p.read_text().replace("from './records.mjs'","from './records.mjs?v=10'");s="import {MenuNavigation,navigationState} from './menu-navigation.mjs';\n"+s
s=s.replace("let controllerKind=null;","let controllerKind=null,hidMenu={},roundDeviceName='键盘 / 触摸屏';")
s=s.replace("function currentDevice(){", "function deviceName(){if(ready)return 'DualSense（PS5 手柄） · USB 自适应阻力';if(currentDevice()==='keyboard')return '键盘 / 触摸屏';if(currentDevice()==='ds5')return 'DualSense（PS5 手柄） · 通用模式';return (pad?.id||'普通手柄')+' · 普通手柄';}\nfunction currentDevice(){")
s=s.replace("$('best').textContent=Number.isFinite(best)?best.toFixed(1):'—';}","$('best').textContent=Number.isFinite(best)?best.toFixed(1):'—';$('currentDevice').textContent='当前设备：'+deviceName();}")
s=s.replace("hardware=v;lastInput=performance.now();", "hardware=v;lastInput=performance.now();const bits=e.data.getUint8(7),extra=e.data.getUint8(8),d=bits&15;hidMenu={up:[0,1,7].includes(d),down:[3,4,5].includes(d),left:[5,6,7].includes(d),right:[1,2,3].includes(d),confirm:!!(bits&32),back:!!(bits&64),menu:!!(extra&32)};const hx=e.data.getUint8(0),hy=e.data.getUint8(1);hidMenu.left ||= hx<57;hidMenu.right ||= hx>198;hidMenu.up ||= hy<57;hidMenu.down ||= hy>198;")
s=s.replace("踏板保住了。成绩只与同类设备比较。","踏板保住了。")
s=s.replace("$('result').hidden=false;$('banner')", "$('resultDevice').textContent='本局设备：'+roundDeviceName;$('result').hidden=false;$('banner')")
s=s.replace("roundDevice=currentDevice();mixedInput=false;", "roundDevice=currentDevice();roundDeviceName=deviceName();mixedInput=false;")
# Install menu navigation after handlers are defined, before frame loop begins.
pos=s.index("window.addEventListener('keydown'")
s=s[:pos]+'''function menuBack(){if(!$('settings').hidden){if(controllerKind)showControllerStep();else $('backTitle').click();}else if(!$('pause').hidden)$('resume').click();else if(!$('result').hidden)title();}
const menuNav=new MenuNavigation({source:()=>ready&&performance.now()-lastInput<1500?hidMenu:navigationState(pad||readPads()[0]),back:menuBack,pause:()=>pauseGame()});
'''+s[pos:]
s=s.replace("window.addEventListener('keydown',e=>{if(e.code", "window.addEventListener('keydown',e=>{if(menuNav.key(e))return;if(e.code",1)
s=s.replace("clock+=dt;pollPads(now);", "clock+=dt;pollPads(now);menuNav.update(now);")
p.write_text(s)
p=r/'index.html';s=p.read_text().replace('game.mjs?v=9','game.mjs?v=10').replace('style.css?v=9','style.css?v=10')
s=s.replace('<span id="connection">','<span id="connection">',1).replace('<span>一辆虚构 MPV，一块有脾气的踏板。</span>','<span id="currentDevice">当前设备：键盘 / 触摸屏</span>')
s=s.replace('<p id="resultText"></p>','<p id="resultDevice" class="result-device"></p><p id="resultText"></p>')
s=s.replace('<small>Enter 快速重开</small>','')
s=s.replace('R2 精确控制力度。','RT / R2 精确控制力度。').replace('SPACE / R2','SPACE / RT')
# Add consistently positioned navigation instructions inside each modal.
for closing in ['</div></div>\n<div id="settings"','</div></div>\n<div id="result"','</div></div>\n<div id="pause"','</div></div>\n<div id="banner"']:
 if closing in s:s=s.replace(closing,'<div class="menu-hint"><span>十字键 / 左摇杆 选择</span><span><kbd>A</kbd> 确认 <kbd>B</kbd> 返回</span><span>键盘 ↑↓ / Enter / Esc</span></div>'+closing,1)
s=s.replace('>暂停 / 释放 <kbd>ESC</kbd>','>暂停 / 释放 <kbd>Menu / Esc</kbd>')
p.write_text(s)
