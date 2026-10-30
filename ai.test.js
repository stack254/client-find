import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from './ai.js';
test('AI sends only research fields and returns validated brief',async()=>{
 const brief={opportunity:'Possible booking site',evidence:'Listing only',verify:'Ask about existing tools',message:'Hello'};
 const result=await analyze({name:'Example',contact:'private',notes:'private'},{apiKey:'test',model:'test-model',fetcher:async(_,opts)=>{
 assert.equal(opts.headers['x-goog-api-key'],'test');assert.equal(opts.body.includes('private'),false);
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(brief)}]}}]})};
 }});assert.deepEqual(result,brief);
});
test('missing key, quota and invalid output are actionable',async()=>{
 await assert.rejects(analyze({name:'Example'},{}),/GEMINI_API_KEY/);
 await assert.rejects(analyze({name:'Example'},{apiKey:'test',model:'test-model',fetcher:async()=>({ok:false,status:429})}),/quota/);
 await assert.rejects(analyze({name:'Example'},{apiKey:'test',model:'test-model',fetcher:async()=>({ok:true,json:async()=>({})})}),/incomplete/);
});

test('automatic selection uses a listed text model and skips image models',async()=>{
 let calls=0;
 const brief={opportunity:'Idea',evidence:'Listing',verify:'Ask',message:'Hello'};
 const result=await analyze({name:'Example'},{apiKey:'test',fetcher:async(url)=>{
 calls++;
 if(calls===1) return {ok:true,json:async()=>({models:[{name:'models/gemini-9-flash-image',supportedGenerationMethods:['generateContent']},{name:'models/gemini-8-flash',supportedGenerationMethods:['generateContent']}]})};
 assert.match(url,/gemini-8-flash:generateContent$/);
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(brief)}]}}]})};
 }});
 assert.equal(calls,2);assert.deepEqual(result,brief);
});
