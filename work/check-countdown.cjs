const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('outputs/trigger-lab/game.mjs','utf8');
const from=source.indexOf(" if(state==='countdown'){",source.indexOf('function tick(now)'));
const to=source.indexOf(" if(state==='failed')",from);
const code=source.slice(from,to);
function scenario(unlockAt){
 const played=[],banner={textContent:''};
 const c={state:'countdown',count:3,countdownBeat:null,dt:1/60,audio:{state:'suspended'},currentDevice:()=> 'generic',deviceName:()=> 'Xbox',$:()=>banner,tone(go){if(c.audio.state==='running')played.push(go?'go':Math.ceil(c.count));}};
 vm.createContext(c);let frames=0;
 while(c.state==='countdown'&&frames<240){if(frames===unlockAt)c.audio.state='running';vm.runInContext(code,c);frames++;}
 assert.equal(c.state,'run');assert.ok(frames>=180&&frames<=183);assert.equal(banner.textContent,'开始刹车！');return played;
}
assert.deepEqual(scenario(Infinity),[]);
assert.deepEqual(scenario(0),[3,2,1,'go']);
assert.deepEqual(scenario(90),[1,'go']);
console.log('PASS: suspended audio starts game; normal beats align; late unlock does not replay missed beats.');
