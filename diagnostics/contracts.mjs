import assert from 'node:assert/strict';
import {AudioEngine,FIXED_TEMPO,PHRASE_STEPS,drumPatterns} from '../src/audio.js';
function score(pattern,id){const e=new AudioEngine(),notes=[];e.context={currentTime:0};e.enabledVoices.add(id);e.pendingPatterns[id]=pattern;e.playNote=(...n)=>notes.push(n);const timer=setTimeout;globalThis.setTimeout=()=>0;try{for(let s=0;s<PHRASE_STEPS;s++)e.scheduleStep(s,s*e.stepDuration());}finally{globalThis.setTimeout=timer;}return {e,notes};}
assert.equal(FIXED_TEMPO,112);assert.equal(PHRASE_STEPS,128);
const harmony=[[4,7,11],[0,4,7],[7,11,2],[2,6,9]];
const pitch=f=>Math.round(69+12*Math.log2(f/440))%12;
for(let p=1;p<=10;p++)for(const id of [1,2]){
 const {e,notes}=score(p,id);const groups=new Map();
 for(const n of notes){const bar=Math.floor(n[3]/(16*e.stepDuration()));assert.ok(bar>=0&&bar<8);assert.ok(harmony[bar%4].includes(pitch(n[1])),'Outside current chord');assert.ok(n[4]>0&&n[4]<=2.5*e.stepDuration());const g=groups.get(n[3])||[];g.push(n[1]);groups.set(n[3],g);}
 assert.equal(groups.size,id===1?49:28);
 if(id===2){assert.ok([...groups.values()].some(g=>g.length===3),'No triads');assert.ok(notes.at(-1)[3]+notes.at(-1)[4]+e.envelopeTimes(2).release<126*e.stepDuration(),'Upper voice obscures final bass pickup');}
 const first=notes.filter(n=>n[3]<64*e.stepDuration()),second=notes.filter(n=>n[3]>=64*e.stepDuration());const shape=(n,offset)=>[Number(n[1].toFixed(6)),Number(n[2].toFixed(6)),Number((n[3]/e.stepDuration()-offset).toFixed(6)),Number((n[4]/e.stepDuration()).toFixed(6))];assert.notDeepEqual(first.map(n=>shape(n,0)),second.map(n=>shape(n,64)),'No second-pass development');
}
for(let bp=1;bp<=10;bp++)for(let up=1;up<=10;up++){
 const {e,notes:bass}=score(bp,1),upper=score(up,2);
 for(const a of bass)for(const b of upper.notes){if(a[3]+a[4]+e.envelopeTimes(1).release<=b[3]||b[3]+b[4]+e.envelopeTimes(2).release<=a[3])continue;assert.ok(![1,6,11].includes((pitch(a[1])-pitch(b[1])+12)%12),'Clashing simultaneous interval');}
}
for(const pattern of drumPatterns){assert.ok(pattern.some(s=>s>=64),'Silent second drum pass');assert.ok(pattern.every(s=>s>=0&&s<PHRASE_STEPS));}
const {e}=score(1,1);e.context.currentTime=PHRASE_STEPS*e.stepDuration();e.nextStepTime=(PHRASE_STEPS-1)*e.stepDuration();e.step=PHRASE_STEPS-1;const timer=setTimeout;globalThis.setTimeout=()=>0;try{e.scheduleAhead();}finally{globalThis.setTimeout=timer;}assert.equal(e.step,1);
e.schedulerId=1;e.ready=async()=>e.context;const before={step:e.step,time:e.nextStepTime};await e.enableVoice(2);assert.deepEqual({step:e.step,time:e.nextStepTime},before);
e.setWave(1,'sine');assert.equal(e.waves[1],'square');for(const id of [1,2]){assert.ok(e.envelopeTimes(id).attack>0);for(let drive=1;drive<=10;drive++)assert.ok(e.driveMix(drive,id).dry>=.62);}
console.log('8 bars / 128 steps, Em-C-G-D x2; 49 bass hits, 28 upper gestures, triads, development, all 100 Pattern pairs, drums and cycle join: passed.');
