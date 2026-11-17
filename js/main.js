/* ==========================================================================
   Pufftop Park — bootstrap and animation loop
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;

  function showFatal(message) {
    var loading = document.getElementById('loading');
    if (!loading) return;
    loading.innerHTML =
      '<div class="loader-copy">' +
      '<p class="loader-kicker">PUFFTOP PARK</p>' +
      '<h2>The clouds drifted away.</h2>' +
      '<p class="loader-error">' + message + '</p>' +
      '</div>';
    loading.classList.add('is-error');
  }

  function boot() {
    if (!window.THREE) {
      showFatal('Three.js could not be found in js/vendor/three.min.js.');
      return;
    }

    var world = P.createWorld();
    var rides = P.createRides(world);
    var park = P.createPark(world);
    var atmosphere = P.createAtmosphere(world, { rides: rides, park: park });

    var renderer = world.renderer;
    var camera = world.camera;
    var controls = world.controls;

    var modeWord = document.getElementById('mode-word');
    var modeButtons = Array.prototype.slice.call(
      document.querySelectorAll('.mode-choice')
    );

    var modeCopy = {
      day: { word: 'DAYLIGHT', title: 'Pufftop Park · Above the Clouds' },
      dusk: { word: 'GOLDEN HOUR', title: 'Pufftop Park · Golden Hour' },
      night: { word: 'MOONLIGHT', title: 'Pufftop Park · Moonlight' }
    };

    var clock = new T.Clock();
    var elapsed = 0;
    var started = false;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var motionScale = reduceMotion ? 0.32 : 1;
    var modeHint = document.getElementById('mode-hint');
    var hintDismissed = false;

    var petals = world.petals;
    var cloudClusters = world.clouds.userData.clusters;

    controls.autoRotate = !reduceMotion;

    function dismissHint() {
      if (hintDismissed || !modeHint) return;
      hintDismissed = true;
      modeHint.classList.add('is-hidden');
    }

    function applyMode(mode) {
      if (!modeCopy[mode]) return;
      atmosphere.setMode(mode);
      document.body.setAttribute('data-mode', mode);
      modeWord.textContent = modeCopy[mode].word;
      document.title = modeCopy[mode].title;

      for (var i = 0; i < modeButtons.length; i++) {
        modeButtons[i].setAttribute(
          'aria-pressed',
          modeButtons[i].getAttribute('data-mode') === mode ? 'true' : 'false'
        );
      }
    }

    for (var mb = 0; mb < modeButtons.length; mb++) {
      modeButtons[mb].addEventListener('click', function () {
        dismissHint();
        applyMode(this.getAttribute('data-mode'));
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var tag = (event.target && event.target.tagName) || '';
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      if (event.key === '1') { dismissHint(); applyMode('day'); }
      else if (event.key === '2') { dismissHint(); applyMode('dusk'); }
      else if (event.key === '3') { dismissHint(); applyMode('night'); }
    });

    if (modeHint) {
      window.setTimeout(dismissHint, reduceMotion ? 5200 : 8000);
    }

    // fade the curtain once the first frame is on screen
    function reveal() {
      if (started) return;
      started = true;
      window.__PUFFTOP_READY__ = true;
      document.documentElement.setAttribute('data-park-ready', 'true');
      window.setTimeout(function () {
        document.body.classList.add('is-ready');
      }, 320);
    }

    function animate() {
      window.requestAnimationFrame(animate);
      var dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;
      var motionDt = dt * motionScale;
      var motionTime = elapsed * motionScale;
      world.elapsed = elapsed;

      // The whole island floats on a very slow breath.
      world.island.position.y = Math.sin(motionTime * 0.34) * 0.13;

      // Clouds drift almost imperceptibly.
      for (var c = 0; c < cloudClusters.length; c++) {
        var cluster = cloudClusters[c];
        cluster.mesh.position.x =
          cluster.baseX + Math.sin(motionTime * 0.042 + cluster.phase) * cluster.drift;
        cluster.mesh.position.y =
          cluster.baseY + Math.sin(motionTime * 0.19 + cluster.phase) * 0.16;
      }

      // Pastel petals drifting down around the island.
      if (petals) petals.update(motionTime);

      for (var u = 0; u < world.updaters.length; u++) {
        world.updaters[u](motionDt, motionTime);
      }

      atmosphere.update(motionDt, motionTime);
      controls.update(dt);
      atmosphere.render(dt);

      if (!started && renderer.info.render.frame > 0) reveal();
    }

    var narrowMode = null;

    function resize() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      var aspect = w / h;
      var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(w, h);
      camera.aspect = aspect;
      camera.fov = aspect < 0.85 ? 62 : aspect < 1.15 ? 49 : 42;
      camera.updateProjectionMatrix();
      atmosphere.resize(w, h, pixelRatio);

      // Portrait screens need a wider orbit so the whole island can breathe.
      var narrow = aspect < 0.82;
      if (narrow !== narrowMode) {
        narrowMode = narrow;
        var framingRadius = narrow ? 66 : 43.76;
        controls.maxRadius = narrow ? 100 : 62;
        controls.radius = controls.radiusTarget = framingRadius;
        var sp = Math.sin(controls.phi);
        controls.homePosition.set(
          controls.target.x + framingRadius * sp * Math.sin(controls.theta),
          controls.target.y + framingRadius * Math.cos(controls.phi),
          controls.target.z + framingRadius * sp * Math.cos(controls.theta)
        );
        controls.homeTarget.copy(controls.target);
        controls.lastInteraction = performance.now();
      }
    }

    window.addEventListener('resize', resize);
    resize();
    applyMode('day');
    animate();

    // small debug handle for the curious; harmless in production
    window.__PUFFTOP__ = {
      world: world,
      rides: rides,
      park: park,
      atmosphere: atmosphere,
      applyMode: applyMode
    };

    console.log(
      '%c Pufftop Park %c a small world above the clouds ',
      'background:#ffb6c9;color:#5b4b5e;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold',
      'background:#fff7e9;color:#837181;padding:4px 8px;border-radius:0 4px 4px 0'
    );
  }

  try {
    boot();
  } catch (error) {
    console.error(error);
    showFatal(
      'The park could not be assembled. Try a browser with WebGL enabled, then refresh.'
    );
    document.body.classList.add('has-error');
  }
})();
