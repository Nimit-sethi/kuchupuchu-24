(function initSketchPortrait(global) {
  const PORTRAIT_SRC = 'assets/photos/komal-portrait.png';
  const CAPTION_TEXT = 'Chand se utri hui, kokil kanth si apsara lag rahi ho 🤧🤍';

  const state = {
    running: false,
    rafId: null,
    abort: false
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

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function fitCanvasSize(wrap, img, maxW = 520, maxH = 680) {
    const ratio = img.width / img.height;
    let width = maxW;
    let height = Math.round(width / ratio);
    if (height > maxH) {
      height = maxH;
      width = Math.round(height * ratio);
    }
    const rect = wrap?.getBoundingClientRect();
    if (rect?.width) {
      const vwMax = Math.min(rect.width - 24, maxW);
      if (width > vwMax) {
        width = Math.floor(vwMax);
        height = Math.round(width / ratio);
      }
    }
    return { width, height };
  }

  function moveBrush(brush, wrap, canvas, x, y) {
    if (!brush || !wrap || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const sx = rect.left - wrapRect.left + (x / canvas.width) * rect.width;
    const sy = rect.top - wrapRect.top + (y / canvas.height) * rect.height;
    brush.style.left = `${sx}px`;
    brush.style.top = `${sy}px`;
  }

  function setBrushMode(brush, mode) {
    if (!brush) return;
    brush.classList.toggle('is-pencil', mode === 'pencil');
    brush.classList.toggle('is-color-pencil', mode === 'color');
  }

  function buildSketchTarget(sourceCanvas) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    const gray = document.createElement('canvas');
    gray.width = w;
    gray.height = h;
    const gctx = gray.getContext('2d');
    gctx.drawImage(sourceCanvas, 0, 0);
    const imageData = gctx.getImageData(0, 0, w, h);
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = lum;
      data[i + 1] = lum;
      data[i + 2] = lum;
    }
    gctx.putImageData(imageData, 0, 0);

    const inverted = document.createElement('canvas');
    inverted.width = w;
    inverted.height = h;
    const ictx = inverted.getContext('2d');
    ictx.filter = 'invert(1)';
    ictx.drawImage(gray, 0, 0);
    ictx.filter = 'none';

    const sketch = document.createElement('canvas');
    sketch.width = w;
    sketch.height = h;
    const sctx = sketch.getContext('2d');
    sctx.fillStyle = '#faf8f4';
    sctx.fillRect(0, 0, w, h);
    sctx.globalCompositeOperation = 'color-dodge';
    sctx.drawImage(inverted, 0, 0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.globalAlpha = 0.18;
    sctx.drawImage(gray, 0, 0);
    sctx.globalAlpha = 1;

    return sketch;
  }

  function collectSketchPoints(sketchCanvas, step = 3) {
    const w = sketchCanvas.width;
    const h = sketchCanvas.height;
    const { data } = sketchCanvas.getContext('2d').getImageData(0, 0, w, h);
    const points = [];

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        const lum = data[i];
        const darkness = 255 - lum;
        if (darkness < 9) continue;

        const band = Math.floor(y / 14);
        const order = band * 100000 + x + ((band * 29) % 41);
        points.push({
          x: x + (Math.random() - 0.5) * step * 0.5,
          y: y + (Math.random() - 0.5) * step * 0.35,
          darkness,
          order
        });
      }
    }

    points.sort((a, b) => a.order - b.order);
    return points;
  }

  function collectColorPoints(colorData, width, height, step = 4) {
    const points = [];
    const { data } = colorData;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max - min;
        const lum = r * 0.299 + g * 0.587 + b * 0.114;

        if (sat < 10 && (lum > 210 || lum < 28)) continue;

        const band = Math.floor(y / 18);
        const order = band * 100000 + x + ((band * 19) % 53);
        points.push({
          x: x + (Math.random() - 0.5) * step * 0.45,
          y: y + (Math.random() - 0.5) * step * 0.35,
          r,
          g,
          b,
          sat,
          lum,
          order
        });
      }
    }

    points.sort((a, b) => a.order - b.order);
    return points;
  }

  function paintPencilStroke(ctx, point, targetCtx, w, h) {
    const darkness = point.darkness / 255;
    const patch = 4;
    const sx = Math.max(0, Math.min(w - patch, Math.round(point.x) - 1));
    const sy = Math.max(0, Math.min(h - patch, Math.round(point.y) - 1));
    const patchData = targetCtx.getImageData(sx, sy, patch, patch);
    ctx.putImageData(patchData, sx, sy);

    if (darkness > 0.14 && Math.random() > 0.35) {
      const tone = Math.round(255 - point.darkness * 0.95);
      const alpha = 0.1 + darkness * 0.42;
      const angle = point.y * 0.06 + Math.random() * 0.55;
      const len = 2 + darkness * 9 + Math.random() * 5;

      ctx.strokeStyle = `rgba(${tone}, ${tone}, ${tone}, ${alpha})`;
      ctx.lineWidth = 0.5 + darkness * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + Math.cos(angle) * len, point.y + Math.sin(angle) * len);
      ctx.stroke();
    }
  }

  function paintColorPencilStroke(ctx, point) {
    const boost = 1.06;
    const r = Math.min(255, Math.round(point.r * boost));
    const g = Math.min(255, Math.round(point.g * boost));
    const b = Math.min(255, Math.round(point.b * boost));
    const satFactor = point.sat / 255;
    const alpha = 0.18 + satFactor * 0.34;
    const angle = -0.35 + Math.random() * 0.7;
    const len = 4 + satFactor * 10 + Math.random() * 8;

    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.4 + Math.random() * 2;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x + Math.cos(angle) * len, point.y + Math.sin(angle) * len);
    ctx.stroke();

    ctx.globalCompositeOperation = 'soft-light';
    const radius = 2.2 + satFactor * 2.5;
    const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.75})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function animateStrokes({
    canvas,
    brush,
    wrap,
    points,
    paintFn,
    batchSize,
    frameGap,
    onStart,
    extra
  }) {
    return new Promise((resolve) => {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      let index = 0;
      let lastTick = 0;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      onStart?.(ctx);

      const tick = (now = 0) => {
        if (state.abort) {
          resolve();
          return;
        }

        if (now - lastTick < frameGap) {
          state.rafId = requestAnimationFrame(tick);
          return;
        }

        lastTick = now;
        const end = Math.min(index + batchSize, points.length);

        for (; index < end; index += 1) {
          paintFn(ctx, points[index], extra, w, h);
        }

        if (points[index - 1]) {
          moveBrush(brush, wrap, canvas, points[index - 1].x, points[index - 1].y);
        }

        if (index >= points.length) {
          brush?.classList.remove('is-drawing');
          resolve();
          return;
        }

        state.rafId = requestAnimationFrame(tick);
      };

      brush?.classList.add('is-drawing');
      state.rafId = requestAnimationFrame(tick);
    });
  }

  function spawnPortraitSparkles(layer) {
    if (!layer) return;
    layer.innerHTML = '';
    layer.classList.add('is-active');

    const colors = ['#ffd166', '#ff8fab', '#ffc8dd', '#ffffff', '#cdb4db', '#bde0fe'];
    const count = 48;

    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement('span');
      spark.className = 'sketch-sparkle';
      const size = 4 + Math.random() * 8;
      spark.style.width = `${size}px`;
      spark.style.height = `${size}px`;
      spark.style.left = `${8 + Math.random() * 84}%`;
      spark.style.top = `${6 + Math.random() * 88}%`;
      spark.style.background = colors[i % colors.length];
      spark.style.setProperty('--spark-drift-x', `${(Math.random() - 0.5) * 36}px`);
      spark.style.setProperty('--spark-drift-y', `${-8 - Math.random() * 28}px`);
      spark.style.setProperty('--spark-delay', `${Math.random() * 1.4}s`);
      spark.style.setProperty('--spark-duration', `${1.8 + Math.random() * 2.2}s`);
      layer.appendChild(spark);
    }
  }

  function clearPortraitSparkles(root) {
    const layer = root?.querySelector('#sketchSparkleLayer');
    if (!layer) return;
    layer.innerHTML = '';
    layer.classList.remove('is-active');
  }

  function animatePencilSketch({ canvas, sketchTarget, brush, wrap }) {
    const targetCtx = sketchTarget.getContext('2d');
    const points = collectSketchPoints(sketchTarget, 3);

    return animateStrokes({
      canvas,
      brush,
      wrap,
      points,
      batchSize: 68,
      frameGap: 35,
      onStart: (ctx) => {
        ctx.fillStyle = '#faf8f4';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      },
      paintFn: paintPencilStroke,
      extra: targetCtx
    });
  }

  function animateColorPencils({ canvas, sourceCanvas, brush, wrap }) {
    const colorData = sourceCanvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const points = collectColorPoints(colorData, canvas.width, canvas.height, 4);

    return animateStrokes({
      canvas,
      brush,
      wrap,
      points,
      batchSize: 75,
      frameGap: 32,
      paintFn: (ctx, point) => paintColorPencilStroke(ctx, point)
    });
  }

  function finishColoredPortrait(canvas, sourceCanvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const painted = document.createElement('canvas');
    painted.width = w;
    painted.height = h;
    painted.getContext('2d').drawImage(canvas, 0, 0);

    return new Promise((resolve) => {
      let frame = 0;
      const total = 12;

      const tick = () => {
        if (state.abort) {
          resolve();
          return;
        }

        frame += 1;
        const t = frame / total;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(painted, 0, 0);
        ctx.globalAlpha = t * 0.55;
        ctx.drawImage(sourceCanvas, 0, 0);
        ctx.globalAlpha = 1;

        if (frame >= total) {
          ctx.filter = 'contrast(1.04) saturate(1.08)';
          ctx.drawImage(sourceCanvas, 0, 0);
          ctx.filter = 'none';
          resolve();
          return;
        }

        state.rafId = requestAnimationFrame(tick);
      };

      state.rafId = requestAnimationFrame(tick);
    });
  }

  async function revealCaptionAndButton(root) {
    const caption = root.querySelector('#sketchCaption');
    const nextBtn = root.querySelector('#sketchNextBtn');

    if (caption) {
      caption.hidden = false;
      caption.classList.add('is-visible');
      await typeElement(caption, CAPTION_TEXT);
    }

    await delay(400);

    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.disabled = false;
      nextBtn.classList.add('is-revealed');
    }
  }

  function resetSketchStage(stage) {
    const root = stage?.querySelector('#sketchStage');
    if (!root) return;

    state.abort = true;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
    state.running = false;
    state.abort = false;

    const canvas = root.querySelector('#sketchCanvas');
    const caption = root.querySelector('#sketchCaption');
    const nextBtn = root.querySelector('#sketchNextBtn');
    const brush = root.querySelector('#sketchPencil');
    const wrap = root.querySelector('.sketch-canvas-wrap');

    root.classList.remove('is-complete', 'is-drawing');

    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    }

    if (caption) {
      caption.hidden = true;
      caption.classList.remove('is-visible', 'typing-active');
      caption.classList.add('typing-pending');
      caption.textContent = '';
    }

    if (nextBtn) {
      nextBtn.hidden = true;
      nextBtn.disabled = true;
      nextBtn.classList.remove('is-revealed');
    }

    if (brush) {
      brush.classList.remove('is-drawing', 'is-color-pencil');
      brush.classList.add('is-pencil');
      brush.style.left = '50%';
      brush.style.top = '10%';
    }

    if (wrap) wrap.classList.remove('is-sketching', 'is-coloring', 'is-done');
    clearPortraitSparkles(root);
  }

  async function runSketchStage(stage) {
    const root = stage?.querySelector('#sketchStage');
    const canvas = root?.querySelector('#sketchCanvas');
    const wrap = root?.querySelector('.sketch-canvas-wrap');
    const brush = root?.querySelector('#sketchPencil');
    if (!root || !canvas || !wrap) return;

    resetSketchStage(stage);
    state.running = true;
    wrap.classList.add('is-sketching');
    setBrushMode(brush, 'pencil');

    try {
      const img = await loadImage(PORTRAIT_SRC);
      const { width, height } = fitCanvasSize(wrap, img);
      canvas.width = width;
      canvas.height = height;

      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = width;
      sourceCanvas.height = height;
      const sctx = sourceCanvas.getContext('2d');
      sctx.filter = 'contrast(1.04) saturate(1.1) brightness(1.01)';
      sctx.drawImage(img, 0, 0, width, height);
      sctx.filter = 'none';

      const sketchTarget = buildSketchTarget(sourceCanvas);

      await delay(460);
      await animatePencilSketch({ canvas, sketchTarget, brush, wrap });

      await delay(540);
      wrap.classList.add('is-coloring');
      setBrushMode(brush, 'color');
      await animateColorPencils({ canvas, sourceCanvas, brush, wrap });

      await finishColoredPortrait(canvas, sourceCanvas);

      wrap.classList.remove('is-sketching', 'is-coloring');
      wrap.classList.add('is-done');
      root.classList.add('is-complete');

      spawnPortraitSparkles(root.querySelector('#sketchSparkleLayer'));
      if (typeof global.SiteAudio?.playSpecialSting === 'function') {
        global.SiteAudio.playSpecialSting();
      } else if (typeof global.playPopSound === 'function') {
        global.playPopSound();
      }

      await delay(460);
      await revealCaptionAndButton(root);
    } catch (error) {
      console.error('Sketch portrait failed:', error);
      const caption = root.querySelector('#sketchCaption');
      if (caption) {
        caption.hidden = false;
        caption.textContent = CAPTION_TEXT;
      }
      root.querySelector('#sketchNextBtn')?.removeAttribute('hidden');
    } finally {
      state.running = false;
    }
  }

  global.BirthdaySketch = {
    runSketchStage,
    resetSketchStage
  };
})(window);
