// src/core/saveSlots.js — shared save-slot storage keys

const SAVE_SLOT_KEY_PREFIX = "librarian_save_slot_v1_";

export function getSlotStorageKey(slotId) {
  return `${SAVE_SLOT_KEY_PREFIX}${slotId}`;
}

export function setSlotPayload(slotId, payload) {
  window.localStorage.setItem(getSlotStorageKey(slotId), JSON.stringify(payload));
}

export function getSlotPayload(slotId) {
  const raw = window.localStorage.getItem(getSlotStorageKey(slotId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
