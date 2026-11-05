'use client';
import {useEffect, useRef, useState} from 'react';
import {customerRequest, parseCart, type Cart} from '@/lib/customer-shopping';

export type CartChange =
  | {kind:'quantity'; sku:string; quantity:number}
  | {kind:'option'; sku:string; target:string}
  | {kind:'remove'; ids:string[]};
type Request = {change:CartChange; version:number; guard?:string; id:string};

function mutation(request:Request) {
  const c = request.change, base = {version:request.version, request_id:request.id};
  if (c.kind === 'quantity') return {path:'/cart/items/'+encodeURIComponent(c.sku), method:'PUT', body:{...base, quantity:c.quantity}};
  if (c.kind === 'option') return {path:'/cart/change-option', method:'POST', body:{...base,sku_id:c.sku,target_sku_id:c.target}};
  return {path:'/cart/remove-selection', method:'POST', body:{...base,sku_ids:c.ids}};
}

export function useShoppingCart() {
  const [cart,setCart] = useState<Cart|null>(null);
  const [auth,setAuth] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [refreshRequired,setRefreshRequired] = useState(false);
  const [pending,setPending] = useState<Request|null>(null);
  const [working,setWorking] = useState<CartChange|null>(null);
  const [savedQuantities,setSavedQuantities] = useState<Set<string>>(new Set());
  const [selected,setSelected] = useState<Set<string>>(new Set());
  const lock = useRef(false);
  const draining = useRef(false);
  const checkoutWaiters = useRef<Array<(cart:Cart|null)=>void>>([]);
  const goals = useRef(new Map<string,number>());
  const [preview,setPreview] = useState<ReadonlyMap<string,number>>(()=>new Map());
  function publishGoals(next: Map<string,number>) {
    goals.current=next;
    setPreview(next);
  }
  const initial = (data:Cart) => new Set(data.items.filter(i=>i.available).map(i=>i.sku_id));
  useEffect(()=>{
    let active = true;
    void customerRequest('/cart',parseCart).then(r=>{
      if (!active) return;
      if (r.ok) { setCart(r.data); setSelected(initial(r.data)); }
      else if (r.reason==='auth') setAuth(true);
      else setError('장바구니를 불러오지 못했어요.');
    });
    return ()=>{active=false;};
  },[]);
  async function reload() {
    if (lock.current) return;
    lock.current=true; setBusy(true);
    try {
      const r=await customerRequest('/cart',parseCart);
      if (!r.ok) {
        if (r.reason==='auth') {setCart(null);setAuth(true);}
        else setError('최신 장바구니를 확인하지 못했어요. 다시 시도해 주세요.');
        return;
      }
      if (!cart || cart.session_guard!==r.data.session_guard) setSelected(initial(r.data));
      else setSelected(prev=>new Set(r.data.items.filter(i=>prev.has(i.sku_id)).map(i=>i.sku_id)));
      setCart(r.data);setPending(null);setError('');setNotice('최신 가격과 재고를 확인했어요.');setRefreshRequired(false);
    } finally {lock.current=false;setBusy(false);}
  }
  async function send(first:Request) {
    if (lock.current) return false;
    lock.current=true;
    draining.current=first.change.kind==='quantity';
    setBusy(true);setWorking(first.change);setNotice('');setError('');
    let request=first;
    let settled:Cart|null=null;
    try {
      for (;;) {
        const m=mutation(request);
        const r=await customerRequest(m.path,parseCart,{method:m.method,body:m.body,sessionGuard:request.guard});
        if (!r.ok) {
          if (r.reason==='auth') {setAuth(true);setCart(null);return false;}
          const unknown=r.reason==='unknown';
          setPending(unknown?request:null);setRefreshRequired(!unknown);
          setError(unknown?'저장 결과를 확인하지 못했어요. 같은 요청의 결과를 다시 확인해 주세요.':'변경을 저장하지 못했어요. 최신 가격과 재고를 확인해 주세요.');
          return false;
        }

        const c=request.change;
        setCart(r.data);setPending(null);setRefreshRequired(false);
        if (c.kind!=='quantity') {
          setSelected(prev=>new Set(r.data.items.filter(i=>prev.has(i.sku_id) || (c.kind==='option' && prev.has(c.sku) && i.sku_id===c.target)).map(i=>i.sku_id)));
          setNotice(c.kind==='option'?'옵션을 변경했어요.':'상품을 삭제했어요.');
          return true;
        }

        // Clicks during this PUT may have replaced its target or edited another SKU.
        setSavedQuantities(prev=>new Set(prev).add(c.sku));
        const remaining=new Map(goals.current);
        if (remaining.get(c.sku)===c.quantity) remaining.delete(c.sku);
        for (const item of r.data.items) {
          if (remaining.get(item.sku_id)===item.quantity) remaining.delete(item.sku_id);
        }
        publishGoals(remaining);
        const next=remaining.entries().next();
        if (next.done) {settled=r.data;return true;}

        const [sku,quantity]=next.value;
        const item=r.data.items.find(row=>row.sku_id===sku);
        if (!item || item.effective_price===null || quantity>Math.min(99,item.available_quantity)) {
          setError('재고가 변경되어 추가 수량을 저장할 수 없어요. 최신 상태를 확인해 주세요.');
          setRefreshRequired(true);
          return false;
        }
        request={change:{kind:'quantity',sku,quantity},version:r.data.version,guard:request.guard,id:crypto.randomUUID()};
        setWorking(request.change);
      }
    } finally {
      publishGoals(new Map());setWorking(null);setBusy(false);draining.current=false;lock.current=false;
      const waiters=checkoutWaiters.current;
      checkoutWaiters.current=[];
      waiters.forEach(resolve=>resolve(settled));
    }
  }
  function adjust(sku:string,delta:1|-1) {
    if (!cart || pending || refreshRequired || (lock.current && !draining.current)) return;
    const item=cart.items.find(row=>row.sku_id===sku);
    if (!item || item.effective_price===null) return;
    const max=Math.min(99,item.available_quantity);
    if (max<1) return;
    const current=goals.current.get(sku) ?? item.quantity;
    const quantity=Math.min(max, Math.max(1,current+delta));
    if (current===quantity) return;
    setSavedQuantities(prev=>{const next=new Set(prev);next.delete(sku);return next;});
    publishGoals(new Map(goals.current).set(sku,quantity));
    if (!lock.current) void send({change:{kind:'quantity',sku,quantity},version:cart.version,guard:cart.session_guard,id:crypto.randomUUID()});
  }
  function change(c:Exclude<CartChange,{kind:'quantity'}>) {
    if (!cart || busy || pending || refreshRequired) return Promise.resolve(false);
    return send({change:c,version:cart.version,guard:cart.session_guard,id:crypto.randomUUID()});
  }
  const savingQuantities=new Set(preview.keys());
  if (busy && working?.kind==='quantity') savingQuantities.add(working.sku);
  function checkoutCart():Promise<Cart|null> {
    if (lock.current && draining.current) return new Promise(resolve=>checkoutWaiters.current.push(resolve));
    return Promise.resolve(lock.current || pending || refreshRequired ? null : cart);
  }
  return {cart,auth,busy,error,notice,pending,preview,adjust,selected,setSelected,reload,change,savingQuantities,savedQuantities,
    checkoutCart,checkoutBlocked:!!pending || refreshRequired || (busy && working?.kind!=='quantity'),
    stepperBlocked:!!pending || refreshRequired || (busy && working?.kind!=='quantity'),
    blocked:busy || !!pending || refreshRequired, retry:()=>pending?send(pending):reload()};
}
