'use client';
import Link from 'next/link';
import {ValueStatus} from '@/components/ui/key-facts';
import { useListPagination } from '@/components/ui/list-pagination';
import { useEffect, useState } from 'react';
import { requestStorefront, type Storefront } from '@/lib/storefront';
import './merchandising.css';
export default function MerchandisingList(){
  const [data,setData]=useState<Storefront|null>(null);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
  useEffect(()=>{const controller=new AbortController();requestStorefront({admin:true,signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;if(result.ok)setData(result.data);else setError(result.reason==='auth'?'로그인이 만료되었습니다. 다시 로그인해 주세요.':'진열 목록을 불러오지 못했습니다. 저장 결과와 별개로 조회를 다시 시도해 주세요.');});return()=>controller.abort();},[attempt]);
  const page=useListPagination(data?.sections || [], '', '진열 섹션');
  return <main id="main" className="admin-page merchandising-page"><div className="section-heading"><div><p className="eyebrow">MERCHANDISING</p><h1>홈 진열 목록</h1></div><Link className="button" href="/admin/merchandising/new">진열 섹션 등록</Link></div><p className="admin-note">섹션별 제목·등록 상품·공개 여부·진열 순서를 관리합니다. 게시 중인 상품만 고객 화면에 표시됩니다.</p>{error?<div role="alert"><p>{error}</p><div className="button-row"><button onClick={()=>{setError('');setAttempt(n=>n+1);}}>다시 조회</button><Link className="text-link" href="/admin/login">로그인 확인</Link></div></div>:!data?<p role="status">진열 목록을 불러오고 있습니다.</p>:<>{page.summary}{data.sections.length===0?<p className="empty-state">등록된 진열 섹션이 없습니다.</p>:<div className="merchandising-table" role="region" aria-label="진열 섹션 목록" tabIndex={0}><table><thead><tr><th>순서</th><th>섹션</th><th>상품</th><th>공개</th><th>작업</th></tr></thead><tbody>{page.items.map((section,index)=><tr key={section.id}><td>{page.range.start+index+1}</td><td><strong>{section.title}</strong><p>{section.kind==='category'?'카테고리':'시즌 / 기획전'}</p></td><td><strong className="merchandising-value">{section.product_ids.length}개</strong></td><td><ValueStatus tone={section.enabled?'info':'neutral'}>{section.enabled?'공개':'비공개'}</ValueStatus></td><td><Link className="text-link" href={`/admin/merchandising/${encodeURIComponent(section.id)}/edit`} aria-label={`${section.title} 수정`}>수정</Link></td></tr>)}</tbody></table></div>}{page.navigation}</>}</main>;
}
