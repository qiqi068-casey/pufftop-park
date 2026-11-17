/* ==========================================================================
   EffectComposer for Three.js r97 — local addon adaptation
   Keeps the classic THREE.EffectComposer / THREE.Pass / THREE.FullScreenQuad
   surface used by the Three.js examples, trimmed to the passes this scene
   needs. Written against the r97 buffer API for offline playback.
   ========================================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  THREE.FullScreenQuad = function (material) {
    this._mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), material);
    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._scene = new THREE.Scene();
    this._scene.add(this._mesh);
    this.material = material;
  };

  THREE.FullScreenQuad.prototype = {
    constructor: THREE.FullScreenQuad,

    setMaterial: function (material) {
      this.material = material;
      this._mesh.material = material;
    },

    render: function (renderer, renderTarget) {
      var target = renderTarget || null;
      // r97's render() resets to its third argument, so it must be passed
      // explicitly or the pass would draw into the default framebuffer.
      renderer.setRenderTarget(target);
      renderer.render(this._scene, this._camera, target);
    }
  };

  THREE.Pass = function () {
    this.enabled = true;
    this.needsSwap = true;
    this.clear = false;
    this.renderToScreen = false;
  };

  THREE.Pass.prototype = {
    constructor: THREE.Pass,
    setSize: function () {},
    render: function () {}
  };

  THREE.EffectComposer = function (renderer, renderTarget) {
    this.renderer = renderer;
    this.renderTarget1 = renderTarget || new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: true
    });
    this.renderTarget2 = new THREE.WebGLRenderTarget(
      this.renderTarget1.width || 1,
      this.renderTarget1.height || 1,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        stencilBuffer: false,
        depthBuffer: true
      }
    );
    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
    this.passes = [];
    this._width = 1;
    this._height = 1;
  };

  THREE.EffectComposer.prototype = {
    constructor: THREE.EffectComposer,

    swapBuffers: function () {
      var tmp = this.readBuffer;
      this.readBuffer = this.writeBuffer;
      this.writeBuffer = tmp;
    },

    addPass: function (pass) {
      this.passes.push(pass);
      if (pass.setSize) pass.setSize(this._width, this._height);
    },

    setSize: function (width, height) {
      this._width = Math.max(1, Math.floor(width));
      this._height = Math.max(1, Math.floor(height));
      this.renderTarget1.setSize(this._width, this._height);
      this.renderTarget2.setSize(this._width, this._height);
      for (var i = 0; i < this.passes.length; i++) {
        if (this.passes[i].setSize) {
          this.passes[i].setSize(this._width, this._height);
        }
      }
    },

    render: function (deltaTime) {
      var renderer = this.renderer;
      var oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;

      for (var i = 0; i < this.passes.length; i++) {
        var pass = this.passes[i];
        if (!pass.enabled) continue;
        pass.render(
          renderer,
          this.writeBuffer,
          this.readBuffer,
          deltaTime === undefined ? 0 : deltaTime
        );
        if (pass.needsSwap) this.swapBuffers();
      }

      renderer.setRenderTarget(null);
      renderer.autoClear = oldAutoClear;
    }
  };
})();
