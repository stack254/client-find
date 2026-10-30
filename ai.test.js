import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from './ai.js';
test('AI sends only research fields and returns validated brief',async()=>{
 const brief={opportunity:'Possible booking site',evidence:'Listing only',verify:'Ask about existing tools',message:'Hello'};
 const result=await analyze({name:'Example',contact:'private',notes:'private'},{apiKey:'test',fetcher:async(_,opts)=>{
 assert.equal(opts.headers['x-goog-api-key'],'test');assert.equal(opts.body.includes('private'),false);
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(brief)}]}}]})};
 }});assert.deepEqual(result,brief);
});
test('missing key, quota and invalid output are actionable',async()=>{
 await assert.rejects(analyze({name:'Example'},{}),/GEMINI_API_KEY/);
 await assert.rejects(analyze({name:'Example'},{apiKey:'test',fetcher:async()=>({ok:false,status:429})}),/quota/);
 await assert.rejects(analyze({name:'Example'},{apiKey:'test',fetcher:async()=>({ok:true,json:async()=>({})})}),/incomplete/);
});
