import {test} from 'node:test';
import assert from 'node:assert/strict';
import {colorChipValue,colorChipLabel} from '../src/lib/color-chip.ts';
test('representative color aliases normalize but unknown names and CSS are not guessed',()=>{
 assert.equal(colorChipValue(' 빨강 '),colorChipValue('RED'));
 assert.equal(colorChipValue('화이트'),'#ffffff');
 assert.equal(colorChipValue('네이비'),colorChipValue('Navy'));
 assert.equal(colorChipLabel('크림'),'Cream');
 assert.equal(colorChipLabel('아이보리'),'Ivory');
 assert.equal(colorChipLabel('하늘색'),'Sky Blue');
 assert.equal(colorChipLabel('사용자 색상'),'사용자 색상');
 for(const name of ['테스트 빨강','레드/블랙','url(example)','var(--color-text)','#123456',''])assert.equal(colorChipValue(name),null);
});

import {productSizeLabel} from '../src/lib/product-option-labels.ts';
test('size display aliases preserve custom option names',()=>{
 assert.equal(productSizeLabel('스몰'),'S');assert.equal(productSizeLabel('미디움'),'M');assert.equal(productSizeLabel('미디엄'),'M');assert.equal(productSizeLabel(' small '),'S');assert.equal(productSizeLabel('프리 사이즈'),'FREE');assert.equal(productSizeLabel('95'),'95');assert.equal(productSizeLabel('사용자 사이즈'),'사용자 사이즈');
});
