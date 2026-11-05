'use client';

import { useState } from 'react';
import { FormLabel } from '@/components/ui/form-controls';
import styles from './style-preview.module.css';

const materials = [
  {name:'라일락', print:'LILAC', index:'01', finish:'lilac'},
  {name:'민트', print:'MINT', index:'02', finish:'mint'},
  {name:'피치', print:'PEACH', index:'03', finish:'peach'},
] as const;

export function StylePreview() {
  const [material,setMaterial] = useState<(typeof materials)[number]>(materials[0]);
  const [label,setLabel] = useState('스튜디오 컬렉션');
  const [foil,setFoil] = useState(true);
  return <section className={styles.preview} aria-labelledby="style-preview-title">
    <div className={styles.controls}>
      <p className={styles.eyebrow}>STYLE STUDY <span> / </span> 01</p>
      <h2 id="style-preview-title">스타일 미리보기</h2>
      <p className={styles.hint}>이름과 색상을 바꿔 컬렉션 태그를 만들어 보세요.</p>
      <div className="ds-form"><div className="ds-outlined-field">
        <FormLabel htmlFor="gallery-tag-name">컬렉션 이름</FormLabel>
        <input id="gallery-tag-name" maxLength={24} value={label} onChange={event=>setLabel(event.target.value)}/>
      </div></div>
      <div className={styles.options}>
        <div className={styles.segment} role="group" aria-label="태그 색상">{materials.map(item=>
          <button key={item.index} type="button" aria-pressed={item===material} onClick={()=>setMaterial(item)}>{item.name}</button>
        )}</div>
        <label className={styles.switch}><input type="checkbox" role="switch" checked={foil} onChange={event=>setFoil(event.target.checked)}/>광택</label>
      </div>
    </div>
    <div className={styles.artboard}>
      <div className={styles.tag} data-finish={material.finish} data-foil={foil}>
        <div className={styles.imprint}><span>RE:TAG</span><span>STUDIO EDITION</span></div>
        <div className={styles.type}><span>COLLECTION&nbsp; / &nbsp;{material.print}</span><strong>{label.trim()||'컬렉션'}</strong></div>
        <div className={styles.serial}><i aria-hidden="true"/><span>NO. {material.index}</span></div>
      </div>
    </div>
  </section>;
}
