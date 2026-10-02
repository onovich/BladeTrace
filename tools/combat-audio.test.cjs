const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  class Audio {
    constructor(src) { this.src=src; this.paused=true; this.currentTime=0; this.events={}; }
    load() {}
    addEventListener(name, fn) { this.events[name]=fn; }
    play() { this.paused=false; return Promise.resolve(); }
    pause() { this.paused=true; }
  }
  const context=vm.createContext({window:{},document:{baseURI:'file:///D:/BladeTrace/app/index.html'},Audio,URL});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/combat-audio.js'),'utf8'),context);
  const game=fs.readFileSync(path.join(__dirname,'../app/game.js'),'utf8');
  vm.runInContext(game.slice(game.indexOf('class AudioEngine {'),game.indexOf('class ParticleSystem {'))+';this.Engine=AudioEngine;',context);
  return {context,engine:new context.Engine()};
}

test('selected files exist and file:// URLs resolve; no backup is randomly substituted',()=>{
  const {context,engine}=setup();
  for(const [id,cue] of Object.entries(context.window.BladeTraceAudioCues)){
    assert.ok(fs.existsSync(path.join(__dirname,'../app',cue.file)));
    assert.equal(engine.samples.pools.get(id)[0].src,'file:///D:/BladeTrace/app/'+cue.file);
  }
});
test('parry polyphony preserves tails, is bounded, and stop clears every voice',()=>{
  const {engine}=setup();
  engine.playDeflect(); engine.playDeflect();
  assert.equal(engine.samples.active.size,2);
  for(let i=0;i<10;i++)engine.playDeflect();
  assert.equal(engine.samples.active.size,4);
  engine.stopSamples();
  assert.equal(engine.samples.active.size,0);
  engine.samples.pools.forEach(pool=>pool.forEach(v=>assert.equal(v.paused,true)));
});
test('muted samples do not start; enabling routes attack and parry to distinct pools',()=>{
  const {engine}=setup(); engine.enabled=false;
  engine.playDeflect(); engine.playAttackStart(); engine.playBladeClash();
  assert.equal(engine.samples.active.size,0);
  engine.enabled=true;engine.playAttackStart();engine.playDeflect();
  assert.equal(engine.samples.active.size,2);
  assert.equal(engine.samples.pools.get('combat.blade-clash').every(v=>v.paused),true);
});
test('combat hooks are confined to confirmed parry and actual attack start',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../app/game.js'),'utf8');
  assert.match(s.slice(s.indexOf('  startAttack()'),s.indexOf('  handleParryInput()')),/this\.audio\.playAttackStart\(\)/);
  assert.match(s.slice(s.indexOf('  triggerParrySuccess()'),s.indexOf('  resolveAttackImpact()')),/this\.audio\.playDeflect\(\)/);
  assert.doesNotMatch(s.slice(s.indexOf('  handleParryInput()'),s.indexOf('  triggerParrySuccess()')),/this\.audio\./);
  assert.match(s.slice(s.indexOf('  triggerBladeClash()'),s.indexOf('  getBladeSettings()')),/this\.audio\.playBladeClash\(\)/);
});
