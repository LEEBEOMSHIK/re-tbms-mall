import Link from 'next/link';

const menus={
 shop:{href:'/products',label:'Shop',path:'M10 5a2 2 0 1 1 3 1.73L12 7.5V10l9 6a1 1 0 0 1-.55 1.83H3.55A1 1 0 0 1 3 16l9-6'},
 about:{href:'/about',label:'브랜드 소개',path:'M3 3h8l10 10-8 8L3 11V3Zm4.5 4.5h.01M10 12l4 4m-2-6 4 4'},
 cart:{href:'/cart',label:'장바구니',path:'M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2'},
};
export function CustomerNavLink({menu}:{menu:keyof typeof menus}){
 const item=menus[menu];
 return <Link href={item.href} className="customer-icon-link customer-nav-icon" aria-label={item.label}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={item.path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="customer-nav-tooltip" aria-hidden="true">{item.label}</span></Link>;
}
