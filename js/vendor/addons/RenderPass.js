/* ==========================================================================
   RenderPass for Three.js r97 — local addon adaptation
   Renders the scene into the composer's read buffer.
   ========================================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  THREE.RenderPass = function (scene, camera, overrideMaterial, clearColor, clearAlpha) {
    THREE.Pass.call(this);

    this.scene = scene;
    this.camera = camera;
    this.overrideMaterial = overrideMaterial || null;
    this.clearColor = clearColor === undefined ? null : clearColor;
    this.clearAlpha = clearAlpha === undefined ? 0 : clearAlpha;
    this.clear = true;
    this.clearDepth = true;
    this.needsSwap = false;
  };

  THREE.RenderPass.prototype = Object.create(THREE.Pass.prototype);
  THREE.RenderPass.prototype.constructor = THREE.RenderPass;

  THREE.RenderPass.prototype.render = function (renderer, writeBuffer, readBuffer) {
    var oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    var target = this.renderToScreen ? null : readBuffer;
    renderer.setRenderTarget(target);

    if (this.clear) {
      if (this.clearColor !== null) renderer.setClearColor(this.clearColor, this.clearAlpha);
      renderer.clear(true, this.clearDepth, true);
    }

    if (this.overrideMaterial !== null) {
      var oldMaterial = this.scene.overrideMaterial;
      this.scene.overrideMaterial = this.overrideMaterial;
      // r97 clears the target unless it is passed in the third slot.
      renderer.render(this.scene, this.camera, target);
      this.scene.overrideMaterial = oldMaterial;
    } else {
      renderer.render(this.scene, this.camera, target);
    }

    renderer.autoClear = oldAutoClear;
  };
})();
