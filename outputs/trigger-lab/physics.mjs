// Arcade pacing; score distance uses the same calibrated units as world rendering.
export const DECEL_MULTIPLIER=.6;
export const DISTANCE_MULTIPLIER=.85;
// Twice the previous pedal capacity; normalized damage still runs from 0 to 1.
export const PEDAL_DAMAGE_RATE=27.5;
export function fresh(){return {speed:100/3.6,distance:0,damage:0,broken:false,time:0};}
export function advance(s,brake,dt){
 brake=Math.min(1,Math.max(0,brake));
 if(s.speed<=0||s.broken)return;
 const decel=(.28+10.8*brake)*DECEL_MULTIPLIER;
 const stopTime=s.speed/decel;
 const damageRate=brake>.86?(brake-.86)*PEDAL_DAMAGE_RATE:0;
 const breakTime=damageRate>0?(1-s.damage)/damageRate:Infinity;
 const t=Math.min(Math.max(0,dt),stopTime,breakTime);
 s.time+=t;
 s.distance+=(s.speed*t-.5*decel*t*t)*DISTANCE_MULTIPLIER;
 s.speed=t>=stopTime?0:Math.max(0,s.speed-decel*t);
 s.damage=Math.min(1,s.damage+damageRate*t);
 if(t>=breakTime){s.damage=1;s.broken=true;}
}
