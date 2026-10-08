/** v0.3: free, deterministic retrieval. No API keys, network, or generated facts. */
import {getBusinessReply} from './business.mjs';
export const VERSION = '0.4.0';
export const LIMITS = Object.freeze({question: 2000, answer: 4000, history: 80});
export const DEFAULT_KNOWLEDGE = [
  {id:'pricing', title:{ar:'الأسعار التجريبية',en:'Demo pricing'}, answers:{
    ar:'الأسعار التالية أمثلة فقط: Starter بسعر 29 دولاراً شهرياً، وPro بسعر 99 دولاراً، وBusiness بسعر 299 دولاراً. لا توجد خطط مدفوعة متاحة للشراء. تجربة الإصدار 0.3 مجانية.',
    en:'Illustrative prices only: Starter $29/month, Pro $99/month, Business $299/month. No paid plans are available to purchase. The v0.3 beta is free.'}},
  {id:'hours', title:{ar:'ساعات الدعم',en:'Support hours'}, answers:{
    ar:'لم تُحدد ساعات الدعم البشري بعد. يمكنك تجربة هذا المساعد في المتصفح، لكن ذلك لا يعني وجود فريق دعم يعمل على مدار الساعة.',
    en:'Human support hours have not been established. You can try this browser assistant, but that does not mean a human support team is available around the clock.'}},
  {id:'refund', title:{ar:'الإلغاء والاسترجاع',en:'Refunds & cancellation'}, answers:{
    ar:'لم تُعتمد شروط الاسترجاع أو الإلغاء بعد، ولا تقبل النسخة التجريبية أي مدفوعات. يجب أن يراجع ممثل بشري أي طلب متعلق بشراء أو فاتورة.',
    en:'Refund and cancellation terms are not established, and this beta does not accept payments. A human representative must review purchase or billing requests.'}},
  {id:'integration', title:{ar:'التكامل والربط',en:'Integrations'}, answers:{
    ar:'الربط بالبريد الإلكتروني وCRM والمتاجر الإلكترونية مخطط له، لكنه غير متصل حالياً. ملخص العميل مسودة قابلة للتنزيل فقط؛ لا يُرسل إلى أي جهة. المحرك المجاني لا يستخدم ChatGPT API.',
    en:'Email, CRM, and ecommerce integrations are planned but are not connected. Lead summaries are downloadable drafts only; they are not sent anywhere. The free engine does not call the ChatGPT API.'}},
  {id:'security', title:{ar:'الخصوصية والبيانات',en:'Privacy & data'}, answers:{
    ar:'تعمل المحادثة ومعلومات العميل وقاعدة المعرفة داخل هذه الصفحة، وتُمسح عند إعادة تحميلها أو إغلاقها. لا نرسل أسئلتك إلى API أو مزود ذكاء اصطناعي. عند تفعيل الذكاء المحلي فقط، ينزّل المتصفح ملفات من jsDelivr وMLC وHugging Face، وقد يحتفظ بها في ذاكرة التخزين. هذه الجهات ترى طلبات التنزيل المعتادة. تنزيل المحادثة يحفظ نسخة على جهازك. لا تدخل كلمات المرور أو معلومات الدفع.',
    en:'Chat, lead details, and knowledge edits live in this page and reset on reload or close. We do not send questions to an AI API or provider. Only when you enable local AI does the browser download runtime and model files from jsDelivr, MLC, and Hugging Face; model files may be cached on your device. Those hosts see ordinary download requests. Conversation downloads save a copy on your device. Do not enter passwords or payment details.'}},
];

