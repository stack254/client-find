import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Campaigns,sectors} from './campaigns.js';
const spec={countries:['KE'],sectors:sectors.slice(0,2),towns:{KE:['Nairobi']},budget:1};
async function fixture(t,search){const dir=await mkdtemp(path.join(os.tmpdir(),'campaign-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return new Campaigns(path.join(dir,'state.json'),search).init();}
test('budget pauses, state restores, completed jobs do not repeat, results deduplicate',async t=>{
 let calls=0;const search=async()=>{calls++;return [{placeId:'same',name:'Example',score:75}];};
 let engine=await fixture(t,search);const c=await engine.create(spec);await engine.start(c.id);await engine.task;
 assert.equal(c.status,'paused');assert.equal(c.jobs.filter(j=>j.done).length,1);
 engine=await new Campaigns(engine.file,search).init();await engine.start(c.id);await engine.task;
 assert.equal(engine.get(c.id).status,'complete');assert.equal(calls,2);assert.equal(engine.get(c.id).results.length,1);
});
test('quota failure leaves job pending and resumes explicitly',async t=>{
 let fail=true;const engine=await fixture(t,async()=>{if(fail)throw Error('quota reached');return [];});const c=await engine.create(spec);
 await engine.start(c.id);await engine.task;assert.equal(c.jobs[0].done,false);assert.match(c.message,/quota/);
 fail=false;await engine.start(c.id);await engine.task;assert.equal(c.jobs[0].done,true);
});
test('pause finishes current request and prevents another worker',async t=>{
 let release;const engine=await fixture(t,()=>new Promise(r=>{release=r;}));const c=await engine.create({...spec,budget:3});await engine.start(c.id);
 while(!release)await new Promise(r=>setTimeout(r,5));
 await assert.rejects(engine.start(c.id),/Another/);await engine.pause(c.id);release([]);await engine.task;
 assert.equal(c.jobs.filter(j=>j.done).length,1);assert.equal(c.status,'paused');
});
test('reject unsupported selections and invalid budget',async t=>{const engine=await fixture(t,async()=>[]);await assert.rejects(engine.create({...spec,budget:999}),/allowance/);await assert.rejects(engine.create({...spec,countries:['XX']}),/supported/);});
test('interrupted running campaign loads paused without automatically spending quota',async t=>{
 const engine=await fixture(t,async()=>{throw Error('must not search');});const c=await engine.create(spec);c.status='running';await engine.save();
 const restored=await new Campaigns(engine.file,async()=>{throw Error('must not search');}).init();assert.equal(restored.get(c.id).status,'paused');assert.equal(restored.get(c.id).jobs[0].done,false);assert.equal(restored.active,null);
});
