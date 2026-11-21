// Zola Think — redesign 2026. Shared behaviour for every v2 page.
const WA_NUMBER = '201095393567';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- nav ---------- */
const nav = $('.nav');
if (nav) {
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('.burger', nav)?.addEventListener('click', e => {
    const open = nav.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  $$('.nav-links a', nav).forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
}
$$('[data-wa]').forEach(a => { a.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(a.dataset.wa || 'أهلاً Zola')}`; a.target = '_blank'; a.rel = 'noopener'; });

/* ---------- hero: elements appear one by one ---------- */
requestAnimationFrame(() => document.body.classList.add('ready'));

/* ---------- scroll reveal ---------- */
const io = 'IntersectionObserver' in window && !reduced ? new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
}, { threshold: .18, rootMargin: '0px 0px -40px 0px' }) : null;
$$('[data-reveal], .path, .podium, .circled').forEach(el => io ? io.observe(el) : el.classList.add('in'));

/* ---------- booking modal (Mission 0) ---------- */
const GRADES = [['grade_1_prep', 'أولى إعدادي'], ['grade_2_prep', 'تانية إعدادي'], ['grade_3_prep', 'تالتة إعدادي']];
const planeSvg = '<svg viewBox="0 0 150 110" fill="none" aria-hidden="true"><path d="M4 100C30 60 60 90 80 60" stroke="#834CBF" stroke-width="2.2" stroke-dasharray="6 7" stroke-linecap="round"/><g transform="translate(70 8)"><path d="M10 40 72 16 42 70Z" fill="#B394DE"/><path d="M42 70 48 50 72 16 32 50Z" fill="#372D75"/></g></svg>';
const closeSvg = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function buildBooking() {
  const d = document.createElement('dialog');
  d.className = 'modal'; d.id = 'booking'; d.setAttribute('aria-labelledby', 'booking-title');
  d.innerHTML = `
    <div class="plane-deco">${planeSvg}</div>
    <button class="close" type="button" aria-label="إغلاق">${closeSvg}</button>
    <div class="state" data-state="form">
      <span class="eyebrow"><bdi>Mission 0</bdi></span>
      <h2 id="booking-title" tabindex="-1">احجز مكانك مجاناً</h2>
      <p class="lead">90 دقيقة أونلاين مع فريق صغير.<br>هنكلّمك على واتساب نأكّد الميعاد.</p>
      <form class="form" novalidate>
        <div class="row2">
          <label class="field">اسم ولي الأمر<input name="parent_name" autocomplete="name" maxlength="80" placeholder="الاسم بالكامل" required><span class="err"></span></label>
          <label class="field">اسم الطالب<input name="student_name" autocomplete="off" maxlength="80" placeholder="اسم الطالب بالكامل" required><span class="err"></span></label>
        </div>
        <label class="field">الصف الدراسي<select name="grade" required><option value="">اختار الصف</option>${GRADES.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select><span class="err"></span></label>
        <label class="field">رقم ولي الأمر (واتساب)<input name="parent_whatsapp" type="tel" dir="ltr" inputmode="tel" autocomplete="tel" placeholder="01X XXXX XXXX" maxlength="24" required><span class="err"></span></label>
        <label class="field">رقم الطالب للجروب <span class="opt">(اختياري)</span><input name="student_whatsapp" type="tel" dir="ltr" inputmode="tel" placeholder="01X XXXX XXXX" maxlength="24"><span class="err"></span></label>
        <fieldset class="field"><legend>اختار ميعاد يناسبك</legend>
          <div class="slots" role="radiogroup">
            <label><input type="radio" name="preferred_slot" value="friday_7pm"><span>الجمعة · 7 م</span></label>
            <label><input type="radio" name="preferred_slot" value="saturday_7pm"><span>السبت · 7 م</span></label>
          </div><span class="err"></span>
        </fieldset>
        <p class="alert" role="alert" hidden></p>
        <button class="btn btn-dark" type="submit">احجز <bdi>Mission 0</bdi> مجاناً <span class="arrow">←</span></button>
        <p class="small">مجانية تماماً · مش محتاج أي خبرة سابقة</p>
      </form>
    </div>
    <div class="state success" data-state="done" hidden role="status">
      <div style="width:220px">${planeSvg}</div>
      <h2 tabindex="-1">تمام! مكانك اتحجز</h2>
      <p class="lead">هنبعتلك على واتساب تفاصيل الميعاد ولينك الدخول.<br>جهّز ابنك.. أول Mission قرّبت!</p>
      <button class="btn btn-dark" type="button" data-close>تمام</button>
      <a class="link" href="index.html#journey">اعرف أكتر عن <bdi>Journey 01</bdi></a>
    </div>`;
  document.body.append(d);
  const form = $('form', d), alert = $('.alert', d), submit = $('[type=submit]', d);
  const close = () => d.close();
  $('.close', d).addEventListener('click', close);
  $('[data-close]', d).addEventListener('click', close);
  d.addEventListener('click', e => { if (e.target === d) close(); });
  const norm = v => v.replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).replace(/[۰-۹]/g, x => '۰۱۲۳۴۵۶۷۸۹'.indexOf(x)).replace(/[\s()-]/g, '');
  const phoneOk = v => /^(01[0125]\d{8}|(?:\+|00)[1-9]\d{7,14})$/.test(v);
  const setErr = (name, msg) => {
    const el = form.elements[name]; const field = (el.length ? el[0] : el).closest('.field');
    field.toggleAttribute('data-invalid', !!msg); $('.err', field).textContent = msg || '';
  };
  form.addEventListener('input', e => e.target.name && setErr(e.target.name, ''));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(form);
    const data = {
      student_name: (f.get('student_name') || '').trim(), parent_name: (f.get('parent_name') || '').trim(),
      grade: f.get('grade') || '', parent_whatsapp: norm((f.get('parent_whatsapp') || '').trim()),
      student_whatsapp: norm((f.get('student_whatsapp') || '').trim()), preferred_slot: f.get('preferred_slot') || '',
      interests: [], dream_profession: '',
    };
    const errs = {};
    if (data.parent_name.length < 2) errs.parent_name = 'اكتب اسم ولي الأمر.';
    if (data.student_name.length < 2) errs.student_name = 'اكتب اسم الطالب.';
    if (!data.grade) errs.grade = 'اختار الصف.';
    if (!phoneOk(data.parent_whatsapp)) errs.parent_whatsapp = 'اكتب رقم صحيح، زي 01012345678.';
    if (data.student_whatsapp && !phoneOk(data.student_whatsapp)) errs.student_whatsapp = 'الرقم ده مش صحيح.';
    if (!data.preferred_slot) errs.preferred_slot = 'اختار ميعاد.';
    ['parent_name', 'student_name', 'grade', 'parent_whatsapp', 'student_whatsapp', 'preferred_slot'].forEach(n => setErr(n, errs[n]));
    if (Object.keys(errs).length) return;
    if (!data.student_whatsapp) delete data.student_whatsapp;
    alert.hidden = true; submit.disabled = true; submit.textContent = 'بنحجزلك...';
    try {
      const r = await fetch('/api/mission-zero/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(15000) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error();
      $('[data-state=form]', d).hidden = true; $('[data-state=done]', d).hidden = false;
      $('[data-state=done] h2', d).focus();
    } catch {
      alert.textContent = 'مقدرناش نحفظ الحجز دلوقتي. جرّب تاني، أو احجز على واتساب.'; alert.hidden = false;
    } finally { submit.disabled = false; submit.innerHTML = 'احجز <bdi>Mission 0</bdi> مجاناً <span class="arrow">←</span>'; }
  });
  d.addEventListener('close', () => {
    if (!$('[data-state=done]', d).hidden) { form.reset(); $('[data-state=form]', d).hidden = false; $('[data-state=done]', d).hidden = true; }
  });
  return d;
}
let booking;
$$('[data-book]').forEach(b => b.addEventListener('click', e => {
  e.preventDefault(); booking ||= buildBooking(); booking.showModal(); $('#booking-title').focus();
}));

/* ---------- video modal ---------- */
let video;
$$('[data-video]').forEach(b => b.addEventListener('click', e => {
  e.preventDefault();
  if (!video) {
    video = document.createElement('dialog'); video.className = 'video-modal'; video.setAttribute('aria-labelledby', 'video-title');
    video.innerHTML = `
      <div class="vhead"><div><h2 id="video-title">إزاي Zola بتشتغل.. في دقيقتين</h2><p>من أول المشكلة، للمفهوم، للـ AI، لحد الحل اللي بيبنوه.</p></div>
      <button class="vclose" type="button" aria-label="إغلاق الفيديو">${closeSvg.replace('currentColor', '#fff')}</button></div>
      <video controls playsinline preload="none" src="assets/videos/full-mission.mp4"></video>
      <div class="vfoot"><span class="hand">عجبتك الفكرة؟ جرّبها مع ابنك.</span><button class="btn btn-light" type="button" data-book-from-video>احجز <bdi>Mission 0</bdi> مجاناً <span class="arrow purple">←</span></button></div>`;
    document.body.append(video);
    const v = $('video', video), shut = () => video.close();
    $('.vclose', video).addEventListener('click', shut);
    video.addEventListener('click', e2 => { if (e2.target === video) shut(); });
    video.addEventListener('close', () => v.pause());
    $('[data-book-from-video]', video).addEventListener('click', () => { shut(); booking ||= buildBooking(); booking.showModal(); });
  }
  video.showModal(); $('video', video).play().catch(() => {});
}));

/* ---------- celebration (certificate page) ---------- */
// Confetti in the logo colours + a short synthesized applause (no audio file to download).
// Sound only plays after the student's own click (browsers block autoplay otherwise) and can be muted.
const SOUND_KEY = 'zola-sound';
let soundOn = true; try { soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) {}
function applause(seconds = 2.6) {
  if (!soundOn) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = applause.ctx || (applause.ctx = new AC()); ctx.resume?.();
    const sr = ctx.sampleRate, buf = ctx.createBuffer(1, Math.floor(sr * seconds), sr), d = buf.getChannelData(0);
    // Many short noise "claps" with random timing, louder in the middle, fading out at the end.
    const claps = Math.floor(seconds * 38);
    for (let k = 0; k < claps; k++) {
      const t0 = Math.random() * (seconds - 0.08), start = Math.floor(t0 * sr), len = Math.floor(sr * (0.012 + Math.random() * 0.02));
      const env = Math.min(1, t0 / 0.25) * Math.min(1, (seconds - t0) / 0.9) * (0.35 + Math.random() * 0.65);
      for (let i = 0; i < len && start + i < d.length; i++) d[start + i] += (Math.random() * 2 - 1) * env * Math.exp(-i / (len / 4));
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0.32;
    src.connect(bp).connect(g).connect(ctx.destination); src.start();
  } catch (e) {}
}
function confetti() {
  if (reduced) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const c = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
  const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }; size(); addEventListener('resize', size);
  const colors = ['#834CBF', '#372D75', '#B394DE', '#FFBF33', '#19203A'], shapes = ['rect', 'circle', 'star', 'squiggle'];
  const W = () => cv.width, H = () => cv.height;
  // Two bursts from the bottom corners, then a gentle rain from the top.
  const parts = [];
  const add = (x, y, vx, vy) => parts.push({ x, y, vx, vy, r: (5 + Math.random() * 7) * dpr, a: Math.random() * 6.28, va: (Math.random() - .5) * .3,
    col: colors[Math.random() * colors.length | 0], sh: shapes[Math.random() * shapes.length | 0], life: 0 });
  for (let i = 0; i < 90; i++) { add(0, H(), (6 + Math.random() * 9) * dpr, -(14 + Math.random() * 12) * dpr); add(W(), H(), -(6 + Math.random() * 9) * dpr, -(14 + Math.random() * 12) * dpr); }
  setTimeout(() => { for (let i = 0; i < 70; i++) add(Math.random() * W(), -20 * dpr, (Math.random() - .5) * 2 * dpr, (2 + Math.random() * 3) * dpr); }, 700);
  const star = (r) => { c.beginPath(); for (let i = 0; i < 5; i++) { c.lineTo(Math.cos(i * 1.2566 - 1.57) * r, Math.sin(i * 1.2566 - 1.57) * r); c.lineTo(Math.cos(i * 1.2566 - .94) * r * .45, Math.sin(i * 1.2566 - .94) * r * .45); } c.closePath(); c.fill(); };
  let last = performance.now(), end = last + 5200;
  (function frame(now) {
    const dt = Math.min(2, (now - last) / 16.7); last = now;
    c.clearRect(0, 0, W(), H());
    for (const p of parts) {
      p.vy += .32 * dpr * dt; p.vx *= .985; p.vy = Math.min(p.vy, 5 * dpr); p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; p.life += dt;
      c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = c.strokeStyle = p.col;
      c.globalAlpha = Math.max(0, Math.min(1, (end - now) / 900));
      if (p.sh === 'rect') { c.scale(1, Math.abs(Math.cos(p.life * .15)) + .2); c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); }
      else if (p.sh === 'circle') { c.beginPath(); c.arc(0, 0, p.r / 3, 0, 6.28); c.fill(); }
      else if (p.sh === 'star') star(p.r / 1.6);
      else { c.lineWidth = 2 * dpr; c.lineCap = 'round'; c.beginPath(); c.moveTo(-p.r, 0); c.quadraticCurveTo(-p.r / 2, -p.r / 2, 0, 0); c.quadraticCurveTo(p.r / 2, p.r / 2, p.r, 0); c.stroke(); }
      c.restore();
    }
    if (now < end) requestAnimationFrame(frame); else { removeEventListener('resize', size); cv.remove(); }
  })(last);
}
function celebrate() {
  confetti(); applause();
  const h = $('.cheer'); if (h && !reduced) { h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop'); }
}
$('#celebrate-again')?.addEventListener('click', celebrate);
const soundBtn = $('#sound-toggle');
if (soundBtn) {
  const paint = () => { soundBtn.textContent = soundOn ? '🔊' : '🔇'; soundBtn.setAttribute('aria-pressed', String(soundOn)); soundBtn.setAttribute('aria-label', soundOn ? 'الصوت شغّال — دوس عشان تقفله' : 'الصوت مقفول — دوس عشان تشغّله'); };
  paint();
  soundBtn.addEventListener('click', () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch (e) {} paint(); });
}

/* ---------- projects gallery (landing) ---------- */
// Shows the projects ticked "Show on site" in Notion; keeps the placeholder cards if nothing is there yet.
const gallery = $('[data-projects]');
if (gallery) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ph = $('.polaroid .img', gallery)?.innerHTML || '';
  fetch('/api/projects', { signal: AbortSignal.timeout(12000) }).then(r => r.ok ? r.json() : null).then(j => {
    const list = j && j.ok && j.projects; if (!list || !list.length) return;
    gallery.innerHTML = list.map(p => {
      const meta = [p.mission && `<bdi>${esc(p.mission)}</bdi>`, esc(p.by)].filter(Boolean).join(' · ');
      const inner = `<div class="img">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">` : ph}</div><h3>${esc(p.title)}</h3><small>${meta}</small>${p.math ? `<span class="math">الماث: ${esc(p.math)}</span>` : ''}${p.description ? `<p>${esc(p.description)}</p>` : ''}`;
      return p.link ? `<a class="polaroid" href="${esc(p.link)}" target="_blank" rel="noopener">${inner}</a>` : `<article class="polaroid">${inner}</article>`;
    }).join('');
  }).catch(() => {});
}

