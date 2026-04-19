// src/components/AssessmentItem.js

import { createElement } from "./ui.js";
import { logEvent } from "../core/logger.js";
import { getState, updateState } from "../core/state.js";
import { BLANK_PLACEHOLDER } from "../core/quizBuilderConstants.js";

/**
 * Renders one assessment item and logs submission.
 * Supports: multiple_choice (radio list), fill_blank, dropdown, ordering
 *
 * Logs:
 * - assessment-submit
 */
export function renderAssessmentItem(container, { item, context, onComplete }) {
  container.innerHTML = "";

  if (item.type === "multiple_choice") {
    return renderMultipleChoice(container, item, context, onComplete);
  }
  if (item.type === "fill_blank") {
    return renderFillBlank(container, item, context, onComplete);
  }
  if (item.type === "dropdown") {
    return renderDropdownQuestion(container, item, context, onComplete);
  }
  if (item.type === "ordering") {
    return renderOrdering(container, item, context, onComplete);
  }

  container.appendChild(
    createElement("div", { className: "text-danger", text: "Unsupported assessment type." })
  );
}

function renderMultipleChoice(container, item, context, onComplete) {
  const wrapper = createElement("div", { className: "screen__body" });
  wrapper.appendChild(createElement("p", { className: "screen__question", text: item.prompt }));

  const form = createElement("form", { className: "screen__form assessment-item--mcq" });
  const fieldset = document.createElement("fieldset");
  fieldset.className = "assessment-item__mcq-options";
  const groupName = `mcq_${item.id || "item"}_${Math.random().toString(16).slice(2)}`;

  item.options.forEach((opt) => {
    const row = document.createElement("label");
    row.className = "assessment-item__mcq-row";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = groupName;
    radio.value = opt.id;
    radio.required = true;
    const span = document.createElement("span");
    span.className = "assessment-item__mcq-text";
    span.textContent = opt.text;
    row.appendChild(radio);
    row.appendChild(span);
    fieldset.appendChild(row);
  });

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

  const feedbackEl = createElement("div", { className: "screen__feedback text-muted" });

  form.appendChild(fieldset);
  form.appendChild(confidenceSelect);
  form.appendChild(submitBtn);

  wrapper.appendChild(form);
  wrapper.appendChild(feedbackEl);
  container.appendChild(wrapper);

  const startTime = performance.now();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const checked = fieldset.querySelector('input[type="radio"]:checked');
    const selectedOptionId = checked ? checked.value : "";
    const confidence = confidenceSelect.value;
    if (!selectedOptionId || !confidence) {
      feedbackEl.textContent = "Please choose an option.";
      feedbackEl.className = "screen__feedback text-danger";
      return;
    }

    const responseTimeMs = Math.round(performance.now() - startTime);
    const correctness = selectedOptionId === item.correctOptionId;

    logEvent({
      participantId: context.participantId,
      condition: context.condition,
      phase: context.phase,
      screenId: context.screenId,
      itemId: item.id,
      response: {
        type: "assessment-submit",
        format: "multiple_choice",
        selectedOptionId,
        confidence
      },
      correctness,
      responseTimeMs
    });
    updatePosttestScore(context.phase, correctness);

    feedbackEl.textContent = "Answer recorded.";
    feedbackEl.className = "screen__feedback text-muted";

    if (typeof onComplete === "function") onComplete({ correctness, responseTimeMs });
  });
}

function renderFillBlank(container, item, context, onComplete) {
  const wrapper = createElement("div", { className: "screen__body" });
  const form = createElement("form", { className: "screen__form assessment-item--fib" });
  const parts = String(item.prompt || "").split(BLANK_PLACEHOLDER);
  let inputEl;

  if (parts.length === 2) {
    const qRow = document.createElement("div");
    qRow.className = "assessment-item__fib-prompt";
    qRow.appendChild(document.createTextNode(parts[0]));
    inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.className = "screen__input assessment-item__fib-input";
    inputEl.autocomplete = "off";
    inputEl.required = true;
    inputEl.setAttribute("aria-label", "Your answer");
    qRow.appendChild(inputEl);
    qRow.appendChild(document.createTextNode(parts[1]));
    form.appendChild(qRow);
  } else {
    form.appendChild(
      createElement("p", { className: "screen__question", text: item.prompt })
    );
    inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.className = "screen__input";
    inputEl.required = true;
    inputEl.placeholder = "Your answer";
    form.appendChild(inputEl);
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

  const submitBtn = createElement("button", {
    className: "btn btn--primary",
    text: "Submit answer",
    attrs: { type: "submit" }
  });
  const feedbackEl = createElement("div", { className: "screen__feedback text-muted" });

  form.appendChild(confidenceSelect);
  form.appendChild(submitBtn);
  wrapper.appendChild(form);
  wrapper.appendChild(feedbackEl);
  container.appendChild(wrapper);

  const startTime = performance.now();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = (inputEl.value || "").trim();
    const confidence = confidenceSelect.value;
    if (!raw || !confidence) {
      feedbackEl.textContent = "Enter an answer.";
      feedbackEl.className = "screen__feedback text-danger";
      return;
    }

    const responseTimeMs = Math.round(performance.now() - startTime);
    const expected = String(item.correctAnswer || "").trim().toLowerCase();
    const correctness = raw.toLowerCase() === expected;

    logEvent({
      participantId: context.participantId,
      condition: context.condition,
      phase: context.phase,
      screenId: context.screenId,
      itemId: item.id,
      response: {
        type: "assessment-submit",
        format: "fill_blank",
        textAnswer: raw,
        confidence
      },
      correctness,
      responseTimeMs
    });
    updatePosttestScore(context.phase, correctness);

    feedbackEl.textContent = "Answer recorded.";
    feedbackEl.className = "screen__feedback text-muted";

    if (typeof onComplete === "function") onComplete({ correctness, responseTimeMs });
  });
}

