import {binaryPage,detectStaffs} from '../pdf/tab-import/geometry.js';
import {notationBarBounds} from '../pdf/tab-import/chordGeometry.js';
import {staffMeasureInk} from './staffMeasureInk.js';
import {staffBarMarks,staffEndingBrackets} from './staffBarMarks.js';
import {notationStaffConnections} from '../pdf/tab-import/notationConnections.js';

export function cropNotationSystems(rgba,width,height,{piano=false}={}){
  const ink=binaryPage(rgba,width,height,230),heads=binaryPage(rgba,width,height),staffs=detectStaffs(ink,width,height,undefined,5);
  const connections=notationStaffConnections(ink,width,staffs);
  return staffs.map((staff,index)=>{
    // A single wide system already has the intended framing. Tight cropping
    // can change the model's octave reading, so preserve that input context.
    const whole=staffs.length===1&&width>height*2;
    const x=whole?0:Math.max(0,Math.floor(staff.x-staff.spacing*3)),y=whole?0:Math.max(0,Math.floor(staff.y-staff.spacing*3.5));
    const right=whole?width:Math.min(width,Math.ceil(staff.x+staff.width+staff.spacing)),bottom=whole?height:Math.min(height,Math.ceil(staff.y+staff.height+staff.spacing*2.5));
    const w=right-x,h=bottom-y,pixels=new Uint8ClampedArray(w*h*4);
    for(let row=0;row<h;row++)pixels.set(rgba.subarray(((y+row)*width+x)*4,((y+row)*width+right)*4),row*w*4);
    // Keep the established crop unchanged. Grand Staff retries may need the
    // downward beams of ledger-line bass notes, beyond the usual four gaps.
    // Stop before the next staff's notation area; never copy another part.
    const standardBottom=Math.min(height,Math.ceil(staff.y+staff.height+staff.spacing*4));
    const extendedBottom=whole?bottom:Math.max(standardBottom,Math.min(height,Math.ceil(staff.y+staff.height+staff.spacing*(piano?7.5:4)),piano&&staffs[index+1]?Math.floor(staffs[index+1].y-staffs[index+1].spacing*3.5):height)),extensionHeight=extendedBottom-bottom,extension=new Uint8ClampedArray(w*extensionHeight*4);
    for(let row=0;row<extensionHeight;row++)extension.set(rgba.subarray(((bottom+row)*width+x)*4,((bottom+row)*width+right)*4),row*w*4);
    const pianoTopY=piano?Math.min(y,Math.max(0,Math.floor(staff.y-staff.spacing*6),index?Math.ceil(staffs[index-1].y+staffs[index-1].height+staffs[index-1].spacing):0)):y;
    const pianoTopHeight=y-pianoTopY,pianoTop=new Uint8ClampedArray(w*pianoTopHeight*4);
    for(let row=0;row<pianoTopHeight;row++)pianoTop.set(rgba.subarray(((pianoTopY+row)*width+x)*4,((pianoTopY+row)*width+right)*4),row*w*4);
    const linked=connections.filter(c=>c.upper===index||c.lower===index);
    const connectedBars=[...new Set(linked.flatMap(c=>c.bars))];
    const measures=notationBarBounds(ink,width,staff,connectedBars).map((box,i)=>{
      const start=staffBarMarks(ink,width,staff,box.x),end=staffBarMarks(ink,width,staff,box.x+box.width);
      return {...box,...staffMeasureInk(heads,width,height,staff,box,{first:i===0}),...(start.repeatStart?{repeatStart:true}:{}),...(end.repeatEnd?{repeatEnd:true}:{}),...(end.endBarline?{endBarline:end.endBarline}:{})};
    });
    return {id:index+1,staff,rect:{x,y,width:w,height:h},width:w,height:h,rgba:pixels.buffer,extension:extension.buffer,extensionHeight,...(piano?{pianoExtendedCrop:true,pianoTop:pianoTop.buffer,pianoTopHeight}:{}),measures,endingBrackets:staffEndingBrackets(ink,width,staff),...(linked.length?{connectedStaffIds:linked.map(c=>(c.upper===index?c.lower:c.upper)+1)}:{})};
  });
}
