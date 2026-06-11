(function initBirthdayDebug() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') !== '1') return;

  document.documentElement.classList.add('debug-mode');
  document.body.classList.add('debug-mode');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/debug.css';
  document.head.appendChild(link);

  const STAGE_LABELS = ['Cake', 'Booklet', 'Surprise', 'Photo Wall', 'Portrait', 'Final'];

  function buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'debugPanel';
    panel.innerHTML = `
      <span class="debug-badge">Debug live</span>
      <div class="debug-group" data-group="stages">
        <span class="debug-label">Stage</span>
      </div>
      <div class="debug-group" data-group="booklet" hidden>
        <span class="debug-label">Book page</span>
      </div>
      <div class="debug-group" data-group="wishes" hidden>
        <span class="debug-label">Final</span>
        <button type="button" data-wishes-secret>Secret Wish</button>
      </div>
      <button type="button" class="debug-reload" data-action="reload">Reload</button>
      <span class="debug-status">Live preview · edits auto-refresh</span>
    `;

    const stageGroup = panel.querySelector('[data-group="stages"]');
    STAGE_LABELS.forEach((label, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.stage = String(index);
      stageGroup.appendChild(btn);
    });

    const bookletGroup = panel.querySelector('[data-group="booklet"]');
    for (let page = 1; page <= 9; page += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = String(page);
      btn.dataset.page = String(page);
      bookletGroup.appendChild(btn);
    }

    panel.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;

      if (target.dataset.action === 'reload') {
        window.location.reload();
        return;
      }

      const app = window.BirthdayApp;
      if (!app) return;

      if (target.dataset.stage !== undefined) {
        const stageIndex = Number(target.dataset.stage);
        window.SiteAudio?.stopStingAndResumeBgm?.();
        app.showStage(stageIndex, { debug: true });
        syncPanel(app);
        return;
      }

      if (target.dataset.wishesSecret !== undefined) {
        const finalStage = document.getElementById('stage6');
        if (app.getActiveStageIndex() !== 5) {
          app.showStage(5, { debug: true, wishesSecret: true });
        } else {
          window.BirthdayWishes?.debugJumpToSecretWish?.(finalStage);
        }
        syncPanel(app);
        return;
      }

      if (target.dataset.page !== undefined) {
        app.openFlipbookAtPage(Number(target.dataset.page));
        syncPanel(app);
      }
    });

    document.body.appendChild(panel);
    return panel;
  }

  function syncPanel(app) {
    const panel = document.getElementById('debugPanel');
    if (!panel || !app) return;

    panel.querySelectorAll('[data-stage]').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.stage) === app.getActiveStageIndex());
    });

    const bookletGroup = panel.querySelector('[data-group="booklet"]');
    const wishesGroup = panel.querySelector('[data-group="wishes"]');
    const onBooklet = app.getActiveStageIndex() === 1;
    const onFinal = app.getActiveStageIndex() === 5;
    bookletGroup.hidden = !onBooklet;
    if (wishesGroup) wishesGroup.hidden = !onFinal;

    if (onBooklet) {
      const pageNum = app.getFlipbookPageNumber();
      panel.querySelectorAll('[data-page]').forEach((btn) => {
        btn.classList.toggle('is-active', Number(btn.dataset.page) === pageNum);
      });
    }
  }

  function bootstrap() {
    const app = window.BirthdayApp;
    if (!app) {
      requestAnimationFrame(bootstrap);
      return;
    }

    buildPanel();
    app.bootstrapDebug(params);
    syncPanel(app);

    window.addEventListener('birthday:stagechange', () => syncPanel(app));
    window.addEventListener('birthday:flipbookchange', () => syncPanel(app));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
