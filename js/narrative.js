/* ==========================================================================
   Pufftop Park — four small residents
   Low-poly, hand-animated characters with local context lines. No network,
   no model files, no dialogue system heavier than a few arrays.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;
  var C = P.C;

  P.createNarrative = function (world, options) {
    var opts = options || {};
    var island = world.island;
    var camera = world.camera;
    var canvas = world.renderer.domElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var motion = reduceMotion ? 0.38 : 1;

    var materialCache = {};
    var npcs = [];
    var dialogueOpen = false;
    var activeNpc = null;
    var activeLines = [];
    var activeLine = 0;
    var cooldowns = {};
    var weather = 'clear';
    var weatherTimer = 82 + Math.random() * 20;
    var lastPhase = null;
    var hovered = null;
    var downX = 0;
    var downY = 0;
    var downId = null;

    var dialogue = document.getElementById('dialogue');
    var dialogueName = document.getElementById('dialogue-name');
    var dialogueText = document.getElementById('dialogue-text');
    var dialogueNext = document.getElementById('dialogue-next');
    var dialogueClose = document.getElementById('dialogue-close');
    var prompt = document.getElementById('npc-prompt');
    var hover = document.getElementById('npc-hover');

    var raycaster = new T.Raycaster();
    var pointer = new T.Vector2();
    var temp = new T.Vector3();

    function material(color) {
      var key = String(color);
      if (!materialCache[key]) {
        materialCache[key] = new T.MeshStandardMaterial({
          color: color,
          roughness: 0.94,
          metalness: 0.0
        });
      }
      return materialCache[key];
    }

    function part(parent, geometry, color, x, y, z) {
      var mesh = new T.Mesh(geometry, material(color));
      mesh.position.set(x || 0, y || 0, z || 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function joint(parent, x, y, z) {
      var group = new T.Group();
      group.position.set(x, y, z);
      parent.add(group);
      return group;
    }

    function arm(parent, side, color, sleeve) {
      var pivot = joint(parent, side * 0.30, 0.94, 0);
      pivot.rotation.z = side * 0.2;
      var armMesh = part(
        pivot,
        new T.CylinderBufferGeometry(0.043, 0.05, 0.46, 6),
        sleeve,
        0,
        -0.22,
        0
      );
      part(pivot, new T.SphereBufferGeometry(0.052, 6, 5), 0xffd9b8, 0, -0.46, 0);
      return { pivot: pivot, mesh: armMesh };
    }

    function leg(parent, side, color) {
      var pivot = joint(parent, side * 0.09, 0.46, 0);
      part(pivot, new T.CylinderBufferGeometry(0.052, 0.06, 0.42, 6), color, 0, -0.21, 0);
      part(pivot, new T.BoxBufferGeometry(0.11, 0.07, 0.19), C.inkSoft, 0, -0.43, 0.045);
      return pivot;
    }

    function face(parent) {
      var eyeMat = material(0x4d3d54);
      [-1, 1].forEach(function (side) {
        var eye = new T.Mesh(new T.SphereBufferGeometry(0.018, 6, 5), eyeMat);
        eye.position.set(side * 0.055, 0.04, 0.145);
        parent.add(eye);
      });
      var mouth = new T.Mesh(
        new T.BoxBufferGeometry(0.045, 0.008, 0.008),
        material(0xb06f7d)
      );
      mouth.position.set(0, -0.025, 0.152);
      parent.add(mouth);
    }

    function makePerson(def) {
      var root = new T.Group();
      root.name = 'NPC_' + def.name;
      root.position.set(def.x, P.islandHeight(def.x, def.z) + 0.02, def.z);
      root.rotation.y = def.rotation || 0;

      var body = new T.Group();
      root.add(body);

      // A simple, readable silhouette: legs, rounded torso, head, two arms.
      var leftLeg = leg(root, -1, def.trousers || C.creamDeep);
      var rightLeg = leg(root, 1, def.trousers || C.creamDeep);
      part(body, new T.CylinderBufferGeometry(0.18, 0.23, 0.55, 8), def.shirt, 0, 0.8, 0);
      part(body, new T.CylinderBufferGeometry(0.235, 0.235, 0.07, 8), def.accent, 0, 0.56, 0);

      var head = new T.Group();
      head.position.set(0, 1.27, 0);
      body.add(head);
      part(head, new T.SphereBufferGeometry(0.16, 10, 8), 0xffd9b8, 0, 0, 0);
      var hair = part(head, new T.SphereBufferGeometry(0.17, 10, 8), def.hair, 0, 0.045, -0.028);
      hair.scale.set(1.02, 0.78, 1.02);
      face(head);

      var leftArm = arm(body, -1, def.skin || 0xffd9b8, def.accent);
      var rightArm = arm(body, 1, def.skin || 0xffd9b8, def.accent);

      var accessory = null;
      if (def.balloon) {
        accessory = new T.Group();
        accessory.position.set(0.38, 1.3, 0.02);
        var string = new T.Mesh(
          new T.CylinderBufferGeometry(0.007, 0.007, 0.75, 4),
          material(0xd6a8ae)
        );
        string.position.y = 0.36;
        accessory.add(string);
        var balloon = new T.Mesh(
          new T.SphereBufferGeometry(0.19, 12, 10),
          material(0xf28fa4)
        );
        balloon.scale.set(0.9, 1.12, 0.9);
        balloon.position.y = 0.82;
        balloon.castShadow = true;
        accessory.add(balloon);
        body.add(accessory);
      } else if (def.camera) {
        accessory = new T.Group();
        accessory.position.set(0, 0.96, 0.2);
        var cameraBody = new T.Mesh(
          new T.BoxBufferGeometry(0.22, 0.14, 0.1),
          material(0x6e6177)
        );
        cameraBody.castShadow = true;
        accessory.add(cameraBody);
        var lens = new T.Mesh(
          new T.CylinderBufferGeometry(0.055, 0.055, 0.08, 12),
          material(0x3f3948)
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.z = 0.08;
        accessory.add(lens);
        var strap = new T.Mesh(
          new T.TorusBufferGeometry(0.22, 0.012, 6, 18),
          material(0xd8b36f)
        );
        strap.rotation.x = Math.PI / 2;
        strap.scale.set(1, 1.22, 1);
        strap.position.set(0, 0.02, -0.04);
        accessory.add(strap);
        body.add(accessory);
      } else if (def.clipboard) {
        accessory = new T.Group();
        accessory.position.set(0.2, 0.84, 0.12);
        accessory.rotation.z = -0.24;
        var board = new T.Mesh(
          new T.BoxBufferGeometry(0.22, 0.3, 0.025),
          material(0xf6e4c8)
        );
        board.castShadow = true;
        accessory.add(board);
        var clip = new T.Mesh(
          new T.BoxBufferGeometry(0.08, 0.025, 0.03),
          material(0xb18a72)
        );
        clip.position.y = 0.16;
        accessory.add(clip);
        body.add(accessory);
      } else if (def.pinwheel) {
        accessory = new T.Group();
        accessory.position.set(0.28, 1.1, 0.1);
        var stick = new T.Mesh(
          new T.CylinderBufferGeometry(0.009, 0.009, 0.5, 4),
          material(0xd6a8ae)
        );
        stick.position.y = -0.15;
        accessory.add(stick);
        var wheel = new T.Group();
        wheel.position.y = 0.12;
        for (var w = 0; w < 4; w++) {
          var blade = new T.Mesh(
            new T.BoxBufferGeometry(0.11, 0.045, 0.008),
            material([0xffb6c9, 0xffe7a8, 0xa8e5d0, 0xcbbdf1][w])
          );
          blade.position.x = 0.06;
          blade.rotation.z = w * Math.PI / 2;
          wheel.add(blade);
        }
        accessory.add(wheel);
        accessory.userData.wheel = wheel;
        body.add(accessory);
      }

      var hitMaterial = new T.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      var hitMesh = new T.Mesh(new T.SphereBufferGeometry(0.52, 8, 6), hitMaterial);
      hitMesh.position.y = 0.85;
      root.add(hitMesh);

      var npc = {
        name: def.name,
        root: root,
        body: body,
        head: head,
        leftArm: leftArm.pivot,
        rightArm: rightArm.pivot,
        leftLeg: leftLeg,
        rightLeg: rightLeg,
        accessory: accessory,
        baseX: def.x,
        baseZ: def.z,
        baseRotation: def.rotation || 0,
        phase: Math.random() * Math.PI * 2,
        talking: false,
        lines: def.lines,
        hit: hitMesh,
        look: new T.Vector3()
      };
      hitMesh.userData.npc = npc;
      root.userData.npc = npc;
      island.add(root);
      npcs.push(npc);
      return npc;
    }

    function lineFor(npc) {
      var phase = (opts.getPhase && opts.getPhase()) || 'day';
      var set = npc.lines[phase] || npc.lines.day;
      var lines = set[weather] || set.clear;
      return lines;
    }

    function openDialogue(npc) {
      if (dialogueOpen || (opts.walk && opts.walk.isCardOpen())) return;
      var now = performance.now() / 1000;
      if (cooldowns[npc.name] && now < cooldowns[npc.name]) return;
      if (opts.walk && opts.walk.isCardOpen()) opts.walk.closeCard();
      activeNpc = npc;
      activeLines = lineFor(npc);
      activeLine = 0;
      dialogueOpen = true;
      npc.talking = true;
      if (dialogueName) dialogueName.textContent = npc.name;
      renderLine();
      if (dialogue) {
        dialogue.classList.add('is-visible');
        dialogue.setAttribute('aria-hidden', 'false');
      }
      if (prompt) prompt.classList.remove('is-visible');
    }

    function renderLine() {
      if (!dialogueText) return;
      dialogueText.textContent = activeLines[activeLine] || '';
      if (dialogueNext) {
        dialogueNext.textContent = activeLine >= activeLines.length - 1 ? 'Close' : 'Next';
      }
    }

    function nextLine() {
      if (!dialogueOpen) return;
      activeLine++;
      if (activeLine >= activeLines.length) closeDialogue();
      else renderLine();
    }

    function closeDialogue() {
      if (!dialogueOpen) return;
      if (activeNpc) {
        activeNpc.talking = false;
        cooldowns[activeNpc.name] = performance.now() / 1000 + 28;
      }
      dialogueOpen = false;
      activeNpc = null;
      activeLines = [];
      if (dialogue) {
        dialogue.classList.remove('is-visible');
        dialogue.setAttribute('aria-hidden', 'true');
      }
    }

    function nearestNpc(position) {
      var best = null;
      var bestDist = 3.2;
      for (var i = 0; i < npcs.length; i++) {
        var n = npcs[i];
        var d = Math.hypot(position.x - n.baseX, position.z - n.baseZ);
        if (d < bestDist) {
          bestDist = d;
          best = n;
        }
      }
      return best;
    }

    function updateLookAt(npc, time) {
      var phase = (opts.getPhase && opts.getPhase()) || 'day';
      var target = temp;
      if (npc.talking) {
        target.copy(camera.position);
      } else if (npc.name === 'Mira') {
        if (phase === 'night') target.set(0, 7.2, 0);
        else if (phase === 'dusk') target.set(-7, 3.4, -4.4);
        else target.set(0, 1.1, 4.4);
      } else if (npc.name === 'Theo') {
        if (phase === 'night') target.set(0, 7.5, 0);
        else target.set(-7, 4.2, -4.4);
      } else if (npc.name === 'June') {
        if (phase === 'night') target.set(0, 7.2, 0);
        else target.set(5.2, 2.4, -4.8);
      } else if (npc.name === 'Nico') {
        if (phase === 'night') target.set(0, 8.0, 0);
        else target.set(3.3, 2.2, -12.15);
      }

      var dx = target.x - npc.baseX;
      var dz = target.z - npc.baseZ;
      var dy = target.y - (P.islandHeight(npc.baseX, npc.baseZ) + 1.3);
      var yaw = Math.atan2(dx, dz) - npc.baseRotation;
      while (yaw > Math.PI) yaw -= Math.PI * 2;
      while (yaw < -Math.PI) yaw += Math.PI * 2;
      yaw = P.clamp(yaw, -0.82, 0.82);
      var pitch = P.clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.45, 0.45);

      var k = 1 - Math.exp(-3.2 * 0.016);
      npc.head.rotation.y += (yaw - npc.head.rotation.y) * k;
      npc.head.rotation.x += (pitch - npc.head.rotation.x) * k;
    }

    function updateNpc(npc, dt, time) {
      var phase = (opts.getPhase && opts.getPhase()) || 'day';
      var t = time + npc.phase;
      var breathe = Math.sin(t * 1.45) * 0.012 * motion;
      var sway = Math.sin(t * 0.72) * 0.018 * motion;

      npc.body.position.y = breathe;
      npc.body.rotation.z = sway;

      if (phase === 'night') {
        npc.leftArm.rotation.x = -0.16 + Math.sin(t * 0.55) * 0.04 * motion;
        npc.rightArm.rotation.x = -0.16 + Math.cos(t * 0.5) * 0.04 * motion;
      } else {
        npc.leftArm.rotation.x = Math.sin(t * 0.8) * 0.055 * motion;
        npc.rightArm.rotation.x = -0.08 + Math.cos(t * 0.78) * 0.055 * motion;
      }

      if (npc.name === 'Theo') {
        var cameraRaise = phase === 'day' ? 1.1 : phase === 'dusk' ? 0.78 : -0.08;
        npc.rightArm.rotation.x += (cameraRaise - npc.rightArm.rotation.x) * 0.035;
      }
      if (npc.name === 'June') {
        npc.leftArm.rotation.x = 0.1 + Math.sin(t * 0.55) * 0.035 * motion;
      }
      if (npc.name === 'Nico') {
        npc.root.position.y = P.islandHeight(npc.baseX, npc.baseZ) + 0.02 +
          Math.max(0, Math.sin(t * 2.2)) * 0.025 * motion;
        npc.leftLeg.rotation.x = Math.sin(t * 2.2) * 0.16 * motion;
        npc.rightLeg.rotation.x = -Math.sin(t * 2.2) * 0.16 * motion;
      }

      if (weather === 'breezy') {
        npc.body.rotation.z += Math.sin(t * 0.9) * 0.012 * motion;
        if (npc.name === 'Mira' && npc.accessory) {
          npc.accessory.rotation.z = Math.sin(t * 0.85) * 0.13 * motion;
          npc.accessory.rotation.x = Math.cos(t * 0.62) * 0.05 * motion;
        }
        if (npc.name === 'Nico' && npc.accessory && npc.accessory.userData.wheel) {
          npc.accessory.userData.wheel.rotation.z += dt * 4.2;
        } else if (npc.name === 'Nico' && npc.accessory) {
          npc.accessory.rotation.z = Math.sin(t * 1.1) * 0.08 * motion;
        }
      } else if (npc.name === 'Nico' && npc.accessory && npc.accessory.userData.wheel) {
        npc.accessory.userData.wheel.rotation.z += dt * 0.8;
      }

      updateLookAt(npc, time);
    }

    function updateWeather(dt) {
      weatherTimer -= dt;
      if (weatherTimer <= 0) {
        weather = weather === 'clear' ? 'breezy' : 'clear';
        weatherTimer = 76 + Math.random() * 30;
        P.weather = weather;
      }
    }

    function updatePrompt() {
      if (!prompt) return;
      var walk = opts.walk;
      if (!walk || !walk.isActive() || dialogueOpen || walk.isCardOpen()) {
        prompt.classList.remove('is-visible');
        return;
      }
      var n = nearestNpc(walk.getPosition());
      if (!n) {
        prompt.classList.remove('is-visible');
        return;
      }
      prompt.textContent = 'Press E to talk to ' + n.name;
      prompt.classList.add('is-visible');
    }

    function update(dt, time, playerPosition) {
      updateWeather(dt);
      var phase = (opts.getPhase && opts.getPhase()) || 'day';
      if (phase !== lastPhase) lastPhase = phase;

      for (var i = 0; i < npcs.length; i++) {
        updateNpc(npcs[i], dt, time);
      }

      // Keep a soft, very small presence wobble on the whole group.
      if (!reduceMotion) {
        for (var n = 0; n < npcs.length; n++) {
          npcs[n].root.position.y += Math.sin(time * 0.38 + npcs[n].phase) * 0.0006;
        }
      }

      updatePrompt();
    }

    /* ----------------------------- pick / talk --------------------------- */

    function pick(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      for (var i = 0; i < npcs.length; i++) {
        var hits = raycaster.intersectObject(npcs[i].root, true);
        if (hits.length) return npcs[i];
      }
      return null;
    }

    canvas.addEventListener('pointerdown', function (event) {
      downX = event.clientX;
      downY = event.clientY;
      downId = event.pointerId;
    });

    canvas.addEventListener('pointerup', function (event) {
      if (event.pointerId !== downId) return;
      var moved = Math.hypot(event.clientX - downX, event.clientY - downY);
      downId = null;
      if (moved > 5) return;
      var npc = pick(event.clientX, event.clientY);
      if (npc) openDialogue(npc);
    });

    canvas.addEventListener('pointermove', function (event) {
      if (dialogueOpen) {
        if (hover) hover.classList.remove('is-visible');
        return;
      }
      var npc = pick(event.clientX, event.clientY);
      hovered = npc;
      if (npc) {
        canvas.style.cursor = 'pointer';
        if (hover) {
          hover.textContent = npc.name;
          hover.style.left = (event.clientX + 14) + 'px';
          hover.style.top = (event.clientY + 12) + 'px';
          hover.classList.add('is-visible');
        }
      } else {
        canvas.style.cursor = 'grab';
        if (hover) hover.classList.remove('is-visible');
      }
    });

    window.addEventListener('keydown', function (event) {
      var tag = (event.target && event.target.tagName) || '';
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      if (event.key === 'Escape' && dialogueOpen) {
        event.preventDefault();
        closeDialogue();
        return;
      }
      if ((event.key === 'e' || event.key === 'E' || event.key === 'Enter') &&
          dialogueOpen) {
        event.preventDefault();
        nextLine();
        return;
      }
      if ((event.key === 'e' || event.key === 'E') && opts.walk && opts.walk.isActive()) {
        var n = nearestNpc(opts.walk.getPosition());
        if (n) openDialogue(n);
      }
    });

    if (dialogueNext) {
      dialogueNext.addEventListener('click', function (event) {
        event.stopPropagation();
        nextLine();
      });
    }
    if (dialogueClose) {
      dialogueClose.addEventListener('click', function (event) {
        event.stopPropagation();
        closeDialogue();
      });
    }

    var definitions = [
      {
        name: 'Mira',
        x: -2.6,
        z: 5.5,
        rotation: 0.3,
        shirt: C.pink,
        accent: C.cream,
        trousers: C.creamDeep,
        hair: 0x6b4b58,
        balloon: true,
        lines: {
          day: {
            clear: [
              'The fountain sounds different when the park is quiet. Like it is telling itself a story.',
              'The balloon wants to go higher than the wheel. I keep telling it no.'
            ],
            breezy: [
              'When the wind comes over the rim, the balloon pulls like it has somewhere to be.',
              'I like the petals best when they forget which way they were falling.'
            ]
          },
          dusk: {
            clear: [
              'The lights come on one by one. If you watch closely, the whole park changes its mind.',
              'The wheel looks best about ten seconds before the lights come on.'
            ],
            breezy: [
              'The balloon is pointing at the sunset. I think it wants to be a cloud when it grows up.',
              'Hold your hat. The wind gets ambitious around this hour.'
            ]
          },
          night: {
            clear: [
              'The fireworks are late tonight. The waiting part is nice too.',
              'At night the fountain keeps the moon in pieces.'
            ],
            breezy: [
              'The balloon is trying to climb the sky. I am trying to let it.',
              'The wind smells like rain, but the sky never follows through.'
            ]
          }
        }
      },
      {
        name: 'Theo',
        x: -8.0,
        z: 2.0,
        rotation: 2.95,
        shirt: C.skyDeep,
        accent: C.inkSoft,
        trousers: C.inkSoft,
        hair: 0x4b3c4b,
        camera: true,
        lines: {
          day: {
            clear: [
              'The wheel looks best about ten seconds before the lights come on.',
              'I have taken this photo forty times. The sky keeps changing the ending.'
            ],
            breezy: [
              'The clouds are moving too fast for a long exposure. I respect the ambition.',
              'If the wind takes my hat, the photo will be better. I have decided.'
            ]
          },
          dusk: {
            clear: [
              'Golden hour is a terrible name. It is more like the park holding its breath.',
              'I am waiting for the moment the lights win against the sun.'
            ],
            breezy: [
              'The petals keep getting into the frame. I have stopped asking them to leave.',
              'The wind is doing something interesting to the bunting. I may need a wider lens.'
            ]
          },
          night: {
            clear: [
              'The fireworks look better through the viewfinder. Smaller, somehow.',
              'I came for the wheel. I stayed for the quiet after the last burst.'
            ],
            breezy: [
              'The smoke is moving left. The next burst will be worth waiting for.',
              'My hands are cold. The photos are not.'
            ]
          }
        }
      },
      {
        name: 'June',
        x: 8.6,
        z: 0.2,
        rotation: -2.5,
        shirt: C.mint,
        accent: C.cream,
        trousers: C.seafoam,
        hair: 0x76504a,
        clipboard: true,
        lines: {
          day: {
            clear: [
              'Everything is checked. Now we wait for the sky to do its part.',
              'If you hear the bell, that is not a warning. That is the carousel waking up.'
            ],
            breezy: [
              'The horses do not mind the wind. The bunting does.',
              'I keep the clipboard for the look of it. The park mostly runs itself.'
            ]
          },
          dusk: {
            clear: [
              'One more lap before the light goes. Then the carousel gets its own sky.',
              'The lamps are my favorite part of the evening. They are so sure of themselves.'
            ],
            breezy: [
              'The wind is pulling at the sign. I will tighten it after the next ride.',
              'The petals get into everything. I have stopped sweeping them off the steps.'
            ]
          },
          night: {
            clear: [
              'The park is quieter at night. The rides sound like they are dreaming.',
              'If you stand here long enough, the fireworks feel like weather.'
            ],
            breezy: [
              'The carousel keeps turning even when no one is on it. I think it likes the company.',
              'The wind has a different sound at night. So does the coaster.'
            ]
          }
        }
      },
      {
        name: 'Nico',
        x: 2.8,
        z: 8.2,
        rotation: -2.4,
        shirt: C.butter,
        accent: C.rose,
        trousers: C.sky,
        hair: 0x5c4438,
        pinwheel: true,
        lines: {
          day: {
            clear: [
              'The coaster goes upside down, but my sister says it does not count.',
              'When the fireworks start, you have to look up before everyone else.'
            ],
            breezy: [
              'The pinwheel is faster than the coaster. That is a scientific fact.',
              'The petals are running away. I am not chasing them. I am following them.'
            ]
          },
          dusk: {
            clear: [
              'The lamps are turning on. That means it is almost night, but not yet.',
              'I can see the wheel from here. If I stand on the bench, I can see more.'
            ],
            breezy: [
              'The pinwheel keeps changing its mind. That is its best trick.',
              'The wind took my hat. The hat is on the roof now.'
            ]
          },
          night: {
            clear: [
              'The fireworks are louder than the coaster. Do not tell the coaster.',
              'I am not tired. I am just resting my eyes between bursts.'
            ],
            breezy: [
              'The sky is moving. Or the wind is. It is hard to tell.',
              'The pinwheel is still going. It does not know it is bedtime.'
            ]
          }
        }
      }
    ];

    for (var d = 0; d < definitions.length; d++) {
      makePerson(definitions[d]);
    }

    P.weather = weather;

    return {
      update: update,
      isDialogueOpen: function () { return dialogueOpen; },
      closeDialogue: closeDialogue,
      openDialogue: openDialogue,
      nearest: nearestNpc,
      npcs: npcs,
      weather: function () { return weather; }
    };
  };
})();
