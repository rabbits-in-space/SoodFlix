# SoodFlix

A Netflix-style streaming front end for your own videos. No build step, no
dependencies — plain HTML, CSS and JavaScript.

## Running it

Double-clicking `index.html` mostly works, but browsers restrict video from
`file://` URLs. Serve the folder instead:

```powershell
# any one of these, from the SoodFlix folder
python -m http.server 8000
npx serve .
php -S localhost:8000
```

Then open <http://localhost:8000>.

VS Code users: right-click `index.html` → **Open with Live Server**.

## Adding a video

1. Put the file in `videos/`
2. Put a 16:9 thumbnail in `images/` (optional — a gradient tile is generated
   if you skip it)
3. Open `js/data.js` and replace one of the placeholder entries:

```js
{
  id:       'holiday-2026',
  title:    'Holiday 2026',
  kind:     'film',                       // 'film' or 'series'
  video:    'videos/holiday-2026.mp4',
  poster:   'images/holiday-2026.jpg',
  year:     2026,
  rating:   'PG',
  duration: '12m',
  match:    97,
  genres:   ['Travel', 'Feel-Good'],
  cast:     ['Sood'],
  desc:     'Two weeks, one camera.',
}
```

A **series** adds an `episodes` array; each episode can have its own video file:

```js
kind: 'series',
duration: '1 Season',
episodes: [
  { n: 1, title: 'Arrival',  dur: '9m',  video: 'videos/ep1.mp4', thumb: 'images/ep1.jpg', desc: '…' },
  { n: 2, title: 'The Road', dur: '11m', video: 'videos/ep2.mp4', thumb: 'images/ep2.jpg', desc: '…' },
]
```

Episodes auto-advance, and the "Next episode in 10" card appears near the end.

### The top carousel

The five rotating recommendations come from the `featured` array in
`js/data.js`. Same fields as above, plus `backdrop` for the wide background and
an optional `rank` for the "#1 in the Borker Today" flag.

### Rows

Rows are declared at the bottom of `js/data.js`:

```js
{ id: 'trending', title: 'Trending Now', type: 'standard', items: [ … ] }
```

`type` is one of:

| type | what it does |
| --- | --- |
| `standard` | ordinary row |
| `top10` | tall posters with the big outlined numbers |
| `continue` | auto-filled from titles you part-watched |
| `mylist` | auto-filled from the + button |

Delete `items: placeholders(…)` and put your own objects in the array.

## What's included

**Browse** — splash animation, "Who's watching?" profile gate, nav that turns
solid on scroll, expanding search, notifications bell, profile switcher,
auto-rotating billboard, hover-to-expand cards with play / add / like /
dislike / more, Top 10 row, row paging with arrows and page dashes, My List,
Continue Watching progress bars, footer.

**Detail modal** — hero artwork, synopsis, cast and genres, episode list with
season picker, More Like This grid, About section.

**Player** — play/pause, ±10s, volume, mute, scrubbing with buffer bar and
time tooltip, playback speed, picture-in-picture, fullscreen, auto-hiding
chrome, next episode, resume where you left off.

Keyboard: `space`/`k` play-pause · `←`/`→` skip 10s · `↑`/`↓` volume ·
`f` fullscreen · `m` mute · `esc` exit.

## Files

```
index.html        markup for every screen
css/base.css      tokens, splash, profile gate, footer
css/browse.css    nav, billboard, rows, cards
css/overlays.css  search, detail modal, player
js/data.js        ← your content lives here
js/store.js       localStorage: profile, My List, ratings, progress
js/ui.js          builds cards, rows, modal markup
js/player.js      the video player
js/app.js         navigation, carousel, row paging, wiring
```

State is saved per profile in `localStorage` under `soodflix.v1`.
