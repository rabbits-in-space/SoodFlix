Drop the intro sound here.

    audio/intro.mp3

That path is already wired up. To use a different name or format,
change it in js/data.js:

    introSound: 'audio/intro.mp3',
    introVolume: 0.7,             // 0 to 1

Set introSound to '' for silence.

LENGTH
The splash now WAITS for the sound to finish, so the wordmark and the
audio stay in sync at any length. That cuts both ways: a 12 second
clip means 12 seconds staring at the logo before you can click
anything. Three to five seconds feels about right.

The wordmark animates in over 1.7s and then holds, so clips shorter
than 2.6 seconds still get the full animation.

mp3, m4a, wav, ogg and flac all work.

WHY THERE IS AN "INITIALIZE" SCREEN
Browsers refuse to play audio until you have interacted with the page
- a deliberate rule to stop websites blaring at you. The Initialize
button collects that one click, so the sound is guaranteed to play
every time, including a first-ever visit.

The wordmark starts on the audio's 'playing' event rather than on a
timer, so the picture and sound cannot drift apart.

A missing file is handled silently - the splash just runs its normal
2.6 seconds without sound.
