/*
 * Magic Bento — vanilla-JS port of the react-bits "MagicBento" effects,
 * adapted to decorate EXISTING content cards (no React, no GSAP).
 *
 * Adds: a cursor-following global spotlight, per-card proximity border-glow,
 * hover particles, and click ripples — in the site's purple theme.
 *
 * It attaches to any cards matched by `cardSelector` inside the `grids`,
 * so all existing card content is preserved.
 */
function initMagicBento(opts) {
  opts = opts || {};
  var GLOW = opts.glowColor || '168, 85, 247';          // purple
  var SPOT_RADIUS = opts.spotlightRadius || 320;
  var PARTICLE_COUNT = opts.particleCount || 10;
  var grids = opts.grids || ['.xp-timeline', '.xp-projects'];
  var cardSel = opts.cardSelector || '.exp-detail-content';
  var enableParticles = opts.enableStars !== false;
  var enableSpotlight = opts.enableSpotlight !== false;
  var enableClick = opts.clickEffect !== false;
  var isMobile = window.innerWidth <= 768;

  if (document.getElementById('mb-spotlight')) return; // already initialized

  // Collect grids + cards
  var sections = [];
  grids.forEach(function (g) {
    document.querySelectorAll(g).forEach(function (grid) {
      grid.classList.add('bento-section');
      sections.push(grid);
    });
  });
  if (!sections.length) return;

  var cards = [];
  sections.forEach(function (s) {
    s.querySelectorAll(cardSel).forEach(function (c) {
      c.classList.add('magic-bento-card', 'magic-bento-card--border-glow');
      cards.push(c);
    });
  });
  if (!cards.length) return;

  // ---- Per-card hover particles + click ripple ----
  if (!isMobile) {
    cards.forEach(function (card) {
      var live = [];

      if (enableParticles) {
        card.addEventListener('mouseenter', function () {
          for (var i = 0; i < PARTICLE_COUNT; i++) {
            (function (i) {
              var id = setTimeout(function () {
                if (!card.matches(':hover')) return;
                var r = card.getBoundingClientRect();
                var p = document.createElement('div');
                p.className = 'mb-particle';
                p.style.left = Math.random() * r.width + 'px';
                p.style.top = Math.random() * r.height + 'px';
                p.style.setProperty('--pdx', (Math.random() - 0.5) * 100 + 'px');
                p.style.setProperty('--pdy', (Math.random() - 0.5) * 100 + 'px');
                p.style.animationDuration = (2 + Math.random() * 2).toFixed(2) + 's, 1.5s';
                card.appendChild(p);
                live.push(p);
              }, i * 80);
              live.push({ t: id });
            })(i);
          }
        });
        card.addEventListener('mouseleave', function () {
          live.forEach(function (p) {
            if (p && p.t) { clearTimeout(p.t); return; }
            if (!p) return;
            p.style.transition = 'opacity .3s ease, transform .3s ease';
            p.style.opacity = '0';
            p.style.transform = 'scale(0)';
            setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 320);
          });
          live = [];
        });
      }

      if (enableClick) {
        card.addEventListener('click', function (e) {
          var r = card.getBoundingClientRect();
          var x = e.clientX - r.left;
          var y = e.clientY - r.top;
          var maxD = Math.max(
            Math.hypot(x, y),
            Math.hypot(x - r.width, y),
            Math.hypot(x, y - r.height),
            Math.hypot(x - r.width, y - r.height)
          );
          var rip = document.createElement('div');
          rip.className = 'mb-ripple';
          rip.style.width = rip.style.height = maxD * 2 + 'px';
          rip.style.left = x - maxD + 'px';
          rip.style.top = y - maxD + 'px';
          rip.style.background =
            'radial-gradient(circle, rgba(' + GLOW + ',0.4) 0%, rgba(' + GLOW + ',0.2) 30%, transparent 70%)';
          card.appendChild(rip);
          setTimeout(function () { if (rip.parentNode) rip.parentNode.removeChild(rip); }, 800);
        });
      }
    });
  }

  // ---- Global cursor spotlight + proximity border-glow ----
  if (enableSpotlight && !isMobile) {
    var spot = document.createElement('div');
    spot.id = 'mb-spotlight';
    spot.className = 'global-spotlight';
    spot.style.cssText =
      'position:fixed;width:800px;height:800px;border-radius:50%;pointer-events:none;' +
      'background:radial-gradient(circle,' +
      ' rgba(' + GLOW + ',0.15) 0%,' +
      ' rgba(' + GLOW + ',0.08) 15%,' +
      ' rgba(' + GLOW + ',0.04) 25%,' +
      ' rgba(' + GLOW + ',0.02) 40%,' +
      ' transparent 70%);' +
      'z-index:200;opacity:0;transform:translate(-50%,-50%);' +
      'transition:left .1s ease-out, top .1s ease-out, opacity .25s ease-out;';
    document.body.appendChild(spot);

    var prox = SPOT_RADIUS * 0.5;
    var fade = SPOT_RADIUS * 0.75;

    document.addEventListener('mousemove', function (e) {
      var inside = false;
      for (var i = 0; i < sections.length; i++) {
        var rr = sections[i].getBoundingClientRect();
        if (e.clientX >= rr.left && e.clientX <= rr.right && e.clientY >= rr.top && e.clientY <= rr.bottom) {
          inside = true;
          break;
        }
      }
      if (!inside) {
        spot.style.opacity = '0';
        cards.forEach(function (c) { c.style.setProperty('--glow-intensity', '0'); });
        return;
      }

      var minD = Infinity;
      cards.forEach(function (card) {
        var cr = card.getBoundingClientRect();
        var cx = cr.left + cr.width / 2;
        var cy = cr.top + cr.height / 2;
        var d = Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(cr.width, cr.height) / 2;
        var eff = Math.max(0, d);
        minD = Math.min(minD, eff);

        var gi = 0;
        if (eff <= prox) gi = 1;
        else if (eff <= fade) gi = (fade - eff) / (fade - prox);

        var rx = ((e.clientX - cr.left) / cr.width) * 100;
        var ry = ((e.clientY - cr.top) / cr.height) * 100;
        card.style.setProperty('--glow-x', rx + '%');
        card.style.setProperty('--glow-y', ry + '%');
        card.style.setProperty('--glow-intensity', String(gi));
        card.style.setProperty('--glow-radius', SPOT_RADIUS + 'px');
      });

      spot.style.left = e.clientX + 'px';
      spot.style.top = e.clientY + 'px';
      var op = minD <= prox ? 0.8 : minD <= fade ? ((fade - minD) / (fade - prox)) * 0.8 : 0;
      spot.style.opacity = String(op);
    });

    document.addEventListener('mouseleave', function () {
      spot.style.opacity = '0';
      cards.forEach(function (c) { c.style.setProperty('--glow-intensity', '0'); });
    });
  }
}

// Auto-initialize once the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { initMagicBento(); });
} else {
  initMagicBento();
}
