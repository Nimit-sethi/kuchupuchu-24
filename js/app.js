const music = document.getElementById('bgMusic');
const overlay = document.getElementById('overlay');
const stages = Array.from(document.querySelectorAll('.stage'));
const cakeContainer = document.getElementById('cakeContainer');
const cakeNextBtn = document.getElementById('cakeNextBtn');
const bookletNextBtn = document.getElementById('bookletNextBtn');
const surpriseNextBtn = document.getElementById('surpriseNextBtn');
const stickerNextBtn = document.getElementById('stickerNextBtn');
const sketchNextBtn = document.getElementById('sketchNextBtn');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const introStickerWrap = document.getElementById('introStickerWrap');
const introQuestion = document.getElementById('introQuestion');
const introActions = document.getElementById('introActions');
const introFx = document.getElementById('introFx');

const traits = [
  'Strong', 'Clever', 'Beautiful', 'Loyal', 'Dramatic', 'Passionate',
  'Hot', 'Playful', 'Ambitious', 'Funny', 'Brave', 'Talkative'
];
const typewriterSelector = [
  'h1', 'h2', 'h3', 'p', 'li', '.eyebrow', '.stage-copy', '.cake-hint',
  '.hero-stats span', '.hero-stats strong', '.booklet-card li',
  '.video-card strong', '.video-card p', '.sticker', '.painting-copy p',
  '.primary-btn'
].join(',');

let cakeUnlocked = false;
let cakeCelebrated = false;
let cakeInitialized = false;
let audioContext;
let isDraggingKnife = false;
let dragStart = null;
let dragCurrent = null;
let cutTrail = null;
let cutComplete = false;
let cutProgress = 0;
let cakeAssembly = null;
let cakeCutSlot = null;
let cakeKnife = null;
let candleBlown = false;
let blowMicStream = null;
let blowAnalyser = null;
let blowMonitorFrame = null;
let blowStreak = 0;
let cakeMicBtn = null;
let cakeBlowStatus = null;
let candleFlame = null;
const CAKE_IMAGE_SRC = 'assets/cake.png';

let noButtonGone = false;
let noButtonClicks = 0;
let noButtonAnimating = false;
const NO_BUTTON_MAX_CLICKS = 5;
const BACKGROUND_LANES = ['left', 'center', 'right'];

yesBtn.onclick = () => {
  overlay.classList.add('is-hidden');
  overlay.setAttribute('hidden', '');
  document.body.classList.remove('intro-active');
  unlockAudio();
  window.SiteAudio?.startBgm?.();
  showStage(0);
  seedMainBackground();
  setTimeout(initializeCake, 120);
};

noBtn.onclick = async (event) => {
  event.preventDefault();
  if (noButtonGone || noButtonAnimating) return;

  noButtonAnimating = true;
  noButtonClicks += 1;

  if (noButtonClicks >= NO_BUTTON_MAX_CLICKS) {
    await vanishNoButton(noBtn);
    noButtonGone = true;
  } else {
    await danceNoButtonOnce(noBtn);
  }

  noButtonAnimating = false;
};

cakeNextBtn.onclick = () => {
  if (!cakeUnlocked) return;
  window.SiteAudio?.stopStingAndResumeBgm?.();
  showStage(1);
};
bookletNextBtn.onclick = () => {
  window.SiteAudio?.stopStingAndResumeBgm?.();
  showStage(2);
};
if (surpriseNextBtn) {
  surpriseNextBtn.onclick = () => {
    window.SiteAudio?.stopStingAndResumeBgm?.();
    showStage(3);
  };
}
stickerNextBtn.onclick = () => {
  window.SiteAudio?.stopStingAndResumeBgm?.();
  showStage(4);
};
if (sketchNextBtn) {
  sketchNextBtn.onclick = () => {
    window.SiteAudio?.stopStingAndResumeBgm?.();
    showStage(5);
  };
}

