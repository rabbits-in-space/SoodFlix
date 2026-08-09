# SoodFlix

A Netflix-style streaming front end for your own videos. No build step, no
dependencies — plain HTML, CSS and JavaScript.

## Running it

Right-clicking `index.html` and opening it works fine for everything except
video — `file://` URLs can't do range requests, so scrubbing through a long
clip may misbehave. For that, serve the folder over HTTP:

```powershell
.\serve.ps1                 # http://localhost:8000, Ctrl+C to stop
.\serve.ps1 -Port 8080      # if 8000 is taken
```

If Windows blocks the script: `powershell -ExecutionPolicy Bypass -File serve.ps1`

Or install the **Live Server** VS Code extension and right-click `index.html` →
*Open with Live Server*, which also auto-refreshes the page when you save.

## Adding a video

1. Put the file in `videos/`
2. Put a 16:9 thumbnail in `images/` (optional — a gradient tile is generated
   if you skip it)
3. Open `js/data.js` and replace one of the placeholder entries:

```js
{
  id:       'holiday-2026',
  title:    'Holiday 2026',
  kind:     'film',                            // 'film' or 'series'
  video:    'videos/holiday-2026.mp4',
  trailer:  'videos/holiday-2026-trailer.mp4', // muted hover preview
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

### The shortcut: `media()`

Name your files after one slug and a single line wires up all four:

```
videos/holiday.mp4           ← the film
videos/holiday-trailer.mp4   ← hover / billboard preview
images/holiday.jpg           ← card artwork
images/holiday-wide.jpg      ← billboard backdrop
```

```js
{ id: 'holiday', title: 'Holiday 2026', ...media('holiday') }
```

Files you haven't made yet are simply ignored, so you can add media over time.
Override one path by putting it after the spread — later keys win:

```js
{ ...media('holiday'), trailer: 'videos/teaser-cut.mp4' }
```

Non-mp4? Pass the extension: `...media('holiday', 'webm')`.

### Series

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

### Vertical (portrait) content

The layout is 16:9, but phone-shot video works fine. Artwork and previews are
never cropped — the real thing is contained at its own aspect ratio, and a
blurred, zoomed copy of itself fills the space around it. Correctly-proportioned
16:9 material fills the box exactly and never shows the blur, so mixing the two
is fine.

The player letterboxes portrait video properly too.

Worth knowing: a 9:16 clip in a 16:9 tile only occupies about a third of the
width. That's unavoidable geometry — if your whole library ends up vertical,
switching the cards to tall poster shapes would suit it better.

### Trailers

Set `trailer:` and a muted clip fades in over the artwork in three places:

| Where | When | Behaviour |
| --- | --- | --- |
| Card | ~0.9s after you hover | Loops until you move away |
| Billboard | 4s into a slide | Plays once, pausing the carousel — capped at 10s so a long trailer can't stall it |
| Detail modal | 1.2s after opening | Loops while the modal is open |

A mute toggle appears on the preview while it plays, and your choice is
remembered across every preview and every page load. Previews start muted
because browsers block autoplay with sound.

**You don't have to make trailers.** Each title has a list of things to try, and
it works down it until one plays:

```
trailer:  →  video:  →  first episode with a video  →  nothing
```

That's a real fallback, not just a check for empty fields — if a `trailer:` path
is set but the file isn't there, it moves on to the next candidate. Which
matters when you use `media()`, since that fills in a trailer path for every
title whether you've made one or not.

So set `trailer:` only when you want a *different* clip as the preview.

If nothing in the list plays — no files yet, unsupported codec, or the visitor's
system asks for reduced motion — the artwork simply stays put. The mute toggle
only appears once a preview is genuinely playing.

### The intro sound

Drop an mp3 at `audio/intro.mp3` and it plays with the splash wordmark. The
path is set in `js/data.js`:

```js
introSound:  'audio/intro.mp3',   // '' for silence
introVolume: 1,                 // 0 to 1
```

### The opening sequence

```
INITIALIZE screen  →  click  →  gate fades (0.42s)  →  black beat (0.75s)
   →  wordmark + sound start together  →  sound ends  →  zoom out
   →  "Who's watching?"
