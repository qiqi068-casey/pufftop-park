/* ==========================================================================
   Pufftop Park — three-state atmosphere
   Day / Sunset / Night, blended by weights so a mode change can be
   interrupted at any point. The night-only bloom pipeline and the firefly
   tint are driven from the same weights.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;

  var PRESETS = {
    day: {
      hemiSky: new T.Color(0xffeaf5),
      hemiGround: new T.Color(0xf7d5e5),
      hemiIntensity: 0.54,
      key: new T.Color(0xfff2df),
      keyIntensity: 0.84,
      keyPos: new T.Vector3(-24, 34, 22),
      fill: new T.Color(0xffcfe2),
      fillIntensity: 0.22,
      under: new T.Color(0xffd8e8),
      underIntensity: 0.16,
      bounce: new T.Color(0xdbeaff),
      bounceIntensity: 0.10,
      fog: new T.Color(0xf6dce9),
      fogNear: 62,
      fogFar: 190,
      exposure: 1.0,
      nightSky: 0,
      duskSky: 0,
      stars: 0,
      moon: 0,
      daySun: 1,
      duskSun: 0,
      fireflyOpacity: 0,
      fireflyGlow: new T.Color(1.0, 0.93, 0.58),
      fireflyCore: new T.Color(1.0, 0.995, 0.90),
      petalOpacity: 0.72,
      bloom: 0,
      fireworks: 0
    },

    dusk: {
      hemiSky: new T.Color(0xffdfc2),
      hemiGround: new T.Color(0x96627e),
      hemiIntensity: 0.5,
      key: new T.Color(0xffb347),
      keyIntensity: 0.98,
      keyPos: new T.Vector3(-38, 10, 18),
      fill: new T.Color(0xa56bbb),
      fillIntensity: 0.32,
      under: new T.Color(0xffb09a),
      underIntensity: 0.12,
      bounce: new T.Color(0x9b6aa8),
      bounceIntensity: 0.18,
      fog: new T.Color(0xf3b38c),
      fogNear: 46,
      fogFar: 158,
      exposure: 0.96,
      nightSky: 0,
      duskSky: 1,
      stars: 0,
      moon: 0,
      daySun: 0,
      duskSun: 1,
      fireflyOpacity: 0.76,
      fireflyGlow: new T.Color(1.0, 0.78, 0.32),
      fireflyCore: new T.Color(1.0, 0.94, 0.62),
      petalOpacity: 0.46,
      bloom: 0,
      fireworks: 0
    },

    night: {
      hemiSky: new T.Color(0x7a86cb),
      hemiGround: new T.Color(0x21142d),
      hemiIntensity: 0.26,
      key: new T.Color(0x9fb8ff),
      keyIntensity: 0.22,
      keyPos: new T.Vector3(-24, 34, 22),
      fill: new T.Color(0x7256a8),
      fillIntensity: 0.055,
      under: new T.Color(0x684b8d),
      underIntensity: 0.04,
      bounce: new T.Color(0x32234c),
      bounceIntensity: 0.035,
      fog: new T.Color(0x2b1a3d),
      fogNear: 56,
      fogFar: 182,
      exposure: 1.0,
      nightSky: 1,
      duskSky: 0,
      stars: 1,
      moon: 1,
      daySun: 0,
      duskSun: 0,
      fireflyOpacity: 1,
      fireflyGlow: new T.Color(1.0, 0.93, 0.58),
      fireflyCore: new T.Color(1.0, 0.995, 0.90),
      petalOpacity: 0,
      bloom: 1,
      fireworks: 1
    }
  };

  /* --------------------------------------------------------------------- */
  /* Sky domes                                                              */
  /* --------------------------------------------------------------------- */

  function createSkyDome(scene, name, radius, top, horizon, below, band, bandStrength, renderOrder) {
    var geometry = new T.SphereBufferGeometry(radius, 48, 30);
    var position = geometry.attributes.position;
    var colors = new Float32Array(position.count * 3);
    var topColor = new T.Color(top);
    var horizonColor = new T.Color(horizon);
    var belowColor = new T.Color(below);
    var bandColor = new T.Color(band);
    var temp = new T.Color();

    for (var i = 0; i < position.count; i++) {
      var y = position.getY(i);
      var ny = y / radius;

      if (ny >= 0) {
        temp.copy(horizonColor).lerp(topColor, P.smoothstep(0.0, 0.78, ny));
      } else {
        temp.copy(horizonColor).lerp(belowColor, P.smoothstep(0.0, 0.5, -ny));
      }

      var glow = Math.exp(-Math.pow((ny - 0.035) / 0.075, 2));
      temp.lerp(bandColor, glow * bandStrength);

      colors[i * 3] = temp.r;
      colors[i * 3 + 1] = temp.g;
      colors[i * 3 + 2] = temp.b;
    }

    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    var material = new T.MeshBasicMaterial({
      vertexColors: T.VertexColors,
      side: T.BackSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false
    });
    var mesh = new T.Mesh(geometry, material);
    mesh.name = name;
    mesh.renderOrder = renderOrder;
    mesh.visible = false;
    scene.add(mesh);
    return { mesh: mesh, material: material };
  }

  function createDuskSky(scene) {
    return createSkyDome(
      scene,
      'DuskSky',
      274,
      0xf5b7c3,
      0xff8a3d,
      0xc85d4a,
      0xffd18a,
      0.3,
      -18
    );
  }

  function createNightSky(scene) {
    return createSkyDome(
      scene,
      'NightSky',
      272,
      0x15102b,
      0x563a70,
      0x2f1b41,
      0x9b62b7,
      0.24,
      -19
    );
  }

  /* --------------------------------------------------------------------- */
  /* Stars and moon                                                         */
  /* --------------------------------------------------------------------- */

  function createStars(scene) {
    var count = 520;
    var rnd = P.rng(2107);
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var cool = new T.Color(0xdce6ff);
    var warm = new T.Color(0xfff0d2);
    var temp = new T.Color();

    for (var i = 0; i < count; i++) {
      var z = rnd() * 2 - 1;
      var a = rnd() * Math.PI * 2;
      var r = Math.sqrt(Math.max(0, 1 - z * z));
      var y = Math.abs(z) * 0.92 + 0.02;
      var len = Math.sqrt(1 - y * y);
      var radius = 248 + rnd() * 5;

      positions[i * 3] = Math.cos(a) * len * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = Math.sin(a) * len * radius;

      temp.copy(cool).lerp(warm, rnd() * 0.34);
      colors[i * 3] = temp.r;
      colors[i * 3 + 1] = temp.g;
      colors[i * 3 + 2] = temp.b;
    }

    var geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));

    var material = new T.PointsMaterial({
      map: P.glowTexture,
      vertexColors: T.VertexColors,
      color: 0xffffff,
      size: 2.1,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: false
    });

    var points = new T.Points(geometry, material);
    points.name = 'NightStars';
    points.frustumCulled = false;
    points.visible = false;
    points.renderOrder = -17;
    scene.add(points);

    return { object: points, material: material };
  }

  function makeMoonTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    var ctx = canvas.getContext('2d');

    var halo = ctx.createRadialGradient(128, 128, 100, 128, 128, 128);
    halo.addColorStop(0, 'rgba(255,251,236,0.18)');
    halo.addColorStop(1, 'rgba(255,251,236,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 256, 256);

    var face = ctx.createRadialGradient(108, 102, 12, 128, 128, 106);
    face.addColorStop(0, '#fffdf3');
    face.addColorStop(0.72, '#f7ecd8');
    face.addColorStop(1, '#ddcde8');

    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(128, 128, 106, 0, Math.PI * 2);
    ctx.fill();

    var rnd = P.rng(47);
    for (var i = 0; i < 9; i++) {
      ctx.fillStyle = 'rgba(176,158,186,' + (0.06 + rnd() * 0.08) + ')';
      ctx.beginPath();
      ctx.arc(88 + rnd() * 82, 86 + rnd() * 84, 5 + rnd() * 16, 0, Math.PI * 2);
      ctx.fill();
    }

    var texture = new T.CanvasTexture(canvas);
    texture.encoding = T.sRGBEncoding;
    return texture;
  }

  function createMoon(scene) {
    var group = new T.Group();
    group.name = 'NightMoon';
    group.visible = false;

    var material = new T.SpriteMaterial({
      map: makeMoonTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      fog: false
    });
    var moon = new T.Sprite(material);
    moon.scale.set(16, 16, 1);
    group.add(moon);

    var glowMaterial = new T.SpriteMaterial({
      map: P.glowTexture,
      color: 0xaebdff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: false
    });
    var glow = new T.Sprite(glowMaterial);
    glow.scale.set(48, 48, 1);
    group.add(glow);

    group.position.set(-110, 40, -95);
    group.renderOrder = -16;
    scene.add(group);

    return { group: group, material: material, glowMaterial: glowMaterial };
  }

  /* --------------------------------------------------------------------- */
  /* Sunset sun                                                             */
  /* --------------------------------------------------------------------- */

  function makeSunTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    var ctx = canvas.getContext('2d');

    var halo = ctx.createRadialGradient(128, 128, 56, 128, 128, 126);
    halo.addColorStop(0, 'rgba(255,245,205,0.72)');
    halo.addColorStop(0.4, 'rgba(255,185,95,0.32)');
    halo.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 256, 256);

    var disc = ctx.createRadialGradient(118, 112, 8, 128, 128, 82);
    disc.addColorStop(0, '#fffbe8');
    disc.addColorStop(0.52, '#ffe4a0');
    disc.addColorStop(0.9, '#ffb347');
    disc.addColorStop(1, 'rgba(255,158,72,0.15)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(128, 128, 82, 0, Math.PI * 2);
    ctx.fill();

    var texture = new T.CanvasTexture(canvas);
    texture.encoding = T.sRGBEncoding;
    return texture;
  }

  function createDuskSun(scene) {
    var group = new T.Group();
    group.name = 'DuskSun';
    group.visible = false;

    var discMaterial = new T.SpriteMaterial({
      map: makeSunTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      fog: false
    });
    var disc = new T.Sprite(discMaterial);
    disc.scale.set(24, 24, 1);
    group.add(disc);

    var glowMaterial = new T.SpriteMaterial({
      map: P.glowTexture,
      color: 0xffb347,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: false
    });
    var glow = new T.Sprite(glowMaterial);
    glow.scale.set(78, 78, 1);
    group.add(glow);

    group.position.set(-142, 18, -118);
    group.renderOrder = -15.5;
    scene.add(group);

    return { group: group, discMaterial: discMaterial, glowMaterial: glowMaterial };
  }

  /* --------------------------------------------------------------------- */
  /* Controller                                                             */
  /* --------------------------------------------------------------------- */

  P.createAtmosphere = function (world, refs) {
    var renderer = world.renderer;
    var scene = world.scene;
    var camera = world.camera;
    var lights = world.lights;

    var nightSky = createNightSky(scene);
    var duskSky = createDuskSky(scene);
    var stars = createStars(scene);
    var moon = createMoon(scene);
    var duskSun = createDuskSun(scene);
    var fireflies = P.createFireflies(scene);
    var fireworks = P.createFireworks(scene);
    var bloom = P.createBloomPipeline(world);

    var ferris = refs.rides.ferris;
    var carousel = refs.rides.carousel;
    var lamps = refs.park.lamps;

    var ferrisLight = ferris.night.light;
    var carouselLight = carousel.night.light;
    var lampLights = lamps.lights.slice();
    var allWarmLights = [ferrisLight, carouselLight].concat(lampLights);

    // Daylight has no practical light and no glowing decorations at all.
    var warmDay = [0, 0].concat(lampLights.map(function () { return 0; }));
    var warmDusk = [1.25, 0.95].concat(lampLights.map(function () { return 0.55; }));
    var warmNight = [1.8, 1.45].concat(lampLights.map(function () { return 0.82; }));

    var bulbs = [
      ferris.night.bulbMaterial,
      carousel.night.bulbMaterial,
      lamps.bulbMaterial
    ];
    var bulbDay = [0, 0, 0];
    var bulbDusk = [1.75, 1.8, 1.65];
    var bulbNight = [2.2, 2.2, 2.0];

    var glows = [
      ferris.night.glows[0],
      ferris.night.glows[1],
      carousel.night.glow
    ].concat(lamps.glows);
    var glowDay = glows.map(function () { return 0; });
    var glowDusk = [0.66, 0.4, 0.58].concat(lamps.glows.map(function () { return 0.7; }));
    var glowNight = [0.82, 0.45, 0.7].concat(lamps.glows.map(function () { return 0.82; }));

    var balloonMaterial = world.balloonMaterial;
    var balloonDayEmissive = balloonMaterial ? balloonMaterial.emissive.clone() : new T.Color(0x000000);
    var balloonDuskEmissive = new T.Color(0x65444f);
    var balloonNightEmissive = new T.Color(0x6b538a);

    var cloudMaterials = [P.materials.cloud, P.materials.cloudPale];
    var cloudDay = [
      {
        color: new T.Color(0xfff7f2),
        opacity: cloudMaterials[0].opacity,
        emissive: cloudMaterials[0].emissive.clone(),
        intensity: 1
      },
      {
        color: new T.Color(0xffeff6),
        opacity: cloudMaterials[1].opacity,
        emissive: cloudMaterials[1].emissive.clone(),
        intensity: 1
      }
    ];
    var cloudDusk = [
      {
        color: new T.Color(0xffd2be),
        opacity: 0.55,
        emissive: new T.Color(0x8a4b49),
        intensity: 0.58
      },
      {
        color: new T.Color(0xf2b9ae),
        opacity: 0.31,
        emissive: new T.Color(0x6b3c49),
        intensity: 0.44
      }
    ];
    var cloudNight = [
      {
        color: new T.Color(0x9a8db6),
        opacity: 0.46,
        emissive: new T.Color(0x3c2c5b),
        intensity: 1
      },
      {
        color: new T.Color(0x8b7ca6),
        opacity: 0.26,
        emissive: new T.Color(0x32233f),
        intensity: 1
      }
    ];

    var sunGlowMaterial = world.sky.sunGlow.material;
    var sunCoreMaterial = world.sky.sunCore.material;
    var daySunGlow = sunGlowMaterial.opacity;
    var daySunCore = sunCoreMaterial.opacity;

    // Every facility glow sprite is tagged by P.makeGlowSprite. Sky glows
    // (the day sun) opt out, so this catches lamps, signs, balloons, fountain
    // and ride halos without touching the sky.
    var decorativeGlows = [];
    scene.traverse(function (object) {
      if (object.isSprite && object.userData.decorativeGlow) {
        decorativeGlows.push(object);
      }
    });

    var weights = { day: 1, dusk: 0, night: 0 };
    var fromWeights = { day: 1, dusk: 0, night: 0 };
    var targetWeights = { day: 1, dusk: 0, night: 0 };
    var targetMode = 'day';
    var transitionStart = performance.now() - 1800;
    var duration = 1.7;
    var tempGlow = new T.Color();
    var tempCore = new T.Color();

    function blendColor(target, day, dusk, night) {
      target.setRGB(
        day.r * weights.day + dusk.r * weights.dusk + night.r * weights.night,
        day.g * weights.day + dusk.g * weights.dusk + night.g * weights.night,
        day.b * weights.day + dusk.b * weights.dusk + night.b * weights.night
      );
    }

    function blendNumber(day, dusk, night) {
      return day * weights.day + dusk * weights.dusk + night * weights.night;
    }

    function apply() {
      var hemi = lights.hemi;
      var key = lights.key;
      var fill = lights.fill;
      var under = lights.under;
      var bounce = lights.bounce;

      blendColor(hemi.color, PRESETS.day.hemiSky, PRESETS.dusk.hemiSky, PRESETS.night.hemiSky);
      blendColor(hemi.groundColor, PRESETS.day.hemiGround, PRESETS.dusk.hemiGround, PRESETS.night.hemiGround);
      hemi.intensity = blendNumber(PRESETS.day.hemiIntensity, PRESETS.dusk.hemiIntensity, PRESETS.night.hemiIntensity);

      blendColor(key.color, PRESETS.day.key, PRESETS.dusk.key, PRESETS.night.key);
      key.intensity = blendNumber(PRESETS.day.keyIntensity, PRESETS.dusk.keyIntensity, PRESETS.night.keyIntensity);
      key.position.set(
        blendNumber(PRESETS.day.keyPos.x, PRESETS.dusk.keyPos.x, PRESETS.night.keyPos.x),
        blendNumber(PRESETS.day.keyPos.y, PRESETS.dusk.keyPos.y, PRESETS.night.keyPos.y),
        blendNumber(PRESETS.day.keyPos.z, PRESETS.dusk.keyPos.z, PRESETS.night.keyPos.z)
      );

      blendColor(fill.color, PRESETS.day.fill, PRESETS.dusk.fill, PRESETS.night.fill);
      fill.intensity = blendNumber(PRESETS.day.fillIntensity, PRESETS.dusk.fillIntensity, PRESETS.night.fillIntensity);

      blendColor(under.color, PRESETS.day.under, PRESETS.dusk.under, PRESETS.night.under);
      under.intensity = blendNumber(PRESETS.day.underIntensity, PRESETS.dusk.underIntensity, PRESETS.night.underIntensity);

      blendColor(bounce.color, PRESETS.day.bounce, PRESETS.dusk.bounce, PRESETS.night.bounce);
      bounce.intensity = blendNumber(PRESETS.day.bounceIntensity, PRESETS.dusk.bounceIntensity, PRESETS.night.bounceIntensity);

      blendColor(scene.fog.color, PRESETS.day.fog, PRESETS.dusk.fog, PRESETS.night.fog);
      scene.fog.near = blendNumber(PRESETS.day.fogNear, PRESETS.dusk.fogNear, PRESETS.night.fogNear);
      scene.fog.far = blendNumber(PRESETS.day.fogFar, PRESETS.dusk.fogFar, PRESETS.night.fogFar);
      renderer.toneMappingExposure = blendNumber(
        PRESETS.day.exposure,
        PRESETS.dusk.exposure,
        PRESETS.night.exposure
      );

      for (var i = 0; i < allWarmLights.length; i++) {
        allWarmLights[i].intensity =
          warmDay[i] * weights.day + warmDusk[i] * weights.dusk + warmNight[i] * weights.night;
      }

      for (var b = 0; b < bulbs.length; b++) {
        bulbs[b].emissiveIntensity =
          bulbDay[b] * weights.day + bulbDusk[b] * weights.dusk + bulbNight[b] * weights.night;
      }

      for (var g = 0; g < glows.length; g++) {
        glows[g].material.opacity =
          glowDay[g] * weights.day + glowDusk[g] * weights.dusk + glowNight[g] * weights.night;
      }

      for (var c = 0; c < cloudMaterials.length; c++) {
        blendColor(
          cloudMaterials[c].color,
          cloudDay[c].color,
          cloudDusk[c].color,
          cloudNight[c].color
        );
        blendColor(
          cloudMaterials[c].emissive,
          cloudDay[c].emissive,
          cloudDusk[c].emissive,
          cloudNight[c].emissive
        );
        cloudMaterials[c].opacity =
          cloudDay[c].opacity * weights.day +
          cloudDusk[c].opacity * weights.dusk +
          cloudNight[c].opacity * weights.night;
        cloudMaterials[c].emissiveIntensity =
          cloudDay[c].intensity * weights.day +
          cloudDusk[c].intensity * weights.dusk +
          cloudNight[c].intensity * weights.night;
      }

      if (balloonMaterial) {
        blendColor(
          balloonMaterial.emissive,
          balloonDayEmissive,
          balloonDuskEmissive,
          balloonNightEmissive
        );
        balloonMaterial.emissiveIntensity =
          0 * weights.day + 0.45 * weights.dusk + 0.86 * weights.night;
      }

      // No facility halo survives full Daylight.
      var showFacilityGlows = weights.day < 0.999;
      for (var dg = 0; dg < decorativeGlows.length; dg++) {
        decorativeGlows[dg].visible = showFacilityGlows;
      }

      if (world.petals) {
        var petalOpacity = blendNumber(
          PRESETS.day.petalOpacity,
          PRESETS.dusk.petalOpacity,
          PRESETS.night.petalOpacity
        );
        if (world.petals.setOpacity) world.petals.setOpacity(petalOpacity);
        else world.petals.material.opacity = petalOpacity;
        world.petals.points.visible = petalOpacity > 0.01;
      }

      sunGlowMaterial.opacity = daySunGlow * weights.day;
      sunCoreMaterial.opacity = daySunCore * weights.day;
      world.sky.sunGlow.visible = weights.day > 0.001;
      world.sky.sunCore.visible = weights.day > 0.001;

      nightSky.material.opacity = weights.night;
      nightSky.mesh.visible = weights.night > 0.001;

      duskSky.material.opacity = weights.dusk;
      duskSky.mesh.visible = weights.dusk > 0.001;

      stars.material.opacity = weights.night * 0.9;
      stars.object.visible = weights.night > 0.001;

      moon.material.opacity = weights.night;
      moon.glowMaterial.opacity = weights.night * 0.4;
      moon.group.visible = weights.night > 0.001;

      duskSun.discMaterial.opacity = weights.dusk * 0.92;
      duskSun.glowMaterial.opacity = weights.dusk * 0.65;
      duskSun.group.visible = weights.dusk > 0.001;

      tempGlow.setRGB(
        PRESETS.day.fireflyGlow.r * weights.day + PRESETS.dusk.fireflyGlow.r * weights.dusk + PRESETS.night.fireflyGlow.r * weights.night,
        PRESETS.day.fireflyGlow.g * weights.day + PRESETS.dusk.fireflyGlow.g * weights.dusk + PRESETS.night.fireflyGlow.g * weights.night,
        PRESETS.day.fireflyGlow.b * weights.day + PRESETS.dusk.fireflyGlow.b * weights.dusk + PRESETS.night.fireflyGlow.b * weights.night
      );
      tempCore.setRGB(
        PRESETS.day.fireflyCore.r * weights.day + PRESETS.dusk.fireflyCore.r * weights.dusk + PRESETS.night.fireflyCore.r * weights.night,
        PRESETS.day.fireflyCore.g * weights.day + PRESETS.dusk.fireflyCore.g * weights.dusk + PRESETS.night.fireflyCore.g * weights.night,
        PRESETS.day.fireflyCore.b * weights.day + PRESETS.dusk.fireflyCore.b * weights.dusk + PRESETS.night.fireflyCore.b * weights.night
      );
      fireflies.setStyle(tempGlow, tempCore);

      bloom.setStrength(0.62 * weights.night);
      bloom.setActive(weights.night > 0.0015);
    }

    function update(dt, time) {
      var progress = P.clamp(
        (performance.now() - transitionStart) / (duration * 1000),
        0,
        1
      );
      var eased = progress * progress * (3 - 2 * progress);

      weights.day = P.lerp(fromWeights.day, targetWeights.day, eased);
      weights.dusk = P.lerp(fromWeights.dusk, targetWeights.dusk, eased);
      weights.night = P.lerp(fromWeights.night, targetWeights.night, eased);
      apply();

      var fireflyOpacity =
        PRESETS.day.fireflyOpacity * weights.day +
        PRESETS.dusk.fireflyOpacity * weights.dusk +
        PRESETS.night.fireflyOpacity * weights.night;
      fireflies.update(dt, time, fireflyOpacity);
      fireworks.update(dt, time, weights.night);
    }

    function setMode(mode) {
      if (!PRESETS[mode] || mode === targetMode) return targetMode;

      fromWeights.day = weights.day;
      fromWeights.dusk = weights.dusk;
      fromWeights.night = weights.night;
      transitionStart = performance.now();
      targetMode = mode;
      targetWeights.day = mode === 'day' ? 1 : 0;
      targetWeights.dusk = mode === 'dusk' ? 1 : 0;
      targetWeights.night = mode === 'night' ? 1 : 0;
      fireworks.reset();
      return targetMode;
    }

    function resize(width, height, pixelRatio) {
      bloom.setSize(width, height, pixelRatio);
      var physicalHeight = height * pixelRatio;
      fireflies.setViewport(width * pixelRatio, physicalHeight, camera.fov);
      fireworks.setViewport(width * pixelRatio, physicalHeight, camera.fov);
      if (world.petals && world.petals.setViewport) {
        world.petals.setViewport(width * pixelRatio, physicalHeight, camera.fov);
      }
    }

    apply();

    return {
      update: update,
      render: function (dt) { bloom.render(dt); },
      resize: resize,
      setMode: setMode,
      mode: function () { return targetMode; },
      weights: function () {
        return { day: weights.day, dusk: weights.dusk, night: weights.night };
      }
    };
  };
})();
