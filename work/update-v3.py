from pathlib import Path
root=Path('outputs/trigger-lab')
p=root/'physics.mjs';s=p.read_text().replace('(brake-.86)*11','(brake-.86)*55');p.write_text(s)
p=root/'game.mjs';s=p.read_text().replace("from './physics.mjs';","from './physics.mjs?v=3';\nimport {createBrakeAudio} from './brake-audio.mjs';")
s=s.replace('let audio=null,engine=null',"let brakeAudio=null,brakeSoundEnabled=true;\ntry{brakeSoundEnabled=localStorage.getItem('brake-sketch-brake-sound')!=='off';}catch{}\n$('brakeSoundToggle').checked=brakeSoundEnabled;\n$('brakeSoundToggle').addEventListener('change',()=>{brakeSoundEnabled=$('brakeSoundToggle').checked;try{localStorage.setItem('brake-sketch-brake-sound',brakeSoundEnabled?'on':'off');}catch{}});\nlet audio=null,engine=null")
s=s.replace('engine.start();}audio.resume()', 'engine.start();brakeAudio=createBrakeAudio(audio,master);}audio.resume()')
s=s.replace("$('connect').textContent='手柄设置'", "$('connect').textContent='设置 / 手柄'")
s=s.replace("function openSettings(){release();state='ready';held=false;", "let settingsFromGame=false;\nfunction openSettings(){settingsFromGame=['run','countdown','paused'].includes(state);pauseGame();release();held=false;$('backTitle').textContent=settingsFromGame?'← 返回游戏':'← 返回标题画面';")
s=s.replace("$('backTitle').onclick=title;", "$('backTitle').onclick=()=>{if(settingsFromGame){release();$('settings').hidden=true;$('pause').hidden=false;}else title();};")
anchor=" line([[0,road],[w*.35,road+1]"
idx=s.index(anchor)
s=s[:idx]+''' // Near roadside row: fixed world spacing; displacement follows integrated distance.
 const treeSpacing=185,treeTravel=sim.distance*35*.94,firstTree=Math.floor(treeTravel/treeSpacing)-1;
 for(let i=firstTree;i<=firstTree+Math.ceil(w/treeSpacing)+2;i++){
  const x=i*treeSpacing-treeTravel,base=road-8,th=135+((i%3+3)%3)*13;
  line([[x-4,base],[x-2,base-th*.52],[x+4,base-th*.52],[x+5,base]],'#696d52',3);
  ellipse(x,base-th*.74,33,th*.29,'#d3d8ad','#7b8160',1.8);
  ellipse(x-23,base-th*.60,25,29,'#d3d8ad','#7b8160',1.6);
  ellipse(x+24,base-th*.61,24,32,'#d3d8ad','#7b8160',1.6);
  line([[x,base-25],[x-1,base-th*.65],[x-15,base-th*.75]],'#8d9370',1.3);
  line([[x-17,base+2],[x+21,base+2]],'#a9ad8f',1.4);
 }
'''+s[idx:]
s=s.replace('i*173-clock*sim.speed*65','i*173-sim.distance*65')
s=s.replace(" if(engineGain){", " if(brakeAudio)brakeAudio.update(brake,sim.speed,brakeSoundEnabled,state==='run');\n if(engineGain){")
p.write_text(s)
p=root/'index.html';s=p.read_text().replace('VOL. 02','VOL. 03').replace('game.mjs?v=2','game.mjs?v=3').replace('style.css"','style.css?v=3"')
s=s.replace('<button id="backTitle"', '''<label class="audio-option" for="brakeSoundToggle"><span><b>刹车音效</b><small>随刹车深度变化的摩擦声与尖啸声</small></span><input id="brakeSoundToggle" type="checkbox" checked></label><button id="backTitle"''')
p.write_text(s)
p=root/'README.txt';s=p.read_text()+'''\n第三版：路边新增近景树列；踏板承受损伤降至初版的 1/5（过载损伤速度五倍，86% 边界不变）。\n从零损伤开始，全压约 0.13 秒断裂，90% 约 0.455 秒断裂。\n设置页新增独立刹车音效开关，偏好存储在本地；其他音效仍由总声音开关控制。\n''';p.write_text(s)
