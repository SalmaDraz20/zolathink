import { initLegalDialog } from './components/legal-dialog.js';
import { initVideoModal } from './components/video-modal.js';
import { entrance, revealOnScroll, revealSequence, revealDoodleLines } from './utils/motion.js';

initLegalDialog();
initVideoModal();

// Content is always visible, including without JavaScript or reduced motion.
document.querySelectorAll('.reference-copy h1, .reference-description, .reference-actions')
  .forEach((element, index) => entrance(element, { opacity: .75, distance: index === 0 ? 3 : 7, duration: 550, delay: index * 90 }));

revealOnScroll('.landing-problem-copy h2, .mission-flow-heading h2, #skills-title, #journey-title, #trial-title, #faq-title', { duration: 500, distance: 7 });
revealOnScroll('.landing-problem-copy p, .mission-flow-heading p, .skills-support, .journey-refresh-main header p, .trial-copy p', { opacity: .8, distance: 4, delay: 80 });
revealOnScroll('.gap-illustration, .mission-center-card, .skills-doodle-benefit, .journey-refresh-details', { opacity: .75, distance: 4, duration: 550 });
revealSequence('.mission-flow-stage', '.mission-floating-step', { opacity: .7 });
revealSequence('.skills-doodle-pillars', '.skills-doodle-pillar', { opacity: .75 });
revealSequence('.journey-lock-cards', '.journey-lock-card', { opacity: .75 });
revealDoodleLines('.mission-flow-doodles, .skills-connector');
revealOnScroll('.about-who, .about-purpose, .about-beliefs, .about-final-trial', { opacity: .7, distance: 10 });
