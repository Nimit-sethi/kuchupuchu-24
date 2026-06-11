(function initBirthdayReel(global) {
  const REEL_ACTS = [
    {
      id: 'cute',
      tone: 'warm',
      duration: 3200,
      photos: [
        'assets/photos/cute/photo-cute-8.jpg',
        'assets/photos/cute/photo-cute-9.jpg',
        'assets/photos/cute/photo-udaipur-1.jpg',
        'assets/photos/hot/photo-model-2.jpg',
        'assets/photos/hot/photo-model-1.jpg'
      ]
    },
    {
      id: 'hot',
      tone: 'golden',
      duration: 2900,
      photos: [
        'assets/photos/hot/photo-model-1.jpg',
        'assets/photos/hot/photo-model-2.jpg',
        'assets/photos/hot/photo-model-9.jpg',
        'assets/photos/cute/photo-cute-8.jpg'
      ]
    },
    {
      id: 'us',
      tone: 'romantic',
      duration: 3400,
      photos: [
        'assets/photos/us/photo-jaipur-1.jpg',
        'assets/photos/us/photo-jaipur-2.jpg',
        'assets/photos/us/photo-ajmer-1.jpg',
        'assets/photos/us/photo-udaipur-2.jpg'
      ]
    }
  ];

  const TRANSITIONS = ['kenburns-in', 'kenburns-pan-left', 'kenburns-pan-right', 'reel-swipe', 'zoom-soft'];
  const DIM_MS = 2200;

  const reelState = {
    running: false,
    timers: [],
    slideIndex: 0,
    slides: [],
    stage: null
  };

  function delay(ms) {
    return new Promise((resolve) => {
      const id = window.setTimeout(resolve, ms);
      reelState.timers.push(id);
    });
  }

  function preloadImages(urls) {
    return Promise.all(urls.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ src, ok: true });
      img.onerror = () => {
        console.warn(`Reel image missing: ${src}`);
        resolve({ src, ok: false });
      };
      img.src = src;
    })));
  }

  function flattenPhotos() {
    const list = [];
    REEL_ACTS.forEach((act) => {
      act.photos.forEach((src, index) => {
        list.push({
          src,
          act: act.id,
          tone: act.tone,
          duration: act.duration,
          transition: TRANSITIONS[(list.length + index) % TRANSITIONS.length]
        });
      });
    });
    return list;
  }

  function clearReelTimers() {
    reelState.timers.forEach((id) => window.clearTimeout(id));
    reelState.timers = [];
  }

  function stopReel() {
    clearReelTimers();
    reelState.running = false;
    document.body.classList.remove('reel-mode');
    if (reelState.stage) {
      reelState.stage.classList.remove('is-playing', 'is-finished');
      const theater = reelState.stage.querySelector('#reelTheater');
      const dim = reelState.stage.querySelector('#reelDim');
      theater?.classList.remove('is-lit', 'is-playing', 'is-dimming', 'is-finished');
      dim?.classList.remove('is-visible', 'is-dark', 'is-faded');
    }
  }

  function buildSlides(stack, slides) {
    stack.innerHTML = '';
    slides.forEach((slide, index) => {
      const el = document.createElement('div');
      el.className = `reel-slide reel-tone-${slide.tone} reel-${slide.transition}`;
      el.dataset.index = String(index);
      el.dataset.act = slide.act;
      el.innerHTML = `<img src="${slide.src}" alt="">`;
      stack.appendChild(el);
    });
    reelState.slides = Array.from(stack.querySelectorAll('.reel-slide'));
  }

  function setActiveSlide(index) {
    reelState.slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      slide.classList.toggle('is-exiting', i === index - 1);
    });
    reelState.slideIndex = index;
  }

  async function runDimSequence(theater, dim) {
    theater.classList.add('is-dimming');
    dim.classList.remove('is-faded');
    dim.classList.add('is-visible');
    await delay(DIM_MS * 0.55);
    dim.classList.add('is-dark');
    await delay(DIM_MS * 0.45);
    theater.classList.remove('is-dimming');
    theater.classList.add('is-lit');
    dim.classList.remove('is-dark');
    dim.classList.add('is-faded');
    await delay(700);
    dim.classList.remove('is-visible', 'is-faded');
  }

  async function playSlides(slides) {
    for (let i = 0; i < slides.length; i += 1) {
      if (!reelState.running) return;
      setActiveSlide(i);
      await delay(slides[i].duration);
    }
  }

  async function runReelStage(stage, { autoplay = true } = {}) {
    const theater = stage.querySelector('#reelTheater');
    const stack = stage.querySelector('#reelStack');
    const dim = stage.querySelector('#reelDim');
    const nextBtn = stage.querySelector('#videoNextBtn');

    if (!theater || !stack || !dim) return;

    stopReel();
    reelState.stage = stage;
    reelState.running = true;

    if (nextBtn) {
      nextBtn.hidden = true;
      nextBtn.disabled = true;
      nextBtn.classList.remove('is-revealed');
    }

    stage.classList.remove('is-finished');
    stage.classList.add('is-playing');
    document.body.classList.add('reel-mode');
    theater.classList.remove('is-lit', 'is-playing');
    dim.classList.remove('is-visible', 'is-dark');

    const slides = flattenPhotos();

    try {
      await preloadImages(slides.map((slide) => slide.src));
    } catch (error) {
      console.error('Reel preload failed:', error);
    }

    buildSlides(stack, slides);

    if (!autoplay) {
      theater.classList.add('is-lit', 'is-playing');
      dim.classList.remove('is-visible', 'is-dark', 'is-faded');
      setActiveSlide(0);
      return;
    }

    setActiveSlide(-1);
    await runDimSequence(theater, dim);
    if (!reelState.running) return;

    theater.classList.add('is-playing');
    dim.classList.remove('is-visible', 'is-dark', 'is-faded');
    await delay(300);
    await playSlides(slides);

    if (!reelState.running) return;

    stage.classList.add('is-finished');
    stage.classList.remove('is-playing');
    theater.classList.add('is-finished');

    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.disabled = false;
      nextBtn.classList.add('is-revealed');
    }
  }

  global.BirthdayReel = {
    runReelStage,
    stopReel,
    acts: REEL_ACTS
  };
})(window);
