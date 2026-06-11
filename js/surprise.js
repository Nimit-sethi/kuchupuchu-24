(function initSurpriseStage(global) {
  const BALLOON_IMG = 'assets/heart-balloon.png';

  const WORD_BALLOONS = [
    { word: 'You', display: 'You', row: 'top' },
    { word: 'Are', display: 'are', row: 'top' },
    { word: 'SO', display: 'so', row: 'bottom' },
    { word: 'Special', display: 'Special', row: 'bottom' }
  ];

  const HEART_MESSAGES = [
    'I am Lucky to have you',
    'You are Gorgeous',
    'My Forever',
    'Happy Birthday Beautiful',
    'The Best Bestie',
    'My Favourite Person'
  ];

  const SENTENCE_HTML = `
    <p class="sentence-line sentence-line-top">
      <span class="assembled-word" data-word="You">You</span>
      <span class="assembled-word" data-word="are">are</span>
      <span class="assembled-word" data-word="so">so</span>
    </p>
    <p class="sentence-line sentence-line-bottom">
      <span class="assembled-word assembled-word-special" data-word="Special">
        <span class="special-hearts" id="specialHearts" aria-hidden="true"></span>
        <span class="special-text">Special</span>
      </span>
    </p>
  `;

  const surpriseState = {
    popped: 0,
    revealed: false,
    bouquetShown: false,
    preparingBouquet: false
  };

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function typeElement(element, text) {
    const writer = global.BirthdayApp?.typeElement;
    if (writer) return writer(element, text, true);
    if (!element) return Promise.resolve();
    element.textContent = text;
    element.classList.remove('typing-pending');
    return Promise.resolve();
  }

  function balloonMarkup({ text, mask = '', size = 'size-word', labelVisible = false }) {
    return `
      <span class="balloon-float-wrap ${size}">
        <span class="balloon-shell">
          <img src="${BALLOON_IMG}" alt="" class="balloon-img" draggable="false">
          <span class="balloon-text-wrap">
            ${mask ? `<span class="balloon-mask">${mask}</span>` : ''}
            <span class="balloon-label${labelVisible ? ' is-shown' : ''}">${text}</span>
          </span>
        </span>
      </span>
    `;
  }

  function ensureSentenceMarkup(root) {
    const sentence = root?.querySelector('#revealedSentence');
    if (!sentence) return null;
    if (!sentence.querySelector('.assembled-word[data-word="You"]')) {
      sentence.innerHTML = SENTENCE_HTML;
    }
    return sentence;
  }

  function spawnMiniConfetti(originEl) {
    const rect = originEl?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    for (let i = 0; i < 18; i += 1) {
      const piece = document.createElement('div');
      piece.className = 'surprise-confetti-piece';
      piece.style.left = `${cx}px`;
      piece.style.top = `${cy}px`;
      piece.style.background = ['#ff5cab', '#ffd166', '#ff8fab', '#ffffff', '#b892ff'][i % 5];
      piece.style.setProperty('--tx', `${(Math.random() - 0.5) * 140}px`);
      piece.style.setProperty('--ty', `${-40 - Math.random() * 120}px`);
      piece.style.setProperty('--rot', `${Math.random() * 360}deg`);
      document.body.appendChild(piece);
      window.setTimeout(() => piece.remove(), 900);
    }
  }

  function spawnBigConfetti(container) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 80; i += 1) {
      const piece = document.createElement('div');
      piece.className = 'surprise-confetti-fall';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = ['#ff5cab', '#ffd166', '#ff8fab', '#ffffff', '#e777c3', '#b892ff'][i % 6];
      piece.style.animationDelay = `${Math.random() * 1.2}s`;
      piece.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
      container.appendChild(piece);
    }
  }

  function spawnSpecialHearts(container) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 10; i += 1) {
      const heart = document.createElement('span');
      heart.className = 'special-heart-pop';
      heart.textContent = '♥';
      heart.style.setProperty('--hx', `${(Math.random() - 0.5) * 100}px`);
      heart.style.setProperty('--hy', `${(Math.random() - 0.5) * 60}px`);
      heart.style.setProperty('--hs', `${0.7 + Math.random() * 0.8}`);
      heart.style.animationDelay = `${i * 90}ms`;
      container.appendChild(heart);
    }
  }

  function getTargetEl(sentence, display) {
    if (!sentence) return null;
    if (display === 'Special') {
      return sentence.querySelector('.special-text') || sentence.querySelector('[data-word="Special"]');
    }
    return sentence.querySelector(`.assembled-word[data-word="${display}"]`);
  }

  function showRevealButton(getBtn) {
    if (!getBtn) return;
    getBtn.removeAttribute('hidden');
    getBtn.disabled = false;
    getBtn.classList.add('is-revealed');
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

  function resetSurpriseStage(stage) {
    const root = stage?.querySelector('#surpriseStage');
    if (!root) return;

    surpriseState.popped = 0;
    surpriseState.revealed = false;
    surpriseState.bouquetShown = false;
    surpriseState.preparingBouquet = false;

    root.classList.remove(
      'is-sentence-ready',
      'is-typing-phase',
      'is-bouquet-active',
      'is-complete',
      'is-rearranging'
    );
    document.documentElement.classList.remove('surprise-bouquet-open');
    document.body.classList.remove('surprise-bouquet-open');
    document.querySelector('.word-flight-layer')?.remove();

    const board = root.querySelector('#wordBalloonBoard');
    const rowTop = root.querySelector('#wordBalloonRowTop');
    const rowBottom = root.querySelector('#wordBalloonRowBottom');
    const sentence = ensureSentenceMarkup(root);
    const hint = root.querySelector('#surpriseHint');
    const getBtn = root.querySelector('#surpriseGetBtn');
    const messageZone = root.querySelector('#surpriseMessageZone');
    const bouquetScene = root.querySelector('#bouquetScene');
    const nextBtn = root.querySelector('#surpriseNextBtn');
    const confetti = root.querySelector('#surpriseConfetti');
    const playArea = root.querySelector('#surprisePlayArea');

    if (board) {
      board.classList.remove('is-all-popped', 'is-rearranging', 'is-rows-hidden');
      board.hidden = false;
    }
    if (playArea) {
      playArea.classList.remove('is-rearranging', 'is-sentence-shown');
      playArea.removeAttribute('hidden');
    }
    if (rowTop) rowTop.innerHTML = '';
    if (rowBottom) rowBottom.innerHTML = '';
    if (sentence) {
      sentence.setAttribute('hidden', '');
      sentence.classList.remove('is-visible', 'is-measuring');
      sentence.querySelectorAll('.assembled-word').forEach((el) => el.classList.remove('is-visible'));
    }
    root.querySelector('#specialHearts')?.replaceChildren();
    resetTypeLine(root.querySelector('#surpriseLine1'));
    resetTypeLine(root.querySelector('#surpriseLine2'));
    if (messageZone) messageZone.hidden = true;
    if (hint) {
      hint.textContent = 'Pop the balloons to reveal the message 🤧';
      hint.hidden = false;
    }
    if (getBtn) {
      getBtn.setAttribute('hidden', '');
      getBtn.disabled = true;
      getBtn.classList.remove('is-revealed');
    }
    if (bouquetScene) bouquetScene.hidden = true;
    if (confetti) confetti.innerHTML = '';
    if (nextBtn) {
      nextBtn.hidden = true;
      nextBtn.disabled = true;
      nextBtn.classList.remove('is-revealed');
    }

    root.querySelector('#heartBalloonsLeft')?.replaceChildren();
    root.querySelector('#heartBalloonsRight')?.replaceChildren();
  }

  function buildWordBalloons(root) {
    const rowTop = root.querySelector('#wordBalloonRowTop');
    const rowBottom = root.querySelector('#wordBalloonRowBottom');
    if (!rowTop || !rowBottom) return;

    rowTop.innerHTML = '';
    rowBottom.innerHTML = '';

    WORD_BALLOONS.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'word-balloon';
      btn.dataset.word = item.word;
      btn.dataset.display = item.display;
      btn.dataset.index = String(index);
      btn.style.setProperty('--float-delay', `${index * 0.45}s`);
      btn.setAttribute('aria-label', `Pop balloon ${index + 1}`);
      btn.innerHTML = balloonMarkup({
        text: item.word,
        mask: '?',
        size: 'size-word'
      });
      btn.addEventListener('click', () => popWordBalloon(btn, root));
      (item.row === 'top' ? rowTop : rowBottom).appendChild(btn);
    });
  }

  function popWordBalloon(btn, root) {
    if (!btn || btn.classList.contains('is-popped')) return;

    btn.classList.add('is-popped');
    surpriseState.popped += 1;

    if (typeof global.playPopSound === 'function') {
      global.playPopSound();
    }
    spawnMiniConfetti(btn);

    if (surpriseState.popped >= WORD_BALLOONS.length) {
      window.setTimeout(() => rearrangeWords(root), 650);
    }
  }

  async function rearrangeWords(root) {
    if (surpriseState.revealed) return;

    const board = root?.querySelector('#wordBalloonBoard');
    const sentence = ensureSentenceMarkup(root);
    const hint = root?.querySelector('#surpriseHint');
    const getBtn = root?.querySelector('#surpriseGetBtn');
    const playArea = root?.querySelector('#surprisePlayArea');

    if (!root || !board || !sentence) return;
    surpriseState.revealed = true;

    board.classList.add('is-all-popped', 'is-rearranging');
    root.classList.add('is-rearranging');
    playArea?.classList.add('is-rearranging');

    const balloons = WORD_BALLOONS.map((_, index) => (
      board.querySelector(`.word-balloon[data-index="${index}"]`)
    )).filter(Boolean);

    const flyFrom = balloons.map((btn) => {
      const label = btn.querySelector('.balloon-label');
      const rect = label?.getBoundingClientRect();
      const display = btn.dataset.display || btn.dataset.word || '';
      return { display, label, rect };
    }).filter((item) => item.label && item.rect);

    board.classList.add('is-rows-hidden');
    playArea?.classList.add('is-sentence-shown');
    root.classList.add('is-sentence-ready');
    if (hint) hint.hidden = true;

    sentence.removeAttribute('hidden');
    sentence.classList.add('is-measuring');
    sentence.querySelectorAll('.assembled-word').forEach((el) => el.classList.remove('is-visible'));

    await nextFrame();
    await nextFrame();

    const flightLayer = document.createElement('div');
    flightLayer.className = 'word-flight-layer';
    document.body.appendChild(flightLayer);

    const flyers = [];

    flyFrom.forEach(({ display, label, rect }) => {
      const target = getTargetEl(sentence, display);
      if (!target) return;

      const targetRect = target.getBoundingClientRect();
      const flyer = document.createElement('span');
      flyer.className = 'flying-word';
      flyer.textContent = display === 'Special' ? 'Special' : display;
      flyer.style.left = `${rect.left + rect.width / 2}px`;
      flyer.style.top = `${rect.top + rect.height / 2}px`;
      flyer.style.setProperty('--tx', `${targetRect.left + targetRect.width / 2 - (rect.left + rect.width / 2)}px`);
      flyer.style.setProperty('--ty', `${targetRect.top + targetRect.height / 2 - (rect.top + rect.height / 2)}px`);
      flightLayer.appendChild(flyer);
      flyers.push(flyer);
      label.style.visibility = 'hidden';
    });

    await nextFrame();
    flyers.forEach((flyer) => flyer.classList.add('is-flying'));

    await delay(900);

    sentence.classList.remove('is-measuring');
    sentence.classList.add('is-visible');
    sentence.querySelectorAll('.assembled-word').forEach((el) => el.classList.add('is-visible'));
    flightLayer.remove();

    spawnSpecialHearts(root.querySelector('#specialHearts'));
    if (typeof global.SiteAudio?.playSpecialSting === 'function') {
      global.SiteAudio.playSpecialSting();
    }
    showRevealButton(getBtn);
  }

  async function runTypewriterIntro(root) {
    const line1 = root.querySelector('#surpriseLine1');
    const line2 = root.querySelector('#surpriseLine2');
    if (!line1 || !line2) return;

    root.classList.add('is-typing-phase');

    await typeElement(line1, line1.dataset.typewriterText);
    await delay(420);
    await typeElement(line2, line2.dataset.typewriterText);
    await delay(700);
  }

  function buildHeartBalloon(text, side, index) {
    const el = document.createElement('div');
    el.className = `msg-heart-balloon msg-heart-balloon-${side}`;
    el.style.setProperty('--enter-delay', `${index * 200}ms`);
    el.style.setProperty('--float-delay', `${index * 0.55}s`);
    el.innerHTML = balloonMarkup({ text, size: 'size-msg', labelVisible: true });
    return el;
  }

  async function revealBouquetSurprise(stage) {
    if (surpriseState.bouquetShown) return;
    surpriseState.bouquetShown = true;

    const root = stage.querySelector('#surpriseStage');
    const bouquetScene = root?.querySelector('#bouquetScene');
    const confetti = root?.querySelector('#surpriseConfetti');
    const left = root?.querySelector('#heartBalloonsLeft');
    const right = root?.querySelector('#heartBalloonsRight');
    const nextBtn = root?.querySelector('#surpriseNextBtn');

    if (typeof global.playYaySound === 'function') {
      global.playYaySound();
    }

    root?.classList.remove('is-typing-phase');
    root?.classList.add('is-bouquet-active');

    spawnBigConfetti(confetti);
    if (bouquetScene) {
      bouquetScene.hidden = false;
      bouquetScene.removeAttribute('hidden');
    }

    document.documentElement.classList.add('surprise-bouquet-open');
    document.body.classList.add('surprise-bouquet-open');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    HEART_MESSAGES.forEach((msg, i) => {
      const side = i % 2 === 0 ? 'left' : 'right';
      const col = side === 'left' ? left : right;
      col?.appendChild(buildHeartBalloon(msg, side, Math.floor(i / 2)));
    });

    await delay(2200);

    root?.classList.add('is-complete');
    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.disabled = false;
      nextBtn.classList.add('is-revealed');
    }
  }

  async function handleSurpriseReady(stage) {
    if (surpriseState.preparingBouquet || surpriseState.bouquetShown) return;
    surpriseState.preparingBouquet = true;

    const root = stage.querySelector('#surpriseStage');
    const getBtn = root?.querySelector('#surpriseGetBtn');
    const sentence = root?.querySelector('#revealedSentence');
    const messageZone = root?.querySelector('#surpriseMessageZone');

    if (getBtn) {
      getBtn.disabled = true;
      getBtn.classList.remove('is-revealed');
      getBtn.setAttribute('hidden', '');
    }
    if (sentence) sentence.setAttribute('hidden', '');
    if (messageZone) messageZone.hidden = false;

    root?.classList.remove('is-sentence-ready');

    await runTypewriterIntro(root);
    await revealBouquetSurprise(stage);
  }

  function initSurpriseStage(stage) {
    const root = stage?.querySelector('#surpriseStage');
    const getBtn = root?.querySelector('#surpriseGetBtn');
    const board = root?.querySelector('#wordBalloonBoard');

    if (!root || !board) return;

    resetSurpriseStage(stage);
    board.hidden = false;
    root.querySelector('#surprisePlayArea')?.removeAttribute('hidden');
    ensureSentenceMarkup(root);
    buildWordBalloons(root);

    if (getBtn && !getBtn.dataset.bound) {
      getBtn.dataset.bound = '1';
      getBtn.addEventListener('click', () => handleSurpriseReady(stage));
    }
  }

  function runSurpriseStage(stage) {
    initSurpriseStage(stage);
  }

  global.BirthdaySurprise = {
    runSurpriseStage,
    resetSurpriseStage,
    initSurpriseStage
  };
})(window);
