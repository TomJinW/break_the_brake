export function nearMissReward(s){return !s.broken&&s.speed===0&&s.damage>.5&&s.damage<1;}
export const FAILURE_REPORTS=[
 '制动请求已收到，踏板连接已结束。',
 '经检测，车辆仍具备滑行能力。',
 '本次测试成功发现了驾驶员。',
 '踏板已完成一次性使用使命。',
 '系统运行正常，异常部件已自行离线。',
 '您的制动需求已转交路面摩擦处理。'
];
export function failureReport(previous,random=Math.random){const options=FAILURE_REPORTS.filter(t=>t!==previous);return options[Math.min(options.length-1,Math.floor(random()*options.length))];}
// A bounded 3-second visual recording. Playback never touches physics or devices.
export class BrakeReplay {
 constructor(){this.reset();}
 reset(){this.frames=[];this.pool=[];this.last=-Infinity;this.elapsed=0;}
 capture(scene,time,remaining,force=false){
  if(!force&&time-this.last<.1)return;
  this.last=time;
  while(this.frames.length&&time-this.frames[0].time>3)this.pool.push(this.frames.shift().canvas);
  const c=this.pool.pop()||document.createElement('canvas');c.width=480;c.height=Math.round(480*scene.height/scene.width);
  c.getContext('2d').drawImage(scene,0,0,c.width,c.height);
  this.frames.push({canvas:c,time,remaining});
 }
 draw(target,dt){
  if(!this.frames.length)return;
  this.elapsed+=dt;
  const first=this.frames[0],last=this.frames[this.frames.length-1],duration=last.time-first.time;
  const t=first.time+Math.min(duration,(this.elapsed%(duration*2+1))*.5);
  let frame=first;for(let i=this.frames.length-1;i>=0;i--){if(this.frames[i].time<=t){frame=this.frames[i];break;}}
  if(target.width!==frame.canvas.width||target.height!==frame.canvas.height){target.width=frame.canvas.width;target.height=frame.canvas.height;}
  target.getContext('2d').drawImage(frame.canvas,0,0);
  return frame.remaining;
 }
}
