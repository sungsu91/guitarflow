// Interior strokes follow the woven bands in the original compositions. They
// are inset from silhouettes, columns and hanging chains; no new cloth is added.
// Each path is {width / image height, start, cubic control points / image size}.
export const ART_MAP_CLOTH_PATHS = {
  desktop: [
    {w:.044,s:[-.02,.106],c:[[.048,.211,.172,.249,.192,.333]]},
    {w:.022,s:[.192,.327],c:[[.219,.393,.190,.428,.177,.463]]},
    {w:.012,s:[.174,.553],c:[[.215,.600,.244,.590,.275,.644],[.300,.700,.348,.722,.400,.723]]},
    {w:.025,s:[.409,-.015],c:[[.393,.077,.476,.126,.528,.130],[.543,.132,.549,.121,.551,.116]]},
    {w:.040,s:[1.015,.415],c:[[.943,.347,.863,.346,.817,.379]]},
    {w:.020,s:[.817,.379],c:[[.776,.416,.790,.484,.803,.515]]},
    {w:.016,s:[.797,.588],c:[[.761,.657,.715,.693,.663,.719]]},
    {w:.022,s:[.800,.119],c:[[.862,.153,.935,.190,1.016,.157]]},
  ],
  mobile: [
    {w:.018,s:[-.025,.14],c:[[.102,.164,.192,.213,.145,.251],[.125,.27,.108,.278,.092,.282]]},
    {w:.020,s:[-.02,.482],c:[[.077,.527,.214,.553,.235,.594]]},
    {w:.011,s:[.235,.594],c:[[.26,.625,.218,.646,.182,.656]]},
    {w:.012,s:[.189,.670],c:[[.23,.684,.338,.698,.389,.743]]},
    {w:.010,s:[.37,-.015],c:[[.323,.043,.450,.069,.537,.066],[.556,.064,.568,.058,.563,.053]]},
    {w:.018,s:[1.022,.559],c:[[.916,.550,.829,.593,.809,.625]]},
    {w:.009,s:[.809,.625],c:[[.795,.648,.817,.664,.823,.669]]},
    {w:.010,s:[.791,.672],c:[[.762,.703,.669,.711,.592,.758]]},
    {w:.009,s:[.860,.080],c:[[.889,.082,.944,.084,1.012,.091]]},
  ],
  tablet: [
    {w:.042,s:[-.02,.147],c:[[.071,.223,.172,.259,.193,.338]]},
    {w:.020,s:[.193,.338],c:[[.223,.410,.194,.437,.178,.46]]},
    {w:.012,s:[.174,.553],c:[[.215,.600,.244,.590,.275,.644],[.300,.700,.348,.722,.400,.723]]},
    {w:.025,s:[.409,-.015],c:[[.393,.077,.476,.126,.528,.130],[.543,.132,.549,.121,.551,.116]]},
    {w:.040,s:[1.017,.496],c:[[.942,.419,.857,.409,.807,.443]]},
    {w:.018,s:[.807,.443],c:[[.772,.472,.795,.531,.803,.543]]},
    {w:.016,s:[.790,.601],c:[[.763,.655,.710,.695,.657,.720]]},
    {w:.020,s:[.840,.223],c:[[.892,.263,.950,.280,1.013,.225]]},
  ],
};

// Runtime material extraction, using Canvas clipping rather than repainting the
// artwork: every RGB texel is sampled from the original silk at its exact position.
export function createArtMapClothSurface(image,presentation,ownerDocument) {
  const paths=ART_MAP_CLOTH_PATHS[presentation];
  if(!paths) return null;
  const canvas=ownerDocument.createElement('canvas');
  const w=canvas.width=image.naturalWidth,h=canvas.height=image.naturalHeight;
  const context=canvas.getContext('2d');
  if(!context) return null;
  context.strokeStyle='#fff'; context.lineCap='round'; context.lineJoin='round';
  context.filter='blur(2px)';
  for(const path of paths) {
    context.lineWidth=path.w*h;
    context.beginPath(); context.moveTo(path.s[0]*w,path.s[1]*h);
    for(const c of path.c) context.bezierCurveTo(c[0]*w,c[1]*h,c[2]*w,c[3]*h,c[4]*w,c[5]*h);
    context.stroke();
  }
  context.filter='none'; context.globalCompositeOperation='source-in';
  context.drawImage(image,0,0);
  return canvas;
}
