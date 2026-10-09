import {drawCar} from './car-renderer.mjs';
let time=0;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
export function drawTitleDrive(canvas,dt){
 if(!canvas||!canvas.clientWidth)return;
 if(!reducedMotion.matches)time+=dt;
 const t=reducedMotion.matches?0:time,c=canvas.getContext('2d');
 c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,420,280);
 const stroke=(points,color,width=1.5)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();};
 const oval=(x,y,rx,ry,fill,border)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();c.strokeStyle=border;c.lineWidth=1.5;c.stroke();};
 oval(345,47,20,20,'#edcf79','#b7a979');
 for(let i=0;i<5;i++){const x=i*150-(t*14)%150-100;stroke([[x,163],[x+65,92],[x+133,163]],'#b9bbaa');}
 for(let i=0;i<5;i++){
  const x=i*140-(t*115)%140-70;
  stroke([[x,215],[x,137]],'#696d52',3);
  oval(x,127,25,35,'#d3d8ad','#7b8160');
  oval(x-17,147,20,25,'#d3d8ad','#7b8160');
  oval(x+17,148,19,24,'#d3d8ad','#7b8160');
  stroke([[x,203],[x,147],[x-10,132]],'#8d9370');
 }
 stroke([[0,217],[420,217]],'#292a25',2);
 for(let i=0;i<7;i++){const x=i*90-(t*150)%90-45;stroke([[x,247],[x+37,247]],'#b5ad9c',2);}
 drawCar(c,212,196+Math.sin(t*11)*1.1,.82,{distance:t*5,time:t});
}
