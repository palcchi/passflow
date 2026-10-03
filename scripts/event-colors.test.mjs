import assert from 'node:assert/strict';
const { contrastRatio, eventInk, luminance } = await import('../lib/event-colors.ts');
assert.equal(contrastRatio('#000000', '#ffffff').toFixed(2), '21.00');
assert.equal(contrastRatio('#fff', '#ffffff'), 1);
assert.equal(contrastRatio('not-a-colour', '#ffffff'), 1, 'invalid colours never pass a contrast check');
assert.equal(eventInk('#ffd23f'), '#171717');
assert.equal(eventInk('#7b1734'), '#ffffff');
assert.equal(luminance('#12'), null);
console.log('event colour checks passed');
