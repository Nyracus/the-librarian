// src/screens/DeviceSetupScreen.js

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";

export function renderDeviceSetupScreen(container, context, { screenId }) {
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
  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Setup • Device" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "What device are you using?" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: "Controls adapt automatically. You can change this later in Settings."
    })
  );

  const form = createElement("form", { className: "screen__form" });
  const select = createElement("select", { attrs: { required: "true" } });

  [
    { id: "pc", label: "PC / Laptop" },
    { id: "mobile-tablet", label: "Mobile / Tablet" }
  ].forEach((optData) => {
    const opt = document.createElement("option");
    opt.value = optData.id;
    opt.textContent = optData.label;
    select.appendChild(opt);
  });

  select.value = state.config?.playerDevice || "pc";
  form.appendChild(select);

  form.appendChild(
    createElement("button", {
      className: "btn btn--primary",
      text: "Continue",
      attrs: { type: "submit" }
    })
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const device = select.value === "mobile-tablet" ? "mobile-tablet" : "pc";
    updateState({
      config: {
        ...(getState().config || {}),
        playerDevice: device,
        controlScheme: "auto"
      },
      auth: {
        ...(getState().auth || {}),
        postAuthRoute: "condition"
      }
    });
    navigateTo("condition", { container });
  });

  screenEl.appendChild(form);
  container.appendChild(screenEl);
}

