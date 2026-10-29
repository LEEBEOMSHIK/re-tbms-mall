// Confirmed server responses only. Memory-only like admin-save-receipt:
// survives client navigation, clears on reload, never stores documents or images.
export type DesignSaveReceipt={id:string;name:string;version:number};
const receipts=new Map<string,DesignSaveReceipt>();
export function rememberDesignSave(value:DesignSaveReceipt):boolean{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)||typeof value.name!=='string'||!value.name.trim()||value.name.length>120||!Number.isSafeInteger(value.version)||value.version<1)return false;
 const previous=receipts.get(value.id);if(previous&&previous.version>value.version)return false;
 receipts.delete(value.id);receipts.set(value.id,{id:value.id,name:value.name,version:value.version});
 if(receipts.size>20)receipts.delete(receipts.keys().next().value!);
 return true;
}
export function readDesignSave(id:string):DesignSaveReceipt|null{const receipt=receipts.get(id);return receipt?{...receipt}:null;}
