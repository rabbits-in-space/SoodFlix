/* ═══════════════════════════════════════════════════════════════
   SoodFlix — trailer previews
   The muted clip that fades in over the artwork: on a card once
   you've hovered it, on the billboard a few seconds into a slide,
   and in the detail modal's hero.

   Everything degrades quietly. No trailer, no video, a missing
   file, a codec the browser won't touch, or a visitor who asked
   for reduced motion — in every one of those cases the artwork
   simply stays put and nothing breaks.
   ═══════════════════════════════════════════════════════════ */

const Preview = (() => {

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const playing = new Set();     // <video> elements currently mounted
  const stoppers = new Set();    // their teardown functions

  const ICON_MUTED = '<svg viewBox="0 0 24 24"><path d="M11 4 6 8H2v8h4l5 4V4Zm10.7 4.3-1.4-1.4L18 9.2l-2.3-2.3-1.4 1.4L16.6 10.6l-2.3 2.3 1.4 1.4L18 12l2.3 2.3 1.4-1.4-2.3-2.3 2.3-2.3Z"/></svg>';
  const ICON_SOUND = '<svg viewBox="0 0 24 24"><path d="M11 4 6 8H2v8h4l5 4V4Zm4.5 3.5a6 6 0 0 1 0 9l1.4 1.4a8 8 0 0 0 0-11.8L15.5 7.5Z"/></svg>';

  /* Every file worth trying, best first: a dedicated trailer, then the
     title's own video, then the first episode that has one.

     This is a list rather than a single pick because a path being set
     is no promise the file exists. media() fills in a trailer path for
     every title whether or not you've made one, so when that 404s we
     move down the list instead of giving up — which is what makes
     "add the media whenever you like" actually true. */
  function sources(item) {
    if (!item) return [];
    const ep = (item.episodes || []).find((e) => e.video);
    return [...new Set([item.trailer, item.video, ep && ep.video].filter(Boolean))];
  }

  const src = (item) => sources(item)[0] || '';

  /* ── Global mute, shared by every preview on the page ─────── */
  function paintButton(btn) {
    const muted = Store.getPreviewMuted();
    btn.innerHTML = muted ? ICON_MUTED : ICON_SOUND;
    btn.setAttribute('aria-label', muted ? 'Unmute preview' : 'Mute preview');
  }

  function setMuted(muted) {
    Store.setPreviewMuted(muted);
    playing.forEach((v) => { v.muted = muted; });
    document.querySelectorAll('.preview__mute').forEach(paintButton);
  }

  function muteButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preview__mute';
    paintButton(btn);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();               // don't open the title as well
      setMuted(!Store.getPreviewMuted());
    });
    return btn;
  }

  /* ── Mount a preview ───────────────────────────────────────────
     host        element the video covers (needs position: relative)
     delay       ms to wait before starting — the Netflix "settle"
     loop        cards loop; the billboard plays once and bows out
     buttonHost  where the mute toggle goes, defaults to host
     onStart/onEnd  callbacks so the billboard can pause its rotation

     Returns a teardown function. Call it and everything is undone.
     ---------------------------------------------------------- */
  function play(host, item, opts = {}) {
    const {
      delay = 0, loop = true, buttonHost = null, onStart, onEnd,
      maxMs = 0,          /* stop after this long even mid-clip */
    } = opts;

    const candidates = sources(item);

    let video = null;
    let btn = null;
    let timer = null;
    let watchdog = null;
    let cap = null;
    let index = 0;
    let done = false;
    let finished = false;

    function dropVideo() {
      clearTimeout(watchdog);
      clearTimeout(cap);
      if (host) host.classList.remove('is-previewing');   // artwork returns
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();                      // let the browser drop the buffer
      video.remove();
      playing.delete(video);
      video = null;
    }

    function teardown() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      dropVideo();
      if (btn) { btn.remove(); btn = null; }
      stoppers.delete(teardown);
    }

    /* This source didn't work out — try the next one down the list,
       and only give up once they're all exhausted. */
    function fail() {
      if (done) return;
      dropVideo();
      index += 1;
      if (index < candidates.length) start();
      else teardown();
    }

    /* Reached the end, or hit maxMs — fade out and hand back to the
       caller. Guarded because 'ended' and the cap can both fire. */
    function finish() {
      if (finished || done) return;
      finished = true;
      clearTimeout(cap);
      if (video) video.classList.remove('is-in');
      /* Dropped here rather than in teardown so the still artwork
         fades back up as the video fades down — a cross-fade instead
         of the picture popping back after a gap. */
      if (host) host.classList.remove('is-previewing');
      if (onEnd) onEnd();
      setTimeout(teardown, 400);         // let it fade before removing
    }

    /* The mute toggle only appears once something is actually playing,
       so a preview that never starts leaves no stray button behind. */
    function showButton() {
      if (btn) return;
      btn = muteButton();
      (buttonHost || host).appendChild(btn);
    }

    function start() {
      if (done) return;

      video = document.createElement('video');
      video.className = 'preview__video';
      video.src = candidates[index];
      video.muted = Store.getPreviewMuted();
      video.loop = loop;
      video.playsInline = true;
      video.preload = 'auto';

      /* 404, bad codec, blocked autoplay — fall through to the next
         candidate, and if there isn't one the artwork just stays. */
      video.addEventListener('error', fail, { once: true });

      /* Once we know the clip's real shape, decide whether it needs
         its edges softened — only if it's narrower than the space
         it's playing in. Full-bleed video is left alone. */
      video.addEventListener('loadedmetadata', () => {
        const box = host.getBoundingClientRect();
        if (!video.videoWidth || !box.height) return;
        const clip = video.videoWidth / video.videoHeight;
        const space = box.width / box.height;
        if (clip < space - 0.02) video.classList.add('is-narrow');
      }, { once: true });

      video.addEventListener('canplay', () => {
        clearTimeout(watchdog);
        video.classList.add('is-in');
        host.classList.add('is-previewing');   // still artwork steps back
        showButton();
        /* Long trailers shouldn't hold the billboard hostage. */
        if (maxMs) cap = setTimeout(finish, maxMs);
      }, { once: true });

      /* A file served fine but undecodable never fires 'error' — it
         just stalls. Don't wait on it forever. */
      watchdog = setTimeout(() => {
        if (video && !video.classList.contains('is-in')) fail();
      }, 8000);

      if (!loop) video.addEventListener('ended', finish, { once: true });

      host.appendChild(video);
      playing.add(video);

      video.play().then(() => onStart && onStart()).catch(fail);
    }

    if (!candidates.length || !host || reduced.matches) return teardown;

    stoppers.add(teardown);
    timer = setTimeout(start, delay);
    return teardown;
  }

  /* Kill every preview — used when the real player or the modal
     takes over, so nothing keeps playing underneath. */
  function stopAll() {
    [...stoppers].forEach((stop) => stop());
  }

  return { play, stopAll, src, sources, setMuted, isMuted: () => Store.getPreviewMuted() };
})();
