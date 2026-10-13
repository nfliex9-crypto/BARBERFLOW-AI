import test from "node:test";
import assert from "node:assert/strict";
import {SERVICES,availableStarts,isSunday,localNow,validDay,daysFromNow} from "../api/_lib.js";
function addDays(day,amount){
 const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);
}
function nextWeekday(n) {
 const today=localNow().day;
 for(let i=7;i<=55;i++){
  const x=addDays(today,i);
  if(new Date(x+"T12:00:00Z").getUTCDay()===n)return x;
 }
 throw Error("Weekday unavailable");
}
test("Monday-Saturday open 10–20, Sunday closed",()=>{
 assert.equal(availableStarts(nextWeekday(1),SERVICES.haircut).length,20);
 assert.equal(availableStarts(nextWeekday(6),SERVICES.haircut).at(-1).time,"19:30");
 assert.equal(isSunday(nextWeekday(1)),false);
});
test("Sunday never shows slots, and dates outside horizon are rejected",()=>{
 const actualSunday=nextWeekday(0);
 assert.equal(isSunday(actualSunday),true);
 assert.equal(availableStarts(actualSunday,SERVICES.beard).length,0);
 assert.equal(availableStarts(addDays(localNow().day,80),SERVICES.beard).length,0);
 assert.equal(validDay("2026-02-30"),false);
 assert.equal(validDay("2026-11-15"),true);
});
test("45-min treatment overlaps adjacent slots correctly",()=>{
 const day=nextWeekday(2);
 const available=availableStarts(day,SERVICES.combo,[{start_min:600,end_min:645}]);
 assert.ok(!available.some(x=>x.time==="10:00"||x.time==="10:30"));
 assert.ok(available.some(x=>x.time==="11:00"));
 assert.equal(available.at(-1).time,"19:00");
});
test("No 30-min appointment can extend past closing time",()=>{
 const day=nextWeekday(3);
 const times=availableStarts(day,SERVICES.haircut);
 assert.equal(times[0].time,"10:00");
 assert.equal(times.at(-1).time,"19:30");
});
