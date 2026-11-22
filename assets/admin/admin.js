/* Zola Think — /admin. Cards + questions, Mission 0 slots, bookings. Data lives in Notion. */
(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPES = [['text', 'كتابة'], ['single', 'اختيار واحد'], ['multi', 'أكتر من اختيار'], ['yesno', 'آه ولا لأ'], ['number', 'رقم'], ['scale', 'مقياس ثقة']];
const typeName = t => (TYPES.find(x => x[0] === t) || TYPES[0])[1];
const DAY_LIST = [['saturday', 'السبت'], ['sunday', 'الأحد'], ['monday', 'الاتنين'], ['tuesday', 'التلات'], ['wednesday', 'الأربع'], ['thursday', 'الخميس'], ['friday', 'الجمعة']];
const PAGE = 10;

// ---------- api ----------
async function api(action, body, params = '') {
  const opts = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' };
  let r;
  try { r = await fetch(`/api/admin?action=${action}${params}`, opts); } catch (e) { throw new Error('مفيش اتصال.. اتأكدي من النت'); }
  const d = await r.json().catch(() => ({ ok: false }));
  if (r.status === 401 && action !== 'login') { showLogin(); throw new Error(d.message || 'لازم تدخلي الأول'); }
  if (!d.ok) throw new Error(d.message || 'حصلت مشكلة. جربي تاني');
  return d;
}
let toastTimer;
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, bad ? 4200 : 2200);
}
const fail = e => toast(e.message, true);

// ---------- login ----------
function showLogin() { $('#app').hidden = true; $('#login').hidden = false; setTimeout(() => $('#pw').focus(), 50); }
function showApp() { $('#login').hidden = true; $('#app').hidden = false; route(); }
$('#eye').addEventListener('click', () => { const p = $('#pw'); p.type = p.type === 'password' ? 'text' : 'password'; });
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#login-form .btn'); btn.disabled = true; $('#login-err').textContent = '';
  try { await api('login', { password: $('#pw').value }); $('#pw').value = ''; showApp(); }
  catch (err) { $('#login-err').textContent = err.message; }
  finally { btn.disabled = false; }
});
$('#logout').addEventListener('click', async () => { try { await api('logout', {}); } catch (e) {} showLogin(); });

// ---------- router ----------
window.addEventListener('hashchange', route);
function route() {
  if ($('#app').hidden) return;
  const [name, id] = (location.hash.slice(1) || 'cards').split('/');
  document.querySelectorAll('.rail a').forEach(a => a.classList.toggle('on', a.dataset.nav === (name === 'questions' ? 'cards' : name)));
  view.innerHTML = '<p class="loading">ثانية واحدة…</p>';
  const views = { cards: cardsView, questions: () => questionsView(id), slots: slotsView, bookings: bookingsView };
  (views[name] || cardsView)();
  window.scrollTo(0, 0);
}