```

The **Initialize** screen exists for a reason beyond looking good: browsers
refuse to play audio until someone has interacted with the page. Collecting one
click up front means the intro sound is *guaranteed* to play, in step with the
wordmark, every single time — including a first-ever visit.

The wordmark starts on the audio's `playing` event, not on a timer, so picture
and sound can't drift apart. If the audio can't start within 0.6s the animation
begins anyway rather than stalling.

**The splash lasts exactly as long as the sound**, and the choreography divides
itself up to fit whatever clip you drop in — no numbers to change:

| | |
| --- | --- |
| **Rise** | `clip − 2.8s` — fades in while rising from below and scaling down to its final size, one continuous move, no loops |
| **Still** | `0.6s` — settled dead centre |
| **Sweep** | `1.8s` — a single highlight pass across the letters |
| **Settle** | `0.4s` — a beat after the sweep clears |
| **Exit** | `0.6s` zoom-through |

**The sound fades out** over its last 1.2 seconds and into the zoom-through, so
it tapers instead of stopping dead. Short clips get a proportionally shorter
fade.

Three things can end the splash, whichever comes first:

| | |
| --- | --- |
| the sound finishing | the intended path |
| 2.6s | if there's no sound or the file is missing |
| the clip's own length + 1.5s | safety net if the audio stalls |

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

**Browse** — Initialize screen, splash animation with intro sound,
"Who's watching?" profile gate, nav that turns
solid on scroll, expanding search, profile switcher, auto-rotating billboard,
hover-to-expand cards with play / add / like / dislike / more, Top 10 row, row
paging with arrows and page dashes, My List, Continue Watching progress bars,
footer.

**Profiles** — add, rename, recolour and delete them from the browser; the list
is saved so it survives a refresh. Each profile keeps its **own** My List,
thumbs up/down and watch progress, so "Continue Watching" is genuinely per
person. A Kids profile only ever sees titles rated U or PG — in rows, search,
the billboard and More Like This.

**Trailer previews** — muted clips that fade in over the artwork on card hover,
on the billboard, and in the modal, with a remembered mute toggle.

**Detail modal** — hero artwork, synopsis, cast and genres, episode list with
season picker, More Like This grid, About section.

**Player** — play/pause, ±10s, volume, mute, scrubbing with buffer bar and
time tooltip, playback speed, picture-in-picture, fullscreen, auto-hiding
chrome, next episode, resume where you left off.

The picture fades up once the video can actually play, and a spinner covers any
real wait. Both are driven by media events (`waiting`, `playing`, `stalled`)
rather than a timer — so locally, where playback starts instantly, the spinner
never gets a chance to appear, and over a slow connection it stays for exactly
as long as the buffering takes.

Keyboard: `space`/`k` play-pause · `←`/`→` skip 10s · `↑`/`↓` volume ·
`f` fullscreen · `m` mute · `esc` exit.

## Files

```
index.html        markup for every screen
css/base.css      tokens, splash, profile gate, artwork layers, footer
css/browse.css    nav, billboard, rows, cards
css/overlays.css  search, detail modal, player
audio/            intro sound (audio/intro.mp3)
js/data.js        ← your content lives here
js/store.js       localStorage: profiles, My List, ratings, progress, mute
js/preview.js     muted trailer previews
js/ui.js          builds cards, rows, modal markup
js/player.js      the video player
js/app.js         navigation, carousel, row paging, wiring
serve.ps1         local web server (see "Running it")
```

State is saved per profile in `localStorage` under `soodflix.v1` — profiles, My
List, thumbs and watch progress. The starting profiles in `js/data.js` are only
used on the very first visit; after that the saved list wins, so editing that
array won't disturb profiles you've already made. Clearing site data resets
everything back to the defaults.
