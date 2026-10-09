// Layered synthetic tire friction: broadband scrub + rough, drifting harmonic squeal.
export function brakeSoundTargets(brake,speed,enabled,running){
 const p=Math.max(0,Math.min(1,brake)),v=Math.max(0,Math.min(1,speed/(100/3.6)));
 const audible=enabled&&running&&speed>.15;
 return {noise:audible?.30*p**1.25*Math.sqrt(v):0,squeal:audible?.12*Math.max(0,(p-.42)/.58)**1.6*Math.sqrt(v):0,filter:480+p*1100+v*850,pitch:410+p*310+v*180};
}
export function createBrakeAudio(audio,destination){
 const buffer=audio.createBuffer(1,audio.sampleRate*5,audio.sampleRate),data=buffer.getChannelData(0);
 let brown=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;brown=(brown+.035*white)/1.035;data[i]=white*.6+brown*3;}
 const noise=audio.createBufferSource();noise.buffer=buffer;noise.loop=true;
 const filter=audio.createBiquadFilter();filter.type='bandpass';filter.Q.value=.65;
 const gain=audio.createGain();gain.gain.value=0;noise.connect(filter).connect(gain).connect(destination);
 // A second narrower friction band makes the sound raspy rather than a pure whistle.
 const rasp=audio.createBiquadFilter();rasp.type='bandpass';rasp.frequency.value=2600;rasp.Q.value=2.2;
 const raspGain=audio.createGain();raspGain.gain.value=0;noise.connect(rasp).connect(raspGain).connect(destination);
 const squeal=audio.createOscillator(),squealGain=audio.createGain();
 const real=new Float32Array(9),imag=Float32Array.from([0,1,.38,.56,.17,.25,.1,.14,.06]);
 squeal.setPeriodicWave(audio.createPeriodicWave(real,imag));squealGain.gain.value=0;
 const soften=audio.createBiquadFilter();soften.type='lowpass';soften.frequency.value=3800;soften.Q.value=.5;
 squeal.connect(soften).connect(squealGain).connect(destination);
 // Noise-modulated pitch and light amplitude flutter avoid a steady electronic beep.
 const wander=audio.createBiquadFilter();wander.type='lowpass';wander.frequency.value=23;
 const detune=audio.createGain();detune.gain.value=160;noise.connect(wander).connect(detune).connect(squeal.detune);
 const flutter=audio.createOscillator(),flutterGain=audio.createGain();flutter.frequency.value=19;flutterGain.gain.value=0;
 flutter.connect(flutterGain).connect(squealGain.gain);
 noise.start();squeal.start();flutter.start();
 return {update(brake,speed,enabled,running){const t=brakeSoundTargets(brake,speed,enabled,running),now=audio.currentTime;
 gain.gain.setTargetAtTime(t.noise,now,.035);raspGain.gain.setTargetAtTime(t.squeal*.7,now,.04);
 squealGain.gain.setTargetAtTime(t.squeal,now,.045);flutterGain.gain.setTargetAtTime(t.squeal*.24,now,.045);
 filter.frequency.setTargetAtTime(t.filter,now,.12);
 squeal.frequency.setTargetAtTime(t.pitch*(1+.018*Math.sin(now*7.3)+.011*Math.sin(now*17.1)),now,.12);
 }};
}
