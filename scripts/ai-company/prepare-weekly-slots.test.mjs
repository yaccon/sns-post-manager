import assert from 'node:assert/strict';
import test from 'node:test';
import {makeSlots,checkSlots,upcomingMonday,isDate,plusDays} from './prepare-weekly-slots.mjs';
test('42枠生成',()=>{
 const a=makeSlots('2026-10-19');
 assert.equal(a.length,42);
 assert.equal(a[0].date,'2026-10-19T12:00');
 assert.equal(a.at(-1).date,'2026-10-25T20:00');
 assert.equal(checkSlots(a),true);
});
test('次の月曜日',()=>{
 assert.equal(upcomingMonday('2026-10-18'),'2026-10-19');
 assert.equal(upcomingMonday('2026-10-19'),'2026-10-26');
});
test('年越しとうるう年',()=>{
 assert.equal(plusDays('2026-12-31',1),'2027-01-01');
 assert.equal(plusDays('2028-02-28',1),'2028-02-29');
 assert.equal(isDate('2026-02-29'),false);
});
test('重複した枠を拒否',()=>{
 assert.throws(()=>makeSlots('2026-13-88'));
 const a=makeSlots('2026-10-19');
 a[1].date=a[0].date;
 assert.throws(()=>checkSlots(a));
});