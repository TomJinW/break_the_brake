// Distance bands use the game's displayed metres, not real-world braking claims.
export const FINISH_BANDS=[
 {limit:70,title:'精准拿捏！',normal:[
  '停得很短。建议把这只脚列为选装配置。',
  '车停了，后面的惯性还没反应过来。',
  '制动距离很克制，驾驶员有点东西。'
 ],near:[
  '距离压到极限，踏板也差点压成两件。',
  '这一脚很有成绩，踏板很有意见。',
  '车停得漂亮，踏板活得勉强。'
 ]},
 {limit:90,title:'干净利落！',normal:[
  '停得干净利落，踏板暂时愿意续约。',
  '脚法到位，本次无需发表情况说明。',
  '距离和踏板都照顾到了，难得。'
 ],near:[
  '车停住了，踏板差点下班。',
  '成绩挺好，踏板建议下次温柔一点。',
  '停车很成功，零件情绪不太稳定。'
 ]},
 {limit:120,title:'稳稳停住！',normal:[
  '顺利停住，给路面留足了参与感。',
  '成绩不算惊艳，胜在零件齐全。',
  '停车任务完成，沿途风景也没落下。'
 ],near:[
  '距离还有进步空间，踏板已经没有了。',
  '路走了不少，踏板的委屈也不少。',
  '停是停了，踏板要求按里程报工伤。'
 ]},
 {limit:160,title:'终于停了！',normal:[
  '这是一次刹车，也是一段短途旅行。',
  '踏板保养得不错，路面消耗得有点多。',
  '车终于停了，目的地差点换一个。'
 ],near:[
  '距离没省下来，踏板倒是快省没了。',
  '滑行这么远，踏板还是没躲过加班。',
  '路用了不少，踏板也用了大半辈子。'
 ]},
 {limit:Infinity,title:'旅行结束！',normal:[
  '感谢体验本次观光式制动。',
  '制动响应比较含蓄，行驶轨迹比较长。',
  '停车成功，沿途树木已与您混熟。'
 ],near:[
  '车和踏板都撑到了最后，路快不够了。',
  '旅行结束，踏板申请永久休假。',
  '距离很有想象力，踏板很有求生欲。'
 ]}
];
export function finishBand(distance){return FINISH_BANDS.findIndex(b=>distance<b.limit);}
export class FinishVerdicts {
 constructor(random=Math.random){this.random=random;this.previous=new Map();}
 pick(distance,near=false){
  const band=finishBand(distance),kind=near?'near':'normal',key=band+':'+kind;
  const options=FINISH_BANDS[band][kind].filter(text=>text!==this.previous.get(key));
  const text=options[Math.min(options.length-1,Math.floor(this.random()*options.length))];
  this.previous.set(key,text);return text;
 }
}

export function finishTitle(distance,near=false){return near?'差一点就断了！':FINISH_BANDS[finishBand(distance)].title;}
