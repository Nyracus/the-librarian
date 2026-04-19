// src/screens/AuthScreen.js — Firebase Auth (Google + email/password)

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import {
  canAccessRoute,
  homeRouteForRole,
  roleFromAuthScreenId
} from "../core/roles.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";
import {
  initGoogleAuth,
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail
} from "../auth/googleAuth.js";

function authScreenCopy(screenId) {
  if (screenId === "auth-architect") {
    return {
      badge: "Architect • Sign in",
      title: "Sign in as Architect",
      subtitleSignedOut:
        "Quizzes, fabricator requests, approvals, and AI Lab — workspace only."
    };
  }
  if (screenId === "auth-fabricator") {
    return {
      badge: "Fabricator • Sign in",
      title: "Sign in as Fabricator",
      subtitleSignedOut: "Request queue and handoff — workspace only."
    };
  }
  return {
    badge: "Librarian • Sign in",
    title: "Sign in as Librarian",
    subtitleSignedOut:
      "Use Google or email/password. Allow pop-ups for Google, or the app will use a full-page redirect. New accounts receive a confirmation email and stay signed in."
  };
}

function formatAuthError(err) {
  const code = err && err.code;
  const hints = {
    "auth/email-already-in-use":
      "This email is already registered. Use Sign in with that email, or choose another address.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a stronger password (at least 6 characters).",
    "auth/invalid-credential":
      "Wrong email or password. If you just registered, confirm you’re using the same address.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/user-not-found": "No account for this email. Use Register or check the spelling.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/operation-not-allowed":
      "Email/password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method."
  };
  if (code && hints[code]) return hints[code];
  return err?.message || "Something went wrong. Please try again.";
}

function setFeedback(el, message, kind = "error") {
  el.textContent = message;
  el.classList.remove("text-danger", "text-success");
  el.classList.add(kind === "success" ? "text-success" : "text-danger");
}

function remountAuthScreen(container, screenId) {
  renderAuthScreen(container, {}, { screenId });
}

