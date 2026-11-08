import Link from 'next/link';

const menus={
 faq:{href:'/faq',label:'자주 묻는 질문',path:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 1.75-2.5 3.5m0 3h.01'},
 inquiries:{href:'/account/inquiries',label:'1:1 문의',path:'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-10.5A8.5 8.5 0 0 1 10.5 3h2A8.5 8.5 0 0 1 21 11.5ZM7 10h9m-9 4h6'},
 shop:{href:'/products',label:'Shop',path:'M10 5a2 2 0 1 1 3 1.73L12 7.5V10l9 6a1 1 0 0 1-.55 1.83H3.55A1 1 0 0 1 3 16l9-6'},
 about:{href:'/about',label:'브랜드 소개',path:'M3 3h8l10 10-8 8L3 11V3Zm4.5 4.5h.01M10 12l4 4m-2-6 4 4'},
 cart:{href:'/cart',label:'장바구니',path:'M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2'},
};
export function CustomerNavLink({menu}:{menu:keyof typeof menus}){
 const item=menus[menu];
 return <Link href={item.href} className="customer-icon-link customer-nav-icon" aria-label={item.label}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={item.path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="customer-nav-tooltip" aria-hidden="true">{item.label}</span></Link>;
}
