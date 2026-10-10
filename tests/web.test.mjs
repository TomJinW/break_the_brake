import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,advance} from '../outputs/trigger-lab/physics.mjs';
import {roundOutcome} from '../outputs/trigger-lab/round-outcome.mjs';
import {nearMissReward,BrakeReplay} from '../outputs/trigger-lab/round-extras.mjs';
import {finishTitle} from '../outputs/trigger-lab/finish-verdict.mjs';
import {inputSessionKey} from '../outputs/trigger-lab/input-session.mjs';
import {readBest,recordBest} from '../outputs/trigger-lab/records.mjs';
import {Rumble,actuator} from '../outputs/trigger-lab/gamepad.mjs';
import {RandomResistance} from '../outputs/trigger-lab/trigger-resistance.mjs';

test('a near-stopped car cannot break from damage after its actual stopping time',()=>{
 const s={...fresh(),speed:.01,damage:.98};advance(s,1,.04);
 assert.equal(s.speed,0);assert.equal(s.broken,false);assert.ok(s.damage<.99);assert.ok(s.time<.002);
});
test('break and stop results are stable across frame rates',()=>{
 function run(dt,p){const s=fresh();while(!roundOutcome(s))advance(s,p,dt);return s;}
 for(const p of [.8,.865,1]){const a=run(1/30,p),b=run(1/144,p);assert.equal(roundOutcome(a),roundOutcome(b));assert.ok(Math.abs(a.distance-b.distance)<1e-7);assert.ok(Math.abs(a.damage-b.damage)<1e-7);}
});
test('damage never regenerates and cannot accumulate after stop',()=>{const s=fresh();advance(s,.9,.1);const damage=s.damage;advance(s,0,1);assert.equal(s.damage,damage);s.speed=0;advance(s,1,1);assert.equal(s.damage,damage);});
test('distance cap and near-miss boundaries',()=>{
 assert.equal(roundOutcome({...fresh(),distance:250}),null);assert.equal(roundOutcome({...fresh(),distance:250.01}),'limit');
 assert.equal(nearMissReward({...fresh(),speed:0,damage:.5}),false);assert.equal(nearMissReward({...fresh(),speed:0,damage:.5001}),true);assert.equal(nearMissReward({...fresh(),speed:1,damage:.6}),false);
 assert.equal(finishTitle(70),'干净利落！');assert.equal(finishTitle(70,true),'差一点就断了！');
});
test('same-category device, calibration and transport changes invalidate session identity',()=>{
 const p={id:'pad',index:0},b={kind:'button',index:7,rest:0,full:1,digital:false},key=inputSessionKey(false,p,b);
 assert.notEqual(inputSessionKey(false,{...p,index:1},b),key);assert.notEqual(inputSessionKey(false,p,{...b,full:.8}),key);assert.notEqual(inputSessionKey(false,p,{...b,digital:true}),key);assert.notEqual(inputSessionKey(true,p,b),key);assert.equal(inputSessionKey(false,null,null),'keyboard');
});
test('ineligible rounds cannot set a record and difficulty records stay separate',()=>{
 const m=new Map(),s={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 assert.equal(recordBest(s,'ds5',60,false,'hard'),false);assert.equal(readBest(s,'ds5','hard'),Infinity);recordBest(s,'ds5',70,true,'easy');assert.equal(readBest(s,'ds5','hard'),Infinity);
});
test('pulse-only controller is detected, vibrated and stopped',async()=>{
 const calls=[],a={pulse:(...args)=>{calls.push(args);return Promise.resolve(true);}},r=new Rumble();r.set({id:'pulse',index:0,hapticActuators:[a]});assert.equal(actuator(r.pad),a);r.play(.4,200,true);r.stop();await Promise.resolve();assert.deepEqual(calls,[[.4,200],[0,1]]);
});
test('an old controller rejection cannot disable the new controller',async()=>{
 let reject;const r=new Rumble();r.set({id:'old',index:0,vibrationActuator:{playEffect:()=>new Promise((_,r)=>reject=r),reset:()=>Promise.resolve()}});r.play(.2,100,true);r.set({id:'new',index:1});reject(Error('disconnected'));await Promise.resolve();assert.equal(r.failed,false);
});
test('warning cue precedes resistance changes and starts silent',()=>{const r=new RandomResistance({random:()=>0});assert.equal(r.warningAt(0),0);assert.equal(r.warningAt(2.75),.12);assert.equal(r.warningAt(3),0);const first=r.at(0);assert.equal(r.at(2.75),first);assert.notEqual(r.at(3),first);});
test('replay remains bounded and has no findLast dependency',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}})})};
 try{const r=new BrakeReplay();for(let i=0;i<1000;i++)r.capture({width:1000,height:540},i/10,.4);assert.ok(r.frames.length<=31);r.frames.findLast=undefined;assert.equal(r.draw({getContext:()=>({drawImage(){}})},.1),.4);r.reset();assert.equal(r.frames.length,0);}finally{globalThis.document=old;}
});


