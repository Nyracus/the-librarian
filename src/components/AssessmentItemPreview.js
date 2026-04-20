// Read-only preview for architects (no answering). Shows answer key.

import { createElement } from "./ui.js";
import { BLANK_PLACEHOLDER } from "../core/quizBuilderConstants.js";

/**
 * @param {HTMLElement} container
 * @param {{ item: object }} opts
 */
export function renderAssessmentItemPreview(container, { item }) {
  container.innerHTML = "";

  if (item.type === "multiple_choice") {
    const wrap = createElement("div", { className: "screen__body assessment-preview" });
    wrap.appendChild(createElement("p", { className: "screen__question", text: item.prompt }));
    const ul = document.createElement("ul");
    ul.className = "assessment-preview__options";
    (item.options || []).forEach((opt) => {
      const li = document.createElement("li");
      li.className =
        opt.id === item.correctOptionId
          ? "assessment-preview__opt assessment-preview__opt--correct"
          : "assessment-preview__opt";
      li.textContent = opt.text;
      if (opt.id === item.correctOptionId) {
        li.appendChild(document.createTextNode(" "));
        li.appendChild(
          createElement("span", { className: "assessment-preview__badge", text: "(correct)" })
        );
      }
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    container.appendChild(wrap);
    return;
  }

  if (item.type === "fill_blank") {
    const wrap = createElement("div", { className: "screen__body assessment-preview" });
    const parts = String(item.prompt || "").split(BLANK_PLACEHOLDER);
    const p = document.createElement("p");
    p.className = "screen__question";
    if (parts.length === 2) {
      p.appendChild(document.createTextNode(parts[0]));
      const mark = createElement("mark", { className: "assessment-preview__blank" });
      mark.textContent = item.correctAnswer || "—";
      p.appendChild(mark);
      p.appendChild(document.createTextNode(parts[1]));
    } else {
      p.textContent = item.prompt;
    }
    wrap.appendChild(p);
    wrap.appendChild(
      createElement("p", {
        className: "text-muted assessment-preview__key",
        text: `Answer key: ${item.correctAnswer || "—"}`
      })
    );
    container.appendChild(wrap);
    return;
  }

  if (item.type === "dropdown") {
    const wrap = createElement("div", { className: "screen__body assessment-preview" });
    wrap.appendChild(createElement("p", { className: "screen__question", text: item.prompt }));
    const ul = document.createElement("ul");
    ul.className = "assessment-preview__options";
    const sorted = [...(item.options || [])].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    );
    sorted.forEach((opt) => {
      const li = document.createElement("li");
      li.className =
        opt.id === item.correctOptionId
          ? "assessment-preview__opt assessment-preview__opt--correct"
          : "assessment-preview__opt";
      li.textContent = opt.text;
      if (opt.id === item.correctOptionId) {
        li.appendChild(document.createTextNode(" "));
        li.appendChild(
          createElement("span", { className: "assessment-preview__badge", text: "(correct)" })
        );
      }
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    container.appendChild(wrap);
    return;
  }

  if (item.type === "ordering") {
    const wrap = createElement("div", { className: "screen__body assessment-preview" });
    wrap.appendChild(createElement("p", { className: "screen__question", text: item.prompt }));
    const ol = document.createElement("ol");
    ol.className = "assessment-preview__order-key";
    const byId = new Map((item.items || []).map((row) => [row.id, row.text]));
    (item.correctOrder || []).forEach((id) => {
      const li = document.createElement("li");
      li.textContent = byId.get(id) || id;
      ol.appendChild(li);
    });
    wrap.appendChild(
      createElement("p", { className: "text-muted", text: "Correct order (top to bottom):" })
    );
    wrap.appendChild(ol);
    container.appendChild(wrap);
    return;
  }

  container.appendChild(
    createElement("div", { className: "text-danger", text: "Unsupported item type for preview." })
  );
}
