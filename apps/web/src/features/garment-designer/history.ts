export type History<T>={past:T[];present:T;future:T[]};
export function history<T>(present:T):History<T>{return {past:[],present,future:[]};}
export function commit<T>(h:History<T>,present:T):History<T>{return {past:[...h.past,h.present].slice(-50),present,future:[]};}
export function undo<T>(h:History<T>):History<T>{return h.past.length?{past:h.past.slice(0,-1),present:h.past.at(-1)!,future:[h.present,...h.future]}:h;}
export function redo<T>(h:History<T>):History<T>{return h.future.length?{past:[...h.past,h.present],present:h.future[0],future:h.future.slice(1)}:h;}
type Layer={id:string};
type Command<L>={type:'patch';patch:Partial<L>}|{type:'duplicate';id:string}|{type:'delete'}|{type:'reorder';direction:1|-1};
export function layerCommand<D extends {decorations:Layer[]}>(doc:D,id:string,command:Command<D["decorations"][number]>):D{
 const layers=[...doc.decorations],i=layers.findIndex(l=>l.id===id);if(i<0)return doc;
 if(command.type==='patch')layers[i]={...layers[i],...command.patch};
 if(command.type==='delete')layers.splice(i,1);
 if(command.type==='duplicate')layers.splice(i+1,0,{...structuredClone(layers[i]),id:command.id});
 if(command.type==='reorder'){const to=i+command.direction;if(to>=0&&to<layers.length)[layers[i],layers[to]]=[layers[to],layers[i]];}
 return {...doc,decorations:layers};
}
