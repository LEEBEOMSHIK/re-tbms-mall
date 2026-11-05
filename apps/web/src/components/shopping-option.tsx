import {colorChipLabel} from '@/lib/color-chip';
import {productSizeLabel} from '@/lib/product-option-labels';
import {ColorChip} from './ui/color-chip';
import styles from './shopping-option.module.css';

export function ShoppingOption({color, size}: {color: string; size: string}) {
  return <span className={styles.option}>
    <span aria-hidden="true"><ColorChip name={color} iconOnly/></span>
    <span><span className="sr-only">색상 </span>{colorChipLabel(color)}</span>
    <span className={styles.size}><span className="sr-only">사이즈 </span>{productSizeLabel(size)}</span>
  </span>;
}
