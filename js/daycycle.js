/* ==========================================================================
   Pufftop Park — a slow, optional day cycle
   The three lighting buttons stay king. AUTO simply advances the same
   atmosphere state on a timer; touching a mode pauses it.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;

  P.createDayCycle = function (options) {
    var opts = options || {};
    var order = ['day', 'dusk', 'night'];
    var durations = { day: 40, dusk: 25, night: 55 };
    var phase = 'day';
    var phaseTime = 0;
    var auto = true;
    var toastTimer = 0;

    var toggle = document.getElementById('auto-toggle');
    var label = document.getElementById('auto-label');
    var toast = document.getElementById('day-toast');

    function render() {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', auto ? 'true' : 'false');
      toggle.classList.toggle('is-off', !auto);
      if (label) label.textContent = auto ? 'AUTO' : 'PAUSED';
      toggle.setAttribute('aria-label', auto ? 'Pause automatic day cycle' : 'Resume automatic day cycle');
    }

    function showToast() {
      if (!toast) return;
      toast.classList.add('is-visible');
      toastTimer = 3.4;
    }

    function hideToast() {
      if (!toast) return;
      toast.classList.remove('is-visible');
    }

    function nextPhase() {
      var index = order.indexOf(phase);
      phase = order[(index + 1) % order.length];
      phaseTime = 0;
      if (phase === 'day') showToast();
      if (opts.onPhase) opts.onPhase(phase, 'auto');
    }

    function update(dt) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) hideToast();
      }
      if (!auto || document.hidden) return;
      phaseTime += dt;
      if (phaseTime >= durations[phase]) nextPhase();
    }

    function pause() {
      auto = false;
      render();
    }

    function resume() {
      auto = true;
      render();
    }

    function manual(mode) {
      if (durations[mode] === undefined) return;
      phase = mode;
      phaseTime = 0;
      pause();
    }

    function sync(mode) {
      if (durations[mode] === undefined) return;
      phase = mode;
      phaseTime = 0;
      render();
    }

    if (toggle) {
      toggle.addEventListener('click', function (event) {
        event.stopPropagation();
        if (auto) pause();
        else resume();
      });
    }

    render();

    return {
      update: update,
      pause: pause,
      resume: resume,
      manual: manual,
      sync: sync,
      phase: function () { return phase; },
      isAuto: function () { return auto; }
    };
  };
})();
