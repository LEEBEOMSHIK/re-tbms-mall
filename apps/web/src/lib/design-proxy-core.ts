import { sameOrigin } from './admin-session-core.ts';
type Dependencies = {session:()=>Promise<{token:string}|null>;base:()=>string;fetcher?:typeof fetch};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const reply=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
function methods(parts:string[]):string[]{
 if(parts.length===0)return ['GET','POST'];
 if(parts.length===1&&['templates','materials'].includes(parts[0]))return ['GET'];
 if(!uuid.test(parts[0]||''))return [];
 if(parts.length===1)return ['GET','PATCH'];
 if(parts.length===2&&['assets','copies'].includes(parts[1]))return ['POST'];
 if(parts.length===3&&parts[1]==='assets'&&uuid.test(parts[2]))return ['GET'];
 return [];
}
export async function boundedBody(request:Request,limit:number):Promise<string>{
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>limit))throw new RangeError('Too large');
 if(!request.body)return '';
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new RangeError('Too large');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export function createDesignProxy({session,base,fetcher=fetch}:Dependencies){
 return async function proxy(request:Request,parts:string[]):Promise<Response>{
  const identity=await session();if(!identity)return reply('관리자 로그인이 필요합니다.',401);
  const allowed=methods(parts);if(!allowed.length)return reply('없는 디자인 경로입니다.',404);
  if(!allowed.includes(request.method))return reply('지원하지 않는 동작입니다.',405);
  if(request.method!=='GET'&&!sameOrigin(request))return reply('허용하지 않는 요청입니다.',403);
  let body:string|undefined;
  if(request.method!=='GET'){
   try{body=await boundedBody(request,parts[1]==='assets'?3*1024*1024:256*1024);JSON.parse(body);}
   catch(error){return reply(error instanceof RangeError?'요청 크기 제한을 초과했습니다.':'입력 형식을 확인해 주세요.',error instanceof RangeError?413:422);}
  }
  const url=new URL(`${base().replace(/\/$/,'')}/api/v1/admin/designs${parts.length?'/'+parts.join('/'):''}`);
  if(parts.length===0&&request.method==='GET'){const source=new URL(request.url);for(const key of ['q','page','size']){const value=source.searchParams.get(key);if(value!==null)url.searchParams.set(key,value);}}
  try{
   const upstream=await fetcher(url.toString(),{method:request.method,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${identity.token}`,...(body===undefined?{}:{'Content-Type':'application/json'})}});
   if(!upstream.ok){const status=[401,403,404,409,413,422].includes(upstream.status)?upstream.status:503;
    const message=status===409?'다른 저장 또는 처리된 요청과 충돌했습니다. 최신 버전을 확인해 주세요.':status===422?'디자인·이미지 입력값과 적용 영역을 확인해 주세요.':status===413?'요청 크기 제한을 초과했습니다.':status===401?'관리자 로그인이 필요합니다.':status===404?'디자인이나 이미지를 찾을 수 없습니다.':'디자인 서버 요청을 처리하지 못했습니다.';
    return reply(message,status);
   }
   if(parts.length===3){const type=upstream.headers.get('content-type')?.split(';')[0];if(!['image/png','image/jpeg','image/webp'].includes(type||''))return reply('이미지 응답을 확인하지 못했습니다.',502);
    const bytes=await upstream.arrayBuffer();if(bytes.byteLength>2*1024*1024)return reply('이미지 크기 제한을 초과했습니다.',502);
    return new Response(bytes,{headers:{'Content-Type':type!,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
   }
   return Response.json(await upstream.json(),{status:upstream.status,headers:{'Cache-Control':'no-store'}});
  }catch{return reply('디자인 서버에 연결하지 못했습니다. 입력은 유지됩니다.',503);}
 };
}
