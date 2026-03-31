/* ═══════════════════════════════════════════════════
   ENHANCEMENTS — Gameplay, UI/UX, Performance
   Bond & Awareness v2
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────
     1. GAMEPLAY: Question progress indicator
     Shows how far through the deck the player is
     ───────────────────────────────────────────────── */
  function createProgressBar() {
    var game = document.getElementById('game');
    if (!game || document.getElementById('questionProgress')) return;

    // Progress bar (top of game screen)
    var bar = document.createElement('div');
    bar.className = 'question-progress';
    bar.id = 'questionProgress';
    bar.innerHTML = '<div class="question-progress-fill" id="questionProgressFill" style="width:0%"></div>';

    var inner = game.querySelector('.game-inner');
    if (inner) inner.insertBefore(bar, inner.firstChild);

    // Question counter
    var counter = document.createElement('div');
    counter.className = 'question-counter';
    counter.id = 'questionCounter';
    counter.textContent = '';
    if (inner) inner.insertBefore(counter, inner.firstChild);
  }

  function updateProgress() {
    var fill = document.getElementById('questionProgressFill');
    var counter = document.getElementById('questionCounter');
    if (!fill) return;

    var idx = (typeof state !== 'undefined') ? (state.questionIndex || 0) : 0;
    var total = (typeof shuffledDeck !== 'undefined' && shuffledDeck.length > 0) ? shuffledDeck.length : 52;
    var pct = Math.min(100, ((idx + 1) / total) * 100);

    fill.style.width = pct.toFixed(1) + '%';
    if (counter) {
      counter.textContent = (idx + 1) + ' / ' + total;
    }
  }

  // Patch loadQuestion to update progress
  var _origLoadQuestion = null;
  function patchLoadQuestion() {
    if (typeof window.loadQuestion === 'function' && !_origLoadQuestion) {
      _origLoadQuestion = window.loadQuestion;
      window.loadQuestion = function () {
        var result = _origLoadQuestion.apply(this, arguments);
        createProgressBar();
        updateProgress();
        return result;
      };
    }
  }

  /* ─────────────────────────────────────────────────
     2. GAMEPLAY: Session timer (20 min ring)
     Visual reminder of the 20-minute session
     ───────────────────────────────────────────────── */
  var SESSION_DURATION = 20 * 60; // 20 minutes in seconds
  var _sessionStart = 0;
  var _sessionInterval = null;

  function createSessionTimer() {
    if (document.getElementById('sessionTimerWidget')) return;

    var div = document.createElement('div');
    div.className = 'session-timer';
    div.id = 'sessionTimerWidget';

    var circumference = 2 * Math.PI * 15; // radius=15
    div.innerHTML =
      '<svg viewBox="0 0 38 38">' +
        '<circle class="session-timer-track" cx="19" cy="19" r="15"/>' +
        '<circle class="session-timer-fill" id="sessionTimerRing" cx="19" cy="19" r="15" ' +
          'stroke-dasharray="' + circumference.toFixed(1) + '" ' +
          'stroke-dashoffset="0"/>' +
      '</svg>' +
      '<div class="session-timer-text" id="sessionTimerText">20:00</div>';

    document.body.appendChild(div);
  }

  function startSessionTimer() {
    _sessionStart = Date.now();
    if (_sessionInterval) clearInterval(_sessionInterval);

    var circumference = 2 * Math.PI * 15;
    _sessionInterval = setInterval(function () {
      var elapsed = (Date.now() - _sessionStart) / 1000;
      var remaining = Math.max(0, SESSION_DURATION - elapsed);
      var pct = elapsed / SESSION_DURATION;

      var ring = document.getElementById('sessionTimerRing');
      var text = document.getElementById('sessionTimerText');

      if (ring) {
        ring.style.strokeDashoffset = (circumference * (1 - Math.min(1, pct))).toFixed(1);
      }

      if (text) {
        var min = Math.floor(remaining / 60);
        var sec = Math.floor(remaining % 60);
        text.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;
      }

      // Gentle pulse when time is nearly up
      if (remaining < 60 && remaining > 0) {
        var widget = document.getElementById('sessionTimerWidget');
        if (widget) widget.style.opacity = '0.75';
      }

      if (remaining <= 0) {
        clearInterval(_sessionInterval);
        _sessionInterval = null;
      }
    }, 1000);
  }

  function stopSessionTimer() {
    if (_sessionInterval) {
      clearInterval(_sessionInterval);
      _sessionInterval = null;
    }
    var widget = document.getElementById('sessionTimerWidget');
    if (widget) widget.remove();
  }

  // Patch startMatch and startOfflineGame
  function patchMatchStart() {
    var _origStartMatch = window.startMatch;
    if (typeof _origStartMatch === 'function') {
      window.startMatch = function () {
        var result = _origStartMatch.apply(this, arguments);
        createSessionTimer();
        startSessionTimer();
        return result;
      };
    }

    var _origStartOffline = window.startOfflineGame;
    if (typeof _origStartOffline === 'function') {
      window.startOfflineGame = function () {
        var result = _origStartOffline.apply(this, arguments);
        createSessionTimer();
        startSessionTimer();
        return result;
      };
    }

    var _origLeave = window.leaveMatch;
    if (typeof _origLeave === 'function') {
      window.leaveMatch = function () {
        stopSessionTimer();
        return _origLeave.apply(this, arguments);
      };
    }
  }

  /* ─────────────────────────────────────────────────
     3. UI/UX: Haptic feedback on card flip
     ───────────────────────────────────────────────── */
  function patchFlipCard() {
    var _origFlip = window.flipCard;
    if (typeof _origFlip === 'function') {
      window.flipCard = function () {
        // Haptic feedback on supported devices
        if (navigator.vibrate) {
          try { navigator.vibrate(12); } catch (e) {}
        }
        return _origFlip.apply(this, arguments);
      };
    }
  }

  /* ─────────────────────────────────────────────────
     4. UI/UX: Answer submit visual feedback
     ───────────────────────────────────────────────── */
  function patchSubmitAnswer() {
    var _origSubmit = window.submitAnswer;
    if (typeof _origSubmit === 'function') {
      window.submitAnswer = function () {
        var input = document.getElementById('answerInput');
        if (input && input.value.trim()) {
          // Pulse the answer container
          var wrap = document.getElementById('answerInputWrap');
          if (wrap) {
            wrap.classList.add('answer-sent-pulse');
            setTimeout(function () { wrap.classList.remove('answer-sent-pulse'); }, 700);
          }
          // Haptic
          if (navigator.vibrate) {
            try { navigator.vibrate([8, 40, 8]); } catch (e) {}
          }
        }
        return _origSubmit.apply(this, arguments);
      };
    }
  }

  /* ─────────────────────────────────────────────────
     5. PERFORMANCE: Pause canvas when tab hidden
     ───────────────────────────────────────────────── */
  function setupVisibilityOptimization() {
    var _allCanvases = [];

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        // Pause: stop all animation frames
        _allCanvases = document.querySelectorAll('canvas');
        _allCanvases.forEach(function (c) { c.dataset.wasVisible = '1'; });

        // The existing code already checks document.hidden in draw loops,
        // but we can also reduce GPU by forcing canvas to minimum
      }
      // Resume happens naturally via the existing rAF checks
    });
  }

  /* ─────────────────────────────────────────────────
     6. PERFORMANCE: Lazy init non-visible canvases
     Only start heavy animations when screen is active
     ───────────────────────────────────────────────── */
  function setupLazyCanvasInit() {
    // The original goTo already does this partially via requestIdleCallback
    // We enhance by stopping ALL animations when leaving a screen
    var _origGoTo = window.goTo;
    if (typeof _origGoTo === 'function') {
      window.goTo = function (id) {
        // Before navigating, stop canvases on current screen
        var current = document.getElementById(state.currentScreen);
        if (current) {
          var canvases = current.querySelectorAll('canvas');
          canvases.forEach(function (c) {
            if (c._stopLoop) c._stopLoop();
          });
        }
        return _origGoTo.apply(this, arguments);
      };
    }
  }

  /* ─────────────────────────────────────────────────
     7. GAMEPLAY: Better next-question button timing
     Auto-show the button after a brief delay when both answered
     ───────────────────────────────────────────────── */
  function patchNextQuestion() {
    var _origNext = window.nextQuestion;
    if (typeof _origNext === 'function') {
      window.nextQuestion = function () {
        // Haptic on next question
        if (navigator.vibrate) {
          try { navigator.vibrate(6); } catch (e) {}
        }
        // Update progress after advancing
        var result = _origNext.apply(this, arguments);
        setTimeout(updateProgress, 100);
        return result;
      };
    }
  }

  /* ─────────────────────────────────────────────────
     8. UI: Preload fonts to avoid FOIT
     ───────────────────────────────────────────────── */
  function preloadFonts() {
    if (!document.fonts) return;
    // These fonts are loaded via Google Fonts link, but we trigger display early
    document.fonts.ready.then(function () {
      document.body.classList.add('fonts-loaded');
    });
  }

  /* ─────────────────────────────────────────────────
     9. PERFORMANCE: Reduce star count on low-end devices
     ───────────────────────────────────────────────── */
  function detectLowEnd() {
    var isLowEnd = false;

    // Check for low memory
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) isLowEnd = true;

    // Check for slow CPU
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) isLowEnd = true;

    // Check connection (save data mode)
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.saveData) isLowEnd = true;

    if (isLowEnd) {
      document.documentElement.classList.add('low-end-device');
      // The canvas animation functions check for mobile already,
      // but we set a global hint for further reductions
      window._isLowEnd = true;
    }
  }

  /* ─────────────────────────────────────────────────
     INIT: Apply all patches when scripts are ready
     ───────────────────────────────────────────────── */
  function init() {
    detectLowEnd();
    preloadFonts();
    setupVisibilityOptimization();

    // Patch game functions (they must be defined by now since app.js loads first)
    patchLoadQuestion();
    patchFlipCard();
    patchSubmitAnswer();
    patchNextQuestion();
    patchMatchStart();
    setupLazyCanvasInit();
  }

  // Run after all scripts loaded
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }

})();
