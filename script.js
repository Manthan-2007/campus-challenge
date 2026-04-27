/* ===========================================================
   CAMPUS CHALLENGE — Local Backend Edition
   Plain HTML / CSS / Vanilla JS + Local Express/SQLite Backend
   =========================================================== */

const API_BASE = "https://manthan-2007-campus-challenge-backend-production.up.railway.app/api";

const auth = {
  get currentUser() {
    const id = localStorage.getItem("cc_uid");
    const email = localStorage.getItem("cc_email");
    return id ? { uid: id, email } : null;
  }
};

const DB = {
  createUserDoc: async (id, email) => { /* created automatically on signup */ },
  getUserDoc: async (id) => {
    try {
      const r = await fetch(`${API_BASE}/me?id=${id}`);
      if(!r.ok) return null;
      return await r.json();
    } catch { return null; }
  },
  updateUserProfile: async (id, data) => {
    await fetch(`${API_BASE}/profile`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({id, ...data})
    });
    return true;
  },
  updateUserSettings: async (id, settings) => {
    await fetch(`${API_BASE}/settings`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({id, settings})
    });
  },
  sendTask: async (matchId, taskText) => {
    await fetch(`${API_BASE}/match/task`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({matchId, taskText})
    });
  },
  uploadMediaFile: (uid, matchId, file, type, onProgress) => {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", file);
      
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/upload`, true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            const filename = res.filename;
            const url = `${API_BASE.replace('/api', '')}/uploads/${filename}`;
            resolve({ id: url, downloadURL: url });
          } catch(err) { reject(err); }
        } else {
          reject(new Error("Upload failed with status " + xhr.status));
        }
      };
      
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(fd);
    });
  },
  submitProof: async (matchId, uid, type, text) => {
    let proofMediaUrl = null;
    if (state.attachmentMeta && state.attachmentMeta.url) {
      proofMediaUrl = state.attachmentMeta.url;
    }
    await fetch(`${API_BASE}/match/proof`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({matchId, proofType: type, proofText: text, proofMediaUrl})
    });
  },
  reviewMatch: async (matchId, action, completerId, taskText, proofType) => {
    const r = await fetch(`${API_BASE}/match/review`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({matchId, action, completerId, taskText, proofType})
    });
    return await r.json();
  },
  fetchFeed: async () => {
    const r = await fetch(`${API_BASE}/feed`);
    return await r.json();
  },
  fetchLeaderboard: async () => {
    const r = await fetch(`${API_BASE}/leaderboard`);
    return await r.json();
  },
  fetchCompletedTasks: async (uid) => {
    const r = await fetch(`${API_BASE}/feed/user?id=${uid}`);
    return await r.json();
  },
  getUserMusic: async (uid) => {
    const r = await fetch(`${API_BASE}/music?userId=${uid}`);
    return await r.json();
  },
  uploadMusicFile: async (uid, file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
    const { filename, originalName } = await r.json();
    const url = `${API_BASE.replace('/api', '')}/uploads/${filename}`;
    await fetch(`${API_BASE}/music`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({userId: uid, fileName: originalName || filename, downloadURL: url})
    });
  },
  deleteMusicFile: async (id, storagePath) => {
    await fetch(`${API_BASE}/music/${id}`, { method: "DELETE" });
  },
  isAbnormalTask: async (text) => {
    try {
      const res = await fetch(`${API_BASE}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      return data.abnormal;
    } catch(e){ return false; }
  },

  // Matchmaking Polyfills
  joinMatchQueue: async (uid) => {
    await fetch(`${API_BASE}/queue/join`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({userId: uid})
    });
  },
  findWaitingUser: async () => { return null; }, // Handled by backend now
  createMatch: async () => { return null; }, // Handled by backend now
  updateQueueMatched: async () => {}, // Handled by backend now
  removeFromQueue: async (uid) => {
    await fetch(`${API_BASE}/queue/leave`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({userId: uid})
    });
  },
  listenQueue: (uid, callback) => {
    const interval = setInterval(async () => {
      const res = await fetch(`${API_BASE}/queue/poll?userId=${uid}`);
      const data = await res.json();
      callback(data);
    }, 2000);
    return () => clearInterval(interval);
  },
  listenMatch: (matchId, callback) => {
    const interval = setInterval(async () => {
      const res = await fetch(`${API_BASE}/match?matchId=${matchId}`);
      if(res.ok) callback(await res.json());
    }, 2000);
    return () => clearInterval(interval);
  },
  getMatch: async (matchId) => {
    const res = await fetch(`${API_BASE}/match?matchId=${matchId}`);
    return res.ok ? await res.json() : null;
  },
  getUserInfo: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/user-info?id=${id}`);
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },
  // FIX #4 — was missing, caused runtime error when 3-min task timer ran out
  expireMatch: async (matchId) => {
    try {
      await fetch(`${API_BASE}/match/expire`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ matchId })
      });
    } catch {}
  }
};

/* ---------- STATE ---------- */
const state = {
  user: { id: null, email: null, name: "—", course: "", department: "", section: "", score: 0 },
  settings: { theme: "cream", mood: "light", sound: false, music: false },
  activeMatchId: localStorage.getItem("cc_activeMatchId") || null,
  role: null,
  matchId: null,
  task: "",
  attachment: null,
  attachmentMeta: null, // { type, mediaId, url, name } for media; { type: "text" } for text
  pendingMediaType: null, // temporary for file input
  timer: null,
  timerEndsAt: null,
  timerMode: "idle",
  matchUnsub: null,
  queueUnsub: null,
  startMatchUnsub: null,
  feed: [],
  leaderboard: [],
  // Lobby state
  lobbyTimer: null,
  lobbyStartTime: null,
  // Pending match data (stored while showing reveal overlay)
  pendingMatchData: null,
  pendingMatchId: null,
  // Music state
  music: {
    tracks: [],
    currentIndex: 0,
    isPlaying: false,
    audio: null,
  },
};

/* ---------- HELPERS ---------- */
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));

function escapeHTML(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function setActiveMatchId(id) {
  state.activeMatchId = id || null;
  if (id) localStorage.setItem("cc_activeMatchId", id);
  else localStorage.removeItem("cc_activeMatchId");
}

function matchStatusLabel(s) {
  const map = {
    PENDING_TASK: "waiting for giver to send task (3 min)",
    ACTIVE: "task active (7 hours)",
    PENDING_REVIEW: "proof submitted (needs review)",
    APPROVED: "approved ✅",
    REJECTED: "rejected ❌",
    EXPIRED: "expired ⏳",
  };
  return map[s] || String(s || "—");
}

function updateScoreChips() {
  ["profile-score","task-score","settings-score","feed-score","leaderboard-score","lobby-score"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = state.user.score;
  });
  const ps = $("#p-score");
  if (ps) ps.textContent = state.user.score;
}

function showScreen(name) {
  // 'task' always goes through the matchmaking lobby flow
  if (name === "task") { startMatch(); return; }

  $$(".screen").forEach((s) => s.classList.remove("active"));
  const target = $(`#screen-${name}`);
  if (target) target.classList.add("active");

  if (name === "profile") renderProfile();
  if (name === "settings") syncSettings();
  if (name === "start") { stopTimer(); stopLobby(); cleanupListeners(); refreshStartMatchSummary(); }
  if (name === "feed") renderFeed();
  if (name === "leaderboard") renderLeaderboard();
  updateScoreChips();
}

