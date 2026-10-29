// Minimal, memory-only confirmation for a successful save across client navigation.
// Never stores credentials, account details, files, or production notes.
export type AdminSaveReceipt={kind:'account'|'request'|'assignment';id:string;label:string;supplierId?:string};
let receipt:AdminSaveReceipt|null=null;
export function rememberAdminSave(value:AdminSaveReceipt){receipt={...value};}
export function readAdminSave(){return receipt;}
