const test=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('../Resources/Web/widget-creation.js');
test('creation repairs using actual failure evidence before returning a preview',async()=>{
  let calls=0;
  const result=await build({prompt:'Commit tracker',generate:async({repair})=>{calls++;if(calls===2)assert.match(repair,/missing days/);return {name:'Candidate '+calls};},validate:async()=>calls===1?{ok:false,issues:[{code:'mapping',message:'missing days'}]}:{ok:true,supportedSizes:['small','medium','large'],issues:[]}});
  assert.equal(result.status,'ready');assert.equal(result.attempts,2);assert.equal(calls,2);
});
test('creation does not accept a browser link in place of a requested activity grid',async()=>{
  const result=await build({prompt:'Show green squares for commits',maxAttempts:2,generate:async()=>({connection:{mode:'browser'}}),validate:async()=>{throw Error('Should not reach validation');}});
  assert.equal(result.status,'exhausted');assert.equal(result.attempts,2);assert.match(result.validation.issues[0].message,/grid is missing/);
});
test('creation stops for credentials and reports blocked rather than ready',async()=>{
  const result=await build({prompt:'Private data',generate:async()=>({}),validate:async()=>({ok:false,blocked:true,issues:[{message:'API key needed'}]})});
  assert.equal(result.status,'blocked');assert.equal(result.attempts,1);
});
test('exhausted size repairs retain only sizes that actually passed',async()=>{
  const result=await build({prompt:'Timer',maxAttempts:3,generate:async()=>({size:'small'}),validate:async()=>({ok:false,supportedSizes:['medium','large'],sizeNotes:{small:'Controls clipped'},issues:[{code:'layout',message:'Controls clipped',size:'small'}]})});
  assert.equal(result.status,'limited');assert.deepEqual(result.validation.supportedSizes,['medium','large']);assert.equal(result.history.length,3);
});
test('cancellation interrupts a pending agent request',async()=>{
  const controller=new AbortController();const work=build({prompt:'Timer',signal:controller.signal,generate:()=>new Promise(()=>{}),validate:async()=>({ok:true})});controller.abort();
  await assert.rejects(work,/cancelled/);
});
