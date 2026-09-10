const ar = {
  about: "عن زولا",
  missions: "المهام",
  skills: "المهارات",
  stories: "قصصنا",
  join: "انضم للمهمة الجاية <b>←</b>",
  mission: "المهمة",
  heroTitle: "فكر. قرر.<br>ابني. قدم.<br><em>راجع نفسك.</em>",
  heroCopy:
    "رحلة من 5 خطوات هتشتغل فيها مع فريق،<br>وتحل مشاكل بجد وتسيب بصمتك.",
  meta: "من 10 لـ16 سنة <i>·</i> مصر والمنطقة",
  introEyebrow: "مش حصة. دي مهمة بجد.",
  introTitle: "خلي اللي يعرفوه<br><em>يوصل لمكان.</em>",
  introCopy:
    "زولا ثينك بتحط اليافعين جوه تحديات من الحياة. بياخدوا دور، يشتغلوا مع تيم، يقرروا، ويدافعوا عن قرارهم.",
  note1: "مفيش اجابات<br>جاهزة",
  note2: "ادوار حقيقية<br>وقرارات حقيقية",
  practiceEyebrow: "هتتدرب على ايه",
  practiceTitle: "خمس نقلات لفكرة<br><em>تمشي لقدام.</em>",
  practiceCopy: "كل مهمة بتبدأ بسؤال. والباقي انت اللي هتوصله.",
  s1: "01 / اكتشف",
  s1h: "بص اقرب.",
  s1p: "ادخل جوه الدور، فكك المشكلة، ولقط الاسئلة اللي تستاهل تتسأل.",
  s2: "02 / قرر",
  s2h: "اختار طريق.",
  s2p: "وازن الادلة، اسمع كل الاصوات، وخدوا قرار واحد مع بعض وسط ظروف حقيقية.",
  yes: "اه",
  maybe: "ممكن",
  s3: "03 / ابني",
  s3h: "خليها حقيقة.",
  s3p: "استخدم اللي فكرتك محتاجاه: بحث او كود او ماث او AI او حكاية قوية.",
  s4: "04 / قدم",
  s4h: "خد مكانك.",
  s4p: "وروا اللي عملتوه، اشرحوا ليه شغال، وخلي تفكيركم يوصل.",
  s5: "05 / راجع",
  s5h: "كمل بيها.",
  s5p: "بص للقرار والنتيجة والسؤال الاحسن اللي جاي.",
  tap: "دوس على بطاقة عشان تتابع المهمة.",
  rolesEyebrow: "كل مهمة فيها مفاجأة",
  rolesTitle: "مش هتعرف دورك<br>غير لما <em>تبدأ.</em>",
  m1: "المهمة 01 / مقفولة",
  engineer: "الدور<br>مجهول",
  engineerP: "المهمة هتكشف دورك اول ما تبدأ.",
  m0: "المهمة 00 / مقفولة",
  pharmacist: "هتبقى<br>مين؟",
  pharmacistP: "مفيش حرق. اكتشف دورك مع تيمك.",
  time: "هتظهر لايف",
  team: "تيم من 3",
  rolesCopy:
    "المهمة بتبدأ بسر. انت وتيمك هتكتشفوا الموقف، والرهان، والدور اللي هتشيله قبل ما تقرروا هتعملوا ايه.",
  d: "اكتشف",
  dp: "ادخل في قلب الموقف.",
  de: "قرر",
  dep: "اختاروا مع بعض وليكم اسبابكم.",
  b: "ابني",
  bp: "حولوا التفكير لحاجة حقيقية.",
  p: "قدم",
  pp: "دافع عن اتجاه تيمك.",
  r: "راجع",
  rp: "خد معاك اللي اتعلمته.",
  proofEyebrow: "اول مهام سابت علامة",
  stat1: "يافع<br>وصلناله",
  stat2: "ادوا المهمة<br>5 من 5",
  stat3: "مهمتين تجريبيتين<br>اتعملوا",
  quote: "“دي مش حصة.<br>دي <em>مهمة بجد.</em>”",
  quoteBy: "— واحد من فريق زولا ثينك",
  proofCopy:
    "فرق التجربة قالت انهم حسوا بجد انهم الشخصيات اللي المهمة بتتكلم عنهم. وده بالظبط اللي بنسعى له.",
  closingEyebrow: "المهمة الجاية بتبدأ منك",
  closingTitle: "متتعلمش الاداة<br>وبس. اتعلم تعمل<br><em>بيها ايه.</em>",
  closingCopy: "لعقول فضولية، واسئلة جريئة، وافكار جاهزة تطلع من الورقة.",
  closingMeta: "من 10 لـ16 سنة &nbsp; · &nbsp; لايف اونلاين في تيمات صغيرة",
  footerTag: "فكر. قرر. ابني. قدم. راجع.",
  footerMeta: "© 2026 زولا ثينك · اسكندرية، مصر",
};
const en = {};
document
  .querySelectorAll("[data-i]")
  .forEach((e) => (en[e.dataset.i] = e.innerHTML));
