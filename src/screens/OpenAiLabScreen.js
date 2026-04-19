// src/screens/OpenAiLabScreen.js — OpenAI helpers (proxy + optional browser key).

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import {
  getOpenAiBaseUrl,
  setOpenAiBaseUrl,
  getOpenAiModel,
  setOpenAiModel,
  getBrowserApiKey,
  setBrowserApiKey
} from "../core/openaiClient.js";
import { OPENAI_CONFIG } from "../config/openaiConfig.js";
import {
  aiPing,
  aiGenerateMcqBankBatch,
  aiExplainAnswer,
  aiLearnerFeedback,
  aiFabricatorBrainstorm
} from "../core/openaiAi.js";
import { getLogs } from "../core/logger.js";
import { buildNonNarrativeSessionSnapshot } from "../core/nonNarrativeSessionStats.js";
import { createQuestionBankEntry, validateBankQuestion } from "../core/questionBankStore.js";

const WINGS = ["history", "geography", "literature", "theology", "general"];

function fixWing(w) {
  const s = String(w || "").toLowerCase();
  return WINGS.includes(s) ? s : "general";
}

function fixDifficulty(d) {
  const s = String(d || "").toLowerCase();
  return ["easy", "medium", "hard"].includes(s) ? s : "medium";
}

export function renderOpenAiLabScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const root = createElement("section", { className: "screen openai-lab" });

  root.appendChild(
    createElement("div", { className: "screen__badge", text: "AI Lab • OpenAI" })
  );
  root.appendChild(
    createElement("h1", { className: "screen__title", text: "OpenAI integration" })
  );
  root.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "Run the local proxy so your API key never ships to the browser. Recommended: terminal with OPENAI_API_KEY set, then npm run openai-proxy — base URL http://127.0.0.1:8787/v1"
    })
  );

  const globalStatus = createElement("p", { className: "openai-lab__status", text: "" });
  root.appendChild(globalStatus);

  /* ——— Connection ——— */
  root.appendChild(createElement("h2", { className: "openai-lab__h2", text: "Connection" }));

  const baseInput = document.createElement("input");
  baseInput.type = "url";
  baseInput.className = "screen__input";
  baseInput.value = getOpenAiBaseUrl();
  baseInput.placeholder = OPENAI_CONFIG.defaultBaseUrl;

  const modelInput = document.createElement("input");
  modelInput.type = "text";
  modelInput.className = "screen__input";
  modelInput.value = getOpenAiModel();
  modelInput.placeholder = OPENAI_CONFIG.defaultModel;

  const keyInput = document.createElement("input");
  keyInput.type = "password";
  keyInput.className = "screen__input";
  keyInput.placeholder = "Optional: API key (only if your backend accepts it from the browser)";
  keyInput.value = getBrowserApiKey();
  keyInput.autocomplete = "off";

  root.appendChild(
    createElement("label", { className: "architect-request-label", text: "API base URL (must end with /v1)" })
  );
  root.appendChild(baseInput);
  root.appendChild(
    createElement("label", { className: "architect-request-label", text: "Model" })
  );
  root.appendChild(modelInput);
  root.appendChild(
    createElement("label", {
      className: "architect-request-label",
      text: "Browser API key (advanced; leave empty when using local proxy)"
    })
  );
  root.appendChild(keyInput);

  root.appendChild(
    createElement("div", { className: "openai-lab__row" }, [
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "Save connection settings",
        onClick: () => {
          setOpenAiBaseUrl(baseInput.value);
          setOpenAiModel(modelInput.value);
          setBrowserApiKey(keyInput.value);
          globalStatus.textContent = "Saved.";
        }
      }),
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--primary",
        text: "Test connection",
        onClick: async () => {
          setOpenAiBaseUrl(baseInput.value);
          setOpenAiModel(modelInput.value);
          setBrowserApiKey(keyInput.value);
          globalStatus.textContent = "Testing…";
          const r = await aiPing();
          globalStatus.textContent = r.ok
            ? `OK: ${r.reply}`
            : `Failed: ${r.error}`;
          if (r.ok) {
            logEvent({
              participantId: state.participantId,
              condition: state.condition,
              phase: state.phase,
              screenId,
              itemId: "openai-ping",
              response: { type: "openai-ping" },
              correctness: null,
              responseTimeMs: null
            });
          }
        }
      })
    ])
  );

  /* ——— Generate MCQs → bank ——— */
  root.appendChild(createElement("h2", { className: "openai-lab__h2", text: "Generate MCQs → question bank" }));

  const genTopic = document.createElement("input");
  genTopic.type = "text";
  genTopic.className = "screen__input";
  genTopic.placeholder = "Topic (e.g. Cold War alliances)";

  const genWing = document.createElement("select");
  genWing.className = "screen__input";
  WINGS.forEach((w) => {
    const o = document.createElement("option");
    o.value = w;
    o.textContent = w;
    genWing.appendChild(o);
  });

  const genDiff = document.createElement("select");
  genDiff.className = "screen__input";
  ["easy", "medium", "hard"].forEach((d) => {
    const o = document.createElement("option");
    o.value = d;
    o.textContent = d;
    genDiff.appendChild(o);
  });

  const genCount = document.createElement("input");
  genCount.type = "number";
  genCount.className = "screen__input";
  genCount.min = "1";
  genCount.max = "8";
  genCount.value = "3";

  const genExtra = document.createElement("input");
  genExtra.type = "text";
  genExtra.className = "screen__input";
  genExtra.placeholder = "Optional extra constraints";

  const genOut = document.createElement("textarea");
  genOut.className = "screen__textarea";
  genOut.rows = 8;
  genOut.readOnly = true;
  genOut.placeholder = "Generated JSON preview…";

  const genStatus = createElement("p", { className: "openai-lab__hint", text: "" });

  root.appendChild(createElement("label", { className: "architect-request-label", text: "Topic" }));
  root.appendChild(genTopic);
  root.appendChild(createElement("label", { className: "architect-request-label", text: "Wing" }));
  root.appendChild(genWing);
  root.appendChild(createElement("label", { className: "architect-request-label", text: "Difficulty" }));
  root.appendChild(genDiff);
  root.appendChild(createElement("label", { className: "architect-request-label", text: "Count (1–8)" }));
  root.appendChild(genCount);
  root.appendChild(createElement("label", { className: "architect-request-label", text: "Extras" }));
  root.appendChild(genExtra);

  root.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Generate with AI",
      onClick: async () => {
        const topic = genTopic.value.trim();
        if (!topic) {
          genStatus.textContent = "Enter a topic.";
          return;
        }
        genStatus.textContent = "Generating…";
        const r = await aiGenerateMcqBankBatch({
          topic,
          wing: genWing.value,
          difficulty: genDiff.value,
          count: Number(genCount.value),
          extra: genExtra.value.trim()
        });
        if (!r.ok) {
          genStatus.textContent = r.error || "Failed.";
          if (r.raw) genOut.value = String(r.raw).slice(0, 8000);
          return;
        }
        genOut.value = JSON.stringify(r.data, null, 2);
        genStatus.textContent = "Done. Review JSON, then add to bank if it looks correct.";
        genOut.dataset.lastPayload = JSON.stringify(r.data);
        logEvent({
          participantId: state.participantId,
          condition: state.condition,
          phase: state.phase,
          screenId,
          itemId: "openai-generate-mcq",
          response: { type: "openai-generate-mcq", topic },
          correctness: null,
          responseTimeMs: null
        });
      }
    })
  );

  root.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Add generated questions to question bank",
      onClick: () => {
        const raw = genOut.dataset.lastPayload;
        if (!raw) {
          genStatus.textContent = "Generate first.";
          return;
        }
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          genStatus.textContent = "Invalid cached payload.";
          return;
        }
        const questions = data?.questions;
        if (!Array.isArray(questions) || !questions.length) {
          genStatus.textContent = "No questions array in payload.";
          return;
        }
        let ok = 0;
        const errs = [];
        for (const q of questions) {
          const entry = {
            label: String(q.label || "AI item").slice(0, 200),
            wing: fixWing(q.wing),
            difficulty: fixDifficulty(q.difficulty),
            tags: Array.isArray(q.tags) ? q.tags.map((t) => String(t)).filter(Boolean) : [],
            status: "draft",
            notes: "Created via AI Lab",
            item: q.item
          };
          const v = validateBankQuestion({
            ...entry,
            id: "tmp",
            createdAt: "",
            updatedAt: ""
          });
          if (!v.ok) {
            errs.push(v.errors.join("; "));
            continue;
          }
          const cr = createQuestionBankEntry(entry);
          if (cr.ok) ok += 1;
          else errs.push((cr.errors && cr.errors.join("; ")) || "create failed");
        }
        genStatus.textContent = `Added ${ok} question(s).${errs.length ? ` Skipped/errors: ${errs.slice(0, 3).join(" | ")}` : ""}`;
      }
    })
  );
  root.appendChild(genStatus);
  root.appendChild(genOut);

  /* ——— Explain answer ——— */
  root.appendChild(createElement("h2", { className: "openai-lab__h2", text: "Explain an answer" }));

  const exPrompt = document.createElement("textarea");
  exPrompt.className = "screen__textarea";
  exPrompt.rows = 3;
  exPrompt.placeholder = "Question stem";

  const exOpts = ["a", "b", "c", "d"].map((id) => {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "screen__input";
    inp.placeholder = `Option ${id}`;
    inp.dataset.optId = id;
    return inp;
  });

  const exCorrect = document.createElement("select");
  exCorrect.className = "screen__input";
  ["a", "b", "c", "d"].forEach((id) => {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = `Correct: ${id}`;
    exCorrect.appendChild(o);
  });

  const exOut = document.createElement("textarea");
  exOut.className = "screen__textarea";
  exOut.rows = 5;
  exOut.readOnly = true;

  root.appendChild(createElement("label", { className: "architect-request-label", text: "Prompt" }));
  root.appendChild(exPrompt);
  exOpts.forEach((inp) => root.appendChild(inp));
  root.appendChild(createElement("label", { className: "architect-request-label", text: "Correct option" }));
  root.appendChild(exCorrect);
  root.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Generate explanation",
      onClick: async () => {
        const options = exOpts.map((inp) => ({
          id: inp.dataset.optId,
          text: inp.value.trim() || `(${inp.dataset.optId})`
        }));
        const r = await aiExplainAnswer({
          prompt: exPrompt.value.trim() || "(empty prompt)",
          options,
          correctOptionId: exCorrect.value
        });
        exOut.value = r.ok ? r.explanation : r.error;
      }
    })
  );
  root.appendChild(exOut);

  /* ——— Learner feedback ——— */
  root.appendChild(createElement("h2", { className: "openai-lab__h2", text: "Learner feedback (from session snapshot)" }));

  const fbIn = document.createElement("textarea");
  fbIn.className = "screen__textarea";
  fbIn.rows = 6;
  fbIn.placeholder = "Summary text sent to the model…";

  const snap = buildNonNarrativeSessionSnapshot(state, getLogs());
  fbIn.value = [
    `Condition: ${state.condition || "—"}`,
    `Accuracy: ${snap.accuracyPct != null ? `${snap.accuracyPct}% (${snap.correctCount}/${snap.gradedCount})` : "—"}`,
    `Response time sum (ms): ${snap.responseTimeMsTotal || 0}`,
    `Weakest area: ${snap.weakestDomain || "—"}`,
    `Current screen: ${snap.currentScreenId || "—"}`
  ].join("\n");

  const fbOut = document.createElement("textarea");
  fbOut.className = "screen__textarea";
  fbOut.rows = 6;
  fbOut.readOnly = true;

  root.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Refresh summary from logs",
      onClick: () => {
        const st = getState();
        const s = buildNonNarrativeSessionSnapshot(st, getLogs());
        fbIn.value = [
          `Condition: ${st.condition || "—"}`,
          `Accuracy: ${s.accuracyPct != null ? `${s.accuracyPct}% (${s.correctCount}/${s.gradedCount})` : "—"}`,
          `Response time sum (ms): ${s.responseTimeMsTotal || 0}`,
          `Weakest area: ${s.weakestDomain || "—"}`,
          `Current screen: ${s.currentScreenId || "—"}`
        ].join("\n");
      }
    })
  );
  root.appendChild(fbIn);
  root.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Generate coaching feedback",
      onClick: async () => {
        const r = await aiLearnerFeedback({ summaryText: fbIn.value });
        fbOut.value = r.ok ? r.feedback : r.error;
      }
    })
  );
  root.appendChild(fbOut);

  /* ——— Fabricator brainstorm ——— */
  root.appendChild(createElement("h2", { className: "openai-lab__h2", text: "Fabricator brainstorm" }));

  const brTopic = document.createElement("input");
  brTopic.type = "text";
  brTopic.className = "screen__input";
  brTopic.placeholder = "Topic or Architect request summary";

  const brWing = document.createElement("input");
  brWing.type = "text";
  brWing.className = "screen__input";
  brWing.placeholder = "Wing (optional)";

  const brOut = document.createElement("textarea");
  brOut.className = "screen__textarea";
  brOut.rows = 10;
  brOut.readOnly = true;

  root.appendChild(createElement("label", { className: "architect-request-label", text: "Topic" }));
  root.appendChild(brTopic);
  root.appendChild(createElement("label", { className: "architect-request-label", text: "Wing" }));
  root.appendChild(brWing);
  root.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Brainstorm",
      onClick: async () => {
        const r = await aiFabricatorBrainstorm({
          topic: brTopic.value.trim() || "general module",
          wing: brWing.value.trim()
        });
        brOut.value = r.ok ? r.text : r.error;
      }
    })
  );
  root.appendChild(brOut);

  root.appendChild(
    createElement("div", { className: "openai-lab__footer" }, [
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "Quizzes & questions",
        onClick: () => navigateTo("architect-quiz-hub", { container })
      }),
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--primary",
        text: "Architect home",
        onClick: () => navigateTo("architect-home", { container })
      })
    ])
  );

  container.appendChild(root);
}
