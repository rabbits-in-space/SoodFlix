Artwork goes here.

  poster    16:9, around 640x360 or larger  — used on cards
  backdrop  wide, 1920x1080 or larger       — used on the billboard
  thumb     16:9, small                     — used in episode lists

Reference them from js/data.js:

    poster:   'images/my-show.jpg',
    backdrop: 'images/my-show-wide.jpg',

Any title without artwork gets a generated gradient tile with its
name stamped on it, so nothing ever looks broken.
