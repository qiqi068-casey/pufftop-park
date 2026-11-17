/* ==========================================================================
   Pufftop Park — world: renderer, sky, light, floating island & clouds
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;
  var C = P.C;

  var ISLAND_RADIUS = 16.25;

  /* --------------------------------------------------------------------- */
  /* Terrain height is shared by paths, fences and props.                   */
  /* --------------------------------------------------------------------- */

  P.islandHeight = function (x, z) {
    var r = Math.sqrt(x * x + z * z);
    if (r > ISLAND_RADIUS) return 0;
    var angle = Math.atan2(z, x);
    var edge = P.smoothstep(9.5, 16.0, r);
    var ripple =
      0.085 * Math.sin(angle * 4.2 + r * 0.55) +
      0.055 * Math.cos(angle * 7.0 - r * 0.38) +
      0.035 * Math.sin(angle * 11.0 + 0.8);
    var rim = 0.11 * P.smoothstep(14.8, 16.15, r) * (0.5 + 0.5 * Math.sin(angle * 3 + 1.2));
    return 0.02 + edge * ripple * 0.55 + rim;
  };

  /* --------------------------------------------------------------------- */
  /* Setup                                                                  */
  /* --------------------------------------------------------------------- */

  P.createWorld = function () {
    var mount = document.getElementById('scene');

    var renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Keep the r97 renderer on its linear exposure: the hand-picked pastel
    // palette is designed around this output and filmic curves wash it out.
    renderer.toneMapping = T.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.id = 'webgl-canvas';
    mount.appendChild(renderer.domElement);

    var scene = new T.Scene();
    scene.fog = new T.Fog(0xf2e2eb, 62, 190);

    var camera = new T.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );
    camera.position.set(26, 12.5, 34);

    var controls = new P.OrbitControls(
      camera,
      renderer.domElement,
      new T.Vector3(0, 3.4, 0)
    );

    var world = {
      renderer: renderer,
      scene: scene,
      camera: camera,
      controls: controls,
      island: null,
      clouds: null,
      updaters: [],
      time: 0,
      islandRadius: ISLAND_RADIUS
    };

    world.lights = createLights(scene);
    world.sky = createSky(scene);

    world.island = createIsland();
    scene.add(world.island);

    world.clouds = createClouds();
    scene.add(world.clouds);

    world.petals = createPetals(scene);

    P.world = world;
    return world;
  };

  /* --------------------------------------------------------------------- */
  /* Light                                                                  */
  /* --------------------------------------------------------------------- */

  function createLights(scene) {
    var hemi = new T.HemisphereLight(0xe6f6ff, 0xf7dbe6, 0.54);
    hemi.position.set(0, 25, 0);
    scene.add(hemi);

    var key = new T.DirectionalLight(0xfff4e2, 0.84);
    key.position.set(-24, 34, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.camera.left = -26;
    key.shadow.camera.right = 26;
    key.shadow.camera.top = 26;
    key.shadow.camera.bottom = -26;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 95;
    key.shadow.bias = -0.00035;
    key.shadow.radius = 3.5;
    key.target.position.set(0, 2.0, 0);
    scene.add(key);
    scene.add(key.target);

    var fill = new T.DirectionalLight(0xffd3e4, 0.22);
    fill.position.set(22, 12, -20);
    scene.add(fill);

    // A soft rose bounce from below keeps the rocky underside readable.
    var under = new T.DirectionalLight(0xffd4e3, 0.16);
    under.position.set(16, -14, 20);
    under.target.position.set(0, -5, 0);
    scene.add(under);
    scene.add(under.target);

    var bounce = new T.AmbientLight(0xcfe9ff, 0.1);
    scene.add(bounce);

    return {
      hemi: hemi,
      key: key,
      fill: fill,
      under: under,
      bounce: bounce
    };
  }

  /* --------------------------------------------------------------------- */
  /* Sky dome                                                               */
  /* --------------------------------------------------------------------- */

  function createSky(scene) {
    var radius = 280;
    var geometry = new T.SphereBufferGeometry(radius, 40, 24);
    var pos = geometry.attributes.position;
    var colors = new Float32Array(pos.count * 3);

    var top = new T.Color(0xa6b9e8);
    var mid = new T.Color(0xc8daf4);
    var horizon = new T.Color(0xffd8e7);
    var below = new T.Color(0xf2c6dc);
    var warm = new T.Color(0xffc9a7);
    var temp = new T.Color();

    var sunDir = new T.Vector3(-0.82, 0.24, -0.45).normalize();

    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i);
      var y = pos.getY(i);
      var z = pos.getZ(i);
      var ny = y / radius;

      if (ny >= 0) {
        // A cool lavender-blue upper sky over a warm pink horizon.
        temp.copy(horizon).lerp(mid, P.smoothstep(0.0, 0.18, ny));
        temp.lerp(top, P.smoothstep(0.18, 0.78, ny));
      } else {
        temp.copy(horizon).lerp(below, P.smoothstep(0.0, 0.55, -ny));
      }

      var dir = new T.Vector3(x, y, z).normalize();
      var sun = Math.max(0, dir.dot(sunDir));
      temp.lerp(warm, Math.pow(sun, 8) * 0.3);

      colors[i * 3] = temp.r;
      colors[i * 3 + 1] = temp.g;
      colors[i * 3 + 2] = temp.b;
    }

    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    var material = new T.MeshBasicMaterial({
      vertexColors: T.VertexColors,
      side: T.BackSide,
      depthWrite: false,
      fog: false
    });
    var sky = new T.Mesh(geometry, material);
    sky.name = 'SkyDome';
    sky.renderOrder = -20;
    scene.add(sky);

    var sunGlow = P.makeGlowSprite(0xffdda2, 42, 0.18);
    sunGlow.position.copy(sunDir).multiplyScalar(230);
    sunGlow.userData.decorativeGlow = false;
    scene.add(sunGlow);

    var sunCore = P.makeGlowSprite(0xfff4d5, 14, 0.42);
    sunCore.position.copy(sunDir).multiplyScalar(232);
    sunCore.userData.decorativeGlow = false;
    scene.add(sunCore);

    return {
      mesh: sky,
      material: material,
      sunGlow: sunGlow,
      sunCore: sunCore,
      radius: radius
    };
  }

  /* --------------------------------------------------------------------- */
  /* Main island                                                            */
  /* --------------------------------------------------------------------- */

  function createGrassGeometry() {
    var rings = 22;
    var segments = 112;
    var positions = [];
    var colors = [];
    var indices = [];

    var base = new T.Color(C.grass);
    var deep = new T.Color(C.grassDeep);
    var light = new T.Color(C.grassLight);
    var warm = new T.Color(0xcdefb0);
    var col = new T.Color();

    // centre vertex
    positions.push(0, P.islandHeight(0, 0), 0);
    col.copy(base).lerp(warm, 0.22);
    colors.push(col.r, col.g, col.b);

    for (var r = 1; r <= rings; r++) {
      var rNorm = r / rings;
      var radius = ISLAND_RADIUS * Math.pow(rNorm, 0.94);
      for (var s = 0; s < segments; s++) {
        var a = (s / segments) * Math.PI * 2;
        var wobble = 1 + 0.009 * Math.sin(a * 7 + 1.2) + 0.007 * Math.cos(a * 11);
        var x = Math.cos(a) * radius * wobble;
        var z = Math.sin(a) * radius * wobble;
        var y = P.islandHeight(x, z);
        positions.push(x, y, z);

        var patch = 0.5 + 0.5 * Math.sin(a * 5.0 + r * 0.47);
        var patch2 = 0.5 + 0.5 * Math.cos(a * 8.0 - r * 0.33 + 1.7);
        col.copy(base)
          .lerp(deep, patch * 0.48)
          .lerp(light, patch2 * 0.34)
          .lerp(warm, 0.1);
        if (rNorm > 0.88) col.lerp(deep, (rNorm - 0.88) * 1.4);
        colors.push(col.r, col.g, col.b);
      }
    }

    // centre fan
    for (var s0 = 0; s0 < segments; s0++) {
      var a0 = 1 + s0;
      var b0 = 1 + ((s0 + 1) % segments);
      indices.push(0, b0, a0);
    }

    // rings
    for (var ring = 0; ring < rings - 1; ring++) {
      var startA = 1 + ring * segments;
      var startB = 1 + (ring + 1) * segments;
      for (var q = 0; q < segments; q++) {
        var nq = (q + 1) % segments;
        var a1 = startA + q;
        var a2 = startA + nq;
        var b1 = startB + q;
        var b2 = startB + nq;
        indices.push(a1, a2, b1);
        indices.push(a2, b2, b1);
      }
    }

    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }

  function createRockGeometry() {
    var rings = 19;
    var segments = 84;
    var positions = [];
    var colors = [];
    var indices = [];

    var dark = new T.Color(C.rockDark);
    var mid = new T.Color(C.rock);
    var light = new T.Color(C.rockLight);
    var moss = new T.Color(0x8cae8c);
    var col = new T.Color();

    for (var i = 0; i < rings; i++) {
      var t = (i / (rings - 1)) * 0.965;
      var y = -0.34 - Math.pow(t, 0.92) * 13.45 + Math.sin(t * 18.0) * 0.16;
      var taper = Math.pow(1 - t, 0.61);
      var baseR = ISLAND_RADIUS * 0.995 * taper;
      var cx = 0.9 * Math.pow(t, 2.2);
      var cz = -0.45 * Math.pow(t, 1.8);

      for (var s = 0; s < segments; s++) {
        var a = (s / segments) * Math.PI * 2;
        var rough =
          1 +
          0.075 * Math.sin(a * 4 + t * 9.2) +
          0.045 * Math.cos(a * 9 - t * 13.4) +
          0.025 * Math.sin(a * 15 + t * 21.3);
        var r = Math.max(0.06, baseR * rough);
        var jitterY = 0.12 * Math.sin(a * 6 + t * 22.0);
        var px = cx + Math.cos(a) * r;
        var pz = cz + Math.sin(a) * r;
        var py = y + jitterY;

        positions.push(px, py, pz);

        var strata = 0.5 + 0.5 * Math.sin(py * 0.82 + a * 1.6 + t * 7.0);
        var fleck = 0.5 + 0.5 * Math.sin(a * 13 + t * 31 + 0.9);
        col.copy(dark).lerp(mid, 0.35 + strata * 0.5).lerp(light, fleck * 0.25);
        if (t < 0.18) col.lerp(moss, (0.18 - t) * 2.6);
        colors.push(col.r, col.g, col.b);
      }
    }

    // side faces
    for (var ring = 0; ring < rings - 1; ring++) {
      var startA = ring * segments;
      var startB = (ring + 1) * segments;
      for (var q = 0; q < segments; q++) {
        var nq = (q + 1) % segments;
        var a1 = startA + q;
        var a2 = startA + nq;
        var b1 = startB + q;
        var b2 = startB + nq;
        indices.push(a1, a2, b1);
        indices.push(a2, b2, b1);
      }
    }

    // irregular pointed tip
    var tipIndex = positions.length / 3;
    positions.push(1.7, -13.9, -0.9);
    var lastStart = (rings - 1) * segments;
    col.copy(dark).lerp(mid, 0.35);
    colors.push(col.r, col.g, col.b);

    for (var s2 = 0; s2 < segments; s2++) {
      var s3 = (s2 + 1) % segments;
      indices.push(lastStart + s2, lastStart + s3, tipIndex);
    }

    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }

  function createIsland() {
    var group = new T.Group();
    group.name = 'PufftopIsland';

    var rock = new T.Mesh(createRockGeometry(), P.materials.rock);
    rock.name = 'RockBase';
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    var grass = new T.Mesh(createGrassGeometry(), P.materials.grass);
    grass.name = 'GrassTop';
    grass.castShadow = false;
    grass.receiveShadow = true;
    group.add(grass);

    var soil = new T.Mesh(
      new T.CylinderBufferGeometry(ISLAND_RADIUS + 0.06, ISLAND_RADIUS - 0.38, 1.05, 112, 1, true),
      new T.MeshStandardMaterial({ color: C.soil, roughness: 1.0 })
    );
    soil.position.y = -0.48;
    soil.castShadow = true;
    soil.receiveShadow = true;
    group.add(soil);

    var grassLip = new T.Mesh(
      new T.TorusBufferGeometry(ISLAND_RADIUS - 0.03, 0.22, 8, 160),
      new T.MeshStandardMaterial({ color: C.grassDeep, roughness: 0.95 })
    );
    grassLip.rotation.x = Math.PI / 2;
    grassLip.position.y = 0.05;
    grassLip.castShadow = true;
    grassLip.receiveShadow = true;
    group.add(grassLip);

    var promenade = new T.Mesh(
      new T.RingBufferGeometry(14.6, 15.3, 120),
      new T.MeshStandardMaterial({
        color: 0xf5e7d2,
        roughness: 0.9,
        side: T.DoubleSide
      })
    );
    promenade.rotation.x = -Math.PI / 2;
    promenade.position.y = 0.075;
    promenade.receiveShadow = true;
    promenade.name = 'Promenade';
    group.add(promenade);

    addRockVines(group);
    return group;
  }

  function addRockVines(group) {
    var entries = [];
    var leaf = new T.SphereBufferGeometry(1, 8, 6);
    var vineAngles = [0.32, 1.15, 2.35, 3.42, 4.35, 5.32];

    vineAngles.forEach(function (angle, i) {
      var sway = Math.sin(i * 1.9) * 0.7;
      var curve = new T.CatmullRomCurve3([
        new T.Vector3(Math.cos(angle) * 15.75, -0.7, Math.sin(angle) * 15.75),
        new T.Vector3(Math.cos(angle) * 14.2 + sway * 0.1, -2.5, Math.sin(angle) * 14.2),
        new T.Vector3(Math.cos(angle) * 12.6 + sway, -4.4, Math.sin(angle) * 12.6),
        new T.Vector3(Math.cos(angle) * 11.5 + sway * 0.4, -5.8, Math.sin(angle) * 11.5)
      ], false, 'catmullrom', 0.45);

      entries.push({
        geometry: new T.TubeBufferGeometry(curve, 18, 0.035, 4, false),
        matrix: new T.Matrix4(),
        color: i % 2 === 0 ? C.grassDeep : 0x7f9b6f
      });

      for (var j = 1; j <= 3; j++) {
        var p = curve.getPointAt(j / 4.2);
        var s = 0.13 + (j % 2) * 0.05;
        entries.push({
          geometry: leaf,
          matrix: new T.Matrix4().compose(
            new T.Vector3(p.x + sway * 0.02, p.y + 0.06, p.z),
            new T.Quaternion(),
            new T.Vector3(s, s * 0.45, s)
          ),
          color: j === 2 ? C.grass : C.grassDeep
        });
      }
    });

    P.addBatch(group, entries, {
      name: 'RockVines',
      material: P.materials.vertexMatte
    });
  }

  /* --------------------------------------------------------------------- */
  /* Clouds                                                                 */
  /* --------------------------------------------------------------------- */

  function makeCloudGeometry(seed, puffCount, spread) {
    var rnd = P.rng(seed);
    var entries = [];
    var sphere = new T.SphereBufferGeometry(1, 15, 11);

    for (var i = 0; i < puffCount; i++) {
      var angle = rnd() * Math.PI * 2;
      var dist = Math.pow(rnd(), 0.72) * spread;
      var pos = new T.Vector3(
        Math.cos(angle) * dist,
        (rnd() - 0.5) * spread * 0.22,
        Math.sin(angle) * dist * 0.62
      );
      var base = 0.45 + rnd() * 0.7;
      if (i === 0) base = 1.05;
      var sx = base * (0.9 + rnd() * 0.35);
      var sy = base * (0.62 + rnd() * 0.2);
      var sz = base * (0.85 + rnd() * 0.3);
      var matrix = new T.Matrix4().compose(
        pos,
        new T.Quaternion().setFromAxisAngle(P.UP, rnd() * Math.PI),
        new T.Vector3(sx, sy, sz)
      );
      entries.push({ geometry: sphere, matrix: matrix, color: 0xffffff });
    }

    return P.mergeTransformed(entries, false);
  }

  function createClouds() {
    var group = new T.Group();
    group.name = 'Clouds';
    var rnd = P.rng(808);
    var clusters = [];

    var defs = [
      { a: 2.80, d: 30.0, y: -9.0, s: 4.6 },
      { a: 3.50, d: 31.0, y: -7.0, s: 5.6 },
      { a: 3.86, d: 30.0, y: -9.2, s: 6.6 },
      { a: 4.35, d: 32.0, y: -10.0, s: 6.0 },
      { a: 5.18, d: 28.0, y: -8.0, s: 7.0 },
      { a: 5.95, d: 29.0, y: -11.0, s: 5.5 },
      { a: 0.22, d: 36.0, y: -13.2, s: 6.6 },
      { a: 2.05, d: 35.0, y: -12.0, s: 5.4 },
      { a: 1.30, d: 19.0, y: -14.5, s: 3.8 },
      { a: 5.55, d: 22.0, y: -14.0, s: 5.6 },
      { a: 0.95, d: 38.0, y: 2.0, s: 4.2 },
      { a: 4.10, d: 44.0, y: 9.0, s: 5.0 },
      { a: 2.40, d: 46.0, y: 16.0, s: 4.4 }
    ];

    defs.forEach(function (def, index) {
      var geometry = makeCloudGeometry(101 + index * 19, 8 + (index % 3), 1.5);
      var material = (index > 7 ? P.materials.cloudPale : P.materials.cloud);
      var mesh = new T.Mesh(geometry, material);
      mesh.position.set(
        Math.cos(def.a) * def.d,
        def.y,
        Math.sin(def.a) * def.d
      );
      mesh.scale.setScalar(def.s);
      mesh.rotation.y = rnd() * Math.PI * 2;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.name = 'Cloud' + index;
      group.add(mesh);
      clusters.push({
        mesh: mesh,
        baseY: def.y,
        baseX: mesh.position.x,
        phase: rnd() * Math.PI * 2,
        drift: 0.4 + rnd() * 0.8
      });
    });

    // the soft cloud sea far below the island
    for (var i = 0; i < 13; i++) {
      var angle = (i / 13) * Math.PI * 2 + rnd() * 0.3;
      var dist = 18 + rnd() * 58;
      var scale = 10 + rnd() * 12;
      var geometry = makeCloudGeometry(900 + i * 31, 7 + (i % 4), 2.2);
      var mesh = new T.Mesh(geometry, P.materials.cloudPale);
      mesh.position.set(
        Math.cos(angle) * dist,
        -21 - rnd() * 8,
        Math.sin(angle) * dist
      );
      mesh.scale.set(scale, scale * 0.65, scale);
      mesh.rotation.y = rnd() * Math.PI * 2;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
    }

    group.userData.clusters = clusters;
    return group;
  }

  /* --------------------------------------------------------------------- */
  /* Air petals                                                             */
  /* --------------------------------------------------------------------- */

  function createPetals(scene) {
    var count = 96;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var sizes = new Float32Array(count);
    var rotations = new Float32Array(count);
    var spins = new Float32Array(count);
    var baseX = new Float32Array(count);
    var baseZ = new Float32Array(count);
    var baseY = new Float32Array(count);
    var fall = new Float32Array(count);
    var phase = new Float32Array(count);
    var windX = new Float32Array(count);
    var windZ = new Float32Array(count);
    var rnd = P.rng(177);

    var petalColors = [
      new T.Color(0xff8fae), // rose pink
      new T.Color(0x7fd7b8), // mint
      new T.Color(0xffe3a8), // warm cream
      new T.Color(0xb49ae8), // dreamy lavender
      new T.Color(0xffab86), // peach
      new T.Color(0x8bcdeb)  // sky
    ];

    for (var i = 0; i < count; i++) {
      var a = rnd() * Math.PI * 2;
      var d = 3 + rnd() * 14.5;
      baseX[i] = Math.cos(a) * d;
      baseZ[i] = Math.sin(a) * d;
      baseY[i] = 0.8 + rnd() * 13.2;
      fall[i] = 0.10 + rnd() * 0.30;
      phase[i] = rnd() * Math.PI * 2;
      windX[i] = (rnd() - 0.5) * 0.16;
      windZ[i] = (rnd() - 0.5) * 0.16;
      sizes[i] = 0.20 + rnd() * 0.20;
      rotations[i] = rnd() * Math.PI * 2;
      spins[i] = (rnd() - 0.5) * 1.8;

      positions[i * 3] = baseX[i];
      positions[i * 3 + 1] = baseY[i];
      positions[i * 3 + 2] = baseZ[i];

      var col = petalColors[Math.floor(rnd() * petalColors.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    var geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new T.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new T.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aRotation', new T.Float32BufferAttribute(rotations, 1));
    geometry.setAttribute('aSpin', new T.Float32BufferAttribute(spins, 1));

    var material = new T.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.72 },
        uPointScale: { value: 1000 },
        uMap: { value: P.petalTexture }
      },
      vertexShader: [
        'attribute float aSize;',
        'attribute float aRotation;',
        'attribute float aSpin;',
        'attribute vec3 aColor;',
        'uniform float uTime;',
        'uniform float uOpacity;',
        'uniform float uPointScale;',
        'varying vec3 vColor;',
        'varying float vAngle;',
        'varying float vAlpha;',
        'void main() {',
        '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
        '  float dist = max(1.0, -mvPosition.z);',
        '  gl_PointSize = clamp(aSize * uPointScale / dist, 1.5, 64.0);',
        '  float nearFade = smoothstep(3.0, 10.0, dist);',
        '  float farFade = 1.0 - smoothstep(65.0, 95.0, dist);',
        '  vAlpha = uOpacity * nearFade * farFade;',
        '  vColor = aColor;',
        '  vAngle = aRotation + uTime * aSpin;',
        '  gl_Position = projectionMatrix * mvPosition;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uMap;',
        'varying vec3 vColor;',
        'varying float vAngle;',
        'varying float vAlpha;',
        'void main() {',
        '  float c = cos(vAngle);',
        '  float s = sin(vAngle);',
        '  vec2 p = gl_PointCoord - vec2(0.5);',
        '  p = mat2(c, -s, s, c) * p;',
        '  vec4 tex = texture2D(uMap, p + vec2(0.5));',
        '  if (tex.a < 0.04) discard;',
        '  gl_FragColor = vec4(vColor, tex.a * vAlpha);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: T.NormalBlending
    });

    var points = new T.Points(geometry, material);
    points.name = 'AirPetals';
    points.frustumCulled = false;
    scene.add(points);
    scene.userData.petals = points;

    var positionAttribute = geometry.attributes.position;
    var positionArray = positionAttribute.array;

    function update(time) {
      material.uniforms.uTime.value = time;
      for (var p = 0; p < count; p++) {
        var y = baseY[p] - time * fall[p];
        y = 0.7 + ((y - 0.7) % 13 + 13) % 13;
        positionArray[p * 3] =
          baseX[p] + windX[p] * time * 0.35 + Math.sin(time * 0.18 + phase[p]) * 0.9;
        positionArray[p * 3 + 1] = y;
        positionArray[p * 3 + 2] =
          baseZ[p] + windZ[p] * time * 0.35 + Math.cos(time * 0.15 + phase[p]) * 0.9;
      }
      positionAttribute.needsUpdate = true;
    }

    function setOpacity(value) {
      material.uniforms.uOpacity.value = value;
    }

    function setViewport(width, height, fov) {
      material.uniforms.uPointScale.value = height / (2 * Math.tan(fov * Math.PI / 360));
    }

    return {
      points: points,
      material: material,
      update: update,
      setOpacity: setOpacity,
      setViewport: setViewport
    };
  }
})();
