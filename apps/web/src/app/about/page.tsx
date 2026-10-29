import Image from 'next/image';
import Link from 'next/link';
import { ShopHeader, ShopFooter } from '../../components/shop-shell';
export default function About() { return <><ShopHeader/><main id="main" className="about-page"><div className="about-copy"><p className="eyebrow">ABOUT RE: TBMS</p><h1>매일의 옷장에,<br/>오래 머무는 취향.</h1><p>편안한 실루엣과 차분한 색. 특별한 날뿐 아니라 평범한 하루에도 자연스럽게 손이 가는 옷을 생각합니다.</p><p>RE: TBMS가 지향하는 옷장은 각자의 일상과 취향을 담는 공간입니다. 계절의 분위기를 나만의 방식으로 만나보세요.</p><Link className="text-link" href="/">상품 둘러보기 ↗</Link><p className="sample-note">브랜드 소개 초안</p></div><div className="about-art"><Image src="/images/products/p004.svg" alt="차분한 색감의 아우터 샘플 일러스트" width={480} height={640}/><span>ROOM FOR YOUR EVERYDAY.</span></div></main><ShopFooter/></>; }