function isDebugMode() {
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

function instantRevealElement(element) {
  if (!element) return;
  const text = element.dataset.typewriterText || element.textContent.trim();
  if (text) {
    element.dataset.typewriterText = text;
    element.textContent = text;
  }
  element.classList.remove('typing-pending');
  element.classList.add('typing-done');
}

function instantRevealContainer(container) {
  if (!container) return;
  container.querySelectorAll('.stage-pop-block').forEach((block) => block.classList.add('is-revealed'));
  getTypewriterItems(container).forEach((element) => instantRevealElement(element));
}

function emitDebugEvent(name) {
  window.dispatchEvent(new CustomEvent(name));
}

function showStage(index, options = {}) {
  const prevIndex = stages.findIndex((stage) => stage.classList.contains('active'));
  if (prevIndex >= 0 && prevIndex !== index) {
    window.SiteAudio?.stopStingAndResumeBgm?.();
    window.BirthdayReel?.stopReel?.();
    if (stages[prevIndex]?.querySelector('#surpriseStage')) {
      window.BirthdaySurprise?.resetSurpriseStage?.(stages[prevIndex]);
    }
    if (stages[prevIndex]?.querySelector('#photoWall')) {
      window.BirthdayPhotoWall?.resetPhotoWall?.(stages[prevIndex]);
    }
    if (stages[prevIndex]?.querySelector('#sketchStage')) {
      window.BirthdaySketch?.resetSketchStage?.(stages[prevIndex]);
    }
    if (stages[prevIndex]?.querySelector('#wishesPage')) {
      window.BirthdayWishes?.resetWishesStage?.(stages[prevIndex]);
    }
    if (stages[prevIndex]?.querySelector('#cakeContainer')) {
      stopBlowMonitor();
    }
  }
  const fastDebug = options.debug || isDebugMode();
  stages.forEach((stage, i) => stage.classList.toggle('active', i === index));
  const stage = stages[index];

  if (fastDebug) {
    if (stage?.querySelector('#photoWall')) {
      runPhotoWallStage(stage);
    } else if (stage?.querySelector('#surpriseStage')) {
      window.BirthdaySurprise?.runSurpriseStage?.(stage);
    } else if (stage?.querySelector('#sketchStage')) {
      window.BirthdaySketch?.runSketchStage?.(stage);
    } else if (stage?.querySelector('#wishesPage')) {
      window.BirthdayWishes?.runWishesStage?.(stage, {
        jumpToSecret: Boolean(options.wishesSecret)
      });
    } else {
      instantRevealContainer(stage);
      if (stage?.querySelector('#flipbook')) {
        initFlipbook(stage);
        instantRevealContainer(stage.querySelector('#flipbook'));
      } else if (stage?.querySelector('#cakeContainer')) {
        initializeCake();
        resetCakeCutState();
        cakeUnlocked = false;
        if (cakeNextBtn) {
          cakeNextBtn.disabled = true;
          cakeNextBtn.classList.add('disabled');
        }
      }
    }
    emitDebugEvent('birthday:stagechange');
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  if (stage?.querySelector('#flipbook')) {
    runBookletStage(stage);
  } else if (stage?.querySelector('#cakeContainer')) {
    runStage1Sequence(stage);
  } else if (stage?.querySelector('#surpriseStage')) {
    window.BirthdaySurprise?.runSurpriseStage?.(stage);
  } else if (stage?.querySelector('#photoWall')) {
    runPhotoWallStage(stage);
  } else if (stage?.querySelector('#sketchStage')) {
    window.BirthdaySketch?.runSketchStage?.(stage);
  } else if (stage?.querySelector('#wishesPage')) {
    window.BirthdayWishes?.runWishesStage?.(stage);
  } else {
    typeContainer(stage);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getTypewriterItems(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(typewriterSelector))
    .filter((element) => shouldTypeElement(element));
}

async function typeStageSection(section, { excludePopBlocks = false } = {}) {
  const items = getTypewriterItems(section).filter((element) => (
    !excludePopBlocks || !element.closest('.stage-pop-block')
  ));
  items.forEach((element) => prepareIntroElement(element));

  for (const element of items) {
    await typeElement(element, element.dataset.typewriterText, true);
    await delay(320);
  }
}

async function revealBlockAndType(block, popDelay = 500) {
  block.classList.add('is-revealed');
  playPopSound();
  await delay(popDelay);

  const items = getTypewriterItems(block);
  for (const element of items) {
    await typeElement(element, element.dataset.typewriterText, true);
    await delay(200);
  }
  await delay(240);
}

async function runStage1Sequence(stage) {
  const intro = stage.querySelector('.stage-intro');
  const statBlocks = Array.from(stage.querySelectorAll('.hero-stats .stage-pop-block'));
  const cakeStage = stage.querySelector('.cake-stage');

  [...statBlocks, cakeStage].filter(Boolean).forEach((block) => {
    block.classList.remove('is-revealed');
    getTypewriterItems(block).forEach((element) => prepareIntroElement(element));
  });

  await typeStageSection(intro, { excludePopBlocks: true });

  for (const block of statBlocks) {
    await revealBlockAndType(block, 480);
  }

  if (cakeStage) {
    await revealBlockAndType(cakeStage, 520);
  }
}

const flipbookState = {
  pages: [],
  index: 0,
  open: false,
  flipping: false,
  initialized: false
};

const PAGE_DOODLES = ['🌸', '🧸', '💕', '✨', '🎀', '🌷', '💗', '🤧'];

function getEndpaperHtml() {
  return `<div class="book-endpaper"><img src="assets/birthday-sticker.png" class="book-endpaper-bear" alt=""><p>For my favorite girl 🤧</p></div>`;
}

function decoratePageHtml(html, pageIndex) {
  const doodle = PAGE_DOODLES[pageIndex % PAGE_DOODLES.length];
  return `
    <span class="book-washi book-washi-tl" aria-hidden="true"></span>
    <span class="book-washi book-washi-br" aria-hidden="true"></span>
    <div class="book-page-inner">
      <div class="book-page-content">${html}</div>
      <div class="book-page-art">
        <img src="assets/birthday-sticker.png" class="book-sticker-mini" alt="">
        <span class="book-doodle" aria-hidden="true">${doodle}</span>
      </div>
    </div>
  `;
}

function fitBookPageContent(pageEl) {
  const content = pageEl?.querySelector('.book-page-content');
  if (!content) return;

  const isFinal = pageEl.classList.contains('booklet-final');
  const minFit = isFinal ? 0.9 : 0.72;
  const maxFit = isFinal ? 1.38 : 1.14;
  const startFit = isFinal ? 1.24 : 1;

  content.style.setProperty('--page-fit', String(startFit));

  const fit = () => {
    let scale = startFit;
    const step = 0.025;

    while (content.scrollHeight > content.clientHeight + 2 && scale > minFit) {
      scale = Math.max(minFit, scale - step);
      content.style.setProperty('--page-fit', scale.toFixed(3));
    }

    while (content.scrollHeight < content.clientHeight * 0.78 && scale < maxFit) {
      const next = scale + step;
      content.style.setProperty('--page-fit', next.toFixed(3));
      if (content.scrollHeight > content.clientHeight + 2) {
        content.style.setProperty('--page-fit', scale.toFixed(3));
        break;
      }
      scale = next;
    }
  };

  requestAnimationFrame(() => requestAnimationFrame(fit));
}

function fitVisibleFlipbookPages(stage) {
  if (!stage) return;
  const pageEls = stage.querySelectorAll('.flipbook-page-left, .flipbook-under, .flipbook-face-front');
  pageEls.forEach((pageEl) => fitBookPageContent(pageEl));
}

function initFlipbook(stage) {
  const sourcePages = Array.from(stage.querySelectorAll('.flipbook-pages-source .book-page'));
  flipbookState.pages = sourcePages.map((page) => ({
    html: page.innerHTML,
    className: page.className.replace('book-page', '').trim()
  }));
  flipbookState.index = 0;
  flipbookState.open = false;
  flipbookState.flipping = false;

  const cover = stage.querySelector('#flipbookCover');
  const object = stage.querySelector('#flipbookObject');
  const openWrap = stage.querySelector('#flipbookOpen');
  const sheet = stage.querySelector('#flipbookSheet');
  const faceFront = stage.querySelector('#flipbookFaceFront');
  const faceBack = stage.querySelector('#flipbookFaceBack');
  const under = stage.querySelector('#flipbookUnder');
  const leftPage = stage.querySelector('#flipbookLeft');
  const help = stage.querySelector('#flipbookHelp');
  const counter = stage.querySelector('#flipbookCounter');
  const prevBtn = stage.querySelector('#bookPrevBtn');
  const forwardBtn = stage.querySelector('#bookForwardBtn');
  const nextStageBtn = stage.querySelector('#bookletNextBtn') || document.getElementById('bookletNextBtn');

  if (!cover || !object || !sheet || !faceFront || !faceBack || !under || !leftPage) return;

  const setLeftPage = (page, pageIndex) => {
    if (pageIndex <= 0) {
      leftPage.innerHTML = getEndpaperHtml();
      leftPage.className = 'flipbook-page flipbook-page-left booklet-theme-endpaper';
      return;
    }
    leftPage.innerHTML = decoratePageHtml(page.html, pageIndex - 1);
    leftPage.className = `flipbook-page flipbook-page-left book-page ${page.className}`.trim();
  };

  const setFacePage = (el, page, pageIndex, extraClass = '') => {
    if (!page) {
      el.innerHTML = getEndpaperHtml();
      el.className = `flipbook-face ${extraClass} booklet-theme-endpaper`.trim();
      return;
    }
    el.innerHTML = decoratePageHtml(page.html, pageIndex);
    el.className = `flipbook-face ${extraClass} book-page ${page.className}`.trim();
  };

  openWrap.hidden = false;
  openWrap.removeAttribute('hidden');
  object.classList.remove('is-open');
  sheet.classList.remove('is-flipping-forward', 'is-flipping-back');
  sheet.style.transform = '';
  if (nextStageBtn) {
    nextStageBtn.hidden = true;
    nextStageBtn.disabled = true;
    nextStageBtn.classList.remove('is-revealed');
  }

  const updateNextStageBtn = (pageIndex) => {
    if (!nextStageBtn) return;
    const pageNum = pageIndex + 1;
    const onPageNine = pageNum === flipbookState.pages.length;
    nextStageBtn.hidden = !onPageNine;
    nextStageBtn.disabled = !onPageNine;
    nextStageBtn.classList.toggle('is-revealed', onPageNine);
  };

  const renderOpenPage = () => {
    const i = flipbookState.index;
    const current = flipbookState.pages[i];
    const prev = flipbookState.pages[i - 1];
    const next = flipbookState.pages[i + 1];

    setLeftPage(prev, i);
    setFacePage(faceFront, current, i, 'flipbook-face-front');
    faceBack.innerHTML = '';
    faceBack.className = 'flipbook-face flipbook-face-back page-paper-back';

    if (next) {
      under.innerHTML = decoratePageHtml(next.html, i + 1);
      under.className = `flipbook-under book-page ${next.className}`.trim();
    } else {
      under.innerHTML = getEndpaperHtml();
      under.className = 'flipbook-under booklet-theme-endpaper';
    }

    counter.textContent = `Page ${i + 1} / ${flipbookState.pages.length}`;
    prevBtn.disabled = i <= 0;
    forwardBtn.disabled = i >= flipbookState.pages.length - 1;
    help.textContent = i >= flipbookState.pages.length - 1
      ? 'You reached the last page 🤧'
      : 'Click the page or › to turn →';
    updateNextStageBtn(i);
    emitDebugEvent('birthday:flipbookchange');
    fitVisibleFlipbookPages(stage);
  };

  const openBook = async () => {
    if (flipbookState.open || flipbookState.flipping) return;
    flipbookState.flipping = true;
    playPopSound();
    object.classList.add('is-open');
    flipbookState.open = true;
    help.textContent = 'Click the page or › to turn →';
    await delay(780);
    renderOpenPage();
    forwardBtn.disabled = flipbookState.pages.length <= 1;
    flipbookState.flipping = false;
  };

  const turnPage = async (direction) => {
    if (!flipbookState.open || flipbookState.flipping) return;
    const nextIndex = flipbookState.index + direction;
    if (nextIndex < 0 || nextIndex >= flipbookState.pages.length) return;

    flipbookState.flipping = true;
    playPopSound();

    if (direction > 0) {
      sheet.classList.add('is-flipping-forward');
      await delay(960);
      flipbookState.index = nextIndex;
      sheet.classList.remove('is-flipping-forward');
      sheet.style.transform = '';
      renderOpenPage();
    } else {
      flipbookState.index = nextIndex;
      renderOpenPage();
      sheet.classList.remove('is-flipping-forward');
      sheet.style.transition = 'none';
      sheet.style.transform = 'rotateY(-178deg)';
      void sheet.offsetWidth;
      sheet.style.transition = '';
      requestAnimationFrame(() => {
        sheet.style.transform = 'rotateY(0deg)';
      });
      await delay(960);
      sheet.style.transform = '';
    }

    await delay(60);
    flipbookState.flipping = false;
  };

  cover.onclick = openBook;
  sheet.onclick = () => {
    if (flipbookState.index < flipbookState.pages.length - 1) turnPage(1);
  };
  forwardBtn.onclick = () => turnPage(1);
  prevBtn.onclick = () => turnPage(-1);
  renderOpenPage();
  help.textContent = 'Click the cover to open your book 🤧';
  counter.textContent = 'Cover';
  prevBtn.disabled = true;
  forwardBtn.disabled = true;
  flipbookState.initialized = true;

  flipbookState.openBook = () => {
    if (flipbookState.open) return;
    object.classList.add('is-open');
    flipbookState.open = true;
    renderOpenPage();
    if (forwardBtn) forwardBtn.disabled = flipbookState.pages.length <= 1;
  };

  flipbookState.jumpToPage = (pageIndex) => {
    const nextIndex = Math.max(0, Math.min(pageIndex, flipbookState.pages.length - 1));
    flipbookState.openBook();
    flipbookState.index = nextIndex;
    sheet.classList.remove('is-flipping-forward');
    sheet.style.transform = '';
    renderOpenPage();
  };
}

async function runPhotoWallStage(stage) {
  const intro = stage.querySelector('.stage-intro');
  const wallWrap = stage.querySelector('#photoWall');
  const nextBtn = stage.querySelector('#stickerNextBtn');

  window.BirthdayPhotoWall?.preparePhotoWall(stage);
  if (nextBtn) nextBtn.classList.remove('is-revealed');

  await typeStageSection(intro, { excludePopBlocks: true });

  if (!wallWrap) return;

  wallWrap.classList.add('is-visible');
  playPopSound();
  await delay(480);
  await window.BirthdayPhotoWall?.buildPhotoWallSequence(stage);
}

async function runBookletStage(stage) {
  const intro = stage.querySelector('.stage-intro');
  const flipbook = stage.querySelector('#flipbook');
  const nextBtn = stage.querySelector('#bookletNextBtn');

  if (flipbook) flipbook.classList.remove('is-revealed');
  if (nextBtn) {
    nextBtn.hidden = true;
    nextBtn.disabled = true;
  }

  initFlipbook(stage);
  await typeStageSection(intro, { excludePopBlocks: true });

  if (flipbook) {
    await revealBlockAndType(flipbook, 520);
  }
}

if (!isDebugMode()) {
  runIntroSequence().catch((error) => {
    console.error('Intro sequence failed:', error);
    if (introActions) introActions.classList.add('is-visible');
  });
}

function getActiveStageIndex() {
  return stages.findIndex((stage) => stage.classList.contains('active'));
}

function getFlipbookPageNumber() {
  return flipbookState.index + 1;
}

function openFlipbookAtPage(pageNumber) {
  showStage(1, { debug: true });
  const pageIndex = Math.max(0, Math.min(pageNumber - 1, flipbookState.pages.length - 1));
  if (typeof flipbookState.jumpToPage === 'function') {
    flipbookState.jumpToPage(pageIndex);
  }
}

function bootstrapDebug(params = new URLSearchParams(window.location.search)) {
  overlay.classList.add('is-hidden');
  overlay.setAttribute('hidden', '');
  document.body.classList.remove('intro-active');
  unlockAudio();
  window.SiteAudio?.bindGestureUnlock?.();
  window.SiteAudio?.startBgm?.();
  seedMainBackground();

  const stageIndex = Math.max(0, Math.min(Number(params.get('stage') || 1), stages.length - 1));
  const wishesSecret = params.get('secret') === '1';
  showStage(stageIndex, { debug: true, wishesSecret });

  const pageParam = params.get('page');
  if (stageIndex === 1 && pageParam) {
    openFlipbookAtPage(Number(pageParam));
  } else if (stageIndex === 1 && params.get('book') === '1') {
    flipbookState.openBook?.();
  }
}

window.BirthdayApp = {
  isDebugMode,
  showStage,
  bootstrapDebug,
  openFlipbookAtPage,
  getActiveStageIndex,
  getFlipbookPageNumber,
  flipbookState
};

async function runIntroSequence() {
  const heading = overlay.querySelector('h1');
  const lead = overlay.querySelector('.intro-lead');

  prepareIntroElement(heading);
  prepareIntroElement(lead);
  prepareIntroElement(introQuestion);
  introActions.classList.remove('is-visible');

  await typeElement(heading, heading.dataset.typewriterText, true);
  await delay(320);
  await typeElement(lead, lead.dataset.typewriterText, true);
  await delay(260);
  await popIntroSticker();
  await typeElement(introQuestion, introQuestion.dataset.typewriterText, true);
  await delay(280);
  introActions.classList.add('is-visible');
}

function prepareIntroElement(element) {
  if (!element) return;
  const text = element.dataset.typewriterText || element.textContent.trim();
  element.dataset.typewriterText = text;
  element.textContent = '';
  element.classList.add('typing-pending');
}

async function popIntroSticker() {
  if (!introStickerWrap) return;

  introStickerWrap.classList.add('is-visible', 'is-pop');
  introStickerWrap.setAttribute('aria-hidden', 'false');
  burstIntroConfetti(introStickerWrap);
  playYaySound();

  await delay(760);
  introStickerWrap.classList.remove('is-pop');
  introStickerWrap.classList.add('is-dance');
  launchConfetti();
}

async function danceNoButtonOnce(button) {
  button.classList.add('is-dancing');
  const moves = generateNoButtonMoves(3 + Math.floor(Math.random() * 3));

  for (const move of moves) {
    button.style.transform = `translate(${move.x}px, ${move.y}px) rotate(${move.r}deg) scale(1.04)`;
    await delay(145);
  }

  button.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
  await delay(90);
  button.classList.remove('is-dancing');
}

async function vanishNoButton(button) {
  button.classList.add('is-dancing');
  const moves = generateNoButtonMoves(6);

  for (const move of moves) {
    button.style.transform = `translate(${move.x}px, ${move.y}px) rotate(${move.r}deg) scale(1.06)`;
    await delay(125);
  }

  button.style.transform = 'translate(120px, -70px) rotate(32deg) scale(0.15)';
  button.style.opacity = '0';
  await delay(380);
  button.style.display = 'none';
  introActions.classList.add('only-yes');
}

function generateNoButtonMoves(count) {
  const moves = [];
  for (let i = 0; i < count; i += 1) {
    moves.push({
      x: Math.round(Math.random() * 180 - 90),
      y: Math.round(Math.random() * 110 - 55),
      r: Math.round(Math.random() * 44 - 22)
    });
  }
  return moves;
}

function seedIntroBackground() {
  for (let i = 0; i < 15; i += 1) {
    const lane = BACKGROUND_LANES[i % BACKGROUND_LANES.length];
    setTimeout(
      () => spawnBalloon(traits[i % traits.length], 10 + Math.random() * 6, true, lane),
      i * 170
    );
  }
  for (let i = 0; i < 24; i += 1) {
    const lane = BACKGROUND_LANES[i % BACKGROUND_LANES.length];
    setTimeout(() => spawnSparkle(true, lane), i * 100);
  }
}

function seedMainBackground() {
  for (let i = 0; i < 15; i += 1) {
    const lane = BACKGROUND_LANES[i % BACKGROUND_LANES.length];
    setTimeout(
      () => spawnBalloon(traits[i % traits.length], 11 + Math.random() * 7, false, lane),
      i * 150
    );
  }
  for (let i = 0; i < 27; i += 1) {
    const lane = BACKGROUND_LANES[i % BACKGROUND_LANES.length];
    setTimeout(() => spawnSparkle(false, lane), i * 90);
  }
}

function isIntroActive() {
  return document.body.classList.contains('intro-active');
}

function pickLane(preferredLane) {
  if (BACKGROUND_LANES.includes(preferredLane)) return preferredLane;
  return BACKGROUND_LANES[Math.floor(Math.random() * BACKGROUND_LANES.length)];
}

function randomLanePosition(lane = pickLane()) {
  if (lane === 'left') return 1 + Math.random() * 18;
  if (lane === 'center') return 36 + Math.random() * 28;
  return 81 + Math.random() * 16;
}

function laneDrift(lane) {
  if (lane === 'left') return `${-18 - Math.random() * 55}px`;
  if (lane === 'right') return `${18 + Math.random() * 55}px`;
  return `${Math.random() * 90 - 45}px`;
}

function burstIntroConfetti(originEl) {
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ['#ff5cab', '#ffd166', '#8be9fd', '#b892ff', '#ffffff', '#ff8fab'];

  for (let i = 0; i < 90; i++) {
    const confetti = document.createElement('div');
    const angle = (Math.PI * 2 * i) / 90 + Math.random() * 0.35;
    const distance = 70 + Math.random() * 180;
    confetti.className = 'confetti-piece confetti-burst';
    confetti.style.left = `${cx}px`;
    confetti.style.top = `${cy}px`;
    confetti.style.setProperty('--bx', `${Math.cos(angle) * distance}px`);
    confetti.style.setProperty('--by', `${Math.sin(angle) * distance}px`);
    confetti.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = `${0.9 + Math.random() * 0.7}s`;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 1800);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function typeContainer(container) {
  if (!container) return Promise.resolve();

  const items = Array.from(container.querySelectorAll(typewriterSelector))
    .filter((element) => shouldTypeElement(element));

  items.forEach((element) => {
    const text = element.dataset.typewriterText || element.textContent.trim();
    element.dataset.typewriterText = text;
    element.textContent = '';
    element.classList.add('typing-pending');
  });

  return items.reduce(
    (chain, element) => chain
      .then(() => {
        element.classList.remove('typing-pending');
        return typeElement(element);
      })
      .then(() => delay(320)),
    Promise.resolve()
  );
}

function shouldTypeElement(element) {
  if (!element || element.closest('.cake-zone') || element.closest('.intro-sticker-wrap') || element.closest('.intro-actions') || element.closest('#surpriseStage') || element.closest('#wishesPage') || element.closest('#sketchStage')) {
    return false;
  }
  const text = element.dataset.typewriterText || element.textContent.trim();
  return text.length > 0;
}

function typeElement(element, replacementText, reveal = false) {
  const text = replacementText ?? element.dataset.typewriterText ?? element.textContent.trim();
  if (!text) return Promise.resolve();

  if (reveal) element.classList.remove('typing-pending');

  if (element.dataset.typewriterTimer) {
    clearTimeout(Number(element.dataset.typewriterTimer));
  }

  element.dataset.typewriterText = text;
  element.textContent = '';
  element.classList.add('typing-active');

  const characters = Array.from(text);
  let index = 0;

  return new Promise((resolve) => {
    const tick = () => {
      element.textContent += characters[index] || '';
      index += 1;

      if (index < characters.length) {
        const pause = /[.,!?…]/.test(characters[index - 1]) ? 70 : 16;
        element.dataset.typewriterTimer = String(setTimeout(tick, pause));
      } else {
        element.classList.remove('typing-active');
        delete element.dataset.typewriterTimer;
        resolve();
      }
    };

    element.dataset.typewriterTimer = String(setTimeout(tick, 20));
  });
}

Object.assign(window.BirthdayApp, { typeElement, delay });

function stopBlowMonitor() {
  if (blowMonitorFrame) {
    cancelAnimationFrame(blowMonitorFrame);
    blowMonitorFrame = null;
  }
  blowMicStream?.getTracks().forEach((track) => track.stop());
  blowMicStream = null;
  blowAnalyser = null;
}

async function startBlowMonitor() {
  if (candleBlown || blowMicStream) return;
  unlockAudio();

  if (cakeBlowStatus) {
    cakeBlowStatus.textContent = 'Mic on — blow toward your device to put out the candle 🎤';
  }

  try {
    blowMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
  } catch {
    if (cakeBlowStatus) {
      cakeBlowStatus.textContent = 'Mic blocked — tap below to blow the candle instead 🤧';
    }
    if (cakeMicBtn) {
      cakeMicBtn.hidden = false;
      cakeMicBtn.textContent = 'Tap to blow 🕯️';
      cakeMicBtn.onclick = () => extinguishCandle();
    }
    return;
  }

  const audioContextForMic = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  if (audioContextForMic.state === 'suspended') await audioContextForMic.resume();

  const source = audioContextForMic.createMediaStreamSource(blowMicStream);
  blowAnalyser = audioContextForMic.createAnalyser();
  blowAnalyser.fftSize = 2048;
  blowAnalyser.smoothingTimeConstant = 0.35;
  source.connect(blowAnalyser);

  if (cakeMicBtn) {
    cakeMicBtn.hidden = true;
  }
  if (cakeBlowStatus) {
    cakeBlowStatus.textContent = 'Listening… blow now 💨';
  }

  const timeData = new Uint8Array(blowAnalyser.fftSize);
  const freqData = new Uint8Array(blowAnalyser.frequencyBinCount);
  let baseline = 0.02;
  let baselineSamples = 0;

  const monitor = () => {
    if (!blowAnalyser || candleBlown) return;

    blowAnalyser.getByteTimeDomainData(timeData);
    blowAnalyser.getByteFrequencyData(freqData);

    let sum = 0;
    for (let i = 0; i < timeData.length; i += 1) {
      const sample = (timeData[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / timeData.length);

    let lowBand = 0;
    for (let i = 2; i < 24; i += 1) lowBand += freqData[i];
    lowBand /= 22;

    if (baselineSamples < 40) {
      baseline = baseline * 0.92 + rms * 0.08;
      baselineSamples += 1;
    }

    const loudEnough = rms > Math.max(0.11, baseline * 2.8);
    const windyEnough = lowBand > 18;
    if (loudEnough && windyEnough) blowStreak += 1;
    else blowStreak = Math.max(0, blowStreak - 1);

    if (blowStreak >= 7) {
      extinguishCandle();
      return;
    }

    blowMonitorFrame = requestAnimationFrame(monitor);
  };

  blowMonitorFrame = requestAnimationFrame(monitor);
}

function extinguishCandle() {
  if (candleBlown) return;
  candleBlown = true;
  stopBlowMonitor();

  candleFlame?.classList.add('is-out');
  cakeContainer?.querySelector('.candle-smoke')?.classList.add('is-active');

  if (cakeMicBtn) {
    cakeMicBtn.hidden = true;
  }
  if (cakeBlowStatus) {
    cakeBlowStatus.textContent = 'Candle blown! Ab knife se cake cut karo 🔪';
  }

  cakeContainer?.classList.remove('awaiting-blow');
  cakeContainer?.classList.add('is-ready-cut');

  const hint = document.querySelector('.cake-hint');
  if (hint) typeElement(hint, 'Ab knife se ek smooth cut maaro across the cake, Cutieeeeeeeee😙');

  playTone(420, 0.08, 'sine', 0.04);
  playTone(280, 0.12, 'sine', 0.03, 0.04);
}

function resetCakeCutState() {
  cutComplete = false;
  cutProgress = 0;
  cakeCelebrated = false;
  isDraggingKnife = false;
  dragStart = null;
  dragCurrent = null;
  cutTrail?.remove();
  cutTrail = null;
  stopBlowMonitor();
  candleBlown = false;
  blowStreak = 0;

  if (cakeContainer) {
    cakeContainer.classList.add('awaiting-blow');
    cakeContainer.classList.remove('is-ready-cut');
  }

  if (cakeAssembly) {
    cakeAssembly.classList.remove('is-cut');
    cakeAssembly.style.setProperty('--cut-progress', '0');
  }
  if (cakeCutSlot) {
    cakeCutSlot.style.opacity = '0';
    cakeCutSlot.style.transform = 'translateX(-50%) scaleY(0.2)';
  }
  if (candleFlame) {
    candleFlame.classList.remove('is-out');
  }
  cakeContainer?.querySelector('.candle-smoke')?.classList.remove('is-active');
  if (cakeMicBtn) {
    cakeMicBtn.hidden = true;
    cakeMicBtn.textContent = 'Tap to blow 🕯️';
  }
  if (cakeBlowStatus) {
    cakeBlowStatus.textContent = 'Blow into your mic to put out the candle 🕯️';
  }
  scheduleBlowMonitor();
}

function scheduleBlowMonitor() {
  if (candleBlown || blowMicStream) return;
  setTimeout(() => startBlowMonitor(), 400);
}

function initializeCake() {
  if (!cakeContainer || cakeInitialized) return;
  cakeInitialized = true;

  cakeContainer.classList.add('awaiting-blow');
  cakeContainer.innerHTML = `
    <div id="knifePointer" class="knife-pointer">🔪</div>
    <div class="photo-cake-scene">
      <div class="cake-spotlight" aria-hidden="true"></div>
      <div class="cake-stand" aria-hidden="true"></div>
      <div class="cake-assembly" id="cakeAssembly">
        <div class="cake-half cake-half-left">
          <img class="cake-photo" src="${CAKE_IMAGE_SRC}" alt="Birthday cake">
        </div>
        <div class="cake-half cake-half-right">
          <img class="cake-photo" src="${CAKE_IMAGE_SRC}" alt="">
        </div>
        <div class="cake-cut-slot" id="cakeCutSlot"></div>
        <div class="cake-candle-layer" id="cakeCandleLayer">
          <span class="cake-candle">
            <span class="candle-smoke" aria-hidden="true"><span></span><span></span><span></span></span>
            <i class="candle-flame" id="candleFlame"></i>
            <i class="candle-stick"></i>
          </span>
        </div>
      </div>
      <div class="cake-crumb-layer" id="cakeCrumbLayer"></div>
    </div>
    <div class="cake-blow-panel" id="cakeBlowPanel">
      <p class="cake-blow-status" id="cakeBlowStatus">Starting mic… get ready to blow 🎤</p>
      <button type="button" id="cakeMicBtn" class="cake-mic-btn cake-mic-fallback" hidden>Tap to blow 🕯️</button>
    </div>
  `;

  cakeKnife = cakeContainer.querySelector('#knifePointer');
  cakeAssembly = cakeContainer.querySelector('#cakeAssembly');
  cakeCutSlot = cakeContainer.querySelector('#cakeCutSlot');
  cakeMicBtn = cakeContainer.querySelector('#cakeMicBtn');
  cakeBlowStatus = cakeContainer.querySelector('#cakeBlowStatus');
  candleFlame = cakeContainer.querySelector('#candleFlame');

  cakeMicBtn?.addEventListener('click', () => {
    if (!candleBlown) extinguishCandle();
  });

  cakeContainer.addEventListener('pointermove', onPointerMove);
  cakeContainer.addEventListener('pointerdown', onCakePointerDown);
  cakeContainer.addEventListener('pointerup', onKnifeUp);
  cakeContainer.addEventListener('pointerleave', onKnifeUp);

  scheduleBlowMonitor();
}

function onCakePointerDown(event) {
  if (!candleBlown && !blowMicStream) {
    startBlowMonitor();
  }
  onKnifeDown(event);
}

function getCakeBounds() {
  const assembly = cakeAssembly?.getBoundingClientRect();
  const container = cakeContainer.getBoundingClientRect();
  if (!assembly) {
    return {
      cx: container.width / 2,
      cy: container.height * 0.46,
      rx: Math.min(container.width, container.height) * 0.28,
      ry: Math.min(container.width, container.height) * 0.18
    };
  }
  return {
    cx: assembly.left - container.left + assembly.width / 2,
    cy: assembly.top - container.top + assembly.height * 0.48,
    rx: assembly.width * 0.32,
    ry: assembly.height * 0.26
  };
}

function onPointerMove(event) {
  const rect = cakeContainer.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (cakeKnife && candleBlown) {
    cakeKnife.style.left = `${x}px`;
    cakeKnife.style.top = `${y}px`;
    cakeKnife.classList.toggle('cutting', isDraggingKnife);
  }

  if (!isDraggingKnife || !dragStart || cutComplete || !candleBlown) return;
  dragCurrent = { x, y, clientX: event.clientX, clientY: event.clientY };
  updateCutTrail();
  updateLiveCutProgress();
}

function onKnifeDown(event) {
  if (!candleBlown) return;
  unlockAudio();
  window.SiteAudio?.startBgm?.();
  if (cutComplete) return;
  isDraggingKnife = true;
  cakeContainer.setPointerCapture?.(event.pointerId);
  const rect = cakeContainer.getBoundingClientRect();
  dragStart = { x: event.clientX - rect.left, y: event.clientY - rect.top, clientX: event.clientX, clientY: event.clientY };
  dragCurrent = dragStart;
  createCutTrail();
  onPointerMove(event);
}

function onKnifeUp(event) {
  if (!isDraggingKnife) return;
  isDraggingKnife = false;
  cakeContainer.releasePointerCapture?.(event.pointerId);
  if (cakeKnife) cakeKnife.classList.remove('cutting');
  completeSmoothCut();
}

function createCutTrail() {
  cutTrail?.remove();
  cutTrail = document.createElement('div');
  cutTrail.className = 'cake-cut-trail';
  cakeContainer.appendChild(cutTrail);
}

function updateCutTrail() {
  if (!cutTrail || !dragStart || !dragCurrent) return;
  const dx = dragCurrent.x - dragStart.x;
  const dy = dragCurrent.y - dragStart.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  cutTrail.style.width = `${length}px`;
  cutTrail.style.left = `${dragStart.x}px`;
  cutTrail.style.top = `${dragStart.y}px`;
  cutTrail.style.transform = `rotate(${angle}deg)`;
  cutTrail.classList.toggle('ready', length > 90);
}

function updateLiveCutProgress() {
  if (!dragStart || !dragCurrent || !cakeAssembly) return;
  const bounds = getCakeBounds();
  const dist = distanceToSegment({ x: bounds.cx, y: bounds.cy }, dragStart, dragCurrent);
  const cutLength = Math.hypot(dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y);
  const inside = dist < bounds.rx;
  const progress = inside ? Math.min(1, cutLength / 150) : Math.max(0, cutProgress - 0.04);

  cutProgress = Math.max(cutProgress, progress * 0.85);
  cakeAssembly.style.setProperty('--cut-progress', cutProgress.toFixed(3));

  if (cakeCutSlot) {
    cakeCutSlot.style.opacity = String(Math.min(1, cutProgress * 1.4));
    cakeCutSlot.style.transform = `translateX(-50%) scaleY(${0.2 + cutProgress * 0.8})`;
  }
}

function completeSmoothCut() {
  if (!dragStart || !dragCurrent || cutComplete) {
    cutTrail?.remove();
    cutTrail = null;
    return;
  }

  const dx = dragCurrent.x - dragStart.x;
  const dy = dragCurrent.y - dragStart.y;
  const distance = Math.hypot(dx, dy);
  const crossedCake = doesCutCrossCake(dragStart, dragCurrent);

  if (distance < 120 || !crossedCake) {
    cutTrail?.classList.add('missed');
    cutProgress = 0;
    cakeAssembly?.style.setProperty('--cut-progress', '0');
    if (cakeCutSlot) {
      cakeCutSlot.style.opacity = '0';
      cakeCutSlot.style.transform = 'translateX(-50%) scaleY(0.2)';
    }
    setTimeout(() => {
      cutTrail?.remove();
      cutTrail = null;
    }, 220);
    dragStart = null;
    dragCurrent = null;
    return;
  }

  cutComplete = true;
  cutTrail?.classList.add('complete');
  performCakeCut(dragCurrent.clientX, dragCurrent.clientY);
  setTimeout(() => {
    cutTrail?.remove();
    cutTrail = null;
  }, 760);
  dragStart = null;
  dragCurrent = null;
}

function doesCutCrossCake(start, end) {
  const bounds = getCakeBounds();
  const dist = distanceToSegment({ x: bounds.cx, y: bounds.cy }, start, end);
  return dist < bounds.rx + 12;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function performCakeCut(clientX, clientY) {
  cakeAssembly?.classList.add('is-cut');
  cakeAssembly?.style.setProperty('--cut-progress', '1');
  if (cakeCutSlot) {
    cakeCutSlot.style.opacity = '1';
    cakeCutSlot.style.transform = 'translateX(-50%) scaleY(1)';
  }

  playSliceSound();
  spawnCakeCrumbs();
  burstAt(clientX, clientY, ['cake', 'spark', 'heart'], 20);
  if (window.SiteAudio?.playCakeSting) {
    window.SiteAudio.playCakeSting();
  }
  setTimeout(finishCake, 820);
}

function spawnCakeCrumbs() {
  const layer = cakeContainer.querySelector('#cakeCrumbLayer');
  if (!layer) return;
  const colors = ['#5a2b1f', '#6e3425', '#fff0d8', '#3d2018', '#f5f1e6'];

  for (let i = 0; i < 28; i += 1) {
    const crumb = document.createElement('span');
    crumb.className = 'cake-crumb';
    crumb.style.left = `${44 + Math.random() * 12}%`;
    crumb.style.top = `${38 + Math.random() * 16}%`;
    crumb.style.background = colors[Math.floor(Math.random() * colors.length)];
    crumb.style.setProperty('--tx', `${(Math.random() - 0.5) * 120}px`);
    crumb.style.setProperty('--ty', `${-20 - Math.random() * 90}px`);
    crumb.style.setProperty('--rot', `${Math.random() * 280 - 140}deg`);
    crumb.style.animationDelay = `${Math.random() * 0.12}s`;
    layer.appendChild(crumb);
    setTimeout(() => crumb.remove(), 1200);
  }
}

function finishCake() {
  if (cakeCelebrated) return;
  cakeCelebrated = true;

  if (!cakeUnlocked) {
    cakeUnlocked = true;
    cakeNextBtn.disabled = false;
    cakeNextBtn.classList.remove('disabled');
    typeElement(cakeNextBtn, 'Open My First Surprise 😘');
    typeElement(document.querySelector('.cake-hint'), 'YAYYYYYYYYY! Happy 24th Birthday Motiiiiiiii 😂❤️');
  }

  if (!window.SiteAudio?.playCakeSting) {
    playCelebrationSound();
  }
  launchConfetti();
  launchBalloonFinale();
}

function unlockAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
}

function playTone(frequency, duration, type, gainValue, delay = 0) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + delay);
  gain.gain.setValueAtTime(gainValue, audioContext.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + delay + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + delay);
  oscillator.stop(audioContext.currentTime + delay + duration);
}

let popSound;
let yaySound;
let pinPhotoSound;

function initPopSound() {
  if (popSound) return;
  popSound = new Audio('assets/pop-sound.mp3');
  popSound.preload = 'auto';
  popSound.volume = 0.62;
}

function initPinPhotoSound() {
  if (pinPhotoSound) return;
  pinPhotoSound = new Audio('assets/pin-wood.ogg');
  pinPhotoSound.preload = 'auto';
  pinPhotoSound.volume = 0.32;
}

function initYaySound() {
  if (yaySound) return;
  yaySound = new Audio('assets/yay-sound.mpeg');
  yaySound.preload = 'auto';
  yaySound.volume = 0.72;
}

function playYaySound() {
  unlockAudio();
  initYaySound();
  if (!yaySound) return;

  const sound = yaySound.cloneNode();
  sound.volume = yaySound.volume;
  sound.play().catch(() => {});
}
window.playYaySound = playYaySound;

function playPopSound() {
  unlockAudio();
  initPopSound();
  if (!popSound) return;

  const sound = popSound.cloneNode();
  sound.volume = popSound.volume;
  sound.play().catch(() => {});
}
window.playPopSound = playPopSound;

function playPinPhotoSound() {
  unlockAudio();
  initPinPhotoSound();
  if (!pinPhotoSound) return;

  const sound = pinPhotoSound.cloneNode();
  sound.volume = pinPhotoSound.volume;
  sound.play().catch(() => {});
}
window.playPinPhotoSound = playPinPhotoSound;

function playSliceSound() {
  playTone(210, 0.06, 'triangle', 0.08);
  playTone(520, 0.09, 'sine', 0.04, 0.04);
}

function playCelebrationSound() {
  [523, 659, 784, 1046].forEach((note, index) => playTone(note, 0.18, 'sine', 0.07, index * 0.1));
}
window.playCelebrationSound = playCelebrationSound;

function launchConfetti() {
  for (let i = 0; i < 140; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.setProperty('--fall-x', `${Math.random() * 240 - 120}px`);
      confetti.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
      confetti.style.background = ['#ff5cab', '#ffd166', '#8be9fd', '#b892ff', '#ffffff'][Math.floor(Math.random() * 5)];
      confetti.style.animationDuration = `${2.4 + Math.random() * 1.5}s`;
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 4200);
    }, i * 12);
  }
}

function launchBalloonFinale() {
  for (let i = 0; i < 42; i++) {
    const lane = BACKGROUND_LANES[i % BACKGROUND_LANES.length];
    setTimeout(() => spawnBalloon(traits[i % traits.length], 8 + Math.random() * 5, false, lane), i * 70);
  }
}

function burstAt(x, y, types, amount) {
  for (let i = 0; i < amount; i++) {
    const particle = document.createElement('div');
    particle.className = `cake-particle ${types[Math.floor(Math.random() * types.length)]}`;
    particle.textContent = particle.classList.contains('cake') ? '🍰' : particle.classList.contains('heart') ? '♥' : '✦';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty('--tx', `${Math.random() * 170 - 85}px`);
    particle.style.setProperty('--ty', `${Math.random() * -130 - 30}px`);
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 950);
  }
}

