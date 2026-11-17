/* ==========================================================================
   Pufftop Park —fireflies and little night fireworks
   Soft additive point sprites with their own shaders so the bloom pass has
   bright, unclipped little orbs to catch.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;

  var GLOW_VERTEX = [
    'attribute float aSize;',
    'attribute float aPhase;',
    'uniform float uTime;',
    'uniform float uOpacity;',
    'uniform float uPointScale;',
    'varying float vAlpha;',
    'void main() {',
    '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
    '  gl_PointSize = clamp(aSize * uPointScale / max(1.0, -mvPosition.z), 1.5, 48.0);',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  vAlpha = 0.55 + 0.45 * sin(uTime * 1.8 + aPhase);',
    '}'
  ].join('\n');

  var GLOW_FRAGMENT = [
    'uniform float uOpacity;',
    'uniform vec3 uGlowColor;',
    'uniform vec3 uCoreColor;',
    'varying float vAlpha;',
    'void main() {',
    '  vec2 p = gl_PointCoord - vec2(0.5);',
    '  float d = length(p) * 2.0;',
    '  if (d > 1.0) discard;',
    '  float halo = pow(clamp(1.0 - d, 0.0, 1.0), 2.35);',
    '  float core = smoothstep(0.34, 0.0, d);',
    '  vec3 color = mix(uGlowColor, uCoreColor, core);',
    '  gl_FragColor = vec4(color, (halo * 0.92 + core * 0.45) * vAlpha * uOpacity);',
    '}'
  ].join('\n');

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
    '  float glow = pow(clamp(1.0 - d, 0.0, 1.0), 1.8);',
    '  gl_FragColor = vec4(vColor, glow * vAlpha);',
    '}'
  ].join('\n');

  /* --------------------------------------------------------------------- */
  /* Fireflies                                                              */
  /* --------------------------------------------------------------------- */

  P.createFireflies = function (scene) {
    var count = 120;
    var positions = new Float32Array(count * 3);
    var sizes = new Float32Array(count);
    var phases = new Float32Array(count);
    var baseAngle = new Float32Array(count);
    var baseRadius = new Float32Array(count);
    var baseY = new Float32Array(count);
    var speed = new Float32Array(count);
    var rnd = P.rng(2026);

    for (var i = 0; i < count; i++) {
      baseAngle[i] = rnd() * Math.PI * 2;
      baseRadius[i] = 2.0 + rnd() * 13.2;
      baseY[i] = 0.9 + rnd() * 7.6;
      speed[i] = 0.025 + rnd() * 0.065;
      phases[i] = rnd() * Math.PI * 2;
      sizes[i] = 0.3 + rnd() * 0.38;
      positions[i * 3] = Math.cos(baseAngle[i]) * baseRadius[i];
      positions[i * 3 + 1] = baseY[i];
      positions[i * 3 + 2] = Math.sin(baseAngle[i]) * baseRadius[i];
    }

    var geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new T.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new T.Float32BufferAttribute(phases, 1));

    var material = new T.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPointScale: { value: 1000 },
        uGlowColor: { value: new T.Color(1.0, 0.93, 0.58) },
        uCoreColor: { value: new T.Color(1.0, 0.995, 0.90) }
      },
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: T.AdditiveBlending
    });

    var points = new T.Points(geometry, material);
    points.name = 'Fireflies';
    points.frustumCulled = false;
    points.visible = false;
    points.renderOrder = 4;
    scene.add(points);

    var positionAttribute = geometry.attributes.position;
    // r97's Float32BufferAttribute copies the source array, so drive the
    // attribute's own array from here on.
    var positionArray = positionAttribute.array;

    function update(dt, time, opacity) {
      var visible = opacity > 0.012;
      points.visible = visible;
      if (!visible) return;

      material.uniforms.uTime.value = time;
      material.uniforms.uOpacity.value = P.clamp(opacity, 0, 1);

      for (var i = 0; i < count; i++) {
        var angle = baseAngle[i] + time * speed[i];
        var radius = baseRadius[i] + Math.sin(time * 0.43 + phases[i]) * 1.15;
        var x = Math.cos(angle) * radius + Math.sin(time * 0.76 + phases[i]) * 0.55;
        var z = Math.sin(angle) * radius + Math.cos(time * 0.61 + phases[i]) * 0.55;
        var y = baseY[i] + Math.sin(time * 0.58 + phases[i] * 1.35) * 0.95;

        positionArray[i * 3] = x;
        positionArray[i * 3 + 1] = y;
        positionArray[i * 3 + 2] = z;
      }
      positionAttribute.needsUpdate = true;
    }

    function setViewport(width, height, fov) {
      var scale = height / (2 * Math.tan(fov * Math.PI / 360));
      material.uniforms.uPointScale.value = scale;
    }

    function setStyle(glowColor, coreColor) {
      material.uniforms.uGlowColor.value.copy(glowColor);
      material.uniforms.uCoreColor.value.copy(coreColor);
    }

    return {
      points: points,
      update: update,
      setViewport: setViewport,
      setStyle: setStyle
    };
  };
})();
