import {colorChipValue} from '@/lib/color-chip';
import './color-chip.css';

export function ColorChip({name,showName=false,iconOnly=false}:{name:string;showName?:boolean;iconOnly?:boolean}){
 const color=colorChipValue(name);
 const named=!iconOnly&&(showName||!color);
 return <span className="color-chip-label" title={`${name}${color?' · 대표색':' · 색상 미지정'}`}><span className={`color-chip${color?'':' color-chip-unknown'}`} style={color?{backgroundColor:color}:undefined} role={named?undefined:'img'} aria-hidden={named?true:undefined} aria-label={named?undefined:name}/>{named&&<span>{name}{!color&&<span className="sr-only"> (색상 미지정)</span>}</span>}</span>;
}
