/*
 * Hero typewriter — types out the "> initializing profile..." greeting and the
 * two const code lines token-by-token (preserving syntax colors), then leaves
 * the blinking cursor. The comment + description keep their existing fade-in.
 */
(function () {
  function run() {
    var hero = document.querySelector('.hero-content');
    var greeting = document.querySelector('.hero-greeting .greeting-text');
    var lines = document.querySelectorAll('#heroName .code-line');
    if (!greeting || !lines.length) { if (hero) hero.classList.remove('tw-init'); return; }

    // Build the ordered list of segments to type (greeting, then each code token).
    var segments = [greeting];
    lines.forEach(function (line) {
      line.querySelectorAll('span').forEach(function (sp) { segments.push(sp); });
    });

    // Stash each segment's text and clear it, then reveal (now-empty) elements.
    segments.forEach(function (el) {
      el.setAttribute('data-tw', el.textContent);
      el.textContent = '';
    });
    if (hero) hero.classList.remove('tw-init');

    var charDelay = 42, segGap = 90, i = 0;

    function typeSegment() {
      if (i >= segments.length) return;
      var el = segments[i];
      var full = el.getAttribute('data-tw') || '';
      el.removeAttribute('data-tw');
      var j = 0;
      if (!full.length) { i++; typeSegment(); return; }
      (function typeChar() {
        el.textContent = full.slice(0, ++j);
        if (j < full.length) setTimeout(typeChar, charDelay);
        else { i++; setTimeout(typeSegment, segGap); }
      })();
    }
    typeSegment();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
