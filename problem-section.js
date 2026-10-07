// Set mainImage to an asset path to replace the placeholder without changing layout.
const problemSectionMedia = {
  mainImage: null,
  alt: "طالب يفكر في حل موقف جديد",
  objectPosition: "center",
};

function renderProblemImage(container, { mainImage, alt, objectPosition }) {
  if (!container || !mainImage) return;
  const image = new Image();
  image.alt = alt;
  image.loading = "lazy";
  image.style.objectPosition = objectPosition;
  image.addEventListener("load", () => {
    container.replaceChildren(image);
    container.removeAttribute("role");
    container.removeAttribute("aria-label");
  });
  // Keep the neutral placeholder visible if a future image fails to load.
  image.src = mainImage;
}
renderProblemImage(document.querySelector("[data-problem-image]"), problemSectionMedia);

if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.animate([{ transform: "translateY(12px)", opacity: 0.8 }, { transform: "translateY(0)", opacity: 1 }], { duration: 450, easing: "ease-out" });
      observer.unobserve(target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".problem-copy, .problem-visual, .comparison-panel, .problem-key-message").forEach(element => observer.observe(element));
}
