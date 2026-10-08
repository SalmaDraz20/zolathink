const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set();

// Individual translate preserves existing card rotations and transformations.
export function entrance(element, { opacity = .8, distance = 8, duration = 450, delay = 0 } = {}) {
  if (preference.matches || !element.animate) return;
  const animation = element.animate([
    { opacity, translate: `0 ${distance}px` },
    { opacity: 1, translate: '0 0' },
  ], { duration, delay, easing: 'cubic-bezier(.2,.65,.3,1)' });
  running.add(animation);
  animation.finished.catch(() => {}).finally(() => running.delete(animation));
}

export function revealOnScroll(selector, options = {}) {
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entrance(entry.target, options);
      observer.unobserve(entry.target);
    }
  }, { threshold: .1 });
  document.querySelectorAll(selector).forEach(element => observer.observe(element));
  preference.addEventListener('change', event => {
    if (event.matches) observer.disconnect();
  }, { once: true });
}

preference.addEventListener('change', event => {
  if (event.matches) for (const animation of running) animation.cancel();
});
