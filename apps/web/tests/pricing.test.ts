import test from 'node:test';
import assert from 'node:assert/strict';
import {percentagePrice,parseDiscountBasis,calculatePricing,parsePricing,priceDescription} from '../src/lib/pricing.ts';
import {parsePublication} from '../src/lib/publication.ts';
test('regular, absent, discounted, free and sub-one-percent prices remain distinct',()=>{assert.deepEqual(calculatePricing(null,null),{price:null,discount_price:null,effective_price:null,discount_rate:null});assert.equal(priceDescription(calculatePricing(null,null)),'');assert.equal(priceDescription(calculatePricing(0,null)),'판매 가격 0원');assert.deepEqual(calculatePricing(39000,29000),{price:39000,discount_price:29000,effective_price:29000,discount_rate:25});assert.equal(calculatePricing(39000,0).discount_rate,100);assert.equal(calculatePricing(1000,999).discount_rate,0);assert.doesNotMatch(priceDescription(calculatePricing(1000,999)),/0%/);assert.match(priceDescription(calculatePricing(39000,29000)),/판매 가격 29,000원/);});
test('pricing refuses malformed, inconsistent and invalid discount contracts',()=>{for(const pair of [[null,1],[0,0],[100,100],[100,101],[100,-1],[100,1.2],[1000000001,null]] as Array<[number|null,number|null]>)assert.throws(()=>calculatePricing(...pair));const valid=calculatePricing(10000,7500);assert.deepEqual(parsePricing(valid),valid);for(const patch of [{effective_price:10000},{discount_rate:24},{discount_price:undefined},{price:undefined}])assert.throws(()=>parsePricing({...valid,...patch}));});
test('publication history validates each price and rejects stale derived fields',()=>{const prices=calculatePricing(10000,7000);const dto={...prices,product_id:'p',product_name:'옷',internal_name:'TOP-1',status:'draft',version:0,can_publish:true,public_visible:false,reasons:[],history:[{...prices,status:'draft',created_at:'2026-10-29T00:00:00Z'}]};assert.equal(parsePublication(dto).history[0].effective_price,7000);assert.throws(()=>parsePublication({...dto,history:[{...dto.history[0],effective_price:10000}]}));});

test('percentage discount floors the selling price and preserves the selected basis',()=>{
 for(const [price,percent,expected] of [[30000,20,24000],[30001,20,24000],[3,33,2],[1,1,0],[100,100,0],[1000000000,1,990000000]])assert.equal(percentagePrice(price,percent),expected);
 for(const percent of [0,101,1.5,NaN])assert.throws(()=>percentagePrice(30000,percent));
 assert.throws(()=>percentagePrice(null,20));assert.throws(()=>percentagePrice(0,20));
 const p=calculatePricing(30001,24000);assert.deepEqual(parseDiscountBasis({...p,discount_mode:'percent',discount_percent:20}),{discount_mode:'percent',discount_percent:20});
 assert.throws(()=>parseDiscountBasis({...p,discount_mode:'percent',discount_percent:30}));
 assert.throws(()=>parseDiscountBasis({...p,discount_mode:'price',discount_percent:20}));
});
