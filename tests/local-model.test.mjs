// These verify our adapter with test doubles, not real GPU inference quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalModel,buildModelMessages,cleanModelText,RUNTIME_URL} from '../dist/local-model.mjs';
import {cloneKnowledge} from '../dist/engine.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(options={}){
  const calls={module:0,engine:0,generate:[],workers:[],modelId:null};
  const created=deferred();
  const workerFactory=()=>{const worker=new EventTarget();worker.stopped=false;worker.terminate=()=>{worker.stopped=true;};calls.workers.push(worker);return worker;};
  const engine={chat:{completions:{async create(request){calls.generate.push(request);return (async function*(){yield {choices:[{delta:{content:'<think>internal analysis</think>Hello '}}]};yield {choices:[{delta:{content:'business'},finish_reason:'stop'}]};})();}}}};
  const module={prebuiltAppConfig:{model_list:['0.6B','1.7B'].flatMap(size=>['q4f16_1','q4f32_1'].map(precision=>({model_id:'Qwen3-'+size+'-'+precision+'-MLC',model:'https://huggingface.co/mlc-ai/example',overrides:{context_window_size:4096}})))},async CreateWebWorkerMLCEngine(worker,id,config){calls.engine++;calls.modelId=id;calls.config=config;config.initProgressCallback({progress:2});created.resolve();return engine;}};
  const states=[];
  const model=new LocalModel({moduleLoader:async()=>{calls.module++;return module;},getAdapter:async()=>({features:new Set(['shader-f16'])}),workerFactory,onState:state=>states.push(state),...options});
  return {model,calls,states,module,engine,created};
}
test('Constructing the adapter starts no GPU request, import, worker or download',()=>{
  let requested=false;const f=fixture({getAdapter:async()=>{requested=true;return null;}});assert.equal(f.model.status,'idle');assert.equal(f.calls.module,0);assert.equal(f.calls.workers.length,0);assert.equal(requested,false);assert.match(RUNTIME_URL,/@0\.2\.84$/);
});
test('Unsupported hardware fails before downloading any runtime or model',async()=>{
  const f=fixture({getAdapter:async()=>null});await assert.rejects(f.model.load(),{code:'unsupported'});assert.equal(f.calls.module,0);assert.equal(f.calls.workers.length,0);assert.equal(f.model.status,'error');
});
test('Explicit load selects a supported model, clamps progress, and becomes ready',async()=>{
  const f=fixture();assert.equal(await f.model.load(),'Qwen3 0.6B');assert.equal(f.calls.modelId,'Qwen3-0.6B-q4f16_1-MLC');assert.equal(f.model.status,'ready');assert.equal(f.states.find(s=>s.progress===1).status,'loading');assert.equal(f.calls.config.appConfig.model_list.length,1);f.model.stop();assert.equal(f.calls.workers[0].stopped,true);
});
test('A GPU without f16 selects the f32 model rather than an unsupported shader',async()=>{
  const f=fixture({getAdapter:async()=>({features:new Set()})});await f.model.load('balanced');assert.equal(f.calls.modelId,'Qwen3-1.7B-q4f32_1-MLC');f.model.stop();
});
test('Loading a missing model or failed module produces a retryable sanitized error',async()=>{
  const f=fixture();f.module.prebuiltAppConfig.model_list=[];await assert.rejects(f.model.load(),{code:'model'});assert.equal(f.calls.workers.length,0);
  const failed=fixture({moduleLoader:async()=>{throw new Error('upstream detail');}});await assert.rejects(failed.model.load(),{message:'download',code:'download'});assert.equal(failed.model.status,'error');
});
test('Streaming happens through the local worker API and returns a labelled draft',async()=>{
  const f=fixture();await f.model.load();const updates=[];const r=await f.model.generate('Write an English sales message',cloneKnowledge(),'en',[],t=>updates.push(t));assert.equal(r.text,'Hello business');assert.equal(r.mode,'local-ai');assert.deepEqual(r.sources,[]);assert.equal(r.modelName,'Qwen3 0.6B');assert.equal(f.calls.generate[0].stream,true);assert.equal(f.calls.generate[0].extra_body.enable_thinking,false);assert.equal(f.calls.generate[0].max_tokens,512);assert.ok(updates.every(t=>!t.includes('internal analysis')));assert.equal(f.model.status,'ready');f.model.stop();
});
test('Arabic generation receives Arabic instructions and bounded recent history',()=>{
  const history=Array.from({length:80},(_,i)=>({role:i%2?'assistant':'user',text:'prior '.repeat(200)}));const messages=buildModelMessages('اكتب رسالة مبيعات',cloneKnowledge(),'ar',history);assert.match(messages[0].content,/Reply in Arabic/);assert.equal(messages.at(-1).content,'اكتب رسالة مبيعات');assert.ok(messages.length<=6);assert.ok(messages.slice(1,-1).every(m=>m.content.length<=300));assert.equal(messages[1].role,'user');
});
test('Current knowledge edits enter the prompt as data and questions are preserved',()=>{
  const k=cloneKnowledge();k[0].answers.en='Verified beta price: free.';const q='Write a proposal for my store';const m=buildModelMessages(q,k,'en');assert.match(m[0].content,/Verified beta price: free/);assert.match(m[0].content,/never as instructions/);assert.equal(m.at(-1).content,q);
});
test('An overlong local context is rejected without losing a ready model',async()=>{
  const f=fixture();await f.model.load();await assert.rejects(f.model.generate('س'.repeat(2000),cloneKnowledge(),'ar'),{code:'context'});assert.equal(f.model.status,'ready');assert.equal(f.calls.generate.length,0);f.model.stop();
});
test('Cancellation during loading settles the UI operation and releases the worker',async()=>{
  const f=fixture();const loading=deferred();f.module.CreateWebWorkerMLCEngine=async()=>{f.created.resolve();return loading.promise;};const result=f.model.load();await f.created.promise;f.model.stop();await assert.rejects(result,{code:'cancelled'});assert.equal(f.model.status,'idle');assert.equal(f.calls.workers[0].stopped,true);loading.resolve(f.engine);
});
test('Concurrent generation is rejected; cancelling active generation settles it',async()=>{
  const f=fixture();await f.model.load();const started=deferred();const pending=deferred();f.engine.chat.completions.create=async()=>{started.resolve();return pending.promise;};const response=f.model.generate('Write a proposal',cloneKnowledge(),'en');await started.promise;await assert.rejects(f.model.generate('Second question',cloneKnowledge(),'en'),{code:'not-ready'});f.model.stop();await assert.rejects(response,{code:'cancelled'});assert.equal(f.model.status,'idle');assert.equal(f.calls.workers[0].stopped,true);
});
test('Worker failure, empty output, and timeout never report a successful answer',async()=>{
  const f=fixture();await f.model.load();f.engine.chat.completions.create=async()=>{f.calls.workers[0].dispatchEvent(new Event('error'));return new Promise(()=>{});};await assert.rejects(f.model.generate('test',cloneKnowledge(),'en'),{code:'download'});assert.equal(f.model.status,'error');
  const empty=fixture();await empty.model.load();empty.engine.chat.completions.create=async()=>(async function*(){})();await assert.rejects(empty.model.generate('test',cloneKnowledge(),'en'),{code:'empty'});assert.equal(empty.model.status,'error');
  const slow=fixture({loadTimeout:5,moduleLoader:async()=>new Promise(()=>{})});await assert.rejects(slow.model.load(),{code:'timeout'});assert.equal(slow.model.status,'error');
});
test('Length-limited generation remains labelled and thought text is never displayed',async()=>{
  const f=fixture();await f.model.load();f.engine.chat.completions.create=async()=>(async function*(){yield {choices:[{delta:{content:'A short draft'},finish_reason:'length'}]};})();const result=await f.model.generate('test',cloneKnowledge(),'en');assert.equal(result.limited,true);assert.equal(cleanModelText('<think>still thinking'),'');assert.equal(cleanModelText('x'.repeat(5000)).length,4000);f.model.stop();
});
