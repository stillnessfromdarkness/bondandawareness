(function() {
  'use strict';

  /* ─────────────────────────────────────────────
     _startDirectPlay()
     Called when user taps "Let's Play".
     1. Runs offline mode immediately
     2. Updates header (player name, matchmaking dot)
     3. Starts background matchmaking
  ───────────────────────────────────────────── */
  window._startDirectPlay = function() {
    if (!window._authCompleted) { goTo('auth-screen'); return; }

    // Run offline mode directly (no modal)
    if (typeof pickOfflineMode === 'function') pickOfflineMode();

    // Show player name top-right
    var _raw = (typeof getLoggedInName === 'function') ? getLoggedInName('') : '';
    var name = (!_raw || _raw === '__pending__') ? (function(){try{return localStorage.getItem('playerName')||'Guest';}catch(e){return 'Guest';}}()) : _raw;
    var nameEl = document.getElementById('hdrPlayerName');
    if (nameEl) nameEl.textContent = name;

    // Start background matchmaking after 800ms (let offline boot settle)
    setTimeout(function() {
      _startBgMatchmaking();
    }, 800);
  };

  /* ─────────────────────────────────────────────
     Background matchmaking
  ───────────────────────────────────────────── */
  var _bgMatchActive = false;

  function _startBgMatchmaking() {
    if (_bgMatchActive) return;
    _bgMatchActive = true;

    // Show the pulsing dot top-left
    var mm = document.getElementById('hdrMatchmaking');
    var idle = document.getElementById('hdrMatchIdle');
    if (mm) { mm.style.display = 'flex'; }
    if (idle) { idle.style.display = 'none'; }

    // Hide waitingBadge (old fullscreen circle) if visible
    var wb = document.getElementById('waitingBadge');
    if (wb) wb.style.display = 'none';

    // Kick off Supabase matchmaking if available
    if (typeof joinMatchQueue === 'function') {
      var savedName = (typeof getLoggedInName === 'function') ? getLoggedInName('') : 'Guest';
      if (typeof state !== 'undefined') {
        state.playerName = savedName;
        state.isSolo = false;
        state.isOffline = true; // stay offline until match
        state._matchFound = false;
      }
      joinMatchQueue();
      _pollForMatch();
    } else {
      // No Supabase: just show dot without doing anything
      var txt = document.getElementById('hdrMatchText');
      if (txt) txt.textContent = 'looking for players…';
    }
  }

  function _pollForMatch() {
    var t = setInterval(function() {
      if (!_bgMatchActive) { clearInterval(t); return; }
      if (typeof state !== 'undefined' && state._matchFound) {
        clearInterval(t);
        _bgMatchActive = false;
        _onMatchFound();
      }
    }, 1200);
  }

  function _onMatchFound() {
    // Update header: hide dot, show "online"
    var mm = document.getElementById('hdrMatchmaking');
    var mf = document.getElementById('hdrMatchFound');
    if (mm) mm.style.display = 'none';
    if (mf) mf.style.display = 'flex';

    // Show toast
    var toast = document.getElementById('matchToast');
    if (toast) {
      toast.style.display = 'block';
      setTimeout(function() { toast.style.display = 'none'; }, 3200);
    }

    // Switch to online mode after a brief pause (let toast be seen)
    setTimeout(function() {
      if (typeof state !== 'undefined') {
        state.isOffline = false;
        state.isSolo = false;
      }
      // The matchmaking system handles the screen transition to game
    }, 1200);
  }

  /* ─────────────────────────────────────────────
     Invite / Join panel
  ───────────────────────────────────────────── */
  var _inviteRoomUrl = '';
  var _inviteRoomCode = '';

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

  // Close on backdrop click
  document.addEventListener('click', function(e) {
    var panel = document.getElementById('invitePanel');
    if (panel && panel.classList.contains('open') && e.target === panel) {
      window._closeInvitePanel();
    }
  });

  window._inviteTab = function(tab) {
    document.getElementById('invTabCreate').classList.toggle('active', tab === 'create');
    document.getElementById('invTabJoin').classList.toggle('active', tab === 'join');
    document.getElementById('invPaneCreate').classList.toggle('active', tab === 'create');
    document.getElementById('invPaneJoin').classList.toggle('active', tab === 'join');
    if (tab === 'join') {
      var inp = document.getElementById('invJoinInput');
      if (inp) setTimeout(function() { inp.focus(); }, 120);
    }
  };

  function _initCreateRoom() {
    var creating = document.getElementById('invCreating');
    var ready = document.getElementById('invReady');
    if (creating) creating.style.display = 'flex';
    if (ready) ready.style.display = 'none';

    // If a room code already exists in state, show it immediately
    if (typeof state !== 'undefined' && state._roomCode) {
      _showRoomReady(state._roomCode);
      return;
    }

    // Otherwise call the existing room creation logic
    if (typeof createPrivateRoom === 'function') {
      var name = (typeof getLoggedInName === 'function') ? getLoggedInName('') : 'Guest';
      // Intercept the room code once created
      var _orig = window._onRoomCreated;
      createPrivateRoom(name);
      // Poll for state._roomCode
      var attempts = 0;
      var poll = setInterval(function() {
        attempts++;
        if (typeof state !== 'undefined' && state._roomCode) {
          clearInterval(poll);
          _showRoomReady(state._roomCode);
        } else if (attempts > 30) {
          clearInterval(poll);
          if (creating) creating.innerHTML = '<span style="color:rgba(255,100,100,0.7);font-size:0.8rem;">Could not create room. Try again.</span>';
        }
      }, 500);
    } else {
      // Fallback: generate a local code (cosmetic only, no backend)
      setTimeout(function() {
        var code = Math.random().toString(36).substring(2,8).toUpperCase();
        _showRoomReady(code);
      }, 1200);
    }
  }

  function _getBaseUrl() {
    // window.location.origin is 'null' inside srcdoc/file iframes.
    // Fall back to stripping query+hash from the current href.
    var origin = window.location.origin;
    if (!origin || origin === 'null') {
      var meta = document.querySelector('meta[name="app-url"]');
      if (meta && meta.content) return meta.content.replace(/\/$/, '');
      return window.location.href.replace(/[?#].*$/, '').replace(/\/$/, '');
    }
    var path = window.location.pathname;
    return origin + (path === '/' ? '' : path);
  }

  function _showRoomReady(code) {
    _inviteRoomCode = code;
    _inviteRoomUrl = _getBaseUrl() + '?room=' + code;

    var creating = document.getElementById('invCreating');
    var ready = document.getElementById('invReady');
    var codeEl = document.getElementById('invRoomCode');
    var linkEl = document.getElementById('invLinkText');
    var qrEl = document.getElementById('invQR');

    if (creating) creating.style.display = 'none';
    if (ready) { ready.style.display = 'flex'; }
    if (codeEl) codeEl.textContent = code;
    if (linkEl) linkEl.textContent = _inviteRoomUrl;

    // QR code via the same service the app already uses
    if (qrEl) {
      qrEl.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=FFD580&bgcolor=0d0800&data=' +
        encodeURIComponent(_inviteRoomUrl) +
        '" width="140" height="140" alt="QR" style="border-radius:10px;border:1.5px solid rgba(255,213,128,0.3);">';
    }
  }

  window._copyInviteLink = function() {
    if (!_inviteRoomUrl) return;
    navigator.clipboard.writeText(_inviteRoomUrl).catch(function() {
      // fallback
      var ta = document.createElement('textarea');
      ta.value = _inviteRoomUrl;
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    });
    var btn = event.target;
    var orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(function() { btn.textContent = orig; }, 1800);
  };

  window._copyRoomCode = function() {
    if (!_inviteRoomCode) return;
    navigator.clipboard.writeText(_inviteRoomCode).catch(function() {
      var ta = document.createElement('textarea');
      ta.value = _inviteRoomCode;
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    });
    var btn = event.target;
    var orig = btn.textContent;
    btn.textContent = '✓ Code copied!';
    setTimeout(function() { btn.textContent = orig; }, 1800);
  };

  window._joinRoomByCode = function() {
    var inp = document.getElementById('invJoinInput');
    var err = document.getElementById('invJoinError');
    var code = (inp ? inp.value.trim().toUpperCase() : '');
    if (!code || code.length < 4) {
      if (err) err.textContent = 'Enter a valid room code.';
      return;
    }
    if (err) err.textContent = '';
    // Use existing join logic
    var url = _getBaseUrl() + '?room=' + code;
    if (typeof startJoinRoom === 'function') {
      if (typeof state !== 'undefined') state._pendingRoomCode = code;
      window._closeInvitePanel();
      startJoinRoom();
    } else {
      // Navigate to room URL as fallback
      window.location.href = url;
    }
  };

  /* ─────────────────────────────────────────────
     Update player name on game screen entry
  ───────────────────────────────────────────── */
  // Patch goTo to update name whenever game screen is shown
  var _origGoTo = window.goTo;
  if (typeof _origGoTo === 'function') {
    window.goTo = function(id) {
      var result = _origGoTo.apply(this, arguments);
      if (id === 'game') {
        setTimeout(function() {
          var _raw = (typeof getLoggedInName === 'function') ? getLoggedInName('') : '';
          var name = (!_raw || _raw === '__pending__') ? (function(){try{return localStorage.getItem('playerName')||'Guest';}catch(e){return 'Guest';}}()) : _raw;
          var nameEl = document.getElementById('hdrPlayerName');
          if (nameEl) nameEl.textContent = name;
        }, 100);
      }
      return result;
    };
  }

})();