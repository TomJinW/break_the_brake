from pathlib import Path
root=Path('outputs/trigger-lab')
p=root/'index.html';s=p.read_text()
a=s.index('<div id="splash"');b=s.index('<div id="result"',a)
s=s[:a]+'''<div id="splash" class="overlay title-screen"><div class="title-art"><span>▱</span><b>100 → 0</b><small>一辆 MPV 的刹停挑战</small></div><div class="paper"><span class="eyebrow">MPV BRAKE CLUB / VOL. 02</span><h1>差一点<br>就停了。</h1><p>从 100 km/h 开始，把 MPV 尽快刹住。<br>太轻，停得太远；太重，踏板会断。</p><div class="howto"><b>推荐使用 PS5 DualSense 手柄</b><p>R2 控制刹车深度，感受路面震动与扳机阻力。<br>也可按住空格 / 屏幕按钮加压，松开回弹。<br>橙色危险区会损伤踏板，踩断立即失败。</p></div><button id="setup" class="plain outlined">连接 PS5 手柄 · 测试反馈 ↗</button><button id="start" class="orange">开始驾驶 <span>↗</span></button><small>完整停住才计成绩 · Esc 暂停 / 释放</small></div></div>
<div id="settings" class="overlay settings-screen" hidden><div class="paper"><span class="eyebrow">PS5 DUALSENSE / USB</span><h1>先找找脚感。</h1><p>用 USB 数据线连接普通 DualSense，<br>点击下方按钮，在弹窗中选择手柄。</p><button id="pair" class="orange">连接手柄</button><p id="setupStatus" role="status">等待连接。测试需在成功连接后进行。</p><div class="test-buttons"><button id="testRumble" disabled>测试震动</button><button id="testForce" disabled>测试力回馈</button></div><button id="testStop" class="plain outlined">停止测试 / 释放</button><small>每项测试 3 秒，力回馈测试时请轻按 R2。</small><button id="backTitle" class="plain">← 返回标题画面</button></div></div>
'''+s[b:]
s=s.replace('<div class="result-number">','<div id="resultNumber" class="result-number">')
s=s.replace('<small>Enter 快速重开</small>','<button id="toTitle" class="plain">返回标题画面</button><small>Enter 快速重开</small>')
s=s.replace('一辆虚构 MPV，一块有脾气的踏板。','一辆虚构 MPV，一块有脾气的踏板。')
p.write_text(s)
p=root/'game.mjs';s=p.read_text()
s=s.replace('let lastInput=', 'let lastInput=')
s=s.replace('let last=performance.now()', "let testUntil=0;\nlet last=performance.now()")
a=s.index('function updateConnection()');b=s.index('function input(',a)
s=s[:a]+'''function updateConnection(){ $('pair').disabled=connecting;$('pair').textContent=device?'断开手柄':connecting?'等待授权…':'连接手柄';$('connect').textContent='手柄设置';$('connection').textContent=ready?'● USB 手柄已连接 · R2 刹车':device?'正在确认 USB 输入…':'键盘 / 触屏也能玩';$('setupStatus').textContent=ready?'已连接！分别测试震动和 R2 阻力。':device?'轻按一下 R2，确认 USB 输入。':'等待连接。测试需在成功连接后进行。';$('testRumble').disabled=!ready;$('testForce').disabled=!ready;}
'''+s[b:]
s=s.replace("$('connect').onclick=async()=>{", "$('pair').onclick=async()=>{")
s=s.replace("function status(t){$('status').textContent=t;}","function status(t){$('status').textContent=t;$('setupStatus').textContent=t;}")
s=s.replace("function release(){outputAt=0;return send();}","function release(){testUntil=0;outputAt=0;return send();}")
s=s.replace("function start(){soundInit();release();", "function start(){soundInit();release();document.body.classList.remove('failed');$('settings').hidden=true;")
s=s.replace("['run','countdown','broken']", "['run','countdown']")
a=s.index('function finish()');b=s.index("$('start').onclick",a)
s=s[:a]+'''function finish(){const good=!sim.broken;state=good?'result':'failed';release();held=false;document.body.classList.toggle('failed',!good);const newBest=good&&sim.distance<best;if(newBest){best=sim.distance;try{localStorage.setItem('brake-sketch-best',String(best));}catch{}$('best').textContent=best.toFixed(1);}$('resultTag').textContent=good?(newBest?'新的个人最佳！':'完整刹停'):'踏板断裂 / 本局无成绩';$('resultTitle').textContent=good?'稳稳停住！':'游戏失败';$('resultNumber').hidden=!good;if(good)$('resultDistance').textContent=sim.distance.toFixed(1);$('resultText').textContent=good?'踏板保住了。下一次，试着再少滑一点。':'踩过头了！下次看到裂纹、听到异响，就收一点。';$('result').hidden=false;$('banner').textContent=good?'停住了。脚法不错！':'踏板断裂';if(good)tone();}
function title(){release();state='ready';held=false;brake=0;sim=fresh();document.body.classList.remove('failed');$('splash').hidden=false;$('result').hidden=true;$('pause').hidden=true;$('settings').hidden=true;$('banner').textContent='准备出发';}
function settings(){pauseGame();title();$('settings').hidden=false;updateConnection();}
$('setup').onclick=settings;$('connect').onclick=settings;$('backTitle').onclick=title;$('toTitle').onclick=title;
$('testRumble').onclick=()=>{if(!ready)return;soundInit();release();send(false,.55);testUntil=performance.now()+3000;status('震动测试中 · 3 秒后自动停止。');};
$('testForce').onclick=()=>{if(!ready)return;soundInit();release();send(true,0,.85);testUntil=performance.now()+3000;status('力回馈测试中 · 轻按 R2，3 秒后自动释放。');};
$('testStop').onclick=()=>{release();status('已发送停止测试与释放指令。');};
'''+s[b:]
s=s.replace("['ready','result'].includes(state)","['ready','result','failed'].includes(state)&&$('settings').hidden")
s=s.replace('move=sim.distance*7','move=sim.distance*35')
s=s.replace("if(state==='run'&&sim.speed>4){for(let i=0;i<4;i++)line([[cx-190*scale-i*8,cy-80+i*20],[cx-220*scale-i*12,cy-80+i*20]],'#aaa693',1.5);}","""if(state==='run'&&sim.speed>4){const k=sim.speed/(100/3.6);for(let i=0;i<18;i++){const sx=((i*173-clock*sim.speed*65)%(w+350)+w+350)%(w+350)-170;const sy=125+(i*47)%(road-145);line([[sx,sy],[sx+25+k*100,sy]],'#aaa693',.7+k);}text('100 km/h → 0',24,road+85,12,'#807e72');}""")
s=s.replace("if(state==='broken'&&cut<1.55)","if(state==='failed')")
s=s.replace("text('咔 嚓 ！',w*.5,h*.28", "text('咔 嚓 ！',w*.3,h*.26")
s=s.replace('pedal(w*.48,h*.6,1.25,true)', 'pedal(w*.3,h*.6,1.1,true)')
s=s.replace('w*.49+Math.cos(a)', 'w*.3+Math.cos(a)')
s=s.replace("text('踏板断了，脚下突然一空。',w/2,h*.88,16,'#292a25','center');", "")
s=s.replace("if(state==='run'||state==='broken'){", "if(state==='failed')cut+=dt;\n if(testUntil&&now>=testUntil){release();status('测试结束，已发送释放指令。');}\n if(state==='run'){")
s=s.replace("   if(state==='broken')cut+=dt;",'')
s=s.replace("if(!was&&sim.broken){state='broken';cut=0;crack(true);send(false,.7);outputAt=now+180;$('banner').textContent='踏板断裂！正在滑行…';}","if(!was&&sim.broken){cut=0;crack(true);finish();}")
s=s.replace("if(sim.speed===0)finish();","if(state==='run'&&sim.speed===0)finish();")
s=s.replace("   if(state==='broken'&&now>outputAt){outputAt=now+100;send(false,cut<.18?.65:.04);}",'')
s=s.replace("const running=state==='run'||state==='broken'", "const running=state==='run'")
p.write_text(s)
p=root/'physics.mjs';s=p.read_text().replace('if(s.speed<=0)return;', 'if(s.speed<=0||s.broken)return;').replace('s.damage=1;s.broken=true;', 's.damage=1;s.broken=true;return;').replace('const decel=s.broken?2.8:.28+10.8*brake;', 'const decel=.28+10.8*brake;')
p.write_text(s)
