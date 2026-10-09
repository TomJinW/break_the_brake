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