// ---------- cards ----------
async function cardsView() {
  let cards;
  try { cards = (await api('cards')).cards; } catch (e) { view.innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  const groups = new Map();
  for (const c of cards) { const k = c.mission == null ? '—' : c.mission; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
  view.innerHTML = `
    <div class="head"><div><h1>افتحي <em>الكارت</em> للطلاب</h1><p class="sub">الكارت المفتوح بس هو اللي بيظهر للطلاب على /card.. ومفيش غير كارت واحد مفتوح في المرة</p></div>
      <button class="btn ghost small" id="copy">نسخ لينك /card</button></div>
    <div class="missions">${[...groups].map(([m, list]) => `
      <section class="mission"><h2>${m === '—' ? 'كروت تانية' : `<bdi>Mission ${esc(m)}</bdi>`}</h2>
      ${list.map(c => `
        <article class="note ${c.phase} ${c.open ? 'open' : ''}">
          <div class="t"><span class="ph">${c.phase === 'after' ? 'بعد' : 'قبل'}</span>${c.open ? '<span class="chip on">مفتوح دلوقتي</span>' : '<span class="chip">مقفول</span>'}</div>
          <p class="meta">${c.questionCount ? `${c.questionCount} أسئلة` : 'لسه مفيش أسئلة'}</p>
          <div class="b"><a class="link" href="#questions/${esc(c.id)}">${c.questionCount ? 'الأسئلة ›' : '+ ضيفي أسئلة'}</a>
          <button class="switch" role="switch" aria-checked="${c.open}" aria-label="${c.open ? 'اقفلي' : 'افتحي'} الكارت" data-id="${esc(c.id)}"></button></div>
        </article>`).join('')}</section>`).join('') || '<p class="empty">مفيش كروت في جدول الكروت</p>'}</div>`;
  $('#copy').onclick = () => { navigator.clipboard.writeText(location.origin + '/card').then(() => toast('اتنسخ اللينك')); };
  view.querySelectorAll('.switch').forEach(sw => sw.onclick = async () => {
    const open = sw.getAttribute('aria-checked') !== 'true';
    view.querySelectorAll('.switch').forEach(s => s.disabled = true);
    try { await api('card-status', { id: sw.dataset.id, open }); toast(open ? 'الكارت اتفتح للطلاب' : 'الكارت اتقفل'); cardsView(); }
    catch (e) { fail(e); view.querySelectorAll('.switch').forEach(s => s.disabled = false); }
  });
}

// ---------- questions ----------
async function questionsView(cardId) {
  let data;
  try { data = await api('questions', null, '&card=' + encodeURIComponent(cardId || '')); } catch (e) { view.innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  let editing = null; // question id, 'new', or null
  const c = data.card;
  const label = `${c.mission != null ? `<bdi>Mission ${esc(c.mission)}</bdi> · ` : ''}كارت ${c.phase === 'after' ? 'بعد' : 'قبل'}`;
  view.innerHTML = `
    <div class="head"><div><p class="crumb"><a href="#cards">الكروت</a> ‹ ${label}</p><h1>أسئلة <em>الكارت</em></h1></div><span class="saved" id="saved"></span></div>
    <div class="qwrap"><div class="card taped qlist" id="qlist"></div>
      <aside class="preview"><span class="muted">معاينة من الموقع</span><div class="frame" id="frame"><iframe id="pv" title="معاينة الكارت" loading="lazy"></iframe></div></aside></div>`;
  const pv = $('#pv'), frame = $('#frame');
  const fit = () => { const s = frame.clientWidth / 400; pv.style.transform = `scale(${s})`; pv.style.height = (frame.clientHeight / s) + 'px'; };
  new ResizeObserver(fit).observe(frame); fit();
  const preview = (n = 1) => { pv.src = `/card?preview=${encodeURIComponent(c.id)}&q=${n}&t=${Date.now()}`; };
  preview();

  function draw() {
    const qs = data.questions;
    $('#qlist').innerHTML = qs.map((q, i) => editing === q.id ? editor(q, i) : `
      <div class="qrow" data-id="${esc(q.id)}">
        <div class="mv"><button data-mv="-1" aria-label="لفوق" ${i === 0 ? 'disabled' : ''}>▲</button><button data-mv="1" aria-label="لتحت" ${i === qs.length - 1 ? 'disabled' : ''}>▼</button></div>
        <span class="n">${i + 1}</span><button class="q" data-edit="${esc(q.id)}" style="text-align:right">${esc(q.text)}</button><span class="ty">${typeName(q.type)}${q.optional ? ' · اختياري' : ''}</span>
      </div>`).join('')
      + (editing === 'new' ? editor({ type: 'text', text: '', choices: [] }, qs.length) : '')
      + (qs.length < data.max && editing !== 'new' ? `<button class="addq" id="addq">+ ضيفي سؤال</button>` : '')
      + (!qs.length && editing !== 'new' ? '<p class="empty">الكارت ده لسه مفيهوش أسئلة</p>' : '');
    bind();
  }
  function editor(q, i) {
    const choice = q.type === 'single' || q.type === 'multi';
    return `<form class="qedit" id="qform" data-id="${esc(q.id || '')}">
      <label>السؤال ${i + 1}<input class="input q" name="text" maxlength="400" value="${esc(q.text)}" placeholder="اكتبي السؤال هنا" required></label>
      <div class="grid2"><label>نوع الإجابة<select class="select" name="type">${TYPES.map(([v, n]) => `<option value="${v}" ${q.type === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <span class="toggle-line">اختياري <button type="button" class="switch" role="switch" name="optional" aria-checked="${!!q.optional}"></button></span></div>
      <div class="choices" ${choice ? '' : 'hidden'}><label>الاختيارات</label><div class="opts">${(q.choices || []).map(o => optHtml(o)).join('')}<button type="button" class="addopt">+ اختيار</button></div></div>
      <label class="fu" ${q.type === 'yesno' ? '' : 'hidden'}>لو قال «آه» اسأله (اختياري)<input class="input" name="followUp" maxlength="200" value="${esc(q.followUp || '')}"></label>
      <label>توضيح تحت السؤال (اختياري)<input class="input" name="hint" maxlength="300" value="${esc(q.hint || '')}"></label>
      <div class="qactions"><span>${q.id && i > 0 ? '<button type="button" class="link danger" data-del>امسحي السؤال</button>' : ''}</span>
        <span class="row-end"><button type="button" class="btn ghost small" data-cancel>إلغاء</button><button class="btn small" type="submit">احفظي</button></span></div>
    </form>`;
  }
  const optHtml = o => `<span class="opt"><input value="${esc(o)}" maxlength="60" aria-label="اختيار"><button type="button" aria-label="امسحي الاختيار">×</button></span>`;
  function bind() {
    view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { editing = b.dataset.edit; draw(); preview(data.questions.findIndex(q => q.id === editing) + 1); });
    view.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => move(b.closest('.qrow').dataset.id, +b.dataset.mv));
    const add = $('#addq'); if (add) add.onclick = () => { editing = 'new'; draw(); $('#qform input').focus(); };
    const f = $('#qform'); if (!f) return;
    const sw = f.querySelector('.switch'); sw.onclick = () => sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') !== 'true');
    f.type.onchange = () => { const t = f.type.value; f.querySelector('.choices').hidden = !(t === 'single' || t === 'multi'); f.querySelector('.fu').hidden = t !== 'yesno';
      if ((t === 'single' || t === 'multi') && !f.querySelectorAll('.opt').length) { f.querySelector('.addopt').insertAdjacentHTML('beforebegin', optHtml('') + optHtml('')); bindOpts(); } };
    const bindOpts = () => f.querySelectorAll('.opt button').forEach(b => b.onclick = () => b.parentElement.remove());
    bindOpts();
    f.querySelector('.addopt').onclick = e => { e.currentTarget.insertAdjacentHTML('beforebegin', optHtml('')); bindOpts(); const ins = f.querySelectorAll('.opt input'); ins[ins.length - 1].focus(); };
    f.querySelector('[data-cancel]').onclick = () => { editing = null; draw(); };
    const del = f.querySelector('[data-del]');
    if (del) del.onclick = async () => {
      if (!confirm('تمسحي السؤال ده؟')) return;
      try { data = await api('question-delete', { id: f.dataset.id, cardId: c.id }); editing = null; draw(); saved(); preview(); } catch (e) { fail(e); }
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const body = { cardId: c.id, id: f.dataset.id || undefined, text: f.text.value, type: f.type.value, optional: sw.getAttribute('aria-checked') === 'true',
        hint: f.hint.value, followUp: f.followUp.value, choices: [...f.querySelectorAll('.opt input')].map(i => i.value.trim()).filter(Boolean) };
      if (!body.text.trim()) return toast('اكتبي السؤال الأول', true);
      if ((body.type === 'single' || body.type === 'multi') && body.choices.length < 2) return toast('محتاجة اختيارين على الأقل', true);
      const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'بيتحفظ…';
      try {
        data = await api('question-save', body);
        const idx = body.id ? data.questions.findIndex(q => q.id === body.id) : data.questions.length - 1;
        editing = null; draw(); saved(); preview(idx + 1);
      } catch (err) { fail(err); btn.disabled = false; btn.textContent = 'احفظي'; }
    };
  }
  async function move(id, d) {
    const ids = data.questions.map(q => q.id), i = ids.indexOf(id), j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    data.questions = ids.map(x => data.questions.find(q => q.id === x)); draw();
    try { data = await api('question-order', { cardId: c.id, ids }); draw(); saved(); preview(j + 1); } catch (e) { fail(e); }
  }
  function saved() { const s = $('#saved'); s.textContent = '✓ اتحفظ في Notion'; setTimeout(() => { s.textContent = ''; }, 2500); }
  draw();
}

// ---------- slots ----------
async function slotsView() {
  let slots;
  try { slots = (await api('slots')).slots; } catch (e) { view.innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  const hours = [];
  for (let h = 9; h <= 22; h++) hours.push([h % 12 || 12, h < 12 ? 'am' : 'pm']);
  view.innerHTML = `
    <div class="head"><div><h1>مواعيد <em><bdi>Mission 0</bdi></em></h1><p class="sub">المواعيد اللي هنا هي اللي بتظهر في فورم الحجز.. والميعاد اللي يكمل بيتقفل لوحده</p></div></div>
    <div class="sgrid"><div class="card taped slist" id="slist"></div>
      <form class="card addslot" id="addslot"><h2>ميعاد جديد</h2>
        <div class="two"><label class="muted">اليوم<select class="select" name="day">${DAY_LIST.map(([v, n]) => `<option value="${v}" ${v === 'thursday' ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="muted">الساعة<select class="select" name="hour">${hours.map(([h, p]) => `<option value="${h}${p}" ${h === 5 && p === 'pm' ? 'selected' : ''}>${h} ${p === 'pm' ? 'م' : 'ص'}</option>`).join('')}</select></label></div>
        <label class="muted">عدد الأماكن<input class="input" name="capacity" type="number" min="1" max="200" value="12" inputmode="numeric"></label>
        <button class="btn" type="submit"><span>←</span> ضيفي الميعاد</button>
        <p class="muted">كل ميعاد بيتكرر كل أسبوع</p></form></div>`;
  const draw = () => {
    $('#slist').innerHTML = slots.map(s => {
      const pct = s.capacity ? Math.min(100, Math.round(s.booked / s.capacity * 100)) : 0;
      return `<div class="slot ${s.visible ? '' : 'hidden-slot'}" data-id="${esc(s.id)}">
        <div class="info"><div class="name">${esc(s.short)}${s.full ? '<span class="full">كامل</span>' : ''}${s.visible ? '' : '<span class="hid">مخفي</span>'}</div>
          <div class="count"><span>${s.booked} من <button class="link cap" title="غيّري عدد الأماكن">${s.capacity}</button> محجوز</span><div class="bar ${s.full ? 'red' : ''}"><span style="width:${pct}%"></span></div></div></div>
        <button class="switch" role="switch" aria-checked="${s.visible}" aria-label="${s.visible ? 'اخفي' : 'اظهري'} الميعاد في الفورم"></button>
        <button class="del" aria-label="امسحي الميعاد"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>`;
    }).join('') || '<p class="empty">مفيش مواعيد لسه.. ضيفي أول ميعاد</p>';
    $('#slist').querySelectorAll('.slot').forEach(row => {
      const id = row.dataset.id, s = slots.find(x => x.id === id);
      row.querySelector('.switch').onclick = async () => { try { slots = (await api('slot-update', { id, visible: !s.visible })).slots; draw(); toast(s.visible ? 'الميعاد اتخفى من الفورم' : 'الميعاد ظاهر في الفورم'); } catch (e) { fail(e); } };
      row.querySelector('.cap').onclick = async () => {
        const v = prompt('عدد الأماكن', s.capacity); if (v == null) return;
        try { slots = (await api('slot-update', { id, capacity: Number(v) })).slots; draw(); toast('اتغيّر عدد الأماكن'); } catch (e) { fail(e); }
      };
      row.querySelector('.del').onclick = async () => {
        if (!confirm(`تمسحي ميعاد ${s.short}؟${s.booked ? `\nفيه ${s.booked} حجز عليه، وهيفضلوا في جدول الحجوزات` : ''}`)) return;
        try { slots = (await api('slot-delete', { id })).slots; draw(); toast('الميعاد اتمسح'); } catch (e) { fail(e); }
      };
    });
  };
  draw();
  $('#addslot').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, m = /^(\d+)(am|pm)$/.exec(f.hour.value);
    const btn = f.querySelector('.btn'); btn.disabled = true;
    try { slots = (await api('slot-save', { day: f.day.value, hour: Number(m[1]), period: m[2], capacity: Number(f.capacity.value) })).slots; draw(); toast('الميعاد اتضاف وظاهر في الفورم'); }
    catch (err) { fail(err); } finally { btn.disabled = false; }
  };
}

// ---------- bookings ----------
async function bookingsView() {
  let data;
  try { data = await api('bookings'); } catch (e) { view.innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  const all = data.bookings, statuses = data.statuses;
  const slots = [...new Set(all.map(b => b.slot).filter(Boolean))];
  let slot = '', q = '', page = 1;
  const ago = iso => {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 60) return m <= 1 ? 'دلوقتي' : `من ${m} دقيقة`;
    const h = Math.round(m / 60); if (h < 24) return h === 1 ? 'من ساعة' : h === 2 ? 'من ساعتين' : `من ${h} ساعات`;
    const d = Math.round(h / 24); return d === 1 ? 'امبارح' : d === 2 ? 'من يومين' : d <= 10 ? `من ${d} أيام` : new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  };
  const shortSlot = s => s.replace(' — ', ' · ').replace('مساءً', 'م').replace('صباحاً', 'ص');
  const shortGrade = g => g.replace('الصف ', '').replace('الأول', 'أولى').replace('الثاني', 'تانية').replace('الثالث', 'تالتة').replace('الخامس', 'خامسة').replace('السادس', 'سادسة').replace('الإعدادي', 'إعدادي').replace('الابتدائي', 'ابتدائي');
  const phone = p => (p || '').replace(/^\+20/, '0');
  view.innerHTML = `
    <div class="head"><div><h1>حجوزات <em><bdi>Mission 0</bdi></em></h1><p class="hand">${all.length} حجز لحد دلوقتي</p></div>
      <button class="btn" id="xlsx"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> نزّلي Excel</button></div>
    <div class="filters"><div class="chips" id="chips"></div>
      <label class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="#9AA0B4" stroke-width="2"/><path d="M20 20l-4.5-4.5" stroke="#9AA0B4" stroke-width="2" stroke-linecap="round"/></svg><input id="q" type="search" placeholder="دوري باسم أو رقم" aria-label="بحث"></label></div>
    <div class="card taped table"><table><thead><tr><th>الطالب</th><th>الصف</th><th>ولي الأمر</th><th>واتساب ولي الأمر</th><th>الميعاد</th><th>اتحجز</th><th>الحالة</th></tr></thead><tbody id="rows"></tbody></table></div>
    <div class="foot"><span class="hand" style="font-size:15px;color:var(--sub)">الشيت بيتنزل بكل الأعمدة.. والحالة بتتغيّر من هنا وبتتحفظ في Notion</span><div class="pages" id="pages"></div></div>`;
  const filtered = () => {
    const s = q.trim().toLowerCase();
    return all.filter(b => (!slot || b.slot === slot) && (!s || [b.student, b.parent, b.parentPhone, phone(b.parentPhone), b.studentPhone, phone(b.studentPhone)].some(v => String(v).toLowerCase().includes(s))));
  };
  const draw = () => {
    $('#chips').innerHTML = [['', 'كل المواعيد'], ...slots.map(s => [s, shortSlot(s)])].map(([v, n]) => `<button class="${v === slot ? 'on' : ''}" data-slot="${esc(v)}">${esc(n)}</button>`).join('');
    $('#chips').querySelectorAll('button').forEach(b => b.onclick = () => { slot = b.dataset.slot; page = 1; draw(); });
    const list = filtered(), pages = Math.max(1, Math.ceil(list.length / PAGE));
    page = Math.min(page, pages);
    const rows = list.slice((page - 1) * PAGE, page * PAGE);
    $('#rows').innerHTML = rows.map(b => `<tr>
      <td class="name">${esc(b.student)}${b.studentPhone ? `<span class="small" dir="ltr">${esc(phone(b.studentPhone))}</span>` : ''}</td>
      <td>${esc(shortGrade(b.grade))}</td><td>${esc(b.parent)}</td>
      <td class="phone"><a href="https://wa.me/${esc((b.parentPhone || '').replace(/\D/g, ''))}" target="_blank" rel="noopener">${esc(phone(b.parentPhone))}</a></td>
      <td>${esc(shortSlot(b.slot))}</td><td>${esc(ago(b.created))}</td>
      <td><select class="status" data-id="${esc(b.id)}" data-s="${esc(b.status)}" aria-label="حالة الحجز">${statuses.map(s => `<option ${s === b.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></td></tr>`).join('')
      || `<tr><td colspan="7" class="empty">${all.length ? 'مفيش حجوزات بالبحث ده' : 'لسه مفيش حجوزات'}</td></tr>`;
    $('#rows').querySelectorAll('.status').forEach(sel => sel.onchange = async () => {
      const b = all.find(x => x.id === sel.dataset.id), old = b.status;
      sel.dataset.s = b.status = sel.value;
      try { await api('booking-status', { id: b.id, status: sel.value }); toast('الحالة اتغيّرت'); }
      catch (e) { sel.value = sel.dataset.s = b.status = old; fail(e); }
    });
    const nums = [];
    for (let i = 1; i <= pages; i++) if (pages <= 7 || i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
    $('#pages').innerHTML = `<span class="muted">بيظهر ${rows.length} من ${list.length}</span>`
      + (pages > 1 ? `<button class="arrow" data-p="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="الصفحة اللي قبل">›</button>${nums.map(n => n === '…' ? '<span class="muted">…</span>' : `<button class="${n === page ? 'on' : ''}" data-p="${n}">${n}</button>`).join('')}<button class="arrow" data-p="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="الصفحة اللي بعد">‹</button>` : '');
    $('#pages').querySelectorAll('[data-p]').forEach(b => b.onclick = () => { page = +b.dataset.p; draw(); });
  };
  $('#q').oninput = e => { q = e.target.value; page = 1; draw(); };
  $('#xlsx').onclick = () => { location.href = `/api/admin?action=export${slot ? '&slot=' + encodeURIComponent(slot) : ''}${q ? '&q=' + encodeURIComponent(q) : ''}`; };
  draw();
}

// ---------- start ----------
fetch('/api/admin?action=me', { cache: 'no-store' }).then(r => (r.ok ? showApp() : showLogin())).catch(showLogin);
})();
