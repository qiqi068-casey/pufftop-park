/* ==========================================================================
   Pufftop Park — night fireworks
   A small choreographed show: rocket launch, peony / willow / ring bursts,
   short motion trails, a colored core flash and a soft local light.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;

  var SPARK_VERTEX = [
    'attribute float aSize;',
    'attribute float aAlpha;',
    'attribute vec3 aColor;',
    'uniform float uPointScale;',
    'uniform float uOpacity;',
    'varying float vAlpha;',
    'varying vec3 vColor;',
    'void main() {',
    '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
    '  gl_PointSize = clamp(aSize * uPointScale / max(1.0, -mvPosition.z), 1.0, 58.0);',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  vAlpha = aAlpha * uOpacity;',
    '  vColor = aColor;',
    '}'
  ].join('\n');

  var SPARK_FRAGMENT = [
    'varying float vAlpha;',
    'varying vec3 vColor;',
    'void main() {',
    '  vec2 p = gl_PointCoord - vec2(0.5);',
    '  float d = length(p) * 2.0;',
    '  if (d > 1.0) discard;',
    '  float core = smoothstep(0.48, 0.0, d);',
    '  float halo = pow(clamp(1.0 - d, 0.0, 1.0), 3.0);',
    '  gl_FragColor = vec4(vColor, (core * 0.95 + halo * 0.16) * vAlpha);',
    '}'
  ].join('\n');

  P.createFireworks = function (scene) {
    var BURST_COUNT = 4;
    var PARTICLES = 150;
    var TRAIL_SAMPLES = 4;
    var SAMPLES = TRAIL_SAMPLES + 1;
    var PER_BURST = PARTICLES * SAMPLES;
    var TOTAL = BURST_COUNT * PER_BURST;
    var TRAIL_ALPHA = [0.55, 0.32, 0.18, 0.09];
    var rnd = P.rng(7021);

    var PALETTES = [
      { shell: new T.Color(0xffc85a), core: new T.Color(0xfff3c4), ember: new T.Color(0xff9a4d) },
      { shell: new T.Color(0xff8fbf), core: new T.Color(0xffe0ee), ember: new T.Color(0xffb07c) },
      { shell: new T.Color(0x79e0c1), core: new T.Color(0xe8fff7), ember: new T.Color(0xffd48a) },
      { shell: new T.Color(0xb99cff), core: new T.Color(0xf0e8ff), ember: new T.Color(0xffb6d9) }
    ];

    var positions = new Float32Array(TOTAL * 3);
    var colors = new Float32Array(TOTAL * 3);
    var alphas = new Float32Array(TOTAL);
    var sizes = new Float32Array(TOTAL);
    var velocities = new Float32Array(BURST_COUNT * PARTICLES * 3);
    var mainSizes = new Float32Array(BURST_COUNT * PARTICLES);
    var bursts = [];
    var queue = [];
    var showTimer = 2.4;
    var showIndex = 0;

    for (var b = 0; b < BURST_COUNT; b++) {
      bursts.push({
        active: false,
        exploded: false,
        age: 0,
        launchAge: 0,
        launchDuration: 1.1,
        life: 2.6,
        type: 'peony',
        trailCount: 2,
        trailGap: 0.045,
        gravity: 2.6,
        drag: 0.55,
        center: new T.Vector3(),
        start: new T.Vector3(),
        palette: PALETTES[0]
      });
    }

    for (var i = 0; i < TOTAL; i++) {
      positions[i * 3 + 1] = -100;
      alphas[i] = 0;
      sizes[i] = 0.1;
    }

    var geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new T.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('aAlpha', new T.Float32BufferAttribute(alphas, 1));
    geometry.setAttribute('aSize', new T.Float32BufferAttribute(sizes, 1));

    var material = new T.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uPointScale: { value: 1000 }
      },
      vertexShader: SPARK_VERTEX,
      fragmentShader: SPARK_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: T.AdditiveBlending
    });

    var points = new T.Points(geometry, material);
    points.name = 'Fireworks';
    points.frustumCulled = false;
    points.visible = false;
    points.renderOrder = 5;
    scene.add(points);

    var colorAttribute = geometry.attributes.aColor;
    var alphaAttribute = geometry.attributes.aAlpha;
    var positionAttribute = geometry.attributes.position;
    var sizeAttribute = geometry.attributes.aSize;
    var colorArray = colorAttribute.array;
    var alphaArray = alphaAttribute.array;
    var positionArray = positionAttribute.array;
    var sizeArray = sizeAttribute.array;

    var flash = new T.Sprite(new T.SpriteMaterial({
      map: P.glowTexture,
      color: 0xfff3c4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: T.AdditiveBlending,
      fog: false
    }));
    flash.scale.set(2.5, 2.5, 1);
    flash.visible = false;
    flash.name = 'FireworkFlash';
    scene.add(flash);

    var rocketGlow = new T.Sprite(new T.SpriteMaterial({
      map: P.glowTexture,
      color: 0xfff3c4,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: true,
      blending: T.AdditiveBlending,
      fog: false
    }));
    rocketGlow.scale.set(2.2, 2.2, 1);
    rocketGlow.visible = false;
    rocketGlow.name = 'FireworkRocketGlow';
    scene.add(rocketGlow);

    var flashLight = new T.PointLight(0xffffff, 0, 34, 2);
    flashLight.castShadow = false;
    flashLight.name = 'FireworkFlashLight';
    scene.add(flashLight);

    var flashAge = 0;
    var flashDuration = 0.45;
    var flashActive = false;
    var flashColor = new T.Color(0xffffff);

    function setPoint(index, x, y, z, color, size, alpha) {
      positionArray[index * 3] = x;
      positionArray[index * 3 + 1] = y;
      positionArray[index * 3 + 2] = z;
      colorArray[index * 3] = color.r;
      colorArray[index * 3 + 1] = color.g;
      colorArray[index * 3 + 2] = color.b;
      sizeArray[index] = size;
      alphaArray[index] = alpha;
    }

    function clearBurst(burst) {
      var b = bursts.indexOf(burst);
      for (var p = 0; p < PARTICLES; p++) {
        var base = b * PER_BURST + p * SAMPLES;
        for (var s = 0; s < SAMPLES; s++) {
          alphaArray[base + s] = 0;
        }
      }
    }

    function pickPalette(type) {
      if (type === 'willow') return PALETTES[0];
      if (type === 'ring') return PALETTES[3];
      return PALETTES[1 + Math.floor(rnd() * 3)];
    }

    function stagePosition(index) {
      var group = index % 3;
      var x = group === 0 ? -7.5 + rnd() * 2.2 :
        group === 1 ? -2.0 + rnd() * 4.0 :
        4.8 + rnd() * 2.8;
      return new T.Vector3(
        x,
        14.0 + rnd() * 4.6,
        -7.0 + rnd() * 14.0
      );
    }

    function startShow(time) {
      showIndex++;
      var finale = showIndex % 3 === 0;
      var count = finale ? 4 : 2;
      var gap = finale ? 1.4 : 2.8;
      var types = ['peony', 'ring', 'willow', 'peony'];

      for (var e = 0; e < count; e++) {
        queue.push({
          at: time + e * gap,
          type: types[e % types.length],
          center: stagePosition(e)
        });
      }

      showTimer = finale ? 26 + rnd() * 4 : 21 + rnd() * 5;
    }

    function launchBurst(event) {
      var burst = null;
      for (var b = 0; b < bursts.length; b++) {
        if (!bursts[b].active) {
          burst = bursts[b];
          break;
        }
      }
      if (!burst) return false;

      burst.active = true;
      burst.exploded = false;
      burst.age = 0;
      burst.launchAge = 0;
      burst.launchDuration = 1.15 + rnd() * 0.25;
      burst.type = event.type;
      burst.palette = pickPalette(event.type);
      burst.trailCount = event.type === 'willow' ? 4 : event.type === 'ring' ? 3 : 2;
      burst.trailGap = event.type === 'willow' ? 0.105 : 0.070;
      burst.center.copy(event.center);
      burst.start.set(
        burst.center.x * 0.42,
        3.2,
        4.2 + rnd() * 1.2
      );
      burst.life = 2.4;
      burst.gravity = 2.6;
      burst.drag = 0.55;
      clearBurst(burst);

      // The first particle drives the rocket during the launch phase.
      var rocketIndex = bursts.indexOf(burst) * PER_BURST;
      setPoint(rocketIndex, burst.start.x, burst.start.y, burst.start.z,
        burst.palette.core, 0.72, 1);

      colorAttribute.needsUpdate = true;
      alphaAttribute.needsUpdate = true;
      positionAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;
      return true;
    }

    function explodeBurst(burst) {
      var b = bursts.indexOf(burst);
      burst.exploded = true;
      burst.age = 0;
      burst.life = burst.type === 'willow' ? 3.5 + rnd() * 0.7 :
        burst.type === 'ring' ? 2.2 + rnd() * 0.4 :
        2.4 + rnd() * 0.5;
      burst.gravity = burst.type === 'willow' ? 4.6 :
        burst.type === 'ring' ? 2.2 : 2.6;
      burst.drag = burst.type === 'willow' ? 0.34 : 0.55;

      rocketGlow.visible = false;
      flashActive = true;
      flashAge = 0;
      flashColor.copy(burst.palette.core);
      flash.position.copy(burst.center);
      flash.material.color.copy(burst.palette.core);
      flash.visible = true;
      flashLight.position.copy(burst.center);
      flashLight.color.copy(burst.palette.core);
      flashLight.intensity = 1.6;

      var whiteMix = burst.type === 'willow' ? 0.03 : 0.06;
      var baseColor = burst.palette.shell;
      var coreColor = burst.palette.core;
      var emberColor = burst.palette.ember;

      for (var p = 0; p < PARTICLES; p++) {
        var local = b * PARTICLES + p;
        var base = b * PER_BURST + p * SAMPLES;
        var color = baseColor.clone().lerp(coreColor, whiteMix + rnd() * 0.10);
        var trailColor = emberColor;
        var size = (burst.type === 'willow' ? 0.16 : 0.19) + rnd() * 0.20;
        mainSizes[local] = size;

        var vx = 0;
        var vy = 0;
        var vz = 0;

        if (burst.type === 'ring') {
          var n = new T.Vector3(
            rnd() * 2 - 1,
            rnd() * 2 - 1,
            rnd() * 2 - 1
          ).normalize();
          var u = new T.Vector3().crossVectors(n, P.UP);
          if (u.lengthSq() < 0.001) u.set(1, 0, 0);
          u.normalize();
          var v = new T.Vector3().crossVectors(n, u).normalize();
          var angle = rnd() * Math.PI * 2;
          var ringSpeed = 5.7 + rnd() * 0.5;
          vx = (u.x * Math.cos(angle) + v.x * Math.sin(angle)) * ringSpeed + n.x * 0.18;
          vy = (u.y * Math.cos(angle) + v.y * Math.sin(angle)) * ringSpeed + n.y * 0.18;
          vz = (u.z * Math.cos(angle) + v.z * Math.sin(angle)) * ringSpeed + n.z * 0.18;
        } else {
          var z = rnd() * 2 - 1;
          var a = rnd() * Math.PI * 2;
          var r = Math.sqrt(Math.max(0, 1 - z * z));
          var speed = burst.type === 'willow'
            ? 3.3 + rnd() * 1.0
            : 5.8 + rnd() * 0.5;
          vx = Math.cos(a) * r * speed;
          vy = z * speed + (burst.type === 'willow' ? 0.15 : 0.45);
          vz = Math.sin(a) * r * speed;
        }

        velocities[local * 3] = vx;
        velocities[local * 3 + 1] = vy;
        velocities[local * 3 + 2] = vz;

        for (var s = 0; s < SAMPLES; s++) {
          var sampleIndex = base + s;
          positionArray[sampleIndex * 3] = burst.center.x;
          positionArray[sampleIndex * 3 + 1] = burst.center.y;
          positionArray[sampleIndex * 3 + 2] = burst.center.z;
          var c = s === 0 ? color : trailColor;
          colorArray[sampleIndex * 3] = c.r;
          colorArray[sampleIndex * 3 + 1] = c.g;
          colorArray[sampleIndex * 3 + 2] = c.b;
          sizeArray[sampleIndex] = s === 0 ? size : size * 0.66;
          alphaArray[sampleIndex] = s === 0 ? 1 : 0;
        }
      }

      colorAttribute.needsUpdate = true;
      alphaAttribute.needsUpdate = true;
      positionAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;
    }

    function update(dt, time, mix) {
      if (mix < 0.18) {
        points.visible = false;
        material.uniforms.uOpacity.value = 0;
        flash.visible = false;
        rocketGlow.visible = false;
        flashLight.intensity = 0;
        return;
      }

      points.visible = true;
      material.uniforms.uOpacity.value = mix;

      if (mix > 0.55) {
        if (queue.length === 0) {
          showTimer -= dt;
          if (showTimer <= 0) startShow(time);
        }

        for (var q = queue.length - 1; q >= 0; q--) {
          if (time >= queue[q].at && launchBurst(queue[q])) {
            queue.splice(q, 1);
          }
        }
      }

      var changedAlpha = false;
      var changedPosition = false;

      for (var b = 0; b < bursts.length; b++) {
        var burst = bursts[b];
        if (!burst.active) continue;

        if (!burst.exploded) {
          burst.launchAge += dt;
          var progress = P.clamp(burst.launchAge / burst.launchDuration, 0, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          var rx = P.lerp(burst.start.x, burst.center.x, eased);
          var ry = P.lerp(burst.start.y, burst.center.y, eased);
          var rz = P.lerp(burst.start.z, burst.center.z, eased);
          var rocketIndex = b * PER_BURST;
          setPoint(rocketIndex, rx, ry, rz, burst.palette.core, 0.72, 1);
          rocketGlow.visible = true;
          rocketGlow.position.set(rx, ry, rz);
          rocketGlow.material.opacity = 0.62;
          rocketGlow.scale.setScalar(0.55 + (1 - progress) * 0.35);
          for (var rs = 1; rs <= TRAIL_SAMPLES; rs++) {
            var rIndex = rocketIndex + rs;
            var decay = rs <= 3 ? 1 : 0.4;
            setPoint(
              rIndex,
              rx,
              ry - rs * 0.13,
              rz,
              burst.palette.ember,
              0.30,
              (1 - progress * 0.4) * (0.60 / rs) * decay
            );
          }
          changedPosition = true;
          changedAlpha = true;
          if (progress >= 1) explodeBurst(burst);
          continue;
        }

        burst.age += dt;
        var lifeLeft = 1 - burst.age / burst.life;
        if (lifeLeft <= 0) {
          burst.active = false;
          for (var dead = 0; dead < PER_BURST; dead++) {
            alphaArray[b * PER_BURST + dead] = 0;
          }
          changedAlpha = true;
          continue;
        }

        var mainAlpha = Math.pow(Math.max(0, lifeLeft), 1.25);
        for (var p = 0; p < PARTICLES; p++) {
          var local = b * PARTICLES + p;
          var base = b * PER_BURST + p * SAMPLES;
          var vx = velocities[local * 3];
          var vy = velocities[local * 3 + 1];
          var vz = velocities[local * 3 + 2];

          vy -= burst.gravity * dt;
          var drag = Math.max(0, 1 - burst.drag * dt);
          vx *= drag;
          vz *= drag;
          velocities[local * 3] = vx;
          velocities[local * 3 + 1] = vy;
          velocities[local * 3 + 2] = vz;

          var px = positionArray[base * 3] + vx * dt;
          var py = positionArray[base * 3 + 1] + vy * dt;
          var pz = positionArray[base * 3 + 2] + vz * dt;
          positionArray[base * 3] = px;
          positionArray[base * 3 + 1] = py;
          positionArray[base * 3 + 2] = pz;

          var flicker = 0.74 + 0.26 * Math.sin(time * 14.0 + p * 1.7 + b);
          var alpha = mainAlpha * flicker;
          alphaArray[base] = alpha;
          sizeArray[base] = mainSizes[local];

          for (var s = 1; s <= TRAIL_SAMPLES; s++) {
            var ti = base + s;
            positionArray[ti * 3] = px - vx * s * burst.trailGap;
            positionArray[ti * 3 + 1] = py - vy * s * burst.trailGap;
            positionArray[ti * 3 + 2] = pz - vz * s * burst.trailGap;
            alphaArray[ti] = s <= burst.trailCount ? alpha * TRAIL_ALPHA[s - 1] : 0;
            sizeArray[ti] = mainSizes[local] * 0.72;
          }
        }

        changedAlpha = true;
        changedPosition = true;
      }

      if (flashActive) {
        flashAge += dt;
        var flashLeft = 1 - flashAge / flashDuration;
        if (flashLeft <= 0) {
          flashActive = false;
          flash.visible = false;
          flashLight.intensity = 0;
        } else {
          flash.material.opacity = flashLeft * 0.45;
          flash.scale.setScalar(2.4 + (1 - flashLeft) * 1.6);
          flashLight.intensity = 1.6 * flashLeft;
        }
      }

      if (changedAlpha) alphaAttribute.needsUpdate = true;
      if (changedPosition) positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;
    }

    function reset() {
      queue.length = 0;
      showTimer = 2.4;
      showIndex = 0;
      flashActive = false;
      flash.visible = false;
      rocketGlow.visible = false;
      flashLight.intensity = 0;
      points.visible = false;
      material.uniforms.uOpacity.value = 0;

      for (var b = 0; b < bursts.length; b++) {
        bursts[b].active = false;
        bursts[b].exploded = false;
        bursts[b].age = 0;
        bursts[b].launchAge = 0;
      }
      for (var i = 0; i < TOTAL; i++) {
        alphaArray[i] = 0;
      }
      alphaAttribute.needsUpdate = true;
    }

    function setViewport(width, height, fov) {
      var scale = height / (2 * Math.tan(fov * Math.PI / 360));
      material.uniforms.uPointScale.value = scale;
    }

    return {
      points: points,
      update: update,
      reset: reset,
      setViewport: setViewport
    };
  };
})();
