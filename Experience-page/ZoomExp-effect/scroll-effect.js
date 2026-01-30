// Scroll behavior: grabbing freezes scroll completely, releasing allows scroll
(function() {
  let isHolding = false;
  let frozenScrollY = 0;
  
  // Freeze scroll position when holding
  function freezeScroll() {
    if (isHolding) {
      window.scrollTo(0, frozenScrollY);
    }
  }
  
  // Mouse/touch down - freeze scrolling completely
  function onHoldStart() {
    isHolding = true;
    frozenScrollY = window.scrollY;
  }
  
  // Mouse/touch up - allow scrolling
  function onHoldEnd() {
    isHolding = false;
  }
  
  // Prevent all scroll events when holding
  function preventScroll(e) {
    if (isHolding) {
      e.preventDefault();
      window.scrollTo(0, frozenScrollY);
    }
  }
  
  // Mouse events
  window.addEventListener('mousedown', onHoldStart);
  window.addEventListener('mouseup', onHoldEnd);
  window.addEventListener('mouseleave', onHoldEnd);
  
  // Touch events
  window.addEventListener('touchstart', onHoldStart, { passive: true });
  window.addEventListener('touchend', onHoldEnd);
  
  // Block and freeze on wheel
  window.addEventListener('wheel', preventScroll, { passive: false });
  
  // Block and freeze on touch move
  window.addEventListener('touchmove', preventScroll, { passive: false });
  
  // Continuously enforce frozen position while holding
  window.addEventListener('scroll', freezeScroll);
  
  // Block keyboard scroll when holding
  window.addEventListener('keydown', function(e) {
    if (!isHolding) return;
    const scrollKeys = ['ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown', 'Home', 'End'];
    if (scrollKeys.includes(e.code)) {
      e.preventDefault();
    }
  });
})();
