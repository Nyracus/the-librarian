// Push game telemetry to Cloud Firestore (Firebase project already used for Auth).

import { initGoogleAuth, getFirebaseApp } from "../auth/googleAuth.js";
import { getState } from "./state.js";
import { inferContentDomain } from "./contentDomain.js";

const FB_VERSION = "12.11.0";

/**
 * Fire-and-forget: one document per local log row. Requires signed-in Firebase user.
 * Security rules must allow create only when request.auth.uid matches payload.authUid.
 */
export function scheduleFirestorePush(entry) {
  if (!entry || typeof entry !== "object") return;

  void (async () => {
    try {
      await pushGameEventToFirestore(entry);
    } catch (err) {
      console.warn("[Firestore] Event sync skipped or failed", err);
    }
  })();
}

async function pushGameEventToFirestore(entry) {
  const state = getState();
  if (state.auth?.status !== "authenticated" || !state.auth?.userId) {
    return;
  }

  await initGoogleAuth();
  const app = getFirebaseApp();
  if (!app) return;

  const fsMod = await import(
    `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore.js`
  );
  const db = fsMod.getFirestore(app);
  const col = fsMod.collection(db, "events");

  const domain = inferContentDomain(entry.screenId, entry.itemId);

  const payload = stripUndefined({
    authUid: state.auth.userId,
    authEmail: state.auth.email ?? null,
    participantId: entry.participantId ?? state.participantId ?? null,
    condition: entry.condition ?? state.condition ?? null,
    phase: entry.phase ?? null,
    screenId: entry.screenId ?? null,
    itemId: entry.itemId ?? null,
    domain,
    response: entry.response ?? null,
    correctness: entry.correctness ?? null,
    responseTimeMs: entry.responseTimeMs ?? null,
    clientLocalId: entry.id ?? null,
    clientTimestamp: entry.timestamp ?? null,
    createdAt: fsMod.serverTimestamp()
  });

  const ref = await fsMod.addDoc(col, payload);

  const { markLogFirestoreSynced } = await import("./logger.js");
  markLogFirestoreSynced(entry.id, ref.id);
}

function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
