(function syncLetsPlayGlow(){const btn=document.getElementById('letsplay-circle');const wrapper=document.getElementById('letsplay-wrapper');if(!btn||!wrapper)return;let state='idle';let _hovered=false;let _pendingTimers=[];function clearTimers(){_pendingTimers.forEach(clearTimeout);_pendingTimers=[];}function setSize(px,tr){const scale=px/90;if(tr){const dur=tr.match(/([\d.]+s)/)?.[1]||'0.3s';const ease=tr.match(/cubic-bezier\([^)]+\)/)?.[0]||'ease';
  wrapper.style.transition=`transform ${dur} ${ease}`;

  }
  else {
    wrapper.style.transition='none';

  }
  wrapper.style.transform=`translate(-50%, -50%) scale(${scale})`;

  }
  function resetToSmall(animated) {
    clearTimers();
    wrapper.removeEventListener('transitionend',onShrinkEnd);
    state='idle';
    _hovered=false;
    wrapper.classList.add('breathing');
    btn.querySelectorAll('svg, span, .lp-question-mark').forEach(el=>{el.style.transition='opacity 0.2s ease';el.style.opacity='1';});
    btn.style.background='none';
    (function(){var _lpc=document.getElementById('letsplay-spiral-canvas');if(!_lpc||typeof _drawSpiralCore!=='function')return;var DPR=Math.min(window.devicePixelRatio||2,2);var W=180,H=240;_lpc.style.width=W+'px';_lpc.style.height=H+'px';_drawSpiralCore(_lpc,W,H,DPR);})();
    btn.style.border='none';
    btn.style.boxShadow='0 0 0 2px rgba(180,150,60,0.55), 0 0 0 4px rgba(180,150,60,0.18), 0 8px 32px rgba(0,0,0,0.45)';
    btn.style.pointerEvents='auto';
    if(animated) {
      wrapper.style.transition='transform 0.35s cubic-bezier(0.4,0,0.1,1)';

    }
    else {
      wrapper.style.transition='none';

    }
    wrapper.style.transform='translate(-50%, -50%) scale(1)';

  }
  const _breathStyle=document.createElement('style');
  _breathStyle.textContent=`
      @keyframes _letsplayBreathe {
        0%, 100% {
          transform: translate(-50%, -50%) scale(1);
          box-shadow:
            0 0 0 2px rgba(180,150,60,0.55),
            0 0 0 4px rgba(180,150,60,0.18),
            0 0 18px rgba(180,150,60,0.35),
            0 0 40px rgba(120,180,60,0.18),
            0 8px 32px rgba(0,0,0,0.45);
        }
        50% {
          transform: translate(-50%, -50%) scale(1.06);
          box-shadow:
            0 0 0 2px rgba(210,180,80,0.80),
            0 0 0 6px rgba(200,170,60,0.28),
            0 0 32px rgba(200,170,60,0.60),
            0 0 70px rgba(100,200,80,0.28),
            0 12px 40px rgba(0,0,0,0.50);
        }
      }
      #letsplay-wrapper.breathing {
        animation: _letsplayBreathe 3s ease-in-out infinite;
      }
    @keyframes _letsplayFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    `;
  document.head.appendChild(_breathStyle);
  wrapper.classList.add('breathing');
  btn.style.background='none';
  btn.style.boxShadow='0 0 0 2px rgba(180,150,60,0.55), 0 0 0 4px rgba(180,150,60,0.18), 0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)';
  btn.style.border='none';
  btn.addEventListener('mouseenter',()=>{if(state!=='idle')return;_hovered=true;wrapper.classList.remove('breathing');btn.style.background='none';btn.style.border='none';btn.style.boxShadow='0 0 0 2px rgba(200,160,40,0.8), 0 0 0 5px rgba(200,160,40,0.22), 0 12px 40px rgba(0,0,0,0.5)';setSize(90*1.08,'width 0.28s cubic-bezier(0.16,1,0.3,1)');});
  btn.addEventListener('mouseleave',()=>{_hovered=false;if(state!=='idle')return;wrapper.classList.add('breathing');btn.style.background='none';btn.style.border='none';btn.style.boxShadow='0 0 0 2px rgba(180,150,60,0.55), 0 0 0 4px rgba(180,150,60,0.18), 0 8px 32px rgba(0,0,0,0.45)';setSize(90,'width 0.28s cubic-bezier(0.16,1,0.3,1)');});
  btn.addEventListener('pointerdown',()=>{if(state!=='idle')return;setSize(90*0.94,'width 0.1s ease');});
  btn.addEventListener('pointerup',()=>{if(state==='idle')setSize(90,'width 0.28s cubic-bezier(0.16,1,0.3,1)');});
  btn.addEventListener('pointercancel',()=>{if(state==='idle')setSize(90,'none');});
  function onShrinkEnd(e) {
    if(e.propertyName!=='transform')return;
    wrapper.removeEventListener('transitionend',onShrinkEnd);
    resetToSmall(false);

  }
  function doExpand(onMidpoint) {
    if(state!=='idle')return;
    state='expanding';
    btn.style.pointerEvents='none';
    clearTimers();
    btn.querySelectorAll('.lp-question-mark, span').forEach(el=>{el.style.transition='opacity 0.15s ease';el.style.opacity='0';});
    const targetPx=Math.min(window.innerWidth*0.88,window.innerHeight*0.88);
    setSize(targetPx,'width 0.5s cubic-bezier(0.4,0,0.2,1), height 0.5s cubic-bezier(0.4,0,0.2,1), margin 0.5s cubic-bezier(0.4,0,0.2,1)');
    _pendingTimers.push(setTimeout(()=>{if(onMidpoint)onMidpoint();state='shrinking';const shrinkMs=500;setSize(90,'width '+shrinkMs+'ms cubic-bezier(0.4,0,0.1,1)');wrapper.addEventListener('transitionend',onShrinkEnd);_pendingTimers.push(setTimeout(()=>{btn.querySelectorAll('.lp-question-mark, span').forEach(el=>{el.style.transition='opacity 0.22s ease';el.style.opacity='1';});},Math.round(shrinkMs*0.55)));_pendingTimers.push(setTimeout(()=>{wrapper.removeEventListener('transitionend',onShrinkEnd);if(state==='shrinking')resetToSmall(false);},shrinkMs+120));},480));

  }
  window.triggerLetsPlayAnim=function(callback) {
    doExpand(callback);

  };
  function adjustLetsPlayPosition() {
    var inflow=document.getElementById('letsplay-inflow');
    if(!inflow)return;
    var r=inflow.getBoundingClientRect();
    if(r.height>30&&r.width>30) {
      var cx=Math.round(r.left+r.width*0.5);
      var cy=Math.round(r.top+r.height*0.5);
      wrapper.style.left=cx+'px';
      wrapper.style.top=cy+'px';
      wrapper.style.transform='translate(-50%, -50%)';

    }

  }
  resetToSmall(false);
  window._refreshLetsPlaySpiral=function() {
    var _lpc=document.getElementById('letsplay-spiral-canvas');
    if(!_lpc||typeof _drawSpiralCore!=='function')return;
    var DPR=Math.min(window.devicePixelRatio||2,2);
    var W=180,H=240;
    _lpc.style.width=W+'px';
    _lpc.style.height=H+'px';
    _drawSpiralCore(_lpc,W,H,DPR);

  };
  adjustLetsPlayPosition();
  setTimeout(adjustLetsPlayPosition,200);
  setTimeout(adjustLetsPlayPosition,800);
  window.addEventListener('resize',adjustLetsPlayPosition);
  btn.addEventListener('click',function(){if(!window._authCompleted){goTo('auth-screen');}else{window._startDirectPlay();}});

  }
  )();