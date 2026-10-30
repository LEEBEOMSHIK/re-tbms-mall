// Keep the document alive while the browser recreates GPU resources.
export function createContextRecovery({canvas,button,notice,requestRestore,rebuild,onInterrupt=()=>{}}) {
 let lost=false,contextLost=false,pending=false,timer;
 const fail=()=>{pending=false;button.disabled=false;notice.textContent='미리보기를 복구하지 못했습니다. 입력과 나염은 유지됩니다. 다시 시도하거나 디자인을 저장하세요.';};
 const restored=()=>{
  clearTimeout(timer);contextLost=false;
  try{rebuild();lost=false;pending=false;button.hidden=true;button.disabled=false;notice.textContent='미리보기를 복구했습니다. 입력과 나염은 그대로 유지됩니다.';}
  catch{lost=true;button.hidden=false;fail();}
 };
 const onLost=event=>{
  event.preventDefault();clearTimeout(timer);lost=contextLost=true;pending=false;onInterrupt();
  button.hidden=false;button.disabled=false;
  notice.textContent='그래픽 연결이 끊겼습니다. 입력과 나염은 유지됩니다. 미리보기를 복구하거나 디자인을 저장하세요.';
 };
 button.onclick=()=>{
  if(!lost||pending)return;
  pending=true;button.disabled=true;
  notice.textContent='미리보기를 복구하고 있습니다. 입력과 나염은 유지됩니다.';
  if(!contextLost){restored();return;}
  timer=setTimeout(fail,10000);
  try{requestRestore();}catch{clearTimeout(timer);fail();}
 };
 canvas.addEventListener('webglcontextlost',onLost);
 canvas.addEventListener('webglcontextrestored',restored);
 return {get lost(){return lost;},status(text){if(!lost)notice.textContent=text;},dispose(){clearTimeout(timer);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',restored);button.onclick=null;}};
}
