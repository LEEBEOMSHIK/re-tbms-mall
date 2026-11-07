'use client';

import { useRef, useState } from 'react';
import { ColorChip } from '@/components/ui/color-chip';
import { FormSwitch, FormChoice, FormLabel, FormRequiredHint, FormSelect } from '@/components/ui/form-controls';
import { KeyFacts, ValueStatus } from '@/components/ui/key-facts';
import { SaveResult } from '@/components/ui/save-result';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tooltip } from '@/components/ui/tooltip';
import { SiteSettingsButton, SettingsSection } from '@/components/site-settings';
import { LoginNavigation } from '@/components/ui/login-navigation';
import { useListPagination } from '@/components/ui/list-pagination';
import { GalleryExample as Example } from './gallery-example';
import { CommerceExamples, ProductCardExample } from './commerce-examples';
import { StylePreview } from './style-preview';
import { PatternIndex } from './pattern-index';
import styles from './gallery.module.css';

const categories = ['전체', '버튼', '카드', '입력·선택', '상품', '탐색·목록', '상태·피드백', '기본 스타일', '사용처 색인'] as const;
type Category = typeof categories[number];
const colors = [
  ['기본 배경', 'surface'], ['보조 배경', 'subtle'], ['본문', 'text'],
  ['강조', 'action'], ['성공', 'success'], ['오류', 'error'], ['초점', 'focus'],
];

function PaginationExample() {
  const page = useListPagination(Array.from({length: 42}, (_, i) => i+1), '', '예시 목록');
  return <>{page.summary}{page.navigation}</>;
}

