/* ═══════════════════════════════════════════════════════════════
   SoodFlix — CONTENT CONFIG
   ───────────────────────────────────────────────────────────────
   This is the only file you need to edit to add your own videos.

   1. Put the video file in   videos/
   2. Put a thumbnail in      images/     (16:9 works best)
   3. Fill in an entry below.

   ── THE FAST WAY ────────────────────────────────────────────────
   Name your files after one slug and let media() wire them up:

       videos/holiday.mp4          ← the film
       videos/holiday-trailer.mp4  ← hover / billboard preview
       images/holiday.jpg          ← card artwork
       images/holiday-wide.jpg     ← billboard backdrop

       { id: 'holiday', title: 'Holiday 2026', ...media('holiday') }

   Files you haven't made yet are simply ignored — a missing image
   falls back to the generated gradient tile, a missing trailer just
   means no preview. Nothing breaks, so you can add media over time.

   ── THE EXPLICIT WAY ────────────────────────────────────────────
   A title looks like this — every field except id/title is optional:

     {
       id:       'my-show',                 // unique, no spaces
       title:    'My Show',
       kind:     'series',                  // 'series' or 'film'
       video:    'videos/my-show.mp4',      // the file that plays
       trailer:  'videos/my-show-trailer.mp4',  // muted hover preview
       poster:   'images/my-show.jpg',      // card + modal artwork
       backdrop: 'images/my-show-wide.jpg', // optional, for the billboard
       year:     2026,
       rating:   '15',                      // age rating badge
       duration: '48m',                     // films: runtime, series: '2 Seasons'
       match:    97,                        // the green "% Match"
       genres:   ['Drama', 'Thriller'],
       cast:     ['Someone', 'Someone Else'],
       desc:     'One or two sentences.',
       badge:    'NEW',                     // little red corner flag
       isNew:    true,                      // shows under "New & Popular"
       episodes: [                          // series only
         { n: 1, title: 'Pilot', dur: '48m', desc: '…',
           video: 'videos/ep1.mp4', thumb: 'images/ep1.jpg' },
       ],
     }

   Leave `video` blank and the tile still renders — clicking it just
   shows a friendly "no file attached yet" screen.
   ═══════════════════════════════════════════════════════════ */


/* ── Media by naming convention ────────────────────────────────
   Spread this into a title to point at all four files at once:

       { id: 'holiday', title: 'Holiday 2026', ...media('holiday') }

   Override any single one afterwards if a file doesn't fit the
   pattern — later keys win:

       { ...media('holiday'), trailer: 'videos/teaser-cut.mp4' }

   Use a different extension with the second argument:

       ...media('holiday', 'webm')
   ---------------------------------------------------------- */
function media(slug, ext = 'mp4') {
  return {
    video:    `videos/${slug}.${ext}`,
    trailer:  `videos/${slug}-trailer.${ext}`,
    poster:   `images/${slug}.jpg`,
    backdrop: `images/${slug}-wide.jpg`,
  };
}


/* ── Placeholder factory ───────────────────────────────────────
   Generates the empty tiles you see before your own content is in.
   Delete a row's `items: placeholders(...)` and drop your real
   objects in the array instead. ------------------------------- */
function placeholders(prefix, count, opts = {}) {
  const GENRES = [
    ['Drama', 'Suspenseful'], ['Comedy', 'Feel-Good'], ['Action', 'Exciting'],
    ['Docuseries', 'Inspiring'], ['Sci-Fi', 'Mind-Bending'], ['Thriller', 'Dark'],
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    title: `${opts.label || 'Coming Soon'} ${i + 1}`,
    kind: opts.kind || (i % 3 === 0 ? 'film' : 'series'),
    placeholder: true,
    video: '',
    trailer: '',
    poster: '',
    year: 2024 + (i % 3),
    rating: ['U', 'PG', '12', '15', '18'][i % 5],
    duration: i % 3 === 0 ? `${88 + i * 3}m` : `${1 + (i % 4)} Season${i % 4 ? 's' : ''}`,
    match: 71 + ((i * 7) % 28),
    genres: GENRES[i % GENRES.length],
    cast: ['—', '—', '—'],
    desc: 'Placeholder slot. Swap this entry for one of your own videos in js/data.js.',
    badge: opts.badge && i < 3 ? opts.badge : '',
    isNew: !!opts.isNew,
    episodes: [],
  }));
}

