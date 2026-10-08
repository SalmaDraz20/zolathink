const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set();
const observers = new Set();
const revealed = new WeakSet();

// Individual translate preserves existing card rotations and transformations.
export function entrance(element, { opacity = .8, distance = 8, duration = 450, delay = 0 } = {}) {
  if (preference.matches || !element.animate || revealed.has(element)) return;
  revealed.add(element);
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
  observers.add(observer);
  document.querySelectorAll(selector).forEach(element => observer.observe(element));
}

export function revealSequence(containerSelector, itemSelector, options = {}) {
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const items = entry.target.querySelectorAll(itemSelector);
      items.forEach((item, index) => entrance(item, { duration: 520, distance: 7, ...options, delay: index * 80 }));
      observer.unobserve(entry.target);
    }
  }, { threshold: .12 });
  observers.add(observer);
  document.querySelectorAll(containerSelector).forEach(element => observer.observe(element));
}

export function revealDoodleLines(selector) {
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.querySelectorAll('path').forEach((path, index) => {
        if (!path.getTotalLength || !path.animate) return;
        const length = path.getTotalLength();
        const animation = path.animate([
          { opacity: .2, strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
          { opacity: 1, strokeDasharray: `${length}`, strokeDashoffset: '0' },
        ], { duration: 620, delay: Math.min(index * 65, 260), easing: 'ease-out' });
        running.add(animation);
        animation.finished.catch(() => {}).finally(() => running.delete(animation));
      });
      observer.unobserve(entry.target);
    }
  }, { threshold: .15 });
  observers.add(observer);
  document.querySelectorAll(selector).forEach(element => observer.observe(element));
}

preference.addEventListener('change', event => {
  if (event.matches) {
    for (const observer of observers) observer.disconnect();
    observers.clear();
    for (const animation of running) animation.cancel();
  }
});