let isArabic = false;
const sw = document.querySelector(".lang-switch");
function setLang() {
  document.documentElement.lang = isArabic ? "ar" : "en";
  document.documentElement.dir = isArabic ? "rtl" : "ltr";
  document
    .querySelectorAll("[data-i]")
    .forEach(
      (e) =>
        (e.innerHTML = (isArabic ? ar : en)[e.dataset.i] || en[e.dataset.i]),
    );
  sw.setAttribute("aria-pressed", isArabic);
  sw.setAttribute(
    "aria-label",
    isArabic ? "التبديل للانجليزي" : "Switch to Arabic",
  );
}
sw.addEventListener("click", () => {
  isArabic = !isArabic;
  setLang();
});
const missionCards = [...document.querySelectorAll(".mission-card")];
let activeMissionIndex = Math.max(
  0,
  missionCards.findIndex((card) => card.classList.contains("is-active")),
);

function setActiveMission(index) {
  if (!missionCards.length) return;

  activeMissionIndex = (index + missionCards.length) % missionCards.length;
  missionCards.forEach((card, cardIndex) => {
    const isActive = cardIndex === activeMissionIndex;
    card.classList.toggle("is-active", isActive);
    card.setAttribute("aria-current", isActive ? "true" : "false");
    card.style.zIndex = isActive
      ? "8"
      : String(missionCards.length - cardIndex);
  });
}

function handleMissionActivation(card) {
  const clickedIndex = missionCards.indexOf(card);
  if (clickedIndex < 0) return;

  setActiveMission(
    clickedIndex === activeMissionIndex ? clickedIndex + 1 : clickedIndex,
  );
}

missionCards.forEach((card) => {
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.addEventListener("click", () => handleMissionActivation(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleMissionActivation(card);
    }
  });
});

setActiveMission(activeMissionIndex);
document
  .querySelector("footer")
  .insertAdjacentHTML(
    "beforeend",
    '<div class="socials"><a href="https://www.facebook.com/zolathink" target="_blank" rel="noopener" aria-label="Zola Think on Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9c0-.6.4-1 1-1Z"/></svg></a><a href="https://www.linkedin.com/company/zolathink" target="_blank" rel="noopener" aria-label="Zola Think on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8H2v14h4V8Zm.4-4A2.4 2.4 0 1 1 1.6 4a2.4 2.4 0 0 1 4.8 0ZM22 22h-4v-6.8c0-4-5-3.7-5 0V22H9V8h4v1.9c1.9-3.5 9-3.8 9 3.4V22Z"/></svg></a></div>',
  );
