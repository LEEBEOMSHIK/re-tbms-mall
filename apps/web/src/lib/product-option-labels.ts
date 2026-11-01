// Display labels only; preserve original option names in SKU selection and OAuth URLs.
const sizes:Record<string,string>={'엑스트라스몰':'XS','엑스스몰':'XS','스몰':'S','미디움':'M','미디엄':'M','라지':'L','엑스트라라지':'XL','엑스라지':'XL','투엑스라지':'XXL','프리':'FREE','프리사이즈':'FREE','small':'S','medium':'M','large':'L'};
export function productSizeLabel(name:string){const key=name.trim().toLowerCase().replace(/\s+/g,'');return Object.hasOwn(sizes,key)?sizes[key]:name;}
