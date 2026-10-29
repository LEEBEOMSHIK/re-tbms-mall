// A continuous front/back half-cylinder chart for the hoodie torso.
// Each chart reaches its side seam at u=0/1 rather than ending inside the image.
export function hoodiePrintU(x,z,side){
 const theta=Math.atan2(side==='front'?x:-x,side==='front'?z:-z);
 // Vertices on seam-crossing triangles can be slightly beyond the chart.
 // Do not wrap them: wrapping would interpolate across the full texture.
 return .5+theta/Math.PI;
}
