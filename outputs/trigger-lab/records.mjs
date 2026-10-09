export const DEVICE_LABELS={ds5:'DualSense（PS5 手柄）',gamepad:'普通手柄',keyboard:'键盘 / 触摸屏'};
export function inputCategory(dedicated,pad,binding){
 if(dedicated)return 'ds5';
 if(!pad||!binding||Math.abs(binding.full-binding.rest)<.1)return 'keyboard';
 return /dualsense|054c.*0ce6|054c.*0df2/i.test(pad.id)?'ds5':'gamepad';
}
function recordKey(category,difficulty){return category==='ds5'?'brake-sketch-best-v6-ds5:'+difficulty:'brake-sketch-best-v5-device:'+category;}
export function readBest(storage,category,difficulty='standard'){try{const n=Number(storage.getItem(recordKey(category,difficulty)));return n>0&&Number.isFinite(n)?n:Infinity;}catch{return Infinity;}}
export function recordBest(storage,category,distance,eligible,difficulty='standard'){if(!eligible||!DEVICE_LABELS[category]||!Number.isFinite(distance)||distance<=0||distance>=readBest(storage,category,difficulty))return false;try{storage.setItem(recordKey(category,difficulty),String(distance));return true;}catch{return false;}}
