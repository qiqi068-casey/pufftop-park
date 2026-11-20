/* ==========================================================================
   Pufftop Park —soft orbit camera
   A small dependency-free orbit controller with damping, pinch zoom,
   double-click reset and a gentle idle drift.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Pufftop;
  var T = THREE;

  function OrbitControls(camera, domElement, target) {
    this.camera = camera;
    this.dom = domElement;
    this.target = target ? target.clone() : new T.Vector3(0, 4.2, 0);
    this.homeTarget = this.target.clone();
    this.homePosition = camera.position.clone();

    var offset = camera.position.clone().sub(this.target);
    this.radius = this.radiusTarget = offset.length();
    this.theta = this.thetaTarget = Math.atan2(offset.x, offset.z);
    this.phi = this.phiTarget = Math.acos(P.clamp(offset.y / this.radius, -1, 1));

    this.minRadius = 17;
    this.maxRadius = 62;
    this.minPhi = 0.24;
    this.maxPhi = 1.46;
    this.damping = 0.095;
    this.rotateSpeed = 0.0052;
    this.zoomSpeed = 0.08;

    this.enabled = true;
    this.dragging = false;
    this.pointers = new Map();
    this.lastPinch = 0;
    this.lastInteraction = performance.now();
    this.idleDelay = 18000;
    this.autoSpeed = 0.038;
    this.autoRotate = true;

    this._bind();
  }

  OrbitControls.prototype._bind = function () {
    var self = this;
    var dom = this.dom;

    dom.style.touchAction = 'none';
    dom.style.cursor = 'grab';

    this._onDown = function (e) {
      if (!self.enabled) return;
      self.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      self.lastInteraction = performance.now();
      self.dragging = true;
      dom.style.cursor = 'grabbing';

      if (self.pointers.size === 2) {
        var pts = Array.from(self.pointers.values());
        self.lastPinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
      if (dom.setPointerCapture) {
        try { dom.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      }
    };

    this._onMove = function (e) {
      if (!self.enabled || !self.pointers.has(e.pointerId)) return;
      var prev = self.pointers.get(e.pointerId);
      var dx = e.clientX - prev.x;
      var dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;
      self.lastInteraction = performance.now();

      if (self.pointers.size >= 2) {
        var pts = Array.from(self.pointers.values());
        var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (self.lastPinch > 0) {
          var ratio = self.lastPinch / Math.max(dist, 1);
          self.radiusTarget = P.clamp(
            self.radiusTarget * Math.pow(ratio, 0.9),
            self.minRadius,
            self.maxRadius
          );
        }
        self.lastPinch = dist;
        return;
      }

      self.thetaTarget -= dx * self.rotateSpeed;
      self.phiTarget -= dy * self.rotateSpeed * 0.82;
      self.phiTarget = P.clamp(self.phiTarget, self.minPhi, self.maxPhi);
    };

    this._onUp = function (e) {
      self.pointers.delete(e.pointerId);
      self.lastInteraction = performance.now();
      if (self.pointers.size === 0) {
        self.dragging = false;
        dom.style.cursor = 'grab';
      } else if (self.pointers.size === 1) {
        self.lastPinch = 0;
      }
      if (dom.releasePointerCapture) {
        try { dom.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
      }
    };

    this._onWheel = function (e) {
      if (!self.enabled) return;
      e.preventDefault();
      self.lastInteraction = performance.now();
      var normalized = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      var factor = Math.exp(P.clamp(normalized, -240, 240) * 0.0012);
      self.radiusTarget = P.clamp(
        self.radiusTarget * factor,
        self.minRadius,
        self.maxRadius
      );
    };

    this._onDoubleClick = function () {
      if (!self.enabled) return;
      self.thetaTarget = self.theta = Math.atan2(
        self.homePosition.x - self.homeTarget.x,
        self.homePosition.z - self.homeTarget.z
      );
      self.radiusTarget = self.radius = self.homePosition.distanceTo(self.homeTarget);
      self.phiTarget = self.phi = Math.acos(
        P.clamp((self.homePosition.y - self.homeTarget.y) / self.radius, -1, 1)
      );
      self.target.copy(self.homeTarget);
      self.lastInteraction = performance.now();
    };

    dom.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onUp);
    dom.addEventListener('wheel', this._onWheel, { passive: false });
    dom.addEventListener('dblclick', this._onDoubleClick);
    dom.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  OrbitControls.prototype.update = function (dt) {
    if (!this.enabled) return;
    var now = performance.now();

    if (this.autoRotate && !this.dragging && now - this.lastInteraction > this.idleDelay) {
      this.thetaTarget += this.autoSpeed * dt;
    }

    var k = 1 - Math.pow(1 - this.damping, Math.max(dt, 0.001) * 60);
    this.theta += (this.thetaTarget - this.theta) * k;
    this.phi += (this.phiTarget - this.phi) * k;
    this.radius += (this.radiusTarget - this.radius) * k;

    var sinPhi = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.radius * sinPhi * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sinPhi * Math.cos(this.theta)
    );
    this.camera.lookAt(this.target);
  };

  P.OrbitControls = OrbitControls;
  P.OrbitView = OrbitControls;
})();

