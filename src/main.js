// src/main.js

import { getState, updateState, subscribe } from "./core/state.js";
import { initRouter } from "./core/router.js";
import { initGameMenu } from "./core/menu.js";
import { initGoogleAuth } from "./auth/googleAuth.js";

function bootstrap() {
  const appContainer = document.getElementById("app-root");
  if (!appContainer) {
    console.error("App container not found");
    return;
  }

  // Condition override via URL query (?condition=narrative|non-narrative)
  const urlCondition = getConditionFromUrl();
  if (urlCondition === "narrative" || urlCondition === "non-narrative") {
    updateState({
      config: { conditionMode: "url" },
      condition: urlCondition
    });
  }

  // Header label
  const conditionLabel = document.getElementById("condition-label");
  if (conditionLabel) {
    const updateHeader = (state) => {
      if (!state.condition) {
        conditionLabel.textContent = "Condition: not assigned";
      } else {
        conditionLabel.textContent =
          state.condition === "narrative"
            ? "Condition: Narrative"
            : "Condition: Non-narrative";
      }
    };
    updateHeader(getState());
    subscribe(updateHeader);
  }

  initGameMenu();

  initGoogleAuth()
    .then(async () => {
      const mysql = await import("./api/mysqlSync.js");
      await mysql.syncAuthProfileFromServer();
      mysql.initMysqlSync();
      initRouter({ container: appContainer });
    })
    .catch(async (err) => {
      console.warn("Google auth init failed", err);
      const mysql = await import("./api/mysqlSync.js");
      mysql.initMysqlSync();
      initRouter({ container: appContainer });
    });

  registerServiceWorker();
}

function getConditionFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("condition");
  } catch {
    return null;
  }
}

function isLocalDevHost() {
  const h = location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "";
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Cache-first SW hides fresh JS/CSS during local dev; unregister so the tab always loads latest.
  if (isLocalDevHost()) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) {
        r.unregister().then(() => {
          console.info("Service worker unregistered (local dev)");
        });
      }
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("src/pwa/service-worker.js")
      .then((registration) => {
        console.log("Service worker registered", registration.scope);
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  });
}

bootstrap();

