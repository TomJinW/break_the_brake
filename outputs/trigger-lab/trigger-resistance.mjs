// Time is active driving time, so pauses do not consume the interval.
export class RandomResistance {
 constructor({interval=3,random=Math.random}={}){this.interval=interval;this.random=random;this.levels=[.3,.45,.6,.8,1];this.reset();}
 reset(){this.period=-1;this.index=-1;}
 // One brief cue 300 ms before each change; initial resistance has no cue.
 warningAt(seconds){
  const phase=Math.max(0,seconds)%this.interval;
  const start=this.interval-.3;
  return phase>=start&&phase<start+.14?.12:0;
 }
 at(seconds){
  const period=Math.floor(Math.max(0,seconds)/this.interval);
  if(period!==this.period){
   const choices=this.levels.map((_,i)=>i).filter(i=>i!==this.index);
   this.index=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];
   this.period=period;
  }
  return this.levels[this.index];
 }
}
