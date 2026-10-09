export function initVideoModal() {
  const trigger = document.querySelector('.reference-watch');
  if (!trigger) return;
  const modal = document.createElement('dialog');
  modal.className = 'zola-video-modal';
  modal.setAttribute('aria-label', 'شاهد كيف تعمل Zola');
  modal.innerHTML = `<button class="zola-video-close" type="button" aria-label="إغلاق الفيديو">×</button><div class="zola-video-frame"><video controls playsinline preload="none" aria-label="فيديو يشرح كيف تعمل Zola"></video><button class="zola-video-play" type="button" aria-label="تشغيل الفيديو" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7z"/></svg></button></div>`;
  document.body.append(modal);
  const video = modal.querySelector('video');
  const play = modal.querySelector('.zola-video-play');
  const close = modal.querySelector('.zola-video-close');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let closing = false;
  let transition;
  let opener;

  async function startPlayback() {
    play.hidden = true;
    try { await video.play(); }
    catch { if (modal.open && !closing) play.hidden = false; }
  }
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'zola-explainer-video');
  modal.id = 'zola-explainer-video';
  trigger.addEventListener('click', event => {
    event.preventDefault();
    if (modal.open) return;
    opener = trigger;
    closing = false;
    video.src ||= 'assets/videos/full-mission.mp4';
    video.muted = false;
    modal.showModal();
    document.documentElement.classList.add('zola-video-open');
    close.focus();
    if (!reducedMotion.matches) transition = modal.animate([{ opacity: 0, transform: 'scale(.975)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
    startPlayback();
  });
  async function dismiss() {
    if (!modal.open || closing) return;
    closing = true;
    video.pause();
    try { video.currentTime = 0; } catch { /* Metadata may not have loaded yet. */ }
    play.hidden = true;
    transition?.cancel();
    if (!reducedMotion.matches) {
      transition = modal.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.98)' }], { duration: 160, easing: 'ease-in' });
      await transition.finished.catch(() => {});
    }
    modal.close();
  }
  close.addEventListener('click', dismiss);
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
    }
  });
  modal.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  modal.addEventListener('close', () => {
    video.pause();
    try { video.currentTime = 0; } catch {}
    document.documentElement.classList.remove('zola-video-open');
    closing = false;
    opener?.focus();
  });
  modal.addEventListener('click', event => {
    if (event.target === modal || event.target === modal.querySelector('.zola-video-frame')) dismiss();
  });
  play.addEventListener('click', startPlayback);
  video.addEventListener('playing', () => { play.hidden = true; });
  video.addEventListener('loadedmetadata', () => {
    if (!modal.open || closing) { video.pause(); video.currentTime = 0; }
  });
  reducedMotion.addEventListener('change', event => { if (event.matches) transition?.cancel(); });
}
