(function() {
  'use strict';

  /* ═══════════════════════════════════════════════════
     DIRECT PLAY  —  bypass mode-selection modal entirely
     ═══════════════════════════════════════════════════ */

  // Override showModeSelection globally so any code path that calls it
  // (after auth, after name-entry, after cancelRoom, etc.) is silently swallowed.
  // We replace it AFTER the original definition with a late-binding override.
  function _suppressModeModal() {
    window.showModeSelection = function() { /* suppressed */ };
    // Also kill _openModeSelectionModal so even internal calls do nothing
    window._openModeSelectionModal = function() { /* suppressed */ };
    // If a stale modal exists, nuke it
    var old = document.getElementById('modeModal');
    if (old) old.remove();
    var oldSpiral = document.getElementById('modeSpiralBg');
    if (oldSpiral) oldSpiral.remove();
  }

  // Run once DOM is ready (all scripts parsed)
  window.addEventListener('load', function() {
    _suppressModeModal();
    // Also patch enterGame so after name-entry it goes straight offline
    var _origEnter = window.enterGame;
    if (typeof _origEnter === 'function') {
      window.enterGame = function() {
        _origEnter.apply(this, arguments);
        // enterGame can call showModeSelection — already suppressed above
      };
    }
    // After auth completes → go direct offline instead of mode modal
    var _origAuthDone = window._onAuthCompleted || window.onAuthCompleted;
    // Patch _authReturnTo intercept
  }, { once: true });

  // _startDirectPlay defined once, in the final consolidated script block below.
  // _launchOfflineDirect kept here for reference but no longer called.
  function _launchOfflineDirect() {
    // Build a synthetic faux circle element that pickOfflineMode's
    // animation code can expand — keeps the beautiful transition intact.
    var existing = document.getElementById('modeModal');
    if (existing) existing.remove();

    var faux = document.createElement('div');
    faux.id = 'modeModal';
    faux.className = 'modal-overlay circle-modal';
    faux.style.cssText = 'pointer-events:none;z-index:10002;';

    // The circle that gets expanded full-screen
    var circle = document.createElement('div');
    circle.className = 'mode-circle';
    circle.style.cssText = [
      'position:relative',
      'z-index:1',
      'background:radial-gradient(circle at 38% 35%,rgba(8,32,14,0.98),rgba(2,10,4,0.98))',
      'border:none',
      'box-shadow:none',
      'width:' + Math.ceil(Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) * 0.06) + 'px',
      'height:' + Math.ceil(Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) * 0.06) + 'px',
      'min-height:0',
      'border-radius:50%',
      'overflow:hidden'
    ].join(';');

    faux.appendChild(circle);
    document.body.appendChild(faux);

    // Small delay so the element is painted, then fire pickOfflineMode
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (typeof pickOfflineMode === 'function') {
          pickOfflineMode();
        }
        // Show player name top-right after game loads
        setTimeout(_updateHeaderName, 600);
        // Start bg matchmaking
        setTimeout(_startBgMatchmaking, 900);
      });
    });
  }

  /* ─────────────────────────────────────────────
     Header: player name
  ───────────────────────────────────────────── */
  var _hdrNamePollTimer = null;

  function _getCleanPlayerName() {
    // Priority: localStorage > state.playerName (if not __pending__) > 'Guest'
    var saved = '';
    try { saved = localStorage.getItem('playerName') || ''; } catch(e) {}
    if (saved && saved !== '__pending__') return saved;

    var stateName = (typeof state !== 'undefined' && state.playerName) ? state.playerName : '';
    if (stateName && stateName !== '__pending__') return stateName;

    var loginName = (typeof getLoggedInName === 'function') ? getLoggedInName('') : '';
    if (loginName && loginName !== '__pending__' && loginName !== 'Player') return loginName;

    // If saved exists even as fallback, use it
    if (saved) return saved;

    return null; // still loading
  }

  function _updateHeaderName() {
    var name = _getCleanPlayerName();
    if (!name) {
      // Poll until real name is available (max 5s)
      if (!_hdrNamePollTimer) {
        var _attempts = 0;
        _hdrNamePollTimer = setInterval(function() {
          _attempts++;
          var n = _getCleanPlayerName();
          if (n) {
            var el = document.getElementById('hdrPlayerName');
            if (el) el.textContent = n;
            clearInterval(_hdrNamePollTimer);
            _hdrNamePollTimer = null;
          } else if (_attempts > 10) {
            var el = document.getElementById('hdrPlayerName');
            if (el) el.textContent = 'Guest';
            clearInterval(_hdrNamePollTimer);
            _hdrNamePollTimer = null;
          }
        }, 300);
      }
      return;
    }
    if (_hdrNamePollTimer) { clearInterval(_hdrNamePollTimer); _hdrNamePollTimer = null; }
    var el = document.getElementById('hdrPlayerName');
    if (el) el.textContent = name;
  }

  // Patch goTo so name stays current whenever game screen is entered
  window.addEventListener('load', function() {
    var _orig = window.goTo;
    if (typeof _orig === 'function') {
      window.goTo = function(id) {
        var r = _orig.apply(this, arguments);
        if (id === 'game') setTimeout(_updateHeaderName, 120);
        return r;
      };
    }
  }, { once: true });

  /* ─────────────────────────────────────────────
     Background matchmaking
  ───────────────────────────────────────────── */
  var _bgMatchActive = false;
  var _bgMatchPollTimer = null;

  function _startBgMatchmaking() {
    if (_bgMatchActive) return;
    // Only run if on game screen
    if (typeof state !== 'undefined' && !state.isOffline) return;
    _bgMatchActive = true;

    // Hide old fullscreen waitingBadge circle
    var wb = document.getElementById('waitingBadge');
    if (wb) wb.style.display = 'none';

    // Show pulsing dot top-left in header
    var mm = document.getElementById('hdrMatchmaking');
    var idle = document.getElementById('hdrMatchIdle');
    if (mm) mm.style.cssText = mm.style.cssText + ';display:flex';
    if (idle) idle.style.display = 'none';

    // Start Supabase matchmaking if available
    if (typeof joinMatchQueue === 'function') {
      var name = (typeof getLoggedInName === 'function') ? getLoggedInName('') : 'Guest';
      if (typeof state !== 'undefined') {
        state.playerName = name;
        state._matchFound = false;
      }
      try { joinMatchQueue(); } catch(e) {}
      _bgMatchPollTimer = setInterval(_checkMatchFound, 1500);
    }
  }

  function _checkMatchFound() {
    if (!_bgMatchActive) { clearInterval(_bgMatchPollTimer); return; }
    if (typeof state !== 'undefined' && state._matchFound) {
      clearInterval(_bgMatchPollTimer);
      _bgMatchActive = false;
      _onMatchFound();
    }
  }

  function _onMatchFound() {
    var mm = document.getElementById('hdrMatchmaking');
    var mf = document.getElementById('hdrMatchFound');
    var idle = document.getElementById('hdrMatchIdle');
    if (mm) mm.style.display = 'none';
    if (mf) mf.style.cssText = mf.style.cssText + ';display:flex';
    if (idle) idle.style.display = 'none';

    var toast = document.getElementById('matchToast');
    if (toast) {
      toast.style.display = 'block';
      setTimeout(function() { toast.style.display = 'none'; }, 3500);
    }
    // Switch state to online — the matchmaking system handles screen nav
    if (typeof state !== 'undefined') {
      state.isOffline = false;
      state.isSolo = false;
    }
  }

  /* ─────────────────────────────────────────────
     Invite / Join panel
  ───────────────────────────────────────────── */
  var _inviteUrl = '';
  var _inviteCode = '';

  window._showInvitePanel = function() {
    // Always use the unified waitingRoomOverlay. Never open the old invitePanel.
    var wro = document.getElementById('waitingRoomOverlay');
    if (wro) {
      // Panel already exists (was hidden) — just re-show it.
      wro.style.display = 'flex';
      return;
    }
    // First open: show panel immediately in "generating room" state,
    // then kick off room creation in background.
    _showUnifiedInvitePanel();
  };

  window._closeInvitePanel = function() {
    // Hide the unified overlay — session/room-wait continue in background.
    var wro = document.getElementById('waitingRoomOverlay');
    if (wro) wro.style.display = 'none';
    // Also close old invitePanel just in case.
    var panel = document.getElementById('invitePanel');
    if (panel) panel.classList.remove('open');
  };

  document.addEventListener('click', function(e) {
    var panel = document.getElementById('invitePanel');
    if (panel && panel.classList.contains('open') && e.target === panel) {
      window._closeInvitePanel();
    }
  });

  window._inviteTab = function(tab) {
    ['Create','Join'].forEach(function(t) {
      var tabEl = document.getElementById('invTab' + t);
      var paneEl = document.getElementById('invPane' + t);
      var active = t.toLowerCase() === tab;
      if (tabEl) tabEl.classList.toggle('active', active);
      if (paneEl) paneEl.classList.toggle('active', active);
    });
    if (tab === 'join') {
      var inp = document.getElementById('invJoinInput');
      if (inp) setTimeout(function() { inp.focus(); }, 120);
    }
  };

  function _initCreateRoomPane() {
    var creating = document.getElementById('invCreating');
    var ready = document.getElementById('invReady');
    if (creating) { creating.style.display = 'flex'; }
    if (ready) { ready.style.display = 'none'; }

    // Reuse existing room code if already created
    if (typeof state !== 'undefined' && state._roomCode) {
      _showRoomReady(state._roomCode);
      return;
    }

    // Call existing createPrivateRoom if available
    if (typeof createPrivateRoom === 'function') {
      var name = (typeof getLoggedInName === 'function') ? getLoggedInName('') : 'Guest';
      createPrivateRoom(name);
      var attempts = 0;
      var poll = setInterval(function() {
        attempts++;
        if (typeof state !== 'undefined' && state._roomCode) {
          clearInterval(poll);
          _showRoomReady(state._roomCode);
        } else if (attempts > 30) {
          clearInterval(poll);
          if (creating) creating.innerHTML = '<span style="color:rgba(255,100,100,0.7);font-size:0.8rem;font-family:DM Sans,sans-serif;">Could not create room.<br>Make sure you're online.</span>';
        }
      }, 500);
    } else {
      // Cosmetic fallback (no backend available)
      setTimeout(function() {
        _showRoomReady(Math.random().toString(36).substr(2,6).toUpperCase());
      }, 900);
    }
  }

  function _showRoomReady(code) {
    _inviteCode = code;
    _inviteUrl = _getBaseUrl() + '?room=' + code;

    var creating = document.getElementById('invCreating');
    var ready = document.getElementById('invReady');
    var codeEl = document.getElementById('invRoomCode');
    var linkEl = document.getElementById('invLinkText');
    var qrEl = document.getElementById('invQR');

    if (creating) creating.style.display = 'none';
    if (ready) ready.style.display = 'flex';
    if (codeEl) codeEl.textContent = code;
    if (linkEl) linkEl.textContent = _inviteUrl;
    if (qrEl) qrEl.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=FFD580&bgcolor=0d0800&data=' +
      encodeURIComponent(_inviteUrl) +
      '" width="140" height="140" alt="QR" style="border-radius:10px;border:1.5px solid rgba(255,213,128,0.3);">';
  }

  window._copyInviteLink = function() {
    if (!_inviteUrl) return;
    var btn = event && event.target;
    _clipboardCopy(_inviteUrl, btn, 'Copy link', '✓ Copied!');
  };

  window._copyRoomCode = function() {
    if (!_inviteCode) return;
    var btn = event && event.target;
    _clipboardCopy(_inviteCode, btn, '📋 Copy code', '✓ Copied!');
  };

  function _clipboardCopy(text, btn, orig, done) {
    var fallback = function() {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
    if (btn) {
      btn.textContent = done;
      setTimeout(function() { if(btn) btn.textContent = orig; }, 1800);
    }
  }

  window._joinRoomByCode = function() {
    var inp = document.getElementById('invJoinInput');
    var err = document.getElementById('invJoinError');
    var code = inp ? inp.value.trim().toUpperCase() : '';
    if (!code || code.length < 4) {
      if (err) err.textContent = 'Enter a valid room code.';
      return;
    }
    if (err) err.textContent = '';
    if (typeof state !== 'undefined') state._pendingRoomCode = code;
    window._closeInvitePanel();
    if (typeof startJoinRoom === 'function') {
      startJoinRoom();
    } else {
      window.location.href = window.location.origin + window.location.pathname + '?room=' + code;
    }
  };

})();