import {ColorChip} from './ui/color-chip';
import {colorChipLabel} from '@/lib/color-chip';
const sizeLabels:Record<string,string>={'엑스트라스몰':'XS','엑스스몰':'XS','스몰':'S','미디움':'M','미디엄':'M','라지':'L','엑스트라라지':'XL','엑스라지':'XL','투엑스라지':'XXL','프리':'FREE','프리사이즈':'FREE','small':'S','medium':'M','large':'L'};
const sizeLabel=(name:string)=>{const key=name.trim().toLowerCase().replace(/\s+/g,'');return Object.hasOwn(sizeLabels,key)?sizeLabels[key]:name;};
export function ProductOptionPreview({options}:{options:{color:string;size:string}[]}){
 const colors=[...new Set(options.map(o=>o.color))],sizes=[...new Set(options.map(o=>sizeLabel(o.size)))];
 if(!options.length)return null;
 return <div className="product-option-preview"><div className="product-option-colors" aria-label="색상">{colors.map(color=><span className="product-color-sample" key={color}><ColorChip name={color} iconOnly/><span className="product-color-name">{colorChipLabel(color)}</span></span>)}</div><div className="product-option-sizes" aria-label="사이즈">{sizes.map(size=><span className="product-size-badge" key={size}>{size}</span>)}</div></div>;
}
