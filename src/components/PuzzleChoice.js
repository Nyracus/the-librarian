// src/components/PuzzleChoice.js

import { createElement, normalizeWhitespace } from "./ui.js";
import { logEvent } from "../core/logger.js";
import { playUiSfx } from "../core/audioManager.js";

/**
 * Reusable puzzle component.
 * Supports type: "ordering"
 *
 * Logs:
 * - puzzle-start
 * - puzzle-submit
 */
export function renderChoicePuzzle(container, { puzzle, context, onComplete }) {
  container.innerHTML = "";

  const wrapper = createElement("div", { className: "screen__body" });

  if (puzzle.title) {
    wrapper.appendChild(
      createElement("p", { className: "screen__subtitle", text: puzzle.title })
    );
  }

  wrapper.appendChild(
    createElement("p", { className: "screen__question", text: normalizeWhitespace(puzzle.prompt) })
  );

  const form = createElement("form", { className: "screen__form" });
  const feedbackEl = createElement("div", { className: "screen__feedback text-muted" });

  if (puzzle.type !== "ordering") {
    wrapper.appendChild(
      createElement("div", { className: "text-danger", text: "Unsupported puzzle type." })
    );
    container.appendChild(wrapper);
    return;
  }

  const selects = [];
  for (let i = 0; i < puzzle.items.length; i++) {
    const label = createElement("label", {
      className: "text-muted",
      text: `Position ${i + 1}: `
    });

    const selectEl = createElement("select", {
      attrs: { required: "true", "data-position": String(i) }
    });

    selectEl.appendChild(
      createElement("option", {
        attrs: { value: "", disabled: "true", selected: "true" },
        text: "Select item"
      })
    );

    puzzle.items.forEach((item) => {
      selectEl.appendChild(
        createElement("option", { attrs: { value: item.id }, text: item.text })
      );
    });

    label.appendChild(selectEl);
    form.appendChild(label);
    selects.push(selectEl);
  }

  const submitBtn = createElement("button", {
    className: "btn btn--primary",
    text: "Submit answer",
    attrs: { type: "submit" }
  });

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

  form.appendChild(confidenceSelect);
  form.appendChild(submitBtn);

  wrapper.appendChild(form);
  wrapper.appendChild(feedbackEl);
  container.appendChild(wrapper);

  // puzzle started
  logEvent({
    participantId: context.participantId,
    condition: context.condition,
    phase: context.phase,
    screenId: context.screenId,
    itemId: puzzle.id,
    response: { type: "puzzle-start" },
    correctness: null,
    responseTimeMs: null
  });

  const startTime = performance.now();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const chosenOrderIds = selects.map((s) => s.value).filter(Boolean);
    const confidence = confidenceSelect.value;
    if (chosenOrderIds.length !== puzzle.correctOrder.length || !confidence) {
      feedbackEl.textContent = "Please select an item for each position.";
      feedbackEl.className = "screen__feedback text-danger";
      wrapper.classList.remove("feedback-correct", "feedback-incorrect");
      wrapper.classList.add("feedback-incorrect");
      playUiSfx("error");
      return;
    }

    const responseTimeMs = Math.round(performance.now() - startTime);
    const correctness = arraysEqual(chosenOrderIds, puzzle.correctOrder);

    logEvent({
      participantId: context.participantId,
      condition: context.condition,
      phase: context.phase,
      screenId: context.screenId,
      itemId: puzzle.id,
      response: { type: "puzzle-submit", chosenOrderIds, confidence },
      correctness,
      responseTimeMs
    });

    feedbackEl.textContent = "Answer recorded.";
    feedbackEl.className = "screen__feedback text-muted";
    wrapper.classList.remove("feedback-correct", "feedback-incorrect");
    wrapper.classList.add(correctness ? "feedback-correct" : "feedback-incorrect");
    playUiSfx(correctness ? "success" : "error");

    if (typeof onComplete === "function") {
      onComplete({ correctness, chosenOrderIds, responseTimeMs });
    }
  });
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