test('result menus consume Space without activating controls, but retain Enter and controller confirmation', async()=>{
 const {MenuNavigation}=await import('../outputs/trigger-lab/menu-navigation.mjs');
 const nav=new MenuNavigation({source:()=>({}),back:()=>{},pause:()=>{}});
 nav.sync=()=>{};nav.modal={id:'result'};
 let clicks=0,prevented=0;nav.focused={tagName:'BUTTON',click:()=>clicks++};
 for(const repeat of [false,true])nav.key({code:'Space',repeat,preventDefault:()=>prevented++});
 assert.equal(clicks,0);assert.equal(prevented,2);
 nav.key({code:'Enter',repeat:false,preventDefault:()=>{}});assert.equal(clicks,1);
 nav.confirm();assert.equal(clicks,2);
});

test('both standard triggers brake independently and combine by maximum',async()=>{
 const {defaultBinding,rawInput,mappedInput}=await import('../outputs/trigger-lab/gamepad.mjs');
 const p={mapping:'standard',axes:[],buttons:Array.from({length:8},()=>({value:0}))},b=defaultBinding(p);
 assert.equal(b.kind,'triggers');
 for(const i of [6,7])for(const value of [0,.1,.5,1]){p.buttons[6].value=0;p.buttons[7].value=0;p.buttons[i].value=value;assert.equal(mappedInput(rawInput(p,b),b),value);}
 p.buttons[6].value=.7;p.buttons[7].value=.6;assert.equal(rawInput(p,b),.7);
 assert.equal(defaultBinding({...p,mapping:''}),null);
});
test('saved legacy and calibrated custom bindings remain unchanged',async()=>{
 const {resolveBinding,rawInput,mappedInput}=await import('../outputs/trigger-lab/gamepad.mjs');
 const p={mapping:'standard',axes:[-.5],buttons:Array.from({length:8},()=>({value:0}))};
 const old={kind:'button',index:7,rest:0,full:1,digital:false};assert.deepEqual(resolveBinding(p,old),old);
 p.buttons[6].value=1;assert.equal(rawInput(p,resolveBinding(p,old)),0);
 const custom={kind:'axis',index:0,rest:1,full:-1,digital:true};assert.deepEqual(resolveBinding(p,custom),custom);assert.equal(mappedInput(rawInput(p,custom),custom),.75);
 const both=resolveBinding(p,null);assert.deepEqual(resolveBinding(p,JSON.parse(JSON.stringify(both))),both);
});
test('DualSense USB reads either trigger and writes and releases both effect blocks',async()=>{
 const {usbInput,usbReport}=await import('../outputs/trigger-lab/protocol.mjs');
 const d=new DataView(new ArrayBuffer(63));
 for(const index of [4,5])for(const value of [0,127,255]){d.setUint8(4,0);d.setUint8(5,0);d.setUint8(index,value);assert.equal(usbInput(1,d),value/255);}
 d.setUint8(4,180);d.setUint8(5,90);assert.equal(usbInput(1,d),180/255);
 assert.equal(usbInput(2,d),null);assert.equal(usbInput(1,new DataView(new ArrayBuffer(9))),null);
 const active=usbReport({active:true,start:.12,strength:.85,rumble:.4});assert.equal(active.length,47);assert.equal(active[0],15);
 for(const offset of [10,21])assert.deepEqual([...active.slice(offset,offset+3)],[1,31,217]);
 assert.deepEqual([...active.slice(10,21)],[...active.slice(21,32)]);
 const released=usbReport();assert.equal(released[0],15);assert.ok(released.slice(2).every(v=>v===0));
});