export function renderAuthScreen(container, context, { screenId }) {
  initGoogleAuth().catch(() => {});

  updateState({ currentScreenId: screenId, phase: "setup" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: "setup",
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen" });

  const copy = authScreenCopy(screenId);
  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: copy.badge })
  );
  screenEl.appendChild(createElement("h1", { className: "screen__title", text: copy.title }));

  const already = state.auth?.status === "authenticated";
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: already
        ? `Signed in as ${state.auth?.email || "your account"}.`
        : copy.subtitleSignedOut
    })
  );

  const feedback = createElement("div", {
    className: "screen__feedback text-danger"
  });
  screenEl.appendChild(feedback);

  async function finishAuthAndNavigate() {
    const prev = getState().auth || {};
    const postAuthRoute = prev.postAuthRoute;
    const pickedRole = roleFromAuthScreenId(screenId);

    try {
      const { registerServerRole } = await import("../api/authRole.js");
      const data = await registerServerRole(pickedRole);
      const role = data.userRole;
      updateState({
        userRole: role,
        auth: {
          ...prev,
          postAuthRoute: null
        }
      });
      let next = postAuthRoute;
      if (
        !next ||
        next === "auth" ||
        next === "login" ||
        next.startsWith("auth-")
      ) {
        next = homeRouteForRole(role);
      }
      if (!canAccessRoute(next, role)) {
        next = homeRouteForRole(role);
      }
      navigateTo(next, { container });
    } catch (err) {
      if (err.status === 409 && err.body?.userRole) {
        const forced = err.body.userRole;
        updateState({
          userRole: forced,
          auth: {
            ...prev,
            postAuthRoute: null
          }
        });
        setFeedback(
          feedback,
          `This Google account is already registered as ${forced}. Redirecting to that workspace.`,
          "error"
        );
        setTimeout(() => navigateTo(homeRouteForRole(forced), { container }), 400);
        return;
      }
      // Static file servers (e.g. python http.server) reject POST — no PHP API. Continue with local role.
      if (isLikelyMissingPhpApiError(err)) {
        console.warn("[auth] PHP API unavailable; continuing with local role only.", err?.message);
        updateState({
          userRole: pickedRole,
          auth: {
            ...prev,
            postAuthRoute: null
          }
        });
        let next = postAuthRoute;
        if (
          !next ||
          next === "auth" ||
          next === "login" ||
          next.startsWith("auth-")
        ) {
          next = homeRouteForRole(pickedRole);
        }
        if (!canAccessRoute(next, pickedRole)) {
          next = homeRouteForRole(pickedRole);
        }
        setFeedback(
          feedback,
          "Signed in. If this screen used a simple file server, your role is only stored in the browser until the PHP `/api` is running.",
          "success"
        );
        setTimeout(() => navigateTo(next, { container }), 350);
        return;
      }
      setFeedback(
        feedback,
        err.body?.error ||
          err.message ||
          "Could not register your role with the server. Ensure the PHP API is running and try again."
      );
    }
  }

  if (already) {
    screenEl.appendChild(
      createElement("button", {
        className: "btn btn--primary",
        text: "Continue",
        onClick: () => void finishAuthAndNavigate()
      })
    );
    container.appendChild(screenEl);
    return;
  }

  const form = createElement("form", { className: "screen__form" });
  const emailInput = createElement("input", {
    attrs: { type: "email", placeholder: "Email", required: "true", autocomplete: "email" }
  });
  form.appendChild(emailInput);
  const pwInput = createElement("input", {
    attrs: {
      type: "password",
      placeholder: "Password",
      required: "true",
      autocomplete: "current-password"
    }
  });
  form.appendChild(pwInput);

  const submitRow = document.createElement("div");
  submitRow.className = "auth-row";

  const signInBtn = createElement("button", {
    className: "btn btn--primary",
    text: "Sign in",
    attrs: { type: "submit" }
  });
  const registerBtn = createElement("button", {
    className: "btn btn--ghost",
    text: "Register",
    attrs: { type: "button" }
  });
  submitRow.appendChild(signInBtn);
  submitRow.appendChild(registerBtn);
  form.appendChild(submitRow);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.textContent = "";
    feedback.classList.remove("text-success", "text-danger");
    signInBtn.disabled = true;
    registerBtn.disabled = true;
    try {
      await signInWithEmail(emailInput.value.trim(), pwInput.value);
      let ok = await waitForAuthed(8000);
      if (!ok) {
        await new Promise((r) => setTimeout(r, 500));
        ok = getState().auth?.status === "authenticated";
      }
      if (!ok) {
        setFeedback(
          feedback,
          "Signed in, but state is slow to update. Wait a moment, then try again."
        );
        return;
      }
      await finishAuthAndNavigate();
    } catch (err) {
      console.warn("Email sign-in failed", err);
      setFeedback(feedback, formatAuthError(err));
    } finally {
      signInBtn.disabled = false;
      registerBtn.disabled = false;
    }
  });

  registerBtn.addEventListener("click", async () => {
    feedback.textContent = "";
    feedback.classList.remove("text-success", "text-danger");
    signInBtn.disabled = true;
    registerBtn.disabled = true;
    try {
      await registerWithEmail(emailInput.value.trim(), pwInput.value);
      let ok = await waitForAuthed(8000);
      if (!ok) {
        await new Promise((r) => setTimeout(r, 500));
        ok = getState().auth?.status === "authenticated";
      }
      if (!ok) {
        setFeedback(
          feedback,
          "Account may be created. Check your inbox for the confirmation email. If you are signed in, the page will refresh.",
          "success"
        );
        await new Promise((r) => setTimeout(r, 400));
        if (getState().auth?.status === "authenticated") {
          remountAuthScreen(container, screenId);
        }
        return;
      }
      setFeedback(
        feedback,
        "Account created. We sent a confirmation email. You’re signed in — continuing…",
        "success"
      );
      await new Promise((r) => setTimeout(r, 400));
      await finishAuthAndNavigate();
    } catch (err) {
      console.warn("Registration failed", err);
      setFeedback(feedback, formatAuthError(err));
    } finally {
      signInBtn.disabled = false;
      registerBtn.disabled = false;
    }
  });

  screenEl.appendChild(form);
  screenEl.appendChild(
    createElement("p", { className: "screen__meta", text: "Or" })
  );

  const googleBtn = createElement("button", {
    className: "btn btn--primary",
    text: "Continue with Google",
    onClick: async () => {
      feedback.textContent = "";
      feedback.classList.remove("text-success", "text-danger");
      googleBtn.disabled = true;
      try {
        await signInWithGoogle();
        let ok = await waitForAuthed(8000);
        if (!ok) {
          await new Promise((r) => setTimeout(r, 500));
          ok = getState().auth?.status === "authenticated";
        }
        if (!ok) {
          setFeedback(
            feedback,
            "Still confirming sign-in. If you are signed in, use Continue on the next screen or reload.",
            "error"
          );
          return;
        }
        await finishAuthAndNavigate();
      } catch (err) {
        console.warn("Google sign-in failed", err);
        setFeedback(
          feedback,
          err?.message ||
            "Google sign-in failed. Allow pop-ups, or try again (redirect may be used)."
        );
      } finally {
        googleBtn.disabled = false;
      }
    }
  });
  screenEl.appendChild(googleBtn);

  screenEl.appendChild(
    createElement(
      "p",
      { className: "screen__meta" },
      [
        createElement("button", {
          className: "btn btn--ghost",
          attrs: { type: "button" },
          text: "← Choose a different role",
          onClick: () => navigateTo("login", { container })
        })
      ]
    )
  );

  container.appendChild(screenEl);
}

async function waitForAuthed(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (getState().auth?.status === "authenticated") return true;
    await new Promise((r) => setTimeout(r, 120));
  }
  return false;
}
