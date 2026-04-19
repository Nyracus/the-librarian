// src/content/prototypeFeatureMap.js — major product areas vs thesis prototype (aligns with system feature summary).

/** Short intro shown above the pillars. */
export const FEATURE_MAP_INTRO =
  "The full design spans four areas. Below is what this thesis build implements versus what stays on the roadmap.";

/**
 * @typedef {"done" | "partial" | "planned"} FeatureStatus
 */

/**
 * @type {{ id: string; title: string; blurb: string; items: { label: string; status: FeatureStatus }[] }[]}
 */
export const FEATURE_MAP_PILLARS = [
  {
    id: "players",
    title: "Players (learners)",
    blurb: "Explore wings, complete modules, see how you are doing.",
    items: [
      { label: "Wings / chapters (History I, Geography, library explore)", status: "done" },
      { label: "Narrative and non-narrative presentation modes", status: "done" },
      { label: "Quizzes, ordering tasks, geography puzzles", status: "done" },
      { label: "Session snapshot: accuracy, logged time, weakest topic area", status: "partial" },
      { label: "Playtime & score dashboards (full analytics UI)", status: "partial" },
      { label: "Leaderboards (Firestore; signed-in), class challenges", status: "partial" }
    ]
  },
  {
    id: "architects",
    title: "Architects (teachers / content managers)",
    blurb: "Manage questions, see class analytics, assign work.",
    items: [
      {
        label: "Submit quiz/content requests (local queue; export JSON for Fabricators)",
        status: "partial"
      },
      {
        label: "Readymade quiz templates — generate session from topic + preview run",
        status: "partial"
      },
      {
        label: "Question bank with metadata (wing, difficulty, tags) — local CMS + import/export",
        status: "partial"
      },
      { label: "Add / edit / preview items in a CMS", status: "partial" },
      { label: "Per-learner and cohort analytics dashboards", status: "planned" },
      { label: "Assign quizzes to users or groups; push challenges", status: "planned" },
      { label: "Approval workflow with Fabricators (narrative content)", status: "planned" },
      { label: "Moderation, import/export of question banks", status: "planned" },
      { label: "Configurable unlock rules (beyond Geography gate)", status: "partial" }
    ]
  },
  {
    id: "fabricators",
    title: "Fabricators (narrative builders)",
    blurb: "Author storylines and puzzles for narrative wings.",
    items: [
      {
        label: "Request queue from Architects (linked; claim → handoff → submit → architect approval)",
        status: "partial"
      },
      {
        label: "In-tool storyline & puzzle design, submit for approval (workflow + local handoff export)",
        status: "partial"
      },
      { label: "Content is authored in-repo for this prototype", status: "partial" }
    ]
  },
  {
    id: "ai",
    title: "AI integration (planned product)",
    blurb: "OpenAI-style helpers for content and feedback.",
    items: [
      {
        label: "AI Lab: MCQ generation → question bank, explanations, coaching feedback, Fabricator brainstorm (OpenAI via local proxy)",
        status: "partial"
      },
      { label: "Smart hints during live items (inline)", status: "planned" },
      { label: "Auto-tagging and difficulty estimation (batch)", status: "planned" }
    ]
  }
];

/** @param {FeatureStatus} status */
export function featureStatusLabel(status) {
  switch (status) {
    case "done":
      return "In this build";
    case "partial":
      return "Partial";
    case "planned":
      return "Roadmap";
    default:
      return "";
  }
}

/**
 * Expandable block for Main menu / Welcome.
 * @param {{ defaultOpen?: boolean }} [opts]
 */
export function createFeatureMapElement(opts = {}) {
  const { defaultOpen = true } = opts;
  const details = document.createElement("details");
  details.className = "feature-map";
  details.open = defaultOpen;
  details.setAttribute("aria-label", "System feature blueprint and prototype status");

  const summary = document.createElement("summary");
  summary.className = "feature-map__summary";
  summary.textContent = "Feature blueprint & prototype status";
  details.appendChild(summary);

  const intro = document.createElement("p");
  intro.className = "feature-map__intro";
  intro.textContent = FEATURE_MAP_INTRO;
  details.appendChild(intro);

  for (const pillar of FEATURE_MAP_PILLARS) {
    const section = document.createElement("section");
    section.className = "feature-map__pillar";
    section.setAttribute("data-pillar", pillar.id);

    const h = document.createElement("h3");
    h.className = "feature-map__pillar-title";
    h.textContent = pillar.title;
    section.appendChild(h);

    const blurb = document.createElement("p");
    blurb.className = "feature-map__pillar-blurb";
    blurb.textContent = pillar.blurb;
    section.appendChild(blurb);

    const ul = document.createElement("ul");
    ul.className = "feature-map__list";
    for (const item of pillar.items) {
      const li = document.createElement("li");
      li.className = "feature-map__item";

      const badge = document.createElement("span");
      badge.className = `feature-map__badge feature-map__badge--${item.status}`;
      badge.textContent = featureStatusLabel(item.status);

      const text = document.createElement("span");
      text.className = "feature-map__item-text";
      text.textContent = item.label;

      li.appendChild(badge);
      li.appendChild(text);
      ul.appendChild(li);
    }
    section.appendChild(ul);
    details.appendChild(section);
  }

  return details;
}
