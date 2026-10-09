export function rawInput(pad,binding){if(!pad||!binding)return 0;return binding.kind==='axis'?(pad.axes[binding.index]??0):(pad.buttons[binding.index]?.value??0);}
export function mappedInput(raw,binding){if(!binding||!Number.isFinite(raw)||Math.abs(binding.full-binding.rest)<.1)return 0;const v=Math.max(0,Math.min(1,(raw-binding.rest)/(binding.full-binding.rest)));return v<.02?0:v;}
export function defaultBinding(pad){return pad.mapping==='standard'&&pad.buttons.length>7?{kind:'button',index:7,rest:0,full:1,digital:false}:null;}
export function actuator(pad){
 const candidates=[pad?.vibrationActuator,...Array.from(pad?.hapticActuators||[])];
 return candidates.find(a=>a&&((typeof a.playEffect==='function'&&(!a.effects||Array.from(a.effects).includes('dual-rumble')))||typeof a.pulse==='function'))||null;
}
export class Rumble {
 constructor(onError){this.pad=null;this.next=0;this.onError=onError;this.failed=false;this.generation=0;}
 set(pad){if(this.pad?.index!==pad?.index||this.pad?.id!==pad?.id){this.stop();this.generation++;this.failed=false;}this.pad=pad;}
 play(amount,duration=250,force=false){
  const a=actuator(this.pad);if(!a||this.failed)return;
  const now=performance.now();if(!force&&now<this.next)return;this.next=now+140;
  const generation=this.generation,value=Math.max(0,Math.min(1,amount));
  const failed=e=>{if(generation!==this.generation)return;this.failed=true;this.onError?.(e);};
  try{const dual=typeof a.playEffect==='function'&&(!a.effects||Array.from(a.effects).includes('dual-rumble'));
   Promise.resolve(dual?a.playEffect('dual-rumble',{duration,startDelay:0,strongMagnitude:value,weakMagnitude:value*.7}):a.pulse(value,duration)).catch(failed);
  }catch(e){failed(e);}
 }
 stop(){this.next=0;const a=actuator(this.pad);if(a)try{Promise.resolve(a.reset?a.reset():typeof a.pulse==='function'?a.pulse(0,1):a.playEffect('dual-rumble',{duration:1,strongMagnitude:0,weakMagnitude:0})).catch(()=>{});}catch{}}
}