const style = document.createElement("style");
style.textContent = `:root{--ink:#19203A;--v:#372D75;--lime:#834CBF;--muted:#372D75}.nav-cta,.primary-cta{background:linear-gradient(100deg,#372D75,#834CBF)!important}.hero-blob{background:linear-gradient(140deg,#834CBF,#372D75)}.hero-line,.intro-squiggle,.role-line,.journey-path,.closing-squiggle{stroke:#834CBF}.hero-arrow,.dot--lime,.card-scribble,.role-card--front i,.chip-two{color:#834CBF;background-color:#834CBF}.dot--lime{background:#834CBF}.proof-numbers>i{background:#834CBF}.mission-card p,.lede,.section-copy,.proof-detail{line-height:1.75}.section-shell p+ p{margin-top:1.25rem}.socials{display:flex;gap:12px}.socials a{width:39px;height:39px;display:grid;place-items:center;border:1px solid #372D75;border-radius:50%;color:#372D75;transition:.2s}.socials a:hover{color:#fff;background:#834CBF;border-color:#834CBF}.socials svg{width:17px;height:17px;fill:currentColor}html[dir=rtl] .lede,html[dir=rtl] .section-copy,html[dir=rtl] .mission-card p,html[dir=rtl] .proof-detail,html[dir=rtl] .hero-card p{line-height:2.05}html[dir=rtl] .section-shell{padding-block:165px}@media(max-width:1024px){.hero{padding-inline:28px}.hero-nav nav{gap:25px;margin-inline-end:27px}.hero-stage{height:590px}.hero-card{width:min(820px,88vw)}.section-shell{padding-block:120px}.mission-deck{max-width:660px}.orbit-note--left{left:0}.orbit-note--right{right:0}}@media(max-width:760px){body{overflow-x:hidden}.hero{padding-inline:16px}.hero-stage{width:100%;height:505px}.hero-card{width:calc(100vw - 32px);padding-inline:16px}.hero-card p br{display:none}.hero-card h1{font-size:clamp(42px,11.8vw,64px)}.hero-blob--right{right:-48px}.hero-blob--left{left:-48px}.section-shell{width:calc(100% - 32px);padding-block:88px}.section-shell h2{line-height:1.05}.mission-deck{width:100%;height:440px}.mission-card{padding:22px}.mission-card p{max-width:62%;line-height:1.7}.role-stage{width:115%;margin-left:-7.5%;transform:scale(.76);transform-origin:center}.journey-paper{width:100%;min-height:650px}.journey-paper ol{padding-inline:14px}.journey-paper li{width:61%}.proof-numbers{gap:11px}.proof-numbers strong{font-size:33px}.closing-card{padding-inline:16px}html[dir=rtl] .section-shell{padding-block:105px}html[dir=rtl] .role-stage{margin-right:-7.5%;margin-left:0}}`;
style.remove();
function loadGSAP(src, done) {
  const s = document.createElement("script");
  s.src = src;
  s.onload = done;
  document.head.appendChild(s);
}
loadGSAP("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js", () =>
  loadGSAP(
    "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",
    () => {
      gsap.registerPlugin(ScrollTrigger);
      gsap.from(".hero-card", {
        y: 34,
        rotate: -2,
        duration: 1.1,
        ease: "power3.out",
      });
      gsap.to(".hero-blob", {
        y: 16,
        rotate: "+=8",
        duration: 2.5,
        yoyo: true,
        repeat: -1,
        stagger: 0.25,
        ease: "sine.inOut",
      });
      gsap.utils.toArray(".section-shell").forEach((s) =>
        gsap.from(s.children, {
          y: 28,
          opacity: 0,
          stagger: 0.08,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: s, start: "top 82%", once: true },
        }),
      );
      gsap.utils
        .toArray(".hero-line,.intro-squiggle,.role-line,.closing-squiggle")
        .forEach((p) => {
          const l = p.getTotalLength?.() || 0;
          if (l) {
            gsap.set(p, { strokeDasharray: l, strokeDashoffset: l });
            gsap.to(p, {
              strokeDashoffset: 0,
              duration: 1.2,
              ease: "power2.out",
              scrollTrigger: { trigger: p, start: "top 90%", once: true },
            });
          }
        });
    },
  ),
);
