import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../src/tilemap.js', import.meta.url), 'utf8'), context);
const map = context.LUMINA_TILEMAP;
const at = (col, row) => [(col + .5) / map.cols * 100, (row + .7) / map.rows * 100];

test('town terrain has traversable roads and solid buildings, water, and trees', () => {
  assert.equal(map.canWalk(...at(13, 11)), true); // starting street
  assert.equal(map.canWalk(...at(13, 6)), false); // cafe
  assert.equal(map.canWalk(...at(20, 15)), false); // pond
  assert.equal(map.canWalk(...at(24, 15)), true); // bridge
  assert.equal(map.canWalk(...at(3, 3)), false); // tree
  assert.equal(map.canWalk(...at(7, 12)), false); // streetlamp
  assert.equal(map.canWalk(...at(6, 7)), false); // cafe table
  assert.equal(map.canWalk(...at(38, 21)), true); // plaza beside fountain
  assert.equal(map.canWalk(...at(39, 21)), false); // fountain basin
  assert.equal(map.canWalk(...at(40, 22)), false);
  assert.equal(map.canWalk(...at(41, 22)), true); // plaza on the other side
});

test('movement stops at a solid tile while allowing travel along its edge', () => {
  const [x, y] = at(17, 15);
  let position = [x, y];
  for (let i = 0; i < 20; i++) position = map.move(...position, 1, 0, .05);
  assert.ok(position[0] < 18 / map.cols * 100);
  assert.equal(position[1], y);
  const [slideX, slideY] = map.move(...position, 1, -1, .05);
  assert.equal(slideX, position[0]);
  assert.ok(slideY < y);
});
