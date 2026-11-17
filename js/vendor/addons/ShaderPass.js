/* ==========================================================================
   ShaderPass for Three.js r97 — local addon adaptation
   Minimal full-screen shader pass used by the bloom pipeline.
   ========================================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  THREE.ShaderPass = function (shader, textureID) {
    THREE.Pass.call(this);

    this.textureID = textureID || 'tDiffuse';
    this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    this.material = new THREE.ShaderMaterial({
      defines: shader.defines || {},
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader
    });
    this.material.depthTest = false;
    this.material.depthWrite = false;

    this.fsQuad = new THREE.FullScreenQuad(this.material);
  };

  THREE.ShaderPass.prototype = Object.create(THREE.Pass.prototype);
  THREE.ShaderPass.prototype.constructor = THREE.ShaderPass;

  THREE.ShaderPass.prototype.render = function (renderer, writeBuffer, readBuffer) {
    if (this.uniforms[this.textureID]) {
      this.uniforms[this.textureID].value = readBuffer.texture;
    }
    this.fsQuad.render(renderer, this.renderToScreen ? null : writeBuffer);
  };
})();
