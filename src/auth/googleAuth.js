// src/auth/googleAuth.js
//
// Google ("Gmail") login for this browser prototype.
// Uses Firebase Auth with the Google provider. You must fill `FIREBASE_CONFIG`.

import { FIREBASE_CONFIG } from "./firebaseConfig.js";
import { getState, updateState } from "../core/state.js";

let initPromise = null;

let firebaseApp = null;
let auth = null;
let unsub = null;

let GoogleAuthProviderCtor = null;
let signInWithPopupFn = null;
let signInWithRedirectFn = null;
let getRedirectResultFn = null;
let signOutFn = null;
let signInWithEmailAndPasswordFn = null;
let createUserWithEmailAndPasswordFn = null;
let sendEmailVerificationFn = null;
let onAuthStateChangedFn = null;

function configLooksFilled(cfg) {
  if (!cfg || typeof cfg !== "object") return false;
  return (
    cfg.apiKey &&
    !String(cfg.apiKey).startsWith("YOUR_") &&
    cfg.authDomain &&
    !String(cfg.authDomain).startsWith("YOUR_") &&
    cfg.projectId &&
    !String(cfg.projectId).startsWith("YOUR_")
  );
}

export async function initGoogleAuth() {
  const cfg = FIREBASE_CONFIG;

  if (!configLooksFilled(cfg)) {
    const prevAuth = getState().auth || {};
    updateState({
      auth: {
        ...prevAuth,
        status: "anonymous",
        userId: null,
        email: null
      }
    });
    // Do not cache initPromise here — a cached "success" left auth=null forever for the tab.
    return;
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const version = "12.11.0";
      const appMod = await import(
        `https://www.gstatic.com/firebasejs/${version}/firebase-app.js`
      );
      const authMod = await import(
        `https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`
      );

      firebaseApp = appMod.initializeApp(cfg);
      auth = authMod.getAuth(firebaseApp);

      if (cfg.measurementId) {
        try {
          const analyticsMod = await import(
            `https://www.gstatic.com/firebasejs/${version}/firebase-analytics.js`
          );
          if (typeof analyticsMod.getAnalytics === "function") {
            analyticsMod.getAnalytics(app);
          }
        } catch (e) {
          console.warn("Firebase Analytics init skipped", e);
        }
      }

      GoogleAuthProviderCtor = authMod.GoogleAuthProvider;
      signInWithPopupFn = authMod.signInWithPopup;
      signInWithRedirectFn = authMod.signInWithRedirect;
      getRedirectResultFn = authMod.getRedirectResult;
      signOutFn = authMod.signOut;
      signInWithEmailAndPasswordFn = authMod.signInWithEmailAndPassword;
      createUserWithEmailAndPasswordFn =
        authMod.createUserWithEmailAndPassword;
      sendEmailVerificationFn = authMod.sendEmailVerification;
      onAuthStateChangedFn = authMod.onAuthStateChanged;

      if (typeof onAuthStateChangedFn !== "function") {
        throw new Error("Firebase Auth SDK load failed (missing onAuthStateChanged).");
      }

      if (typeof getRedirectResultFn === "function") {
        try {
          await getRedirectResultFn(auth);
        } catch (e) {
          console.warn("getRedirectResult", e);
        }
      }

      if (typeof unsub === "function") unsub();
      unsub = onAuthStateChangedFn(auth, (user) => {
        const prevAuth = getState().auth || {};
        updateState({
          auth: {
            ...prevAuth,
            status: user ? "authenticated" : "anonymous",
            userId: user ? user.uid : null,
            email: user ? user.email : null
          }
        });
        if (user) {
          void import("../api/mysqlSync.js")
            .then((m) => m.syncAuthProfileFromServer())
            .catch(() => {});
        }
      });
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/** Same Firebase App instance used for Auth (for Firestore, etc.). */
export function getFirebaseApp() {
  return firebaseApp;
}

// Friendly alias (some parts of the app may import the generic name).
export const initAuth = initGoogleAuth;

export async function signInWithGoogle() {
  await initGoogleAuth();
  if (!auth || !GoogleAuthProviderCtor) {
    if (!configLooksFilled(FIREBASE_CONFIG)) {
      throw new Error(
        "Google auth: update src/auth/firebaseConfig.js with your Firebase web app config (from Firebase Console)."
      );
    }
    throw new Error(
      "Firebase Auth did not finish loading. Check the browser console and network (gstatic.com). Disable blockers or try a hard refresh (Ctrl+Shift+R)."
    );
  }

  const provider = new GoogleAuthProviderCtor();
  provider.addScope("email");

  const useRedirect =
    typeof signInWithRedirectFn === "function" &&
    // Safer default on small viewports where pop-ups are often blocked
    (typeof window !== "undefined" && window.matchMedia &&
      window.matchMedia("(max-width: 768px)").matches);

  if (useRedirect && signInWithRedirectFn) {
    await signInWithRedirectFn(auth, provider);
    return;
  }

  if (!signInWithPopupFn) {
    if (signInWithRedirectFn) {
      await signInWithRedirectFn(auth, provider);
      return;
    }
    throw new Error("Firebase Auth: signInWithPopup unavailable.");
  }

  try {
    await signInWithPopupFn(auth, provider);
  } catch (err) {
    const code = err && err.code;
    const popupBlocked =
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request";
    if (popupBlocked && signInWithRedirectFn) {
      await signInWithRedirectFn(auth, provider);
      return;
    }
    throw err;
  }
}

export async function signOutGoogle() {
  await initGoogleAuth();
  if (!auth || !signOutFn) return;
  await signOutFn(auth);
}

export async function signInWithEmail(email, password) {
  await initGoogleAuth();
  if (!auth || !signInWithEmailAndPasswordFn) {
    if (!configLooksFilled(FIREBASE_CONFIG)) {
      throw new Error("Update src/auth/firebaseConfig.js with your Firebase web config.");
    }
    throw new Error("Firebase Auth did not load. See console / network and try a hard refresh.");
  }
  return signInWithEmailAndPasswordFn(auth, email, password);
}

export async function registerWithEmail(email, password) {
  await initGoogleAuth();
  if (!auth || !createUserWithEmailAndPasswordFn) {
    if (!configLooksFilled(FIREBASE_CONFIG)) {
      throw new Error("Update src/auth/firebaseConfig.js with your Firebase web config.");
    }
    throw new Error("Firebase Auth did not load. See console / network and try a hard refresh.");
  }
  const cred = await createUserWithEmailAndPasswordFn(auth, email, password);
  if (typeof sendEmailVerificationFn === "function" && cred?.user) {
    try {
      await sendEmailVerificationFn(cred.user);
    } catch (e) {
      console.warn("sendEmailVerification", e);
    }
  }
  return cred;
}

/** Firebase ID token for PHP API (Bearer). Returns null if not signed in. */
export async function getFirebaseIdToken() {
  await initGoogleAuth();
  if (!auth?.currentUser) {
    return null;
  }
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

