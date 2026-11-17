/* ==========================================================================
   UnrealBloomPass for Three.js r97 — local addon adaptation
   A compact bright-pass -> separable blur -> additive composite bloom.
   Keeps the THREE.UnrealBloomPass constructor and setSize API from the
   examples while staying within r97's WebGLRenderTarget surface.
   ========================================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var VERTEX_SHADER = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var HIGH_PASS_SHADER = [
    'uniform sampler2D tDiffuse;',
    'uniform float luminosityThreshold;',
    'uniform float smoothWidth;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec4 texel = texture2D(tDiffuse, vUv);',
    '  vec3 luma = vec3(0.299, 0.587, 0.114);',
    '  float v = dot(texel.xyz, luma);',
    '  float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);',
    '  gl_FragColor = vec4(texel.rgb * alpha, 1.0);',
    '}'
  ].join('\n');

  var BLUR_SHADER = [
    'uniform sampler2D tDiffuse;',
    'uniform vec2 texelSize;',
    'uniform vec2 direction;',
    'uniform float radius;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec2 delta = texelSize * direction * radius;',
    '  vec4 sum = texture2D(tDiffuse, vUv) * 0.2270270270;',
    '  sum += texture2D(tDiffuse, vUv + delta * 1.3846153846) * 0.3162162162;',
    '  sum += texture2D(tDiffuse, vUv - delta * 1.3846153846) * 0.3162162162;',
    '  sum += texture2D(tDiffuse, vUv + delta * 3.2307692308) * 0.0702702703;',
    '  sum += texture2D(tDiffuse, vUv - delta * 3.2307692308) * 0.0702702703;',
    '  gl_FragColor = sum;',
    '}'
  ].join('\n');

  var COMPOSITE_SHADER = [
    'uniform sampler2D tDiffuse;',
    'uniform sampler2D tBloom;',
    'uniform float strength;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec4 base = texture2D(tDiffuse, vUv);',
    '  vec4 bloom = texture2D(tBloom, vUv);',
    '  gl_FragColor = vec4(base.rgb + bloom.rgb * strength, base.a);',
    '}'
  ].join('\n');

  function makeTarget(width, height) {
    return new THREE.WebGLRenderTarget(
      Math.max(1, Math.floor(width)),
      Math.max(1, Math.floor(height)),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        stencilBuffer: false,
        depthBuffer: false
      }
    );
  }

  THREE.UnrealBloomPass = function (resolution, strength, radius, threshold) {
    THREE.Pass.call(this);

    this.resolution = resolution || new THREE.Vector2(1, 1);
    this.strength = strength === undefined ? 0.9 : strength;
    this.radius = radius === undefined ? 1.25 : radius;
    this.threshold = threshold === undefined ? 0.55 : threshold;

    this.renderToScreen = true;
    this.needsSwap = false;

    this.highPassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        luminosityThreshold: { value: this.threshold },
        smoothWidth: { value: 0.14 }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: HIGH_PASS_SHADER,
      depthTest: false,
      depthWrite: false
    });

    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        texelSize: { value: new THREE.Vector2(1, 1) },
        direction: { value: new THREE.Vector2(1, 0) },
        radius: { value: this.radius }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: BLUR_SHADER,
      depthTest: false,
      depthWrite: false
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        strength: { value: this.strength }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: COMPOSITE_SHADER,
      depthTest: false,
      depthWrite: false
    });

    this.fsQuad = new THREE.FullScreenQuad(this.highPassMaterial);

    this.highPassTarget = makeTarget(1, 1);
    this.blurHTarget = makeTarget(1, 1);
    this.blurVTarget = makeTarget(1, 1);

    this.setSize(this.resolution.x, this.resolution.y);
  };

  THREE.UnrealBloomPass.prototype = Object.create(THREE.Pass.prototype);
  THREE.UnrealBloomPass.prototype.constructor = THREE.UnrealBloomPass;

  THREE.UnrealBloomPass.prototype.setSize = function (width, height) {
    this.resolution.set(width, height);

    // Bloom works at half resolution: it is softer, much cheaper, and the
    // upsample itself helps the glow feel diffuse.
    var bw = Math.max(1, Math.floor(width * 0.5));
    var bh = Math.max(1, Math.floor(height * 0.5));

    this.highPassTarget.setSize(bw, bh);
    this.blurHTarget.setSize(bw, bh);
    this.blurVTarget.setSize(bw, bh);

    this.blurMaterial.uniforms.texelSize.value.set(1 / bw, 1 / bh);
  };

  THREE.UnrealBloomPass.prototype.render = function (renderer, writeBuffer, readBuffer) {
    this.highPassMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.highPassMaterial.uniforms.luminosityThreshold.value = this.threshold;
    this.fsQuad.setMaterial(this.highPassMaterial);
    this.fsQuad.render(renderer, this.highPassTarget);

    this.blurMaterial.uniforms.tDiffuse.value = this.highPassTarget.texture;
    this.blurMaterial.uniforms.direction.value.set(1, 0);
    this.blurMaterial.uniforms.radius.value = this.radius;
    this.fsQuad.setMaterial(this.blurMaterial);
    this.fsQuad.render(renderer, this.blurHTarget);

    this.blurMaterial.uniforms.tDiffuse.value = this.blurHTarget.texture;
    this.blurMaterial.uniforms.direction.value.set(0, 1);
    this.fsQuad.setMaterial(this.blurMaterial);
    this.fsQuad.render(renderer, this.blurVTarget);

    this.compositeMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.compositeMaterial.uniforms.tBloom.value = this.blurVTarget.texture;
    this.compositeMaterial.uniforms.strength.value = this.strength;
    this.fsQuad.setMaterial(this.compositeMaterial);
    this.fsQuad.render(renderer, this.renderToScreen ? null : writeBuffer);
  };
})();
