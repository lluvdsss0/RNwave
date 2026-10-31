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
 await call('Runtime.enable');await call('Page.navigate',{url:process.argv.includes('--cached')?'http://127.0.0.1:5182/diagnostics/cached.html':'http://127.0.0.1:5182/diagnostics/signal.html'});
 for(let i=0;i<240;i++){
  await new Promise(r=>setTimeout(r,500));const r=await call('Runtime.evaluate',{expression:'document.querySelector("#result")?.textContent',returnByValue:true});const value=r.result?.result?.value;
  if(value?.startsWith('{')){
   const report=JSON.parse(value);report.consoleErrors=errors;fs.writeFileSync("diagnostics/render-report.json",JSON.stringify(report,null,2));
   if(!report.ok)throw Error(report.error);
   for(const id of [1,2]){
    const voices=report.results.filter(r=>r.id===id&&r.sustain===5&&!r.dry);
    assert.equal(voices.length,4);
    const levels=voices.map(r=>r.rms);
    assert.ok(Math.max(...levels)/Math.min(...levels)<1.8,'Wave levels differ by more than 5 dB');
    for(const voice of voices){
     assert.ok(voice.rms>(id===1?0.02:0.007),'Voice too quiet');
     assert.ok(id===1?voice.rms>voice.rightRms*1.2:voice.rightRms>voice.rms*1.2,'Wrong stereo pan');
    }
   }
   for(const test of report.results){assert.ok(test.rms>0.001,'Silent render');assert.ok(test.peak<0.95,'Render clips');assert.ok(test.monoRms>Math.sqrt((test.rms**2+test.rightRms**2)/2)*0.65,'Mono cancellation');}
   for(const id of [1,2])for(const wave of ['pulse','square','triangle','sawtooth'])for(const dry of [false,true]){
    const levels=[1,5,10].map(s=>report.results.find(r=>r.id===id&&r.wave===wave&&r.sustain===s&&r.dry===dry).rms);
    assert.ok(levels[0]<levels[1]&&levels[1]<levels[2],'Sustain must increase the held energy');
    assert.ok(levels[2]>levels[0]*2,'Sustain range too weak');
   }
   for(const probe of report.envelopes){assert.ok(probe.attackDifference<1e-7,'Sustain alters the attack');assert.ok(probe.levels[2].rms>probe.levels[0].rms*6,'Sustain does not change the plateau');}
   for(const id of [1,2])for(const wave of ['pulse','square','triangle','sawtooth']){
    const values=name=>report.controls.filter(c=>c.id===id&&c.wave===wave&&c.name===name);
    const attack=values('attack'),release=values('release'),cutoff=values('cutoff'),sustain=values('sustain');
    assert.ok(attack[0].early>attack[1].early&&attack[1].early>attack[2].early,'Attack does not soften onset');
    assert.ok(release[2].tail>release[1].tail&&release[1].tail>release[0].tail,'Release tail does not grow');
    assert.ok(sustain[2].held>sustain[1].held&&sustain[1].held>sustain[0].held,'Sustain plateau does not grow');
    assert.ok(cutoff[1].brightness>cutoff[0].brightness*1.02&&cutoff[2].brightness>cutoff[0].brightness*1.05&&cutoff[2].brightness>=cutoff[1].brightness*.99,'Cutoff does not open spectrum');
    assert.equal(cutoff[0].frequency,cutoff[2].frequency,'Cutoff changes pitch');
    assert.ok(Math.abs(cutoff[1].cutoff**2-cutoff[0].cutoff*cutoff[2].cutoff)<cutoff[0].cutoff*cutoff[2].cutoff*1e-6,'Cutoff is not logarithmic');
    for(const c of [...attack,...release,...cutoff,...sustain])assert.ok(c.stop>c.automation.at(-1).time,'Oscillator ends before release');
   }
   // Exercise the actual React controls with native, running AudioContexts.
   const instrumentation=`
    window.audioContexts=[];window.oscillatorTypes=[];window.audioAnalysers=[];
    const Native=window.AudioContext;
    window.AudioContext=class extends Native{constructor(...args){super(...args);window.audioContexts.push(this);}
     createOscillator(){const o=super.createOscillator();const start=o.start.bind(o);o.start=(...args)=>{window.oscillatorTypes.push(o.type);return start(...args);};return o;}
     createAnalyser(){const a=super.createAnalyser();window.audioAnalysers.push(a);return a;}};
    (async()=>{const {AudioEngine}=await import('/src/audio.js');const original=AudioEngine.prototype.setParameter;
    AudioEngine.prototype.setParameter=function(...args){window.testEngine=this;return original.apply(this,args);};})()
   `;
   const pause=ms=>new Promise(r=>setTimeout(r,ms));
   const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.result?.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result?.result?.value;};
   report.ui=[];
   for(let reload=0;reload<2;reload++){
    await call('Page.navigate',{url:'http://127.0.0.1:5182/'});await pause(1200);await evaluate(instrumentation);
    for(const id of [1,2]){
     await evaluate(`document.querySelector('[aria-label="Voice ${id}"]').click()`);await pause(400);
     for(const wave of ['pulse','square','triangle','sawtooth']){
      await evaluate(`document.querySelector('.voice-panel--${id} .wave-button--${wave}').click()`);await pause(350);
      const state=await evaluate(`({selected:document.querySelector('.voice-panel--${id} .wave-button--${wave}').getAttribute('aria-pressed'),contexts:window.audioContexts.map(c=>c.state),error:document.querySelector('[role="alert"]')?.textContent,types:[...new Set(window.oscillatorTypes)],signalPeak:Math.max(...window.audioAnalysers.map(a=>{const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);return Math.max(...d.map(Math.abs));}))})`);
      if(state.selected!=='true'||!state.contexts.includes('running')||state.error)throw Error(JSON.stringify(state));
      report.ui.push({reload,id,wave,...state});
     }
    }
   }
   report.sustainUI=[];
   for(const id of [1,2])for(const value of [1,5,10]){
    // One keyboard event per render allows React to commit each discrete step.
    for(let n=0;n<10;n++){await evaluate(`document.querySelector('.voice-panel--${id} [aria-label^="Sustain"]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}))`);}
    for(let n=1;n<value;n++){await evaluate(`document.querySelector('.voice-panel--${id} [aria-label^="Sustain"]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`);}
    const knob=await evaluate(`(()=>{const f=document.querySelector('.voice-panel--${id} [aria-label^="Sustain"]');return {value:Number(f.getAttribute('aria-valuenow')),label:f.querySelector('.knob__rotor .knob__label').textContent,rotation:f.querySelector('.knob__rotor').style.transform,rhythm:!!document.querySelector('[aria-label^="Rhythm"]')};})()`);
    assert.equal(knob.value,value);assert.equal(knob.label,'Sustain');assert.equal(knob.rotation,`rotate(${22+(value-1)*35}deg)`);assert.equal(knob.rhythm,false);report.sustainUI.push({id,...knob});
   }
   assert.ok(report.ui.every(s=>s.signalPeak>0.00001),'Live output missing after a switch/reload');
   report.sliderUI=[];
   for(const id of [1,2])for(const name of ['Attack','Release','Cutoff'])for(const value of [0,.5,1]){
    await evaluate(`(()=>{const input=document.querySelector('.voice-panel--${id} input[aria-label="${name}"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${value});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await pause(name==='Cutoff'?220:30);
    const state=await evaluate(`(()=>{const e=window.testEngine;return {value:e.params[${id}].${name.toLowerCase()},settings:e.envelopeTimes(${id}),cutoff:e.buses.get(${id}).filter.frequency.value,target:e.cutoffFrequency(${id},e.params[${id}].cutoff),active:[...e.activeNotes].filter(n=>n.id===${id}).length,clock:e.schedulerId};})()`);
    assert.equal(state.value,value);if(name==='Cutoff')assert.ok(Math.abs(state.cutoff-state.target)<Math.max(1,state.target*.015),'Filter automation did not arrive');
    report.sliderUI.push({id,name,...state});
   }
   // Verify that all labels are actually visible, not merely accessible names.
   report.labels=await evaluate(`Array.from(document.querySelectorAll('.wave-button'),b=>({text:b.textContent.trim(),font:parseFloat(getComputedStyle(b).fontSize),color:getComputedStyle(b).webkitTextFillColor,selected:b.getAttribute('aria-pressed')}))`);
   assert.equal(report.labels.length,8);assert.ok(report.labels.every(b=>b.text&&b.font>0&&!b.color.includes('0, 0, 0, 0')));
   const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('diagnostics/interface.png',Buffer.from(shot.result.data,'base64'));
   await evaluate(`localStorage.setItem('rnwave.waves',JSON.stringify({1:'sine',2:'pulse'}))`);
   await call('Page.navigate',{url:'http://127.0.0.1:5182/'});await pause(800);
   report.migration=await evaluate(`({saved:JSON.parse(localStorage.getItem('rnwave.waves')),selected:Array.from(document.querySelectorAll('.wave-button[aria-pressed="true"]'),b=>b.textContent.trim())})`);
   assert.deepEqual(report.migration.saved,{1:'square',2:'pulse'});assert.deepEqual(report.migration.selected,['square','pulse']);
   await call('Page.navigate',{url:'http://127.0.0.1:5182/diagnostics/live.html'});
   for(let n=0;n<80;n++){
    await pause(250);const liveText=await evaluate(`document.querySelector('#result')?.textContent`);
    if(liveText?.startsWith('{')){report.live=JSON.parse(liveText);break;}
   }
   assert.equal(report.live?.ok,true,report.live?.error);
   for(const test of report.live.results){assert.ok(test.after>test.before*2,'Live envelope did not change');assert.ok(test.tailRms>0.001,'Live Release lost its tail');assert.ok(Math.abs(test.cutoff-test.target)<test.target*.4,'Live cutoff did not move');assert.ok(test.stop>test.timeline.at(-1).time);}
   report.consoleErrors=errors;
   fs.writeFileSync('diagnostics/report.json',JSON.stringify(report,null,2));
   if(!report.ok||errors.length)throw Error('Audio diagnostics failed');
   console.log(JSON.stringify({ok:report.ok,measurements:report.results.length,uiChecks:report.ui.length,consoleErrors:errors.length}));break;
  }
  if(i===239)throw Error('Render timed out');
 }
}finally{ws?.close();chrome.kill();await server.close();}
