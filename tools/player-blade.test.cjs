'use strict';
const test=require('node:test'), assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const blade=require('../app/player-blade.js'),validation=require('../app/pattern-validation.js'),data=require('../app/attack-patterns.js');
let now=0;
const sandbox={window:{BladeTracePlayerBlade:blade,BladeTracePatternValidation:validation,BladeTraceAttackPatterns:data,addEventListener(){}},performance:{now:()=>now},console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../app/game.js'),'utf8')+'\nthis.Engine=GameEngine;',sandbox);
const center=data.PLAYER_POSITION;
function line(duration=1000,end=center){return {...Object.values(data.ATTACK_PATTERNS)[0],segments:[{label:'line',p0:{x:300,y:70},p1:{x:300,y:70+500/3},p2:{x:300,y:70+1000/3},p3:{...end},durationMs:duration,easing:'linear'}]};}
function engine(pattern=line()) {
  const e=Object.create(sandbox.Engine.prototype);
  Object.assign(e,{currentPattern:pattern,playerBlade:new blade.Action(),state:'ATTACKING',startTime:0,elapsedMs:0,totalDurationMs:pattern.segments.reduce((n,s)=>n+s.durationMs,0),cursorPos:{...pattern.segments[0].p0},cursorTrail:[],currentSegmentIndex:0,playerHp:100,enemyPosture:0,screenShake:0,isEditorMode:false,pendingPhaseIndex:null});
  e.calls=[];e.audio={playDeflect:()=>e.calls.push('parry'),playBladeClash:()=>e.calls.push('clash'),playHit:()=>e.calls.push('hit')};
  e.particles={spawnSparks(){}};
  for(const name of ['updateHud','updateControls','updateWindowIndicator','setStatus','showFeedback','clearAutoStart','scheduleAutoStart','applyCombatPhaseFromPosture'])e[name]=()=>{};
  e.getCombatPostureGain=()=>25;e.getCombatPhaseIndex=()=>0;e.getPhasePracticePhase=()=>null;e.getCombatPhase=()=>({name:'test'});
  return e;
}
function swing(e,time){now=time;e.handleParryInput();}
test('legacy milliseconds ignored, defaults and hurtbox constraint',()=>{
  assert.deepEqual(blade.config({parryWindowMs:999999},25),{reach:180,outSpeed:900,returnSpeed:600,parryRadius:70});
  assert.equal(blade.config({parryRadius:20},100).parryRadius,110);
  const p=line();p.parryWindowMs=-Infinity;assert.equal(validation.validateAttackPattern(p).isValid,true);
});
test('arc length, visible miss connector and frozen path',()=>{
  const p=line(1000,{x:350,y:570}),path=blade.path(p,center);
  assert.equal(path.points[1].distance,50);assert.equal(blade.at(path,25).x,325);
  const before=blade.at(path,180);p.segments[0].p3.x=500;assert.deepEqual(blade.at(path,180),before);
  assert.ok(Math.abs(blade.path(line(),center).length-500)<1e-6);
});
test('independent speeds, no refreshed or queued swings, hollow return',()=>{
  const action=new blade.Action(),path=blade.path(line(),center),settings=blade.config({});
  action.start(path,settings,0);assert.equal(action.start(path,settings,100),false);
  action.advance(200);assert.equal(action.state,'return');assert.equal(action.distance,180);
  action.advance(350);assert.equal(action.distance,90);assert.equal(action.start(path,settings,350),false);
  action.advance(500);assert.equal(action.state,'idle');assert.equal(action.distance,0);
});
test('swept equal-size blades detect crossing without endpoint overlap',()=>{
  assert.equal(blade.sweep({x:0,y:0},{x:100,y:0},{x:100,y:0},{x:0,y:0}),0.42);
  assert.equal(blade.sweep({x:0,y:20},{x:100,y:20},{x:100,y:0},{x:0,y:0}),null);
});
test('inside circle parry gains posture once and exclusively plays selected parry',()=>{
  const e=engine();swing(e,850);e.advanceAttack(1100,true);
  assert.deepEqual(e.calls,['parry']);assert.equal(e.playerHp,100);assert.equal(e.enemyPosture,25);
  assert.equal(e.state,'PARRY_BOUNCE');assert.equal(e.playerBlade.state,'idle');
  e.advanceAttack(1200,true);assert.deepEqual(e.calls,['parry']);
});
test('outside circle clash blocks damage without posture change',()=>{
  const e=engine();e.enemyPosture=37;swing(e,650);e.advanceAttack(1100,true);
  assert.deepEqual(e.calls,['clash']);assert.equal(e.playerHp,100);assert.equal(e.enemyPosture,37);
});
test('exact circle boundary counts as parry',()=>{
  const e=engine(); // Contact midpoint = 70px: player center 62px from home, enemy 78px.
  swing(e,844-62/0.9);e.advanceAttack(1000,true);assert.deepEqual(e.calls,['parry']);
});
test('recovery cannot block; early air swing and misses have no contact audio',()=>{
  const e=engine();swing(e,0);e.advanceAttack(1001,true);assert.deepEqual(e.calls,['hit']);assert.equal(e.playerHp,100-e.currentPattern.damage);
  const r=engine();swing(r,400);r.advanceAttack(610,true);assert.equal(r.playerBlade.state,'return');r.advanceAttack(1001,true);assert.deepEqual(r.calls,['hit']);
  const miss=engine(line(1000,{x:500,y:570}));miss.advanceAttack(1100,true);assert.deepEqual(miss.calls,[]);assert.equal(miss.playerHp,100);
});
test('repeated input and keyboard autorepeat cannot refresh action',()=>{
  const e=engine();swing(e,650);const start=e.playerBlade.startTime;swing(e,660);assert.equal(e.playerBlade.startTime,start);
  let prevented=false;e.handleKeyDown({repeat:true,preventDefault(){prevented=true;},code:'Space'});assert.equal(prevented,true);assert.equal(e.playerBlade.startTime,start);
});
test('all 29 patterns: curved, multisegment, spiral sweeps agree at 60fps and 2fps',()=>{
  for(const [key,p] of Object.entries(data.ATTACK_PATTERNS)){
    for(const offset of [30,90,180,300]){
      const a=engine(p),b=engine(p),start=Math.max(0,a.totalDurationMs-offset);
      swing(a,start);swing(b,start);
      for(let t=start+16;t<a.totalDurationMs+501;t+=16)a.advanceAttack(t,true);
      b.advanceAttack(b.totalDurationMs+501,true);
      assert.deepEqual(a.calls,b.calls,key+' offset '+offset);assert.equal(a.playerHp,b.playerHp);assert.equal(a.enemyPosture,b.enemyPosture);
      assert.ok(a.calls.length<=1);
    }
  }
});
