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
  const pool  = () => [...INDEX.values()];
  const touch = window.matchMedia('(max-width: 620px)');

  let view = 'home';
  let profile = SOODFLIX.profiles[0];

  /* ═══════════════════════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════════════════ */
  $('year').textContent = new Date().getFullYear();

  setTimeout(() => {
    $('splash').remove();
    showProfileGate();
  }, 2600);

  /* ── Profile gate ─────────────────────────────────────────── */
  function showProfileGate() {
    const list = $('profileList');
    list.innerHTML = '';
    SOODFLIX.profiles.forEach((p) => {
      const li = document.createElement('li');
      li.innerHTML = `<button><img src="${p.avatar}" alt=""><span>${UI.esc(p.name)}</span></button>`;
      li.querySelector('button').addEventListener('click', () => enter(p));
      list.appendChild(li);
    });

    const add = document.createElement('li');
    add.innerHTML = `<button><span class="profile-add">+</span><span>Add Profile</span></button>`;
    add.querySelector('button').addEventListener('click', () => toast('Profile management is a placeholder.'));
    list.appendChild(add);

    $('profileGate').hidden = false;
    $('browse').hidden = true;
  }

  $('manageProfiles').addEventListener('click', () => toast('Profile management is a placeholder.'));

  function enter(p) {
    profile = p;
    Store.setProfileId(p.id);
    $('accountAvatar').src = p.avatar;
    $('profileGate').hidden = true;
    $('browse').hidden = false;
    window.scrollTo(0, 0);
    buildBillboard();
    render();
    buildNotifications();
    buildAccountMenu();
    buildNavDropdown();
  }

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

  /* ── Notifications ────────────────────────────────────────── */
  function buildNotifications() {
    $('notifList').innerHTML = SOODFLIX.notifications.map((n) => {
      const sample = pool()[Math.floor(Math.random() * 8)];
      return `<li>
          <div style="width:100px;aspect-ratio:16/9;border-radius:2px;${UI.artStyle(sample)}"></div>
          <div><p class="notif__title">${UI.esc(n.title)}</p><span class="notif__time">${UI.esc(n.time)}</span></div>
        </li>`;
    }).join('');
  }

  $('notifToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const open = $('notifPanel').hidden;
    closeMenus();
    $('notifPanel').hidden = !open;
    $('notifToggle').setAttribute('aria-expanded', String(open));
    if (open) $('notifDot').style.display = 'none';
  });

  /* ── Account menu ─────────────────────────────────────────── */
  function buildAccountMenu() {
    $('accountProfiles').innerHTML = SOODFLIX.profiles
      .filter((p) => p.id !== profile.id)
      .map((p) => `<li><button data-profile="${p.id}"><img src="${p.avatar}" alt=""><span>${UI.esc(p.name)}</span></button></li>`)
      .join('');

    $('accountProfiles').querySelectorAll('[data-profile]').forEach((b) =>
      b.addEventListener('click', () => {
        enter(SOODFLIX.profiles.find((p) => p.id === b.dataset.profile));
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
    if (btn.dataset.action === 'signout') { Store.clearProfile(); showProfileGate(); }
    else toast('That screen is a placeholder.');
  });

  function closeMenus() {
    $('accountMenu').hidden = true;
    $('notifPanel').hidden = true;
    $('navDropdownMenu').hidden = true;
    $('accountBtn').setAttribute('aria-expanded', 'false');
    $('notifToggle').setAttribute('aria-expanded', 'false');
    $('navDropdownBtn').setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.account, .notif, .nav__dropdown')) closeMenus();
    if (!e.target.closest('.search') && !searchInput.value) searchBox.classList.remove('is-open');
  });

  /* ═══════════════════════════════════════════════════════════
     BILLBOARD
     ═══════════════════════════════════════════════════════ */
  let bbIndex = 0;
  let bbTimer = null;
  let bbWired = false;

  function buildBillboard() {
    const slides = $('billboardSlides');
    const dots = $('billboardDots');
    slides.innerHTML = '';
    dots.innerHTML = '';

    SOODFLIX.featured.forEach((item, i) => {
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
      const item = SOODFLIX.featured[bbIndex];
      if (btn.dataset.act === 'play') play(item);
      else openModal(item);
    });

    /* Pause the rotation while the pointer is over the billboard. */
    $('billboard').addEventListener('mouseenter', () => clearInterval(bbTimer));
    $('billboard').addEventListener('mouseleave', restartBillboard);
  }

  function showSlide(i) {
    const n = SOODFLIX.featured.length;
    bbIndex = (i + n) % n;

    [...$('billboardSlides').children].forEach((s, k) =>
      s.classList.toggle('is-active', k === bbIndex));
    [...$('billboardDots').children].forEach((d, k) =>
      d.classList.toggle('is-active', k === bbIndex));

    $('billboardContent').innerHTML = UI.billboardCopy(SOODFLIX.featured[bbIndex]);
    restartBillboard();
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
        return [{ id: 'v-mylist', title: 'My List', type: 'standard', items, empty: 'Titles you add to My List land here. Hover a card and press +.' }];
      }
      default:
        return SOODFLIX.rows.map(resolveRow);
    }
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
        title: def.title.replace('{profile}', profile.name),
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

    const rows = rowsForView().filter((r) => r.items.length || r.empty);
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
        card.addEventListener('mouseenter', () => {
          timer = setTimeout(() => {
            card.classList.add('is-hovered');
            /* Raise the row too, or the expanded card paints behind
               the next row — see .row.is-lifted in browse.css. */
            if (row) row.classList.add('is-lifted');
          }, 380);
        });
        card.addEventListener('mouseleave', () => {
          clearTimeout(timer);
          card.classList.remove('is-hovered');
          if (row) row.classList.remove('is-lifted');
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
    const it = withEpisodes(item);
    Player.open(it, index !== undefined ? index : (it.episodes.length ? 0 : -1));
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

  /* Repaint just the buttons on one card, no full re-render. */
  function refreshCardState(item, card) {
    if (!card) return;
    const listed = Store.inList(item.id);
    const rating = Store.getRating(item.id);
    const listBtn = qs('[data-act="list"]', card);
    if (listBtn) {
      listBtn.classList.toggle('is-on', listed);
      listBtn.innerHTML = listed ? UI.ICON.check : UI.ICON.plus;
      listBtn.setAttribute('aria-label', listed ? 'Remove from My List' : 'Add to My List');
    }
    const up = qs('[data-act="up"]', card);
    const down = qs('[data-act="down"]', card);
    if (up) up.classList.toggle('is-on', rating === 1);
    if (down) down.classList.toggle('is-on', rating === -1);
  }

  /* ═══════════════════════════════════════════════════════════
     DETAIL MODAL
     ═══════════════════════════════════════════════════════ */
  const scrim = $('modalScrim');

  function openModal(item) {
    const similar = pool()
      .filter((i) => i.id !== item.id && !SOODFLIX.featured.includes(i))
      .slice(0, 6);

    $('modalBody').innerHTML = UI.modal(item, similar);
    scrim.hidden = false;
    document.body.classList.add('is-locked');
    scrim.scrollTop = 0;

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
        const idx = withEpisodes(item).episodes
          .findIndex((x) => String(x.n) === ep.dataset.ep);
        closeModal();
        play(item, idx);
        return;
      }
      if (sim) { openModal(byId(sim.dataset.similar)); }
    };
  }

  function closeModal() {
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
