# Problem section

The Arabic Problem section is the second section in `index.html`. The full landing page layout is styled in `landing.css`, with shared placeholder styling in `problem-section.css`. Image configuration lives in `problem-section.js`; FAQ and dialog behavior lives in `landing.js`.

To replace the neutral photo placeholder, place the real image in `assets/` and set `problemSectionMedia.mainImage` in `problem-section.js` to `assets/problem-student.webp` (or your filename). Update `alt` and `objectPosition` in the same object as needed. The layout stays fixed, and an unavailable image retains the placeholder.

This is a static website with no production build step. Serve this directory to preview it. Remaining content tasks: supply the real Zola student photograph and approved privacy policy and terms. Footer dialogs currently direct visitors to ask the Zola team for those details. The booking links open WhatsApp using the contact number shown in the landing page reference.
