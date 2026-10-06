// Camera rectification can translate/scale each staff. Compare position within
// already matched barlines; never use the predicted fret to choose its oracle.
export function oraclePositionMatches(slotX,expectedX,{measure,pageWidth,bar,oracleWidth,tolerance,photo=false}){
 if(photo)return Math.abs((slotX-measure.x)/measure.width-(expectedX-bar.x)/bar.width)<tolerance/bar.width;
 return Math.abs(slotX/pageWidth-expectedX/oracleWidth)<tolerance/oracleWidth;
}
