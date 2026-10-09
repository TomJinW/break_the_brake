// A score belongs to the device, transport and calibration used at round start.
export function inputSessionKey(dedicated,pad,binding){
 if(dedicated)return 'dualsense-usb';
 if(!pad||!binding||Math.abs(binding.full-binding.rest)<.1)return 'keyboard';
 return JSON.stringify([pad.index,pad.id,binding.kind,binding.index,binding.rest,binding.full,!!binding.digital]);
}
