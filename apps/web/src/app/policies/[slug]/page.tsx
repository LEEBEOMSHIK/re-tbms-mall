import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopHeader, ShopFooter } from '../../../components/shop-shell';
const policies = {
  terms: { title: '이용약관', sections: [['현재 이용 범위', '현재 화면은 샘플 의류를 둘러보는 공간입니다. 실제 주문 접수와 결제는 제공하지 않습니다.'], ['오픈 전 준비 사항', '서비스 운영 주체, 회원 이용 범위, 거래 절차, 문의 및 분쟁 처리 안내를 확정한 뒤 정식 이용약관을 게시할 예정입니다.']] },
  privacy: { title: '개인정보처리방침', sections: [['방침 준비 안내', '현재 페이지는 정식 개인정보처리방침이 아닙니다. 운영 주체와 실제 서비스의 데이터 처리 범위를 확인한 뒤 게시할 예정입니다.'], ['오픈 전 준비 사항', '수집 항목과 목적, 보관·파기, 외부 처리 및 이용자 요청 창구를 실제 구현과 운영 계약에 맞춰 확정할 예정입니다.']] },
  shipping: { title: '배송 안내', sections: [['현재 배송 서비스', '샘플 상품은 실제 판매·배송되지 않습니다. 배송 문의를 접수하는 서비스도 아직 제공하지 않습니다.'], ['오픈 전 준비 사항', '배송 지역, 출고 방식, 택배사, 배송비 및 예상 소요 기간을 확정한 뒤 안내합니다. 현재 정해진 배송 조건은 없습니다.']] },
  returns: { title: '교환·반품 안내', sections: [['현재 교환·반품 서비스', '현재 실제 거래가 이루어지지 않아 교환·반품·환불 접수 기능을 제공하지 않습니다.'], ['오픈 전 준비 사항', '신청 창구, 회수·검수 절차, 비용 및 환불 처리 안내를 판매 방식에 맞춰 검토하고 게시할 예정입니다. 이 초안으로 고객의 권리를 제한하지 않습니다.']] },
} as const;
type Slug = keyof typeof policies;
function findPolicy(slug: string) { return Object.hasOwn(policies, slug) ? policies[slug as Slug] : null; }
export function generateStaticParams() { return Object.keys(policies).map(slug => ({ slug })); }
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const policy=findPolicy((await params).slug);return {title:policy?`${policy.title} · 준비 중 | RE: TBMS`:'안내를 찾을 수 없습니다'};}
export default async function PolicyPage({params}:{params:Promise<{slug:string}>}){
  const policy=findPolicy((await params).slug);if(!policy)notFound();
  return <><ShopHeader/><main id="main" className="policy-page"><p className="eyebrow">INFORMATION</p><h1>{policy.title}</h1><p className="policy-notice"><strong>준비 중인 안내 초안입니다.</strong><br/>정식 정책이 아니며, 실제 판매를 시작하기 전에 확정된 내용으로 교체합니다.</p>{policy.sections.map(([title,body])=><section key={title}><h2>{title}</h2><p>{body}</p></section>)}</main><ShopFooter/></>;
}
