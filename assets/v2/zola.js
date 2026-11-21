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

/* ---------- certificate page ---------- */
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
    const top = c.topSkills || [];
    const pod = $('.podium', v);
    if (top.length) { [[1, 0], [0, 1], [2, 2]].forEach(([slot, idx]) => { const col = pod.children[slot]; if (top[idx]) $('b', col).textContent = top[idx]; else col.hidden = true; }); }
    else pod.closest('[data-wrap]').hidden = true;
    const all = [...new Set([...top, ...(c.skills || [])])];
    $('#skills-count').textContent = `(${all.length} مهارة)`;
    $('.skills-list', v).innerHTML = all.map((s, i) => `<li class="${i < top.length ? 'top' : ''}">${esc(s)}</li>`).join('');
    if (!c.title) $$('[data-title-only]', v).forEach(n => n.hidden = true);
    const pdf = $('#cert-pdf'); if (c.pdf) { pdf.href = c.pdf; pdf.target = '_blank'; } else pdf.addEventListener('click', e => { e.preventDefault(); print(); });
    const img = $('#cert-img'); if (c.image) { img.href = c.image; img.target = '_blank'; } else img.hidden = true;
    const share = encodeURIComponent(location.href);
    $('#share-wa').href = `https://wa.me/?text=${encodeURIComponent('شهادة ' + c.name + ' من Zola Think 🎓 ')}${share}`;
    $('#share-fb').href = `https://www.facebook.com/sharer/sharer.php?u=${share}`;
    $('#share-li').href = `https://www.linkedin.com/sharing/share-offsite/?url=${share}`;
    const projects = c.projects || [], gal = $('.polaroids', v);
    if (projects.length) gal.innerHTML = projects.map((p, i) => `<article class="polaroid"><div class="img">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">` : ''}</div><small dir="ltr" class="purple" style="font-weight:600;letter-spacing:2px;font-size:11px">MISSION 0${i + 1}</small><h3>${esc(p.title)}</h3><small>${p.role ? 'الدور: ' + esc(p.role) : ''}</small></article>`).join('');
    else gal.closest('[data-wrap]').hidden = true;
    $$('.podium,[data-reveal]', v).forEach(el => io ? io.observe(el) : el.classList.add('in'));
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
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
