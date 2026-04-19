// src/core/audioManager.js

// Lightweight audio manager with:
// - per-scene ambient loop (synthesized)
// - UI SFX
// - global mute toggle

const STORAGE_KEY = "librarian_audio_muted_v1";

let audioCtx = null;
let sceneOsc = null;
let sceneGain = null;
let isMuted = loadMuted();

function loadMuted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistMuted() {
  try {
    window.localStorage.setItem(STORAGE_KEY, isMuted ? "1" : "0");
  } catch {
    // ignore
  }
}

function ensureAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getSceneFrequency(sceneKey) {
  const mapping = {
    scene_intro: 174,
    scene_grain: 196,
    scene_oath: 220,
    scene_dispatch: 246,
    scene_puzzle: 261.63,
    scene_complete: 293.66
  };
  return mapping[sceneKey] || 196;
}

export function isAudioMuted() {
  return isMuted;
}

export function setAudioMuted(nextMuted) {
  isMuted = Boolean(nextMuted);
  persistMuted();
  if (sceneGain) {
    sceneGain.gain.setValueAtTime(isMuted ? 0 : 0.04, ensureAudioCtx()?.currentTime || 0);
  }
}

export function toggleAudioMuted() {
  setAudioMuted(!isMuted);
  return isMuted;
}

export function playUiSfx(type) {
  if (isMuted) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  let freq = 420;
  let dur = 0.2;
  if (type === "success") freq = 660;
  else if (type === "error") freq = 180;
  else if (type === "stone") {
    osc.type = "square";
    freq = 320;
    dur = 0.08;
  } else if (type === "trickle") {
    osc.type = "sine";
    freq = 520;
    dur = 0.06;
  } else if (type === "dry") {
    osc.type = "triangle";
    freq = 140;
    dur = 0.25;
  }
  osc.frequency.value = freq;

  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.start(now);
  osc.stop(now + dur);
}

export function startSceneLoop(sceneKey) {
  const ctx = ensureAudioCtx();
  if (!ctx) return;

  stopSceneLoop();

  sceneOsc = ctx.createOscillator();
  sceneGain = ctx.createGain();

  sceneOsc.type = "sine";
  sceneOsc.frequency.value = getSceneFrequency(sceneKey);
  sceneGain.gain.value = isMuted ? 0 : 0.04;

  sceneOsc.connect(sceneGain);
  sceneGain.connect(ctx.destination);
  sceneOsc.start();
}

export function stopSceneLoop() {
  if (sceneOsc) {
    try {
      sceneOsc.stop();
    } catch {
      // ignore
    }
    sceneOsc.disconnect();
    sceneOsc = null;
  }
  if (sceneGain) {
    sceneGain.disconnect();
    sceneGain = null;
  }
}

