/* ==========================================================================
   Pufftop Park — the rides
   Ferris wheel, carousel and a perimeter comet coaster, all built from
   primitive geometries and vertex-coloured batched meshes.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;
  var C = P.C;

  P.createRides = function (world) {
    var island = world.island;

    var ferris = createFerrisWheel(world);
    island.add(ferris.group);

    var carousel = createCarousel(world);
    island.add(carousel.group);

    var coaster = createCoaster(world);
    island.add(coaster.group);

    world.updaters.push(function (dt, time) {
      ferris.update(dt, time);
      carousel.update(dt, time);
      coaster.update(dt, time);
    });

    return { ferris: ferris, carousel: carousel, coaster: coaster };
  };

  /* ===================================================================== */
  /* Ferris wheel                                                          */
  /* ===================================================================== */

  function createFerrisWheel(world) {
    var group = new T.Group();
    group.name = 'FerrisWheel';
    group.position.set(-7.0, 0, -4.4);
    group.rotation.y = 0.28;

    var deckY = P.islandHeight(group.position.x, group.position.z) + 0.02;

    var frameEntries = [];

    // deck
    frameEntries.push({
      geometry: new T.BoxBufferGeometry(6.4, 0.26, 5.2),
      matrix: new T.Matrix4().makeTranslation(0, 0.16, 0),
      color: C.creamDeep
    });
    frameEntries.push({
      geometry: new T.BoxBufferGeometry(6.8, 0.1, 5.5),
      matrix: new T.Matrix4().makeTranslation(0, 0.04, 0),
      color: C.cream
    });

    // four A-frame legs
    var legFeet = [
      [-3.1, 0.28, -1.35],
      [3.1, 0.28, -1.35],
      [-3.1, 0.28, 1.35],
      [3.1, 0.28, 1.35]
    ];
    var hubSides = [
      [0, 7.15, -1.35],
      [0, 7.15, -1.35],
      [0, 7.15, 1.35],
      [0, 7.15, 1.35]
    ];
    for (var i = 0; i < 4; i++) {
      frameEntries.push(P.cylinderEntry(
        new T.Vector3(legFeet[i][0], legFeet[i][1], legFeet[i][2]),
        new T.Vector3(hubSides[i][0], hubSides[i][1], hubSides[i][2]),
        0.16,
        C.mintDeep,
        P.unitCylinder12
      ));
    }

    // cross braces
    frameEntries.push(P.cylinderEntry(
      new T.Vector3(-3.1, 0.65, -1.35),
      new T.Vector3(3.1, 0.65, -1.35),
      0.075,
      C.cream
    ));
    frameEntries.push(P.cylinderEntry(
      new T.Vector3(-3.1, 0.65, 1.35),
      new T.Vector3(3.1, 0.65, 1.35),
      0.075,
      C.cream
    ));
    frameEntries.push(P.cylinderEntry(
      new T.Vector3(-3.1, 0.65, -1.35),
      new T.Vector3(3.1, 1.9, 1.35),
      0.06,
      C.cream
    ));
    frameEntries.push(P.cylinderEntry(
      new T.Vector3(3.1, 0.65, -1.35),
      new T.Vector3(-3.1, 1.9, 1.35),
      0.06,
      C.cream
    ));

    // hub axle
    frameEntries.push(P.cylinderEntry(
      new T.Vector3(0, 7.15, -1.55),
      new T.Vector3(0, 7.15, 1.55),
      0.22,
      C.cream,
      P.unitCylinder12
    ));

    // queue posts and ropes
    var queueZ = 2.55;
    for (var q = 0; q < 3; q++) {
      var qx = -1.7 + q * 1.7;
      frameEntries.push(P.cylinderEntry(
        new T.Vector3(qx, 0.3, queueZ),
        new T.Vector3(qx, 1.0, queueZ),
        0.045,
        C.rose
      ));
      frameEntries.push({
        geometry: new T.SphereBufferGeometry(0.075, 8, 6),
        matrix: new T.Matrix4().makeTranslation(qx, 1.04, queueZ),
        color: C.butter
      });
    }
    frameEntries.push(P.cylinderEntry(
      new T.Vector3(-1.7, 0.86, queueZ),
      new T.Vector3(1.7, 0.86, queueZ),
      0.026,
      C.rose
    ));

    // X-bracing on the rear face, plus lighter side-face bracing. Keeping the
    // front face open preserves a clear view of the wheel and boarding deck.
    frameEntries.push(P.cylinderEntry(
      new T.Vector3(-3.1, 0.7, -1.35),
      new T.Vector3(3.1, 3.65, -1.35),
      0.055,
      C.cream
    ));
    frameEntries.push(P.cylinderEntry(
      new T.Vector3(3.1, 0.7, -1.35),
      new T.Vector3(-3.1, 3.65, -1.35),
      0.055,
      C.cream
    ));
    [-3.1, 3.1].forEach(function (x) {
      frameEntries.push(P.cylinderEntry(
        new T.Vector3(x, 0.7, -1.35),
        new T.Vector3(x, 3.0, 1.35),
        0.050,
        C.cream
      ));
      frameEntries.push(P.cylinderEntry(
        new T.Vector3(x, 0.7, 1.35),
        new T.Vector3(x, 3.0, -1.35),
        0.050,
        C.cream
      ));
      frameEntries.push(P.cylinderEntry(
        new T.Vector3(x, 1.0, -1.35),
        new T.Vector3(x, 1.0, 1.35),
        0.06,
        C.cream
      ));
    });

    // Decorative axle end caps and bolts.
    [-1.68, 1.68].forEach(function (z) {
      frameEntries.push({
        geometry: new T.CylinderBufferGeometry(0.33, 0.33, 0.13, 16),
        matrix: new T.Matrix4().compose(
          new T.Vector3(0, 7.15, z),
          new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2),
          new T.Vector3(1, 1, 1)
        ),
        color: C.butter
      });
      for (var bolt = 0; bolt < 6; bolt++) {
        var ba = (bolt / 6) * Math.PI * 2;
        frameEntries.push({
          geometry: new T.SphereBufferGeometry(0.035, 6, 4),
          matrix: new T.Matrix4().makeTranslation(
            Math.cos(ba) * 0.255,
            7.15 + Math.sin(ba) * 0.255,
            z + (z > 0 ? 0.075 : -0.075)
          ),
          color: C.creamDeep
        });
      }
    });

    // Raised boarding deck beneath the lowest gondola.
    frameEntries.push({
      geometry: new T.BoxBufferGeometry(2.8, 0.18, 1.5),
      matrix: new T.Matrix4().makeTranslation(0, 1.26, 1.05),
      color: C.cream
    });
    frameEntries.push({
      geometry: new T.BoxBufferGeometry(2.55, 0.05, 1.28),
      matrix: new T.Matrix4().makeTranslation(0, 1.36, 1.05),
      color: C.creamDeep
    });
    [-1.15, 1.15].forEach(function (px) {
      [0.42, 1.68].forEach(function (pz) {
        frameEntries.push(P.cylinderEntry(
          new T.Vector3(px, 0.28, pz),
          new T.Vector3(px, 1.24, pz),
          0.055,
          C.cream
        ));
      });
      frameEntries.push(P.cylinderEntry(
        new T.Vector3(px, 1.45, 0.38),
        new T.Vector3(px, 1.45, 1.72),
        0.035,
        C.rose
      ));
      [0.42, 0.86, 1.3, 1.68].forEach(function (pz) {
        frameEntries.push(P.cylinderEntry(
          new T.Vector3(px, 1.36, pz),
          new T.Vector3(px, 1.52, pz),
          0.030,
          C.cream
        ));
      });
    });
    // Two shallow steps up to the boarding deck.
    frameEntries.push({
      geometry: new T.BoxBufferGeometry(1.7, 0.14, 0.45),
      matrix: new T.Matrix4().makeTranslation(0, 0.78, 2.10),
      color: C.creamDeep
    });
    frameEntries.push({
      geometry: new T.BoxBufferGeometry(1.7, 0.14, 0.45),
      matrix: new T.Matrix4().makeTranslation(0, 0.50, 2.42),
      color: C.cream
    });

    var frame = P.addBatch(group, frameEntries, { name: 'FerrisFrame' });
    frame.position.y = 0.02;

    // wheel
    var spinner = new T.Group();
    spinner.name = 'FerrisWheelSpinner';
    spinner.position.set(0, 7.15, 0);
    group.add(spinner);

    var wheelParts = [];
    var rimGeo = new T.TorusBufferGeometry(4.55, 0.135, 8, 72);
    for (var r = 0; r < 2; r++) {
      wheelParts.push({
        geometry: rimGeo,
        matrix: new T.Matrix4().makeTranslation(0, 0, r === 0 ? -0.46 : 0.46),
        color: r === 0 ? C.cream : C.rose
      });
    }
    // inner decorative ring
    wheelParts.push({
      geometry: new T.TorusBufferGeometry(4.15, 0.038, 6, 64),
      matrix: new T.Matrix4().makeTranslation(0, 0, 0.46),
      color: C.butter
    });

    // spokes
    var spokeCount = 16;
    for (var s = 0; s < spokeCount; s++) {
      var a = (s / spokeCount) * Math.PI * 2;
      var rim = new T.Vector3(Math.cos(a) * 4.55, Math.sin(a) * 4.55, 0);
      wheelParts.push(P.cylinderEntry(
        new T.Vector3(0, 0, 0),
        rim,
        0.04,
        s % 2 === 0 ? C.cream : C.pink
      ));
      // crossbar joining the two rims, with a small hanger eyelet at its centre
      if (s % 2 === 0) {
        wheelParts.push(P.cylinderEntry(
          new T.Vector3(rim.x, rim.y, -0.46),
          new T.Vector3(rim.x, rim.y, 0.46),
          0.035,
          C.butter
        ));
        wheelParts.push({
          geometry: new T.SphereBufferGeometry(0.072, 8, 6),
          matrix: new T.Matrix4().makeTranslation(rim.x, rim.y, 0),
          color: C.gold
        });
      }
    }

    // hub rosette
    for (var h = 0; h < 8; h++) {
      var ha = (h / 8) * Math.PI * 2;
      wheelParts.push(P.cylinderEntry(
        new T.Vector3(0, 0, 0.62),
        new T.Vector3(Math.cos(ha) * 0.72, Math.sin(ha) * 0.72, 0.62),
        0.045,
        C.butter
      ));
    }
    wheelParts.push({
      geometry: new T.CylinderBufferGeometry(0.55, 0.55, 1.45, 20),
      matrix: new T.Matrix4().compose(
        new T.Vector3(0, 0, 0),
        new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2),
        new T.Vector3(1, 1, 1)
      ),
      color: C.butter
    });

    var wheel = P.addBatch(spinner, wheelParts, {
      name: 'FerrisWheelRotatingParts',
      material: P.materials.vertexGloss
    });

    // warm bulbs on the rim
    var bulbEntries = [];
    var bulbGeo = new T.SphereBufferGeometry(0.062, 8, 6);
    for (var b = 0; b < 24; b++) {
      var ba = (b / 24) * Math.PI * 2;
      var bp = new T.Vector3(Math.cos(ba) * 4.55, Math.sin(ba) * 4.55, 0.58);
      bulbEntries.push({
        geometry: bulbGeo,
        matrix: new T.Matrix4().compose(bp, new T.Quaternion(), new T.Vector3(1, 1, 1))
      });
    }
    var bulbMaterial = new T.MeshStandardMaterial({
      color: 0xfff1cb,
      emissive: 0xffce83,
      emissiveIntensity: 1.2,
      roughness: 0.35
    });
    var bulbs = new T.Mesh(
      P.mergeTransformed(bulbEntries, false),
      bulbMaterial
    );
    bulbs.castShadow = false;
    spinner.add(bulbs);

    // gondolas
    var gondolaColors = [C.pink, C.mint, C.butter, C.lavender, C.peach, C.blush, C.seafoam, C.lemon];
    var pivots = [];
    for (var g = 0; g < 8; g++) {
      // Align each cabin with one of the crossbars that join the two rims.
      var ga = (g / 8) * Math.PI * 2;
      var pivot = new T.Group();
      // z = 0 puts the cable in the middle of the wheel, on the crossbar,
      // instead of hanging outside the front rim.
      pivot.position.set(Math.cos(ga) * 4.55, Math.sin(ga) * 4.55, 0);
      spinner.add(pivot);

      var gondolaColor = gondolaColors[g % gondolaColors.length];
      var parts = [];
      parts.push(P.cylinderEntry(
        new T.Vector3(0, 0, 0),
        new T.Vector3(0, -0.52, 0),
        0.028,
        C.butter
      ));
      parts.push({
        geometry: new T.BoxBufferGeometry(0.9, 0.08, 0.7),
        matrix: new T.Matrix4().makeTranslation(0, -0.58, 0),
        color: C.cream
      });
      parts.push({
        geometry: new T.BoxBufferGeometry(0.78, 0.5, 0.62),
        matrix: new T.Matrix4().makeTranslation(0, -0.87, 0),
        color: gondolaColor
      });
      parts.push({
        geometry: new T.BoxBufferGeometry(0.82, 0.055, 0.66),
        matrix: new T.Matrix4().makeTranslation(0, -1.14, 0),
        color: C.cream
      });
      for (var w = 0; w < 4; w++) {
        var wz = w < 2 ? 0.317 : -0.317;
        var wx = w % 2 === 0 ? -0.17 : 0.17;
        parts.push({
          geometry: new T.BoxBufferGeometry(0.23, 0.22, 0.018),
          matrix: new T.Matrix4().makeTranslation(wx, -0.86, wz),
          color: C.sky
        });
      }
      parts.push({
        geometry: new T.BoxBufferGeometry(0.58, 0.08, 0.22),
        matrix: new T.Matrix4().makeTranslation(0, -0.76, 0.12),
        color: C.cream
      });
      parts.push({
        geometry: new T.SphereBufferGeometry(0.1, 8, 6),
        matrix: new T.Matrix4().makeTranslation(-0.14, -0.74, 0.1),
        color: C.inkSoft
      });
      parts.push({
        geometry: new T.SphereBufferGeometry(0.1, 8, 6),
        matrix: new T.Matrix4().makeTranslation(0.14, -0.74, 0.1),
        color: C.ink
      });

      var gondola = new T.Mesh(P.mergeTransformed(parts, true), P.materials.vertex);
      gondola.castShadow = true;
      gondola.receiveShadow = true;
      pivot.add(gondola);

      pivots.push({
        object: pivot,
        phase: g * 0.9,
        base: pivot.rotation.z,
        sway: 0,
        swayVel: 0
      });
    }

    // sign
    var signGroup = new T.Group();
    var signBoard = new T.Mesh(
      new T.BoxBufferGeometry(3.2, 0.82, 0.14),
      new T.MeshStandardMaterial({ color: C.cream, roughness: 0.8 })
    );
    signBoard.position.set(0, 1.82, 2.46);
    signBoard.castShadow = true;
    signGroup.add(signBoard);

    var signTex = P.makeTextTexture('SKY WHEEL', 'RIDE THE BREEZE', {
      width: 1024,
      height: 256,
      size: 118,
      subSize: 30,
      subColor: '#b38a9d',
      color: '#b75f7b'
    });
    var signPlane = new T.Mesh(
      new T.PlaneBufferGeometry(3.0, 0.75),
      new T.MeshBasicMaterial({ map: signTex, transparent: true })
    );
    signPlane.position.set(0, 1.83, 2.535);
    signGroup.add(signPlane);

    // Physical posts and a crossbeam under the sign board.
    var signSupports = [];
    [-1.78, 1.78].forEach(function (sx) {
      signSupports.push(P.cylinderEntry(
        new T.Vector3(sx, 0.24, 2.60),
        new T.Vector3(sx, 1.48, 2.60),
        0.055,
        C.cream
      ));
      signSupports.push({
        geometry: new T.SphereBufferGeometry(0.11, 8, 6),
        matrix: new T.Matrix4().makeTranslation(sx, 0.23, 2.60),
        color: C.creamDeep
      });
      signSupports.push(P.cylinderEntry(
        new T.Vector3(sx, 1.43, 2.60),
        new T.Vector3(sx, 1.43, 2.48),
        0.035,
        C.butter
      ));
    });
    signSupports.push(P.cylinderEntry(
      new T.Vector3(-1.78, 1.45, 2.60),
      new T.Vector3(1.78, 1.45, 2.60),
      0.045,
      C.cream
    ));
    P.addBatch(signGroup, signSupports, { name: 'FerrisSignSupports' });
    group.add(signGroup);

    var glow = P.makeGlowSprite(0xffd18f, 3.4, 0.45);
    glow.position.set(0, 7.15, 0.9);
    group.add(glow);

    var baseGlow = P.makeGlowSprite(0xffdba4, 2.2, 0.3);
    baseGlow.position.set(0, 1.15, 2.8);
    group.add(baseGlow);

    var hubLight = new T.PointLight(0xffc46a, 0, 18, 2);
    hubLight.position.set(0, 7.15, 1.15);
    group.add(hubLight);

    group.position.y = deckY - 0.02;

    return {
      group: group,
      night: {
        light: hubLight,
        bulbMaterial: bulbMaterial,
        glows: [glow, baseGlow]
      },
      update: function (dt, time) {
        spinner.rotation.z += dt * 0.135;
        for (var i = 0; i < pivots.length; i++) {
          var p = pivots[i];
          // Small spring-damper pendulum instead of a constant sine sway.
          var drive = Math.sin(time * 1.15 + p.phase) * 0.045;
          var accel = -6.4 * p.sway - 1.75 * p.swayVel + drive;
          p.swayVel += accel * dt;
          p.sway += p.swayVel * dt;
          p.sway = P.clamp(p.sway, -0.095, 0.095);
          p.object.rotation.z = -spinner.rotation.z + p.sway;
        }
      }
    };
  }

  /* ===================================================================== */
  /* Carousel                                                              */
  /* ===================================================================== */

  function createCarouselFloorTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    var ctx = canvas.getContext('2d');
    var cx = 256;
    var cy = 256;
    ctx.fillStyle = '#f5e5cf';
    ctx.fillRect(0, 0, 512, 512);

    var slices = 24;
    for (var i = 0; i < slices; i++) {
      var a0 = (i / slices) * Math.PI * 2;
      var a1 = ((i + 1) / slices) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 246, a0, a1);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? '#f6c6d2' : '#fff7ea';
      ctx.fill();
    }
    ctx.strokeStyle = '#e1b878';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 214, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e1b878';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();

    var tex = new T.CanvasTexture(canvas);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  function createHorseGeometry(maneColor, saddleColor, bodyColor, pose) {
    var sphere = new T.SphereBufferGeometry(1, 12, 8);
    var entries = [];
    var stride = (pose - 0.5) * 0.08;
    var nod = (pose - 0.5) * 0.035;

    function spherePart(x, y, z, sx, sy, sz, color) {
      entries.push({
        geometry: sphere,
        matrix: new T.Matrix4().compose(
          new T.Vector3(x, y, z),
          new T.Quaternion(),
          new T.Vector3(sx, sy, sz)
        ),
        color: color
      });
    }

    function cyl(x1, y1, z1, x2, y2, z2, r, color) {
      entries.push(P.cylinderEntry(
        new T.Vector3(x1, y1, z1),
        new T.Vector3(x2, y2, z2),
        r,
        color,
        P.unitCylinder
      ));
    }

    function box(w, h, d, x, y, z, color) {
      entries.push({
        geometry: new T.BoxBufferGeometry(w, h, d),
        matrix: new T.Matrix4().makeTranslation(x, y, z),
        color: color
      });
    }

    function ear(x, y, z, tilt) {
      entries.push({
        geometry: new T.ConeBufferGeometry(0.042, 0.15, 6),
        matrix: new T.Matrix4().compose(
          new T.Vector3(x, y, z),
          new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), tilt),
          new T.Vector3(1, 1, 1)
        ),
        color: bodyColor
      });
    }

    // Barrel, chest and haunches — a longer body than the original blob.
    spherePart(0, 0.64, -0.04, 0.31, 0.29, 0.62, bodyColor);
    spherePart(0, 0.67, 0.31, 0.29, 0.28, 0.32, bodyColor);
    spherePart(0, 0.66, -0.40, 0.31, 0.30, 0.33, bodyColor);
    spherePart(0, 0.75, -0.48, 0.22, 0.20, 0.22, bodyColor);

    // Arched neck, head, jaw and muzzle.
    cyl(0, 0.76, 0.34, 0, 0.94, 0.46, 0.165, bodyColor);
    cyl(0, 0.92, 0.44, 0, 1.12 + nod, 0.56, 0.135, bodyColor);
    spherePart(0, 1.15 + nod, 0.61, 0.145, 0.18, 0.28, bodyColor);
    spherePart(0, 1.06 + nod, 0.63, 0.13, 0.13, 0.18, bodyColor);
    spherePart(0, 1.02 + nod, 0.80, 0.115, 0.10, 0.16, C.white);
    spherePart(0, 1.05 + nod, 0.88, 0.085, 0.075, 0.08, C.creamDeep);
    spherePart(-0.045, 1.05 + nod, 0.90, 0.022, 0.018, 0.018, C.inkSoft);
    spherePart(0.045, 1.05 + nod, 0.90, 0.022, 0.018, 0.018, C.inkSoft);

    // Ears and eyes.
    ear(-0.075, 1.31 + nod, 0.56, -0.22);
    ear(0.075, 1.31 + nod, 0.56, 0.22);
    spherePart(-0.115, 1.18 + nod, 0.69, 0.027, 0.030, 0.022, C.ink);
    spherePart(0.115, 1.18 + nod, 0.69, 0.027, 0.030, 0.022, C.ink);
    spherePart(-0.118, 1.19 + nod, 0.70, 0.009, 0.010, 0.008, C.white);
    spherePart(0.118, 1.19 + nod, 0.70, 0.009, 0.010, 0.008, C.white);

    // Bridle straps and reins.
    cyl(-0.145, 1.08 + nod, 0.80, 0.145, 1.08 + nod, 0.80, 0.012, C.inkSoft);
    cyl(-0.13, 1.12 + nod, 0.67, -0.14, 1.02 + nod, 0.80, 0.011, C.inkSoft);
    cyl(0.13, 1.12 + nod, 0.67, 0.14, 1.02 + nod, 0.80, 0.011, C.inkSoft);
    cyl(-0.14, 1.04 + nod, 0.81, -0.20, 0.86, 0.28, 0.010, C.rose);
    cyl(0.14, 1.04 + nod, 0.81, 0.20, 0.86, 0.28, 0.010, C.rose);

    // Flowing mane down the crest.
    spherePart(0, 1.30 + nod, 0.59, 0.045, 0.07, 0.08, maneColor);
    spherePart(0, 1.20 + nod, 0.49, 0.055, 0.11, 0.14, maneColor);
    spherePart(0, 1.08 + nod, 0.40, 0.050, 0.10, 0.13, maneColor);
    spherePart(0, 0.95, 0.32, 0.046, 0.09, 0.12, maneColor);
    spherePart(0, 0.83, 0.25, 0.042, 0.08, 0.11, maneColor);

    // Four jointed legs, with a slight trot offset per horse.
    function leg(side, front, offset) {
      var x = side * 0.19;
      var z = front ? 0.36 : -0.38;
      var upperX = side * 0.22;
      var upperZ = front ? 0.44 + stride + offset : -0.47 - stride + offset;
      var kneeY = 0.34;
      var footX = side * 0.235;
      var footZ = front ? 0.40 + stride + offset : -0.42 - stride + offset;
      var footY = front ? 0.075 : 0.065;

      cyl(x, 0.58, z, upperX, kneeY, upperZ, 0.060, bodyColor);
      spherePart(upperX, kneeY, upperZ, 0.058, 0.060, 0.058, bodyColor);
      cyl(upperX, kneeY, upperZ, footX, footY + 0.055, footZ, 0.044, bodyColor);
      spherePart(footX, footY, footZ, 0.060, 0.052, 0.082, C.creamDeep);
    }

    leg(-1, true, stride * 0.5);
    leg(1, true, -stride * 0.5);
    leg(-1, false, -stride * 0.5);
    leg(1, false, stride * 0.5);

    // Flowing tail, three tapered sections.
    cyl(0, 0.74, -0.64, 0, 0.59, -0.80, 0.060, maneColor);
    spherePart(0, 0.58, -0.82, 0.07, 0.075, 0.15, maneColor);
    cyl(0, 0.57, -0.80, 0, 0.39, -0.94 + stride * 0.3, 0.045, maneColor);
    spherePart(0, 0.37, -0.96 + stride * 0.3, 0.055, 0.06, 0.13, maneColor);
    spherePart(0, 0.25, -1.02 + stride * 0.3, 0.035, 0.05, 0.09, maneColor);

    // Saddle, blanket, girth and stirrups.
    box(0.46, 0.045, 0.40, 0, 0.79, -0.04, C.butter);
    box(0.36, 0.075, 0.31, 0, 0.84, -0.01, saddleColor);
    box(0.42, 0.055, 0.045, 0, 0.87, 0.12, C.cream);
    spherePart(0, 0.89, 0.13, 0.08, 0.045, 0.06, C.gold);
    box(0.40, 0.04, 0.05, 0, 0.70, 0.04, saddleColor);
    cyl(-0.20, 0.80, 0.04, -0.23, 0.58, 0.04, 0.010, C.butter);
    cyl(0.20, 0.80, 0.04, 0.23, 0.58, 0.04, 0.010, C.butter);
    entries.push({
      geometry: new T.TorusBufferGeometry(0.045, 0.012, 4, 8),
      matrix: new T.Matrix4().compose(
        new T.Vector3(-0.23, 0.54, 0.04),
        new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2),
        new T.Vector3(1, 1, 1)
      ),
      color: C.gold
    });
    entries.push({
      geometry: new T.TorusBufferGeometry(0.045, 0.012, 4, 8),
      matrix: new T.Matrix4().compose(
        new T.Vector3(0.23, 0.54, 0.04),
        new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2),
        new T.Vector3(1, 1, 1)
      ),
      color: C.gold
    });

    // Breast strap connecting the shoulders.
    cyl(-0.26, 0.76, 0.27, 0.26, 0.76, 0.27, 0.012, C.butter);

    return P.mergeTransformed(entries, true);
  }

  function createCarousel(world) {
    var group = new T.Group();
    group.name = 'Carousel';
    group.position.set(5.2, 0, -4.8);
    group.rotation.y = -0.25;

    var baseY = P.islandHeight(group.position.x, group.position.z);
    group.position.y = baseY;

    var deck = new T.Mesh(
      new T.CylinderBufferGeometry(3.95, 4.08, 0.3, 48, 1),
      new T.MeshStandardMaterial({ color: C.cream, roughness: 0.82 })
    );
    deck.position.y = 0.15;
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    var rim = new T.Mesh(
      new T.TorusBufferGeometry(3.96, 0.105, 7, 96),
      new T.MeshStandardMaterial({ color: C.rose, roughness: 0.6 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.3;
    rim.castShadow = true;
    group.add(rim);

    var floor = new T.Mesh(
      new T.CircleBufferGeometry(3.42, 64),
      new T.MeshStandardMaterial({ map: createCarouselFloorTexture(), roughness: 0.72 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.305;
    floor.receiveShadow = true;
    group.add(floor);

    // Static outer border: the pale ring makes the inner/outer split readable.
    var outerRing = new T.Mesh(
      new T.RingBufferGeometry(3.44, 3.93, 96),
      new T.MeshStandardMaterial({ color: C.creamDeep, roughness: 0.82 })
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.306;
    outerRing.receiveShadow = true;
    outerRing.name = 'CarouselOuterRing';
    group.add(outerRing);

    var seam = new T.Mesh(
      new T.TorusBufferGeometry(3.43, 0.038, 6, 96),
      new T.MeshStandardMaterial({ color: C.gold, roughness: 0.42, metalness: 0.16 })
    );
    seam.rotation.x = Math.PI / 2;
    seam.position.y = 0.316;
    group.add(seam);

    var rotor = new T.Group();
    rotor.position.y = 0.31;
    rotor.name = 'CarouselRotor';
    group.add(rotor);

    // The painted platform turns with the horses; only the outer deck is static.
    rotor.add(floor);
    floor.position.y = -0.005;

    // central pole
    var poleEntry = P.cylinderEntry(
      new T.Vector3(0, 0, 0),
      new T.Vector3(0, 5.2, 0),
      0.15,
      C.cream,
      P.unitCylinder12
    );

    // canopy panels
    var panelEntries = [poleEntry];
    var panelCount = 16;
    for (var i = 0; i < panelCount; i++) {
      var start = (i / panelCount) * Math.PI * 2;
      var length = (Math.PI * 2) / panelCount;
      var panelGeo = new T.CylinderBufferGeometry(
        0.24,
        4.02,
        1.32,
        2,
        1,
        true,
        start,
        length
      );
      panelEntries.push({
        geometry: panelGeo,
        matrix: new T.Matrix4().makeTranslation(0, 4.56, 0),
        color: i % 2 === 0 ? C.pink : C.cream
      });
    }

    // valance beads and finial
    var bead = new T.SphereBufferGeometry(0.12, 8, 6);
    for (var k = 0; k < panelCount; k++) {
      var ka = (k / panelCount) * Math.PI * 2;
      panelEntries.push({
        geometry: bead,
        matrix: new T.Matrix4().makeTranslation(
          Math.cos(ka) * 3.95,
          3.92,
          Math.sin(ka) * 3.95
        ),
        color: C.cream
      });
    }
    panelEntries.push({
      geometry: new T.SphereBufferGeometry(0.25, 10, 8),
      matrix: new T.Matrix4().makeTranslation(0, 5.35, 0),
      color: C.butter
    });
    panelEntries.push({
      geometry: new T.ConeBufferGeometry(0.16, 0.5, 8),
      matrix: new T.Matrix4().makeTranslation(0, 5.72, 0),
      color: C.gold
    });

    var canopy = P.addBatch(rotor, panelEntries, {
      name: 'CarouselCanopy',
      material: P.materials.vertexDouble
    });

    // gold trim
    var trim = new T.Mesh(
      new T.TorusBufferGeometry(4.02, 0.065, 6, 96),
      new T.MeshStandardMaterial({ color: C.gold, roughness: 0.44, metalness: 0.18 })
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 3.9;
    rotor.add(trim);

    // lights under the canopy
    var lights = [];
    var lightEntries = [];
    var lightGeo = new T.SphereBufferGeometry(0.075, 8, 6);
    for (var l = 0; l < 12; l++) {
      var la = (l / 12) * Math.PI * 2;
      var lp = new T.Vector3(Math.cos(la) * 3.35, 3.72, Math.sin(la) * 3.35);
      lightEntries.push({
        geometry: lightGeo,
        matrix: new T.Matrix4().compose(lp, new T.Quaternion(), new T.Vector3(1, 1, 1))
      });
    }
    var bulbMaterial = new T.MeshStandardMaterial({
      color: 0xfff2cd,
      emissive: 0xffc977,
      emissiveIntensity: 1.4,
      roughness: 0.35
    });
    var bulbs = new T.Mesh(
      P.mergeTransformed(lightEntries, false),
      bulbMaterial
    );
    bulbs.castShadow = false;
    rotor.add(bulbs);

    var innerLight = new T.PointLight(0xffd7a0, 0.65, 10, 2);
    innerLight.position.set(0, 3.35, 0);
    rotor.add(innerLight);

    // horse poles
    var poleEntries = [];
    var horseCount = 6;
    for (var p = 0; p < horseCount; p++) {
      var pa = (p / horseCount) * Math.PI * 2;
      poleEntries.push(P.cylinderEntry(
        new T.Vector3(Math.cos(pa) * 2.55, 0, Math.sin(pa) * 2.55),
        new T.Vector3(Math.cos(pa) * 2.55, 3.85, Math.sin(pa) * 2.55),
        0.045,
        C.gold
      ));
    }
    P.addBatch(rotor, poleEntries, { name: 'CarouselPoles' });

    // horses — each one gets its own pastel coat
    var maneColors = [C.rose, C.mintDeep, C.lavender, C.rose, C.peach, C.mintDeep];
    var saddleColors = [C.mint, C.pink, C.butter, C.lavender, C.seafoam, C.rose];
    var bodyColors = [C.pink, C.mint, C.cream, C.lavender, C.peach, C.seafoam];
    var horses = [];
    for (var h = 0; h < horseCount; h++) {
      var ha = (h / horseCount) * Math.PI * 2;
      var horse = new T.Mesh(
        createHorseGeometry(
          maneColors[h % maneColors.length],
          saddleColors[h % saddleColors.length],
          bodyColors[h % bodyColors.length],
          h / (horseCount - 1)
        ),
        P.materials.vertex
      );
      horse.castShadow = true;
      horse.receiveShadow = true;
      var holder = new T.Group();
      holder.position.set(Math.cos(ha) * 2.55, 0.45, Math.sin(ha) * 2.55);
      // Face the clockwise direction of travel.
      holder.rotation.y = -ha;
      holder.add(horse);
      rotor.add(holder);
      horses.push({
        object: holder,
        baseY: 0.45,
        phase: h * 1.15
      });
    }

    // little entry steps
    var steps = [];
    steps.push({
      geometry: new T.BoxBufferGeometry(2.0, 0.16, 0.65),
      matrix: new T.Matrix4().makeTranslation(0, 0.1, 4.15),
      color: C.creamDeep
    });
    steps.push({
      geometry: new T.BoxBufferGeometry(1.8, 0.16, 0.55),
      matrix: new T.Matrix4().makeTranslation(0, 0.27, 3.72),
      color: C.cream
    });
    P.addBatch(group, steps, { name: 'CarouselSteps' });

    // sign
    var signTex = P.makeTextTexture('CAROUSEL', 'MERRY & BRIGHT', {
      width: 1024,
      height: 256,
      size: 118,
      subSize: 30,
      subColor: '#9b8493',
      color: '#c06a86'
    });
    var signBoard = new T.Mesh(
      new T.BoxBufferGeometry(2.65, 0.8, 0.1),
      new T.MeshStandardMaterial({ color: C.cream, roughness: 0.8 })
    );
    var signPlane = new T.Mesh(
      new T.PlaneBufferGeometry(2.5, 0.625),
      new T.MeshBasicMaterial({ map: signTex, transparent: true })
    );
    var signPost = new T.Group();
    signPost.position.set(0, 1.35, 4.6);
    signBoard.castShadow = true;
    signPost.add(signBoard);
    signPlane.position.z = 0.06;
    signPlane.position.y = 0.0;
    signPost.add(signPlane);
    group.add(signPost);

    // The carousel sign needs its own twin posts; it sits outside the deck.
    var carouselSignSupports = [];
    [-1.56, 1.56].forEach(function (sx) {
      carouselSignSupports.push(P.cylinderEntry(
        new T.Vector3(sx, 0.0, 4.72),
        new T.Vector3(sx, 1.02, 4.72),
        0.048,
        C.cream
      ));
      carouselSignSupports.push({
        geometry: new T.SphereBufferGeometry(0.09, 8, 6),
        matrix: new T.Matrix4().makeTranslation(sx, 0.04, 4.72),
        color: C.creamDeep
      });
      carouselSignSupports.push(P.cylinderEntry(
        new T.Vector3(sx, 0.96, 4.72),
        new T.Vector3(sx, 0.96, 4.65),
        0.030,
        C.butter
      ));
    });
    carouselSignSupports.push(P.cylinderEntry(
      new T.Vector3(-1.56, 0.94, 4.72),
      new T.Vector3(1.56, 0.94, 4.72),
      0.035,
      C.cream
    ));
    P.addBatch(group, carouselSignSupports, { name: 'CarouselSignSupports' });

    var glow = P.makeGlowSprite(0xffcf8d, 3.8, 0.4);
    glow.position.set(0, 3.4, 0);
    group.add(glow);

    return {
      group: group,
      rotor: rotor,
      night: {
        light: innerLight,
        bulbMaterial: bulbMaterial,
        glow: glow
      },
      update: function (dt, time) {
        rotor.rotation.y -= dt * 0.18;
        for (var i = 0; i < horses.length; i++) {
          var item = horses[i];
          item.object.position.y = item.baseY + Math.sin(time * 2.35 + item.phase) * 0.14;
          item.object.rotation.z = Math.sin(time * 1.8 + item.phase) * 0.045;
        }
      }
    };
  }

  /* ===================================================================== */
  /* Comet coaster                                                         */
  /* ===================================================================== */

  function createCoaster(world) {
    var group = new T.Group();
    group.name = 'CometCoaster';

    var points = [
      new T.Vector3(1.5, 0.95, -12.15),
      new T.Vector3(-3.2, 0.85, -11.25),
      new T.Vector3(-8.0, 1.45, -12.25),
      new T.Vector3(-11.8, 2.85, -10.8),
      new T.Vector3(-12.75, 5.35, -6.8),
      new T.Vector3(-12.4, 6.35, -1.0),
      new T.Vector3(-9.7, 4.8, 5.4),
      new T.Vector3(-5.0, 2.3, 9.2),
      new T.Vector3(1.0, 1.75, 10.9),
      new T.Vector3(6.8, 2.25, 9.4),
      new T.Vector3(11.0, 3.55, 6.1),
      new T.Vector3(12.9, 4.1, 1.0),
      new T.Vector3(12.2, 2.2, -4.9),
      new T.Vector3(9.0, 1.25, -8.7),
      new T.Vector3(6.4, 0.95, -11.2),
      new T.Vector3(5.2, 0.98, -12.15),
      new T.Vector3(3.3, 1.0, -12.15)
    ];

    var curve = new T.CatmullRomCurve3(points, true, 'catmullrom', 0.42);
    var length = curve.getLength();
    var sampleCount = 340;

    function frameAt(t) {
      var p = curve.getPointAt(((t % 1) + 1) % 1);
      var tangent = curve.getTangentAt(((t % 1) + 1) % 1).normalize();
      var xAxis = new T.Vector3().crossVectors(P.UP, tangent);
      if (xAxis.lengthSq() < 0.0001) xAxis.set(1, 0, 0);
      xAxis.normalize();
      var yAxis = new T.Vector3().crossVectors(tangent, xAxis).normalize();
      var matrix = new T.Matrix4().makeBasis(xAxis, yAxis, tangent);
      matrix.setPosition(p);
      return { p: p, t: tangent, x: xAxis, y: yAxis, matrix: matrix };
    }

    // offsets for the two rails
    var leftPoints = [];
    var rightPoints = [];
    for (var i = 0; i <= sampleCount; i++) {
      var f = frameAt(i / sampleCount);
      leftPoints.push(f.p.clone().addScaledVector(f.x, 0.34));
      rightPoints.push(f.p.clone().addScaledVector(f.x, -0.34));
    }
    var leftCurve = new T.CatmullRomCurve3(leftPoints, true, 'catmullrom', 0.2);
    var rightCurve = new T.CatmullRomCurve3(rightPoints, true, 'catmullrom', 0.2);

    var railMatA = new T.MeshStandardMaterial({
      color: 0xf18da6,
      roughness: 0.4,
      metalness: 0.18
    });
    var railMatB = new T.MeshStandardMaterial({
      color: 0xffd47c,
      roughness: 0.38,
      metalness: 0.18
    });

    var railA = new T.Mesh(
      new T.TubeBufferGeometry(leftCurve, 420, 0.085, 6, true),
      railMatA
    );
    railA.castShadow = true;
    railA.receiveShadow = true;
    group.add(railA);

    var railB = new T.Mesh(
      new T.TubeBufferGeometry(rightCurve, 420, 0.085, 6, true),
      railMatB
    );
    railB.castShadow = true;
    railB.receiveShadow = true;
    group.add(railB);

    // ties
    var tieEntries = [];
    var tieGeo = new T.BoxBufferGeometry(1.0, 0.075, 0.2);
    var tieCount = 180;
    for (var t = 0; t < tieCount; t++) {
      var f2 = frameAt(t / tieCount);
      var tieMatrix = new T.Matrix4().makeBasis(f2.x, f2.y, f2.t);
      tieMatrix.setPosition(f2.p.clone().addScaledVector(f2.y, -0.045));
      tieEntries.push({
        geometry: tieGeo,
        matrix: tieMatrix,
        color: t % 2 === 0 ? C.cream : C.creamDeep
      });
    }
    P.addBatch(group, tieEntries, { name: 'CoasterTies', material: P.materials.vertex });

    // supports
    var supportEntries = [];
    var padGeo = new T.CylinderBufferGeometry(0.28, 0.34, 0.1, 10);
    for (var sup = 0; sup < 18; sup++) {
      var tt = (sup + 0.5) / 18;
      var sf = frameAt(tt);
      if (sf.p.y < 1.05) continue;
      var groundY = P.islandHeight(sf.p.x, sf.p.z);
      supportEntries.push(P.cylinderEntry(
        new T.Vector3(sf.p.x, groundY + 0.06, sf.p.z),
        new T.Vector3(sf.p.x, sf.p.y - 0.1, sf.p.z),
        0.105,
        C.mintDeep,
        P.unitCylinder
      ));
      supportEntries.push({
        geometry: padGeo,
        matrix: new T.Matrix4().makeTranslation(sf.p.x, groundY + 0.04, sf.p.z),
        color: C.creamDeep
      });
    }
    P.addBatch(group, supportEntries, { name: 'CoasterSupports' });

    // station
    var station = new T.Group();
    station.position.set(3.3, 0, -12.15);
    station.rotation.y = 0.04;

    var stationEntries = [];
    stationEntries.push({
      geometry: new T.BoxBufferGeometry(5.3, 0.3, 2.2),
      matrix: new T.Matrix4().makeTranslation(0, 0.15, 0),
      color: C.creamDeep
    });
    stationEntries.push({
      geometry: new T.BoxBufferGeometry(5.6, 0.16, 2.45),
      matrix: new T.Matrix4().makeTranslation(0, 3.05, 0),
      color: C.mint
    });
    for (var sp = 0; sp < 4; sp++) {
      var sx = sp < 2 ? -2.3 : 2.3;
      var sz = sp % 2 === 0 ? -0.9 : 0.9;
      stationEntries.push(P.cylinderEntry(
        new T.Vector3(sx, 0.3, sz),
        new T.Vector3(sx, 3.0, sz),
        0.08,
        C.cream,
        P.unitCylinder
      ));
    }
    // Backing board and two hanger rods for the COMET sign.
    stationEntries.push({
      geometry: new T.BoxBufferGeometry(2.2, 0.58, 0.06),
      matrix: new T.Matrix4().makeTranslation(0, 2.58, 1.08),
      color: C.cream
    });
    [-0.82, 0.82].forEach(function (hx) {
      stationEntries.push(P.cylinderEntry(
        new T.Vector3(hx, 3.02, 1.08),
        new T.Vector3(hx, 2.86, 1.08),
        0.025,
        C.butter
      ));
      stationEntries.push({
        geometry: new T.SphereBufferGeometry(0.045, 8, 6),
        matrix: new T.Matrix4().makeTranslation(hx, 2.86, 1.08),
        color: C.gold
      });
    });
    P.addBatch(station, stationEntries, { name: 'CoasterStation' });

    var stationTex = P.makeTextTexture('COMET', 'COASTER', {
      width: 1024,
      height: 256,
      size: 132,
      subSize: 30,
      subColor: '#9b8493',
      color: '#b98535'
    });
    var stationSign = new T.Mesh(
      new T.PlaneBufferGeometry(2.0, 0.5),
      new T.MeshBasicMaterial({ map: stationTex, transparent: true })
    );
    stationSign.position.set(0, 2.58, 1.13);
    stationSign.rotation.y = 0.0;
    station.add(stationSign);
    group.add(station);

    // the little train
    var carColors = [C.rose, C.mint, C.butter];
    var cars = [];
    for (var carIndex = 0; carIndex < 3; carIndex++) {
      var carGroup = new T.Group();
      carGroup.name = 'CoasterCar' + carIndex;
      var parts = [];
      var bodyColor = carColors[carIndex % carColors.length];

      parts.push({
        geometry: new T.BoxBufferGeometry(0.94, 0.22, 1.55),
        matrix: new T.Matrix4().makeTranslation(0, 0.3, 0),
        color: bodyColor
      });
      parts.push({
        geometry: new T.BoxBufferGeometry(0.78, 0.26, 1.05),
        matrix: new T.Matrix4().makeTranslation(0, 0.51, -0.08),
        color: C.cream
      });
      parts.push({
        geometry: new T.BoxBufferGeometry(0.84, 0.05, 1.16),
        matrix: new T.Matrix4().makeTranslation(0, 0.65, -0.08),
        color: bodyColor
      });
      // nose
      parts.push({
        geometry: new T.SphereBufferGeometry(0.45, 10, 8),
        matrix: new T.Matrix4().compose(
          new T.Vector3(0, 0.35, 0.8),
          new T.Quaternion(),
          new T.Vector3(0.84, 0.42, 0.65)
        ),
        color: bodyColor
      });
      // riders
      parts.push({
        geometry: new T.SphereBufferGeometry(0.13, 8, 6),
        matrix: new T.Matrix4().makeTranslation(-0.18, 0.76, -0.2),
        color: carIndex === 0 ? C.inkSoft : C.rose
      });
      parts.push({
        geometry: new T.SphereBufferGeometry(0.13, 8, 6),
        matrix: new T.Matrix4().makeTranslation(0.18, 0.76, -0.2),
        color: carIndex === 1 ? C.ink : C.cream
      });
      parts.push({
        geometry: new T.CylinderBufferGeometry(0.022, 0.022, 0.34, 6),
        matrix: new T.Matrix4().makeTranslation(0, 1.0, -0.35),
        color: C.gold
      });
      // wheels
      for (var w = 0; w < 4; w++) {
        var wx = w < 2 ? -0.5 : 0.5;
        var wz = w % 2 === 0 ? 0.48 : -0.48;
        parts.push({
          geometry: new T.CylinderBufferGeometry(0.17, 0.17, 0.09, 12),
          matrix: new T.Matrix4().compose(
            new T.Vector3(wx, 0.2, wz),
            new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), Math.PI / 2),
            new T.Vector3(1, 1, 1)
          ),
          color: C.inkSoft
        });
      }

      var carMesh = new T.Mesh(P.mergeTransformed(parts, true), P.materials.vertex);
      carMesh.castShadow = true;
      carMesh.receiveShadow = true;
      carGroup.add(carMesh);
      group.add(carGroup);
      cars.push(carGroup);
    }

    var carSpacing = 2.0 / length;
    var speed = 0.041;

    function placeCar(car, t) {
      var f = frameAt(t);
      var pos = f.p.clone().addScaledVector(f.y, 0.07);
      car.position.copy(pos);
      var m = new T.Matrix4().makeBasis(f.x, f.y, f.t);
      car.quaternion.setFromRotationMatrix(m);
    }

    return {
      group: group,
      curve: curve,
      update: function (dt, time) {
        var headT = (time * speed + 0.06) % 1;
        for (var i = 0; i < cars.length; i++) {
          placeCar(cars[i], headT - i * carSpacing);
        }
      }
    };
  }

})();
