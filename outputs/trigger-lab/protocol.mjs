// USB report layout reference: https://github.com/nondebug/dualsense
// USB: R2 resistance and compatible dual-motor rumble; no other controls are changed.
export function usbReport({active=false,start=0.35,strength=0.35,rumble=0}={}) {
  const data=new Uint8Array(47);
  data[0]=0x07; // R2 + compatible vibration + haptics select
  data[2]=Math.round(Math.max(0,Math.min(1,rumble))*255);
  data[3]=Math.round(Math.max(0,Math.min(1,rumble*.75))*255);
  if(active) {
    data[10]=0x01; // continuous resistance
    data[11]=Math.round(Math.min(1,Math.max(0,start))*255);
    data[12]=Math.round(Math.min(1,Math.max(0,strength))*255);
  }
  return data;
}
export function usbInput(reportId,data) {
  if(reportId!==0x01 || data.byteLength!==63) return null;
  return data.getUint8(5)/255;
}
export function hasUsbOutput(collections) {
  return collections.some(c => (c.outputReports||[]).some(r=>r.reportId===2) || hasUsbOutput(c.children||[]));
}
// One in-flight write plus latest pending state. Release replaces pending effects.
export class LatestWriter {
  constructor(device,onError=()=>{}) {this.device=device;this.onError=onError;this.pending=null;this.running=null;this.failed=false;}
  put(data) {
    if(this.failed) return Promise.resolve(false);
    this.pending=data;
    if(!this.running) this.running=this.drain().finally(()=>{this.running=null;});
    return this.running;
  }
  async drain() {
    try {while(this.pending){const data=this.pending;this.pending=null;await this.device.sendReport(2,data);}return true;}
    catch(error){this.pending=null;this.failed=true;this.onError(error);return false;}
  }
}
