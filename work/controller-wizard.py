from pathlib import Path
r=Path('outputs/trigger-lab');p=r/'index.html';s=p.read_text();a=s.index('<div id="settings"');b=s.index('<div id="result"',a)
old=s[a:b];generic=old[old.index('<div class="generic-controls">'):old.index('<button id="pair"')]
audio=old[old.index('<label class="audio-option"'):old.index('<button id="backTitle"')]
new='''<div id="settings" class="overlay settings-screen" hidden><div class="paper wizard-paper"><span id="wizardStep" class="eyebrow">01 / 选择手柄</span><h1 id="wizardTitle">你用哪种手柄？</h1><div id="controllerChoice"><p>先选手柄类型，再按对应步骤连接。</p><div class="controller-choices"><button id="chooseDualSense" class="controller-card"><span class="controller-symbol">◉</span><span><b>DualSense</b><small>PS5 手柄 · USB 连接<br>震动 + 自适应扳机阻力</small></span><span>↗</span></button><button id="chooseOther" class="controller-card"><span class="controller-symbol">✚</span><span><b>其他手柄</b><small>Xbox / 通用 DInput、XInput<br>模拟刹车 · 支持时提供震动</small></span><span>↗</span></button></div></div><div id="controllerDetails" hidden><button id="changeType" class="wizard-back">← 重新选择手柄类型</button><div id="dualSenseOptions" hidden><p>① 用 USB 数据线连接 PS5 DualSense。<br>② 点击连接，在弹窗中选择手柄。<br>③ 轻按 R2，再分别测试震动和扳机阻力。</p><button id="pair" class="orange">连接 DualSense</button></div><div id="otherOptions" hidden><p>① 用 USB 或蓝牙把手柄连接到电脑。<br>② 回到此页面，按一下手柄任意键。<br>③ 从列表选择手柄，检查刹车读数。</p>'''+generic+'''</div><p id="setupStatus" role="status"></p><div class="test-buttons"><button id="testRumble" disabled>测试震动</button><button id="testForce" disabled>测试力回馈</button></div><button id="testStop" class="plain outlined">停止测试 / 释放</button><small id="testHint">每项测试 3 秒后自动停止。</small></div>'''+audio+'''<button id="backTitle" class="plain">← 返回标题画面</button></div></div>
'''
s=s[:a]+new+s[b:];s=s.replace('style.css?v=7','style.css?v=8').replace('game.mjs?v=7','game.mjs?v=8');p.write_text(s)
p=r/'game.mjs';s=p.read_text();s=s.replace("let selectedPad=null", "let controllerKind=null;\nlet selectedPad=null",1)
insert='''function showControllerStep(kind=null){controllerKind=kind;release();$('controllerChoice').hidden=!!kind;$('controllerDetails').hidden=!kind;$('dualSenseOptions').hidden=kind!=='dualsense';$('otherOptions').hidden=kind!=='other';$('testForce').hidden=kind!=='dualsense';$('wizardStep').textContent=kind?'02 / 连接与测试':'01 / 选择手柄';$('wizardTitle').textContent=kind==='dualsense'?'连接 DualSense':kind==='other'?'连接你的手柄':'你用哪种手柄？';$('testHint').textContent=kind==='dualsense'?'每项测试 3 秒。测试力回馈时，轻按 R2。':'震动测试持续 3 秒；无震动功能也可以正常游玩。';$('settings').scrollTop=0;updateConnection();}
$('chooseDualSense').onclick=()=>showControllerStep('dualsense');
$('chooseOther').onclick=async()=>{if(device)await closeDevice();showControllerStep('other');};
$('changeType').onclick=()=>showControllerStep();
'''
pos=s.index('let settingsFromGame=false;');s=s[:pos]+insert+s[pos:]
s=s.replace("$('settings').hidden=false;updateConnection();}","$('settings').hidden=false;showControllerStep();}")
s=s.replace("$('testForce').disabled=!ready;}","$('testForce').disabled=!ready;if(controllerKind==='other'){$('setupStatus').textContent=pad?'标准映射可直接使用 RT；输入不对时可在上方校准。':'不需要授权弹窗，按手柄任意键后等待识别。';}if(controllerKind==='dualsense'){$('setupStatus').textContent=ready?'连接成功，R2 输入已就绪。':device?'轻按 R2，确认 USB 输入。':'尚未连接，请点击上方按钮授权。';$('testRumble').disabled=!ready;}}")
p.write_text(s)