/* ── Avatar art (inline SVG, no image files needed) ─────────── */
function avatar(bg, face) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
       <rect width="100" height="100" rx="6" fill="${bg}"/>
       <circle cx="50" cy="38" r="17" fill="${face}"/>
       <path d="M18 92c0-19 14-30 32-30s32 11 32 30z" fill="${face}"/>
     </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/* The colours offered when creating or editing a profile.
   [background, silhouette] ---------------------------------- */
const AVATAR_COLOURS = [
  ['#e50914', '#2b0508'], ['#2d9cdb', '#0b2c3f'], ['#f2c94c', '#4a3a06'],
  ['#27ae60', '#08301a'], ['#9b51e0', '#2a0f45'], ['#f2994a', '#452405'],
  ['#eb5757', '#3d0d0d'], ['#56ccf2', '#0a3040'],
];


const SOODFLIX = {

  /* ── Intro sound ──────────────────────────────────────────────
     The "ta-dum" that plays with the splash wordmark.

     Drop an mp3 into audio/ and name it here. Around 2.5 seconds
     matches the splash animation. Leave it '' for silence.

     Note: browsers refuse to autoplay audio until someone has
     interacted with the page, so on a first-ever visit it usually
     waits for the first click instead. That's a browser rule, not
     a bug — see audio/README.txt. -------------------------- */
  introSound: 'audio/intro.mp3',
  introVolume: 0.7,          // 0 to 1

  /* ── Starting profiles ────────────────────────────────────────
     Used only the first time someone opens the site. After that the
     list lives in localStorage, so profiles added in the browser
     persist and editing this array won't disturb them.
     (Clear site data to reset back to these.) ---------------- */
  profiles: [
    { id: 'p1', name: 'Sood',    avatar: avatar('#e50914', '#2b0508') },
    { id: 'p2', name: 'Guest',   avatar: avatar('#2d9cdb', '#0b2c3f') },
    { id: 'p3', name: 'Family',  avatar: avatar('#f2c94c', '#4a3a06') },
    { id: 'p4', name: 'Kids',    avatar: avatar('#27ae60', '#08301a'), kids: true },
  ],

  /* ── Billboard ────────────────────────────────────────────────
     The auto-rotating recommendation carousel at the top.
     Replace these five with your own headline titles.
     `backdrop` is the wide background image; leave it blank for the
     generated gradient art. ---------------------------------- */
  featured: [
    {
      id: 'feat-1',
      title: 'Day in the life of Sood',
      kind: 'movie',
      placeholder: true,
      video: '', trailer: '', backdrop: '',
      rank: 1,
      year: 2026, rating: 'PG', duration: 'Single movie',
      match: 98,
      genres: ['Drama', 'Mystery'],
      cast: ['Aiden Starr, Kian Sood, Declan Finney, Benji Moore'],
      desc: 'The premiering movie Day in the life of Sood is a gripping tale of a White boy who turns Indian. ',
      episodes: [],
    },
    {
      id: 'feat-2',
      title: 'Much ado about Soody',
      kind: 'film',
      placeholder: true,
      video: '', trailer: '', backdrop: '',
      year: 2025, rating: '12', duration: '1h 52m',
      match: 95,
      genres: ['Action', 'Adventure'],
      cast: ['—'],
      desc: 'The billboard rotates every eight seconds. Use the arrows or the dashes on the right to move through it by hand.',
      episodes: [],
    },
    {
      id: 'feat-3',
      title: 'Sood Lasso',
      kind: 'series',
      placeholder: true,
      video: '', trailer: '', backdrop: '',
      rank: 4,
      year: 2026, rating: 'PG', duration: '3 Seasons',
      match: 91,
      genres: ['Comedy', 'Feel-Good'],
      cast: ['—'],
      desc: 'Each slide can carry a Top 10 rank flag, an age rating and its own genre list — exactly like the real thing.',
      episodes: [],
    },
    {
      id: 'feat-4',
      title: 'Fourth Feature',
      kind: 'film',
      placeholder: true,
      video: '', trailer: '', backdrop: '',
      year: 2024, rating: '18', duration: '2h 04m',
      match: 88,
      genres: ['Thriller', 'Dark'],
      cast: ['—'],
      desc: 'More Info opens the full detail panel with episodes, cast and similar titles. Play jumps straight into the player.',
      episodes: [],
    },
    {
      id: 'feat-5',
      title: 'Fifth Feature',
      kind: 'series',
      placeholder: true,
      video: '', trailer: '', backdrop: '',
      year: 2026, rating: 'U', duration: '2 Seasons',
      match: 84,
      genres: ['Documentary', 'Inspiring'],
      cast: ['—'],
      desc: 'Add or remove slides by editing the `featured` array — the dots and arrows adjust themselves.',
      episodes: [],
    },
  ],

  /* ── Rows ─────────────────────────────────────────────────────
     type: 'standard' | 'top10' | 'continue'
     ---------------------------------------------------------- */
  rows: [
    {
      id: 'continue',
      title: 'Continue Watching for {profile}',
      type: 'continue',
      items: placeholders('cont', 8, { label: 'Recent' }),
    },
    {
      id: 'trending',
      title: 'Trending Now',
      type: 'standard',
      items: placeholders('trend', 12, { label: 'Trending', badge: 'NEW', isNew: true }),
    },
    {
      id: 'top10',
      title: 'Top 10 in Borker Today',
      type: 'top10',
      items: placeholders('top', 10, { label: 'Top' }),
    },
    {
      id: 'mysood',
      title: 'Only on SoodFlix',
      type: 'standard',
      items: placeholders('sood', 12, { label: 'Original', badge: 'SOODFLIX' }),
    },
    {
      id: 'new',
      title: 'New Releases',
      type: 'standard',
      items: placeholders('new', 12, { label: 'New Release', isNew: true }),
    },
    {
      id: 'watchagain',
      title: 'Watch It Again',
      type: 'standard',
      items: placeholders('again', 12, { label: 'Rewatch' }),
    },
    {
      id: 'films',
      title: 'Movies',
      type: 'standard',
      items: placeholders('film', 12, { label: 'Movie', kind: 'film' }),
    },
    {
      id: 'series',
      title: 'TV Shows',
      type: 'standard',
      items: placeholders('ser', 12, { label: 'Series', kind: 'series' }),
    },
    {
      id: 'because',
      title: 'Because You Watched Placeholder 1',
      type: 'standard',
      items: placeholders('bec', 12, { label: 'Similar' }),
    },
    {
      id: 'mylist-row',
      title: 'My List',
      type: 'mylist',
      items: [],
    },
  ],

  /* ── Languages menu (Browse by Languages) ─────────────────── */
  languages: ['English', 'Hindi', 'Punjabi', 'Spanish', 'French', 'Korean', 'Japanese'],
};

/* Gradient palettes used to draw placeholder / poster-less artwork. */
const ART_PALETTES = [
  ['#3a0d12', '#8b1020'], ['#0d2137', '#1b5c8a'], ['#20122e', '#5b2b7a'],
  ['#0f2a1e', '#1f7a4d'], ['#331a05', '#8a5410'], ['#2a0f1c', '#7a1f4d'],
  ['#101a2e', '#2b4a8a'], ['#2e1a0d', '#8a3d10'],
];