export function Gallery() {
  const [category, setCategory] = useState<Category>('전체');
  const [actionMessage, setActionMessage] = useState('예시를 적용하거나 초기화해 보세요.');
  const [name, setName] = useState('');
  const [validation, setValidation] = useState<'idle'|'valid'|'invalid'>('idle');
  const error = validation === 'invalid';
  const [visibility, setVisibility] = useState('public');
  const [featured, setFeatured] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const resultTrigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const show = (group:Category) => category === '전체' || category === group;
  function verifyInput() {
    setValidation(name.trim() ? 'valid' : 'invalid');
    if (!name.trim()) input.current?.focus();
  }
  return <main id="main" className={'admin-page ' + styles.page}>
    <header className={styles.heading}>
      <p className={styles.kicker}>RE:TAG <span>/</span> UI LIBRARY</p>
      <h1>디자인 시스템</h1>
      <p>버튼과 카드의 종류를 비교하고, 각 요소가 쓰이는 화면을 확인하세요. 화면별 구성은 사용처 색인에서 찾아볼 수 있습니다.</p>
    </header>
    {(category === '전체' || category === '기본 스타일') && <StylePreview/>}
    <div className={styles.filters} role="group" aria-label="컴포넌트 분류">
      {categories.map(item => <button type="button" key={item} aria-pressed={category === item}
        onClick={() => {setCategory(item); setResultOpen(false);}}>{item}</button>)}
    </div>
    {category === '사용처 색인' && <PatternIndex/>}
    <div className={styles.grid}>
      {show('버튼') && <Example title="주요·보조·비활성 버튼" source="관리자 · 메뉴 구성 편집 및 주문 검색" usage="주요 동작은 채운 버튼, 초기화는 보조 버튼으로 구분합니다. 사용할 수 없는 동작은 비활성으로 표시합니다.">
        <div className={styles.row}><button type="button" className="button" onClick={() => setActionMessage('예시를 적용했습니다.')}>적용</button>
          <button type="button" onClick={() => setActionMessage('예시를 초기화했습니다.')}>초기화</button>
          <button type="button" disabled>사용 불가</button></div>
        <p role="status" className="small-label">{actionMessage}</p>
      </Example>}
      {show('버튼') && <CommerceExamples group="버튼"/>}
      {(show('카드') || show('상품')) && <ProductCardExample/>}
      {show('카드') && <CommerceExamples group="카드"/>}
      {show('상품') && <CommerceExamples group="상품"/>}
      {show('기본 스타일') && <>
        <Example title="색상" source="전 화면 · 테마" usage="배경, 텍스트, 피드백에 사용하는 색입니다. 테마에 따라 함께 바뀝니다.">
          <div className={styles.palette}>{colors.map(([label, token]) => <div key={token}><i style={{backgroundColor:'var(--color-' + token + ')'}}/><span>{label}</span></div>)}</div>
        </Example>
        <Example title="텍스트 위계" source="관리자 · 제목과 본문" usage="제목으로 위치를 알리고, 본문과 보조 설명은 크기와 명도로 구분합니다.">
          <div className={styles.typeScale}><b>컬렉션 관리</b><span>홈에 보여줄 상품을 선택하세요.</span><small>공개한 상품만 고객에게 표시됩니다.</small></div>
        </Example>
        <Example title="간격과 모서리" source="공통 · 입력란, 패널, 상태 배지" usage="버튼 사이의 간격과 패널 안쪽 여백을 비교하고 모서리 형태를 확인합니다.">
          <div className={styles.stack}>
            <div className={styles.row}>{[1,2,3,4,6,8].map(step => <div className={styles.measure} key={step}><i style={{width:'var(--space-' + step + ')'}}/>{step*4}px</div>)}</div>
            <div className={styles.row}>{[['입력란','control'],['패널','panel'],['배지','pill']].map(([label,token]) => <span key={token} className={styles.corner} style={{borderRadius:'var(--radius-'+token+')'}}>{label}</span>)}</div>
          </div>
        </Example>
      </>}
      {show('입력·선택') && <>
        <Example title="필수 입력과 오류" source="관리자 · 진열 섹션 등록" usage="필수값을 비운 채 확인하면 입력란에 오류가 표시됩니다.">
          <form className="ds-form" onSubmit={e => {e.preventDefault(); verifyInput();}} noValidate>
            <FormLabel htmlFor="ds-example-name" required>컬렉션 이름</FormLabel>
            <input id="ds-example-name" ref={input} required value={name} placeholder="예: 봄 컬렉션"
              aria-invalid={error} aria-describedby="ds-example-hint" onChange={e => {setName(e.target.value); setValidation('idle');}}/>
            <div id="ds-example-hint">{error ? <p role="alert" className="ds-field-error">컬렉션 이름을 입력해 주세요.</p> : validation === 'valid' ? <p role="status">입력한 이름을 확인했습니다.</p> : <FormRequiredHint/>}</div>
            <div className={styles.row}><button className="button" type="submit">입력 확인</button>
              <button type="button" onClick={() => {setName(''); setValidation('idle'); input.current?.focus();}}>초기화</button>
              <button type="button" disabled>사용 불가</button></div>
          </form>
        </Example>
        <Example title="선택 컨트롤" source="관리자 · 진열 공개 설정" usage="하나의 값은 선택 목록으로, 독립적인 설정은 체크 항목으로 지정합니다.">
          <div className={'ds-form ' + styles.stack}><div><FormLabel htmlFor="ds-visibility">공개 상태</FormLabel>
            <FormSelect id="ds-visibility" value={visibility} onChange={setVisibility} options={[{value:'public',label:'공개'},{value:'private',label:'비공개'}]}/></div>
            <FormChoice id="ds-featured" label="추천 상품으로 표시" checked={featured} onChange={e => setFeatured(e.target.checked)}/></div>
        </Example>
        <Example title="설정 스위치" source="상품 판매 설정 · 할인" usage="제목·설명 옆에서 기능을 켜거나 끕니다. Tab과 Space로 조작하며 비활성 상태는 변경할 수 없습니다."><div className={styles.row}><FormSwitch id="ds-switch-off" label="할인 설정 예시"/><FormSwitch id="ds-switch-on" label="켜진 설정 예시" defaultChecked/><FormSwitch id="ds-switch-disabled" label="변경 불가 설정 예시" disabled/></div></Example>
        <Example title="짧은 값의 다중 선택" source="상품 기본정보 · 계절 선택" usage="짧은 이름은 큰 카드 대신 선택 버튼으로 묶습니다. 선택한 값만 채운 배경과 체크로 구분합니다.">
          <div className="ds-form ds-choice-pills">{['봄','여름','가을','겨울'].map((label,index)=><FormChoice key={label} id={`gallery-season-${index}`} variant="pill" label={label} defaultChecked={index===0||index===2}/>)}</div>
        </Example>
        <Example title="체크박스와 라디오 상태" source="장바구니 · 배송 정보 · 관리 설정" usage="빈 상태·선택·부분 선택·비활성 상태를 비교합니다. Tab으로 이동하고 Space로 선택할 수 있습니다.">
          <div className={'ds-form '+styles.row}>
            <label className={styles.controlLabel}><input type="checkbox"/>미선택</label>
            <label className={styles.controlLabel}><input type="checkbox" defaultChecked/>선택됨</label>
            <label className={styles.controlLabel}><input type="checkbox" ref={element=>{if(element)element.indeterminate=true;}}/>부분 선택</label>
            <label className={styles.controlLabel}><input type="checkbox" defaultChecked disabled/>사용 불가</label>
            <label className={styles.controlLabel}><input type="radio" name="ds-radio-detail" defaultChecked/>기본</label>
            <label className={styles.controlLabel}><input type="radio" name="ds-radio-detail"/>다른 선택</label>
          </div>
        </Example>
        <Example title="여러 줄 입력과 읽기 전용 필드" source="브랜드 소개 편집 · 택배사 견적 준비" usage="직접 작성하는 본문과 복사용으로 제공되는 문구의 차이를 확인합니다.">
          <div className={'ds-form '+styles.stack}><div><FormLabel htmlFor="ds-story">브랜드 소개</FormLabel><textarea id="ds-story" rows={2} defaultValue="관심사를 옷에 담습니다."/></div>
            <div><FormLabel htmlFor="ds-inquiry" hint="읽기 전용">문의 문구</FormLabel><textarea id="ds-inquiry" rows={2} readOnly value="국내 의류 배송 운임표를 요청드립니다."/></div></div>
        </Example>
      </>}
      {show('상태·피드백') && <>
        <Example title="상태 배지" source="관리자 · 재고와 게시 관리" usage="재고는 아이콘과 상태명으로, 게시 여부는 짧은 문구로 표시합니다.">
          <div className={styles.stack}><div className={styles.row}><StatusBadge kind="in_stock">재고 있음</StatusBadge><StatusBadge kind="low_stock">재고 부족</StatusBadge><StatusBadge kind="no_stock">품절</StatusBadge></div>
            <div className={styles.row}><ValueStatus tone="info">공개</ValueStatus><ValueStatus>비공개</ValueStatus></div></div>
        </Example>
      </>}
      {show('상품') && <>
        <Example title="상품 색상칩" source="고객 상품 카드 · 관리자 상품 옵션"  usage="상품 옵션의 대표색과 이름을 함께 확인합니다.">
          <div className={styles.row}>{['Ivory','Navy','Olive','Charcoal'].map(color => <ColorChip key={color} name={color} showName/>)}</div>
        </Example>
      </>}
      {show('탐색·목록') && <>
        <Example title="관리 목록" source="관리자 · 홈 진열 목록" usage="열 제목과 짝수 행의 배경을 구분해 한 행씩 따라 읽을 수 있습니다.">
          <table className={styles.table}><caption className="sr-only">진열 섹션 예시</caption><thead><tr><th scope="col">섹션</th><th scope="col">상품 수</th><th scope="col">상태</th></tr></thead>
            <tbody>{['봄 컬렉션','그래픽 티셔츠','라운지웨어'].map((label,i) => <tr key={label}><th scope="row">{label}</th><td>{[4,6,2][i]}개</td><td><ValueStatus tone={i===2?'neutral':'info'}>{i===2?'비공개':'공개'}</ValueStatus></td></tr>)}</tbody></table>
        </Example>
        <Example title="페이지 이동" source="관리자 · 수령·검수 목록" usage="페이지당 표시 수와 현재 범위를 함께 확인합니다. 예시 목록은 42건입니다."><PaginationExample/></Example>
        <Example title="로그인 화면 이동 링크" source="관리자 · 공장 로그인" usage="다른 작업 공간으로 이동하는 링크를 묶어 제공합니다."><LoginNavigation role="admin"/></Example>
      </>}
      {show('상태·피드백') && <>
        <Example title="설정 대화상자" source="고객 · 관리자 · 공장 설정" usage="설정 버튼으로 열고 닫기 버튼 또는 Escape로 돌아옵니다.">
          <SiteSettingsButton><SettingsSection title="설정 미리보기" description="예시 항목을 선택해 대화상자의 입력과 포커스 이동을 확인하세요.">
            <FormChoice id="gallery-modal-choice" label="설정 예시 선택"/>
          </SettingsSection></SiteSettingsButton>
        </Example>
        <Example title="완료 안내와 도움말" source="관리자 · 저장 결과와 상품 운영 안내"  usage="완료 화면에서는 결과와 다음 행동을, 도움말에서는 짧은 보충 설명을 제공합니다.">
          {resultOpen ? <SaveResult title="예시 구성을 저장했어요." status="완료 예시" actions={<button onClick={() => {setResultOpen(false); requestAnimationFrame(() => resultTrigger.current?.focus());}}>예시 닫기</button>}>
            <KeyFacts label="예시 결과" items={[{label:'컬렉션 이름',value:name.trim()||'봄 컬렉션'},{label:'공개 상태',value:visibility==='public'?'공개':'비공개'}]}/>
          </SaveResult> : <div className={styles.row}><button type="button" ref={resultTrigger} onClick={() => setResultOpen(true)}>완료 화면 보기</button>
            <Tooltip label="도움말 예시" trigger="?">예시에서 선택한 값은 실제 상품이나 진열에 저장되지 않습니다.</Tooltip></div>}
        </Example>
      </>}
    </div>
  </main>;
}
