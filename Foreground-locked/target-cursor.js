/*
 * Target Cursor — vanilla-JS adaptation of the react-bits "TargetCursor".
 * A spinning crosshair that LOCKS onto interactive elements: once it frames
 * a card it stays glued to that card (following it on scroll, ignoring mouse
 * movement) until a different target is hovered. Uses GSAP. No WebGL.
 */
function initTargetCursor(opts) {
  opts = opts || {};
  var targetSelector = opts.targetSelector || '.cursor-target';
  var spinDuration = opts.spinDuration != null ? opts.spinDuration : 2;
  var hideDefaultCursor = opts.hideDefaultCursor !== false;
  var cursorColor = opts.cursorColor || '#ffffff';
  var followLerp = opts.followLerp != null ? opts.followLerp : 0.3;

  if (!window.gsap) { console.warn('TargetCursor requires GSAP'); return; }
  var gsap = window.gsap;

  // skip on touch / mobile
  var hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  var ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
  var mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  if ((hasTouch && window.innerWidth <= 768) || mobileRegex.test(ua)) return;

  if (document.querySelector('.target-cursor-wrapper')) return;

  var constants = { borderWidth: 3, cornerSize: 12 };

  // --- build DOM ---
  var cursor = document.createElement('div');
  cursor.className = 'target-cursor-wrapper';
  var dot = document.createElement('div');
  dot.className = 'target-cursor-dot';
  dot.style.backgroundColor = cursorColor;
  cursor.appendChild(dot);
  ['corner-tl', 'corner-tr', 'corner-br', 'corner-bl'].forEach(function (c) {
    var el = document.createElement('div');
    el.className = 'target-cursor-corner ' + c;
    el.style.borderColor = cursorColor;
    cursor.appendChild(el);
  });
  document.body.appendChild(cursor);

  if (hideDefaultCursor) document.documentElement.classList.add('target-cursor-active');

  var corners = cursor.querySelectorAll('.target-cursor-corner');

  function getContainingBlock(element) {
    var node = element && element.parentElement;
    while (node && node !== document.documentElement) {
      var style = getComputedStyle(node);
      if (
        style.transform !== 'none' ||
        style.perspective !== 'none' ||
        style.filter !== 'none' ||
        style.willChange.indexOf('transform') !== -1 ||
        style.willChange.indexOf('perspective') !== -1 ||
        style.willChange.indexOf('filter') !== -1 ||
        /paint|layout|strict|content/.test(style.contain)
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }
  function getOffset() {
    var block = getContainingBlock(cursor);
    if (!block) return { x: 0, y: 0 };
    var rect = block.getBoundingClientRect();
    return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
  }

  function moveCursor(x, y) {
    var o = getOffset();
    gsap.to(cursor, { x: x - o.x, y: y - o.y, duration: 0.1, ease: 'power3.out' });
  }

  var initialOffset = getOffset();
  gsap.set(cursor, {
    xPercent: -50,
    yPercent: -50,
    x: window.innerWidth / 2 - initialOffset.x,
    y: window.innerHeight / 2 - initialOffset.y
  });

  // --- spinning crosshair (only while NOT locked) ---
  var spinTl = null;
  function startSpin() {
    if (spinTl) spinTl.kill();
    spinTl = gsap.timeline({ repeat: -1 }).to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });
  }
  startSpin();

  var lockedTarget = null;
  var lockTicking = false;

  // Each frame while locked: re-read the card's CURRENT position and glue the
  // frame to it. This keeps the frame on the card as the page scrolls, and
  // because we never read the mouse here, moving the mouse doesn't disturb it.
  function lockTick() {
    if (!lockedTarget) return;
    if (!document.body.contains(lockedTarget)) { lockedTarget = null; return; }

    var rect = lockedTarget.getBoundingClientRect();
    var o = getOffset();
    var bw = constants.borderWidth, cs = constants.cornerSize;

    var cx = rect.left + rect.width / 2 - o.x;
    var cy = rect.top + rect.height / 2 - o.y;
    var wx = gsap.getProperty(cursor, 'x');
    var wy = gsap.getProperty(cursor, 'y');
    var nwx = wx + (cx - wx) * followLerp;
    var nwy = wy + (cy - wy) * followLerp;
    gsap.set(cursor, { x: nwx, y: nwy });

    var pos = [
      { x: rect.left - bw - o.x, y: rect.top - bw - o.y },
      { x: rect.right + bw - cs - o.x, y: rect.top - bw - o.y },
      { x: rect.right + bw - cs - o.x, y: rect.bottom + bw - cs - o.y },
      { x: rect.left - bw - o.x, y: rect.bottom + bw - cs - o.y }
    ];
    Array.prototype.forEach.call(corners, function (corner, i) {
      var ccx = gsap.getProperty(corner, 'x');
      var ccy = gsap.getProperty(corner, 'y');
      var tx = pos[i].x - nwx;
      var ty = pos[i].y - nwy;
      gsap.set(corner, { x: ccx + (tx - ccx) * followLerp, y: ccy + (ty - ccy) * followLerp });
    });
  }

  // --- cursor follows the mouse ONLY when not locked ---
  function moveHandler(e) {
    if (lockedTarget) return; // frozen: locked frame stays on its card
    moveCursor(e.clientX, e.clientY);
  }
  window.addEventListener('mousemove', moveHandler);

  function mouseDownHandler() {
    gsap.to(dot, { scale: 0.7, duration: 0.3 });
    gsap.to(cursor, { scale: 0.9, duration: 0.2 });
  }
  function mouseUpHandler() {
    gsap.to(dot, { scale: 1, duration: 0.3 });
    gsap.to(cursor, { scale: 1, duration: 0.2 });
  }
  window.addEventListener('mousedown', mouseDownHandler);
  window.addEventListener('mouseup', mouseUpHandler);

  // return the corners to their idle crosshair spread
  function resetCornersIdle() {
    var cs = constants.cornerSize;
    var pos = [
      { x: -cs * 1.5, y: -cs * 1.5 },
      { x: cs * 0.5, y: -cs * 1.5 },
      { x: cs * 0.5, y: cs * 0.5 },
      { x: -cs * 1.5, y: cs * 0.5 }
    ];
    Array.prototype.forEach.call(corners, function (c, i) {
      gsap.killTweensOf(c, 'x,y');
      gsap.to(c, { x: pos[i].x, y: pos[i].y, duration: 0.3, ease: 'power3.out' });
    });
  }

  // release the lock: free-floating, spinning crosshair again
  function unlock() {
    if (!lockedTarget) return;
    lockedTarget = null;
    if (lockTicking) { gsap.ticker.remove(lockTick); lockTicking = false; }
    resetCornersIdle();
    startSpin();
  }

  function lockOnto(target) {
    if (lockedTarget === target) return;
    lockedTarget = target;
    gsap.killTweensOf(cursor, 'rotation');
    if (spinTl) spinTl.pause();
    gsap.set(cursor, { rotation: 0 });
    if (!lockTicking) { gsap.ticker.add(lockTick); lockTicking = true; }
  }

  // Hovering a target locks onto it. The frame stays on the last target until
  // a NEW target is hovered — leaving a target into empty space does nothing.
  function enterHandler(e) {
    var current = e.target;
    var target = null;
    while (current && current !== document.body) {
      if (current.matches && current.matches(targetSelector)) { target = current; break; }
      current = current.parentElement;
    }
    if (target) lockOnto(target);
  }
  window.addEventListener('mouseover', enterHandler, { passive: true });

  // Click on empty space (outside any target) de-selects the locked frame.
  window.addEventListener('click', function (e) {
    if (!lockedTarget) return;
    var onTarget = e.target.closest && e.target.closest(targetSelector);
    if (!onTarget) {
      unlock();
      moveCursor(e.clientX, e.clientY);
    }
  });
}

// Auto-initialize once the DOM is ready
function __targetCursorBoot() {
  initTargetCursor({
    targetSelector:
      'a, button, .btn, input, textarea, .form-input, .contact-item, .nav-link, .floating-badge, .exp-detail-content, .stat-item, .social-icon, .menu-toggle',
    spinDuration: 4,
    cursorColor: '#c084fc'
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __targetCursorBoot);
} else {
  __targetCursorBoot();
}
