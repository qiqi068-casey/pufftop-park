/* ==========================================================================
   Pufftop Park — first-person walk mode
   A deliberately small walking layer: eye-height movement, gentle collision
   and short attraction cards. It never touches the ride animations.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;

  P.createWalkMode = function (world, refs) {
    var camera = world.camera;
    var controls = world.controls;
    var island = world.island;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var state = 'orbit'; // orbit | entering | walking | exiting
    var saved = null;
    var transition = null;
    var keys = Object.create(null);
    var joystick = { x: 0, y: 0 };
    var lookId = null;
    var lookX = 0;
    var lookY = 0;
    var player = { x: 0, z: 9.7, yaw: 0, pitch: -0.045 };
    var card = null;
    var cardTimer = 0;
    var cardCloseTimer = 0;
    var near = Object.create(null);

    var entry = document.getElementById('explore-entry');
    var startButton = document.getElementById('start-exploring');
    var freeButton = document.getElementById('free-orbit');
    var backButton = document.getElementById('back-to-sky');
    var cardEl = document.getElementById('attraction-card');
    var cardName = document.getElementById('attraction-name');
    var cardText = document.getElementById('attraction-text');
    var cardClose = document.getElementById('attraction-close');
    var walkHud = document.getElementById('walk-hud');
    var stick = document.getElementById('walk-stick');
    var knob = document.getElementById('walk-stick-knob');
    var canvas = world.renderer.domElement;
    var visitors = island.getObjectByName('Visitors');

    var attractions = [
      {
        key: 'ferris',
        name: 'The Ferris Wheel',
        x: -7.0,
        z: -4.4,
        trigger: 6.8,
        text: 'The wheel turns slowly enough to hear the ropes. From the top, the park looks like a handful of sweets left on a cloud.'
      },
      {
        key: 'carousel',
        name: 'The Carousel',
        x: 5.2,
        z: -4.8,
        trigger: 5.2,
        text: 'Six horses, one painted sky, and a brass pole for every hand. The music starts before you decide which horse to choose.'
      },
      {
        key: 'coaster',
        name: 'The Comet Coaster',
        x: 3.3,
        z: -12.15,
        trigger: 4.4,
        text: 'The Comet leaves the station with a polite click, then spends the rest of the lap pretending it is a much wilder ride.'
      },
      {
        key: 'fountain',
        name: 'The Fountain',
        x: 0,
        z: 4.4,
        trigger: 3.8,
        text: 'The water keeps a small, bright secret: every coin at the bottom is a wish someone forgot to say out loud.'
      },
      {
        key: 'entrance',
        name: 'The Entrance Arch',
        x: 0,
        z: 13.4,
        trigger: 3.4,
        text: 'The arch is the only part of the park that never moves. Everything past it is allowed to drift, turn, or float away.'
      }
    ];

    // The coaster curve is the only "wall" that is not a simple circle.
    var trackPoints = [];
    if (refs && refs.rides && refs.rides.coaster && refs.rides.coaster.curve) {
      var samples = refs.rides.coaster.curve.getPoints(180);
      for (var s = 0; s < samples.length; s++) {
        trackPoints.push({ x: samples[s].x, z: samples[s].z });
      }
    }

    var blockers = [
      { x: 0, z: 4.4, r: 2.15 },       // fountain basin
      { x: 5.2, z: -4.8, r: 4.5 },     // carousel deck
      { x: -7.0, z: -4.4, r: 4.9 },    // ferris supports / queue
      { x: 3.3, z: -12.15, r: 2.8 },   // station shed
      { x: -2.0, z: -2.0, r: 1.55 },   // the relocated tree
      { x: -4.8, z: 9.2, r: 1.4 },     // old tree spot, kept safe
      { x: -10.8, z: -7.2, r: 1.3 },
      { x: -11.7, z: 7.7, r: 1.55 },
      { x: -3.4, z: 12.2, r: 1.25 },
      { x: -2.1, z: -13.1, r: 1.2 }
    ];

    function setEntryHidden(hidden) {
      if (!entry) return;
      entry.classList.toggle('is-hidden', hidden);
    }

    function restoreControlState() {
      if (!saved) return;
      controls.target.copy(saved.target);
      controls.theta = controls.thetaTarget = saved.theta;
      controls.phi = controls.phiTarget = saved.phi;
      controls.radius = controls.radiusTarget = saved.radius;
      controls.autoRotate = saved.autoRotate;
      controls.lastInteraction = saved.lastInteraction;
      camera.position.copy(saved.position);
      camera.quaternion.copy(saved.quaternion);
      camera.fov = saved.fov;
      camera.updateProjectionMatrix();
      controls.enabled = true;
    }

    function blocked(x, z) {
      if (Math.hypot(x, z) > 14.35) return true;
      for (var b = 0; b < blockers.length; b++) {
        var o = blockers[b];
        if (Math.hypot(x - o.x, z - o.z) < o.r) return true;
      }
      for (var t = 0; t < trackPoints.length; t++) {
        var p = trackPoints[t];
        if (Math.hypot(x - p.x, z - p.z) < 0.72) return true;
      }
      return false;
    }

    function targetPosition() {
      return new T.Vector3(
        player.x,
        P.islandHeight(player.x, player.z) + island.position.y + 1.6,
        player.z
      );
    }

    function targetQuaternion() {
      var helper = new T.PerspectiveCamera();
      helper.position.copy(targetPosition());
      helper.lookAt(0, helper.position.y - 0.12, 4.4);
      return helper.quaternion.clone();
    }

    function beginTransition(toPosition, toQuaternion, done) {
      transition = {
        fromPosition: camera.position.clone(),
        fromQuaternion: camera.quaternion.clone(),
        toPosition: toPosition.clone(),
        toQuaternion: toQuaternion.clone(),
        t: 0,
        duration: reduceMotion ? 0.01 : 2.15,
        done: done
      };
    }

    function enter() {
      if (state !== 'orbit' || !controls) return;
      state = 'entering';
      setEntryHidden(true);
      closeCard();
      saved = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        target: controls.target.clone(),
        theta: controls.theta,
        phi: controls.phi,
        radius: controls.radius,
        autoRotate: controls.autoRotate,
        lastInteraction: controls.lastInteraction,
        fov: camera.fov
      };
      controls.enabled = false;
      controls.autoRotate = false;
      camera.fov = 64;
      camera.updateProjectionMatrix();
      if (visitors) visitors.visible = false;
      player.x = 0;
      player.z = 9.7;
      player.yaw = 0;
      player.pitch = -0.045;
      beginTransition(targetPosition(), targetQuaternion(), function () {
        state = 'walking';
        document.body.classList.add('is-walking');
        if (walkHud) walkHud.setAttribute('aria-hidden', 'false');
        if (backButton) backButton.classList.add('is-visible');
      });
    }

    function exit() {
      if (state !== 'walking') return;
      state = 'exiting';
      closeCard();
      if (document.body.classList.contains('is-walking')) {
        document.body.classList.remove('is-walking');
      }
      if (walkHud) walkHud.setAttribute('aria-hidden', 'true');
      if (backButton) backButton.classList.remove('is-visible');
      if (visitors) visitors.visible = true;
      beginTransition(saved.position || camera.position, saved.quaternion || camera.quaternion, function () {
        state = 'orbit';
        transition = null;
        restoreControlState();
        setEntryHidden(false);
        saved = null;
      });
    }

    function updateTransition(dt) {
      if (!transition) return;
      transition.t += dt;
      var p = Math.min(transition.t / transition.duration, 1);
      var eased = p * p * (3 - 2 * p);
      camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
      camera.quaternion.copy(transition.fromQuaternion).slerp(
        transition.toQuaternion,
        eased
      );
      if (p >= 1) {
        var done = transition.done;
        transition = null;
        if (done) done();
      }
    }

    function updateMovement(dt) {
      var forward = (keys.w ? 1 : 0) - (keys.s ? 1 : 0) - joystick.y;
      var strafe = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joystick.x;
      var len = Math.hypot(forward, strafe);
      if (len < 0.01) return;
      if (len > 1) {
        forward /= len;
        strafe /= len;
      }

      var speed = keys.shift ? 4.5 : 2.8;
      var sin = Math.sin(player.yaw);
      var cos = Math.cos(player.yaw);
      // Camera at yaw 0 looks down -Z.
      var dx = (-sin * forward + cos * strafe) * speed * dt;
      var dz = (-cos * forward - sin * strafe) * speed * dt;

      if (!blocked(player.x + dx, player.z)) player.x += dx;
      if (!blocked(player.x, player.z + dz)) player.z += dz;
    }

    function updateCamera() {
      if (camera.fov !== 64) {
        camera.fov = 64;
        camera.updateProjectionMatrix();
      }
      var y = P.islandHeight(player.x, player.z) + island.position.y + 1.6;
      camera.position.set(player.x, y, player.z);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(player.pitch, player.yaw, 0);
    }

    function openCard(attraction) {
      if (card || (P.narrative && P.narrative.isDialogueOpen())) return;
      card = attraction;
      if (cardName) cardName.textContent = attraction.name;
      if (cardText) cardText.textContent = attraction.text;
      if (cardEl) {
        cardEl.classList.add('is-visible');
        cardEl.setAttribute('aria-hidden', 'false');
      }
      cardTimer = 4.6;
    }

    function closeCard() {
      card = null;
      cardTimer = 0;
      if (cardEl) {
        cardEl.classList.remove('is-visible');
        cardEl.setAttribute('aria-hidden', 'true');
      }
    }

    function updateCards(dt) {
      if (card) {
        cardTimer -= dt;
        if (cardTimer <= 0) closeCard();
      }
      if (cardCloseTimer > 0) cardCloseTimer -= dt;

      for (var i = 0; i < attractions.length; i++) {
        var a = attractions[i];
        var isNear = Math.hypot(player.x - a.x, player.z - a.z) < a.trigger;
        if (isNear && !near[a.key]) {
          near[a.key] = true;
          if (!card && !(P.narrative && P.narrative.isDialogueOpen())) openCard(a);
        } else if (!isNear) {
          near[a.key] = false;
        }
      }
    }

    function update(dt) {
      if (state === 'entering' || state === 'exiting') {
        updateTransition(dt);
        if (state === 'walking') updateCamera();
        return;
      }
      if (state !== 'walking') return;
      updateMovement(dt);
      updateCamera();
      updateCards(dt);
    }

    function isActive() { return state === 'walking'; }
    function isBusy() { return state === 'entering' || state === 'exiting'; }
    function isCardOpen() { return !!card; }
    function getPosition() {
      return new T.Vector3(player.x, P.islandHeight(player.x, player.z), player.z);
    }

    function setEntryVisible(visible) {
      if (!entry) return;
      entry.classList.toggle('is-hidden', !visible);
    }

    /* ----------------------------- inputs -------------------------------- */

    if (startButton) {
      startButton.addEventListener('click', function (event) {
        event.stopPropagation();
        enter();
      });
    }
    if (freeButton) {
      freeButton.addEventListener('click', function (event) {
        event.stopPropagation();
        setEntryHidden(true);
      });
    }
    if (backButton) {
      backButton.addEventListener('click', function (event) {
        event.stopPropagation();
        exit();
      });
    }
    if (cardClose) {
      cardClose.addEventListener('click', function (event) {
        event.stopPropagation();
        closeCard();
      });
    }

    window.addEventListener('keydown', function (event) {
      var tag = (event.target && event.target.tagName) || '';
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      if (event.key === 'Escape') {
        if (state === 'walking' && !(P.narrative && P.narrative.isDialogueOpen())) {
          event.preventDefault();
          exit();
        }
        return;
      }
      if (state === 'walking') {
        if (event.key === 'w' || event.key === 'W' || event.key === 'ArrowUp') keys.w = true;
        if (event.key === 's' || event.key === 'S' || event.key === 'ArrowDown') keys.s = true;
        if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') keys.a = true;
        if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') keys.d = true;
        if (event.key === 'Shift') keys.shift = true;
      }
    });

    window.addEventListener('keyup', function (event) {
      if (event.key === 'w' || event.key === 'W' || event.key === 'ArrowUp') keys.w = false;
      if (event.key === 's' || event.key === 'S' || event.key === 'ArrowDown') keys.s = false;
      if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') keys.a = false;
      if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') keys.d = false;
      if (event.key === 'Shift') keys.shift = false;
    });

    canvas.addEventListener('pointerdown', function (event) {
      if (state !== 'walking') return;
      lookId = event.pointerId;
      lookX = event.clientX;
      lookY = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* noop */ }
    });

    canvas.addEventListener('pointermove', function (event) {
      if (state !== 'walking' || event.pointerId !== lookId) return;
      var dx = event.clientX - lookX;
      var dy = event.clientY - lookY;
      lookX = event.clientX;
      lookY = event.clientY;
      player.yaw -= dx * 0.0032;
      player.pitch -= dy * 0.0032;
      player.pitch = P.clamp(player.pitch, -1.15, 1.15);
    });

    function endLook(event) {
      if (event.pointerId !== lookId) return;
      lookId = null;
    }
    window.addEventListener('pointerup', endLook);
    window.addEventListener('pointercancel', endLook);

    function stickUpdate(event) {
      if (!stick) return;
      var rect = stick.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = event.clientX - cx;
      var dy = event.clientY - cy;
      var max = rect.width * 0.34;
      var len = Math.hypot(dx, dy);
      if (len > max) {
        dx = dx / len * max;
        dy = dy / len * max;
      }
      joystick.x = dx / max;
      joystick.y = dy / max;
      if (knob) knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    }

    if (stick) {
      stick.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        stick.setPointerCapture(event.pointerId);
        stickUpdate(event);
      });
      stick.addEventListener('pointermove', function (event) {
        if (!stick.hasPointerCapture(event.pointerId)) return;
        stickUpdate(event);
      });
      function stickEnd(event) {
        if (stick.hasPointerCapture(event.pointerId)) {
          try { stick.releasePointerCapture(event.pointerId); } catch (err) { /* noop */ }
        }
        joystick.x = 0;
        joystick.y = 0;
        if (knob) knob.style.transform = 'translate(0,0)';
      }
      stick.addEventListener('pointerup', stickEnd);
      stick.addEventListener('pointercancel', stickEnd);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        keys.w = keys.a = keys.s = keys.d = keys.shift = false;
        joystick.x = joystick.y = 0;
      }
    });

    return {
      enter: enter,
      exit: exit,
      update: update,
      isActive: isActive,
      isBusy: isBusy,
      isCardOpen: isCardOpen,
      closeCard: closeCard,
      getPosition: getPosition,
      setEntryVisible: setEntryVisible,
      state: function () { return state; }
    };
  };
})();
