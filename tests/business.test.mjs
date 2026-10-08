import test from 'node:test';
import assert from 'node:assert/strict';
import {BUSINESS_GUIDES,calculateUnitEconomics} from '../public/business.mjs';
import {getReply,conversationSummary} from '../public/engine.mjs';

test('Practical commercial questions work in both languages without company pricing leakage',()=>{
  const cases=[
    ['أريد خطة عمل لمشروع جديد','Help me write a business plan','business-plan'],
    ['أريد حملة للتسويق','Help me plan a marketing campaign','marketing'],
    ['كيف أزيد المبيعات؟','How can I increase sales?','sales'],
    ['كيف أسعّر المنتج وأحسب هامش الربح؟','Explain my product pricing strategy','pricing-strategy'],
    ['كيف أنظم التدفق النقدي؟','Help with cash flow budgeting','finance'],
    ['رد على شكوى عميل غاضب','Reply to a customer complaint','customer-service'],
    ['أريد وصف منتج للمتجر الإلكتروني','Improve my online store','ecommerce'],
    ['كيف أحسن سير العمل؟','Improve operations and quality','operations'],
    ['كيف أدير المخزون والموردين؟','Help with inventory and suppliers','procurement'],
    ['أريد وصف وظيفي للتوظيف','Draft a job description for hiring','hr'],
    ['أريد استراتيجية للنمو','Help with my growth strategy','strategy'],
    ['كيف أقوم بدراسة السوق؟','How should I do market research?','research'],
    ['أريد عرض سعر لخدمة','Prepare a commercial proposal','proposal'],
    ['اكتب بريد للمتابعة','Write an email to a prospective client','email-draft'],
    ['ساعدني في التفاوض على خصم','Help me negotiate a discount','negotiation'],
  ];
  for(const [ar,en,id] of cases)for(const [question,language] of [[ar,'ar'],[en,'en']]){const r=getReply(question);assert.equal(r.language,language,question);assert.equal(r.kind,'guide',question);assert.ok(r.guideIds.includes(id),question);assert.deepEqual(r.sources,[],question);assert.doesNotMatch(r.text,/Starter: 29|Pro: 99/);}
});
test('Every topic button yields its matching guide, including normalized Arabic titles',()=>{
  for(const guide of BUSINESS_GUIDES)for(const language of ['ar','en'])assert.ok(getReply((language==='ar'?'أريد مساعدة في ':'Help me with ')+guide.title[language]).guideIds?.includes(guide.id),guide.id+' '+language);
});
test('A marketing plan is not mistaken for a subscription plan',()=>{
  const reply=getReply('I need a marketing plan for a bakery');assert.equal(reply.kind,'guide');assert.ok(reply.guideIds.includes('marketing'));assert.doesNotMatch(reply.text,/29|99|299/);
});
test('An explicit answer language takes precedence over the question script',()=>{
  assert.equal(getReply('أريد خطة تسويق بالإنجليزية').language,'en');
  assert.equal(getReply('Reply in Arabic: how can I improve sales?').language,'ar');
});
test('Conversational greetings, thanks and capabilities do not request human review',()=>{
  for(const question of ['كيف حالك؟','مرحبا، كيف حالك؟','شكراً لك','ماذا تستطيع؟','Hi, how are you?','Thank you!','What can you do?']){const r=getReply(question);assert.equal(r.kind,'greeting',question);assert.equal(r.review,false,question);}
});
test('Company facts stay grounded and unsupported customer names stay unknown',()=>{
  assert.equal(getReply('What is your pricing for marketing?').kind,'knowledge');
  assert.equal(getReply('Who are your customers?').kind,'unknown');
  assert.equal(getReply('ما أسعار برنامجكم للتسويق؟').kind,'knowledge');
});
test('Unknown current figures, law and tax rates do not trigger generation',()=>{
  for(const q of ['What is the VAT rate in UAE?','ما ضريبة القيمة المضافة؟','What are today stock prices?','ما قانون العمل؟']){const reply=getReply(q);assert.equal(reply.kind,'verification-required');assert.equal(reply.review,true);assert.deepEqual(reply.sources,[]);}
});
test('Profit, margin and markup use their correct denominators',()=>{
  const r=calculateUnitEconomics({cost:80,price:100,quantity:10,fixed:100});assert.equal(r.profit,20);assert.equal(r.margin,20);assert.equal(r.markup,25);assert.equal(r.revenue,1000);assert.equal(r.grossProfit,200);assert.equal(r.afterFixed,100);assert.equal(r.breakEven,5);
});
test('Losses, zero costs and fractional currency break-even are handled',()=>{
  const loss=calculateUnitEconomics({cost:120,price:100,fixed:20});assert.equal(loss.margin,-20);assert.equal(loss.breakEven,null);
  assert.equal(calculateUnitEconomics({cost:0,price:10}).markup,null);
  assert.equal(calculateUnitEconomics({cost:9.9,price:10,fixed:100}).breakEven,1000);
  assert.equal(calculateUnitEconomics({cost:9.9,price:10,fixed:100.01}).breakEven,1001);
});
test('Calculator rejects invalid amounts and fractional quantities',()=>{
  for(const input of [{cost:-1,price:100},{cost:80,price:0},{cost:NaN,price:10},{cost:10,price:Infinity},{cost:10,price:20,quantity:1.5},{cost:10,price:20,fixed:-1},{cost:'10',price:20}])assert.throws(()=>calculateUnitEconomics(input));
});
test('Arabic digits and valid thousands separators calculate without truncating malformed input',()=>{
  for(const q of ['التكلفة ٨٠ وسعر البيع ١٠٠','التكلفة ۸۰ وسعر البيع ۱۰۰','cost 80 selling price 100']){const r=getReply(q);assert.equal(r.kind,'calculation');assert.equal(r.calculation.profit,20);assert.equal(r.calculation.margin,20);}
  assert.equal(getReply('cost 1,000 selling price 1,250').calculation.profit,250);
  for(const q of ['cost 1,00 selling price 100','cost 80.5.2 selling price 100'])assert.notEqual(getReply(q).kind,'calculation');
});
test('Downloaded AI answers retain their model and mode, without fabricated sources',()=>{
  const text=conversationSummary([{role:'assistant',text:'A draft',mode:'local-ai',modelName:'Qwen3 0.6B',sources:[]}],'en');assert.match(text,/Mode: local-ai · Qwen3 0.6B/);assert.doesNotMatch(text,/Sources:/);
});
