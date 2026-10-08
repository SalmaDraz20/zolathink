import { initLegalDialog } from './components/legal-dialog.js';
import { revealOnScroll } from './utils/motion.js';

initLegalDialog();

// Content is always visible, including without JavaScript or reduced motion.
revealOnScroll('.landing-problem-copy, .gap-illustration, .landing-skills, .journey-refresh, .landing-trial, .landing-faq');
revealOnScroll('.mission-center-card, .mission-floating-step', { opacity: .65, distance: 0, duration: 550 });
revealOnScroll('.about-who, .about-purpose, .about-beliefs, .about-final-trial', { opacity: .7, distance: 10 });
