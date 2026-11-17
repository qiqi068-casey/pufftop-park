/* ==========================================================================
   Pufftop Park —paths, entrance, lamps, flower beds, balloons and props
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;
  var C = P.C;

  P.createPark = function (world) {
    var island = world.island;

    buildPaths(world);
    var entrance = buildEntrance(world);
    buildFence(world);
    var lamps = buildLamps(world);
    buildFountain(world);
    buildTrees(world);
    buildFlowers(world);
    buildBenches(world);
    buildPeople(world);
    buildBunting(world, lamps);
    buildBalloons(world);

    ['LampPosts', 'Topiary', 'Benches', 'Visitors', 'IslandFence'].forEach(function (name) {
      P.assertInsideIsland(island.getObjectByName(name), 15.60, name);
    });

    return { entrance: entrance, lamps: lamps };
  };

  /**
   * Place ground props on the island with a hard safety radius.
   * Options: count, minRadius, maxRadius, yOffset, rnd, accept, place.
   * The helper retries blocked positions and never returns a point outside
   * maxRadius, so new props cannot drift off the island later.
   */
  P.scatterOnIsland = function (options) {
    var opts = options || {};
    var count = opts.count || 1;
    var minRadius = opts.minRadius || 0;
    var maxRadius = opts.maxRadius || 15.18;
    var yOffset = opts.yOffset || 0;
    var rnd = opts.rnd || P.rng(9182);
    var accept = opts.accept || function () { return true; };
    var place = opts.place;
    var placed = 0;
    var attempts = 0;
    var maxAttempts = Math.max(count * 40, 240);

    while (placed < count && attempts < maxAttempts) {
      attempts++;
      var angle = rnd() * Math.PI * 2;
      var radius = Math.sqrt(
        minRadius * minRadius +
        rnd() * (maxRadius * maxRadius - minRadius * minRadius)
      );
      var x = Math.cos(angle) * radius;
      var z = Math.sin(angle) * radius;

      if (x * x + z * z > maxRadius * maxRadius) continue;
      if (!accept(x, z, rnd)) continue;

      if (place) {
        place(x, z, P.islandHeight(x, z) + yOffset, rnd);
      }
      placed++;
    }

    return placed;
  };

  /** Development audit for merged ground batches. */
  P.assertInsideIsland = function (mesh, maxRadius, label) {
    if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position) return;
    var points = mesh.geometry.attributes.position.array;
    var max = 0;
    for (var i = 0; i < points.length; i += 3) {
      var r = Math.sqrt(points[i] * points[i] + points[i + 2] * points[i + 2]);
      if (r > max) max = r;
    }
    if (max > maxRadius) {
      console.warn('[Pufftop] ' + (label || mesh.name) + ' exceeds island radius: ' + max.toFixed(3));
    }
    return max;
  };

  /* --------------------------------------------------------------------- */
  /* Paths                                                                  */
  /* --------------------------------------------------------------------- */

  function pathPoints(points) {
    return points.map(function (pt) {
      var y = P.islandHeight(pt[0], pt[1]);
      return new T.Vector3(pt[0], y, pt[1]);
    });
  }

  function addRibbon(island, points, width, material, offsetY, segments) {
    var pts = points.map(function (p) {
      return new T.Vector3(p.x, p.y + offsetY, p.z);
    });
    var geometry = P.createRibbonGeometry(pts, width, segments || 110);
    var mesh = new T.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    island.add(mesh);
    return mesh;
  }

  function buildPaths(world) {
    var island = world.island;

    var paving = P.makePavingTexture();
    paving.repeat.set(1, 1);

    var underMat = new T.MeshStandardMaterial({
      color: 0xd4bea7,
      roughness: 0.95,
      side: T.DoubleSide
    });
    var topMat = new T.MeshStandardMaterial({
      color: C.cream,
      map: paving,
      roughness: 0.9,
      side: T.DoubleSide
    });

    var entrance = pathPoints([
      [0, 15.35],
      [0, 13.2],
      [0.1, 10.6],
      [-0.2, 8.2],
      [0, 6.2]
    ]);
    var ferrisPath = pathPoints([
      [-1.6, 6.2],
      [-3.4, 5.4],
      [-4.9, 3.0],
      [-5.7, 0.2],
      [-6.3, -1.35]
    ]);
    var carouselPath = pathPoints([
      [3.2, 7.0],
      [4.9, 5.2],
      [5.4, 2.0],
      [4.2, -0.78]
    ]);

    [entrance, ferrisPath, carouselPath].forEach(function (points) {
      addRibbon(island, points, 4.6, underMat, 0.025, 100);
      addRibbon(island, points, 3.95, topMat, 0.05, 100);
    });

    // circular plaza
    var plazaY = P.islandHeight(0, 4.4);
    var plazaGroup = new T.Group();
    plazaGroup.position.set(0, plazaY, 4.4);

    var underlay = new T.Mesh(
      new T.CircleBufferGeometry(4.15, 72),
      new T.MeshStandardMaterial({ color: 0xd4bea7, roughness: 0.95 })
    );
    underlay.rotation.x = -Math.PI / 2;
    underlay.position.y = 0.035;
    underlay.receiveShadow = true;
    plazaGroup.add(underlay);

    var plaza = new T.Mesh(
      new T.CircleBufferGeometry(3.85, 72),
      new T.MeshStandardMaterial({
        color: C.cream,
        map: paving,
        roughness: 0.9
      })
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.058;
    plaza.receiveShadow = true;
    plazaGroup.add(plaza);

    var rim = new T.Mesh(
      new T.TorusBufferGeometry(3.86, 0.07, 6, 96),
      new T.MeshStandardMaterial({ color: C.creamDeep, roughness: 0.8 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.066;
    plazaGroup.add(rim);

    island.add(plazaGroup);

    // flower ring around the fountain
    var ringMat = new T.MeshStandardMaterial({ color: 0xbfe7b4, roughness: 0.95 });
    var ring = new T.Mesh(new T.TorusBufferGeometry(2.3, 0.055, 5, 64), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, plazaY + 0.09, 4.4);
    island.add(ring);
  }

  /* --------------------------------------------------------------------- */
  /* Entrance arch                                                          */
  /* --------------------------------------------------------------------- */

  function buildEntrance(world) {
    var island = world.island;
    var z = 14.6;
    var ground = P.islandHeight(0, z);
    var group = new T.Group();
    group.position.set(0, ground, z);
    group.name = 'Entrance';

    var entries = [];
    var postGeo = P.unitCylinder12;

    [-2.55, 2.55].forEach(function (x) {
      entries.push(P.cylinderEntry(
        new T.Vector3(x, 0, 0),
        new T.Vector3(x, 4.7, 0),
        0.17,
        C.rose,
        postGeo
      ));
      entries.push({
        geometry: new T.CylinderBufferGeometry(0.36, 0.42, 0.24, 16),
        matrix: new T.Matrix4().makeTranslation(x, 0.12, 0),
        color: C.creamDeep
      });
      entries.push({
        geometry: new T.SphereBufferGeometry(0.23, 10, 8),
        matrix: new T.Matrix4().makeTranslation(x, 4.78, 0),
        color: C.butter
      });
    });

    entries.push(P.cylinderEntry(
      new T.Vector3(-2.55, 4.7, 0),
      new T.Vector3(2.55, 4.7, 0),
      0.11,
      C.cream,
      postGeo
    ));

    // sign board
    entries.push({
      geometry: new T.BoxBufferGeometry(4.9, 1.16, 0.17),
      matrix: new T.Matrix4().makeTranslation(0, 3.95, 0),
      color: C.cream
    });
    entries.push({
      geometry: new T.BoxBufferGeometry(5.04, 0.09, 0.23),
      matrix: new T.Matrix4().makeTranslation(0, 3.34, 0),
      color: C.butter
    });
    entries.push({
      geometry: new T.BoxBufferGeometry(5.04, 0.09, 0.23),
      matrix: new T.Matrix4().makeTranslation(0, 4.56, 0),
      color: C.butter
    });

    // cloud ornament
    var cloudCol = C.white;
    entries.push({
      geometry: new T.SphereBufferGeometry(0.38, 12, 9),
      matrix: new T.Matrix4().compose(
        new T.Vector3(-0.36, 5.05, 0),
        new T.Quaternion(),
        new T.Vector3(1, 0.7, 1)
      ),
      color: cloudCol
    });
    entries.push({
      geometry: new T.SphereBufferGeometry(0.5, 12, 9),
      matrix: new T.Matrix4().compose(
        new T.Vector3(0.08, 5.17, 0),
        new T.Quaternion(),
        new T.Vector3(1, 0.72, 1)
      ),
      color: cloudCol
    });
    entries.push({
      geometry: new T.SphereBufferGeometry(0.32, 12, 9),
      matrix: new T.Matrix4().compose(
        new T.Vector3(0.54, 5.04, 0),
        new T.Quaternion(),
        new T.Vector3(1, 0.68, 1)
      ),
      color: cloudCol
    });

    // little ticket podiums
    [-3.7, 3.7].forEach(function (x) {
      entries.push(P.cylinderEntry(
        new T.Vector3(x, 0, 0.3),
        new T.Vector3(x, 1.0, 0.3),
        0.32,
        C.mint
      ));
      entries.push({
        geometry: new T.CylinderBufferGeometry(0.5, 0.42, 0.12, 16),
        matrix: new T.Matrix4().makeTranslation(x, 1.05, 0.3),
        color: C.cream
      });
    });

    P.addBatch(group, entries, { name: 'EntranceArch' });

    var signTex = P.makeTextTexture('PUFFTOP PARK', 'ABOVE THE CLOUDS', {
      width: 1024,
      height: 256,
      size: 132,
      subSize: 30,
      subColor: '#a98d97',
      color: '#b45f7d'
    });
    var sign = new T.Mesh(
      new T.PlaneBufferGeometry(4.6, 1.15),
      new T.MeshBasicMaterial({ map: signTex, transparent: true })
    );
    sign.position.set(0, 3.97, 0.095);
    group.add(sign);

    var glow = P.makeGlowSprite(0xffd9a4, 3.4, 0.35);
    glow.position.set(0, 4.4, 0.65);
    group.add(glow);

    island.add(group);
    return group;
  }

  /* --------------------------------------------------------------------- */
  /* Fence                                                                  */
  /* --------------------------------------------------------------------- */

  function buildFence(world) {
    var island = world.island;
    var radius = 15.35;
    var segments = 52;
    var entries = [];
    var gapCenter = Math.PI / 2;
    var gapHalf = 0.2;

    var posts = [];
    for (var i = 0; i <= segments; i++) {
      var a = (i / segments) * Math.PI * 2;
      if (Math.abs(((a - gapCenter + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < gapHalf) {
        continue;
      }
      var x = Math.cos(a) * radius;
      var z = Math.sin(a) * radius;
      var y = P.islandHeight(x, z);
      posts.push({ x: x, z: z, y: y, a: a });
    }

    for (var p = 0; p < posts.length; p++) {
      var post = posts[p];
      entries.push(P.cylinderEntry(
        new T.Vector3(post.x, post.y, post.z),
        new T.Vector3(post.x, post.y + 0.95, post.z),
        0.055,
        p % 3 === 0 ? C.mint : C.cream
      ));
      entries.push({
        geometry: new T.SphereBufferGeometry(0.09, 8, 6),
        matrix: new T.Matrix4().makeTranslation(post.x, post.y + 0.99, post.z),
        color: C.butter
      });

      var next = posts[p + 1];
      if (!next) continue;
      var dist = Math.hypot(next.x - post.x, next.z - post.z);
      if (dist > 3.5) continue;
      [0.4, 0.76].forEach(function (h) {
        entries.push(P.cylinderEntry(
          new T.Vector3(post.x, post.y + h, post.z),
          new T.Vector3(next.x, next.y + h, next.z),
          0.026,
          C.cream
        ));
      });
    }

    P.addBatch(island, entries, { name: 'IslandFence', castShadow: false });
  }

  /* --------------------------------------------------------------------- */
  /* Lamps                                                                  */
  /* --------------------------------------------------------------------- */

  function buildLamps(world) {
    var island = world.island;
    var defs = [
      [-4.95, 8.85],
      [4.95, 8.85],
      [-4.9, 1.2],
      [4.9, 1.2],
      [-2.45, 6.8],
      [2.55, 2.15]
    ];

    var entries = [];
    var bulbs = [];
    var lights = [];
    var glows = [];

    defs.forEach(function (def) {
      var x = def[0];
      var z = def[1];
      var y = P.islandHeight(x, z);
      entries.push({
        geometry: new T.CylinderBufferGeometry(0.32, 0.38, 0.16, 12),
        matrix: new T.Matrix4().makeTranslation(x, y + 0.08, z),
        color: C.creamDeep
      });
      entries.push(P.cylinderEntry(
        new T.Vector3(x, y + 0.1, z),
        new T.Vector3(x, y + 2.72, z),
        0.075,
        C.mintDeep,
        P.unitCylinder
      ));
      entries.push({
        geometry: new T.SphereBufferGeometry(0.2, 10, 8),
        matrix: new T.Matrix4().makeTranslation(x, y + 2.82, z),
        color: C.butter
      });
      entries.push({
        geometry: new T.ConeBufferGeometry(0.3, 0.24, 12),
        matrix: new T.Matrix4().makeTranslation(x, y + 3.02, z),
        color: C.rose
      });
      bulbs.push({
        geometry: new T.SphereBufferGeometry(0.17, 10, 8),
        matrix: new T.Matrix4().makeTranslation(x, y + 2.82, z)
      });
      var glow = P.makeGlowSprite(0xffd79a, 1.65, 0.55);
      glow.position.set(x, y + 2.82, z);
      island.add(glow);
      glows.push(glow);

      var light = new T.PointLight(0xffc77a, 0, 8.5, 2);
      light.position.set(x, y + 2.52, z);
      island.add(light);
      lights.push(light);
    });

    P.addBatch(island, entries, { name: 'LampPosts' });

    var bulbMaterial = new T.MeshStandardMaterial({
      color: 0xfff2cf,
      emissive: 0xffc878,
      emissiveIntensity: 1.35,
      roughness: 0.35
    });
    var bulbMesh = new T.Mesh(
      P.mergeTransformed(bulbs, false),
      bulbMaterial
    );
    bulbMesh.castShadow = false;
    island.add(bulbMesh);

    return {
      positions: defs.map(function (def) {
        return {
          x: def[0],
          z: def[1],
          y: P.islandHeight(def[0], def[1])
        };
      }),
      lights: lights,
      glows: glows,
      bulbMaterial: bulbMaterial
    };
  }

  /* --------------------------------------------------------------------- */
  /* Fountain                                                               */
  /* --------------------------------------------------------------------- */

  function buildFountain(world) {
    var island = world.island;
    var group = new T.Group();
    var y = P.islandHeight(0, 4.4);
    group.position.set(0, y, 4.4);
    group.name = 'Fountain';

    var entries = [];
    entries.push({
      geometry: new T.CylinderBufferGeometry(1.65, 1.78, 0.34, 40),
      matrix: new T.Matrix4().makeTranslation(0, 0.17, 0),
      color: C.cream
    });
    entries.push({
      geometry: new T.TorusBufferGeometry(1.63, 0.12, 7, 64),
      matrix: new T.Matrix4().compose(
        new T.Vector3(0, 0.35, 0),
        new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2),
        new T.Vector3(1, 1, 1)
      ),
      color: C.mint
    });
    entries.push({
      geometry: new T.CylinderBufferGeometry(0.16, 0.22, 0.78, 12),
      matrix: new T.Matrix4().makeTranslation(0, 0.73, 0),
      color: C.creamDeep
    });
    entries.push({
      geometry: new T.CylinderBufferGeometry(0.82, 0.32, 0.22, 24),
      matrix: new T.Matrix4().makeTranslation(0, 1.15, 0),
      color: C.mint
    });
    entries.push({
      geometry: new T.CylinderBufferGeometry(0.13, 0.18, 0.52, 10),
      matrix: new T.Matrix4().makeTranslation(0, 1.5, 0),
      color: C.creamDeep
    });
    entries.push({
      geometry: new T.CylinderBufferGeometry(0.5, 0.16, 0.18, 20),
      matrix: new T.Matrix4().makeTranslation(0, 1.82, 0),
      color: C.mint
    });
    entries.push({
      geometry: new T.SphereBufferGeometry(0.16, 10, 8),
      matrix: new T.Matrix4().makeTranslation(0, 1.98, 0),
      color: C.gold
    });
    P.addBatch(group, entries, { name: 'FountainBase' });

    var water = new T.Mesh(
      new T.CircleBufferGeometry(1.52, 48),
      new T.MeshStandardMaterial({
        color: C.water,
        roughness: 0.15,
        metalness: 0.08,
        transparent: true,
        opacity: 0.82
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.355;
    water.receiveShadow = true;
    group.add(water);

    // arcing jets
    var jetEntries = [];
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      var curve = new T.QuadraticBezierCurve3(
        new T.Vector3(0, 2.0, 0),
        new T.Vector3(Math.cos(a) * 1.25, 2.45, Math.sin(a) * 1.25),
        new T.Vector3(Math.cos(a) * 1.9, 0.38, Math.sin(a) * 1.9)
      );
      jetEntries.push({
        geometry: new T.TubeBufferGeometry(curve, 22, 0.022, 4, false),
        matrix: new T.Matrix4()
      });
    }
    var jets = new T.Mesh(
      P.mergeTransformed(jetEntries, false),
      new T.MeshStandardMaterial({
        color: 0xd5f6ff,
        transparent: true,
        opacity: 0.72,
        roughness: 0.2,
        metalness: 0.05
      })
    );
    group.add(jets);

    var waterGlow = P.makeGlowSprite(0xaee8ff, 2.4, 0.28);
    waterGlow.position.set(0, 1.2, 0);
    group.add(waterGlow);

    // petals on the water
    var petalEntries = [];
    var flowerColors = [C.pink, C.butter, C.lavender, C.white];
    var petalGeo = new T.SphereBufferGeometry(0.075, 8, 6);
    for (var f = 0; f < 10; f++) {
      var fa = (f / 10) * Math.PI * 2;
      var fr = 0.45 + (f % 4) * 0.24;
      petalEntries.push({
        geometry: petalGeo,
        matrix: new T.Matrix4().compose(
          new T.Vector3(Math.cos(fa) * fr, 0.37, Math.sin(fa) * fr),
          new T.Quaternion(),
          new T.Vector3(1, 0.45, 1)
        ),
        color: flowerColors[f % flowerColors.length]
      });
    }
    P.addBatch(group, petalEntries, { name: 'FountainPetals', castShadow: false });

    island.add(group);

    world.updaters.push(function (dt, time) {
      water.rotation.z += dt * 0.08;
      jets.scale.y = 1 + Math.sin(time * 2.4) * 0.035;
      waterGlow.material.opacity = 0.2 + Math.sin(time * 1.8 + 0.6) * 0.07;
    });
  }

  /* --------------------------------------------------------------------- */
  /* Trees                                                                  */
  /* --------------------------------------------------------------------- */

  function buildTrees(world) {
    var island = world.island;
    var defs = [
      { x: -11.7, z: 7.7, h: 4.0, r: 1.25, f: C.pink, s: C.blush },
      { x: -10.8, z: -7.2, h: 3.4, r: 1.0, f: C.grassDeep, s: C.grass },
      { x: -2.0, z: -2.0, h: 3.5, r: 1.15, f: C.grassDeep, s: C.grass },
      { x: -3.4, z: 12.2, h: 2.9, r: 0.95, f: C.grassDeep, s: C.grassLight },
      { x: -1.5, z: -7.5, h: 3.1, r: 0.92, f: C.grass, s: C.grassDeep },
      { x: -2.1, z: -13.1, h: 2.8, r: 0.9, f: C.pink, s: C.blush }
    ];

    defs.forEach(function (def) {
      var tree = P.createTree({
        height: def.h,
        radius: def.r,
        foliage: def.f,
        secondary: def.s,
        clusters: 4
      });
      tree.position.set(def.x, P.islandHeight(def.x, def.z) + 0.02, def.z);
      tree.rotation.y = def.x * 0.7;
      island.add(tree);
    });

    // low topiary puffs near the carousel and ferris queues
    var topiaryEntries = [];
    var puff = new T.SphereBufferGeometry(1, 10, 8);
    [
      [-3.2, 7.4, 0.45, C.grassDeep],
      [7.65, 7.7, 0.52, C.grass],
      [-8.75, 0.2, 0.5, C.grass],
      [-5.3, 0.0, 0.42, C.grassDeep],
      [11.5, 4.0, 0.55, C.grass],
      [-9.2, 11.8, 0.58, C.grassDeep]
    ].forEach(function (d) {
      var gy = P.islandHeight(d[0], d[1]);
      topiaryEntries.push({
        geometry: puff,
        matrix: new T.Matrix4().compose(
          new T.Vector3(d[0], gy + d[2] * 0.6, d[1]),
          new T.Quaternion(),
          new T.Vector3(d[2], d[2] * 0.8, d[2])
        ),
        color: d[3]
      });
    });
    P.addBatch(island, topiaryEntries, { name: 'Topiary' });
  }

  /* --------------------------------------------------------------------- */
  /* Flowers                                                                */
  /* --------------------------------------------------------------------- */

  function buildFlowers(world) {
    var island = world.island;
    var rnd = P.rng(443);
    var blossomGeom = new T.SphereBufferGeometry(1, 8, 6);
    var leafGeom = new T.SphereBufferGeometry(1, 8, 6);
    var flowerColors = [C.pink, C.rose, C.butter, C.lavender, C.white, C.peach];
    var flowerEntries = [];
    var leafEntries = [];
    var safeRadius = 15.18;

    function keepOnIsland(x, z) {
      var radius = Math.sqrt(x * x + z * z);
      if (radius > safeRadius) {
        var scale = safeRadius / radius;
        x *= scale;
        z *= scale;
      }
      return [x, z];
    }

    var clusters = [
      [-4.4, 13.0, 1.1, 16],
      [4.4, 13.0, 1.1, 16],
      [-5.8, 9.9, 0.8, 12],
      [5.9, 9.8, 0.8, 12],
      [-6.9, 6.9, 0.9, 14],
      [8.3, 4.0, 0.9, 14],
      [-8.7, 13.0, 1.1, 18],
      [9.0, 13.0, 1.1, 18],
      [2.6, 7.9, 0.55, 8],
      [-3.0, 2.4, 0.55, 8]
    ];

    clusters.forEach(function (cluster) {
      for (var i = 0; i < cluster[3]; i++) {
        var a = rnd() * Math.PI * 2;
        var r = Math.sqrt(rnd()) * cluster[2];
        var point = keepOnIsland(
          cluster[0] + Math.cos(a) * r,
          cluster[1] + Math.sin(a) * r
        );
        var x = point[0];
        var z = point[1];
        var y = P.islandHeight(x, z);
        var size = 0.055 + rnd() * 0.06;
        flowerEntries.push({
          geometry: blossomGeom,
          matrix: new T.Matrix4().compose(
            new T.Vector3(x, y + 0.2 + rnd() * 0.12, z),
            new T.Quaternion(),
            new T.Vector3(size, size * 0.8, size)
          ),
          color: flowerColors[Math.floor(rnd() * flowerColors.length)]
        });
        if (i % 3 === 0) {
          leafEntries.push({
            geometry: leafGeom,
            matrix: new T.Matrix4().compose(
              new T.Vector3(x, y + 0.09, z),
              new T.Quaternion(),
              new T.Vector3(0.17, 0.1, 0.17)
            ),
            color: rnd() > 0.5 ? C.grassDeep : C.grass
          });
        }
      }
    });

    // A loose ribbon of wildflowers around the promenade. This uses the
    // shared scatter helper so it can never cross the island rim.
    P.scatterOnIsland({
      count: 120,
      minRadius: 14.05,
      maxRadius: 14.60,
      rnd: rnd,
      accept: function (x, z) {
        return !(z > 14.0 && Math.abs(x) < 2.7);
      },
      place: function (wx, wz, wy) {
        var wsize = 0.045 + rnd() * 0.045;
        flowerEntries.push({
          geometry: blossomGeom,
          matrix: new T.Matrix4().compose(
            new T.Vector3(wx, wy + 0.16 + rnd() * 0.1, wz),
            new T.Quaternion(),
            new T.Vector3(wsize, wsize * 0.8, wsize)
          ),
          color: flowerColors[Math.floor(rnd() * flowerColors.length)]
        });
      }
    });

    var leafMesh = P.addBatch(island, leafEntries, { name: 'FlowerLeaves', castShadow: false });
    var headMesh = P.addBatch(island, flowerEntries, { name: 'FlowerHeads', castShadow: false });
    P.assertInsideIsland(headMesh, 15.36, 'FlowerHeads');
    P.assertInsideIsland(leafMesh, 15.36, 'FlowerLeaves');
  }

  /* --------------------------------------------------------------------- */
  /* Benches                                                                */
  /* --------------------------------------------------------------------- */

  function buildBenches(world) {
    var island = world.island;
    var entries = [];
    var seatGeo = new T.BoxBufferGeometry(1.5, 0.12, 0.5);
    var backGeo = new T.BoxBufferGeometry(1.5, 0.12, 0.45);
    var legGeo = P.unitCylinder;

    function bench(cx, cz, rot) {
      var y = P.islandHeight(cx, cz);
      var m = new T.Matrix4().makeRotationY(rot);
      m.setPosition(new T.Vector3(cx, y, cz));

      function part(geo, local, color) {
        entries.push({
          geometry: geo,
          matrix: m.clone().multiply(local),
          color: color
        });
      }

      part(seatGeo, new T.Matrix4().makeTranslation(0, 0.52, 0), C.wood);
      part(backGeo, new T.Matrix4().makeTranslation(0, 0.83, -0.2), C.wood);
      part(seatGeo, new T.Matrix4().makeTranslation(0, 0.5, 0.02), C.creamDeep);
      [-0.58, 0.58].forEach(function (x) {
        part(legGeo, P.cylinderMatrix(
          new T.Vector3(x, 0, -0.17),
          new T.Vector3(x, 0.49, -0.17),
          0.055
        ), C.inkSoft);
        part(legGeo, P.cylinderMatrix(
          new T.Vector3(x, 0, 0.17),
          new T.Vector3(x, 0.49, 0.17),
          0.055
        ), C.inkSoft);
      });
      // back supports
      [-0.58, 0.58].forEach(function (x) {
        part(legGeo, P.cylinderMatrix(
          new T.Vector3(x, 0.52, -0.2),
          new T.Vector3(x, 0.82, -0.26),
          0.045
        ), C.wood);
      });
    }

    bench(-5.7, 6.8, 0.75);
    bench(8.8, 3.2, -0.65);
    bench(-1.4, 0.8, Math.PI);

    P.addBatch(island, entries, { name: 'Benches' });
  }

  /* --------------------------------------------------------------------- */
  /* Tiny visitors                                                          */
  /* --------------------------------------------------------------------- */

  function buildPeople(world) {
    var island = world.island;
    var people = [
      [0.8, 9.4, 0.2, C.pink, C.inkSoft],
      [-0.9, 10.6, Math.PI, C.mint, C.butter],
      [1.4, 5.6, 2.4, C.lavender, C.rose],
      [-2.2, 3.2, 0.8, C.butter, C.ink],
      [-6.6, -1.0, 0.4, C.seafoam, C.inkSoft],
      [5.0, 6.9, 2.8, C.rose, C.creamDeep],
      [3.2, 3.0, 1.3, C.peach, C.inkSoft],
      [-2.3, 8.0, 2.0, C.sky, C.rose]
    ];
    var entries = [];
    var bodyGeo = new T.CylinderBufferGeometry(0.15, 0.22, 0.62, 8);
    var headGeo = new T.SphereBufferGeometry(0.16, 10, 8);
    var hairGeo = new T.SphereBufferGeometry(1, 10, 8);
    var legGeo = new T.CylinderBufferGeometry(0.055, 0.05, 0.48, 6);

    people.forEach(function (person, index) {
      var x = person[0];
      var z = person[1];
      var rot = person[2];
      var shirt = person[3];
      var accent = person[4];
      var y = P.islandHeight(x, z) + 0.02;
      var base = new T.Matrix4().makeRotationY(rot);
      base.setPosition(new T.Vector3(x, y, z));

      function addLocal(geometry, localMatrix, color) {
        entries.push({
          geometry: geometry,
          matrix: base.clone().multiply(localMatrix),
          color: color
        });
      }

      addLocal(legGeo, new T.Matrix4().makeTranslation(-0.09, 0.26, 0), C.creamDeep);
      addLocal(legGeo, new T.Matrix4().makeTranslation(0.09, 0.26, 0), C.creamDeep);
      addLocal(bodyGeo, new T.Matrix4().makeTranslation(0, 0.78, 0), shirt);
      addLocal(headGeo, new T.Matrix4().makeTranslation(0, 1.25, 0), 0xffd9b8);
      addLocal(hairGeo, new T.Matrix4().compose(
        new T.Vector3(0, 1.33, -0.015),
        new T.Quaternion(),
        new T.Vector3(0.16, 0.085, 0.16)
      ), accent);
      addLocal(new T.CylinderBufferGeometry(0.045, 0.045, 0.44, 6),
        new T.Matrix4().compose(
          new T.Vector3(0.22, 0.83, 0),
          new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), -0.35),
          new T.Vector3(1, 1, 1)
        ), 0xffd9b8);
      addLocal(new T.CylinderBufferGeometry(0.045, 0.045, 0.44, 6),
        new T.Matrix4().compose(
          new T.Vector3(-0.22, 0.83, 0),
          new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), 0.35),
          new T.Vector3(1, 1, 1)
        ), 0xffd9b8);
    });

    P.addBatch(island, entries, { name: 'Visitors' });
  }

  /* --------------------------------------------------------------------- */
  /* Bunting                                                                */
  /* --------------------------------------------------------------------- */

  function buildBunting(world, lamps) {
    var island = world.island;
    var points = lamps.positions;
    var start = new T.Vector3(-4.95, points[0].y + 3.0, 8.85);
    var end = new T.Vector3(4.95, points[1].y + 3.0, 8.85);
    var bunting = P.createBunting(
      start,
      end,
      15,
      [C.pink, C.mint, C.butter, C.lavender, C.rose],
      0.9
    );
    island.add(bunting);

    var start2 = new T.Vector3(-4.9, points[2].y + 3.0, 1.2);
    var end2 = new T.Vector3(4.9, points[3].y + 3.0, 1.2);
    var bunting2 = P.createBunting(
      start2,
      end2,
      14,
      [C.butter, C.lavender, C.pink, C.seafoam],
      0.8
    );
    island.add(bunting2);
  }

  /* --------------------------------------------------------------------- */
  /* Hot-air balloons                                                       */
  /* --------------------------------------------------------------------- */

  function makeBalloonGeometry(colors) {
    var entries = [];
    var slices = 8;
    var radius = 1.52;
    var envelopeCenter = 3.05;

    for (var i = 0; i < slices; i++) {
      var start = (i / slices) * Math.PI * 2;
      var len = (Math.PI * 2) / slices;
      entries.push({
        geometry: new T.SphereBufferGeometry(radius, 10, 11, start, len),
        matrix: new T.Matrix4().compose(
          new T.Vector3(0, envelopeCenter, 0),
          new T.Quaternion(),
          new T.Vector3(1, 1.17, 1)
        ),
        color: colors[i % colors.length]
      });
    }

    // equator ribbon
    entries.push({
      geometry: new T.TorusBufferGeometry(radius * 1.008, 0.045, 5, 48),
      matrix: new T.Matrix4().compose(
        new T.Vector3(0, envelopeCenter, 0),
        new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2),
        new T.Vector3(1, 1, 1)
      ),
      color: C.cream
    });

    // neck and top cap
    entries.push({
      geometry: new T.CylinderBufferGeometry(0.38, 0.2, 0.35, 12),
      matrix: new T.Matrix4().makeTranslation(0, 1.58, 0),
      color: colors[0]
    });
    entries.push({
      geometry: new T.CylinderBufferGeometry(0.12, 0.12, 0.18, 10),
      matrix: new T.Matrix4().makeTranslation(0, 4.91, 0),
      color: C.butter
    });
    entries.push({
      geometry: new T.SphereBufferGeometry(0.16, 8, 6),
      matrix: new T.Matrix4().makeTranslation(0, 5.03, 0),
      color: C.cream
    });

    // basket
    entries.push({
      geometry: new T.BoxBufferGeometry(0.82, 0.55, 0.82),
      matrix: new T.Matrix4().makeTranslation(0, 0.52, 0),
      color: C.wood
    });
    entries.push({
      geometry: new T.BoxBufferGeometry(0.9, 0.08, 0.9),
      matrix: new T.Matrix4().makeTranslation(0, 0.8, 0),
      color: C.creamDeep
    });
    entries.push({
      geometry: new T.CylinderBufferGeometry(0.16, 0.19, 0.24, 10),
      matrix: new T.Matrix4().makeTranslation(0, 1.05, 0),
      color: C.gold
    });

    // ropes
    var corners = [
      [-0.35, 0.9, -0.35],
      [0.35, 0.9, -0.35],
      [-0.35, 0.9, 0.35],
      [0.35, 0.9, 0.35]
    ];
    corners.forEach(function (c) {
      entries.push(P.cylinderEntry(
        new T.Vector3(c[0], c[1], c[2]),
        new T.Vector3(c[0] * 0.45, 1.75, c[2] * 0.45),
        0.018,
        C.creamDeep
      ));
    });

    // passengers
    entries.push({
      geometry: new T.SphereBufferGeometry(0.105, 8, 6),
      matrix: new T.Matrix4().makeTranslation(-0.17, 0.92, 0.0),
      color: C.inkSoft
    });
    entries.push({
      geometry: new T.SphereBufferGeometry(0.105, 8, 6),
      matrix: new T.Matrix4().makeTranslation(0.17, 0.92, 0.0),
      color: C.rose
    });

    return P.mergeTransformed(entries, true);
  }

  function buildBalloons(world) {
    var balloonMaterial = P.materials.vertexGloss.clone();
    balloonMaterial.vertexColors = T.VertexColors;
    balloonMaterial.emissive = new T.Color(0x000000);
    balloonMaterial.emissiveIntensity = 0;
    world.balloonMaterial = balloonMaterial;

    var defs = [
      {
        x: -30.0, y: 10.5, z: 4.0, s: 0.80, spin: 0.08,
        colors: [C.pink, C.cream, C.mint, C.butter]
      },
      {
        x: 16.0, y: 12.5, z: -8.0, s: 0.80, spin: -0.06,
        colors: [C.mint, C.cream, C.lavender, C.butter]
      },
      {
        x: -24.0, y: 12.0, z: -16.0, s: 0.70, spin: 0.1,
        colors: [C.butter, C.peach, C.cream, C.rose]
      }
    ];

    var balloons = [];
    defs.forEach(function (def, i) {
      var group = new T.Group();
      var mesh = new T.Mesh(makeBalloonGeometry(def.colors), balloonMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      group.add(mesh);

      var glow = P.makeGlowSprite(0xffc77f, 1.0, 0.55);
      glow.position.set(0, 1.12, 0);
      group.add(glow);

      group.position.set(def.x, def.y, def.z);
      group.scale.setScalar(def.s);
      group.name = 'Balloon' + i;
      world.scene.add(group);

      balloons.push({
        object: group,
        baseX: def.x,
        baseY: def.y,
        phase: i * 1.35 + 0.4,
        spin: def.spin
      });
    });

    world.updaters.push(function (dt, time) {
      for (var i = 0; i < balloons.length; i++) {
        var b = balloons[i];
        b.object.position.x = b.baseX + Math.sin(time * 0.12 + b.phase) * 0.6;
        b.object.position.y = b.baseY + Math.sin(time * 0.34 + b.phase) * 0.45;
        b.object.rotation.y += b.spin * dt;
      }
    });
  }
})();

