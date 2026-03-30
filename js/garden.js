const GARDEN_FRUITS=[{symbol:'strawberry',r:220,g:30,b:60},{symbol:'watermelon',r:40,g:160,b:50},{symbol:'banana',r:230,g:190,b:0},{symbol:'orange',r:240,g:110,b:10},{symbol:'avocado',r:60,g:160,b:60},{symbol:'mango',r:220,g:160,b:10},{symbol:'grapes',r:120,g:40,b:200},{symbol:'blueberry',r:40,g:80,b:200},{symbol:'cherry',r:180,g:10,b:30},{symbol:'apple',r:230,g:110,b:40},{symbol:'figs',r:140,g:40,b:180},{symbol:'rambutan',r:210,g:30,b:50},{symbol:'durian',r:160,g:170,b:20},{symbol:'papaya',r:240,g:120,b:20},{symbol:'chempedak',r:200,g:150,b:20},{symbol:'sapote',r:160,g:90,b:30},];
  function _gardenLoadLocal() {
    const raw=localStorage.getItem('ba_garden_v2');
    if(raw) {
      try {
        return JSON.parse(raw);

      }
      catch(e) {

      }

    }
    const old=localStorage.getItem('ba_garden');
    if(old) {
      try {
        const arr=JSON.parse(old);
        const obj= {

        };
        arr.forEach(s=>{obj[s]=1;});
        return obj;

      }
      catch(e) {

      }

    }
    return {

    };

  }
  let _gardenUnlocked=_gardenLoadLocal();
  let _gardenBuilt=false;
  function gardenSave() {
    localStorage.setItem('ba_garden_v2',JSON.stringify(_gardenUnlocked));
    localStorage.setItem('ba_garden',JSON.stringify(Object.keys(_gardenUnlocked)));
    if(typeof supabaseClient!=='undefined'&&typeof currentUser!=='undefined'&&currentUser&&typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL!=='https://YOUR_PROJECT_ID.supabase.co') {
      supabaseClient.from('profiles').update({garden:JSON.stringify(_gardenUnlocked),updated_at:new Date().toISOString()}).eq('id',currentUser.id).then(()=>{},()=>{});

    }

  }
  async function gardenLoadFromSupabase() {
    const cu=(typeof currentUser!=='undefined')?currentUser:null;
    if(!supabaseClient||!cu||SUPABASE_URL==='https://YOUR_PROJECT_ID.supabase.co')return;
    try {
      const {
        data
      }
      =await supabaseClient.from('profiles').select('garden').eq('id',cu.id).maybeSingle();
      if(data&&data.garden) {
        let remote;
        try {
          remote=JSON.parse(data.garden);

        }
        catch(e) {
          return;

        }
        if(Array.isArray(remote)) {
          remote.forEach(s=>{if(typeof s==='string'){_gardenUnlocked[s]=Math.max(_gardenUnlocked[s]||0,1);}});

        }
        else if(remote&&typeof remote==='object') {
          Object.entries(remote).forEach(([s,remoteCount])=>{const localCount=_gardenUnlocked[s]||0;_gardenUnlocked[s]=Math.max(localCount,Number(remoteCount)||0);});

        }
        gardenSave();
        if(typeof gardenUpdateProgress==='function')gardenUpdateProgress();
        if(typeof _gardenBuilt!=='undefined'&&_gardenBuilt)gardenBuild();

      }

    }
    catch(e) {
      _cw('gardenLoadFromSupabase:',e);

    }

  }
  function gardenPaintBG(canvas,r,g,b) {
    const W=300,H=430,sc=2;
    canvas.width=W*sc;
    canvas.height=H*sc;
    const ctx=canvas.getContext('2d');
    ctx.scale(sc,sc);
    const dr=Math.floor(r*0.40),dg=Math.floor(g*0.40),db=Math.floor(b*0.40);
    const mr=Math.floor(r*0.28),mg=Math.floor(g*0.28),mb=Math.floor(b*0.28);
    const bg=ctx.createRadialGradient(W/2,H*0.4,20,W/2,H/2,300);
    bg.addColorStop(0,`rgb(${dr},${dg},${db})`);
    bg.addColorStop(0.55,`rgb(${Math.floor(dr*0.75)},${Math.floor(dg*0.75)},${Math.floor(db*0.75)})`);
    bg.addColorStop(1,`rgb(${mr},${mg},${mb})`);
    ctx.fillStyle=bg;
    ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(W/2,H*0.42,0,W/2,H*0.42,170);
    glow.addColorStop(0,`rgba(${r},${g},${b},0.15)`);
    glow.addColorStop(1,`rgba(${r},${g},${b},0)`);
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,W,H);
    const vg=ctx.createRadialGradient(W/2,H/2,80,W/2,H/2,240);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(0,0,0,0.45)');
    ctx.fillStyle=vg;
    ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=`rgba(${r},${g},${b},0.22)`;
    ctx.lineWidth=1;
    ctx.strokeRect(8,8,W-16,H-16);

  }
  function gardenPaintFruit(canvas,symbol,r,g,b,sz) {
    sz=sz||100;
    const S=sz*2;
    canvas.width=S;
    canvas.height=S;
    const ctx=canvas.getContext('2d');
    if(typeof drawSymbol==='function')drawSymbol(ctx,symbol,S/2,S/2,sz*0.65,r,g,b);

  }
  function gardenUpdateProgress() {
    const n=Object.values(_gardenUnlocked).filter(c=>c>0).length;
    const el=document.getElementById('garden-prog-label');
    const fill=document.getElementById('garden-prog-fill');
    if(el)el.textContent=n+' / 16';
    if(fill)fill.style.width=(n/16*100)+'%';

  }
  function _gardenMakeEatBtn(fruit,wrapper,card,countBadge) {
    const eatBtn=document.createElement('button');
    eatBtn.className='gfc-eat-btn';
    eatBtn.innerHTML='🍴 mangia';
    eatBtn.addEventListener('click',(e)=>{e.stopPropagation();const cnt=_gardenUnlocked[fruit.symbol]||0;if(cnt<=0)return;_gardenUnlocked[fruit.symbol]=cnt-1;gardenSave();const newCnt=_gardenUnlocked[fruit.symbol];if(newCnt<=0){card.classList.remove('gfc-unlocked','gfc-just-unlocked');card.classList.add('gfc-locked');wrapper.classList.add('gfc-locked-wrap');eatBtn.remove();if(countBadge)countBadge.classList.add('hidden');gardenUpdateProgress();}else{if(countBadge){countBadge.textContent=newCnt;countBadge.classList.toggle('hidden',newCnt<=1);}}});
    return eatBtn;

  }
  let _gardenBuilding=false;
  function gardenBuild() {
    if(_gardenBuilding)return;
    _gardenBuilding=true;
    const grid=document.getElementById('garden-grid-profile');
    if(!grid) {
      _gardenBuilding=false;
      return;

    }
    grid.querySelectorAll('canvas').forEach(function(cv){try{cv.width=1;cv.height=1;}catch(e){}});
    grid.innerHTML='';
    _gardenBuilt=true;
    const paintQueue=[];
    GARDEN_FRUITS.forEach(fruit=>{const cnt=_gardenUnlocked[fruit.symbol]||0;const isUnlocked=cnt>0;const wrapper=document.createElement('div');wrapper.className='gfc-wrapper '+(isUnlocked?'':'gfc-locked-wrap');wrapper.dataset.symbol=fruit.symbol;const card=document.createElement('div');card.className='garden-fruit-card '+(isUnlocked?'gfc-unlocked':'gfc-locked');card.dataset.symbol=fruit.symbol;const bgC=document.createElement('canvas');bgC.className='gfc-bg';card.appendChild(bgC);const frC=document.createElement('canvas');frC.className='gfc-fruit';card.appendChild(frC);const foot=document.createElement('div');foot.className='gfc-footer';foot.innerHTML=`<div class="gfc-name">${fruit.symbol}</div>`;card.appendChild(foot);const lock=document.createElement('div');lock.className='gfc-lock';lock.textContent='';card.appendChild(lock);const countBadge=document.createElement('div');countBadge.className='gfc-count'+(cnt>1?'':' hidden');countBadge.textContent=cnt;card.appendChild(countBadge);wrapper.appendChild(card);if(isUnlocked){wrapper.appendChild(_gardenMakeEatBtn(fruit,wrapper,card,countBadge));}grid.appendChild(wrapper);paintQueue.push({bgC,frC,fruit});card.addEventListener('click',()=>{if(card.classList.contains('gfc-unlocked')){gardenOpenModal(fruit);}});});
    gardenUpdateProgress();
    _gardenBuilding=false;
    const idle=window.requestIdleCallback?(cb)=>window.requestIdleCallback(cb,{timeout:300}):(cb)=>setTimeout(cb,16);
    let i=0;
    function paintNext() {
      if(i>=paintQueue.length)return;
      const {
        bgC,frC,fruit
      }
      =paintQueue[i++];
      gardenPaintBG(bgC,fruit.r,fruit.g,fruit.b);
      gardenPaintFruit(frC,fruit.symbol,fruit.r,fruit.g,fruit.b,90);
      idle(paintNext);

    }
    idle(paintNext);

  }
  let _sessionFruitsSeen= {

  };
  function gardenUnlock(symbol) {
    const isMultiplayer=!!(typeof state!=='undefined'&&state.matchId);
    if(isMultiplayer) {
      const timesSeen=_sessionFruitsSeen[symbol]||0;
      _sessionFruitsSeen[symbol]=timesSeen+1;
      if(timesSeen>=1) {
        const currentCount=_gardenUnlocked[symbol]||0;
        if(currentCount>0&&Math.random()<0.40) {
          _gardenUnlocked[symbol]=currentCount-1;
          if(_gardenUnlocked[symbol]===0)delete _gardenUnlocked[symbol];
          if(typeof _marketSeeds!=='undefined') {
            _marketSeeds[symbol]=(_marketSeeds[symbol]||0)+1;
            if(typeof seedSave==='function')seedSave();
            if(typeof marketBuild==='function')marketBuild();

          }
          gardenSave();
          gardenUpdateProgress();
          const card=document.querySelector(`[data-symbol="${symbol}"].garden-fruit-card`);
          const wrapper=document.querySelector(`.gfc-wrapper[data-symbol="${symbol}"]`);
          const cnt=_gardenUnlocked[symbol]||0;
          if(card) {
            const badge=card.querySelector('.gfc-count');
            if(badge) {
              badge.textContent=cnt;
              badge.classList.toggle('hidden',cnt<=1);

            }
            if(cnt===0) {
              card.classList.remove('gfc-unlocked');
              card.classList.add('gfc-locked');
              const btn=wrapper?wrapper.querySelector('.gfc-eat-btn'):null;
              if(btn)btn.remove();

            }

          }
          let toast=document.getElementById('garden-seed-toast');
          if(!toast) {
            toast=document.createElement('div');
            toast.id='garden-seed-toast';
            toast.style.cssText="position:fixed;bottom:5rem;left:50%;transform:translateX(-50%) translateY(10px);background:rgba(10,30,45,0.97);border:1px solid rgba(72,202,228,0.4);border-radius:14px;padding:0.65rem 1.2rem;font-family:'DM Sans',sans-serif;font-size:0.78rem;color:rgba(255,255,255,0.88);z-index:9999;opacity:0;pointer-events:none;transition:opacity 0.3s,transform 0.3s;white-space:nowrap;";
            document.body.appendChild(toast);

          }
          toast.textContent='🌱 '+symbol+' si è trasformato in un seme!';
          toast.style.opacity='1';
          toast.style.transform='translateX(-50%) translateY(0)';
          clearTimeout(toast._t);
          toast._t=setTimeout(()=>{toast.style.opacity='0';toast.style.transform='translateX(-50%) translateY(10px)';},3200);
          return;

        }

      }

    }
    const prevCnt=_gardenUnlocked[symbol]||0;
    _gardenUnlocked[symbol]=prevCnt+1;
    gardenSave();
    gardenUpdateProgress();
    const newCnt=_gardenUnlocked[symbol];
    const wrapper=document.querySelector(`.gfc-wrapper[data-symbol="${symbol}"]`);
    const card=document.querySelector(`[data-symbol="${symbol}"].garden-fruit-card`);
    if(card) {
      let badge=card.querySelector('.gfc-count');
      if(badge) {
        badge.textContent=newCnt;
        badge.classList.toggle('hidden',newCnt<=1);

      }

    }
    if(prevCnt===0) {
      if(card) {
        card.classList.remove('gfc-locked');
        card.classList.add('gfc-unlocked','gfc-just-unlocked');
        card.addEventListener('animationend',()=>card.classList.remove('gfc-just-unlocked'),{once:true});

      }
      if(wrapper) {
        wrapper.classList.remove('gfc-locked-wrap');
        if(!wrapper.querySelector('.gfc-eat-btn')) {
          const fruit=GARDEN_FRUITS.find(f=>f.symbol===symbol);
          if(fruit&&card) {
            const badge=card.querySelector('.gfc-count');
            wrapper.appendChild(_gardenMakeEatBtn(fruit,wrapper,card,badge));

          }

        }

      }

    }

  }
  const _origGoTo=typeof goTo==='function'?goTo:null;
  document.addEventListener('DOMContentLoaded',()=>{const profileScreen=document.getElementById('profile');if(profileScreen){let _gardenObserverBusy=false;const obs=new MutationObserver(()=>{if(_gardenObserverBusy)return;if(profileScreen.classList.contains('active')){_gardenObserverBusy=true;if(!_gardenBuilt)gardenBuild();gardenUpdateProgress();_gardenObserverBusy=false;}});obs.observe(profileScreen,{attributes:true,attributeFilter:['class','style']});}setTimeout(()=>{const _ps=document.getElementById('profile');if(!_gardenBuilt&&_ps&&(_ps.classList.contains('active')||_ps.style.display==='flex')){gardenBuild();}},1500);});
  function gardenOpenModal(fruit) {
    const modal=document.getElementById('garden-modal');
    if(!modal)return;
    const mbg=document.getElementById('gm-bg');
    const mfr=document.getElementById('gm-fruit');
    document.getElementById('gm-name').textContent=fruit.symbol;
    gardenPaintBG(mbg,fruit.r,fruit.g,fruit.b);
    gardenPaintFruit(mfr,fruit.symbol,fruit.r,fruit.g,fruit.b,150);
    mfr.style.width='80%';
    modal.classList.add('gm-open');

  }
  function gardenCloseModal(e) {
    if(e&&e.target!==document.getElementById('garden-modal')&&!e.target.classList.contains('gm-close'))return;
    const modal=document.getElementById('garden-modal');
    if(modal)modal.classList.remove('gm-open');

  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape')gardenCloseModal();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){document.documentElement.classList.add('tab-hidden');}else{document.documentElement.classList.remove('tab-hidden');}});