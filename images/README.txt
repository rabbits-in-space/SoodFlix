Artwork goes here.

  poster    16:9, around 640x360 or larger  - used on cards
  backdrop  wide, 1920x1080 or larger       - used on the billboard
  thumb     16:9, small                     - used in episode lists

NAMING
If you name files after one slug, media() wires them up in one line:

    images/holiday.jpg           the card artwork  (poster)
    images/holiday-wide.jpg      the billboard art (backdrop)

    js/data.js:  { id: 'holiday', title: 'Holiday 2026', ...media('holiday') }

Or point at them explicitly:

    poster:   'images/my-show.jpg',
    backdrop: 'images/my-show-wide.jpg',

FALLBACK
Any title without artwork gets a generated gradient tile with its name
stamped on it, so nothing ever looks broken. The same thing happens if a
path is wrong or the file is missing - the image quietly drops out and
the gradient shows through.

That means you can add a video now and its artwork later.

NOTE
Unlike videos, images are NOT gitignored. They are small, so they get
committed and deployed normally.
