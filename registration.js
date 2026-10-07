const registrationModal = document.createElement('dialog');
registrationModal.className = 'registration-modal';
registrationModal.setAttribute('aria-labelledby', 'registration-title');
registrationModal.setAttribute('aria-describedby', 'registration-subtitle');
const interestChoices = ['التحديات والألغاز', 'التكنولوجيا والبرمجة', 'التصميم والإبداع', 'العلوم والتجارب', 'الأرقام والرياضيات', 'البيزنس والتفاوض', 'صناعة المحتوى', 'القيادة والعمل مع فريق', 'لسه بيكتشف اهتماماته'];
const gradeChoices = ['الصف الخامس الابتدائي', 'الصف السادس الابتدائي', 'الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'];
registrationModal.innerHTML = `
  <button type="button" class="registration-close" aria-label="إغلاق التسجيل">×</button>
  <div class="registration-content">
    <header class="registration-header">
    <span class="registration-tag" dir="ltr">Mission 0</span>
    <h2 id="registration-title" tabindex="-1">جاهز لأول Mission؟</h2>
    <p id="registration-subtitle">سجّل بيانات بسيطة، وهنكلم ولي الأمر لتأكيد الحجز وتفاصيل التجربة.</p>
    </header>
    <div class="registration-scroll-area">
    <div class="registration-scroll-content" dir="rtl">
    <form class="registration-form" novalidate>
      <div class="registration-grid">
        <label>اسم الطالب<input name="studentName" autocomplete="off" maxlength="80" required aria-describedby="studentName-error"><span class="field-error" id="studentName-error"></span></label>
        <label>الصف الدراسي<select name="grade" required aria-describedby="grade-error"><option value="">اختر الصف</option>${gradeChoices.map(grade => `<option>${grade}</option>`).join('')}</select><span class="field-error" id="grade-error"></span></label>
        <label>اسم ولي الأمر<input name="parentName" autocomplete="name" maxlength="80" required aria-describedby="parentName-error"><span class="field-error" id="parentName-error"></span></label>
        <label>رقم واتساب ولي الأمر<input name="parentWhatsapp" type="tel" dir="ltr" inputmode="tel" autocomplete="tel" placeholder="01xxxxxxxxx" maxlength="24" required aria-describedby="parentWhatsapp-error"><span class="field-error" id="parentWhatsapp-error"></span></label>
      </div>
      <fieldset class="registration-time"><legend>ميعاد مناسب</legend><div><label><input type="radio" name="preferredTime" value="الجمعة — 7 مساءً" required aria-describedby="preferredTime-error"> الجمعة — 7 مساءً</label><label><input type="radio" name="preferredTime" value="السبت — 7 مساءً" required aria-describedby="preferredTime-error"> السبت — 7 مساءً</label></div><span class="field-error" id="preferredTime-error"></span></fieldset>
      <fieldset class="registration-interests"><legend>إيه أكتر حاجات بيستمتع بيها؟ <span>اختار كل اللي يناسبه</span></legend><div>${interestChoices.map((interest,index) => `<label><input type="checkbox" name="interests" value="${interest}"><span>${interest}</span></label>`).join('')}</div></fieldset>
      <label class="registration-career">لو يقدر يجرب أي مهنة ليوم واحد، هيختار إيه؟ <span>اختياري</span><input name="dreamCareer" maxlength="160" placeholder="أي فكرة تخطر في باله"></label>
      <p class="registration-error" role="alert" hidden></p>
      <button class="registration-submit" type="submit">احجز Mission 0 مجانًا</button>
      <p class="registration-status" role="status" aria-live="polite"></p>
    </form>
    <div class="registration-success" hidden role="status" aria-live="polite"><span aria-hidden="true">🎯</span><h3 tabindex="-1">تم تسجيلك! 🎯</h3><p>هنكلم ولي الأمر على واتساب لتأكيد الحجز وإرسال تفاصيل الـMission.</p><button type="button">تمام</button></div>
    </div>
    </div>
  </div>`;
document.body.append(registrationModal);
const registrationStyle = document.createElement('link');
registrationStyle.rel = 'stylesheet';
registrationStyle.href = 'registration.css';
document.head.append(registrationStyle);
const registrationForm = registrationModal.querySelector('form');
const submitButton = registrationModal.querySelector('.registration-submit');
const requestError = registrationModal.querySelector('.registration-error');
const registrationStatus = registrationModal.querySelector('.registration-status');
let registrationTrigger;
let submitting = false;
let registrationSucceeded = false;
let requestId = crypto.randomUUID();

