// src/screens/HistorySlice1Screen.js

import { createElement, normalizeWhitespace } from "../components/ui.js";
import { getHistoryWing1 } from "../content/historyWing1.js";
import { renderChoicePuzzle } from "../components/PuzzleChoice.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { applySceneBackground, runFadeTransition, typewriterText } from "../core/presentation.js";
import { startSceneLoop, playUiSfx } from "../core/audioManager.js";
import { isNonNarrativeCondition } from "../core/nonNarrative.js";

// One vertical slice: intro -> 3 snippets -> puzzle -> completion
const STEP = {
  INTRO: 0,
  SNIPPET_1: 1,
  SNIPPET_2: 2,
  SNIPPET_3: 3,
  PUZZLE: 4,
  COMPLETION: 5
};

export function renderHistorySlice1Screen(container, context, { screenId }) {
  const baseState = getState();
  const wing = getHistoryWing1(baseState.condition || "narrative");

  const savedStep = baseState.progress?.wingHistory01Step ?? STEP.INTRO;

  updateState({
    currentScreenId: screenId,
    phase: "learning",
    progress: {
      ...(baseState.progress || {}),
      wingHistory01Step: savedStep,
      score: {
        snippetCorrectCount: baseState.progress?.score?.snippetCorrectCount || 0,
        puzzleCorrect: baseState.progress?.score?.puzzleCorrect || false,
        posttestCorrectCount: baseState.progress?.score?.posttestCorrectCount || 0,
        posttestAnsweredCount: baseState.progress?.score?.posttestAnsweredCount || 0
      }
    }
  });

  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen" });
  container.appendChild(screenEl);

  let currentStep = savedStep;
  let stepStartTime = performance.now();
  const transitionMs = wing.presentation?.transitionMs || 200;
  const minReadMs = wing.presentation?.minReadMs || 5000;

  renderStep(currentStep);

  function renderStep(stepIndex) {
    runFadeTransition(screenEl, transitionMs, () => {
      screenEl.innerHTML = "";

      screenEl.appendChild(
        createElement("div", { className: "screen__badge", text: `History • ${wing.wingTitle}` })
      );
      screenEl.appendChild(
        createElement("p", {
          className: "text-muted",
          text: buildProgressLabel(stepIndex)
        })
      );
      if (isNonNarrativeCondition(state)) {
        screenEl.appendChild(
          createElement("p", {
            className: "non-narrative-ribbon",
            text: "Non-narrative • model / checklist presentation"
          })
        );
      }

      if (stepIndex === STEP.INTRO) return renderIntro();
      if (stepIndex >= STEP.SNIPPET_1 && stepIndex <= STEP.SNIPPET_3) {
        return renderSnippet(stepIndex - STEP.SNIPPET_1);
      }
      if (stepIndex === STEP.PUZZLE) return renderPuzzle();
      if (stepIndex === STEP.COMPLETION) return renderCompletion();
    });
  }

  function goToStep(nextStep) {
    // snippet viewed logging when leaving snippet step
    if (currentStep >= STEP.SNIPPET_1 && currentStep <= STEP.SNIPPET_3) {
      const snippetIndex = currentStep - STEP.SNIPPET_1;
      const snippet = wing.snippets[snippetIndex];
      const responseTimeMs = Math.round(performance.now() - stepStartTime);

      logEvent({
        participantId: state.participantId,
        condition: state.condition,
        phase: state.phase,
        screenId,
        itemId: snippet.id,
        response: { type: "snippet-viewed", snippetIndex, snippetId: snippet.id },
        correctness: null,
        responseTimeMs
      });
    }

    currentStep = nextStep;
    stepStartTime = performance.now();

    updateState({
      progress: {
        ...(getState().progress || {}),
        wingHistory01Step: currentStep
      }
    });

    renderStep(currentStep);
  }

  function renderIntro() {
    const sceneCfg = wing.presentation?.scenes?.intro;
    applySceneBackground(screenEl, sceneCfg?.background);
    startSceneLoop(sceneCfg?.audioLoop);

    const title = createElement("h1", { className: "screen__title", text: wing.intro.title });
    const body = createElement("p", { className: "screen__body typewriter" });
    const skipHint = createElement("p", {
      className: "text-muted",
      text: "Tap text to skip typing."
    });

    const btn = createElement("button", {
      className: "btn btn--primary",
      text: "Continue",
      attrs: { disabled: "true" },
      onClick: () => {
        const responseTimeMs = Math.round(performance.now() - stepStartTime);
        logEvent({
          participantId: state.participantId,
          condition: state.condition,
          phase: state.phase,
          screenId,
          itemId: wing.intro.id,
          response: { type: "intro-viewed" },
          correctness: null,
          responseTimeMs
        });
        playUiSfx("click");
        goToStep(STEP.SNIPPET_1);
      }
    });

    const cleanText = normalizeWhitespace(wing.intro.text);
    const tw = typewriterText(body, cleanText);
    body.addEventListener("click", () => tw.skip());
    lockContinueButton(btn, minReadMs);

    screenEl.appendChild(title);
    screenEl.appendChild(body);
    screenEl.appendChild(skipHint);
    screenEl.appendChild(btn);
  }

  function renderSnippet(index) {
    const snippet = wing.snippets[index];
    const snippetCheck = wing.snippetChecks.find((q) => q.snippetId === snippet.id);
    const sceneCfg = wing.presentation?.scenes?.[snippet.id];
    applySceneBackground(screenEl, sceneCfg?.background);
    startSceneLoop(sceneCfg?.audioLoop);

    screenEl.appendChild(createElement("h1", { className: "screen__title", text: snippet.title }));
    const body = createElement("p", { className: "screen__body typewriter" });
    const tw = typewriterText(body, normalizeWhitespace(snippet.text));
    body.addEventListener("click", () => tw.skip());
    screenEl.appendChild(body);
    screenEl.appendChild(
      createElement("p", { className: "text-muted", text: `Snippet ${index + 1} of ${wing.snippets.length}` })
    );
    screenEl.appendChild(
      createElement("p", { className: "text-muted", text: "Tap text to skip typing." })
    );

    const form = createElement("form", { className: "screen__form" });
    const prompt = createElement("p", {
      className: "screen__question",
      text: snippetCheck ? snippetCheck.prompt : "Continue to next snippet."
    });
    const select = createElement("select", { attrs: { required: "true" } });
    select.appendChild(
      createElement("option", {
        attrs: { value: "", disabled: "true", selected: "true" },
        text: "Select answer"
      })
    );
    if (snippetCheck) {
      snippetCheck.options.forEach((opt) => {
        select.appendChild(
          createElement("option", { attrs: { value: opt.id }, text: opt.text })
        );
      });
    }
    const confidenceSelect = createElement("select", { attrs: { required: "true" } });
    confidenceSelect.appendChild(
      createElement("option", {
        attrs: { value: "", disabled: "true", selected: "true" },
        text: "Confidence (low / medium / high)"
      })
    );
    ["low", "medium", "high"].forEach((level) => {
      confidenceSelect.appendChild(
        createElement("option", { attrs: { value: level }, text: level })
      );
    });

    const submitText = index === wing.snippets.length - 1 ? "Continue to puzzle" : "Next snippet";
    const submitBtn = createElement("button", {
      className: "btn btn--primary",
      text: submitText,
      attrs: { type: "submit", disabled: "true" }
    });
    lockContinueButton(submitBtn, minReadMs);

    form.appendChild(prompt);
    form.appendChild(select);
    form.appendChild(confidenceSelect);
    form.appendChild(submitBtn);
    screenEl.appendChild(form);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!snippetCheck) return;
      const selectedOptionId = select.value;
      const confidence = confidenceSelect.value;
      if (!selectedOptionId || !confidence) return;

      const responseTimeMs = Math.round(performance.now() - stepStartTime);
      const correctness = selectedOptionId === snippetCheck.correctOptionId;

      logEvent({
        participantId: state.participantId,
        condition: state.condition,
        phase: state.phase,
        screenId,
        itemId: snippetCheck.id,
        response: {
          type: "snippet-check-submit",
          snippetId: snippet.id,
          selectedOptionId,
          confidence
        },
        correctness,
        responseTimeMs
      });

      const progress = getState().progress || {};
      const score = progress.score || {};
      updateState({
        progress: {
          ...progress,
          score: {
            ...score,
            snippetCorrectCount: score.snippetCorrectCount + (correctness ? 1 : 0)
          }
        }
      });

      playUiSfx("click");
      const nextStep = index === wing.snippets.length - 1 ? STEP.PUZZLE : STEP.SNIPPET_1 + index + 1;
      goToStep(nextStep);
    });
  }

  function renderPuzzle() {
    const sceneCfg = wing.presentation?.scenes?.puzzle;
    applySceneBackground(screenEl, sceneCfg?.background);
    startSceneLoop(sceneCfg?.audioLoop);

    screenEl.appendChild(createElement("h1", { className: "screen__title", text: wing.puzzle.title }));
    const puzzleContainer = createElement("div");
    screenEl.appendChild(puzzleContainer);

    renderChoicePuzzle(puzzleContainer, {
      puzzle: wing.puzzle,
      context: {
        participantId: state.participantId,
        condition: state.condition,
        phase: state.phase,
        screenId
      },
      onComplete: ({ correctness }) => {
        const progress = getState().progress || {};
        const score = progress.score || {};
        updateState({
          progress: {
            ...progress,
            score: {
              ...score,
              puzzleCorrect: Boolean(correctness)
            }
          }
        });
        goToStep(STEP.COMPLETION);
      }
    });
  }

  function renderCompletion() {
    const sceneCfg = wing.presentation?.scenes?.completion;
    applySceneBackground(screenEl, sceneCfg?.background);
    startSceneLoop(sceneCfg?.audioLoop);

    const wstate = getState().world || {};
    updateState({
      world: {
        ...wstate,
        historyWingComplete: true,
        geographyUnlocked: true
      }
    });

    screenEl.appendChild(createElement("h1", { className: "screen__title", text: "Module complete" }));
    const score = getState().progress?.score || {};
    const puzzleMessage = score.puzzleCorrect ? "Structure restored" : "Sequence inconsistent";
    screenEl.appendChild(
      createElement("p", {
        className: "screen__body",
        text: puzzleMessage
      })
    );
    screenEl.appendChild(
      createElement("p", {
        className: "screen__subtitle",
        text: `Score: snippets ${score.snippetCorrectCount || 0}/3 • puzzle ${score.puzzleCorrect ? "1/1" : "0/1"} • post-test ${score.posttestCorrectCount || 0}/${score.posttestAnsweredCount || 0}`
      })
    );
    screenEl.appendChild(
      createElement("button", {
        className: "btn btn--primary",
        text: "Go to post-test",
        onClick: () => {
          playUiSfx("click");
          window.location.hash = "#history-1-post";
        }
      })
    );
    if (getState().world?.exploreMode) {
      screenEl.appendChild(
        createElement("button", {
          className: "btn btn--ghost",
          text: "Return to library (explore)",
          onClick: () => {
            playUiSfx("click");
            updateState({
              world: {
                ...getState().world,
                exploreMode: false,
                room: "hub"
              }
            });
            window.location.hash = "#library-world";
          }
        })
      );
    } else {
      screenEl.appendChild(
        createElement("button", {
          className: "btn btn--ghost",
          text: "Back to hub",
          onClick: () => {
            playUiSfx("click");
            window.location.hash = "#hub";
          }
        })
      );
    }
  }
}

function buildProgressLabel(stepIndex) {
  if (stepIndex === STEP.INTRO) return "Progress: Intro";
  if (stepIndex >= STEP.SNIPPET_1 && stepIndex <= STEP.SNIPPET_3) {
    return `Progress: Snippet ${stepIndex - STEP.SNIPPET_1 + 1}/3`;
  }
  if (stepIndex === STEP.PUZZLE) return "Progress: Puzzle";
  return "Progress: Completion";
}

function lockContinueButton(btn, minReadMs) {
  if (!btn) return;
  btn.disabled = true;
  let remainingSec = Math.ceil(minReadMs / 1000);
  const base = btn.textContent;
  btn.textContent = `${base} (${remainingSec}s)`;

  const intervalId = window.setInterval(() => {
    remainingSec -= 1;
    if (remainingSec > 0) {
      btn.textContent = `${base} (${remainingSec}s)`;
    }
  }, 1000);

  window.setTimeout(() => {
    window.clearInterval(intervalId);
    btn.textContent = base;
    btn.disabled = false;
  }, minReadMs);
}

