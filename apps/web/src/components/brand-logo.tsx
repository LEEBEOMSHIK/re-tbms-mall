import Image from 'next/image';
import './brand-logo.css';
/** Original supplied artwork: keep its colour, transparency and aspect ratio. */
export function BrandLogo(){return <Image className="brand-logo" src="/images/identity/logo_long.png" alt="RE:TAG" width={180} height={60} sizes="(max-width: 767px) 132px, 180px"/>;}
