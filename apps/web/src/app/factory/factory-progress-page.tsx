'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {catalogRequest} from '@/lib/catalog';
import {parseFactoryWorkspace,type FactoryProduct} from '@/lib/factory';
import {ProductProgress} from '@/components/product-progress';
export function FactoryProgressPage({productId,mode,savedVersion}:{productId:string;mode:'view'|'edit';savedVersion?:string}){
 const router=useRouter();const [product,setProduct]=useState<FactoryProduct|null>(null);const [error,setError]=useState('');
 useEffect(()=>{let active=true;void catalogRequest('/api/factory/workspace',parseFactoryWorkspace).then(result=>{if(!active)return;if(result.ok){const found=result.data.products.find(item=>item.id===productId);if(found)setProduct(found);else setError('담당 상품을 찾을 수 없습니다. 배정 정보를 확인해 주세요.')}else if(result.reason==='auth'){router.replace('/factory/login');router.refresh()}else setError('상품 이름을 불러오지 못했습니다. 아래 진행 상태 조회 결과를 확인해 주세요.')});return()=>{active=false}},[productId,router]);
 return <main id="main" className="factory-page"><header className="factory-heading"><div><p className="eyebrow">공장 협업</p><h1>{mode==='view'?'시안 관리':'시안 상태 변경'}</h1>{product&&<p>{product.name} · {product.internal_name}</p>}</div><div className="factory-actions">{mode==='view'&&<Link className="factory-button" href={`/factory/shipments/new?kind=sample&product_id=${encodeURIComponent(productId)}`}>샘플 발송</Link>}<Link className="factory-button" href={`/factory/products/${encodeURIComponent(productId)}`}>담당 상품 상세</Link></div></header>{error&&<p role="alert">{error}</p>}<ProductProgress key={`${productId}-${mode}`} productId={productId} scope="factory" mode={mode} savedVersion={savedVersion}/></main>;
}

