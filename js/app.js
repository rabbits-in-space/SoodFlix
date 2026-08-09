/* ═══════════════════════════════════════════════════════════════
   SoodFlix — application
   Boot sequence, navigation, billboard carousel, row paging,
   card hover, search, and the detail modal.
   ═══════════════════════════════════════════════════════════ */

(() => {
  const $  = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);

  /* ── Title index ──────────────────────────────────────────── */
  const INDEX = new Map();
  [...SOODFLIX.featured, ...SOODFLIX.rows.flatMap((r) => r.items)]
    .forEach((item) => INDEX.set(item.id, item));

  const byId  = (id) => INDEX.get(id);
  const touch = window.matchMedia('(max-width: 620px)');

  /* A kids profile only ever sees U and PG, everywhere — rows,
     search, billboard and "More Like This" all draw from here. */
  const KIDS_RATINGS = ['U', 'PG'];
  const allowed = (i) =>
    !profile || !profile.kids || KIDS_RATINGS.includes(i.rating);

  const pool = () => [...INDEX.values()].filter(allowed);

  let view = 'home';
  let profile = null;          // set once a profile is chosen

  /* ═══════════════════════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════════════════ */
  $('year').textContent = new Date().getFullYear();

  /* ── Splash + intro sound ─────────────────────────────────────
     The wordmark holds until the intro sound finishes, so the two
     stay in sync however long your mp3 is. Nothing to configure.

     Three things can end it, whichever comes first:
       · the sound finishing            (the intended path)
       · SPLASH_MIN, if there's no sound, the file is missing, or
         the browser refuses to autoplay it
       · SPLASH_MAX, a safety net so a long or stalled file can
         never strand anyone on a black screen
     ---------------------------------------------------------- */
  const SPLASH_MIN = 2600;      // never shorter than this
  const SPLASH_MAX = 15000;     // never longer, whatever happens
  const ENTER_FADE = 750;       // enter gate cross-fading to black
  const BEAT = 750;             // the held black beat before the logo
  const SYNC_GRACE = 600;       // longest we'll wait on audio to start

  let splashStart = 0;          // set the moment the wordmark begins
  let splashEnding = false;

  function endSplash() {
    if (splashEnding) return;
    splashEnding = true;

    /* A very short sound shouldn't cut the animation off mid-flight. */
    const wait = Math.max(0, SPLASH_MIN - (Date.now() - splashStart));

    setTimeout(() => {
      const el = $('splash');
      if (!el) { showProfileGate(); return; }
      el.classList.add('is-leaving');
      setTimeout(() => { el.remove(); showProfileGate(); }, 560);
    }, wait);
  }

  /* ── The sequence ─────────────────────────────────────────────
     enter gate → click → gate fades → held black beat → wordmark
     and sound begin together → wordmark holds → sound ends → zoom
     out → "Who's watching?"

     Preloading the audio starts immediately so it's ready by the
     time the beat is over and nothing has to buffer on screen. */
  const audio = $('introSound');
  if (SOODFLIX.introSound) {
    audio.src = SOODFLIX.introSound;
    audio.volume = SOODFLIX.introVolume ?? 0.7;
    audio.load();
  }

  $('enterBtn').addEventListener('click', launch, { once: true });

  /* Enter or Space anywhere works too, so you don't have to aim. */
  document.addEventListener('keydown', function enterKey(e) {
    if ($('enterGate') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      document.removeEventListener('keydown', enterKey);
      launch();
    }
  });

  let launched = false;

  function launch() {
    if (launched) return;            // a click and an Enter can both land
    launched = true;

    /* Reveal the black splash UNDERNEATH before fading the gate. The
       page behind is #141414 grey, so fading the gate out first left
       the gradient dissolving to grey and then cutting to black —
       that's the jump. Cross-fading straight onto black is smooth. */
    $('splash').hidden = false;      // black, wordmark still invisible

    const gate = $('enterGate');
    gate.classList.add('is-leaving');

    setTimeout(() => {
      gate.remove();
      setTimeout(startSplash, BEAT);   // let it sit for a moment
    }, ENTER_FADE);
  }

  function startSplash() {
    const splash = $('splash');
    let begun = false;

    /* The wordmark's entrance is triggered here rather than on page
       load, so it can start on the audio's 'playing' event — that's
       what actually keeps picture and sound together. */
    function begin() {
      if (begun) return;
      begun = true;
      splashStart = Date.now();

      /* How long the wordmark holds: the clip's real length when we
         know it, otherwise the fixed minimum. */
      const ms = audio.duration * 1000;
      const hold = (isFinite(ms) && ms > SPLASH_MIN) ? ms : SPLASH_MIN;

      /* Hand the length to CSS so the slow push-in lasts exactly as
         long as the sound does. */
      splash.style.setProperty('--intro-hold', `${Math.round(hold)}ms`);
      splash.classList.add('is-running');

      /* Taper the sound into the transition instead of chopping it
         off. Scaled down for short clips so a 2.6s intro isn't
         fading for half its life. */
      const fade = Math.min(1200, hold * 0.35);
      setTimeout(() => fadeOutAudio(fade), Math.max(0, hold - fade));

      setTimeout(endSplash, hold);
      setTimeout(endSplash, SPLASH_MAX);          // backstop
      audio.addEventListener('ended', endSplash, { once: true });
      audio.addEventListener('error', endSplash, { once: true });
    }

    if (!SOODFLIX.introSound) { begin(); return; }

    /* Start the picture the instant sound actually comes out. If the
       audio never gets going — missing file, odd codec, a browser
       that still says no — begin anyway rather than stall. */
    audio.addEventListener('playing', begin, { once: true });
    audio.play().catch(begin);
    setTimeout(begin, SYNC_GRACE);
  }

  /* Ramp the volume down rather than stopping dead.

     Deliberately an interval rather than requestAnimationFrame:
     rAF stops entirely in a background tab, which would leave the
     sound at full volume and never pause it. Progress comes from
     timestamps, so throttled ticks still finish on time. */
  function fadeOutAudio(ms) {
    if (!audio || audio.paused) return;

    const from = audio.volume;
    const t0 = Date.now();

    const tick = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      audio.volume = Math.max(0, from * (1 - k));
      if (k >= 1) {
        clearInterval(tick);
        audio.pause();
      }
    }, 40);
  }

  /* ═══════════════════════════════════════════════════════════
     PROFILES
     The list is persisted by Store, so one added here is still
     here next visit. data.js only seeds the very first load.
     ═══════════════════════════════════════════════════════ */
  const ICON_PLUS_BIG = '<svg viewBox="0 0 24 24"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg>';
  const ICON_PENCIL = '<svg viewBox="0 0 24 24"><path d="M3 17.25 13.9 6.35l3.75 3.75L6.75 21H3v-3.75Zm16.7-9.6-1.9-1.9 1.2-1.2a1 1 0 0 1 1.4 0l1.1 1.1a1 1 0 0 1 0 1.4l-1.2 1.2Z"/></svg>';

  let managing = false;

  const profiles = () => Store.getProfiles(SOODFLIX.profiles);

  function showProfileGate(manage = false) {
    managing = manage;
    renderProfileGate();
    $('profileEditor').hidden = true;
    $('profileGate').hidden = false;
    $('browse').hidden = true;
  }

  function renderProfileGate() {
    const list = $('profileList');
    const lastId = Store.getLastProfileId();

    $('gateTitle').textContent = managing ? 'Manage Profiles' : "Who's watching?";
    $('manageProfiles').textContent = managing ? 'Done' : 'Manage Profiles';
    list.classList.toggle('is-managing', managing);
    list.innerHTML = '';

    profiles().forEach((p) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <button type="button">
          <span class="profile-tile">
            <img src="${p.avatar}" alt="" />
            <span class="profile-edit-badge">${ICON_PENCIL}</span>
          </span>
          <span class="profile-name">${UI.esc(p.name)}${
            !managing && p.id === lastId ? '<small>Last watched</small>' : ''
          }</span>
        </button>`;
      li.querySelector('button').addEventListener('click', () =>
        managing ? openEditor(p) : enter(p));
      list.appendChild(li);
    });

    /* Add Profile uses exactly the same tile markup, so it lines up
       with the avatars instead of drifting out of the row. */
    const add = document.createElement('li');
    add.innerHTML = `
      <button type="button">
        <span class="profile-tile profile-tile--add">${ICON_PLUS_BIG}</span>
        <span class="profile-name">Add Profile</span>
      </button>`;
    add.querySelector('button').addEventListener('click', () => openEditor(null));
    list.appendChild(add);
  }

  $('manageProfiles').addEventListener('click', () => {
    managing = !managing;
    renderProfileGate();
  });

  function enter(p) {
    profile = p;
    Store.setProfileId(p.id);
    $('accountAvatar').src = p.avatar;
    $('profileGate').hidden = true;
    $('profileEditor').hidden = true;
    $('browse').hidden = false;
    window.scrollTo(0, 0);
    buildBillboard();
    render();
    buildAccountMenu();
    buildNavDropdown();
  }

  /* ── Profile editor ───────────────────────────────────────── */
  let editing = null;          // the profile being edited, null when adding
  let chosenColour = 0;

  function openEditor(p) {
    editing = p;
    chosenColour = 0;

    if (p) {
      /* Land on the colour this profile already uses, if we can tell. */
      const i = AVATAR_COLOURS.findIndex((c) => p.avatar === avatar(c[0], c[1]));
      chosenColour = i === -1 ? 0 : i;
    }

    $('editorTitle').textContent = p ? 'Edit Profile' : 'Add Profile';
    $('editorLead').textContent = p
      ? 'Change the name, colour or kids setting for this profile.'
      : 'Add a profile for another person watching SoodFlix.';
    $('editorName').value = p ? p.name : '';
    $('editorKids').checked = p ? !!p.kids : false;
    $('editorDelete').hidden = !p || profiles().length <= 1;
    $('editorError').hidden = true;

    renderSwatches();
    paintEditorAvatar();

    $('profileGate').hidden = true;
    $('profileEditor').hidden = false;
    $('editorName').focus();
  }

  function renderSwatches() {
    const box = $('editorSwatches');
    box.innerHTML = '';
    AVATAR_COLOURS.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === chosenColour ? 'is-on' : '';
      b.setAttribute('aria-label', `Avatar colour ${i + 1}`);
      b.innerHTML = `<img src="${avatar(c[0], c[1])}" alt="" />`;
      b.addEventListener('click', () => {
        chosenColour = i;
        renderSwatches();
        paintEditorAvatar();
      });
      box.appendChild(b);
    });
  }

  function paintEditorAvatar() {
    const c = AVATAR_COLOURS[chosenColour];
    $('editorAvatar').src = avatar(c[0], c[1]);
  }

  $('editorForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = $('editorName').value.trim();
    const err = $('editorError');

    if (!name) {
      err.textContent = 'Please enter a name.';
      err.hidden = false;
      $('editorName').focus();
      return;
    }
    const clash = profiles().some((p) =>
      p.name.toLowerCase() === name.toLowerCase() && (!editing || p.id !== editing.id));
    if (clash) {
      err.textContent = 'You already have a profile with that name.';
      err.hidden = false;
      $('editorName').focus();
      return;
    }

    const c = AVATAR_COLOURS[chosenColour];
    const fields = { name, avatar: avatar(c[0], c[1]), kids: $('editorKids').checked };

    if (editing) {
      const updated = Store.updateProfile(editing.id, fields);
      /* Editing the profile you're signed in as should update the nav. */
      if (profile && profile.id === updated.id) {
        profile = updated;
        $('accountAvatar').src = updated.avatar;
        render();
      }
      toast(`Saved ${updated.name}`);
    } else {
      Store.addProfile(fields);
      toast(`Added ${name}`);
    }

    editing = null;
    managing = false;
    showProfileGate();
  });

  $('editorCancel').addEventListener('click', () => {
    editing = null;
    showProfileGate();
  });

  $('editorDelete').addEventListener('click', () => {
    if (!editing) return;
    const name = editing.name;
    if (!window.confirm(`Delete ${name}? Their watch history and My List will be removed.`)) return;

    const wasCurrent = profile && profile.id === editing.id;
    Store.removeProfile(editing.id);
    editing = null;
    managing = false;
    toast(`Deleted ${name}`);

    if (wasCurrent) profile = null;
    showProfileGate();
  });

  /* ═══════════════════════════════════════════════════════════
     NAV
     ═══════════════════════════════════════════════════════ */
  const nav = $('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-solid', window.scrollY > 60);
  }, { passive: true });

  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      go(a.dataset.nav);
    });
  });

  function go(next) {
    view = next;
    document.querySelectorAll('.nav__link').forEach((l) =>
      l.classList.toggle('is-active', l.dataset.nav === next));
    qs('#navDropdownMenu') && qs('#navDropdownMenu').querySelectorAll('a').forEach((l) =>
      l.classList.toggle('is-active', l.dataset.nav === next));
    closeMenus();
    $('searchInput').value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render();
  }

  function buildNavDropdown() {
    const menu = $('navDropdownMenu');
    menu.innerHTML = [...document.querySelectorAll('.nav__links .nav__link')]
      .map((l) => `<a href="#" data-nav="${l.dataset.nav}" class="${l.classList.contains('is-active') ? 'is-active' : ''}">${l.textContent}</a>`)
      .join('');
    menu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', (e) => { e.preventDefault(); go(a.dataset.nav); }));
  }

  $('navDropdownBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const open = $('navDropdownMenu').hidden;
    closeMenus();
    $('navDropdownMenu').hidden = !open;
    $('navDropdownBtn').setAttribute('aria-expanded', String(open));
  });

  /* ── Search ───────────────────────────────────────────────── */
  const searchBox = $('search');
  const searchInput = $('searchInput');

  $('searchToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    searchBox.classList.toggle('is-open');
    if (searchBox.classList.contains('is-open')) searchInput.focus();
    else { searchInput.value = ''; render(); }
  });

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 220);
  });

  function searchResults(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return null;
    return pool().filter((i) =>
      [i.title, ...(i.genres || []), ...(i.cast || [])]
        .join(' ').toLowerCase().includes(needle));
  }

  /* ── Account menu ─────────────────────────────────────────── */
  function buildAccountMenu() {
    const others = profiles().filter((p) => p.id !== profile.id);

    $('accountProfiles').innerHTML = others
      .map((p) => `<li><button data-profile="${p.id}"><img src="${p.avatar}" alt=""><span>${UI.esc(p.name)}</span></button></li>`)
      .join('');

    $('accountProfiles').querySelectorAll('[data-profile]').forEach((b) =>
      b.addEventListener('click', () => {
        enter(profiles().find((p) => p.id === b.dataset.profile));
        closeMenus();
      }));
  }

  $('accountBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const open = $('accountMenu').hidden;
    closeMenus();
    $('accountMenu').hidden = !open;
    $('accountBtn').setAttribute('aria-expanded', String(open));
  });

  $('accountMenu').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    closeMenus();

    switch (btn.dataset.action) {
      case 'signout':
        Store.clearProfile();
        showProfileGate();
        break;
      case 'manage':
        showProfileGate(true);
        break;
      default:
        toast('Coming soon.');
    }
  });

  function closeMenus() {
    $('accountMenu').hidden = true;
    $('navDropdownMenu').hidden = true;
    $('accountBtn').setAttribute('aria-expanded', 'false');
    $('navDropdownBtn').setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.account, .nav__dropdown')) closeMenus();
    if (!e.target.closest('.search') && !searchInput.value) searchBox.classList.remove('is-open');
  });

  /* ═══════════════════════════════════════════════════════════
     BILLBOARD
     ═══════════════════════════════════════════════════════ */
  let bbIndex = 0;
  let bbTimer = null;
  let bbWired = false;
  let bbStopPreview = null;

  /* Featured list the current profile is allowed to see. Kept as a
     function because switching profiles can change it. */
  function featured() {
    const ok = SOODFLIX.featured.filter(allowed);
    return ok.length ? ok : SOODFLIX.featured.slice(0, 1);
  }

  function buildBillboard() {
    const slides = $('billboardSlides');
    const dots = $('billboardDots');
    slides.innerHTML = '';
    dots.innerHTML = '';

    featured().forEach((item, i) => {
      slides.appendChild(UI.slide(item));
      const dot = document.createElement('button');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => showSlide(i));
      dots.appendChild(dot);
    });

    showSlide(0);
    restartBillboard();

    /* Switching profiles rebuilds the slides but must not stack up a
       second set of listeners. */
    if (bbWired) return;
    bbWired = true;

    $('bbPrev').addEventListener('click', () => showSlide(bbIndex - 1));
    $('bbNext').addEventListener('click', () => showSlide(bbIndex + 1));

    $('billboardContent').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const item = featured()[bbIndex];
      if (btn.dataset.act === 'play') play(item);
      else openModal(item);
    });

    /* Pause the rotation while the pointer is over the billboard. */
    $('billboard').addEventListener('mouseenter', () => clearInterval(bbTimer));
    $('billboard').addEventListener('mouseleave', restartBillboard);
  }

  function showSlide(i) {
    const list = featured();
    const n = list.length;
    bbIndex = (i + n) % n;
    const item = list[bbIndex];

    if (bbStopPreview) { bbStopPreview(); bbStopPreview = null; }

    const slides = [...$('billboardSlides').children];
    slides.forEach((s, k) => s.classList.toggle('is-active', k === bbIndex));
    [...$('billboardDots').children].forEach((d, k) =>
      d.classList.toggle('is-active', k === bbIndex));

    $('billboardContent').innerHTML = UI.billboardCopy(item);
    $('billboardSide').innerHTML =
      `<span class="bb__side-rating">${UI.esc(item.rating || 'PG')}</span>`;
    restartBillboard();

    /* The trailer takes over a few seconds in, and holds the carousel
       until it finishes — the same way Netflix stops rotating while
       a preview is running. */
    bbStopPreview = Preview.play(slides[bbIndex], item, {
      delay: 4000,
      loop: false,
      maxMs: 10000,          /* a long trailer shouldn't stall the carousel */
      buttonHost: $('billboardSide'),
      onStart: () => clearInterval(bbTimer),
      onEnd: restartBillboard,
    });
  }

  function restartBillboard() {
    clearInterval(bbTimer);
    bbTimer = setInterval(() => showSlide(bbIndex + 1), 8000);
  }

  /* ═══════════════════════════════════════════════════════════
     ROWS
     ═══════════════════════════════════════════════════════ */
  function rowsForView() {
    const all = pool().filter((i) => !SOODFLIX.featured.includes(i));

    switch (view) {
      case 'series':
        return [{ id: 'v-ser', title: 'TV Shows', type: 'standard', items: all.filter((i) => i.kind === 'series') }]
          .concat(chunkRows(all.filter((i) => i.kind === 'series'), ['Bingeworthy', 'Critically Acclaimed', 'New This Week']));
      case 'films':
        return [{ id: 'v-film', title: 'Movies', type: 'standard', items: all.filter((i) => i.kind === 'film') }]
          .concat(chunkRows(all.filter((i) => i.kind === 'film'), ['Blockbusters', 'Hidden Gems', 'Watch in One Sitting']));
      case 'new':
        return [{ id: 'v-new', title: 'New on SoodFlix', type: 'standard', items: all.filter((i) => i.isNew) },
                { id: 'v-top', title: 'Top 10 This Week', type: 'top10', items: all.slice(0, 10) }];
      case 'kids':
        return chunkRows(all.filter((i) => ['U', 'PG'].includes(i.rating)), ['Family Favourites', 'Cartoons', 'Learn Something']);
      case 'languages':
        return SOODFLIX.languages.slice(0, 5).map((lang, i) => ({
          id: `v-lang-${i}`, title: `${lang} Titles`, type: 'standard',
          items: all.filter((_, k) => k % SOODFLIX.languages.length === i),
        }));
      case 'mylist': {
        const items = Store.getList().map(byId).filter(Boolean);
        return [{
          id: 'v-mylist', title: 'My List', type: 'standard', items,
          empty: 'Titles you add to My List will appear here.',
        }];
      }
      default:
        return SOODFLIX.rows.map(resolveRow);
    }
  }

  /* Strip anything the current profile isn't allowed to see. */
  function gate(rows) {
    return rows.map((r) => ({ ...r, items: (r.items || []).filter(allowed) }));
  }

  /* Split a pool into a few themed rows so a filtered view still
     looks like Netflix rather than one long shelf. */
  function chunkRows(items, titles) {
    const size = Math.max(6, Math.ceil(items.length / titles.length));
    return titles.map((title, i) => ({
      id: `chunk-${i}`, title, type: 'standard',
      items: items.slice(i * size, i * size + size),
    })).filter((r) => r.items.length);
  }

  /* Continue Watching and My List are computed, not authored. */
  function resolveRow(def) {
    if (def.type === 'continue') {
      const watched = Store.watchedIds()
        .map((id) => byId(id.split('::')[0]))
        .filter(Boolean);
      const seen = new Set();
      const items = watched.filter((i) => !seen.has(i.id) && seen.add(i.id));
      return {
        ...def,
        title: def.title.replace('{profile}', profile ? profile.name : 'you'),
        /* Nothing watched yet — keep the authored placeholders visible
           so the row doesn't disappear on a fresh install. */
        items: items.length ? items : def.items,
      };
    }
    if (def.type === 'mylist') {
      return { ...def, items: Store.getList().map(byId).filter(Boolean) };
    }
    return def;
  }

  function render() {
    const q = searchInput.value;
    const found = searchResults(q);

    /* Search takes over the page, exactly like Netflix. */
    $('billboard').hidden = !!found || view !== 'home';
    $('rows').hidden = !!found;
    $('results').hidden = !found;

    if (found) return renderResults(q, found);

    const container = $('rows');
    container.innerHTML = '';
    container.style.paddingTop = view === 'home' ? '' : 'calc(var(--nav-h) + 40px)';

    const rows = gate(rowsForView()).filter((r) => r.items.length || r.empty);
    if (!rows.length) {
      container.innerHTML = `<p class="row__hint" style="padding-top:40px">Nothing here yet.</p>`;
      return;
    }

    rows.forEach((def) => {
      if (!def.items.length) {
        const empty = document.createElement('section');
        empty.className = 'row';
        empty.innerHTML = `<div class="row__head"><h2 class="row__title">${UI.esc(def.title)}</h2></div>
                           <p class="row__hint">${UI.esc(def.empty)}</p>`;
        container.appendChild(empty);
        return;
      }
      const el = UI.row(def, def.items);
      container.appendChild(el);
      initRow(el);
    });
  }

  function renderResults(q, items) {
    $('resultsHeading').innerHTML = `Titles related to <b>${UI.esc(q)}</b>`;
    const grid = $('resultsGrid');
    grid.innerHTML = '';
    $('resultsEmpty').hidden = items.length > 0;
    items.forEach((item) => grid.appendChild(UI.card(item)));
    bindCards(grid);
  }

  /* ── Row paging ───────────────────────────────────────────── */
  function initRow(el) {
    const track = qs('.row__track', el);
    const prev = qs('.row__arrow--prev', el);
    const next = qs('.row__arrow--next', el);
    const pager = qs('.row__pager', el);
    const cards = [...track.children];

    let page = 0;

    const perView = () => {
      const v = getComputedStyle(el).getPropertyValue('--per');
      return Math.max(1, parseInt(v, 10) || 6);
    };

    function update() {
      const per = perView();
      const pages = Math.max(1, Math.ceil(cards.length / per));
      page = Math.min(page, pages - 1);

      if (touch.matches) {
        track.style.transform = '';
        pager.innerHTML = '';
        return;
      }

      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      const step = per * (cards[0].getBoundingClientRect().width + gap);
      track.style.transform = `translateX(${-page * step}px)`;

      prev.disabled = page === 0;
      next.disabled = page >= pages - 1;

      pager.innerHTML = Array.from({ length: pages },
        (_, i) => `<i class="${i === page ? 'is-active' : ''}"></i>`).join('');

      /* Edge cards expand inward so the hover card is never clipped. */
      cards.forEach((c, i) => {
        c.classList.toggle('at-start', i === page * per);
        c.classList.toggle('at-end', i === page * per + per - 1);
      });
    }

    prev.addEventListener('click', () => { page--; update(); });
    next.addEventListener('click', () => { page++; update(); });

    /* One shared resize handler drives every row (see below), so
       re-rendering the page can't pile up stale listeners. */
    el.repage = update;

    bindCards(track);
    update();
  }

  window.addEventListener('resize', debounce(() => {
    document.querySelectorAll('.row').forEach((r) => r.repage && r.repage());
  }, 150));

  /* ── Card behaviour ───────────────────────────────────────── */
  function bindCards(root) {
    root.querySelectorAll('.card').forEach((card) => {
      let timer;

      if (!touch.matches) {
        const row = card.closest('.row');
        let stopPreview = null;

        card.addEventListener('mouseenter', () => {
          timer = setTimeout(() => {
            card.classList.add('is-hovered');
            /* Raise the row too, or the expanded card paints behind
               the next row — see .row.is-lifted in browse.css. */
            if (row) row.classList.add('is-lifted');

            /* Trailer starts a beat after the card has finished
               opening, so a quick sweep of the mouse never triggers it. */
            stopPreview = Preview.play(qs('.card__art', card), byId(card.dataset.id), {
              delay: 500,
            });
          }, 380);
        });

        card.addEventListener('mouseleave', () => {
          clearTimeout(timer);
          card.classList.remove('is-hovered');
          if (row) row.classList.remove('is-lifted');
          if (stopPreview) { stopPreview(); stopPreview = null; }
        });
      }

      card.addEventListener('click', (e) => {
        const item = byId(card.dataset.id);
        if (!item) return;
        const btn = e.target.closest('[data-act]');

        if (!btn) { openModal(item); return; }
        e.stopPropagation();
        handleAction(btn.dataset.act, item, card);
      });
    });
  }

  /* A series with no authored episode list still gets a sampled one,
     so Play from a card, the billboard and the modal all behave the
     same and the player's Episodes / Next buttons stay meaningful. */
  function withEpisodes(item) {
    if (item.kind !== 'series') return item;
    const eps = item.episodes && item.episodes.length
      ? item.episodes
      : UI.sampleEpisodes(item);
    return { ...item, episodes: eps };
  }

  function play(item, index) {
    Preview.stopAll();          // no trailer murmuring under the player
    const it = withEpisodes(item);
    /* `episodes` is optional in data.js — a film needn't declare it,
       so never assume the array exists. */
    const eps = it.episodes || [];
    Player.open(it, index !== undefined ? index : (eps.length ? 0 : -1));
  }

  function handleAction(act, item, card) {
    switch (act) {
      case 'play':
        play(item);
        break;
      case 'more':
        openModal(item);
        break;
      case 'list': {
        const added = Store.toggleList(item.id);
        toast(added ? `Added to My List` : `Removed from My List`);
        refreshCardState(item, card);
        if (view === 'mylist' || !added) render();
        break;
      }
      case 'up':
      case 'down': {
        const val = Store.setRating(item.id, act === 'up' ? 1 : -1);
        toast(val === 1 ? 'Marked as liked' : val === -1 ? 'Marked as not for me' : 'Rating cleared');
        refreshCardState(item, card);
        break;
      }
    }
  }

  /* Repaint the +/like buttons without a full re-render.

     One title can sit in several rows at once — the billboard film
     also appears in Trending, Top 10 and Only on SoodFlix — so every
     card showing it has to update, not just the one that was clicked.
     Otherwise the others keep showing "+" for something already in
     My List. `card` is passed separately because the modal hands us
     its own container, which isn't a .card. */
  function refreshCardState(item, card) {
    const listed = Store.inList(item.id);
    const rating = Store.getRating(item.id);

    const targets = new Set(
      document.querySelectorAll(`.card[data-id="${CSS.escape(item.id)}"]`));
    if (card) targets.add(card);

    targets.forEach((root) => {
      const listBtn = qs('[data-act="list"]', root);
      if (listBtn) {
        listBtn.classList.toggle('is-on', listed);
        listBtn.innerHTML = listed ? UI.ICON.check : UI.ICON.plus;
        listBtn.setAttribute('aria-label', listed ? 'Remove from My List' : 'Add to My List');
      }
      const up = qs('[data-act="up"]', root);
      const down = qs('[data-act="down"]', root);
      if (up) up.classList.toggle('is-on', rating === 1);
      if (down) down.classList.toggle('is-on', rating === -1);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     DETAIL MODAL
     ═══════════════════════════════════════════════════════ */
  const scrim = $('modalScrim');
  let modalStopPreview = null;

  function openModal(item) {
    const similar = pool()
      .filter((i) => i.id !== item.id && !SOODFLIX.featured.includes(i))
      .slice(0, 6);

    /* Nothing behind the modal should keep playing. */
    Preview.stopAll();
    modalStopPreview = null;

    $('modalBody').innerHTML = UI.modal(item, similar);
    scrim.hidden = false;
    document.body.classList.add('is-locked');
    scrim.scrollTop = 0;

    modalStopPreview = Preview.play(qs('.modal__hero', $('modalBody')), item, {
      delay: 1200,
      buttonHost: qs('.modal__top', $('modalBody')),
    });

    $('modalBody').onclick = (e) => {
      const act = e.target.closest('[data-act]');
      const ep = e.target.closest('.episode');
      const sim = e.target.closest('[data-similar]');

      if (act) {
        if (act.dataset.act === 'play') {
          closeModal();
          play(item);
        } else {
          handleAction(act.dataset.act, item, $('modalBody'));
        }
        return;
      }
      if (ep) {
        const idx = (withEpisodes(item).episodes || [])
          .findIndex((x) => String(x.n) === ep.dataset.ep);
        closeModal();
        play(item, idx);
        return;
      }
      if (sim) { openModal(byId(sim.dataset.similar)); }
    };
  }

  function closeModal() {
    if (modalStopPreview) { modalStopPreview(); modalStopPreview = null; }
    scrim.hidden = true;
    $('modalBody').innerHTML = '';
    if (!Player.isOpen) document.body.classList.remove('is-locked');
  }

  $('modalClose').addEventListener('click', closeModal);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !scrim.hidden) closeModal();
  });

  /* ═══════════════════════════════════════════════════════════
     PLAYER HOOKS
     ═══════════════════════════════════════════════════════ */
  Player.onExit(() => render());          // refresh Continue Watching bars
  Player.onEpisodes((item) => { Player.close(); openModal(item); });

  /* ═══════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('is-shown'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('is-shown');
      setTimeout(() => { t.hidden = true; }, 260);
    }, 2200);
  }

  function debounce(fn, ms) {
    let id;
    return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
  }
})();
