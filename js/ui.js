/* ═══════════════════════════════════════════════════════════════
   SoodFlix — DOM builders
   Pure rendering: turns a data object into markup. No event
   wiring here — app.js owns behaviour.
   ═══════════════════════════════════════════════════════════ */

const UI = (() => {

  /* ── Icons ────────────────────────────────────────────────── */
  const ICON = {
    play:    '<svg viewBox="0 0 24 24"><path d="M6 4.3 20 12 6 19.7z"/></svg>',
    plus:    '<svg viewBox="0 0 24 24"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg>',
    check:   '<svg viewBox="0 0 24 24"><path d="M9.6 16.6 5 12l1.4-1.4 3.2 3.2 8-8L19 7.2z"/></svg>',
    up:      '<svg viewBox="0 0 24 24"><path d="M14 3 8.5 9.2c-.3.4-.5.9-.5 1.4V19a2 2 0 0 0 2 2h7.3a2 2 0 0 0 1.9-1.4l1.7-6A2 2 0 0 0 19 11h-3.6l.8-3.6A2.6 2.6 0 0 0 14 3ZM3 10h3v11H3z"/></svg>',
    down:    '<svg viewBox="0 0 24 24"><path d="M10 21l5.5-6.2c.3-.4.5-.9.5-1.4V5a2 2 0 0 0-2-2H6.7a2 2 0 0 0-1.9 1.4l-1.7 6A2 2 0 0 0 5 13h3.6l-.8 3.6A2.6 2.6 0 0 0 10 21ZM21 14h-3V3h3z"/></svg>',
    chev:    '<svg viewBox="0 0 24 24"><path d="M12 15.7 4.6 8.3 6 6.9l6 6 6-6 1.4 1.4z"/></svg>',
    right:   '<svg viewBox="0 0 24 24"><path d="M8.6 4.6 7.2 6l7 7-7 7 1.4 1.4L17 13z"/></svg>',
    left:    '<svg viewBox="0 0 24 24"><path d="M15.4 4.6 7 13l8.4 8.4 1.4-1.4L9.8 13l7-7z"/></svg>',
    info:    '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/></svg>',
  };

  /* ── Generated artwork ─────────────────────────────────────
     Titles without a poster get a deterministic gradient so the
     grid never looks broken while you're still adding videos. */
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function artStyle(item) {
    const [a, b] = ART_PALETTES[hash(item.id || item.title) % ART_PALETTES.length];
    const angle = 120 + (hash(item.id) % 6) * 22;
    return `background-image:linear-gradient(${angle}deg,${a},${b});`;
  }

  /* Artwork block used by cards, the modal hero and the billboard. */
  function art(item, { wide = false, cls = '' } = {}) {
    const src = wide ? (item.backdrop || item.poster) : (item.poster || item.backdrop);
    if (src) return `<div class="${cls}" style="background-image:url('${src}')"></div>`;
    return `<div class="${cls}" style="${artStyle(item)}">
              <div class="card__stamp">
                <b>${esc(item.title)}</b>
                <small>${item.placeholder ? 'Placeholder' : 'SoodFlix'}</small>
              </div>
            </div>`;
  }

  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /* ── Card ─────────────────────────────────────────────────── */
  function card(item, { rank = 0 } = {}) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = item.id;

    const prog = Store.getProgress(item.id);
    const rating = Store.getRating(item.id);
    const listed = Store.inList(item.id);

    el.innerHTML = `
      ${rank ? `<div class="card__rank ${rank > 9 ? 'card__rank--wide' : ''}">${rank}</div>` : ''}
      <div class="card__inner">
        ${art(item, { cls: 'card__art' })}
        ${item.badge ? `<span class="card__badge">${esc(item.badge)}</span>` : ''}
        ${prog ? `<div class="card__progress"><i style="width:${prog.pct}%"></i></div>` : ''}
        <div class="card__hover">
          <div class="card__actions">
            <button class="round-btn" data-act="play"  aria-label="Play">${ICON.play}</button>
            <button class="round-btn ${listed ? 'is-on' : ''}" data-act="list"
                    aria-label="${listed ? 'Remove from My List' : 'Add to My List'}">
              ${listed ? ICON.check : ICON.plus}
            </button>
            <button class="round-btn ${rating === 1 ? 'is-on' : ''}" data-act="up"   aria-label="I like this">${ICON.up}</button>
            <button class="round-btn ${rating === -1 ? 'is-on' : ''}" data-act="down" aria-label="Not for me">${ICON.down}</button>
            <button class="round-btn spacer" data-act="more" aria-label="More info">${ICON.chev}</button>
          </div>
          <div class="card__meta">
            <span class="match">${item.match || 90}% Match</span>
            <span class="rating">${esc(item.rating || 'PG')}</span>
            <span>${esc(item.duration || '')}</span>
            <span class="tag-hd">HD</span>
          </div>
          <div class="card__genres">
            ${(item.genres || []).map((g, i) => `
              ${i ? '<span class="dot-sep">●</span>' : ''}<span>${esc(g)}</span>`).join('')}
          </div>
        </div>
      </div>`;
    return el;
  }

  /* ── Row ──────────────────────────────────────────────────── */
  function row(def, items) {
    const el = document.createElement('section');
    el.className = 'row' + (def.type === 'top10' ? ' row--top10' : '');
    el.dataset.rowId = def.id;

    el.innerHTML = `
      <div class="row__head">
        <h2 class="row__title">${esc(def.title)}</h2>
        <a class="row__explore" href="#">Explore All ${ICON.right}</a>
      </div>
      <div class="row__pager"></div>
      <div class="row__body">
        <button class="row__arrow row__arrow--prev" aria-label="Previous titles">${ICON.left}</button>
        <div class="row__viewport"><div class="row__track"></div></div>
        <button class="row__arrow row__arrow--next" aria-label="More titles">${ICON.right}</button>
      </div>`;

    const track = el.querySelector('.row__track');
    items.forEach((item, i) => {
      track.appendChild(card(item, { rank: def.type === 'top10' ? i + 1 : 0 }));
    });
    return el;
  }

  /* ── Billboard slide + copy ───────────────────────────────── */
  function slide(item) {
    const el = document.createElement('div');
    el.className = 'billboard__slide';
    const src = item.backdrop || item.poster;
    if (src) el.style.backgroundImage = `url('${src}')`;
    else el.setAttribute('style', artStyle(item));
    return el;
  }

  function billboardCopy(item) {
    return `
      <h1 class="bb__logo">${esc(item.title)}</h1>
      <div class="bb__meta">
        ${item.rank ? `<span class="bb__rank"><i>TOP<br>10</i> #${item.rank} in Borker Today</span>` : ''}
        <span class="match">${item.match || 95}% Match</span>
        <span>${item.year || ''}</span>
        <span class="rating">${esc(item.rating || 'PG')}</span>
        <span>${esc(item.duration || '')}</span>
      </div>
      <p class="bb__desc">${esc(item.desc || '')}</p>
      <div class="bb__btns">
        <button class="btn btn--light" data-act="play">${ICON.play} Play</button>
        <button class="btn btn--grey"  data-act="more">${ICON.info} More Info</button>
      </div>`;
  }

  /* ── Detail modal ─────────────────────────────────────────── */
  function modal(item, similar) {
    const listed = Store.inList(item.id);
    const rating = Store.getRating(item.id);
    const isSeries = item.kind === 'series';
    const eps = item.episodes && item.episodes.length
      ? item.episodes
      : (isSeries ? sampleEpisodes(item) : []);

    return `
      <div class="modal__top">
        ${art(item, { wide: true, cls: 'modal__hero' })}
        <div class="modal__hero-copy">
          <h2 class="modal__title">${esc(item.title)}</h2>
          <div class="modal__btns">
            <button class="btn btn--light" data-act="play">${ICON.play} Play</button>
            <button class="round-btn ${listed ? 'is-on' : ''}" data-act="list"
                    aria-label="My List">${listed ? ICON.check : ICON.plus}</button>
            <button class="round-btn ${rating === 1 ? 'is-on' : ''}" data-act="up"   aria-label="I like this">${ICON.up}</button>
            <button class="round-btn ${rating === -1 ? 'is-on' : ''}" data-act="down" aria-label="Not for me">${ICON.down}</button>
          </div>
        </div>
      </div>

      <div class="modal__grid">
        <div>
          <div class="modal__meta">
            <span class="match">${item.match || 90}% Match</span>
            <span>${item.year || ''}</span>
            <span class="rating">${esc(item.rating || 'PG')}</span>
            <span>${esc(item.duration || '')}</span>
            <span class="tag-hd">HD</span>
          </div>
          <p class="modal__synopsis">${esc(item.desc || 'No description yet.')}</p>
        </div>
        <dl class="modal__facts">
          <div><dt>Cast: </dt><dd>${(item.cast || ['—']).map((c) => `<a href="#">${esc(c)}</a>`).join(', ')}</dd></div>
          <div><dt>Genres: </dt><dd>${(item.genres || []).map((g) => `<a href="#">${esc(g)}</a>`).join(', ')}</dd></div>
          <div><dt>This ${isSeries ? 'show' : 'film'} is: </dt><dd>${esc((item.genres || ['Entertaining'])[1] || 'Entertaining')}</dd></div>
        </dl>
      </div>

      ${eps.length ? `
        <div class="modal__section">
          <div class="modal__section-head">
            <h3>Episodes</h3>
            <select class="season-select" aria-label="Season">
              <option>Season 1</option>
            </select>
          </div>
          <div class="episodes">
            ${eps.map((ep) => `
              <div class="episode" data-ep="${ep.n}">
                <div class="episode__num">${ep.n}</div>
                <div class="episode__thumb" ${ep.thumb ? `style="background-image:url('${ep.thumb}')"` : `style="${artStyle({ id: item.id + ep.n })}"`}>
                  <div class="play-veil">${ICON.play}</div>
                </div>
                <div>
                  <div class="episode__head">
                    <span>${esc(ep.title)}</span>
                    <span class="episode__dur">${esc(ep.dur || '')}</span>
                  </div>
                  <p class="episode__desc">${esc(ep.desc || '')}</p>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}

      ${similar.length ? `
        <div class="modal__section">
          <h3>More Like This</h3>
          <div class="more-grid">
            ${similar.map((s) => `
              <button class="more-card" data-similar="${esc(s.id)}">
                ${art(s, { cls: 'more-card__art' })}
                <div class="more-card__body">
                  <div class="more-card__top">
                    <span class="match">${s.match || 90}% Match</span>
                    <span class="rating">${esc(s.rating || 'PG')}</span>
                  </div>
                  <p class="more-card__desc">${esc((s.desc || '').slice(0, 110))}</p>
                </div>
              </button>`).join('')}
          </div>
        </div>` : ''}

      <div class="modal__section modal__about">
        <h3>About ${esc(item.title)}</h3>
        <dl class="modal__facts">
          <div><dt>Cast: </dt><dd>${(item.cast || ['—']).join(', ')}</dd></div>
          <div><dt>Genres: </dt><dd>${(item.genres || []).join(', ')}</dd></div>
          <div><dt>Maturity rating: </dt><dd><span class="rating">${esc(item.rating || 'PG')}</span> Recommended for ages ${esc(item.rating || 'PG')} and up</dd></div>
        </dl>
      </div>`;
  }

  /* Series with no episode list yet still get a plausible one. */
  function sampleEpisodes(item) {
    return Array.from({ length: 4 }, (_, i) => ({
      n: i + 1,
      title: `Episode ${i + 1}`,
      dur: `${38 + i * 4}m`,
      desc: 'Episode placeholder — add an `episodes` array to this title in js/data.js.',
      video: item.video || '',
      thumb: item.poster || '',
    }));
  }

  return { ICON, card, row, slide, billboardCopy, modal, art, artStyle, esc, sampleEpisodes };
})();
