/* ═══════════════════════════════════════════════════════════════
   SoodFlix — persistence
   Everything that must survive a refresh lives here: the selected
   profile, My List, thumbs up/down and playback progress.
   State is namespaced per profile so each one keeps its own list.
   ═══════════════════════════════════════════════════════════ */

const Store = (() => {
  const KEY = 'soodflix.v1';

  const blank = () => ({
    profileId: null,     // who is signed in right now
    lastProfileId: null, // who was signed in last visit
    profiles: null,      // null until seeded from data.js defaults
    byProfile: {},
  });

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
    /* ── Preview sound ──────────────────────────────────────────
       Global, not per-profile: Netflix remembers whether you last
       left trailer previews muted. Defaults to muted, because
       browsers block autoplay with sound anyway. */
    getPreviewMuted: () => state.previewMuted !== false,
    setPreviewMuted(m) { state.previewMuted = !!m; save(); },

    /* ── Profiles ─────────────────────────────────────────────────
       The list itself is persisted, so one added in the browser is
       still there next visit. data.js only supplies the starting set
       the very first time someone opens the site. */
    getProfiles(defaults) {
      if (!state.profiles) {
        state.profiles = (defaults || []).map((p) => ({ ...p }));
        save();
      }
      return state.profiles.map((p) => ({ ...p }));
    },

    getProfile(id) {
      const p = (state.profiles || []).find((x) => x.id === id);
      return p ? { ...p } : null;
    },

    addProfile({ name, avatar, kids = false }) {
      state.profiles ||= [];
      const profile = {
        id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        avatar,
        kids: !!kids,
      };
      state.profiles.push(profile);
      save();
      return { ...profile };
    },

    updateProfile(id, changes) {
      const p = (state.profiles || []).find((x) => x.id === id);
      if (!p) return null;
      Object.assign(p, changes);
      save();
      return { ...p };
    },

    /* Removing a profile takes its watch history with it. */
    removeProfile(id) {
      state.profiles = (state.profiles || []).filter((x) => x.id !== id);
      delete state.byProfile[id];
      if (state.profileId === id) state.profileId = null;
      if (state.lastProfileId === id) state.lastProfileId = null;
      save();
    },

    /* ── Who's signed in ────────────────────────────────────── */
    getProfileId: () => state.profileId,
    setProfileId(id) { state.profileId = id; state.lastProfileId = id; save(); },
    clearProfile() { state.profileId = null; save(); },
    getLastProfileId: () => state.lastProfileId,

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
