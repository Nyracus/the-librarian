// Maps screens / items to research "wing" or content domain (Firestore + analytics).

/**
 * @param {string} [screenId]
 * @param {string} [itemId]
 * @returns {string}
 */
export function inferContentDomain(screenId, itemId) {
  const sid = (screenId || "").toLowerCase();
  const iid = (itemId || "").toLowerCase();

  if (sid.startsWith("history-1") || iid.includes("history_01") || iid.includes("history-01")) {
    return "politics";
  }
  if (sid.includes("geography") || iid.includes("geography")) {
    return "geography";
  }
  if (sid === "library-world") return "explore";
  if (
    sid === "hub" ||
    sid === "welcome" ||
    sid === "auth" ||
    sid === "login" ||
    sid.startsWith("auth-") ||
    sid === "device-setup"
  ) {
    return "shell";
  }
  if (sid.includes("astronomy")) return "astronomy";
  if (sid.includes("literature")) return "literature";
  if (sid.includes("vocabulary")) return "vocabulary";
  if (sid.includes("theology")) return "theology";
  return "general";
}