/* ---------- POPUP BUBBLES ---------- */
function pushPopup(name, score, msg) {
  const stack = $("#popup-stack");
  const bubble = document.createElement("div");
  bubble.className = "popup-bubble";
  bubble.innerHTML = `
    <span class="popup-name">${escapeHTML(name)}</span>
    <span class="popup-score">★ ${score}</span>
    <span class="popup-msg">${escapeHTML(msg)}</span>`;
  stack.appendChild(bubble);
  const all = $$(".popup-bubble", stack);
  if (all.length > 4) dismissBubble(all[0]);
  setTimeout(() => dismissBubble(bubble), 10000);
}

function dismissBubble(bubble) {
  if (!bubble || !bubble.isConnected) return;
  bubble.classList.add("fade-out");
  setTimeout(() => bubble.remove(), 350);
}

/* ---------- NAV ---------- */
document.addEventListener("click", (e) => {
  const navBtn = e.target.closest("[data-nav]");
  if (navBtn) showScreen(navBtn.dataset.nav);
});

/* ===========================================================
   AUTH
   =========================================================== */
window.signUp = async function () {
  console.log("signUp function triggered!");
  try {
    const email = $("#email").value.trim();
    const password = $("#password").value.trim();
    if (!email || !password) return pushPopup("System", 0, "Enter email and password");
    
    const r = await fetch(`${API_BASE}/signup`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email, password})
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    
    localStorage.setItem("cc_uid", data.id);
    localStorage.setItem("cc_email", data.email);
    await bootAuthed({uid: data.id, email: data.email});
    
    $("#login-modal").style.display = "none";
    setTimeout(() => pushPopup("Campus Bot", state.user.score, "welcome, doodler!"), 600);
  } catch (err) { 
    console.error("signUp error:", err);
    pushPopup("Auth Error", 0, err.message); 
  }
};

window.login = async function () {
  console.log("login function triggered!");
  try {
    const email = $("#email").value.trim();
    const password = $("#password").value.trim();
    if (!email || !password) return pushPopup("System", 0, "Enter email and password");
    
    const r = await fetch(`${API_BASE}/login`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email, password})
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    localStorage.setItem("cc_uid", data.id);
    localStorage.setItem("cc_email", data.email);
    await bootAuthed({uid: data.id, email: data.email});
    
    $("#login-modal").style.display = "none";
    setTimeout(() => pushPopup("Campus Bot", state.user.score, "welcome back, doodler!"), 600);
  } catch (err) { 
    console.error("login error:", err);
    pushPopup("Auth Error", 0, err.message); 
  }
};

async function bootAuthed(firebaseUser) {
  const userData = await DB.getUserDoc(firebaseUser.uid);
  if (!userData) {
    await DB.createUserDoc(firebaseUser.uid, firebaseUser.email);
    return bootAuthed(firebaseUser);
  }
  state.user = {
    id: userData.id,
    email: userData.email,
    name: userData.name || "—",
    course: userData.course || "",
    department: userData.department || "",
    section: userData.section || "",
    score: userData.score || 0,
  };
  state.settings = userData.settings || state.settings;
  syncSettings();
  updateScoreChips();
  await Promise.allSettled([loadFeed(), loadLeaderboard(), renderCompletedTasks(), refreshStartMatchSummary()]);
}

function logout() {
  stopTimer();
  cleanupListeners();
  setActiveMatchId(null);
  state.user = { id: null, email: null, name: "—", course: "", department: "", section: "", score: 0 };
  state.settings = { theme: "cream", mood: "light", sound: false, music: false };
  state.feed = [];
  state.leaderboard = [];
  state.matchId = null;
  state.role = null;
  state.task = "";
  state.attachment = null;
  syncSettings();
  updateScoreChips();
  localStorage.removeItem("cc_uid");
  localStorage.removeItem("cc_email");
  $("#login-modal").style.display = "flex";
  showScreen("start");
}

document.addEventListener("click", (e) => { if (e.target.id === "logout-btn") logout(); });

/* ===========================================================
   MUSIC PLAYER
   =========================================================== */
const musicModal = $("#music-modal");
const musicListEl = $("#music-list");
const musicEmptyEl = $("#music-empty");
const musicPlayerEl = $("#music-player");
const trackNameEl = $("#current-track-name");
const trackTimeEl = $("#track-time");
const seekSlider = $("#music-seek");
const playPauseBtn = $("#music-play-pause");
const prevBtn = $("#music-prev");
const nextBtn = $("#music-next");