/* ---------- certificate page ---------- */
// Sample student (code Z-123) so the result page can be previewed before the Notion table is connected.
const DEMO_CERT = { code: 'Z-123', certificateId: 'ZT-26-TEST123', name: 'طالب تجريبي', nameEn: 'طالب تجريبي', journey: 'Journey 01', journeyUpper: 'JOURNEY 01',
  title: 'أفضل صاحب قرار', titleEn: '', titleReason: '', topSkills: ['اتخاذ القرار', 'التفكير النقدي', 'العرض بثقة'],
  skills: ['حل المشكلات', 'البحث', 'تحليل البيانات', 'فهم الـ AI', 'العمل الجماعي'], issuedLabel: '', issuedEn: '', pdf: null, image: null,
  projects: [['خطة رحلة المدرسة', 'مخطّط رحلات'], ['متجر الفصل', 'صاحب مشروع صغير'], ['خطة الاستجابة لزلزال', 'مهندس إنقاذ'], ['سباق زولا', 'مطوّر ألعاب'], ['تطبيق توقّع الطقس', 'محلل بيانات']].map(([title, role], mission) => ({ mission, title, role, image: null })) };
const certForm = $('#cert-form');
if (certForm) {
  const input = $('#cert-code'), box = $('.big-input', certForm), err = $('#cert-error'), btn = $('[type=submit]', certForm);
  if (!input.value) input.value = 'Z-';
  input.addEventListener('input', () => {
    let v = input.value.toUpperCase().replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).replace(/[^A-Z0-9-]/g, '');
    if (!v.startsWith('Z-')) v = 'Z-' + v.replace(/^Z-?/, '');
    input.value = v; box.removeAttribute('data-invalid'); err.hidden = true;
  });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function lookup(code) {
    btn.disabled = true; btn.firstChild.textContent = 'بندوّر.. ';
    try {
      const r = await fetch('/api/certificate?code=' + encodeURIComponent(code), { signal: AbortSignal.timeout(15000) });
      if (r.status === 503 && code === 'Z-123') { render(DEMO_CERT); return; } // preview before Notion is connected
      if (r.status === 404) throw Object.assign(new Error(), { nf: true });
      const j = await r.json(); if (!r.ok || !j.ok) throw new Error();
      render(j.certificate);
      history.replaceState(null, '', '?code=' + encodeURIComponent(code));
    } catch (e) {
      box.setAttribute('data-invalid', ''); err.hidden = false;
      err.textContent = e.nf ? 'الكود ده مش موجود عندنا. اتأكد إنه مكتوب صح، أو كلّمنا على واتساب.' : 'حصلت مشكلة في الاتصال. جرّب تاني بعد شوية.';
    } finally { btn.disabled = false; btn.firstChild.textContent = 'استلم شهادتك '; }
  }
  function render(c) {
    $('[data-view=enter]').hidden = true; const v = $('[data-view=result]'); v.hidden = false;
    $$('[data-f]', v).forEach(el => { const k = el.dataset.f; if (c[k] != null && c[k] !== '') el.textContent = c[k]; else if (el.dataset.optional !== undefined) el.closest('[data-wrap]')?.setAttribute('hidden', ''); });
    $('#first-name').textContent = (c.name || '').split(' ')[0];
    const certName = $('#cert-card .name'); certName.classList.toggle('ar', /[\u0600-\u06FF]/.test(certName.textContent));
    const top = c.topSkills || [];
    const pod = $('.podium', v);
    if (top.length) { [[1, 0], [0, 1], [2, 2]].forEach(([slot, idx]) => { const col = pod.children[slot]; if (top[idx]) $('b', col).textContent = top[idx]; else col.hidden = true; }); }
    else pod.closest('[data-wrap]').hidden = true;
    const all = [...new Set([...top, ...(c.skills || [])])];
    $('#skills-count').textContent = `(${all.length} مهارة)`;
    $('.skills-list', v).innerHTML = all.map((s, i) => `<li class="${i < top.length ? 'top' : ''}">${esc(s)}</li>`).join('');
    if (!c.title) $$('[data-title-only]', v).forEach(n => n.hidden = true);
    if (!c.titleEn) $('[data-award]', v).hidden = true;
    if (!c.titleReason) $$('[data-reason]', v).forEach(n => n.hidden = true);
    if (!c.issuedEn) $('[data-date]', v).hidden = true;
    const pdf = $('#cert-pdf'); if (c.pdf) { pdf.href = c.pdf; pdf.target = '_blank'; } else pdf.addEventListener('click', e => { e.preventDefault(); print(); });
    const img = $('#cert-img'); if (c.image) { img.href = c.image; img.target = '_blank'; } else img.hidden = true;
    const share = encodeURIComponent(location.href);
    $('#share-wa').href = `https://wa.me/?text=${encodeURIComponent('شهادة ' + c.name + ' من Zola Think 🎓 ')}${share}`;
    $('#share-fb').href = `https://www.facebook.com/sharer/sharer.php?u=${share}`;
    $('#share-li').href = `https://www.linkedin.com/sharing/share-offsite/?url=${share}`;
    const projects = c.projects || [], gal = $('.polaroids', v);
    if (projects.length) gal.innerHTML = projects.map((p, i) => `<article class="polaroid"><div class="img">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">` : ''}</div><small dir="ltr" class="purple" style="font-weight:600;letter-spacing:2px;font-size:11px">MISSION 0${p.mission ?? i}</small><h3>${esc(p.title)}</h3><small>${p.role ? 'الدور: ' + esc(p.role) : ''}</small></article>`).join('');
    else gal.closest('[data-wrap]').hidden = true;
    $$('.podium,[data-reveal]', v).forEach(el => io ? io.observe(el) : el.classList.add('in'));
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    setTimeout(celebrate, reduced ? 0 : 350);
  }
  certForm.addEventListener('submit', e => {
    e.preventDefault();
    const code = input.value.trim();
    if (!/^Z-[A-Z0-9]{2,12}$/.test(code)) { box.setAttribute('data-invalid', ''); err.hidden = false; err.textContent = 'اكتب الكود كامل بعد Z- (زي Z-1234).'; return; }
    lookup(code);
  });
  const q = new URLSearchParams(location.search).get('code');
  if (q) { input.value = q.toUpperCase(); lookup(input.value); }
}

/* ---------- login page ---------- */
const auth = $('.auth');
if (auth) {
  const tabs = $$('.tabs button', auth);
  const show = id => { $$('.auth form', auth).forEach(f => f.hidden = f.id !== id); tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.form === id || (id === 'f-otp' && t.dataset.form === 'f-parent')))); };
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.form)));
  $$('.auth form', auth).forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    if (f.id === 'f-parent') { show('f-otp'); $('#f-otp input').focus(); return; }
    $('.toast', f).hidden = false;
  }));
  const otp = $$('.otp input', auth);
  otp.forEach((i, k) => i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(0, 1); if (i.value && otp[k + 1]) otp[k + 1].focus(); }));
  $('[data-back]', auth)?.addEventListener('click', () => show('f-parent'));
  const code = $('#student-code'); code?.addEventListener('input', () => { let v = code.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); if (!v.startsWith('Z-')) v = 'Z-' + v.replace(/^Z-?/, ''); code.value = v; });
}
