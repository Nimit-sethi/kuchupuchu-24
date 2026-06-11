(function initSiteAudio(global) {
  const PATHS = {
    bg: 'assets/bg-music.mp3?v=2',
    cake: 'assets/sting-cake.mp3',
    special: 'assets/sting-special.mp3',
    portrait: 'assets/sting-portrait.mp3'
  };

  const DEFAULT_BGM = 0.5;
  const BGM_SILENT = 0;
  const STING_FADE_IN_MS = 1600;
  const STING_FADE_OUT_MS = 1200;
  const BGM_FADE_OUT_MS = 900;
  const BGM_FADE_IN_MS = 2200;
  const NAV_STING_FADE_OUT_MS = 1500;
  const NAV_BGM_FADE_IN_MS = 2600;

  const STING_START_VOLUME = 0.08;

  let bgmEl;
  let savedBgmVolume = DEFAULT_BGM;
  let activeSting = null;
  let bgmStarted = false;
  let bgmFadeId = 0;
  let stingFadeId = 0;
  let bgmDuckedForSting = false;
  const stingPool = {};

  function getBgm() {
    if (!bgmEl) bgmEl = document.getElementById('bgMusic');
    return bgmEl;
  }

  function preloadSting(key) {
    if (stingPool[key]) return stingPool[key];
    const audio = new Audio(PATHS[key]);
    audio.preload = 'auto';
    stingPool[key] = audio;
    return audio;
  }

  let bgmSrcLoaded = '';

  function init() {
    const bgm = getBgm();
    if (!bgm) return;

    if (bgmSrcLoaded !== PATHS.bg) {
      bgm.src = PATHS.bg;
      bgm.load();
      bgmSrcLoaded = PATHS.bg;
    }
    bgm.loop = true;
    bgm.volume = savedBgmVolume;
    bgm.setAttribute('playsinline', '');

    Object.keys(PATHS).forEach((key) => {
      if (key !== 'bg') preloadSting(key);
    });
  }

  function bindGestureUnlock() {
    const unlock = () => startBgm();
    document.addEventListener('pointerdown', unlock, { once: true, capture: true });
    document.addEventListener('keydown', unlock, { once: true, capture: true });
  }

  function waitForAudioReady(audio, timeoutMs = 2500) {
    if (audio.readyState >= 2) return Promise.resolve();

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener('canplaythrough', finish);
        audio.removeEventListener('canplay', finish);
        resolve();
      };

      audio.addEventListener('canplaythrough', finish, { once: true });
      audio.addEventListener('canplay', finish, { once: true });
      audio.load();
      window.setTimeout(finish, timeoutMs);
    });
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function fadeAudioVolume(audio, from, to, durationMs, fadeKey) {
    if (!audio || durationMs <= 0) {
      if (audio) audio.volume = to;
      return Promise.resolve();
    }

    const token = fadeKey === 'bgm' ? ++bgmFadeId : ++stingFadeId;
    const start = performance.now();

    return new Promise((resolve) => {
      const step = (now) => {
        const isCurrent = fadeKey === 'bgm' ? token === bgmFadeId : token === stingFadeId;
        if (!isCurrent) {
          resolve();
          return;
        }

        const t = Math.min(1, (now - start) / durationMs);
        audio.volume = from + (to - from) * smoothstep(t);

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };

      audio.volume = from;
      requestAnimationFrame(step);
    });
  }

  function rememberBgmLevel() {
    const bgm = getBgm();
    if (!bgm) return;
    if (bgm.volume > 0.02) {
      savedBgmVolume = bgm.volume;
    } else if (!savedBgmVolume) {
      savedBgmVolume = DEFAULT_BGM;
    }
  }

  async function ensureBgmPlaying() {
    init();
    const bgm = getBgm();
    if (!bgm) return false;

    if (bgmStarted && !bgm.paused) return true;

    try {
      await waitForAudioReady(bgm);
      bgm.volume = bgm.volume || savedBgmVolume || DEFAULT_BGM;
      await bgm.play();
      bgmStarted = true;
      rememberBgmLevel();
      return true;
    } catch (error) {
      bindGestureUnlock();
      return false;
    }
  }

  async function startBgm() {
    init();
    const bgm = getBgm();
    if (!bgm) return false;

    if (bgmStarted && !bgm.paused && bgm.volume > 0.02) return true;

    savedBgmVolume = DEFAULT_BGM;

    try {
      await waitForAudioReady(bgm);
      bgm.volume = 0;
      await bgm.play();
      bgmStarted = true;
      await fadeAudioVolume(bgm, 0, DEFAULT_BGM, 1200, 'bgm');
      savedBgmVolume = DEFAULT_BGM;
      return true;
    } catch (error) {
      bindGestureUnlock();
      return false;
    }
  }

  async function fadeOutBgmForSting() {
    const bgm = getBgm();
    if (!bgm) return;

    rememberBgmLevel();
    await fadeAudioVolume(bgm, bgm.volume, BGM_SILENT, BGM_FADE_OUT_MS, 'bgm');
  }

  async function fadeInBgm(durationMs = BGM_FADE_IN_MS) {
    const bgm = getBgm();
    if (!bgm) return;

    await ensureBgmPlaying();
    const target = savedBgmVolume || DEFAULT_BGM;
    await fadeAudioVolume(bgm, bgm.volume, target, durationMs, 'bgm');
    savedBgmVolume = target;
  }

  function detachStingHandlers(audio) {
    if (!audio?.__stingEndHandler) return;
    audio.removeEventListener('ended', audio.__stingEndHandler);
    audio.__stingEndHandler = null;
  }

  async function stopActiveSting({ fadeOut = true, fadeMs = STING_FADE_OUT_MS } = {}) {
    if (!activeSting) return false;

    const audio = activeSting;
    activeSting = null;
    ++stingFadeId;
    detachStingHandlers(audio);

    if (fadeOut && !audio.paused) {
      const from = audio.volume;
      await fadeAudioVolume(audio, from, 0, fadeMs, 'sting');
    }

    audio.pause();
    audio.currentTime = 0;
    return true;
  }

  function createStingAudio(key) {
    preloadSting(key);
    const audio = new Audio(PATHS[key]);
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    return audio;
  }

  async function playSting(key, {
    volume = 0.88,
    duckBgm = true,
    restoreAfter = true
  } = {}) {
    if (!PATHS[key]) return;

    await stopActiveSting({ fadeOut: true });
    await ensureBgmPlaying();

    if (duckBgm) {
      await fadeOutBgmForSting();
      bgmDuckedForSting = true;
    } else {
      bgmDuckedForSting = false;
    }

    const audio = createStingAudio(key);
    const targetVolume = volume;
    audio.volume = STING_START_VOLUME;
    activeSting = audio;

    const onEnd = async () => {
      if (activeSting !== audio) return;
      activeSting = null;
      detachStingHandlers(audio);
      await fadeAudioVolume(audio, audio.volume, 0, STING_FADE_OUT_MS, 'sting');
      audio.pause();
      if (restoreAfter && bgmDuckedForSting) {
        await fadeInBgm();
        bgmDuckedForSting = false;
      }
    };

    audio.__stingEndHandler = onEnd;
    audio.addEventListener('ended', onEnd);

    try {
      await waitForAudioReady(audio, 1500);
      await audio.play();
      fadeAudioVolume(audio, STING_START_VOLUME, targetVolume, STING_FADE_IN_MS, 'sting');
    } catch (error) {
      onEnd();
    }
  }

  async function stopStingAndResumeBgm() {
    const hadSting = Boolean(activeSting);
    const needsBgmRestore = bgmDuckedForSting || getBgm()?.volume < 0.02;
    await stopActiveSting({ fadeOut: true, fadeMs: NAV_STING_FADE_OUT_MS });
    if (hadSting && needsBgmRestore) {
      await fadeInBgm(NAV_BGM_FADE_IN_MS);
    }
    bgmDuckedForSting = false;
  }

  function playCakeSting() {
    return playSting('cake', { volume: 0.92 });
  }

  function playSpecialSting() {
    return playSting('special', {
      volume: 0.58,
      duckBgm: false,
      restoreAfter: false
    });
  }

  function playPortraitSting() {
    return playSting('portrait', { volume: 0.88 });
  }

  async function stopAll({ restoreBgm = true } = {}) {
    if (restoreBgm) {
      await stopStingAndResumeBgm();
    } else {
      await stopActiveSting({ fadeOut: true, fadeMs: NAV_STING_FADE_OUT_MS });
    }
  }

  function softenForSecretWish() {
    const bgm = getBgm();
    if (!bgm) return null;
    const before = bgm.volume;
    rememberBgmLevel();
    fadeAudioVolume(bgm, bgm.volume, Math.max(BGM_SILENT, before * 0.22), 500, 'bgm');
    return before;
  }

  function restoreFromSecretWish(before) {
    const target = typeof before === 'number' ? before : savedBgmVolume;
    const bgm = getBgm();
    if (!bgm) return;
    fadeAudioVolume(bgm, bgm.volume, target, BGM_FADE_IN_MS, 'bgm');
    savedBgmVolume = target;
  }

  global.SiteAudio = {
    init,
    startBgm,
    bindGestureUnlock,
    playCakeSting,
    playSpecialSting,
    playPortraitSting,
    stopAll,
    stopStingAndResumeBgm,
    stopActiveSting,
    fadeInBgm,
    softenForSecretWish,
    restoreFromSecretWish,
    isBgmStarted: () => bgmStarted
  };

  init();
  bindGestureUnlock();
})(window);