document.querySelectorAll('.reference-cta, .trial-action .landing-button, [data-mission-registration]').forEach(trigger => {
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', event => {
    event.preventDefault();
    registrationTrigger = trigger;
    if (registrationSucceeded) {
      registrationSucceeded = false;
      registrationForm.reset();
      registrationForm.hidden = false;
      registrationModal.querySelector('.registration-success').hidden = true;
      registrationModal.querySelector('#registration-subtitle').hidden = false;
      requestId = crypto.randomUUID();
    }
    registrationModal.showModal();
    document.body.classList.add('registration-open');
    registrationModal.querySelector('#registration-title').focus();
  });
});
function closeRegistration() { registrationModal.close(); }
registrationModal.querySelector('.registration-close').addEventListener('click', closeRegistration);
registrationModal.querySelector('.registration-success button').addEventListener('click', closeRegistration);
registrationModal.addEventListener('close', () => {
  document.body.classList.remove('registration-open');
  registrationTrigger?.focus();
});
registrationModal.addEventListener('click', event => {
  if (event.target !== registrationModal) return;
  const rect = registrationModal.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeRegistration();
});
function normalizePhone(value) {
  return value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[\s()-]/g, '');
}
function validateRegistration(data) {
  const errors = {};
  if (data.studentName.length < 2) errors.studentName = 'اكتب اسم الطالب، حرفين على الأقل.';
  if (!gradeChoices.includes(data.grade)) errors.grade = 'اختر الصف الدراسي.';
  if (data.parentName.length < 2) errors.parentName = 'اكتب اسم ولي الأمر، حرفين على الأقل.';
  if (!/^(01[0125]\d{8}|(?:\+|00)[1-9]\d{7,14})$/.test(data.parentWhatsapp)) errors.parentWhatsapp = 'اكتب رقم مصري صحيح أو رقم دولي يبدأ بكود الدولة.';
  if (!['الجمعة — 7 مساءً', 'السبت — 7 مساءً'].includes(data.preferredTime)) errors.preferredTime = 'اختر الميعاد المناسب.';
  return errors;
}
function showFieldErrors(errors) {
  ['studentName', 'grade', 'parentName', 'parentWhatsapp', 'preferredTime'].forEach(name => {
    registrationModal.querySelector(`#${name}-error`).textContent = errors[name] || '';
    registrationForm.querySelectorAll(`[name="${name}"]`).forEach(field => field.setAttribute('aria-invalid', String(Boolean(errors[name]))));
  });
}
registrationForm.addEventListener('input', event => {
  if (!submitting) requestId = crypto.randomUUID();
  const error = registrationModal.querySelector(`#${event.target.name}-error`);
  if (error) { error.textContent = ''; event.target.setAttribute('aria-invalid', 'false'); }
});
registrationForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  const fields = new FormData(registrationForm);
  const data = { requestId, studentName: fields.get('studentName').trim(), grade: fields.get('grade'), parentName: fields.get('parentName').trim(), parentWhatsapp: normalizePhone(fields.get('parentWhatsapp').trim()), preferredTime: fields.get('preferredTime'), interests: fields.getAll('interests'), dreamCareer: fields.get('dreamCareer').trim() };
  const errors = validateRegistration(data);
  showFieldErrors(errors);
  requestError.hidden = true;
  registrationStatus.textContent = '';
  if (Object.keys(errors).length) {
    registrationForm.querySelector(`[name="${Object.keys(errors)[0]}"]`).focus();
    registrationStatus.textContent = 'راجع البيانات المحددة لإكمال الحجز.';
    return;
  }
  submitting = true;
  registrationForm.querySelectorAll('input, select').forEach(field => field.disabled = true);
  submitButton.disabled = true;
  registrationForm.setAttribute('aria-busy', 'true');
  submitButton.textContent = 'جاري تسجيل الحجز...';
  registrationStatus.textContent = 'بنحفظ بياناتك، لحظة واحدة.';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/registrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: controller.signal });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error('Registration failed');
    registrationSucceeded = true;
    registrationForm.hidden = true;
    registrationModal.querySelector('#registration-subtitle').hidden = true;
    registrationModal.querySelector('.registration-success').hidden = false;
    if (registrationModal.open) registrationModal.querySelector('.registration-success h3').focus();
  } catch {
    requestError.textContent = 'مقدرناش نحفظ الحجز دلوقتي. بياناتك موجودة، جرّب تاني بعد لحظة.';
    requestError.hidden = false;
    registrationStatus.textContent = '';
  } finally {
    clearTimeout(timeout);
    submitting = false;
    registrationForm.querySelectorAll('input, select').forEach(field => field.disabled = false);
    submitButton.disabled = false;
    submitButton.textContent = 'احجز Mission 0 مجانًا';
    registrationForm.removeAttribute('aria-busy');
  }
});
