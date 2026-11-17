/* ==========================================================================
   Pufftop Park — core helpers, palette and shared materials
   Built for Three.js r97 (vendored locally for fully offline playback).
   ========================================================================== */
(function () {
  'use strict';

  var P = (window.Pufftop = window.Pufftop || {});
  var T = THREE;

  // Three r97 still calls this addAttribute(); alias the modern name so the
  // scene code can stay forward-compatible and readable.
  if (!T.BufferGeometry.prototype.setAttribute) {
    T.BufferGeometry.prototype.setAttribute = T.BufferGeometry.prototype.addAttribute;
  }

  P.UP = new T.Vector3(0, 1, 0);

  /* ------------------------------- palette -------------------------------- */

  P.C = {
    ink:        0x5b4b5e,
    inkSoft:    0x837181,
    cream:      0xfff7e9,
    creamDeep:  0xf4e3cc,
    cloud:      0xfffbf7,
    pink:       0xffb6c9,
    rose:       0xf58eaa,
    blush:      0xffd6df,
    peach:      0xffc9a8,
    butter:     0xffe7a8,
    lemon:      0xffd976,
    mint:       0xa8e5d0,
    mintDeep:   0x72cbbd,
    seafoam:    0x8fd9cc,
    sky:        0xaadcf4,
    skyDeep:    0x82c5ea,
    lavender:   0xcbbdf1,
    lilac:      0xe4d8fb,
    grass:      0xb2e5a4,
    grassDeep:  0x82ca8a,
    grassLight: 0xd4f2bd,
    soil:       0xa48771,
    rock:       0xc0a992,
    rockDark:   0x977f76,
    rockLight:  0xdec5ad,
    wood:       0xc99474,
    gold:       0xe9bd72,
    water:      0xa9e3f2,
    white:      0xfffcf6
  };

  var C = P.C;

  /* -------------------------------- math ---------------------------------- */

  P.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  P.lerp = function (a, b, t) { return a + (b - a) * t; };

  P.smoothstep = function (a, b, x) {
    var t = P.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  /** Deterministic PRNG (mulberry32) so the park looks the same every visit. */
  P.rng = function (seed) {
    var s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ------------------------------- materials ------------------------------ */

  P.materials = {
    vertex: new T.MeshStandardMaterial({
      vertexColors: T.VertexColors,
      roughness: 0.86,
      metalness: 0.0
    }),
    vertexMatte: new T.MeshStandardMaterial({
      vertexColors: T.VertexColors,
      roughness: 1.0,
      metalness: 0.0
    }),
    vertexGloss: new T.MeshStandardMaterial({
      vertexColors: T.VertexColors,
      roughness: 0.46,
      metalness: 0.05
    }),
    vertexDouble: new T.MeshStandardMaterial({
      vertexColors: T.VertexColors,
      roughness: 0.88,
      metalness: 0.0,
      side: T.DoubleSide
    }),
    grass: new T.MeshStandardMaterial({
      vertexColors: T.VertexColors,
      roughness: 0.96,
      metalness: 0.0
    }),
    rock: new T.MeshStandardMaterial({
      vertexColors: T.VertexColors,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: true
    }),
    cloud: new T.MeshStandardMaterial({
      color: C.cloud,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.58,
      depthWrite: false
    }),
    cloudPale: new T.MeshStandardMaterial({
      color: C.cloud,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.34,
      depthWrite: false
    }),
    water: new T.MeshStandardMaterial({
      color: C.water,
      roughness: 0.22,
      metalness: 0.12,
      transparent: true,
      opacity: 0.86
    })
  };

  /* --------------------------- geometry batching -------------------------- */

  /**
   * Merge a list of transformed geometries into a single vertex-coloured mesh.
   * entries: [{ geometry, matrix, color }]
   */
  P.mergeTransformed = function (entries, useVertexColor) {
    var prepared = [];
    var total = 0;
    var hasColor = false;

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var g = entry.geometry;
      if (g.index) g = g.toNonIndexed();
      if (!g.attributes.normal) g.computeVertexNormals();
      var pos = g.attributes.position;
      var nor = g.attributes.normal;
      var matrix = entry.matrix || new T.Matrix4();
      var normalMatrix = new T.Matrix3().getNormalMatrix(matrix);
      if (entry.color !== undefined) hasColor = true;
      prepared.push({
        pos: pos,
        nor: nor,
        matrix: matrix,
        normalMatrix: normalMatrix,
        color: entry.color !== undefined ? new T.Color(entry.color) : null
      });
      total += pos.count;
    }

    var positions = new Float32Array(total * 3);
    var normals = new Float32Array(total * 3);
    var colors = useVertexColor || hasColor ? new Float32Array(total * 3) : null;

    var offset = 0;
    for (var e = 0; e < prepared.length; e++) {
      var item = prepared[e];
      var m = item.matrix.elements;
      var nm = item.normalMatrix.elements;
      var count = item.pos.count;
      for (var v = 0; v < count; v++) {
        var x = item.pos.getX(v);
        var y = item.pos.getY(v);
        var z = item.pos.getZ(v);

        positions[(offset + v) * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
        positions[(offset + v) * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        positions[(offset + v) * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];

        var nx = item.nor.getX(v);
        var ny = item.nor.getY(v);
        var nz = item.nor.getZ(v);
        var tx = nm[0] * nx + nm[3] * ny + nm[6] * nz;
        var ty = nm[1] * nx + nm[4] * ny + nm[7] * nz;
        var tz = nm[2] * nx + nm[5] * ny + nm[8] * nz;
        var len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
        normals[(offset + v) * 3] = tx / len;
        normals[(offset + v) * 3 + 1] = ty / len;
        normals[(offset + v) * 3 + 2] = tz / len;

        if (colors) {
          var col = item.color || new T.Color(0xffffff);
          colors[(offset + v) * 3] = col.r;
          colors[(offset + v) * 3 + 1] = col.g;
          colors[(offset + v) * 3 + 2] = col.b;
        }
      }
      offset += count;
    }

    var merged = new T.BufferGeometry();
    merged.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    if (colors) merged.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    merged.computeBoundingSphere();
    return merged;
  };

  /** Matrix that stretches a unit Y cylinder from a to b. */
  P.cylinderMatrix = function (a, b, radius) {
    var dir = new T.Vector3().subVectors(b, a);
    var len = dir.length() || 0.0001;
    var mid = new T.Vector3().addVectors(a, b).multiplyScalar(0.5);
    var q = new T.Quaternion().setFromUnitVectors(P.UP, dir.normalize());
    var scale = new T.Vector3(radius, len, radius);
    return new T.Matrix4().compose(mid, q, scale);
  };

  P.unitCylinder = new T.CylinderBufferGeometry(1, 1, 1, 8, 1, false);
  P.unitCylinder12 = new T.CylinderBufferGeometry(1, 1, 1, 12, 1, false);

  P.cylinderEntry = function (a, b, radius, color, geometry) {
    return {
      geometry: geometry || P.unitCylinder,
      matrix: P.cylinderMatrix(a, b, radius),
      color: color
    };
  };

  /** Add a merged, vertex-coloured mesh to a parent. */
  P.addBatch = function (parent, entries, opts) {
    opts = opts || {};
    var geometry = P.mergeTransformed(entries, true);
    var mesh = new T.Mesh(geometry, opts.material || P.materials.vertex);
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = opts.receiveShadow !== false;
    if (opts.name) mesh.name = opts.name;
    parent.add(mesh);
    return mesh;
  };

  P.addMesh = function (parent, geometry, material, opts) {
    opts = opts || {};
    var mesh = new T.Mesh(geometry, material);
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = opts.receiveShadow !== false;
    if (opts.name) mesh.name = opts.name;
    parent.add(mesh);
    return mesh;
  };

  /* ----------------------------- canvas helpers --------------------------- */

  P.makeGlowTexture = function () {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0.0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.22, 'rgba(255,248,226,0.95)');
    grad.addColorStop(0.5, 'rgba(255,235,190,0.35)');
    grad.addColorStop(1.0, 'rgba(255,230,180,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    var tex = new T.CanvasTexture(canvas);
    tex.encoding = T.sRGBEncoding;
    return tex;
  };

  P.glowTexture = P.makeGlowTexture();

  P.makePetalTexture = function () {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    var ctx = canvas.getContext('2d');
    ctx.translate(64, 64);

    // A narrow, pointed petal so it still reads at small sprite sizes.
    ctx.beginPath();
    ctx.moveTo(0, -54);
    ctx.bezierCurveTo(24, -42, 35, -9, 28, 20);
    ctx.bezierCurveTo(20, 43, 7, 53, 0, 59);
    ctx.bezierCurveTo(-7, 53, -20, 43, -28, 20);
    ctx.bezierCurveTo(-35, -9, -24, -42, 0, -54);
    ctx.closePath();

    var fill = ctx.createRadialGradient(-10, -18, 3, 0, 2, 52);
    fill.addColorStop(0, 'rgba(255,255,255,1)');
    fill.addColorStop(0.62, 'rgba(255,255,255,0.94)');
    fill.addColorStop(1, 'rgba(255,255,255,0.72)');
    ctx.fillStyle = fill;
    ctx.fill();

    // Subtle centre crease so the petal reads as a petal, not a dot.
    ctx.strokeStyle = 'rgba(180,150,165,0.12)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.quadraticCurveTo(2, 2, 0, 42);
    ctx.stroke();

    var texture = new T.CanvasTexture(canvas);
    texture.encoding = T.sRGBEncoding;
    texture.magFilter = T.LinearFilter;
    texture.minFilter = T.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  };

  P.petalTexture = P.makePetalTexture();

  P.makeGlowSprite = function (color, size, opacity) {
    var mat = new T.SpriteMaterial({
      map: P.glowTexture,
      color: color,
      transparent: true,
      opacity: opacity === undefined ? 0.85 : opacity,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: false
    });
    var sprite = new T.Sprite(mat);
    sprite.scale.set(size, size, 1);
    // Facility glows can be hidden wholesale in Daylight; sky sprites are
    // explicitly opted out where they are created.
    sprite.userData.decorativeGlow = true;
    return sprite;
  };

  P.roundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  P.makeTextTexture = function (title, subtitle, opts) {
    opts = opts || {};
    var w = opts.width || 1024;
    var h = opts.height || 256;
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');

    if (opts.background) {
      ctx.fillStyle = opts.background;
      P.roundRect(ctx, 8, 8, w - 16, h - 16, 48);
      ctx.fill();
      if (opts.border) {
        ctx.strokeStyle = opts.border;
        ctx.lineWidth = 7;
        ctx.stroke();
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.color || '#5b4b5e';
    ctx.font = (opts.weight || '700') + ' ' + (opts.size || 112) +
      'px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(title, w / 2, subtitle ? h * 0.43 : h * 0.52);

    if (subtitle) {
      ctx.fillStyle = opts.subColor || '#9b8493';
      ctx.font = '500 ' + (opts.subSize || 34) +
        'px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.letterSpacing = '8px';
      ctx.fillText(subtitle, w / 2, h * 0.77);
    }

    var tex = new T.CanvasTexture(canvas);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  };

  P.makePavingTexture = function () {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f6e8d2';
    ctx.fillRect(0, 0, 256, 256);
    var rnd = P.rng(19);
    for (var i = 0; i < 110; i++) {
      var x = rnd() * 256;
      var y = rnd() * 256;
      var r = 1 + rnd() * 4;
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(214,184,154,0.34)' : 'rgba(255,251,238,0.7)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    var tex = new T.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.encoding = T.sRGBEncoding;
    return tex;
  };

  /* ------------------------------ path ribbon ----------------------------- */

  P.createRibbonGeometry = function (points, width, segments) {
    segments = segments || 120;
    var curve = new T.CatmullRomCurve3(points, false, 'catmullrom', 0.35);
    var positions = [];
    var uvs = [];
    var indices = [];
    var prev = null;

    for (var i = 0; i <= segments; i++) {
      var t = i / segments;
      var p = curve.getPointAt(t);
      var tangent = curve.getTangentAt(t);
      tangent.y = 0;
      tangent.normalize();
      var side = new T.Vector3(-tangent.z, 0, tangent.x);
      var left = p.clone().addScaledVector(side, width * 0.5);
      var right = p.clone().addScaledVector(side, -width * 0.5);

      if (prev) {
        var base = (i - 1) * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }

      positions.push(left.x, left.y, left.z);
      positions.push(right.x, right.y, right.z);
      uvs.push(0, t * 8);
      uvs.push(1, t * 8);
      prev = p;
    }

    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  };

  /* ------------------------------- bunting -------------------------------- */

  P.createBunting = function (start, end, count, paletteColors, sag) {
    var group = new T.Group();
    sag = sag === undefined ? 1.0 : sag;
    var mid = new T.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y -= sag;
    var curve = new T.CatmullRomCurve3([
      start.clone(),
      new T.Vector3().lerpVectors(start, mid, 0.5),
      mid,
      new T.Vector3().lerpVectors(mid, end, 0.5),
      end.clone()
    ], false, 'catmullrom', 0.5);

    var stringGeom = new T.TubeBufferGeometry(curve, 64, 0.018, 4, false);
    var string = new T.Mesh(stringGeom, new T.MeshBasicMaterial({
      color: C.creamDeep,
      transparent: true,
      opacity: 0.9
    }));
    group.add(string);

    var positions = [];
    var colors = [];
    var colorObjs = paletteColors.map(function (c) { return new T.Color(c); });

    for (var i = 0; i < count; i++) {
      var t = (i + 0.5) / count;
      var p = curve.getPointAt(t);
      var tan = curve.getTangentAt(t);
      var side = new T.Vector3(-tan.z, 0, tan.x).normalize();
      var width = 0.3;
      var left = p.clone().addScaledVector(side, -width * 0.5);
      var right = p.clone().addScaledVector(side, width * 0.5);
      var tip = p.clone();
      tip.y -= 0.42 + 0.04 * Math.sin(i * 2.1);

      positions.push(left.x, left.y, left.z);
      positions.push(right.x, right.y, right.z);
      positions.push(tip.x, tip.y, tip.z);

      var col = colorObjs[i % colorObjs.length];
      for (var k = 0; k < 3; k++) colors.push(col.r, col.g, col.b);
    }

    var flagGeom = new T.BufferGeometry();
    flagGeom.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    flagGeom.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    flagGeom.computeVertexNormals();
    var flags = new T.Mesh(flagGeom, new T.MeshBasicMaterial({
      vertexColors: T.VertexColors,
      side: T.DoubleSide
    }));
    group.add(flags);
    return group;
  };

  /* --------------------------- generic tree/topiary ----------------------- */

  P.createTree = function (opts) {
    opts = opts || {};
    var height = opts.height || 3.2;
    var trunkH = height * 0.45;
    var entries = [];
    var trunkColor = opts.trunk || C.wood;
    entries.push(P.cylinderEntry(
      new T.Vector3(0, 0, 0),
      new T.Vector3(0, trunkH, 0),
      0.13,
      trunkColor,
      P.unitCylinder
    ));

    var foliageColor = opts.foliage || C.grassDeep;
    var secondary = opts.secondary || C.grass;
    var clusters = opts.clusters || 3;
    var radius = opts.radius || height * 0.34;
    for (var i = 0; i < clusters; i++) {
      var angle = (i / clusters) * Math.PI * 2 + 0.4;
      var spread = i === 0 ? 0 : radius * 0.55;
      var pos = new T.Vector3(
        Math.cos(angle) * spread,
        trunkH + radius * (0.5 + (i === 0 ? 0.45 : 0.12)) + (i % 2) * 0.16,
        Math.sin(angle) * spread
      );
      var s = i === 0 ? radius * 1.12 : radius * 0.78;
      entries.push({
        geometry: new T.IcosahedronBufferGeometry(1, 1),
        matrix: new T.Matrix4().compose(pos, new T.Quaternion(), new T.Vector3(s, s * 0.92, s)),
        color: i % 2 === 0 ? foliageColor : secondary
      });
    }

    var geometry = P.mergeTransformed(entries, true);
    var mesh = new T.Mesh(geometry, P.materials.vertexMatte);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
})();
