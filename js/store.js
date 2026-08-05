/* ═══════════════════════════════════════════════════════════════
   SoodFlix — persistence
   Everything that must survive a refresh lives here: the selected
   profile, My List, thumbs up/down and playback progress.
   State is namespaced per profile so each one keeps its own list.
   ═══════════════════════════════════════════════════════════ */

const Store = (() => {
  const KEY = 'soodflix.v1';

  const blank = () => ({ profileId: null, byProfile: {} });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
    } catch {
      return blank();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* private mode / quota — the session still works, it just won't persist */
    }
  }

  /* Per-profile bucket: { list: [], likes: {}, progress: {} } */
  function bucket() {
    const id = state.profileId || 'anon';
    state.byProfile[id] ||= { list: [], likes: {}, progress: {} };
    return state.byProfile[id];
  }

  return {
    /* ── Profile ────────────────────────────────────────────── */
    getProfileId: () => state.profileId,
    setProfileId(id) { state.profileId = id; save(); },
    clearProfile() { state.profileId = null; save(); },

    /* ── My List ────────────────────────────────────────────── */
    getList: () => [...bucket().list],
    inList: (id) => bucket().list.includes(id),
    toggleList(id) {
      const b = bucket();
      const i = b.list.indexOf(id);
      if (i === -1) b.list.unshift(id); else b.list.splice(i, 1);
      save();
      return i === -1;                       // true when it was added
    },

    /* ── Thumbs ─────────────────────────────────────────────── */
    getRating: (id) => bucket().likes[id] || 0,     // 1 up, -1 down, 0 none
    setRating(id, value) {
      const b = bucket();
      if (b.likes[id] === value) delete b.likes[id];
      else b.likes[id] = value;
      save();
      return b.likes[id] || 0;
    },

    /* ── Playback progress ──────────────────────────────────── */
    getProgress: (id) => bucket().progress[id] || null,   // { t, dur, pct }
    setProgress(id, t, dur) {
      if (!dur || !isFinite(dur)) return;
      const pct = Math.min(100, Math.round((t / dur) * 100));
      bucket().progress[id] = { t, dur, pct };
      save();
    },
    clearProgress(id) { delete bucket().progress[id]; save(); },

    /* Titles with progress, most recent first — feeds Continue Watching. */
    watchedIds() {
      const p = bucket().progress;
      return Object.keys(p).filter((id) => p[id].pct > 2 && p[id].pct < 95);
    },
  };
})();
