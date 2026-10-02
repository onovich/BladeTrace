(function (root) {
  'use strict';
  const radius = 8;
  const finite = (v, fallback) => Number.isFinite(v) && v > 0 ? v : fallback;
  function config(pattern, hurtRadius = 24) {
    return { reach: finite(pattern.playerAttackReach, 180), outSpeed: finite(pattern.playerOutSpeed, 900), returnSpeed: finite(pattern.playerReturnSpeed, 600), parryRadius: Math.max(hurtRadius + 10, finite(pattern.parryRadius, 70)) };
  }
  function path(pattern, center) {
    const points = [{...center, distance: 0}];
    function add(p) {
      const last = points[points.length - 1];
      const distance = last.distance + Math.hypot(p.x-last.x, p.y-last.y);
      if (distance > last.distance) points.push({...p, distance});
    }
    for (const s of [...pattern.segments].reverse()) {
      // Dense geometric sampling, independent of enemy easing and duration.
      const polygon = Math.hypot(s.p1.x-s.p0.x,s.p1.y-s.p0.y)+Math.hypot(s.p2.x-s.p1.x,s.p2.y-s.p1.y)+Math.hypot(s.p3.x-s.p2.x,s.p3.y-s.p2.y);
      const count = Math.max(128, Math.ceil(polygon / 2));
      for (let i=0;i<=count;i++) {
        const t=1-i/count, u=1-t;
        add({x:u*u*u*s.p0.x+3*u*u*t*s.p1.x+3*u*t*t*s.p2.x+t*t*t*s.p3.x,y:u*u*u*s.p0.y+3*u*u*t*s.p1.y+3*u*t*t*s.p2.y+t*t*t*s.p3.y});
      }
    }
    return {points, length:points[points.length-1].distance};
  }
  function at(path, distance) {
    const p=path.points; distance=Math.max(0,Math.min(path.length,distance));
    let lo=0,hi=p.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(p[mid].distance<distance)lo=mid;else hi=mid;}
    const a=p[lo],b=p[hi],t=(distance-a.distance)/(b.distance-a.distance||1);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  class Action {
    constructor(){this.reset();}
    reset(){this.state='idle';this.path=null;this.distance=0;}
    start(path,settings,time){if(this.state!=='idle')return false;this.path=path;this.settings={...settings,reach:Math.min(settings.reach,path.length)};this.startTime=time;this.state='outbound';this.distance=0;this.endTime=time+this.settings.reach/this.settings.outSpeed*1000;return true;}
    distanceAt(time){return this.state==='outbound'?Math.min(this.settings.reach,Math.max(0,time-this.startTime)*this.settings.outSpeed/1000):this.state==='return'?Math.max(0,this.returnDistance-(time-this.returnTime)*this.settings.returnSpeed/1000):0;}
    returnAt(time){if(this.state!=='outbound')return;this.returnDistance=this.distanceAt(time);this.returnTime=time;this.state='return';}
    advance(time){if(this.state==='outbound'&&time>=this.endTime)this.returnAt(this.endTime);this.distance=this.distanceAt(time);if(this.state==='return'&&this.distance<=0)this.reset();}
    position(time){return at(this.path,this.distanceAt(time));}
  }
  function sweep(a,b,c,d,r=radius*2){
    const x=a.x-c.x,y=a.y-c.y,vx=b.x-a.x-d.x+c.x,vy=b.y-a.y-d.y+c.y;
    const C=x*x+y*y-r*r;if(C<=0)return 0;
    const A=vx*vx+vy*vy,B=2*(x*vx+y*vy),disc=B*B-4*A*C;
    if(A===0||disc<0)return null;const t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:null;
  }
  const api={radius,config,path,at,Action,sweep};
  if(typeof module!=='undefined')module.exports=api;else root.BladeTracePlayerBlade=api;
})(typeof window!=='undefined'?window:globalThis);
