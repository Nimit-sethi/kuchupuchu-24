(function initWishesStage(global) {
  const WISHES = [
    'I wish you wake up every morning with that little excited feeling in your chest — like something good is waiting for you today. ☀️🤧',
    'I wish you never lose that laugh of yours… the one that fixes my mood even when I am being annoying. 😂💗',
    'I wish every dream you\'ve been quietly working on — the big ones and the secret ones — finally start coming true for you. ✨🌙',
    'I wish you always find a reason to smile on the hard days too, even if it\'s something small and silly. 🙂🌸',
    'I wish your drawings, your creativity, and that beautiful brain of yours keep painting the world in your colors. 🎨💫',
    'I wish you become fluent in every language you dream of learning — and use them on all your adventures. 🌍📚',
    'I wish you always have the courage to go after what you truly want, even when it scares you a little. 🦋🔥',
    'I wish you never forget how strong you are — especially on the days you feel like you\'re not. 💪❤️',
    'I wish you always have people around you who see your kind heart and never take it for granted. 🤗🌷',
    'I wish every effort you put in — even the ones nobody sees — gets rewarded in ways you never expected. 🍀✨',
    'I wish you keep growing into the confident, unstoppable woman I already see in you. 👑💗',
    'I wish your smile never loses its magic… because honestly, it changes the whole room. 😍✨',
    'I wish every birthday from now on feels even happier, even softer, and even more loved than the last. 🎂🥹',
    'I wish you never stop being curious — asking questions, exploring, wondering, learning. 🔍🌸',
    'I wish you always have the freedom to be your dramatic, funny, talkative, full-of-life self. 😂🎭 (never change this.)',
    'I wish you always find comfort when life feels heavy — a hug, a song, a moment of peace, or just someone who gets it. 🤧☁️',
    'I wish you keep discovering new places, new adventures, and new memories that make you go "best day ever." ✈️📸',
    'I wish your heart stays soft and warm, even when life tries to make it hard. That softness is your superpower. 💝🌸',
    'I wish you never forget how beautiful you are — inside, outside, and in every version of you. 🪞💖',
    'I wish every little insecurity slowly turns into quiet confidence — the kind that doesn\'t need to shout. 🌱✨',
    'I wish you keep being the strongest girl I know — even when you\'re tired, even when you don\'t feel like it. 🫶💪',
    'I wish you always have someone who listens to all your stories… yes, even the long dramatic ones. 😂👂❤️',
    'I wish the next chapter of your life brings you peace, success, happiness, and so many "I can\'t believe this is my life" moments. 📖🌟',
    'I wish that years from now, you become everything you dreamed of being — and still stay my Kuchupuchu. 🌸🤧❤️'
  ];

  const INTRO_LINES = [
    'Kuchupuchu ❤️,',
    'If you\'ve reached this page, it means you\'ve completed the adventure. 🥹✨',
    'You\'ve seen the memories, the laughs, the trips, the chaos, the photos, and all the little moments that made this journey special. 📸🤧',
    'But birthdays are not only about looking back. 🌅',
    'They\'re also about looking forward. 🌸',
    'So instead of giving you just one wish, I wanted to give you twenty-four. 💝'
  ];

  const TITLE_TEXT = '🌸 24 Wishes For Your 24th Birthday 🌸';

  const SECRET_WISH = `My final wish? Simple. 🤧❤️

Never forget how special you are. ✨🌸

Stay strong — even on your dramatic serial days. 💪😂

Know your worth. The world got lucky with you. 👑💗

Keep that smile. It fixes bad days. (Even when you're extra.) 😍😂

So loved. Heart, brain, talent, chaos and all. 🤗💝

Thank you for being born. 🥹

Thank you for being you. Still my favorite person. 🌸

Happy 24th Birthday, Kuchupuchu. ❤️🤧🎂`;

  const state = {
    unlocked: new Set(),
    secretShown: false,
    musicVolumeBefore: null
  };

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function typeElement(element, text) {
    const writer = global.BirthdayApp?.typeElement;
    if (writer) return writer(element, text, true);
    if (!element) return Promise.resolve();
    element.textContent = text;
    element.classList.remove('typing-pending');
    return Promise.resolve();
  }

  function resetTypeLine(line) {
    if (!line) return;
    if (line.dataset.typewriterTimer) {
      clearTimeout(Number(line.dataset.typewriterTimer));
      delete line.dataset.typewriterTimer;
    }
    line.textContent = '';
    line.classList.add('typing-pending');
    line.classList.remove('typing-active');
  }

  function spawnPetals(container, count = 28) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i += 1) {
      const petal = document.createElement('span');
      petal.className = 'wish-petal';
      petal.textContent = '🌸';
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
      petal.style.animationDuration = `${10 + Math.random() * 14}s`;
      petal.style.animationDelay = `${Math.random() * 8}s`;
      petal.style.fontSize = `${14 + Math.random() * 12}px`;
      petal.style.opacity = `${0.25 + Math.random() * 0.45}`;
      container.appendChild(petal);
    }
  }

  function spawnParticles(container, count = 40) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('span');
      p.className = 'wish-particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDuration = `${4 + Math.random() * 6}s`;
      p.style.animationDelay = `${Math.random() * 4}s`;
      container.appendChild(p);
    }
  }

  function buildFlowers(garden) {
    if (!garden || garden.querySelector('.wish-flower')) return;
    garden.style.setProperty('--garden-radius', 'min(38vw, 260px)');

    WISHES.forEach((_, index) => {
      const angle = (index / WISHES.length) * 360 - 90;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wish-flower';
      btn.dataset.wishIndex = String(index);
      btn.style.setProperty('--angle', `${angle}deg`);
      btn.style.setProperty('--garden-radius', 'min(38vw, 260px)');
      btn.setAttribute('aria-label', `Wish ${index + 1}`);
      btn.innerHTML = `
        <span class="wish-flower-bloom">
          <span class="wish-flower-emoji" aria-hidden="true">🌸</span>
          <span class="wish-flower-num">${index + 1}</span>
        </span>
      `;
      btn.addEventListener('click', () => openWish(btn, index));
      garden.appendChild(btn);
    });
  }

  function updateProgress(root) {
    const countEl = root.querySelector('.wishes-progress-count');
    if (countEl) countEl.textContent = String(state.unlocked.size);
  }

  function openWish(flowerBtn, index) {
    const root = flowerBtn.closest('#wishesPage');
    if (!root || state.unlocked.has(index)) {
      if (state.unlocked.has(index)) showWishModal(root, index);
      return;
    }

    flowerBtn.classList.add('is-bloomed');
    state.unlocked.add(index);
    updateProgress(root);

    if (typeof global.playPopSound === 'function') {
      global.playPopSound();
    }

    showWishModal(root, index);

    if (state.unlocked.size >= WISHES.length) {
      unlockSecretHeart(root);
    }
  }

  function showWishModal(root, index) {
    const modal = root.querySelector('#wishModal');
    const label = root.querySelector('#wishModalLabel');
    const text = root.querySelector('#wishModalText');
    if (!modal || !text) return;

    if (label) label.textContent = `🌸 Wish ${index + 1} of 24 🌸`;
    text.textContent = WISHES[index];
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
  }

  function closeWishModal(root) {
    const modal = root?.querySelector('#wishModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    window.setTimeout(() => { modal.hidden = true; }, 400);
  }

  function unlockSecretHeart(root) {
    const heart = root.querySelector('#wishHeartCenter');
    const music = document.getElementById('bgMusic');

    root?.classList.add('is-dimmed');

    if (global.SiteAudio?.softenForSecretWish) {
      state.musicVolumeBefore = global.SiteAudio.softenForSecretWish();
    } else if (music && state.musicVolumeBefore === null) {
      state.musicVolumeBefore = music.volume;
      const softer = Math.max(0.12, music.volume * 0.35);
      music.volume = softer;
    }

    if (heart) {
      heart.classList.remove('is-locked');
      heart.classList.add('is-unlocked', 'is-glowing');
      heart.disabled = false;
    }

    if (!root.querySelector('.wish-secret-unlock-banner')) {
      const badge = document.createElement('p');
      badge.className = 'wish-secret-unlock-banner';
      badge.textContent = '❤️ Secret Wish Unlocked ❤️';
      root.querySelector('.wishes-progress')?.after(badge);
    }
  }

  function openSecretWish(root) {
    if (state.secretShown || state.unlocked.size < WISHES.length) return;
    state.secretShown = true;

    const overlay = root.querySelector('#wishSecretOverlay');
    const body = root.querySelector('#wishSecretBody');
    if (!overlay || !body) return;

    body.innerHTML = SECRET_WISH.split('\n\n').map((para) => `<p>${para}</p>`).join('');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
  }

  function debugJumpToSecretWish(stage) {
    const root = stage?.querySelector('#wishesPage');
    if (!root) return;

    if (!root.querySelector('.wish-flower')) {
      buildFlowers(root.querySelector('#wishGarden'));
      bindEvents(root, stage);
    }

    const intro = root.querySelector('#wishesIntro');
    if (intro) {
      intro.hidden = true;
      intro.classList.add('is-visible');
    }

    const title = root.querySelector('#wishesTitle');
    if (title) {
      title.textContent = title.dataset.typewriterText || TITLE_TEXT;
      title.classList.remove('typing-pending', 'typing-active');
    }

    const gardenWrap = root.querySelector('#wishesGardenWrap');
    if (gardenWrap) {
      gardenWrap.hidden = false;
      gardenWrap.classList.add('is-visible');
    }

    closeWishModal(root);
    state.unlocked.clear();

    root.querySelectorAll('.wish-flower').forEach((btn, index) => {
      btn.classList.add('is-bloomed');
      state.unlocked.add(index);
    });
    updateProgress(root);

    if (state.unlocked.size >= WISHES.length) {
      unlockSecretHeart(root);
    }

    state.secretShown = false;
    openSecretWish(root);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function closeSecretAndShowEnding(root) {
    const overlay = root.querySelector('#wishSecretOverlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.hidden = true;
    }

    root?.classList.remove('is-dimmed');
    root?.classList.add('is-ending-active');
    showEnding(root);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function showEnding(root) {
    const ending = root.querySelector('#wishEnding');
    if (ending) {
      ending.hidden = false;
      requestAnimationFrame(() => ending.classList.add('is-visible'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goToStage(stage, stageIndex) {
    global.SiteAudio?.stopStingAndResumeBgm?.();
    const debug = global.BirthdayApp?.isDebugMode?.();
    global.BirthdayApp?.showStage?.(stageIndex, debug ? { debug: true } : {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function runIntroSequence(root) {
    const intro = root.querySelector('#wishesIntro');
    const body = root.querySelector('#wishesIntroBody');
    const title = root.querySelector('#wishesTitle');
    if (!intro || !body || !title) return;

    intro.classList.add('is-visible');
    await delay(350);

    await typeElement(title, title.dataset.typewriterText || TITLE_TEXT);
    await delay(550);

    body.innerHTML = INTRO_LINES.map((_, i) => `<p class="wishes-intro-line typing-pending" data-line="${i}"></p>`).join('');

    for (let i = 0; i < INTRO_LINES.length; i += 1) {
      const line = body.querySelector(`[data-line="${i}"]`);
      if (!line) continue;
      await typeElement(line, INTRO_LINES[i]);
      await delay(i < INTRO_LINES.length - 1 ? 320 : 600);
    }

    await delay(500);
    const gardenWrap = root.querySelector('#wishesGardenWrap');
    if (gardenWrap) {
      gardenWrap.hidden = false;
      requestAnimationFrame(() => gardenWrap.classList.add('is-visible'));
    }
  }

  function bindEvents(root, stage) {
    if (root.dataset.bound) return;
    root.dataset.bound = '1';

    root.querySelector('#wishModalClose')?.addEventListener('click', () => closeWishModal(root));
    root.querySelector('#wishModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'wishModal') closeWishModal(root);
    });

    root.querySelector('#wishHeartCenter')?.addEventListener('click', () => openSecretWish(root));
    root.querySelector('#wishSecretContinue')?.addEventListener('click', () => closeSecretAndShowEnding(root));

    root.querySelectorAll('.wish-stage-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.stage);
        if (Number.isNaN(index)) return;
        goToStage(stage, index);
      });
    });

    root.querySelector('#wishReplayBtn')?.addEventListener('click', () => {
      resetWishesStage(stage);
      goToStage(stage, 0);
    });
  }

  function resetWishesStage(stage) {
    const root = stage?.querySelector('#wishesPage');
    if (!root) return;

    state.unlocked.clear();
    state.secretShown = false;

    const music = document.getElementById('bgMusic');
    if (state.musicVolumeBefore !== null) {
      if (global.SiteAudio?.restoreFromSecretWish) {
        global.SiteAudio.restoreFromSecretWish(state.musicVolumeBefore);
      } else if (music) {
        music.volume = state.musicVolumeBefore;
      }
    }
    state.musicVolumeBefore = null;

    root.classList.remove('is-dimmed', 'is-ending-active');
    delete root.dataset.bound;
    document.documentElement.classList.remove('wishes-stage-open');
    document.body.classList.remove('wishes-stage-open');

    root.querySelector('#wishesIntro')?.classList.remove('is-visible');
    const intro = root.querySelector('#wishesIntro');
    if (intro) intro.hidden = false;
    intro?.removeAttribute('hidden');

    const title = root.querySelector('#wishesTitle');
    if (title) {
      resetTypeLine(title);
      title.classList.add('typing-pending');
    }
    root.querySelector('#wishesIntroBody')?.replaceChildren();
    root.querySelector('#wishesGardenWrap')?.classList.remove('is-visible');
    root.querySelector('#wishesGardenWrap')?.setAttribute('hidden', '');
    root.querySelector('#wishEnding')?.classList.remove('is-visible');
    root.querySelector('#wishEnding')?.setAttribute('hidden', '');

    root.querySelector('.wish-secret-unlock-banner')?.remove();
    root.querySelectorAll('.wish-flower').forEach((f) => f.remove());

    const heart = root.querySelector('#wishHeartCenter');
    if (heart) {
      heart.classList.add('is-locked');
      heart.classList.remove('is-unlocked', 'is-glowing');
      heart.disabled = true;
    }

    updateProgress(root);
    closeWishModal(root);

    const secret = root.querySelector('#wishSecretOverlay');
    if (secret) {
      secret.classList.remove('is-open');
      secret.hidden = true;
    }
  }

  function runWishesStage(stage, options = {}) {
    const root = stage?.querySelector('#wishesPage');
    if (!root) return;

    resetWishesStage(stage);

    document.documentElement.classList.add('wishes-stage-open');
    document.body.classList.add('wishes-stage-open');

    spawnPetals(root.querySelector('#wishesPetals'));
    spawnParticles(root.querySelector('#wishesParticles'));
    buildFlowers(root.querySelector('#wishGarden'));
    bindEvents(root, stage);
    updateProgress(root);

    if (options.jumpToSecret) {
      debugJumpToSecretWish(stage);
    } else {
      runIntroSequence(root);
    }
  }

  global.BirthdayWishes = {
    runWishesStage,
    resetWishesStage,
    debugJumpToSecretWish
  };
})(window);
