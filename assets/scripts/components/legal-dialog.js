export function initLegalDialog() {
const legalDialog = document.getElementById('legal-dialog');
document.querySelectorAll('[data-legal]').forEach(button => {
  button.addEventListener('click', () => {
    const privacy = button.dataset.legal === 'privacy';
    legalDialog.querySelector('h2').textContent = privacy ? 'سياسة الخصوصية' : 'الشروط والأحكام';
    legalDialog.querySelector('p').textContent = privacy
      ? 'يمكنك التواصل مع فريق Zola Think للاستفسار عن سياسة الخصوصية قبل مشاركة بياناتك أو حجز التجربة.'
      : 'Journey 01 تشمل 4 Missions خلال 4 أسابيع، حوالي ساعتين أسبوعيًا، بسعر 1,500 جنيه للطالب. الحجز بيتأكد بعد الدفع عبر InstaPay أو Vodafone Cash، والتفاصيل بتوصلك على واتساب. يمكن طلب استرداد الاشتراك قبل البداية بيومين على الأقل؛ بعد البداية لا يمكن استرداده. الغياب لا يترتب عليه استرداد قيمة الـMission، والتعويض حسب توافر مكان في Batch مناسبة ومش مضمون. لو Zola Think ألغت Mission، بنحدد موعد بديل مناسب. ولو ألغت الـBatch بالكامل، بيتم استرداد المبلغ كاملًا. My Zola Mission Portfolio وشهادة رقمية مشمولين، وصندوق زولا الفعلي مش مشمول.';
    legalDialog.showModal();
  });
});
legalDialog.querySelector('.dialog-close').addEventListener('click', () => legalDialog.close());
legalDialog.addEventListener('click', event => {
  if (event.target === legalDialog) {
    const bounds = legalDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) legalDialog.close();
  }
});

}
