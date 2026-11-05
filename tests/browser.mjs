import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.ASCEND_TEST_URL||'http://127.0.0.1:5173';
const qaName='Browser QA Contact '+Date.now(),qaEmail='qa-'+Date.now()+'@example.com';
const dir=path.resolve('work/qa');await mkdir(dir,{recursive:true});
const profile=path.resolve('.sites-runtime/qa-chrome-'+Date.now());
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let socket;
try{
 let targets;for(let i=0;i<30;i++){try{const port=Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);targets=await fetch('http://127.0.0.1:'+port+'/json').then(r=>r.json());break;}catch{await delay(500);}}
 assert.ok(targets?.length,'Chrome debugging endpoint did not start');socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let id=0;const pending=new Map(),errors=[];socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(Error(m.error.message)):p?.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''));};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));setTimeout(()=>{if(pending.has(n)){pending.delete(n);reject(Error('CDP timeout: '+method));}},120000).unref();});
 async function js(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
 async function until(expression,timeout=30000){for(let t=0;t<timeout;t+=300){if(await js(expression))return;await delay(300);}throw Error('Timed out: '+expression);}
 async function click(text,scope='document'){await js(`(()=>{const b=[...${scope}.querySelectorAll('button')].find(b=>(b.textContent.trim()===${JSON.stringify(text)}||b.querySelector('span')?.textContent.trim()===${JSON.stringify(text)}));if(!b)throw Error('Button missing: '+${JSON.stringify(text)});b.click();})()`);await delay(350);}
 async function capture(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(dir,name+'.png'),Buffer.from(r.data,'base64'));}
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:base+'/signin-with-chatgpt?return_to=/'});await until(`document.querySelector('.app-shell')&& !document.querySelector('.loading')`,180000).catch(async e=>{console.log(await js('JSON.stringify({url:location.href,body:document.body.innerText.slice(0,5000)})'));console.log(JSON.stringify(errors));await capture('failure');throw e;});
 console.log("Authenticated app rendered");
 const before=await js(`fetch('/api/workspace?workspace=main').then(r=>r.json())`);if(!before.rows.length){await click('Explore with demo data');await until(`document.body?.textContent.includes('Olivia Bennett')`);}
 await capture('dashboard-desktop');
 const pages=['Contacts','Opportunities','Calendars','Conversations','Payments','AI Studio','AI Agents','Marketing','Automation','Sites','Memberships','Media Storage','Reputation','Reporting','App Marketplace','Settings'];
 const report=[];for(const page of pages){await click(page,`document.querySelector('.sidebar')`);await until(`document.querySelector('.breadcrumb strong')?.textContent===${JSON.stringify(page)}`);assert.ok(await js(`!document.body?.textContent.includes('Application error')`));report.push({page,status:'rendered'});console.log('Rendered '+page);if(['Contacts','Opportunities','Automation','Sites'].includes(page))await capture(page.toLowerCase());}
 await click('Contacts',`document.querySelector('.sidebar')`);await click('New contact');await until(`!!document.querySelector('[role="dialog"]')`);
 await js(`(()=>{const fields=[...document.querySelectorAll('[role="dialog"] .field')];for(const [label,value]of [['Name',${JSON.stringify(qaName)}],['Email',${JSON.stringify(qaEmail)}]]){const f=fields.find(f=>f.querySelector('span')?.textContent.trim().replace(' *','')===label);const input=f?.querySelector('input');if(!input)throw Error('Field missing '+label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
 await click('Save changes');await until(`document.body?.textContent.includes('Changes saved')`);await click('Close',`document.querySelector('[role="dialog"]')`);await send('Page.reload');await until(`document.body?.textContent.includes(${JSON.stringify(qaName)})`);report.push({test:'contact create and full reload',status:'passed'});
 await click('Dashboard',`document.querySelector('.sidebar')`);await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(500);assert.ok(await js(`document.documentElement.scrollWidth<=window.innerWidth+1`),'Mobile horizontal overflow');await capture('dashboard-mobile');
 assert.equal(errors.length,0,errors.join('\n'));await writeFile(path.join(dir,'browser-results.json'),JSON.stringify({at:new Date().toISOString(),checks:report,errors},null,2));console.log(JSON.stringify({checks:report.length,screenshots:dir,errors}));
}finally{socket?.close();browser.kill();}

// Successful assertions are complete; do not retain CDP transport handles.
process.exit(0);
