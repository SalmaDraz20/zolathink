// One brief entrance; no continuously moving cards or hidden content.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const revealMission = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const nodes = entry.target.querySelectorAll('.mission-center-card, .mission-floating-step');
      nodes.forEach((node, index) => {
        node.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 550, delay: index * 45, easing: 'ease-out' });
      });
      revealMission.unobserve(entry.target);
    });
  }, { threshold: .15 });
  const missionStage = document.querySelector('.mission-flow-stage');
  if (missionStage) revealMission.observe(missionStage);
}
