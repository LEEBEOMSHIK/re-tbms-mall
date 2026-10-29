import type {MovementReasonCode} from './catalog.ts';

export type InventoryFlow = '' | 'receipt' | 'out' | 'adjust';
export const inventoryFlows = [
  {value:'receipt',title:'입고 등록',description:'공장·공급처 등 → 보유 재고'},
  {value:'out',title:'출고 등록',description:'판매 · 증정 · 폐기 · 기타 출고'},
  {value:'adjust',title:'재고 조정',description:'실사 차이 등 재고 증가 · 감소'},
] as const;
export function inventoryFlowConfig(value: string): {flow:InventoryFlow;reason:MovementReasonCode} {
  if(value==='customer')return {flow:'out',reason:'sale'};
  if(value==='other')return {flow:'out',reason:'gift'};
  if(value==='out')return {flow:'out',reason:'sale'};
  if(value==='adjust')return {flow:'adjust',reason:'adjust_in'};
  return {flow:value==='receipt'?'receipt':'',reason:'receipt'};
}
export function inventoryFlowReasons(flow: InventoryFlow): MovementReasonCode[] {
  return flow==='receipt'?['receipt']:flow==='out'?['sale','gift','disposal','other_out']:flow==='adjust'?['adjust_in','adjust_out']:[];
}
export function inventorySignedDelta(reason: MovementReasonCode, quantity: number): number {
  return quantity * (reason==='receipt'||reason==='adjust_in'?1:-1);
}