function spawnBalloon(label = '', duration = 10, forceIntro = false, preferredLane) {
  const introMode = forceIntro || isIntroActive();
  const lane = pickLane(preferredLane);
  const balloon = document.createElement('div');
  const palette = ['pink', 'peach', 'berry', 'lilac'];
  const scale = 0.88 + Math.random() * 0.28;
  balloon.className = `float balloon-float lane-${lane} ${introMode ? 'intro-float' : ''} ${palette[Math.floor(Math.random() * palette.length)]}`;
  balloon.innerHTML = `<b></b><span>${label}</span><i></i>`;
  balloon.style.left = `${randomLanePosition(lane)}vw`;
  balloon.style.bottom = `${-116 - Math.random() * 160}px`;
  balloon.style.setProperty('--drift', laneDrift(lane));
  balloon.style.setProperty('--tilt', `${(lane === 'center' ? (Math.random() > 0.5 ? 1 : -1) : lane === 'left' ? 1 : -1) * (6 + Math.random() * 14)}deg`);
  balloon.style.setProperty('--balloon-scale', scale.toFixed(2));
  balloon.style.animationDuration = `${duration}s`;
  balloon.style.animationDelay = `${Math.random() * 2.5}s`;
  const container = introMode ? introFx : document.getElementById('balloons');
  if (!container) return;
  container.appendChild(balloon);
  setTimeout(() => balloon.remove(), (duration + 2.5) * 1000);
}

