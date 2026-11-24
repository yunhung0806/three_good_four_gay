import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const scheduleFunction=source.match(/function residentSchedule\(day\)\{[^\n]+\}/)?.[0];
test('each resident has one location on every day',()=>{
 assert.ok(scheduleFunction);
 const schedule=vm.runInNewContext(`${scheduleFunction};residentSchedule`);
 for(let day=1;day<=7;day++){
  const positions=schedule(day);
  assert.equal(Object.keys(positions).length,6);
  assert.equal(Object.values(positions).filter(scene=>scene==='cafe').length,2);
  for(const scene of ['school','bakery','shop','park','town'])assert.ok(Object.values(positions).filter(place=>place===scene).length<=1);
  assert.equal(Object.keys(positions).length,new Set(Object.keys(positions)).size);
 }
});
