import type {ReactNode} from 'react';
import './key-facts.css';
export function KeyFacts({label,items}:{label:string;items:{label:string;value:ReactNode;previous?:ReactNode;note?:string}[]}){
 return <dl className="ds-key-facts" aria-label={label}>{items.map(item=><div key={item.label} className="ds-key-fact"><dt>{item.label}</dt><dd>{item.previous!==undefined&&<span className="ds-key-fact-before">변경 전 {item.previous}<span aria-hidden="true"> →</span></span>}<strong className="ds-key-fact-value">{item.previous!==undefined&&<span className="ds-key-fact-after">저장 후</span>}{item.value}</strong>{item.note&&<span className="ds-key-fact-note">{item.note}</span>}</dd></div>)}</dl>;
}

export function ValueStatus({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'info'|'success'|'attention'}){
 return <span className={`ds-value-status ds-value-status--${tone}`}>{children}</span>;
}
