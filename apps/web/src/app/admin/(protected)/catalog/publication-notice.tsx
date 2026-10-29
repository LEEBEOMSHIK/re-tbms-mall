'use client';
import {useEffect,useRef,useState} from 'react';
import {takePublicationSaved} from '@/lib/publication';
export function PublicationNotice({id}:{id:string}){const [message,setMessage]=useState('');const element=useRef<HTMLDivElement>(null);useEffect(()=>{const frame=requestAnimationFrame(()=>{const value=takePublicationSaved(id);if(value)setMessage(value)});return()=>cancelAnimationFrame(frame)},[id]);useEffect(()=>{if(message)element.current?.focus()},[message]);return message?<div ref={element} tabIndex={-1} role="status" className="catalog-notice"><strong>{message}</strong><p>서버에서 확인한 공개 설정입니다.</p><button onClick={()=>setMessage('')}>닫기</button></div>:null}

