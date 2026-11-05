import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {initial} from '../app/model.ts';
const migrationDir=new URL('../drizzle/',import.meta.url);
const schemaSql=(await Promise.all((await readdir(migrationDir)).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile(new URL(n,migrationDir),'utf8')))).join('\n');
let sqlite,owner='owner-one';const environment={DB:null};
class D1Statement {
 constructor(sql,values=[]){this.sql=sql;this.values=values;}
 bind(...values){return new D1Statement(this.sql,values);}
 async run(){const r=sqlite.prepare(this.sql).run(...this.values);return {meta:{changes:Number(r.changes)}};}
 async first(){return sqlite.prepare(this.sql).get(...this.values)||null;}
 async all(){return {results:sqlite.prepare(this.sql).all(...this.values)};}
}
globalThis.__ascendTest={env:environment,user:()=>owner?{userId:owner}:null};
let source=await readFile(new URL('../app/api/workspace/route.ts',import.meta.url),'utf8');
source=source.replace('import { env } from "cloudflare:workers";','const env=globalThis.__ascendTest.env;').replace('import { getChatGPTUser } from "../../chatgpt-auth";','const getChatGPTUser=async()=>globalThis.__ascendTest.user();').replace('"../../model"',JSON.stringify(new URL('../app/model.ts',import.meta.url).href));
const module=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'strip'})).toString('base64'));
beforeEach(()=>{sqlite?.close();sqlite=new DatabaseSync(':memory:');owner='owner-one';sqlite.exec(schemaSql);environment.DB={prepare:sql=>new D1Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const r=await Promise.all(statements.map(s=>s.run()));sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};});
async function post(body,workspace='main'){const r=await module.POST(new Request(`http://localhost/api/workspace?workspace=${workspace}`,{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://localhost'},body:JSON.stringify(body)}));return {status:r.status,...await r.json()};}
async function state(workspace='main'){const r=await module.GET(new Request(`http://localhost/api/workspace?workspace=${workspace}`));return {status:r.status,...await r.json()};}
async function create(kind,data={},workspace='main'){const r=await post({action:'save',kind,data:{...initial(kind),...data}},workspace);assert.equal(r.status,200,r.error);return r.row;}
test('API requires identity and isolates owner/workspace records',async()=>{await create('contact',{name:'Private contact'});assert.equal((await state('other')).rows.length,0);owner='owner-two';assert.equal((await state()).rows.length,0);owner=null;assert.equal((await state()).status,401);});
test('stale updates are rejected rather than overwriting',async()=>{const c=await create('contact',{name:'Original'});assert.equal((await post({action:'save',kind:'contact',id:c.id,revision:c.revision,data:{...c,name:'First edit'}})).status,200);const stale=await post({action:'save',kind:'contact',id:c.id,revision:c.revision,data:{...c,name:'Stale edit'}});assert.equal(stale.status,400);assert.match(stale.error,/changed/);assert.equal((await state()).rows.find(r=>r.id===c.id).name,'First edit');});
test('email deduplication is case insensitive',async()=>{await create('contact',{name:'Ada',email:'Ada@example.com'});const r=await post({action:'save',kind:'contact',data:{...initial('contact'),name:'Duplicate',email:'ada@example.com'}});assert.equal(r.status,400);assert.match(r.error,/already exists/);});
test('foreign references cannot cross workspaces',async()=>{const c=await create('contact',{name:'Private'});const r=await post({action:'save',kind:'task',data:{...initial('task'),name:'Task',contactId:c.id}},'other');assert.equal(r.status,400);});
test('form creates contact, submission and published workflow effects',async()=>{await create('workflow',{name:'Welcome',trigger:'Form submitted',status:'Published',steps:[{type:'Add tag',value:'Qualified'},{type:'Create task',value:'Call the lead'},{type:'Add note',value:'Captured through form'}]});const f=await create('form',{name:'Lead form'});const r=await post({action:'formSubmit',id:f.id,values:{Name:'Ada Lovelace',Email:'ada@example.com'}});assert.equal(r.status,200,r.error);const s=await state(),c=s.rows.find(r=>r.kind==='contact');assert.equal(c.name,'Ada Lovelace');assert.equal(c.tags,'Qualified');assert.equal(s.rows.filter(r=>r.kind==='submission').length,1);assert.equal(s.rows.filter(r=>r.kind==='task').length,1);assert.equal(s.rows.filter(r=>r.kind==='note').length,1);assert.equal(s.rows.find(r=>r.kind==='run').status,'Completed');});
test('workflow waits are persisted and never deliver disconnected actions',async()=>{const c=await create('contact',{name:'Test'});const w=await create('workflow',{name:'Wait then send',steps:[{type:'Wait',value:30},{type:'Send email',value:'Hello'}]});const result=await post({action:'enroll',id:w.id,contactId:c.id});assert.equal(result.status,200);const run=(await state()).rows.find(r=>r.kind==='run');assert.equal(run.status,'Waiting');assert.equal(run.cursor,1);assert.ok(Date.parse(run.due)>Date.now());await post({action:'tick'});assert.equal((await state()).rows.find(r=>r.id===run.id).cursor,1);sqlite.prepare("UPDATE records SET data=json_set(data,'$.due',?) WHERE id=?").run('2000-01-01T00:00:00Z',run.id);await post({action:'tick'});const resumed=(await state()).rows.find(r=>r.id===run.id);assert.equal(resumed.status,'Blocked');assert.match(resumed.logs.at(-1).detail,/nothing sent/);});
test('booking capacity rejects overlapping reservations atomically',async()=>{const c=await create('contact',{name:'Booker'});const cal=await create('calendar',{name:'Call',timezone:'UTC',weekdays:'0,1,2,3,4,5,6'});const data={...initial('appointment'),name:'Discovery',contactId:c.id,calendarId:cal.id,start:'2026-11-02T10:00:00Z',end:'2026-11-02T10:30:00Z'};const results=await Promise.all([post({action:'save',kind:'appointment',data}),post({action:'save',kind:'appointment',data})]);assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===400).length,1);const a=(await state()).rows.find(r=>r.kind==='appointment');await post({action:'save',kind:'appointment',id:a.id,revision:a.revision,data:{...a,status:'Cancelled'}});assert.equal((await post({action:'save',kind:'appointment',data})).status,200);});
test('invoice roundtrip preserves calculated total and validates customer',async()=>{const c=await create('contact',{name:'Customer'});const invoice=await create('invoice',{name:'INV-1',contactId:c.id,due:'2026-11-03',items:[{name:'Service',quantity:2,price:10}],discount:2});assert.equal(invoice.total,18);assert.equal(invoice.status,'Draft');});
test('published website snapshot does not change with subsequent draft edits',async()=>{const site=await create('site',{name:'Site'});const pub=await post({action:'publishSite',id:site.id});assert.equal(pub.row.publishedBlocks[0].title,'A better way to grow.');const edit=await post({action:'save',kind:'site',id:site.id,revision:pub.row.revision,data:{...pub.row,blocks:[{type:'Hero',title:'Unsaved to live',body:''}]}});assert.equal(edit.row.publishedBlocks[0].title,'A better way to grow.');assert.equal(edit.row.blocks[0].title,'Unsaved to live');});
test('snapshots exclude private customer data and imports reset workflows',async()=>{await create('contact',{name:'PRIVATE CUSTOMER'});await create('workflow',{name:'Published workflow',status:'Published',steps:[]});const r=await post({action:'snapshot'});assert.equal(r.snapshot.records.some(r=>r.kind==='contact'),false);const imported=await post({action:'importSnapshot',snapshot:r.snapshot},'destination');assert.equal(imported.status,200,imported.error);assert.equal((await state('destination')).rows[0].status,'Draft');});
test('contact imports report per-row errors and preserve successful rows',async()=>{const r=await post({action:'importContacts',contacts:[{name:'Valid',email:'valid@example.com'},{name:'Bad',email:'not-email'},{name:'Duplicate',email:'VALID@example.com'}]});assert.equal(r.results.filter(r=>r.status==='Created').length,1);assert.equal(r.results.filter(r=>r.status==='Failed').length,2);});
test('cross-origin mutations are rejected',async()=>{const r=await module.POST(new Request('http://localhost/api/workspace',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.test'},body:'{}'}));assert.equal(r.status,403);});
test('manual payments reconcile partial balances and reject overpayment',async()=>{const c=await create('contact',{name:'Customer'});const i=await create('invoice',{name:'INV',contactId:c.id,due:'2026-11-03',items:[{name:'Work',quantity:1,price:100}]});await create('payment',{name:'Deposit',invoiceId:i.id,amount:40,method:'Cash'});let invoice=(await state()).rows.find(r=>r.id===i.id);assert.equal(invoice.status,'Partially paid');assert.equal(invoice.balance,60);const over=await post({action:'save',kind:'payment',data:{name:'Too much',invoiceId:i.id,amount:61,method:'Cash'}});assert.equal(over.status,400);await create('payment',{name:'Balance',invoiceId:i.id,amount:60,method:'Cash'});invoice=(await state()).rows.find(r=>r.id===i.id);assert.equal(invoice.status,'Paid');assert.equal(invoice.balance,0);const edited=await post({action:'save',kind:'invoice',id:i.id,revision:i.revision,data:{...i,name:'Changed'}});assert.equal(edited.status,400);});
test('ledger entries and invoices with payments cannot be deleted',async()=>{const c=await create('contact',{name:'Customer'});const i=await create('invoice',{name:'INV',contactId:c.id,due:'2026-11-03',items:[{name:'Work',quantity:1,price:10}]});const p=await create('payment',{name:'Receipt',invoiceId:i.id,amount:5,method:'Cash'});assert.equal((await post({action:'delete',id:p.id,revision:p.revision})).status,400);assert.equal((await post({action:'delete',id:i.id,revision:i.revision})).status,400);});
test('uploads download as private attachments',async()=>{const objects=new Map();environment.BUCKET={put:async(key,stream)=>objects.set(key,await new Response(stream).arrayBuffer()),get:async key=>objects.has(key)?{body:objects.get(key)}:null};const f=new FormData();f.append('file',new File(['hello world'],'sample.txt',{type:'text/plain'}));const response=await module.POST(new Request('http://localhost/api/workspace',{method:'POST',headers:{Origin:'http://localhost'},body:f}));assert.equal(response.status,200);const {id}=await response.json();const file=await module.GET(new Request(`http://localhost/api/workspace?file=${id}`));assert.equal(await file.text(),'hello world');assert.match(file.headers.get('Content-Disposition'),/^attachment/);assert.equal(file.headers.get('X-Content-Type-Options'),'nosniff');owner='another-owner';assert.equal((await module.GET(new Request(`http://localhost/api/workspace?file=${id}`))).status,404);});

test("concurrent contact creation enforces database uniqueness",async()=>{const body={action:"save",kind:"contact",data:{...initial("contact"),name:"Concurrent",email:"same@example.com"}};const results=await Promise.all([post(body),post(body)]);assert.equal(results.filter(r=>r.status===200).length,1);assert.equal((await state()).rows.filter(r=>r.kind==="contact").length,1);});
test("concurrent enrollment respects re-entry policy",async()=>{const c=await create("contact",{name:"Test"});const w=await create("workflow",{name:"Once",steps:[{type:"Create task",value:"One task"}]});const results=await Promise.all([post({action:"enroll",id:w.id,contactId:c.id}),post({action:"enroll",id:w.id,contactId:c.id})]);assert.equal(results.filter(r=>r.status===200).length,1);assert.equal((await state()).rows.filter(r=>r.kind==="task").length,1);});

test('appointment updates cannot overwrite a contact', async () => {
  const contact = await create('contact', { name: 'Keep this contact' });
  const calendar = await create('calendar', { name: 'Call', timezone: 'UTC', weekdays: '0,1,2,3,4,5,6' });
  const result = await post({
    action: 'save', kind: 'appointment', id: contact.id, revision: contact.revision,
    data: { ...initial('appointment'), name: 'Call', contactId: contact.id, calendarId: calendar.id,
      start: '2026-11-02T10:00:00Z', end: '2026-11-02T10:30:00Z' },
  });
  assert.equal(result.status, 400);
  assert.equal((await state()).rows.find(row => row.id === contact.id).name, 'Keep this contact');
});

test('draft website writes cannot forge or change the published release', async () => {
  const site = await create('site', { name: 'Original', publishedBlocks: [{ type: 'Hero', title: 'Forged' }], publishedAt: '2000-01-01' });
  assert.equal(site.publishedBlocks, undefined);
  const published = (await post({ action: 'publishSite', id: site.id })).row;
  const edited = await post({ action: 'save', kind: 'site', id: site.id, revision: published.revision,
    data: { ...published, name: 'Draft name', publishedBlocks: [], publishedAt: null, publishedName: 'Changed' } });
  assert.equal(edited.status, 200, edited.error);
  assert.deepEqual(edited.row.publishedBlocks, published.publishedBlocks);
  assert.equal(edited.row.publishedAt, published.publishedAt);
  assert.equal(edited.row.publishedName, 'Original');
});

test('old payment and dependent records remain authoritative beyond the list window', async () => {
  const contact = await create('contact', { name: 'Customer' });
  const invoice = await create('invoice', { name: 'Invoice', contactId: contact.id, due: '2026-11-03', items: [{ name: 'Work', quantity: 1, price: 10 }] });
  const payment = await create('payment', { name: 'Receipt', invoiceId: invoice.id, amount: 5, method: 'Cash' });
  sqlite.prepare("UPDATE records SET updated='2000-01-01' WHERE id=?").run(payment.id);
  sqlite.exec(`WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM seq WHERE i<1998)
    INSERT INTO records(id,owner,workspace,kind,data,revision,created,updated)
    SELECT 'older-'||i,'owner-one','main','note','{"name":"Other"}',1,'2001-01-01','2001-01-01' FROM seq`);
  const rows = (await state()).rows;
  assert.equal(rows.some(row => row.id === payment.id), false);
  assert.equal(rows.find(row => row.id === invoice.id).balance, 5);
  assert.equal((await post({ action: 'delete', id: invoice.id, revision: invoice.revision })).status, 400);
});

test('a published website protects its linked form after draft changes', async () => {
  const form = await create('form', { name: 'Lead form' });
  const site = await create('site', { name: 'Site', blocks: [{ type: 'Form', title: 'Get in touch', formId: form.id }] });
  const published = (await post({ action: 'publishSite', id: site.id })).row;
  await post({ action: 'save', kind: 'site', id: site.id, revision: published.revision, data: { ...published, blocks: [] } });
  const result = await post({ action: 'delete', id: form.id, revision: form.revision });
  assert.equal(result.status, 400);
  assert.match(result.error, /Referenced by Site/);
});

test('concurrent form submissions match a single contact', async () => {
  const form = await create('form', { name: 'Lead form' });
  const body = { action: 'formSubmit', id: form.id, values: { Name: 'Lead', Email: 'same@example.com' } };
  const results = await Promise.all([post(body), post(body)]);
  assert.deepEqual(results.map(result => result.status), [200, 200]);
  assert.equal(results[0].contactId, results[1].contactId);
});

test('saved quizzes grade and retain responses and surveys retain ungraded responses', async () => {
  const quiz = await create('quiz', {name:'Knowledge check', questions:'Capital?\nTwo plus two?', answerKey:'Paris\n4', passScore:50});
  const attempt = await post({action:'submitAssessment',id:quiz.id,revision:quiz.revision,answers:[' paris ','5']});
  assert.equal(attempt.status,200,attempt.error);
  assert.equal(attempt.score,50);
  assert.equal(attempt.passed,true);
  assert.equal((await post({action:'submitAssessment',id:quiz.id,revision:0,answers:['Paris','4']})).status,400);
  const survey = await create('survey',{name:'Feedback',questions:'What worked?'});
  const response = await post({action:'submitAssessment',id:survey.id,revision:survey.revision,answers:['Booking']});
  assert.equal(response.status,200,response.error);
  assert.equal(response.score,null);
  const records = (await state()).rows.filter(row=>row.kind==='assessmentResponse');
  assert.equal(records.length,2);
  assert.deepEqual(records.find(row=>row.id===response.id).responses,[{question:'What worked?',answer:'Booking'}]);
});

test('imported website snapshots have no active release', async () => {
  const site = await create('site', {name:'Site'});
  await post({action:'publishSite',id:site.id});
  const {snapshot}=await post({action:'snapshot'});
  assert.equal((await post({action:'importSnapshot',snapshot},'destination')).status,200);
  const imported=(await state('destination')).rows[0];
  assert.equal(imported.status,'Draft');
  assert.equal(imported.publishedAt,undefined);
  const updated=await post({action:'save',kind:'site',id:imported.id,revision:imported.revision,data:imported},'destination');
  assert.equal(updated.row.status,'Draft');
  assert.equal(updated.row.publishedBlocks,undefined);
});
