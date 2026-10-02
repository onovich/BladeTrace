const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function runtime(){
  let time=0;
  const draw=new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})});
  function element(){return {hidden:true,style:{setProperty(){}},dataset:{},value:'',checked:false,children:[],events:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(k,v){this.events[k]=v;},setAttribute(){},removeAttribute(){},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},querySelector(){return null;},focus(){},scrollIntoView(){},getContext:()=>draw,getBoundingClientRect:()=>({left:0,top:0,width:600,height:650}),width:600,height:650,setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}};}
  const html=fs.readFileSync(require.resolve('../app/index.html'),'utf8'),els={};
  for(const [,id] of html.matchAll(/id="([^"]+)"/g))els[id]=element();
  const document={getElementById:id=>els[id]||null,querySelector:()=>element(),querySelectorAll:()=>[],createElement:element};
  const context={document,console,performance:{now:()=>time},window:{addEventListener(){},requestAnimationFrame(){},setTimeout(){return 1;},clearTimeout(){},BladeTracePatternValidation:require('../app/pattern-validation.js'),BladeTraceAttackPatterns:require('../app/attack-patterns.js'),BladeTracePlayerBlade:require('../app/player-blade.js'),BladeTraceCombatSamples:class{stop(){}play(){}}}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../app/game.js'),'utf8')+'\nthis.Engine=GameEngine;',context);
  return {game:new context.Engine(),els,setTime(t){time=t;}};
}
test('actual engine boots against all HTML ids; renders, edits reach/radius/speeds and previews roundtrip',()=>{
  const {game:g,els,setTime}=runtime();g.render();g.enterEditorMode();g.render();
  const event=(x,y)=>({pointerId:1,clientX:x,clientY:y,preventDefault(){}});
  g.handleCanvasPointerDown(event(300,570));assert.equal(els['blade-editor'].hidden,false);
  els['blade-out-speed'].value=1200;els['blade-return-speed'].value=400;els['blade-out-speed'].events.change();
  assert.equal(g.getBladeSettings().outSpeed,1200);assert.equal(g.getBladeSettings().returnSpeed,400);
  els['blade-preview'].events.click();setTime(100);g.loop(100);assert.equal(g.playerBlade.state,'outbound');
  setTime(160);g.loop(160);assert.equal(g.playerBlade.state,'return');g.render();
  setTime(1000);g.loop(1000);assert.equal(g.playerBlade.state,'idle');
  g.handleCanvasPointerDown(event(370,570));g.handleCanvasPointerMove(event(400,570));g.handleCanvasPointerUp(event(400,570));assert.equal(g.getBladeSettings().parryRadius,100);
  g.setPlayerHurtboxRadius(150);assert.ok(g.getBladeSettings().parryRadius>=160);
  const blade=require('../app/player-blade.js'),end=blade.at(g.getBladePath(),g.getBladeSettings().reach),target=blade.at(g.getBladePath(),240);
  g.handleCanvasPointerDown(event(end.x,end.y));g.handleCanvasPointerMove(event(target.x,target.y));g.handleCanvasPointerUp(event(target.x,target.y));assert.ok(Math.abs(g.getBladeSettings().reach-240)<3);
  g.leaveEditorModeUi();assert.equal(els['blade-editor'].hidden,true);assert.equal(g.playerBlade.state,'idle');
});
test('all Boss phases boot, switch, reset and retain per-pattern blade parameters',()=>{
  const {game:g}=runtime();
  for(const key of Object.keys(g.bossLibrary)){
    g.handleBossChange({target:{value:key}});assert.equal(g.currentBossKey,key);
    g.enterEditorMode();
    for(let i=0;i<g.currentBoss.phases.length;i++){
      g.selectBossPhase(i);g.render();g.startSelectedPhasePractice();g.startAttack();g.advanceAttack(g.startTime+g.totalDurationMs+1,true);g.resetCombat(false);g.enterEditorMode();
    }
    g.exitEditorMode();g.resetCombat(false);
  }
});

test('spatial parries still advance every Boss through all phases to execution',()=>{
  const {game:g,setTime}=runtime();
  let clock=2000;
  for(const key of Object.keys(g.bossLibrary)) {
    g.resetCombat(false);g.handleBossChange({target:{value:key}});
    const phases=new Set();
    for(let i=0;i<15&&g.state!=='DEATHBLOW';i++){
      phases.add(g.currentPhaseIndex);g.clearPhaseTransition();
      setTime(clock);g.startAttack();assert.equal(g.state,'ATTACKING',key);
      setTime(clock+g.totalDurationMs-10);g.handleParryInput();
      g.advanceAttack(clock+g.totalDurationMs+1,true);
      assert.equal(g.state,'PARRY_BOUNCE',key);
      g.updateBounce(g.bounce.startTime+251);clock+=g.totalDurationMs+1000;
    }
    assert.equal(g.state,'DEATHBLOW',key);assert.equal(phases.size,3,key);
    g.executeDeathblow();assert.equal(g.state,'VICTORY');
  }
});
