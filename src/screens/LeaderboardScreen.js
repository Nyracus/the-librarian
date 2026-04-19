// src/screens/LeaderboardScreen — MySQL leaderboard via PHP API (signed-in only).

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry, getLogs } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import {
  aggregateGradedStatsForUser,
  syncLeaderboardStatsFromLocalLogs,
  fetchLeaderboardRows,
  maskEmailForDisplay
} from "../core/firestoreLeaderboard.js";
import { formatMsAsMmSs } from "../core/nonNarrativeSessionStats.js";

export function renderLeaderboardScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen screen--leaderboard" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Leaderboard" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Top performers" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "Ranked by quiz accuracy (graded items only), with ties broken by volume and response time. Requires sign-in and the PHP API."
    })
  );

  const statusEl = createElement("p", {
    className: "screen__body leaderboard-status",
    text: "Loading…"
  });
  screenEl.appendChild(statusEl);

  const myPanel = createElement("div", {
    className: "leaderboard-my-panel",
    attrs: { "aria-label": "Your stats from this device" }
  });
  screenEl.appendChild(myPanel);

  const tableWrap = createElement("div", { className: "leaderboard-table-wrap" });
  screenEl.appendChild(tableWrap);

  const actions = createElement("div", { className: "leaderboard-actions" });
  actions.appendChild(
    createElement("button", {
      className: "btn btn--primary",
      text: "Refresh",
      onClick: () => load({ forceSync: true })
    })
  );
  actions.appendChild(
    createElement("button", {
      className: "btn btn--ghost",
      text: "Back to Library Hub",
      onClick: () => navigateTo("hub", { container })
    })
  );
  screenEl.appendChild(actions);

  container.appendChild(screenEl);

  const uid = state.auth?.userId;
  const logs = getLogs();
  const localStats = uid ? aggregateGradedStatsForUser(logs, uid) : null;

  function renderMyPanel() {
    myPanel.innerHTML = "";
    if (!uid || !localStats) {
      myPanel.appendChild(
        createElement("p", {
          className: "leaderboard-my-note",
          text: "Sign in to appear on the leaderboard."
        })
      );
      return;
    }
    const h = createElement("h2", {
      className: "leaderboard-my-title",
      text: "Your session (this browser)"
    });
    const dl = document.createElement("dl");
    dl.className = "leaderboard-my-dl";
    const rows = [
      ["Accuracy", `${localStats.accuracyPct}%`],
      ["Graded", `${localStats.correctCount} correct / ${localStats.gradedCount} total`],
      [
        "Response time (sum)",
        localStats.totalResponseTimeMs > 0
          ? formatMsAsMmSs(localStats.totalResponseTimeMs)
          : "—"
      ]
    ];
    for (const [dt, dd] of rows) {
      dl.appendChild(createElement("dt", { text: dt }));
      dl.appendChild(createElement("dd", { text: dd }));
    }
    myPanel.appendChild(h);
    myPanel.appendChild(dl);
  }

  function buildTable(rows) {
    tableWrap.innerHTML = "";
    if (!rows.length) {
      tableWrap.appendChild(
        createElement("p", {
          className: "screen__body",
          text: "No entries yet. Complete quizzes while signed in, then refresh."
        })
      );
      return;
    }

    const table = document.createElement("table");
    table.className = "leaderboard-table";
    table.setAttribute("role", "grid");
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th scope="col">#</th>
        <th scope="col">Player</th>
        <th scope="col">Accuracy</th>
        <th scope="col">Correct / graded</th>
        <th scope="col">Σ time</th>
      </tr>
    `;
    const tbody = document.createElement("tbody");

    rows.forEach((row, i) => {
      const rank = i + 1;
      const email = row.displayEmail || "";
      const tr = document.createElement("tr");
      if (uid && row.id === uid) tr.classList.add("leaderboard-table__me");
      tr.innerHTML = `
        <td>${rank}</td>
        <td>${escapeHtml(maskEmailForDisplay(email))}</td>
        <td>${row.accuracyPct ?? 0}%</td>
        <td>${row.correctCount ?? 0} / ${row.gradedCount ?? 0}</td>
        <td>${formatRowTime(row.totalResponseTimeMs)}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  async function load({ forceSync = false } = {}) {
    statusEl.textContent = forceSync ? "Syncing and loading…" : "Syncing…";
    renderMyPanel();

    const sync = await syncLeaderboardStatsFromLocalLogs({ force: forceSync });
    if (!sync.ok && sync.reason === "auth") {
      statusEl.textContent = "Sign in required.";
      buildTable([]);
      return;
    }
    if (!sync.ok && sync.reason === "api") {
      statusEl.textContent =
        "Could not sync your stats to the server. Check that the PHP API is running and reachable.";
      buildTable([]);
      return;
    }

    let syncHint = "";
    if (sync.reason === "throttled" && !forceSync) {
      syncHint = "Last push was recent (throttled). Refresh forces a new sync. ";
    } else if (sync.ok && sync.reason !== "throttled") {
      syncHint = "Your stats were synced. ";
    }

    try {
      const rows = await fetchLeaderboardRows(40);
      buildTable(rows);
      statusEl.textContent = `${syncHint}Showing ${rows.length} player${rows.length === 1 ? "" : "s"}.`;
    } catch (err) {
      console.warn("Leaderboard fetch failed", err);
      statusEl.textContent =
        "Could not load rankings. Check network and PHP `/api` configuration, then try Refresh.";
      buildTable([]);
    }
  }

  renderMyPanel();
  load({ forceSync: false });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRowTime(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return "—";
  return formatMsAsMmSs(ms);
}