function spawnSparkle(forceIntro = false, preferredLane) {
  const introMode = forceIntro || isIntroActive();
  const lane = pickLane(preferredLane);
  const sparkle = document.createElement('div');
  const isHeart = Math.random() > 0.48;
  sparkle.className = `float sparkle-float lane-${lane} ${introMode ? 'intro-float' : ''} ${isHeart ? 'heart-float' : 'star-float'}`;
  sparkle.textContent = isHeart ? '♥' : '✦';
  sparkle.style.left = `${randomLanePosition(lane)}vw`;
  sparkle.style.bottom = `${-24 - Math.random() * 220}px`;
  sparkle.style.fontSize = `${12 + Math.random() * 18}px`;
  sparkle.style.setProperty('--sparkle-drift', laneDrift(lane));
  sparkle.style.animationDuration = `${8 + Math.random() * 5}s`;
  sparkle.style.animationDelay = `${Math.random() * 3}s`;
  const container = introMode ? introFx : document.getElementById('sparkles');
  if (!container) return;
  container.appendChild(sparkle);
  setTimeout(() => sparkle.remove(), 14000);
}

let nextLaneIndex = 0;

function nextLane() {
  const lane = BACKGROUND_LANES[nextLaneIndex];
  nextLaneIndex = (nextLaneIndex + 1) % BACKGROUND_LANES.length;
  return lane;
}

setInterval(() => {
  const lane = nextLane();
  if (isIntroActive()) {
    spawnBalloon(traits[Math.floor(Math.random() * traits.length)], 10 + Math.random() * 5, true, lane);
    return;
  }
  spawnBalloon(traits[Math.floor(Math.random() * traits.length)], 11 + Math.random() * 6, false, lane);
}, 1100);

setInterval(() => {
  spawnSparkle(isIntroActive(), nextLane());
}, 480);

seedIntroBackground();