function openMusicModal() {
  if (!auth.currentUser) {
    pushPopup("Music Bot", 0, "login to use music!");
    $("#login-modal").style.display = "flex";
    return;
  }
  musicModal.style.display = "flex";
  loadUserMusic();
}

function closeMusicModal() {
  musicModal.style.display = "none";
  stopMusic();
}

async function loadUserMusic() {
  if (!auth.currentUser) return;
  try {
    const tracks = await DB.getUserMusic(auth.currentUser.uid);
    state.music.tracks = tracks;
    renderMusicList();
  } catch (err) {
    console.error("Failed to load music:", err);
  }
}

function renderMusicList() {
  if (!musicListEl) return;
  // Clear all music items except the empty message
  $$(".music-item", musicListEl).forEach(el => el.remove());

  if (state.music.tracks.length === 0) {
    if (musicEmptyEl) musicEmptyEl.style.display = "";
    return;
  }

  if (musicEmptyEl) musicEmptyEl.style.display = "none";

  state.music.tracks.forEach((track, idx) => {
    const item = document.createElement("div");
    item.className = `music-item${idx === state.music.currentIndex ? " playing" : ""}`;
    item.innerHTML = `
      <span class="music-item-playing-icon">${idx === state.music.currentIndex && state.music.isPlaying ? "♫" : "♫"}</span>
      <span class="music-item-name">${escapeHTML(track.fileName)}</span>
      <button class="music-item-delete" data-music-delete="${track.id}" data-storage-path="${escapeHTML(track.storagePath)}">×</button>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("music-item-delete")) return;
      playTrack(idx);
    });
    musicListEl.appendChild(item);
  });
}

async function uploadMusicFile() {
  const input = document.getElementById("music-file-input");
  if (!input || !auth.currentUser) return;

  const file = input.files[0];
  if (!file) return;

  try {
    await DB.uploadMusicFile(auth.currentUser.uid, file);
    input.value = "";
    pushPopup("Music Bot", 0, "track uploaded! 🎵");
    loadUserMusic();
  } catch (err) {
    pushPopup("Music Bot", 0, "upload failed: " + err.message);
  }
}

async function deleteMusic(musicId, storagePath) {
  try {
    await DB.deleteMusicFile(musicId, storagePath);
    pushPopup("Music Bot", 0, "track removed");
    loadUserMusic();
    // If current track was deleted, stop playback
    const current = state.music.tracks[state.music.currentIndex];
    if (current && current.id === musicId) {
      stopMusic();
    }
  } catch (err) {
    pushPopup("Music Bot", 0, "delete failed: " + err.message);
  }
}

function playTrack(index) {
  if (!state.music.audio) {
    state.music.audio = new Audio();
    state.music.audio.addEventListener("ended", () => playNext());
    state.music.audio.addEventListener("timeupdate", updateSeek);
    state.music.audio.addEventListener("loadedmetadata", () => {
      trackTimeEl.textContent = `0:00 / ${formatTime(state.music.audio.duration)}`;
    });
  }

  const track = state.music.tracks[index];
  if (!track) return;

  state.music.currentIndex = index;
  state.music.audio.src = track.downloadURL;
  state.music.audio.play();
  state.music.isPlaying = true;

  trackNameEl.textContent = track.fileName;
  musicPlayerEl.style.display = "block";
  playPauseBtn.textContent = "⏸";

  renderMusicList();
}

function togglePlayPause() {
  if (!state.music.audio) return;
  if (state.music.isPlaying) {
    state.music.audio.pause();
    state.music.isPlaying = false;
    playPauseBtn.textContent = "▶";
  } else {
    state.music.audio.play();
    state.music.isPlaying = true;
    playPauseBtn.textContent = "⏸";
  }
  renderMusicList();
}

function stopMusic() {
  if (state.music.audio) {
    state.music.audio.pause();
    state.music.audio.currentTime = 0;
    state.music.isPlaying = false;
    state.music.audio = null;
  }
  musicPlayerEl.style.display = "none";
  playPauseBtn.textContent = "▶";
}

function playNext() {
  if (state.music.tracks.length === 0) return;
  const nextIdx = (state.music.currentIndex + 1) % state.music.tracks.length;
  playTrack(nextIdx);
}

function playPrev() {
  if (state.music.tracks.length === 0) return;
  const prevIdx = (state.music.currentIndex - 1 + state.music.tracks.length) % state.music.tracks.length;
  playTrack(prevIdx);
}

function updateSeek() {
  if (!state.music.audio) return;
  const { currentTime, duration } = state.music.audio;
  const percent = (currentTime / duration) * 100;
  seekSlider.value = percent;
  trackTimeEl.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}

function seekTrack() {
  if (!state.music.audio || !state.music.audio.duration) return;
  const percent = seekSlider.value / 100;
  state.music.audio.currentTime = percent * state.music.audio.duration;
}

// FIX #5 — duplicate formatTime removed; the timer version below (line ~870) handles both cases

/* ---------- MUSIC EVENT LISTENERS ---------- */
document.addEventListener("click", (e) => {
  // FIX #3 — removed openMusicModal() here; bg music toggle handles #music-toggle.
  // Music library modal is opened from Settings screen via #open-music-library-btn.
  if (e.target.id === "open-music-library-btn") {
    openMusicModal();
  }

  // Close music modal
  if (e.target.id === "close-music-btn") {
    closeMusicModal();
  }

  // Upload music button
  if (e.target.id === "upload-music-btn") {
    document.getElementById("music-file-input").click();
  }

  // Delete music
  const delBtn = e.target.closest("[data-music-delete]");
  if (delBtn) {
    const musicId = delBtn.dataset.musicDelete;
    const storagePath = delBtn.dataset.storagePath;
    deleteMusic(musicId, storagePath);
  }
});

document.addEventListener("change", (e) => {
  if (e.target.id === "music-file-input") {
    uploadMusicFile();
  }
});

document.addEventListener("click", (e) => {
  if (e.target.id === "music-play-pause") togglePlayPause();
  if (e.target.id === "music-next") playNext();
  if (e.target.id === "music-prev") playPrev();
});

document.addEventListener("input", (e) => {
  if (e.target.id === "music-seek") seekTrack();
});

/* ===========================================================
   PROFILE
   =========================================================== */
function renderProfile() {
  $("#p-name").textContent = state.user.name || "—";
  $("#p-course").textContent = state.user.course || "—";
  $("#p-dept").textContent = state.user.department || "—";
  $("#p-section").textContent = state.user.section || "—";
  $("#p-score").textContent = state.user.score || 0;
  renderCompletedTasks();
}

async function renderCompletedTasks() {
  const list = $("#completed-tasks-list");
  const empty = $("#completed-tasks-empty");
  if (!list) return;
  $$(".completed-task-card", list).forEach((el) => el.remove());
  if (!auth.currentUser) { if (empty) empty.style.display = ""; return; }

  try {
    const posts = await DB.fetchCompletedTasks(auth.currentUser.uid);
    if (posts.length === 0) { if (empty) empty.style.display = ""; return; }
    if (empty) empty.style.display = "none";
    posts.forEach((p, i) => {
      const tilt = i % 2 === 0 ? "card-tilt-l" : "card-tilt-r";
      const node = document.createElement("article");
      node.className = `card ${tilt} completed-task-card`;
      node.innerHTML = `<span class="card-pin"></span>
        <h3 class="card-label">completed task</h3>
        <p class="card-value" style="font-size:16px">${escapeHTML(p.taskText)}</p>
        <p style="margin:8px 0 0;font-size:12px;color:var(--ink-soft)">proof: ${escapeHTML(p.proofType)} • ★ score posted</p>`;
      list.appendChild(node);
    });
  } catch { if (empty) empty.style.display = ""; }
}

function openEditProfileModal() {
  $("#edit-name").value = state.user.name || "";
  $("#edit-course").value = state.user.course || "";
  $("#edit-department").value = state.user.department || "";
  $("#edit-section").value = state.user.section || "";
  $("#edit-profile-modal").style.display = "flex";
}

async function saveProfile() {
  try {
    const data = {
      name: $("#edit-name").value.trim(),
      course: $("#edit-course").value.trim(),
      department: $("#edit-department").value.trim(),
      section: $("#edit-section").value.trim(),
    };
    const updated = await DB.updateUserProfile(auth.currentUser.uid, data);
    if (updated) {
      state.user = { ...state.user, ...data };
      renderProfile();
    }
    $("#edit-profile-modal").style.display = "none";
    pushPopup("Profile Bot", state.user.score, "profile updated ✎");
  } catch (err) { alert(err.message); }
}

document.addEventListener("click", (e) => {
  if (e.target.id === "edit-profile-btn") openEditProfileModal();
  if (e.target.id === "cancel-profile-btn") $("#edit-profile-modal").style.display = "none";
  if (e.target.id === "save-profile-btn") saveProfile();
});

/* ===========================================================
   SETTINGS
   =========================================================== */
function syncSettings() {
  document.body.dataset.theme = state.settings.theme || "cream";
  document.body.dataset.mood = state.settings.mood || "light";
  $("#sound-toggle").checked = !!state.settings.sound;
  $("#sound-label").textContent = state.settings.sound ? "ON" : "OFF";
  const moodInput = document.querySelector(`input[name="mood"][value="${state.settings.mood}"]`);
  if (moodInput) moodInput.checked = true;
  const emailEl = $("#settings-email");
  if (emailEl) emailEl.textContent = state.user.email || "—";
}

document.addEventListener("click", async (e) => {
  const sw = e.target.closest(".theme-swatch");
  if (sw) {
    state.settings.theme = sw.dataset.theme;
    syncSettings();
    pushPopup("Vibe Bot", 0, `theme → ${state.settings.theme}`);
    if (auth.currentUser) await DB.updateUserSettings(auth.currentUser.uid, { theme: state.settings.theme });
  }
});

document.addEventListener("change", async (e) => {
  if (e.target.name === "mood") {
    state.settings.mood = e.target.value;
    syncSettings();
    if (auth.currentUser) await DB.updateUserSettings(auth.currentUser.uid, { mood: state.settings.mood });
  }
  if (e.target.id === "sound-toggle") {
    state.settings.sound = e.target.checked;
    syncSettings();
    pushPopup("Vibe Bot", 0, `playful sound: ${state.settings.sound ? "ON" : "OFF"}`);
    if (auth.currentUser) await DB.updateUserSettings(auth.currentUser.uid, { sound: state.settings.sound });
  }

  // Media file upload for proof
  if (e.target.id === "media-file-input") {
    const file = e.target.files[0];
    if (!file) return;
    const type = state.pendingMediaType;
    if (!type) return;

    if (!auth.currentUser) {
      pushPopup("System", 0, "login required");
      return;
    }
  if (!state.matchId) {
    pushPopup("System", 0, "no active match");
    return;
  }

  // Validate file type matches selected button
  const typePrefix = type === "audio" ? "audio" : type; // audio/* type
  const mimeOk = type === "image"
    ? file.type.startsWith("image/")
    : type === "audio"
    ? file.type.startsWith("audio/")
    : type === "video"
    ? file.type.startsWith("video/")
    : true;
  if (!mimeOk) {
    pushPopup("Error", 0, `file type mismatch: expected ${type}`);
    e.target.value = "";
    return;
  }

  // Max 100MB
  if (file.size > 100 * 1024 * 1024) {
    pushPopup("Error", 0, "file too large (max 100MB)");
    e.target.value = "";
    return;
  }

  // Show uploading state immediately
  $("#cd-label").textContent = "uploading... 0%";
  $("#cd-disc").className = "cd-disc loaded";

  try {
    const result = await DB.uploadMediaFile(
      auth.currentUser.uid, 
      state.matchId, 
      file, 
      type,
      (percent) => {
        $("#cd-label").textContent = `uploading... ${percent}%`;
      }
    );
    state.attachment = type;
    state.attachmentMeta = { type, mediaId: result.id, url: result.downloadURL, name: file.name };
    $("#cd-label").textContent = file.name;
    $("#cd-disc").className = `cd-disc loaded ${type}`;
    pushPopup("Disc Tray", 0, `${type} uploaded 💿`);
  } catch (err) {
    $("#cd-label").textContent = "upload failed ✕";
    $("#cd-disc").className = "cd-disc";
    pushPopup("Error", 0, "upload failed: " + err.message);
  } finally {
    e.target.value = "";
    state.pendingMediaType = null;
  }
  }
});

/* ===========================================================
   FEED
   =========================================================== */
async function loadFeed() {
  try {
    const posts = await DB.fetchFeed();
    state.feed = posts;
    renderFeed();
  } catch { state.feed = []; renderFeed(); }
}

function renderFeed() {
  const list = $("#feed-list");
  if (!list) return;
  list.innerHTML = "";
  if (state.feed.length === 0) {
    list.innerHTML = `<p class="feed-empty">no posts yet — complete tasks and share! ✦</p>`;
    return;
  }
  state.feed.forEach((post, i) => {
    const tilt = i % 2 === 0 ? "feed-post-tilt-l" : "feed-post-tilt-r";
    const node = document.createElement("article");
    node.className = `feed-post ${tilt}`;
    node.innerHTML = `<span class="feed-post-pin"></span>
      <div class="feed-post-header">
        <span class="feed-post-name">${escapeHTML(post.userName)}</span>
        <span class="feed-post-score">★ ${post.scoreAtPost}</span>
      </div>
      <p class="feed-post-task">${escapeHTML(post.taskText)}</p>
      <p class="feed-post-proof">proof: ${escapeHTML(post.proofType)}</p>
      <div class="feed-post-actions">
        <button class="doodle-btn" data-feed-share="${i}">↗ share</button>
      </div>`;
    list.appendChild(node);
  });
}

document.addEventListener("click", (e) => {
  const shareBtn = e.target.closest("[data-feed-share]");
  if (!shareBtn) return;
  const post = state.feed[Number(shareBtn.dataset.feedShare)];
  if (!post) return;
  navigator.clipboard.writeText(`I completed: ${post.taskText} on Campus Challenge!`)
    .then(() => pushPopup("Share Bot", 0, "copied to clipboard! ↗"))
    .catch(() => pushPopup("Share Bot", 0, "couldn't copy — try manually!"));
});

/* ===========================================================
   LEADERBOARD
   =========================================================== */
async function loadLeaderboard() {
  try { state.leaderboard = await DB.fetchLeaderboard(); renderLeaderboard(); }
  catch { state.leaderboard = []; renderLeaderboard(); }
}

function renderLeaderboard() {
  const list = $("#leaderboard-list");
  if (!list) return;
  list.innerHTML = "";
  const rankLabels = ["🥇", "🥈", "🥉"];
  const rankClasses = ["gold", "silver", "bronze"];
  state.leaderboard.forEach((u, i) => {
    const isMe = u.id === state.user.id;
    const row = document.createElement("div");
    row.className = `lb-row${isMe ? " lb-you" : ""}`;
    row.innerHTML = `
      <span class="lb-rank ${rankClasses[i] || ""}">${rankLabels[i] || `#${i + 1}`}</span>
      <span class="lb-name">${escapeHTML(u.name || "Unknown")}${isMe ? " (you)" : ""}</span>
      <span class="lb-score">★ ${u.score || 0}</span>`;
    list.appendChild(row);
  });
}

/* ===========================================================
   TIMER
   =========================================================== */
function setTimerDisplay(text, mode) {
  $("#timer-display").textContent = text;
  $("#timer-mode").textContent = mode;
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function startTimer(seconds, mode, onEnd) {
  stopTimer();
  state.timerMode = mode;
  state.timerEndsAt = Date.now() + seconds * 1000;
  const tick = () => {
    const remaining = Math.max(0, Math.floor((state.timerEndsAt - Date.now()) / 1000));
    setTimerDisplay(formatTime(remaining), mode);
    if (remaining <= 0) { stopTimer(); if (typeof onEnd === "function") onEnd(); }
  };
  tick();
  state.timer = setInterval(tick, 1000);
}

function stopTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  state.timerMode = "idle";
}

function cleanupListeners() {
  if (state.matchUnsub) { state.matchUnsub(); state.matchUnsub = null; }
  if (state.queueUnsub) { state.queueUnsub(); state.queueUnsub = null; }
  if (state.startMatchUnsub) { state.startMatchUnsub(); state.startMatchUnsub = null; }
}

/* ===========================================================
   START SCREEN — CURRENT MATCH SUMMARY
   =========================================================== */
async function refreshStartMatchSummary() {
  const block = $("#current-match-block");
  const statusEl = $("#current-match-status");
  const taskEl = $("#current-match-task");
  const openBtn = $("#current-match-open");
  const clearBtn = $("#current-match-clear");
  if (!block) return;

  if (state.startMatchUnsub) { state.startMatchUnsub(); state.startMatchUnsub = null; }

  if (!auth.currentUser || !state.activeMatchId) { block.style.display = "none"; return; }

  openBtn.onclick = () => showScreen("task");
  clearBtn.onclick = () => { setActiveMatchId(null); block.style.display = "none"; };

  try {
    const m = await DB.getMatch(state.activeMatchId);
    if (!m) { block.style.display = "none"; return; }
    block.style.display = "";
    statusEl.textContent = matchStatusLabel(m.status);
    // FIX #6 — match stores taskText directly, not task.text
    taskEl.textContent = m.taskText || "—";
  } catch { block.style.display = "none"; }
}

/* ===========================================================
   TASK FLOW (MATCHMAKING + GAME)
   =========================================================== */
function isOnTaskScreen() {
  return $("#screen-task").classList.contains("active");
}

function renderActions(keys) {
  const bar = $("#action-bar");
  bar.innerHTML = "";
  const map = {
    "send-task": { label: "Send Task", cls: "primary", fn: doSendTask },
    approve: { label: "Approve", cls: "primary", fn: () => doReview("approve") },
    reject: { label: "Reject", cls: "", fn: () => doReview("reject") },
    "submit-proof": { label: "Submit Proof", cls: "primary", fn: doSubmitProof },
  };
  keys.forEach((k) => {
    const cfg = map[k];
    if (!cfg) return;
    const btn = document.createElement("button");
    btn.className = `doodle-btn ${cfg.cls}`;
    btn.textContent = cfg.label;
    btn.addEventListener("click", cfg.fn);
    bar.appendChild(btn);
  });
}

function setupMatchUI(matchData, matchId) {
  state.matchId = matchId;
  setActiveMatchId(matchId);
  const uid = auth.currentUser.uid;
  state.role = uid === matchData.giverId ? "giver" : "completer";
  $("#role-tag").textContent = state.role === "giver" ? "Task Giver" : "Completer";

  // Listen for real-time match updates
  if (state.matchUnsub) state.matchUnsub();
  state.matchUnsub = DB.listenMatch(matchId, (m) => {
    if (!m || !isOnTaskScreen()) return;
    handleMatchUpdate(m);
  });

  if (state.role === "giver") {
    $("#status-tag").textContent = "your turn — write a task!";
    $("#task-text").textContent = "you have 3 minutes to send a task to your match.";
    $("#task-input-row").hidden = false;
    renderActions(["send-task"]);
    startTimer(3 * 60, "send within 3 minutes", () => {
      DB.expireMatch(matchId);
      pushPopup("System", 0, "match expired");
    });
  } else {
    $("#status-tag").textContent = "waiting for the giver to send your task…";
    renderActions([]);
    // Real-time listener will fire handleMatchUpdate when task arrives
  }
}

async function handleMatchUpdate(m) {
  if (!isOnTaskScreen()) return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  if (m.status === "ACTIVE" && m.taskText && state.role === "completer") {
    state.task = m.taskText;
    $("#task-text").textContent = state.task;
    $("#status-tag").textContent = "you've got 7 hours to complete this!";
    renderActions(["submit-proof"]);
    startTimer(7 * 60 * 60, "complete within 7 hours", () => pushPopup("System", 0, "expired"));
  }

  if (m.status === "PENDING_REVIEW" && state.role === "giver" && m.proofType) {
    $("#status-tag").textContent = "proof received — review it!";
    $("#cd-label").textContent = `proof: ${m.proofType}`;
    $("#cd-disc").className = `cd-disc loaded ${m.proofType}`;
    renderActions(["approve", "reject"]);

    // Show and render proof content
    const proofArea = $("#tv-proof-area");
    const proofContent = $("#tv-proof-content");
    if (proofArea && proofContent && proofContent.innerHTML === "") {
      proofArea.style.display = "block";
      proofContent.innerHTML = ""; // clear previous

      try {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "10px";
        wrapper.style.border = "2px dashed var(--line)";
        wrapper.style.borderRadius = "10px";
        wrapper.style.padding = "8px";
        wrapper.style.background = "var(--paper)";

        const type = m.proofType;
        const url = m.proofMediaUrl;
        
        if (url) {
          const nameEl = document.createElement("p");
          nameEl.style.margin = "0 0 6px";
          nameEl.style.fontSize = "13px";
          nameEl.textContent = `📎 attached proof`;
          wrapper.appendChild(nameEl);
        }

        if (type === "image" && url) {
          const img = document.createElement("img");
          img.src = url;
          img.style.maxWidth = "100%";
          img.style.borderRadius = "8px";
          wrapper.appendChild(img);
        } else if (type === "audio" && url) {
          const audio = document.createElement("audio");
          audio.src = url;
          audio.controls = true;
          audio.style.width = "100%";
          wrapper.appendChild(audio);
        } else if (type === "video" && url) {
          const video = document.createElement("video");
          video.src = url;
          video.controls = true;
          video.style.maxWidth = "100%";
          video.style.borderRadius = "8px";
          wrapper.appendChild(video);
        } else if (type === "text" || !url) {
          const txt = document.createElement("p");
          txt.style.margin = "0";
          txt.style.fontSize = "14px";
          txt.textContent = m.proofText || "(no text)";
          wrapper.appendChild(txt);
        }

        proofContent.appendChild(wrapper);
      } catch (err) {
        proofContent.innerHTML = `<p style="color:var(--accent)">failed to load proof</p>`;
      }
    }
  }

  if (["APPROVED", "REJECTED", "EXPIRED"].includes(m.status)) {
    stopTimer();
    const proofArea = $("#tv-proof-area");
    if (proofArea) proofArea.style.display = "none";

    // If I'm the completer, show me the outcome of the review automatically!
    if (state.role === "completer" && !$("#screen-result").classList.contains("active")) {
      const outcome = m.status === "APPROVED" ? "Approved!" : (m.status === "REJECTED" ? "Rejected!" : "Expired");
      const delta = m.status === "APPROVED" ? 10 : (m.status === "REJECTED" ? -5 : 0);
      
      // Update local score before showing result
      if (state.user && m.status !== "EXPIRED") {
        state.user.score = Math.max(0, state.user.score + delta);
        updateScoreChips();
      }
      
      showResult(outcome, delta);
      setActiveMatchId(null); // Clear active match
    }
  }
}

/* ===========================================================
   LOBBY — PRE-GAME WAITING ROOM
   =========================================================== */
function showLobby() {
  // Switch to lobby screen
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#screen-lobby").classList.add("active");
  updateScoreChips();

  // Set your name in the pill
  const lobbyName = $("#lobby-your-name");
  if (lobbyName) lobbyName.textContent = state.user.name || "You";

  // Start elapsed timer
  state.lobbyStartTime = Date.now();
  if (state.lobbyTimer) clearInterval(state.lobbyTimer);
  state.lobbyTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.lobbyStartTime) / 1000);
    const txt = $("#lobby-time-text");
    if (txt) txt.textContent = `Searching campus… ${elapsed}s`;
  }, 1000);
}

function stopLobby() {
  if (state.lobbyTimer) { clearInterval(state.lobbyTimer); state.lobbyTimer = null; }
}

function spawnConfetti() {
  const container = $("#or-confetti");
  if (!container) return;
  container.innerHTML = "";
  const colors = ["var(--accent)","var(--yellow)","var(--mint)","var(--blue)","var(--peach)"];
  for (let i = 0; i < 28; i++) {
    const dot = document.createElement("div");
    dot.className = "or-confetti-dot";
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.background = colors[Math.floor(Math.random() * colors.length)];
    dot.style.animationDuration = `${0.8 + Math.random() * 1.2}s`;
    dot.style.animationDelay = `${Math.random() * 0.4}s`;
    dot.style.width = dot.style.height = `${6 + Math.random() * 8}px`;
    container.appendChild(dot);
  }
}

function startOpponentCountdown(matchData, matchId) {
  let n = 3;
  const el = $("#or-countdown");
  if (el) { el.textContent = n; el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; }

  const tick = setInterval(() => {
    n--;
    if (n <= 0) {
      clearInterval(tick);
      // Hide reveal
      const reveal = $("#opponent-reveal");
      if (reveal) reveal.style.display = "none";
      // Go to task screen and set up the match
      $$(".screen").forEach(s => s.classList.remove("active"));
      $("#screen-task").classList.add("active");
      resetTaskUI();
      setupMatchUI(matchData, matchId);
      return;
    }
    if (el) {
      el.textContent = n;
      // Re-trigger animation
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    }
  }, 1000);
}

async function showOpponentReveal(matchData, matchId) {
  stopLobby();
  const uid = auth.currentUser.uid;
  const oppId = matchData.giverId === uid ? matchData.completerId : matchData.giverId;
  const role = matchData.giverId === uid ? "Task Giver 📋" : "Completer ✅";

  // Fetch opponent info
  const opp = await DB.getUserInfo(oppId);

  // Populate MY card
  $("#or-my-name").textContent  = state.user.name  || "You";
  $("#or-my-course").textContent = [state.user.course, state.user.department].filter(Boolean).join(" · ") || "—";
  $("#or-my-score").textContent  = `★ ${state.user.score || 0}`;

  // Populate OPPONENT card
  if (opp) {
    $("#or-opp-name").textContent   = opp.name   || "Stranger";
    $("#or-opp-course").textContent = [opp.course, opp.department].filter(Boolean).join(" · ") || "—";
    $("#or-opp-score").textContent  = `★ ${opp.score || 0}`;
  } else {
    $("#or-opp-name").textContent   = "Mystery Player";
    $("#or-opp-course").textContent = "campus member";
    $("#or-opp-score").textContent  = "★ ?";
  }

  // Role tag
  $("#or-role-tag").textContent = `Your role: ${role}`;

  // Show the overlay
  const reveal = $("#opponent-reveal");
  reveal.style.display = "flex";

  // Spawn confetti
  spawnConfetti();

  // Start countdown
  startOpponentCountdown(matchData, matchId);
}

function resetTaskUI() {
  state.task = "";
  state.attachment = null;
  state.attachmentMeta = null;
  state.pendingMediaType = null;
  state.matchId = null;
  $("#task-text").textContent = "matching you with a stranger…";
  $("#status-tag").textContent = "matching…";
  $("#role-tag").textContent = "—";
  $("#cd-label").textContent = "slot empty";
  $("#cd-disc").className = "cd-disc";
  $("#note-input").value = "";
  $("#action-bar").innerHTML = "";
  $("#task-input-row").hidden = true;
  setTimerDisplay("--:--", "idle");
  const proofArea = $("#tv-proof-area");
  const proofContent = $("#tv-proof-content");
  if (proofArea) proofArea.style.display = "none";
  if (proofContent) proofContent.innerHTML = "";
}

async function startMatch() {
  if (!auth.currentUser) {
    pushPopup("System", 0, "please login first");
    showScreen("start");
    $("#login-modal").style.display = "flex";
    return;
  }

  cleanupListeners();
  const uid = auth.currentUser.uid;

  // If we have an active match, resume it directly (skip lobby)
  if (state.activeMatchId) {
    try {
      const existing = await DB.getMatch(state.activeMatchId);
      if (existing && !["APPROVED","REJECTED","EXPIRED"].includes(existing.status)) {
        resetTaskUI();
        // Go straight to task screen for resume
        $$(".screen").forEach(s => s.classList.remove("active"));
        $("#screen-task").classList.add("active");
        setupMatchUI(existing, state.activeMatchId);
        return;
      }
    } catch {}
  }

  // Show the lobby while we search
  showLobby();
  const statusMsg = $("#lobby-status-msg");
  if (statusMsg) statusMsg.textContent = "Joining the queue…";

  try {
    // Join the matchmaking queue
    await DB.joinMatchQueue(uid);
    if (statusMsg) statusMsg.textContent = "In queue — looking for a player…";

    // Poll for a match via queue listener
    state.queueUnsub = DB.listenQueue(uid, async (queueDoc) => {
      if (!queueDoc) return;
      if (queueDoc.status === "matched" && queueDoc.matchId) {
        if (state.queueUnsub) { state.queueUnsub(); state.queueUnsub = null; }
        await DB.removeFromQueue(uid);
        const matchData = await DB.getMatch(queueDoc.matchId);
        if (matchData) {
          // Show the opponent reveal overlay before going to task
          await showOpponentReveal(matchData, queueDoc.matchId);
        }
      }
    });
  } catch (err) {
    stopLobby();
    pushPopup("System", 0, err.message);
    showScreen("start");
  }
}

// Cancel lobby buttons
document.addEventListener("click", (e) => {
  if (e.target.id === "lobby-cancel-btn" || e.target.id === "lobby-cancel-big-btn") {
    stopLobby();
    cleanupListeners();
    if (auth.currentUser) DB.removeFromQueue(auth.currentUser.uid).catch(() => {});
    showScreen("start");
  }
});

async function doSendTask() {
  const text = $("#task-input").value.trim();
  if (!text) return pushPopup("System", 0, "write a task first ✏️");

  // AI moderation check (async now)
  const abnormal = await DB.isAbnormalTask(text);
  if (abnormal) {
    pushPopup("AI Mod", 0, "task blocked (abnormal)");
    return;
  }

  try {
    await DB.sendTask(state.matchId, text);
    state.task = text;
    $("#task-input").value = "";
    $("#task-input-row").hidden = true;
    $("#status-tag").textContent = "task sent! waiting for proof…";
    $("#task-text").textContent = `📋 Task sent: "${text}"`;
    pushPopup("Match Bot", 0, "task delivered ✉️");
    renderActions([]);
    // Stop the 3-minute giver timer once task is sent
    stopTimer();
    setTimerDisplay("✓ sent", "waiting for proof");
    // Real-time listener handles incoming proof
  } catch (err) { pushPopup("System", 0, err.message); }
}


document.addEventListener("click", (e) => {
  const ab = e.target.closest("[data-attach]");
  if (!ab) return;
  const kind = ab.dataset.attach;

  if (kind === "text") {
    state.attachment = "text";
    state.attachmentMeta = { type: "text" };
    $("#cd-label").textContent = "text mode (write below)";
    pushPopup("Disc Tray", 0, "text mode activated 📝");
  } else {
    // For image/audio/video: trigger file picker
    state.pendingMediaType = kind;
    $("#media-file-input").click();
  }
});

async function doSubmitProof() {
  if (!state.attachment) return pushPopup("System", 0, "attach proof first via the CD slot 💿");
  try {
    const proofText = state.attachment === "text" ? ($("#note-input").value || "").trim() : undefined;
    await DB.submitProof(state.matchId, auth.currentUser.uid, state.attachment, proofText);
    $("#status-tag").textContent = "proof submitted! waiting for review…";
    renderActions([]);
    pushPopup("System", 0, "proof sent for review ⏳");
  } catch (err) { pushPopup("System", 0, err.message); }
}

async function doReview(action) {
  try {
    const match = await DB.getMatch(state.matchId);
    if (!match) return;

    // FIX #6 — use taskText and proofType directly from match row
    const result = await DB.reviewMatch(
      state.matchId, action, match.completerId,
      match.taskText || "", match.proofType || "none", true
    );

    // Refresh own score
    const me = await DB.getUserDoc(auth.currentUser.uid);
    if (me) state.user.score = me.score;
    updateScoreChips();

    await Promise.allSettled([loadFeed(), loadLeaderboard(), renderCompletedTasks()]);
    showResult(action === "approve" ? "Approved" : "Rejected", result.scoreDelta);
  } catch (err) { pushPopup("System", 0, err.message); }
}

function showResult(outcome, delta) {
  $("#result-outcome").textContent = outcome + (outcome.endsWith("!") ? "" : "!");
  $("#result-points").textContent = (delta > 0 ? "+" : "") + delta;
  $("#result-points").style.color = delta >= 0 ? "var(--accent)" : "#a33";
  $("#result-total").textContent = state.user.score;
  showScreen("result");
  pushPopup("Scoreboard", state.user.score, `${outcome} (${delta > 0 ? "+" : ""}${delta})`);
}

/* ===========================================================
   DEMO HELPERS (settings screen)
   =========================================================== */
document.addEventListener("click", (e) => {
  if (e.target.id === "demo-popup") pushPopup("Demo Bot", 42, "this is a test popup!");
  if (e.target.id === "demo-result") showResult("Demo", 10);
});

/* ===========================================================
   INIT — Firebase Auth State
   =========================================================== */
async function initApp() {
  syncSettings();
  updateScoreChips();

  const user = auth.currentUser;
  if (user) {
    try {
      await bootAuthed(user);
      $("#login-modal").style.display = "none";
      setTimeout(() => pushPopup("Campus Bot", state.user.score, "welcome back, doodler!"), 600);
    } catch {
      $("#login-modal").style.display = "flex";
    }
  } else {
    $("#login-modal").style.display = "flex";
  }
}

initApp();

/* ===========================================================
   BACKGROUND MUSIC SYSTEM
   Replace BG_MUSIC_URL below with your own music file link!
   =========================================================== */
const BG_MUSIC_URL = "/bg-music.mp3";

const bgMusic = new Audio(BG_MUSIC_URL);
bgMusic.loop = true;
bgMusic.volume = 0.35;

let bgMusicEnabled = localStorage.getItem("cc_music") === "true";

function updateMusicButton() {
  const icon  = $("#music-icon");
  const state = $("#music-state");
  if (!icon || !state) return;
  if (bgMusicEnabled) {
    icon.textContent  = "♫";
    state.textContent = "currently: ON";
  } else {
    icon.textContent  = "♪";
    state.textContent = "currently: OFF";
  }
}

function toggleBgMusic() {
  bgMusicEnabled = !bgMusicEnabled;
  localStorage.setItem("cc_music", bgMusicEnabled);
  if (bgMusicEnabled) {
    bgMusic.play().catch(() => {});
  } else {
    bgMusic.pause();
  }
  updateMusicButton();
}

// Wire up the toggle button on the home screen
document.addEventListener("click", (e) => {
  if (e.target.closest("#music-toggle")) toggleBgMusic();
});

// Resume music if it was ON last session (needs a user gesture first)
document.addEventListener("click", () => {
  if (bgMusicEnabled && bgMusic.paused) {
    bgMusic.play().catch(() => {});
  }
}, { once: false });

// Set initial button state
updateMusicButton();
