/*
 * DotField — interactive dot-grid background with cursor "bulge" + glow.
 * Vanilla-JS port of a React component, adapted to run as a fixed
 * full-screen BACKGROUND layer on a static site.
 *
 * Usage:
 *   initDotField();                              // defaults (purple)
 *   initDotField({ dotSpacing: 18, sparkle: true });
 */
function initDotField(opts) {
  opts = opts || {};
  var TWO_PI = Math.PI * 2;

  var p = {
    dotRadius: opts.dotRadius ?? 1.9,
    dotSpacing: opts.dotSpacing ?? 14,
    cursorRadius: opts.cursorRadius ?? 520,
    cursorForce: opts.cursorForce ?? 0.1,
    bulgeOnly: opts.bulgeOnly ?? true,
    bulgeStrength: opts.bulgeStrength ?? 85,
    glowRadius: opts.glowRadius ?? 230,
    sparkle: opts.sparkle ?? false,
    waveAmplitude: opts.waveAmplitude ?? 0,
    gradientFrom: opts.gradientFrom ?? 'rgba(200, 150, 255, 0.65)',
    gradientTo: opts.gradientTo ?? 'rgba(168, 85, 247, 0.45)',
    glowColor: opts.glowColor ?? '#c084fc'
  };

  if (document.getElementById('dot-field-container')) return;

  var glowId = 'dot-field-glow-' + Math.random().toString(36).slice(2, 9);

  // --- Background DOM layer ---
  var container = document.createElement('div');
  container.id = 'dot-field-container';
  container.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;');
  var defs = document.createElementNS(svgNS, 'defs');
  var radial = document.createElementNS(svgNS, 'radialGradient');
  radial.setAttribute('id', glowId);
  var stop0 = document.createElementNS(svgNS, 'stop');
  stop0.setAttribute('offset', '0%');
  stop0.setAttribute('stop-color', p.glowColor);
  var stop1 = document.createElementNS(svgNS, 'stop');
  stop1.setAttribute('offset', '100%');
  stop1.setAttribute('stop-color', 'transparent');
  radial.appendChild(stop0);
  radial.appendChild(stop1);
  defs.appendChild(radial);
  var glowEl = document.createElementNS(svgNS, 'circle');
  glowEl.setAttribute('cx', '-9999');
  glowEl.setAttribute('cy', '-9999');
  glowEl.setAttribute('r', p.glowRadius);
  glowEl.setAttribute('fill', 'url(#' + glowId + ')');
  glowEl.style.opacity = 0;
  glowEl.style.willChange = 'opacity';
  svg.appendChild(defs);
  svg.appendChild(glowEl);

  container.appendChild(canvas);
  container.appendChild(svg);
  document.body.appendChild(container);

  var ctx = canvas.getContext('2d', { alpha: true });
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var dots = [];
  // Mouse in viewport coords (the canvas is fixed full-screen).
  var mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
  var size = { w: 0, h: 0 };
  var glowOpacity = 0;
  var engagement = 0;
  var frameCount = 0;
  var rafId = null;
  var resizeTimer = null;

  function resize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(doResize, 100);
  }

  function doResize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    size = { w: w, h: h };
    buildDots(w, h);
  }

  function buildDots(w, h) {
    var step = p.dotRadius + p.dotSpacing;
    var cols = Math.floor(w / step);
    var rows = Math.floor(h / step);
    var padX = (w % step) / 2;
    var padY = (h % step) / 2;
    var arr = new Array(rows * cols);
    var idx = 0;

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var ax = padX + col * step + step / 2;
        var ay = padY + row * step + step / 2;
        arr[idx++] = { ax: ax, ay: ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
      }
    }
    dots = arr;
  }

  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function updateMouseSpeed() {
    var dx = mouse.prevX - mouse.x;
    var dy = mouse.prevY - mouse.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    mouse.speed += (dist - mouse.speed) * 0.5;
    if (mouse.speed < 0.001) mouse.speed = 0;
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
  }

  var speedInterval = setInterval(updateMouseSpeed, 20);

  function tick() {
    frameCount++;
    var m = mouse;
    var w = size.w;
    var h = size.h;
    var len = dots.length;
    var t = frameCount * 0.02;

    var targetEngagement = Math.min(m.speed / 5, 1);
    engagement += (targetEngagement - engagement) * 0.06;
    if (engagement < 0.001) engagement = 0;
    var eng = engagement;

    // constant soft halo at the cursor (0.4) that brightens with movement (→0.9)
    var glowTarget = mouse.x < 0 ? 0 : 0.4 + eng * 0.5;
    glowOpacity += (glowTarget - glowOpacity) * 0.08;

    if (glowEl) {
      glowEl.setAttribute('cx', m.x);
      glowEl.setAttribute('cy', m.y);
      glowEl.style.opacity = glowOpacity;
    }

    ctx.clearRect(0, 0, w, h);

    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, p.gradientFrom);
    grad.addColorStop(1, p.gradientTo);
    ctx.fillStyle = grad;

    var cr = p.cursorRadius;
    var crSq = cr * cr;
    var rad = p.dotRadius / 2;
    var isBulge = p.bulgeOnly;

    ctx.beginPath();

    for (var i = 0; i < len; i++) {
      var d = dots[i];
      var dx = m.x - d.ax;
      var dy = m.y - d.ay;
      var distSq = dx * dx + dy * dy;

      if (distSq < crSq && eng > 0.01) {
        var dist = Math.sqrt(distSq);
        if (isBulge) {
          var tt = 1 - dist / cr;
          var push = tt * tt * p.bulgeStrength * eng;
          var angle = Math.atan2(dy, dx);
          d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
          d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
        } else {
          var angle2 = Math.atan2(dy, dx);
          var move = (500 / dist) * (m.speed * p.cursorForce);
          d.vx += Math.cos(angle2) * -move;
          d.vy += Math.sin(angle2) * -move;
        }
      } else if (isBulge) {
        d.sx += (d.ax - d.sx) * 0.1;
        d.sy += (d.ay - d.sy) * 0.1;
      }

      if (!isBulge) {
        d.vx *= 0.9;
        d.vy *= 0.9;
        d.x = d.ax + d.vx;
        d.y = d.ay + d.vy;
        d.sx += (d.x - d.sx) * 0.1;
        d.sy += (d.y - d.sy) * 0.1;
      }

      var drawX = d.sx;
      var drawY = d.sy;
      if (p.waveAmplitude > 0) {
        drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude;
        drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5;
      }

      if (p.sparkle) {
        var hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
        if (hash % 100 < 3) {
          ctx.moveTo(drawX + rad * 1.8, drawY);
          ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
        } else {
          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }
      } else {
        ctx.moveTo(drawX + rad, drawY);
        ctx.arc(drawX, drawY, rad, 0, TWO_PI);
      }
    }

    ctx.fill();

    rafId = requestAnimationFrame(tick);
  }

  doResize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  rafId = requestAnimationFrame(tick);

  // Teardown handle, in case it's ever needed
  window.__dotFieldDestroy = function () {
    cancelAnimationFrame(rafId);
    clearInterval(speedInterval);
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMouseMove);
    if (container && container.parentNode) container.parentNode.removeChild(container);
  };
}

// Auto-initialize once the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    initDotField();
  });
} else {
  initDotField();
}
