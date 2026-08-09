/* ═══════════════════════════════════════════════════════════════
   SoodFlix — video player
   Custom controls over a plain <video>: scrubbing, volume, speed,
   PiP, fullscreen, keyboard shortcuts, resume-where-you-left-off
   and the "next episode in 10" card.
   ═══════════════════════════════════════════════════════════ */

const Player = (() => {
  const $ = (id) => document.getElementById(id);

  const el = {
    root: $('player'), video: $('video'), ui: $('playerUI'), missing: $('playerMissing'),
    back: $('playerBack'), show: $('playerShow'), ep: $('playerEp'), centerTitle: $('playerCenterTitle'),
    bigPlay: $('bigPlay'), play: $('btnPlay'), b10: $('btnBack10'), f10: $('btnFwd10'),
    mute: $('btnMute'), vol: $('volSlider'), now: $('timeNow'), total: $('timeTotal'),
    next: $('btnNext'), episodes: $('btnEpisodes'), speed: $('btnSpeed'), pip: $('btnPip'), full: $('btnFull'),
    scrub: $('scrub'), fill: $('scrubFill'), buffer: $('scrubBuffer'), tip: $('scrubTip'),
    upnext: $('upnext'), upnextCard: $('upnextCard'), upnextCount: $('upnextCount'),
    upnextPlay: $('upnextPlay'), upnextCancel: $('upnextCancel'),
  };

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  let current = null;        // the title being watched
  let epIndex = -1;          // -1 = the title itself, else an episode
  let idleTimer = null;
  let saveTimer = null;
  let countdown = null;
  let onExit = () => {};     // set by app.js so it can refresh rows

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
             : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const episodes = (item) =>
    item.episodes && item.episodes.length ? item.episodes : [];

  /* ── Open / close ─────────────────────────────────────────── */
  function open(item, index = -1) {
    current = item;
    epIndex = index;

    const eps = episodes(item);
    const ep = index >= 0 ? eps[index] : null;
    const src = (ep && ep.video) || item.video || '';

    el.show.textContent = item.title;
    el.ep.textContent = ep ? `S1:E${ep.n} ${ep.title}` : (item.duration || '');
    el.centerTitle.textContent = ep ? ep.title : item.title;
    el.next.hidden = !(eps.length && index < eps.length - 1);
    el.episodes.hidden = !eps.length;

    el.root.hidden = false;
    document.body.classList.add('is-locked');
    el.upnext.hidden = true;

    /* Reset the loading state for whatever we're about to play. */
    el.root.classList.remove('is-ready');
    buffering(false);

    if (!src) {
      el.missing.hidden = false;
      el.root.classList.add('is-empty');
      el.video.removeAttribute('src');
      el.video.load();
      el.root.classList.remove('is-playing');
      wake();
      return;
    }

    el.missing.hidden = true;
    el.root.classList.remove('is-empty');
    buffering(true);            // until the media says otherwise
    el.video.src = src;
    el.video.load();

    /* Resume from wherever this title was left. */
    const saved = Store.getProgress(progressId());
    if (saved && saved.pct < 95) {
      el.video.addEventListener('loadedmetadata', function once() {
        el.video.currentTime = saved.t;
        el.video.removeEventListener('loadedmetadata', once);
      });
    }

    el.video.play().catch(() => { /* autoplay blocked — the big play button covers it */ });
    wake();
    saveTimer = setInterval(saveProgress, 4000);
  }

  function close() {
    saveProgress();
    clearInterval(saveTimer);
    clearInterval(countdown);
    el.video.pause();
    el.video.removeAttribute('src');
    el.video.load();
    el.root.hidden = true;
    el.root.classList.remove('is-playing', 'is-ready', 'is-buffering');
    document.body.classList.remove('is-locked');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const finished = current;
    current = null;
    onExit(finished);
  }

  const progressId = () =>
    epIndex >= 0 ? `${current.id}::e${epIndex}` : current.id;

  function saveProgress() {
    if (!current || !el.video.duration) return;
    Store.setProgress(progressId(), el.video.currentTime, el.video.duration);
    /* Series progress also lands on the parent so the card shows a bar. */
    if (epIndex >= 0) Store.setProgress(current.id, el.video.currentTime, el.video.duration);
  }

  /* ── Transport ────────────────────────────────────────────── */
  const toggle = () => (el.video.paused ? el.video.play().catch(() => {}) : el.video.pause());
  const seekBy = (d) => { el.video.currentTime = Math.max(0, Math.min(el.video.duration || 0, el.video.currentTime + d)); wake(); };

  function playNext() {
    const eps = episodes(current);
    if (epIndex < eps.length - 1) open(current, epIndex + 1);
  }

  /* ── Idle chrome ──────────────────────────────────────────── */
  function wake() {
    el.root.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!el.video.paused) el.root.classList.add('is-idle');
    }, 3000);
  }

  /* ── Scrubbing ────────────────────────────────────────────── */
  function ratioFromEvent(e) {
    const r = el.scrub.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  }

  el.scrub.addEventListener('pointerdown', (e) => {
    if (!el.video.duration) return;
    el.scrub.setPointerCapture(e.pointerId);
    const scrubTo = (ev) => { el.video.currentTime = ratioFromEvent(ev) * el.video.duration; };
    scrubTo(e);
    const move = (ev) => scrubTo(ev);
    const up = () => {
      el.scrub.removeEventListener('pointermove', move);
      el.scrub.removeEventListener('pointerup', up);
    };
    el.scrub.addEventListener('pointermove', move);
    el.scrub.addEventListener('pointerup', up);
  });

  el.scrub.addEventListener('pointermove', (e) => {
    const r = ratioFromEvent(e);
    el.tip.textContent = fmt(r * (el.video.duration || 0));
    el.tip.style.left = `${r * 100}%`;
  });

  /* ── Buffering ────────────────────────────────────────────────
     Tied to what the media element actually reports, so on a fast
     connection the spinner never gets a chance to appear, and on a
     slow one it stays for exactly as long as the wait lasts. */
  const buffering = (on) => el.root.classList.toggle('is-buffering', !!on);

  const ready = () => {
    buffering(false);
    el.root.classList.add('is-ready');     // fades the picture up
  };

  el.video.addEventListener('canplay', ready);
  el.video.addEventListener('playing', ready);
  el.video.addEventListener('seeked',  ready);
  el.video.addEventListener('waiting', () => buffering(true));
  el.video.addEventListener('stalled', () => buffering(true));
  el.video.addEventListener('seeking', () => {
    if (el.video.readyState < 3) buffering(true);
  });
  el.video.addEventListener('error', () => buffering(false));

  /* ── Wiring ───────────────────────────────────────────────── */
  el.video.addEventListener('play',  () => { el.root.classList.add('is-playing'); wake(); });
  el.video.addEventListener('pause', () => { el.root.classList.remove('is-playing'); wake(); });

  el.video.addEventListener('timeupdate', () => {
    const d = el.video.duration || 0;
    const pct = d ? (el.video.currentTime / d) * 100 : 0;
    el.fill.style.width = `${pct}%`;
    el.now.textContent = fmt(el.video.currentTime);
    el.total.textContent = fmt(d);

    /* Offer the next episode over the last 15 seconds. */
    const eps = episodes(current || {});
    if (d && d - el.video.currentTime < 15 && epIndex >= 0 && epIndex < eps.length - 1) {
      showUpNext(eps[epIndex + 1]);
    }
  });

  el.video.addEventListener('progress', () => {
    if (!el.video.buffered.length || !el.video.duration) return;
    const end = el.video.buffered.end(el.video.buffered.length - 1);
    el.buffer.style.width = `${(end / el.video.duration) * 100}%`;
  });

  el.video.addEventListener('ended', () => {
    Store.clearProgress(progressId());
    const eps = episodes(current || {});
    if (epIndex >= 0 && epIndex < eps.length - 1) playNext();
    else close();
  });

  el.video.addEventListener('click', toggle);
  el.bigPlay.addEventListener('click', toggle);
  el.play.addEventListener('click', toggle);
  el.b10.addEventListener('click', () => seekBy(-10));
  el.f10.addEventListener('click', () => seekBy(10));
  el.back.addEventListener('click', close);
  el.next.addEventListener('click', playNext);

  el.mute.addEventListener('click', () => {
    el.video.muted = !el.video.muted;
    el.root.classList.toggle('is-muted', el.video.muted);
    el.vol.value = el.video.muted ? 0 : el.video.volume;
  });
  el.vol.addEventListener('input', () => {
    el.video.volume = +el.vol.value;
    el.video.muted = +el.vol.value === 0;
    el.root.classList.toggle('is-muted', el.video.muted);
  });

  el.speed.addEventListener('click', () => {
    const i = (SPEEDS.indexOf(el.video.playbackRate) + 1) % SPEEDS.length;
    el.video.playbackRate = SPEEDS[i];
    el.speed.querySelector('.pbtn__speed').textContent = `${SPEEDS[i]}x`;
  });

  el.pip.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.video.requestPictureInPicture();
    } catch { /* unsupported in this browser */ }
  });

  el.full.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.root.requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    el.root.classList.toggle('is-full', !!document.fullscreenElement);
  });

  el.root.addEventListener('pointermove', wake);
  el.root.addEventListener('pointerdown', wake);

  /* ── Up next ──────────────────────────────────────────────── */
  function showUpNext(ep) {
    if (!el.upnext.hidden) return;
    el.upnext.hidden = false;
    el.upnextCard.innerHTML = `
      <div class="episode__thumb" style="width:110px;${ep.thumb ? `background-image:url('${ep.thumb}')` : UI.artStyle({ id: current.id + ep.n })}"></div>
      <div><b>S1:E${ep.n}</b><br>${UI.esc(ep.title)}</div>`;
    let n = 10;
    el.upnextCount.textContent = n;
    countdown = setInterval(() => {
      el.upnextCount.textContent = --n;
      if (n <= 0) { clearInterval(countdown); el.upnext.hidden = true; playNext(); }
    }, 1000);
  }
  el.upnextPlay.addEventListener('click', () => {
    clearInterval(countdown); el.upnext.hidden = true; playNext();
  });
  el.upnextCancel.addEventListener('click', () => {
    clearInterval(countdown); el.upnext.hidden = true;
  });

  /* ── Keyboard ─────────────────────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    if (el.root.hidden) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    const map = {
      ' ': toggle, k: toggle,
      arrowleft: () => seekBy(-10), j: () => seekBy(-10),
      arrowright: () => seekBy(10),  l: () => seekBy(10),
      arrowup: () => { el.video.volume = Math.min(1, el.video.volume + .1); el.vol.value = el.video.volume; },
      arrowdown: () => { el.video.volume = Math.max(0, el.video.volume - .1); el.vol.value = el.video.volume; },
      f: () => el.full.click(),
      m: () => el.mute.click(),
      escape: () => (document.fullscreenElement ? document.exitFullscreen() : close()),
    };
    const fn = map[k] || map[e.key];
    if (fn) { e.preventDefault(); fn(); wake(); }
  });

  return {
    open,
    close,
    onExit(fn) { onExit = fn; },
    get isOpen() { return !el.root.hidden; },
    /* app.js hooks this up so the Episodes button can reopen the modal */
    onEpisodes(fn) { el.episodes.addEventListener('click', () => fn(current)); },
  };
})();
