// src/screens/HubScreen.js

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { isNonNarrativeCondition } from "../core/nonNarrative.js";
import { getLogs } from "../core/logger.js";
import {
  buildNonNarrativeSessionSnapshot,
  formatMsAsMmSs
} from "../core/nonNarrativeSessionStats.js";
import { CHAPTERS } from "../core/chapters.js";

export function renderHubScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen" });

  screenEl.appendChild(createElement("div", { className: "screen__badge", text: "Library Hub" }));
  screenEl.appendChild(createElement("h1", { className: "screen__title", text: "Choose a module" }));
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: "Walk the library (pixel), open Attend quiz for activities from your architect, or use the header Menu for wings and chapters. In History, pre-test and post-test are in the side menu."
    })
  );
  if (isNonNarrativeCondition(state)) {
    screenEl.appendChild(
      createElement("p", {
        className: "non-narrative-ribbon",
        text: "Non-narrative • quizzes and tasks without story framing"
      })
    );
    const snapEl = buildHubNnSnapshot(state);
    if (snapEl) screenEl.appendChild(snapEl);
  }

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--primary",
      text: "Explore the library (walk & interact)",
      onClick: () => navigateTo("library-world", { container })
    })
  );

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--primary",
      text: "Attend quiz",
      onClick: () => navigateTo("librarian-assigned-quizzes", { container })
    })
  );

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--ghost",
      text: "Leaderboard (signed-in)",
      onClick: () => navigateTo("leaderboard", { container })
    })
  );

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--ghost",
      text: "History Wing 1",
      onClick: () => navigateTo("history-1", { container })
    })
  );

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--ghost",
      text: "Geography Wing 1",
      onClick: () => {
        if (!getState().world?.geographyUnlocked) {
          window.alert(
            "Geography Wing 1 unlocks after you complete History Wing 1 (learning). Use Explore the library, or open History Wing 1 from here."
          );
          return;
        }
        navigateTo("geography-game", { container });
      }
    })
  );

  container.appendChild(screenEl);
}

function chapterLabel(screenId) {
  const ch = CHAPTERS.find((c) => c.id === screenId);
  return ch ? ch.label : screenId || "—";
}

function friendlyWeakestDomain(domain) {
  if (!domain) return "";
  const map = {
    politics: "History content",
    geography: "Geography",
    explore: "Library explore",
    shell: "Setup / navigation",
    general: "Mixed items"
  };
  return map[domain] || domain.charAt(0).toUpperCase() + domain.slice(1);
}

/** @param {object} state */
function buildHubNnSnapshot(state) {
  const snap = buildNonNarrativeSessionSnapshot(state, getLogs());
  const wrap = document.createElement("div");
  wrap.className = "hub-nn-snapshot";

  const title = document.createElement("h3");
  title.className = "hub-nn-snapshot__title";
  title.textContent = "Quick progress";
  wrap.appendChild(title);

  const acc =
    snap.accuracyPct === null
      ? "No graded items yet"
      : `${snap.accuracyPct}% correct (${snap.correctCount}/${snap.gradedCount})`;
  const time =
    snap.responseTimeMsTotal > 0
      ? formatMsAsMmSs(snap.responseTimeMsTotal)
      : "—";

  const lines = [
    `Last chapter: ${chapterLabel(snap.currentScreenId)}`,
    `Accuracy: ${acc}`,
    `Logged time on task: ${time}`
  ];

  if (snap.weakestDomain && snap.weakestWrongCount > 0) {
    lines.push(
      `Focus: ${friendlyWeakestDomain(snap.weakestDomain)} (${snap.weakestWrongCount} miss${snap.weakestWrongCount === 1 ? "" : "es"})`
    );
  }

  const ul = document.createElement("ul");
  ul.className = "hub-nn-snapshot__list";
  for (const line of lines) {
    const li = document.createElement("li");
    li.textContent = line;
    ul.appendChild(li);
  }
  wrap.appendChild(ul);

  const note = document.createElement("p");
  note.className = "hub-nn-snapshot__note";
  note.textContent = "Same data as Main menu snapshot; details in Menu → Research when enabled.";
  wrap.appendChild(note);

  return wrap;
}

