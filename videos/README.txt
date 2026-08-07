Drop your video files in this folder.

MP4 (H.264 video + AAC audio) plays everywhere. WebM works too.

NAMING
If you name files after one slug, media() wires them up in one line:

    videos/holiday.mp4           the film / episode
    videos/holiday-trailer.mp4   the muted hover preview

    js/data.js:  { id: 'holiday', title: 'Holiday 2026', ...media('holiday') }

Or point at them explicitly:

    video:   'videos/my-clip.mp4'
    trailer: 'videos/my-clip-trailer.mp4'

TRAILERS
The trailer is what plays, muted, when you hover a card, a few seconds
into a billboard slide, and in the detail modal. Keep them short — 10 to
30 seconds is about right, since cards loop them.

You do not have to make one. Each title tries, in order:

    trailer  ->  video  ->  first episode with a video  ->  nothing

A trailer path that points at a file you never made is skipped, so the
main video gets used as the preview instead. Nothing to clean up.

NOTES
Filenames are case-sensitive once the site is hosted, so keep them
lowercase with hyphens: my-clip.mp4, not My Clip.MP4

Video files are gitignored — they stay on your machine and never get
committed. See .gitignore in the project root.
