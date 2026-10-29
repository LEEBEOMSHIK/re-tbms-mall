import Link from 'next/link';
export function FactoryNav(){return <nav className="catalog-actions catalog-toolbar" aria-label="공장 협업 메뉴">
 <Link className="catalog-link-button" href="/admin/factories/progress">시안 관리</Link>
 <Link className="catalog-link-button" href="/admin/factories/requests">제작 요청 목록</Link>
 <Link className="catalog-link-button" href="/admin/factories/requests/new">추가 제작 요청</Link>
 <Link className="catalog-link-button" href="/admin/shipments">수령·검수 관리</Link>
 <Link className="catalog-link-button" href="/admin/factories/accounts">공장 계정 관리</Link>
 <Link className="catalog-link-button" href="/admin/catalog/suppliers">공장·공급처 목록</Link>
 </nav>}