function renderDropdownQuestion(container, item, context, onComplete) {
  const wrapper = createElement("div", { className: "screen__body" });
  wrapper.appendChild(createElement("p", { className: "screen__question", text: item.prompt }));

  const sorted = [...(item.options || [])].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
  );

  const form = createElement("form", { className: "screen__form" });
  const selectEl = createElement("select", { attrs: { required: "true" } });
  selectEl.className = "assessment-item__dropdown";
  selectEl.appendChild(
    createElement("option", {
      attrs: { value: "", disabled: "true", selected: "true" },
      text: "Choose"
    })
  );

  sorted.forEach((opt) => {
    selectEl.appendChild(createElement("option", { attrs: { value: opt.id }, text: opt.text }));
  });

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

  const feedbackEl = createElement("div", { className: "screen__feedback text-muted" });

  form.appendChild(selectEl);
  form.appendChild(confidenceSelect);
  form.appendChild(submitBtn);

  wrapper.appendChild(form);
  wrapper.appendChild(feedbackEl);
  container.appendChild(wrapper);

  const startTime = performance.now();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedOptionId = selectEl.value;
    const confidence = confidenceSelect.value;
    if (!selectedOptionId || !confidence) {
      feedbackEl.textContent = "Please choose from the dropdown.";
      feedbackEl.className = "screen__feedback text-danger";
      return;
    }

    const responseTimeMs = Math.round(performance.now() - startTime);
    const correctness = selectedOptionId === item.correctOptionId;

    logEvent({
      participantId: context.participantId,
      condition: context.condition,
      phase: context.phase,
      screenId: context.screenId,
      itemId: item.id,
      response: {
        type: "assessment-submit",
        format: "dropdown",
        selectedOptionId,
        confidence
      },
      correctness,
      responseTimeMs
    });
    updatePosttestScore(context.phase, correctness);

    feedbackEl.textContent = "Answer recorded.";
    feedbackEl.className = "screen__feedback text-muted";

    if (typeof onComplete === "function") onComplete({ correctness, responseTimeMs });
  });
}

function renderOrdering(container, item, context, onComplete) {
  const wrapper = createElement("div", { className: "screen__body" });
  wrapper.appendChild(createElement("p", { className: "screen__question", text: item.prompt }));

  const form = createElement("form", { className: "screen__form" });
  const feedbackEl = createElement("div", { className: "screen__feedback text-muted" });

  const selects = [];
  for (let i = 0; i < item.items.length; i++) {
    const label = createElement("label", {
      className: "text-muted",
      text: `Position ${i + 1}: `
    });

    const selectEl = createElement("select", { attrs: { required: "true" } });
    selectEl.appendChild(
      createElement("option", {
        attrs: { value: "", disabled: "true", selected: "true" },
        text: "Select item"
      })
    );

    item.items.forEach((opt) => {
      selectEl.appendChild(createElement("option", { attrs: { value: opt.id }, text: opt.text }));
    });

    label.appendChild(selectEl);
    form.appendChild(label);
    selects.push(selectEl);
  }

  const submitBtn = createElement("button", {
    className: "btn btn--primary",
    text: "Submit order",
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

  const startTime = performance.now();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const chosenOrderIds = selects.map((s) => s.value).filter(Boolean);
    const confidence = confidenceSelect.value;
    if (chosenOrderIds.length !== item.correctOrder.length || !confidence) {
      feedbackEl.textContent = "Please select an item for each position.";
      feedbackEl.className = "screen__feedback text-danger";
      return;
    }

    const responseTimeMs = Math.round(performance.now() - startTime);
    const correctness = arraysEqual(chosenOrderIds, item.correctOrder);

    logEvent({
      participantId: context.participantId,
      condition: context.condition,
      phase: context.phase,
      screenId: context.screenId,
      itemId: item.id,
      response: {
        type: "assessment-submit",
        format: "ordering",
        chosenOrderIds,
        confidence
      },
      correctness,
      responseTimeMs
    });
    updatePosttestScore(context.phase, correctness);

    feedbackEl.textContent = "Answer recorded.";
    feedbackEl.className = "screen__feedback text-muted";

    if (typeof onComplete === "function") onComplete({ correctness, responseTimeMs });
  });
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function updatePosttestScore(phase, correctness) {
  if (phase !== "immediate-posttest") return;
  const current = getState();
  const progress = current.progress || {};
  const score = progress.score || {};
  updateState({
    progress: {
      ...progress,
      score: {
        ...score,
        posttestAnsweredCount: (score.posttestAnsweredCount || 0) + 1,
        posttestCorrectCount: (score.posttestCorrectCount || 0) + (correctness ? 1 : 0)
      }
    }
  });
}

