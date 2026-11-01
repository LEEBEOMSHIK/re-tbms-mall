import {ColorChip} from './ui/color-chip';
import {colorChipLabel} from '@/lib/color-chip';
import {productSizeLabel} from '@/lib/product-option-labels';
export function ProductOptionPreview({options}:{options:{color:string;size:string}[]}){
 const colors=[...new Set(options.map(o=>o.color))],sizes=[...new Set(options.map(o=>productSizeLabel(o.size)))];
 if(!options.length)return null;
 return <div className="product-option-preview"><div className="product-option-colors" aria-label="색상">{colors.map(color=><span className="product-color-sample" key={color}><ColorChip name={color} iconOnly/><span className="product-color-name">{colorChipLabel(color)}</span></span>)}</div><div className="product-option-sizes" aria-label="사이즈">{sizes.map(size=><span className="product-size-badge" key={size}>{size}</span>)}</div></div>;
}
