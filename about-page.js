if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const aboutReveal = new IntersectionObserver(entries => {
    entries.forEach(({target,isIntersecting}) => {
      if (!isIntersecting) return;
      target.animate([{opacity:.7,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'});
      aboutReveal.unobserve(target);
    });
  }, {threshold:.1});
  document.querySelectorAll('.about-who,.about-purpose,.about-beliefs,.about-final-trial').forEach(section=>aboutReveal.observe(section));
}
