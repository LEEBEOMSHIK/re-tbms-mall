// Display-only representative colors. Unknown/custom names are never guessed.
const groups:[string,string[]][]=[
 ['#c54436',['빨강','빨간색','레드','red']],['#171717',['검정','검정색','블랙','black']],
 ['#ffffff',['흰색','하양','화이트','white']],['#eee7d6',['아이보리','ivory','크림','cream']],
 ['#20324f',['네이비','남색','navy']],['#3972b8',['파랑','파란색','블루','blue']],
 ['#9fc7df',['하늘색','스카이블루','skyblue']],['#8b8b8b',['회색','그레이','gray','grey']],
 ['#41454b',['차콜','charcoal']],['#d4bc97',['베이지','beige']],['#78543e',['갈색','브라운','brown']],
 ['#476c4c',['초록','초록색','그린','green']],['#70734c',['카키','khaki']],['#efce4c',['노랑','노란색','옐로우','yellow']],
 ['#e58aab',['분홍','분홍색','핑크','pink']],['#9266ad',['보라','보라색','퍼플','purple']],
 ['#e1833d',['주황','주황색','오렌지','orange']],['#a6d2bd',['민트','mint']],['#742e40',['버건디','burgundy']],
 ['#b99572',['카멜','camel']],['#858870',['올리브','olive']],['#c4b2d4',['라벤더','lavender']],
];
export function colorChipValue(name:string):string|null{
 const normalized=name.trim().toLowerCase().replace(/\s+/g,'');
 return groups.find(([,names])=>names.includes(normalized))?.[0]??null;
}
const labels:Record<string,string>={'#c54436':'Red','#171717':'Black','#ffffff':'White','#eee7d6':'Ivory','#20324f':'Navy','#3972b8':'Blue','#9fc7df':'Sky Blue','#8b8b8b':'Grey','#41454b':'Charcoal','#d4bc97':'Beige','#78543e':'Brown','#476c4c':'Green','#70734c':'Khaki','#efce4c':'Yellow','#e58aab':'Pink','#9266ad':'Purple','#e1833d':'Orange','#a6d2bd':'Mint','#742e40':'Burgundy','#b99572':'Camel','#858870':'Olive','#c4b2d4':'Lavender'};
export function colorChipLabel(name:string){const normalized=name.trim().toLowerCase().replace(/\s+/g,'');if(normalized==='크림'||normalized==='cream')return 'Cream';const color=colorChipValue(name);return color?labels[color]??name:name;}
