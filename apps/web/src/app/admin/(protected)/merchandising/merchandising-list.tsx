'use client';
import Link from 'next/link';
import {KeyFacts, ValueStatus} from '@/components/ui/key-facts';
import { useListPagination } from '@/components/ui/list-pagination';
import { useEffect, useState } from 'react';
import { requestStorefront, type Storefront } from '@/lib/storefront';
import {MerchandisingNav} from './merchandising-nav';
import './merchandising.css';
export default function MerchandisingList(){
  const [data,setData]=useState<Storefront|null>(null);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
  useEffect(()=>{const controller=new AbortController();requestStorefront({admin:true,signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;if(result.ok)setData(result.data);else setError(result.reason==='auth'?'로그인이 만료되었습니다. 다시 로그인해 주세요.':'진열 목록을 불러오지 못했습니다. 저장 결과와 별개로 조회를 다시 시도해 주세요.');});return()=>controller.abort();},[attempt]);
  const publicCount=data?.sections.filter(section=>section.enabled).length??0;
  const page=useListPagination(data?.sections || [], '', '진열 섹션');
  return <main id="main" className="admin-page merchandising-page"><div className="section-heading"><div><p className="eyebrow">사이트 관리</p><h1>홈 진열 관리</h1></div><Link className="button" href="/admin/merchandising/new">진열 섹션 등록</Link></div><MerchandisingNav current="products"/><p className="admin-note">고객 홈에 보여줄 섹션과 상품을 관리합니다. 아래 목록은 홈에 배치한 순서대로 표시됩니다.</p>{error?<div role="alert"><p>{error}</p><div className="button-row"><button onClick={()=>{setError('');setAttempt(n=>n+1);}}>다시 조회</button><Link className="text-link" href="/admin/login">로그인 확인</Link></div></div>:!data?<p role="status">진열 목록을 불러오고 있습니다.</p>:<><KeyFacts label="홈 진열 현황" items={[
    {label:'전체 섹션',value:data.sections.length+'개'},
    {label:'공개 설정',value:publicCount+'개'},
    {label:'비공개 설정',value:(data.sections.length-publicCount)+'개'}
  ]}/><section className="merchandising-hero-summary" aria-labelledby="hero-heading"><div><h2 id="hero-heading">고객 홈 상단 광고 <ValueStatus tone={data.hero_enabled?'info':'neutral'}>{data.hero_enabled?'표시':'숨김'}</ValueStatus></h2><p>{data.hero_slides==null?'공개 진열 섹션의 첫 상품 사진으로 자동 구성합니다.':`개별 광고 ${data.hero_slides.length}개 · 광고별 문구와 순서를 관리합니다.`}</p></div><Link className="text-link" href="/admin/merchandising/hero">상단 광고 설정</Link></section>{page.summary}{data.sections.length===0?<p className="empty-state">아직 등록한 섹션이 없습니다. 진열 섹션 등록에서 첫 섹션을 만들어 주세요.</p>:<div className="merchandising-table" role="region" aria-label="진열 섹션 목록" tabIndex={0}><table><thead><tr><th>순서</th><th>섹션</th><th>선택 상품</th><th>공개 설정</th><th>작업</th></tr></thead><tbody>{page.items.map((section,index)=><tr key={section.id}><td>{page.range.start+index+1}</td><td><strong>{section.title}</strong><p>{section.kind==='category'?'카테고리':'시즌 / 기획전'}{section.subtitle&&' · '+section.subtitle}</p></td><td><strong className="merchandising-value">{section.product_ids.length}개</strong></td><td><ValueStatus tone={section.enabled?'info':'neutral'}>{section.enabled?'공개':'비공개'}</ValueStatus></td><td><Link className="text-link" href={`/admin/merchandising/${encodeURIComponent(section.id)}/edit`} aria-label={`${section.title} 수정`}>수정</Link></td></tr>)}</tbody></table></div>}{page.navigation}</>}</main>;
}
