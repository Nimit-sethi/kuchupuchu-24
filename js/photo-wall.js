(function initPhotoWall(global) {
  const WALL_SECTIONS = [
    {
      id: 'cutiepie',
      title: 'Cutiepie 🧸',
      subtitle: 'Her cute & funny moments 🤧',
      theme: 'cutiepie',
      folder: 'cutiepie',
      prefix: 'cute',
      count: 8
    },
    {
      id: 'hotipie',
      title: 'Hotipie 🔥',
      subtitle: 'Model energy only 😍',
      theme: 'hotipie',
      folder: 'hotipie',
      prefix: 'hot',
      count: 12
    },
    {
      id: 'myhappypie',
      title: 'MyHappyPie ❤️',
      subtitle: 'Us & our happiest memories 🤧',
      theme: 'myhappypie',
      folder: 'myhappypie',
      prefix: 'us',
      count: 22
    }
  ];

  const ROTATIONS = [-4, 3, -2.5, 4, -3.5, 2, -1.5, 3.5, -4.5, 2.5, -2, 3];

  const wallState = {
    building: false,
    cancelled: false,
    lightbox: null
  };

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function playPinSound() {
    if (typeof global.playPinPhotoSound === 'function') {
      global.playPinPhotoSound();
    }
  }

  async function typeWallText(element, text) {
    if (!element || !text) return;
    if (global.BirthdayApp?.typeElement) {
      await global.BirthdayApp.typeElement(element, text, true);
      return;
    }
    element.textContent = '';
    element.classList.remove('typing-pending');
    for (const char of text) {
      element.textContent += char;
      await delay(/[.,!?…]/.test(char) ? 70 : 18);
    }
  }

  function ensureLightbox() {
    if (wallState.lightbox) return wallState.lightbox;

    const box = document.createElement('div');
    box.id = 'wallLightbox';
    box.className = 'wall-lightbox';
    box.hidden = true;
    box.innerHTML = `
      <button type="button" class="wall-lightbox-backdrop" aria-label="Close photo"></button>
      <figure class="wall-lightbox-frame">
        <button type="button" class="wall-lightbox-close" aria-label="Close">×</button>
        <img src="" alt="Enlarged photo">
      </figure>
    `;

    const close = () => closeLightbox();
    box.querySelector('.wall-lightbox-backdrop')?.addEventListener('click', close);
    box.querySelector('.wall-lightbox-close')?.addEventListener('click', close);
    document.body.appendChild(box);
    wallState.lightbox = box;
    return box;
  }

  function openLightbox(src) {
    if (wallState.building) return;
    const box = ensureLightbox();
    const img = box.querySelector('.wall-lightbox-frame img');
    if (!img) return;
    img.src = src;
    box.hidden = false;
    box.classList.add('is-open');
    document.body.classList.add('wall-lightbox-open');
  }

  function closeLightbox() {
    const box = wallState.lightbox;
    if (!box) return;
    box.classList.remove('is-open');
    box.hidden = true;
    document.body.classList.remove('wall-lightbox-open');
    const img = box.querySelector('.wall-lightbox-frame img');
    if (img) img.src = '';
  }

  function photoPath(section, index) {
    const num = String(index + 1).padStart(2, '0');
    return `assets/photos/wall/${section.folder}/${section.prefix}-${num}.jpg`;
  }

  function buildPhotoEl(src, index, sectionIndex) {
    const rot = ROTATIONS[(index + sectionIndex * 3) % ROTATIONS.length];
    const el = document.createElement('figure');
    el.className = 'wall-photo';
    el.style.setProperty('--rot', `${rot}deg`);
    el.innerHTML = `
      <span class="wall-pushpin" aria-hidden="true"></span>
      <img src="${src}" alt="" loading="eager" decoding="async">
    `;
    el.addEventListener('click', () => {
      if (el.classList.contains('is-pinned')) {
        openLightbox(src);
      }
    });
    return el;
  }

  function resetPhotoWall(stage) {
    wallState.cancelled = true;
    wallState.building = false;
    closeLightbox();

    const wall = stage?.querySelector('#photoWall');
    const board = wall?.querySelector('.photo-wall-board');
    const nextBtn = stage?.querySelector('#stickerNextBtn');

    if (wall) {
      wall.classList.remove('is-visible', 'is-revealed', 'is-building', 'is-complete');
    }
    if (board) {
      board.classList.remove('is-revealed', 'is-building', 'is-complete');
    }
    if (nextBtn) {
      nextBtn.classList.remove('is-revealed');
      nextBtn.hidden = true;
      nextBtn.disabled = true;
    }

    WALL_SECTIONS.forEach((section) => {
      const panel = wall?.querySelector(`[data-wall-section="${section.id}"]`);
      const grid = panel?.querySelector('.wall-photos-grid');
      const title = panel?.querySelector('.wall-panel-title');
      const subtitle = panel?.querySelector('.wall-panel-subtitle');

      if (grid) grid.innerHTML = '';
      if (panel) {
        panel.hidden = true;
        panel.classList.remove('is-active', 'is-complete');
      }
      if (title) {
        title.textContent = '';
        title.classList.add('typing-pending');
      }
      if (subtitle) {
        subtitle.textContent = '';
        subtitle.classList.add('typing-pending');
      }
    });
  }

  async function revealSectionHeader(panel, section) {
    const title = panel.querySelector('.wall-panel-title');
    const subtitle = panel.querySelector('.wall-panel-subtitle');

    panel.hidden = false;
    panel.classList.add('is-active');
    await delay(120);

    await typeWallText(title, section.title);
    await delay(140);
    await typeWallText(subtitle, section.subtitle);
    await delay(200);
  }

  async function buildPhotoWallSequence(stage, { fast = false } = {}) {
    const wall = stage?.querySelector('#photoWall');
    const board = wall?.querySelector('.photo-wall-board');
    const nextBtn = stage?.querySelector('#stickerNextBtn');
    if (!wall || !board) return;

    wallState.cancelled = false;
    wallState.building = true;

    const flyMs = fast ? 260 : 360;
    const pinMs = fast ? 100 : 140;
    const gapMs = fast ? 45 : 60;
    const sectionGapMs = fast ? 280 : 420;

    board.classList.add('is-building');
    ensureLightbox();

    for (let sectionIndex = 0; sectionIndex < WALL_SECTIONS.length; sectionIndex += 1) {
      if (wallState.cancelled) return;

      const section = WALL_SECTIONS[sectionIndex];
      const panel = wall.querySelector(`[data-wall-section="${section.id}"]`);
      const grid = panel?.querySelector('.wall-photos-grid');
      if (!panel || !grid) continue;

      await revealSectionHeader(panel, section);
      if (wallState.cancelled) return;

      for (let i = 0; i < section.count; i += 1) {
        if (wallState.cancelled) return;

        const src = photoPath(section, i);
        const photo = buildPhotoEl(src, i, sectionIndex);
        grid.appendChild(photo);

        await delay(40);
        photo.classList.add('is-flying');

        await delay(flyMs);
        if (wallState.cancelled) return;

        photo.classList.remove('is-flying');
        photo.classList.add('is-settled');
        playPinSound();
        photo.classList.add('is-pinned');

        await delay(pinMs + gapMs);
      }

      panel.classList.add('is-complete');
      if (sectionIndex < WALL_SECTIONS.length - 1) {
        await delay(sectionGapMs);
      }
    }

    wallState.building = false;
    board.classList.remove('is-building');
    board.classList.add('is-complete');
    wall.classList.add('is-complete');

    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.disabled = false;
      nextBtn.classList.add('is-revealed');
    }
  }

  function preparePhotoWall(stage) {
    resetPhotoWall(stage);
    wallState.cancelled = false;
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });

  global.BirthdayPhotoWall = {
    preparePhotoWall,
    resetPhotoWall,
    buildPhotoWallSequence,
    closeLightbox,
    sections: WALL_SECTIONS
  };
})(window);
