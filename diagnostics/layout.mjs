import {createServer} from 'vite';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rnwave-audio-'));
const server=await createServer({server:{host:'127.0.0.1',port:5182,strictPort:true,watch:{ignored:['**/diagnostics/chrome/**']}}});await server.listen();
const log=fs.openSync(path.join(profile,'browser.log'),'w');
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-sandbox','--remote-debugging-port=9224',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore',log,log],windowsHide:true});
let ws;
try{
 let targets;for(let i=0;i<40;i++){try{targets=await(await fetch('http://127.0.0.1:9224/json')).json();break;}catch{await new Promise(r=>setTimeout(r,250));}}
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let seq=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown'||(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error'))errors.push(m.params);});
 const call=(method,params={})=>new Promise(resolve=>{const id=++seq;pending.set(id,resolve);ws.send(JSON.stringify({id,method,params}));});
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.result?.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result?.result?.value;};
 await call('Runtime.enable');await call('Page.navigate',{url:'http://127.0.0.1:5182/diagnostics/targeted.html'});
 let audio;
 for(let i=0;i<1800;i++){await pause(250);const text=await evaluate(`document.querySelector('#result')?.textContent`);if(text?.startsWith('{')){audio=JSON.parse(text);break;}}
 assert.equal(audio?.ok,true,audio?.error||"Audio diagnostics timed out");
 const report={audio,layouts:[],errors};
 await call('Page.navigate',{url:'http://127.0.0.1:5182/'});await pause(900);
 await evaluate(`(async()=>{const {AudioEngine}=await import('/src/audio.js');window.joins=[];const fn=AudioEngine.prototype.ensureTransport;AudioEngine.prototype.ensureTransport=function(){window.testEngine=this;const before={step:this.step,time:this.nextStepTime,clock:this.schedulerId};const result=fn.call(this);window.joins.push({before,after:{step:this.step,time:this.nextStepTime,clock:this.schedulerId}});return result;};})()`);
 await evaluate(`document.querySelector('[aria-label="Voice 1"]').click()`);await pause(1200);
 await evaluate(`document.querySelector('[aria-label="Voice 2"]').click()`);await pause(100);
 report.join=await evaluate(`window.joins.at(-1)`);assert.deepEqual(report.join.before,report.join.after);assert.ok(report.join.before.step>2);
 for(const [width,height] of [[1680,1024],[1280,900],[768,1024],[390,844],[320,780]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await pause(150);
  const layout=await evaluate(`(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return Array.from(document.querySelectorAll('.voice-panel'),panel=>({panel:rect(panel),
    buttons:Array.from(panel.querySelectorAll('.wave-button'),b=>({text:b.textContent.trim(),rect:rect(b),font:getComputedStyle(b).fontFamily,size:parseFloat(getComputedStyle(b).fontSize),weight:getComputedStyle(b).fontWeight,background:getComputedStyle(b).backgroundColor,selected:b.getAttribute('aria-pressed'),geometry:b.parentElement.getAttribute('transform'),textWidth:(()=>{const range=document.createRange();range.selectNodeContents(b);return range.getBoundingClientRect().width;})()})),
    sliders:Array.from(panel.querySelectorAll('.analog-slider'),s=>({label:rect(s.querySelector('.analog-slider__label')),weight:getComputedStyle(s.querySelector('.analog-slider__label')).fontWeight,size:parseFloat(getComputedStyle(s.querySelector('.analog-slider__label')).fontSize),control:rect(s.querySelector('.analog-slider__control')),track:rect(s.querySelector('input')),arrow:rect(s.querySelector('.analog-slider__thumb'))}))}));
  })()`);
  for(const panel of layout){
   assert.deepEqual(panel.buttons.map(b=>b.text),['pulse','sawtooth','square','triangle']);
   for(const b of panel.buttons){assert.ok(b.rect.left>=panel.panel.left-.5&&b.rect.right<=panel.panel.right+.5&&b.rect.top>=panel.panel.top&&b.rect.bottom<=panel.panel.bottom+.5,'Tile outside panel');assert.ok(b.font.includes('Helvetica'));assert.equal(b.background,b.selected==='true'?'rgb(9, 9, 9)':'rgb(244, 244, 244)');}
   for(const b of panel.buttons){assert.equal(b.weight,'400');assert.equal(b.size,26);assert.ok(b.textWidth<b.rect.width*.9,'Wave text does not fit');}
   for(const s of panel.sliders){assert.equal(s.weight,'700');if(width===1680)assert.ok(Math.abs(s.size-24)<.01);}
   const gaps=panel.sliders.map(s=>s.control.top-s.label.bottom);
   assert.ok(Math.min(...gaps)>1,'No label gap');assert.ok(Math.max(...gaps)-Math.min(...gaps)<.5,'Unequal label gaps');
   for(let i=1;i<panel.sliders.length;i++)assert.ok(panel.sliders[i].label.top>=panel.sliders[i-1].control.top+width*.00833-.7,'Label overlaps previous track');
  }
  report.layouts.push({width,height,panels:layout});
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(`diagnostics/layout-${width}.png`,Buffer.from(shot.result.data,'base64'));
 }
 // Click every actual tile: a responsive hit target must match its visible tile.
 for(const id of [1,2])for(const wave of ['pulse','sawtooth','square','triangle']){
  await evaluate(`document.querySelector('.voice-panel--${id} .wave-button--${wave}').click()`);
  assert.equal(await evaluate(`document.querySelector('.voice-panel--${id} .wave-button--${wave}').getAttribute('aria-pressed')`),'true');
 }
 assert.equal(errors.length,0);fs.writeFileSync('diagnostics/targeted-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({audioChecks:audio.results.length,viewports:report.layouts.length,join:report.join,errors:errors.length}));
}finally{ws?.close();chrome.kill();await server.close();}
