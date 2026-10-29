/** Derive restrained neutral fiber shadows from an already neutralized scan.
 * Multiply preserves shadows on white fabric, where soft-light erased them.
 * Pattern and frequency come only from the scan; artwork is painted afterward.
 */
export function fiberShadowPixels(pixels: Uint8ClampedArray, strength: number) {
 const bounded = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
 for(let i=0;i<pixels.length;i+=4){
  const luminance=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
  const shadow=Math.min(.25,Math.max(0,(128-luminance)/128))*bounded;
  const value=Math.round(255*(1-shadow));
  pixels[i]=pixels[i+1]=pixels[i+2]=value;
  pixels[i+3]=255;
 }
}
