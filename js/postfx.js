/* ==========================================================================
   Pufftop Park — night-only bloom pipeline
   Wraps EffectComposer + UnrealBloomPass and falls back gracefully to the
   direct renderer when the addons are unavailable.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;

  P.createBloomPipeline = function (world) {
    var renderer = world.renderer;
    var scene = world.scene;
    var camera = world.camera;

    if (!T.EffectComposer || !T.RenderPass || !T.UnrealBloomPass) {
      console.warn('Post-processing addons unavailable; rendering without bloom.');
      return {
        available: false,
        active: false,
        setSize: function () {},
        setStrength: function () {},
        setActive: function () {},
        render: function () { renderer.render(scene, camera); }
      };
    }

    var composer = new T.EffectComposer(renderer);
    var renderPass = new T.RenderPass(scene, camera);
    var bloomPass = new T.UnrealBloomPass(
      new T.Vector2(1, 1),
      0.62,
      1.2,
      0.6
    );
    bloomPass.renderToScreen = true;

    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    var active = false;

    return {
      available: true,
      get active() { return active; },
      setSize: function (width, height, pixelRatio) {
        var scale = pixelRatio || 1;
        composer.setSize(
          Math.max(1, Math.floor(width * scale)),
          Math.max(1, Math.floor(height * scale))
        );
      },
      setStrength: function (value) {
        bloomPass.strength = Math.max(0, value);
      },
      setActive: function (value) {
        active = !!value;
      },
      render: function (deltaTime) {
        if (active && bloomPass.strength > 0.0015) {
          composer.render(deltaTime);
        } else {
          renderer.render(scene, camera);
        }
      }
    };
  };
})();