const TERMS = {
  pricing:['price','prices','pricing','cost','costs','plan','plans','subscription','subscribe','how much','free','سعر','السعر','اسعار','الاسعار','تكلفه','التكلفه','اشتراك','الاشتراك','باقات','الباقات','باقه','الباقه','مجاني','مجانيه','مجانيا','كم يكلف','كم سعر'],
  hours:['hours','opening','schedule','availability','24/7','available','ساعات','الساعات','دوام','الدوام','مواعيد','المواعيد','متاح','متوفر'],
  refund:['refund','refunds','cancel','cancellation','payment','payments','billing','invoice','استرجاع','الاسترجاع','استرداد','الاسترداد','الغاء','الالغاء','دفع','الدفع','فاتوره','الفاتوره','فواتير'],
  integration:['integration','integrations','integrate','crm','shopify','email','connect','connected','chatgpt','api','ربط','الربط','تكامل','التكامل','تكاملات','التكاملات','بريد','البريد','شوبيفاي','شات جي بي تي','شاتجبت'],
  security:['security','secure','privacy','password','passwords','data','confidential','امان','الامان','خصوصيه','الخصوصيه','بيانات','البيانات','بياناتي','بياناتنا','سريه','حمايه','الحمايه','كلمات المرور','كلمه المرور'],
};
export function normalize(text) {
  return String(text).normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
}
export function cloneKnowledge() { return structuredClone(DEFAULT_KNOWLEDGE); }
export function validateKnowledge(value) {
  if (!Array.isArray(value) || value.length !== DEFAULT_KNOWLEDGE.length) throw new Error('Invalid knowledge base');
  const ids = new Set();
  for (const item of value) {
    if (!item || !Object.hasOwn(TERMS,item.id) || ids.has(item.id)) throw new Error('Invalid topic');
    ids.add(item.id);
    for (const language of ['ar','en']) {
      if (typeof item.answers?.[language] !== 'string' || !item.answers[language].trim() || item.answers[language].length > LIMITS.answer) throw new Error('Each answer must contain 1–4000 characters');
    }
  }
  return value;
}
function includesTerm(text,term) {
  const needle = normalize(term).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${needle}(?=$|[^\\p{L}\\p{N}])`,'u').test(text);
}
function greetingReply(text,language) {
  const clean = text.replace(/[.!?؟،,؛:]+$/gu,'').trim();
  if(language==='ar'){
    if(/^(?:(?:مرحبا|اهلا|السلام عليكم)[،,! ]+)?(?:كيف حالك|كيف الحال|كيفك|شخبارك)$/u.test(clean))return 'أهلاً بك! أنا جاهز لمساعدتك في أسئلتك التجارية. ما الذي تعمل عليه؟';
    if(['شكرا','شكرا لك','مشكور','يعطيك العافيه'].includes(clean))return 'على الرحب والسعة! كيف أساعدك في الخطوة التالية؟';
    if(['من انت','ماذا تستطيع','ماذا يمكنك ان تفعل','ما الذي يمكنك فعله'].includes(clean))return 'أنا مساعد Right Solution للأعمال. أقدّم إرشادات للمبيعات والتسويق والتسعير والإدارة وقوالب مراسلات، مع ذكاء محلي اختياري. لا أبحث الويب ولا أنفّذ معاملات.';
  }else{
    if(/^(?:(?:hello|hi|hey)[,! ]+)?how are you(?: doing)?$/u.test(clean))return 'Hello! I am ready to help with your business questions. What are you working on?';
    if(['thanks','thank you','thank you very much'].includes(clean))return 'You are welcome! How can I help with the next step?';
    if(['who are you','what can you do'].includes(clean))return 'I am the Right Solution business assistant. I provide sales, marketing, pricing, management guides and drafts, with optional Local AI. I do not browse the web or carry out transactions.';
  }
  if (language==='ar') {
    const help = 'كيف أساعدك؟ أستطيع مساعدتك في المبيعات والتسويق والتسعير وخطط العمل، أو معلومات البرنامج والخصوصية.';
    if (/^السلام عليكم(?: و?رحمه الله(?: و?بركاته)?)?$/u.test(clean)) return 'وعليكم السلام ورحمة الله وبركاته! '+help;
    if (['مرحبا','اهلا','اهلا وسهلا','هلا'].includes(clean)) return 'أهلاً وسهلاً! '+help;
    if (clean==='صباح الخير') return 'صباح النور! '+help;
    if (clean==='مساء الخير') return 'مساء النور! '+help;
  }
  if (language==='en' && ['hello','hi','hey','good morning','good afternoon','good evening'].includes(clean)) return 'Hello! How can I help? Ask about sales, marketing, product pricing, business plans, or application facts and privacy.';
  return null;
}
export function getReply(question, knowledge=DEFAULT_KNOWLEDGE, uiLanguage='ar', history=[]) {
  if (typeof question !== 'string' || !question.trim() || question.length > LIMITS.question) throw new Error('Question must contain 1–2000 characters');
  validateKnowledge(knowledge);
  const text = normalize(question);
  const language=/(?:\b(?:answer|reply|respond|translate)[\s\S]*\b(?:in|to) english\b|بالانجليزي|باللغه الانجليزيه)/u.test(text)?'en':/(?:\b(?:answer|reply|respond|translate)[\s\S]*\b(?:in|to) arabic\b|بالعربي|باللغه العربيه)/u.test(text)?'ar':/[\u0600-\u06ff]/u.test(question)?'ar':/[a-z]/i.test(question)?'en':uiLanguage==='en'?'en':'ar';
  if(/(?:\b(?:tax|taxes|vat|legal|laws|regulations|current|today|latest|stock price)\b|ضريبه|ضرائب|الضرائب|قانون|قوانين|القوانين|اليوم|الحالي|اخر اخبار)/u.test(text))return {language,topics:[],sources:[],review:true,followup:false,mode:'free-local',kind:'verification-required',text:language==='ar'?'هذا السؤال يحتاج بيانات حديثة أو مراجعة مختص حسب البلد. هذه النسخة لا تبحث الويب ولا تتحقق من القوانين والضرائب أو الأسعار الحالية. زوّدني بمصدر رسمي وتاريخه، أو اطلب إطاراً عاماً للتخطيط دون اعتماد رقم غير موثّق.':'This question needs current evidence or a qualified review for your jurisdiction. This beta does not browse the web or verify laws, taxes, or current prices. Provide a dated official source, or ask for a general planning framework without relying on unverified figures.'};
  const companyQuestion=/(?:\byour (?:pricing|price|plans?|refund|support|hours?|privacy|integrations?|customers?|data|fees)\b|right solution|التجربه|برنامجكم|تطبيقكم|هذا البرنامج|هذا التطبيق)/u.test(text);
  const business=companyQuestion?null:getBusinessReply(text,language);
  if(business)return {language,topics:[],sources:[],review:false,followup:false,mode:'business-guide',...business};
  let topics = Object.keys(TERMS).filter(id=>TERMS[id].some(term=>includesTerm(text,term)));
  let followup = false;
  if (!topics.length && ['tell me more','more details','explain that','what about that','وضح اكثر','اشرح اكثر','تفاصيل اكثر','ماذا عنها'].includes(text.replace(/[?.!؟،]+$/g,''))) {
    const prior = [...history].reverse().find(m=>m.role==='assistant' && m.topics?.length);
    topics = prior?.topics.filter(id=>Object.hasOwn(TERMS,id)) || [];
    followup = topics.length > 0;
  }
  const sources = topics.map(id=>knowledge.find(item=>item.id===id));
  const greeting = !sources.length ? greetingReply(text,language) : null;
  if (greeting) return {language,topics:[],sources:[],review:false,followup:false,mode:'free-local',kind:'greeting',text:greeting};
  if (!sources.length) return {language,topics:[],sources:[],review:true,followup:false,mode:'free-local',kind:'unknown',text:language==='ar'
    ? 'لا أجد معلومة موثوقة لهذا السؤال في قاعدة المعرفة. تستطيع طلب إرشادات للمبيعات أو التسويق أو خطة عمل، أو تفعيل «الذكاء المحلي» لإجابات توليدية أوسع إذا كان جهازك يدعمه. معلومات الشركة غير الموجودة تحتاج مراجعة بشرية.'
    : 'I cannot verify this from the knowledge base. Ask for a sales or marketing guide or a business plan, or enable Local AI for broader generated answers if your device supports it. Missing company facts need human review.'};
  return {language,topics,sources:sources.map(item=>({id:item.id,title:item.title[language],text:item.answers[language]})),review:false,followup,mode:'free-local',kind:'knowledge',text:sources.map(item=>item.answers[language]).join('\n\n')};
}
export function prepareLead({name,email,need}) {
  if (typeof name!=='string'||typeof email!=='string'||typeof need!=='string') throw new Error('Invalid lead');
  const clean = {name:name.trim(),email:email.trim(),need:need.trim()};
  if (!clean.name || clean.name.length>100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email) || clean.email.length>254 || !clean.need || clean.need.length>2000) throw new Error('Complete the name, a valid email, and the request');
  return clean;
}
export function leadSummary(lead,language='ar') {
  const clean=prepareLead(lead);
  return language==='ar'
    ? `Right Solution AI Cloud — مسودة العميل\n\nالاسم: ${clean.name}\nالبريد: ${clean.email}\nالطلب: ${clean.need}\n\nالحالة: مسودة محلية؛ لم تُرسل إلى البريد أو CRM.\n`
    : `Right Solution AI Cloud — Lead draft\n\nName: ${clean.name}\nEmail: ${clean.email}\nRequest: ${clean.need}\n\nStatus: local draft; not sent to email or CRM.\n`;
}
export function conversationSummary(messages,language='ar') {
  return `Right Solution AI Cloud — v${VERSION}\n${language==='ar'?'محادثة تجريبية مجانية':'Free demo conversation'}\n\n` + messages.map(m=>`${m.role==='user'?(language==='ar'?'أنت':'You'):(language==='ar'?'المساعد':'Assistant')}: ${m.text}\n${m.mode ? `Mode: ${m.mode}${m.modelName?' · '+m.modelName:''}\n` : ''}${m.sources?.length ? `Sources: ${m.sources.map(s=>s.id).join(', ')}\n` : ''}`).join('\n');
}
