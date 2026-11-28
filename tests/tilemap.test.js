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

test('the camera centers the player and reveals landmarks as the player moves', () => {
  const start = map.cameraFor(1440, 900, 28, 43);
  const player = map.screenPoint(start, 28, 43);
  const school = { x: 71, y: 37 };
  assert.ok(Math.abs(player.x - 720) < 2 && Math.abs(player.y - 450) < 2);
  assert.ok(start.width < map.width && start.height < map.height);
  assert.ok(map.screenPoint(start, school.x, school.y).x > 1440);

  const east = map.cameraFor(1440, 900, 62, 43);
  assert.ok(east.x > start.x);
  const visibleSchool = map.screenPoint(east, school.x, school.y);
  assert.ok(visibleSchool.x > 0 && visibleSchool.x < 1440);
});

test('the camera stays inside the town at all four edges and in portrait view', () => {
  for (const [viewWidth, viewHeight] of [[1440, 900], [390, 844], [2560, 720]]) {
    const topLeft = map.cameraFor(viewWidth, viewHeight, 0, 0);
    const bottomRight = map.cameraFor(viewWidth, viewHeight, 100, 100);
    assert.equal(topLeft.x, 0);
    assert.equal(topLeft.y, 0);
    assert.equal(bottomRight.x + bottomRight.width, map.width);
    assert.equal(bottomRight.y + bottomRight.height, map.height);
    assert.ok(Math.abs(topLeft.width * topLeft.scale - viewWidth) < 0.01);
    assert.ok(Math.abs(topLeft.height * topLeft.scale - viewHeight) < 0.01);
  }
});
