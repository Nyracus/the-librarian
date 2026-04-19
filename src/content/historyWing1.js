// src/content/historyWing1.js

// Wing 1 content pack: The Fractured Treaty
// IDs are stable and used directly for logging.

const HISTORY_WING_1 = {
  wingId: "history_01",
  wingTitle: "The Fractured Treaty",
  domain: "historical_causation",
  learningObjective:
    "Understand how scarcity, tension, alliances, and trigger events interact to escalate conflict.",
  schema: {
    concepts: [
      {
        id: "scarcity",
        label: "Scarcity",
        definition:
          "A shortage of important resources can increase pressure and dissatisfaction."
      },
      {
        id: "tension",
        label: "Tension",
        definition:
          "Strained relations between groups make peaceful resolution less likely."
      },
      {
        id: "alliance",
        label: "Alliance",
        definition:
          "An agreement between groups can draw additional sides into a conflict."
      },
      {
        id: "trigger_event",
        label: "Trigger Event",
        definition:
          "A sudden incident can turn existing instability into open conflict."
      },
      {
        id: "escalation",
        label: "Escalation",
        definition:
          "Conflict expands when connected groups become involved after a trigger."
      }
    ],
    relations: [
      { id: "r1", from: "scarcity", to: "tension", type: "increases" },
      {
        id: "r2",
        from: "tension",
        to: "trigger_event",
        type: "makes_conflict_more_likely_after"
      },
      { id: "r3", from: "alliance", to: "escalation", type: "spreads" },
      { id: "r4", from: "trigger_event", to: "escalation", type: "initiates" }
    ]
  },
  presentation: {
    transitionMs: 200,
    minReadMs: 5000,
    scenes: {
      intro: {
        background: "scene-grain",
        audioLoop: "scene_intro"
      },
      history_01_snippet_01: {
        background: "scene-grain",
        audioLoop: "scene_grain"
      },
      history_01_snippet_02: {
        background: "scene-oath",
        audioLoop: "scene_oath"
      },
      history_01_snippet_03: {
        background: "scene-dispatch",
        audioLoop: "scene_dispatch"
      },
      puzzle: {
        background: "scene-dispatch",
        audioLoop: "scene_puzzle"
      },
      completion: {
        background: "scene-grain",
        audioLoop: "scene_complete"
      }
    }
  },
  snippetChecks: [
    {
      id: "history_01_snippet_01_check",
      snippetId: "history_01_snippet_01",
      prompt: "What condition increased distrust between provinces in this snippet?",
      options: [
        { id: "a", text: "Food/resource shortages after failed harvests" },
        { id: "b", text: "A diplomatic celebration" },
        { id: "c", text: "A sudden alliance withdrawal" }
      ],
      correctOptionId: "a"
    },
    {
      id: "history_01_snippet_02_check",
      snippetId: "history_01_snippet_02",
      prompt: "What mechanism made separate disputes more connected?",
      options: [
        { id: "a", text: "Shared grain accounting" },
        { id: "b", text: "Renewed alliances between neighboring states" },
        { id: "c", text: "Lower border tensions" }
      ],
      correctOptionId: "b"
    },
    {
      id: "history_01_snippet_03_check",
      snippetId: "history_01_snippet_03",
      prompt: "How is the envoy attack described in the model?",
      options: [
        { id: "a", text: "As the trigger incident within existing instability" },
        { id: "b", text: "As the only cause of conflict" },
        { id: "c", text: "As an event unrelated to escalation" }
      ],
      correctOptionId: "a"
    }
  ],
  conditions: {
    narrative: {
      intro: {
        id: "history_01_intro",
        title: "The Fractured Treaty",
        text:
          "The History Wing has decayed into fragments. A failed peace treaty lies at the center of the damage. The Chief Librarian believes the conflict did not begin with a single event, but with a chain of conditions that made collapse inevitable. Restore the record by tracing how the crisis unfolded."
      },
      snippets: [
        {
          id: "history_01_snippet_01",
          title: "Shelf of Empty Ledgers",
          text:
            "Several provinces depended on the same grain routes after two years of failed harvests. Food became scarce, prices rose, and local leaders began accusing one another of taking more than their share. Although no war had started, distrust grew stronger with each shortage."
        },
        {
          id: "history_01_snippet_02",
          title: "The Oath Table",
          text:
            "As distrust increased, neighboring states renewed old military promises. These alliances were meant to offer protection, but they also linked separate disputes together. A conflict between two states could now pull several others into the same struggle."
        },
        {
          id: "history_01_snippet_03",
          title: "The Torn Dispatch",
          text:
            "The final break came when a royal envoy was attacked during a tense border meeting. The incident did not create the instability by itself. Instead, it acted as the spark that ignited tensions already intensified by scarcity and expanded by alliances."
        }
      ],
      puzzle: {
        id: "history_01_puzzle_01",
        type: "ordering",
        title: "Restore the Chain of Collapse",
        prompt:
          "Place the events in the order that best explains how the regional conflict escalated.",
        items: [
          {
            id: "p1_item_01",
            text: "Food shortages caused pressure and distrust between provinces."
          },
          {
            id: "p1_item_02",
            text: "States renewed alliances that linked multiple disputes together."
          },
          {
            id: "p1_item_03",
            text: "A royal envoy was attacked during a tense border meeting."
          },
          {
            id: "p1_item_04",
            text: "Several allied states were drawn into open conflict."
          }
        ],
        correctOrder: ["p1_item_01", "p1_item_02", "p1_item_03", "p1_item_04"]
      }
    },
    nonNarrative: {
      intro: {
        id: "history_01_intro",
        title: "Historical Conflict Model 1",
        text:
          "This module explains how conflicts can emerge through connected conditions rather than a single isolated event. Review the sequence carefully. Your task is to identify how resource scarcity, political tension, alliances, and a triggering incident interact in a conflict system."
      },
      snippets: [
        {
          id: "history_01_snippet_01",
          title: "Condition 1: Scarcity and Tension",
          text:
            "When several regions depend on the same limited food supply after repeated harvest failure, scarcity increases. Rising prices and unequal access can cause leaders to blame one another. Even without open war, distrust and political tension can grow under these conditions."
        },
        {
          id: "history_01_snippet_02",
          title: "Condition 2: Alliance Linkage",
          text:
            "When neighboring states form or renew alliances for protection, separate disputes become connected. Under this arrangement, a conflict involving one state may require additional states to join because of prior commitments."
        },
        {
          id: "history_01_snippet_03",
          title: "Condition 3: Trigger Event",
          text:
            "A violent incident during a tense political meeting can function as a trigger event. A trigger does not create the underlying instability on its own. Instead, it activates conflict within a system already shaped by tension and alliance connections."
        }
      ],
      puzzle: {
        id: "history_01_puzzle_01",
        type: "ordering",
        title: "Reconstruct the Conflict Sequence",
        prompt:
          "Place the events in the order that best explains escalation in the conflict model.",
        items: [
          {
            id: "p1_item_01",
            text: "Resource shortages increased distrust between provinces."
          },
          {
            id: "p1_item_02",
            text: "Alliances connected separate disputes across states."
          },
          {
            id: "p1_item_03",
            text: "A violent diplomatic incident occurred during a tense meeting."
          },
          { id: "p1_item_04", text: "Multiple connected states entered open conflict." }
        ],
        correctOrder: ["p1_item_01", "p1_item_02", "p1_item_03", "p1_item_04"]
      }
    }
  },
  assessments: {
    pretest: [
      {
        id: "history_01_pre_01",
        type: "multiple_choice",
        prompt:
          "Which factor is most likely to increase tension between regions before open conflict begins?",
        options: [
          { id: "a", text: "A shared shortage of important resources" },
          { id: "b", text: "A peaceful cultural festival" },
          { id: "c", text: "Improved harvest output" },
          { id: "d", text: "Reduced contact between leaders" }
        ],
        correctOptionId: "a"
      },
      {
        id: "history_01_pre_02",
        type: "multiple_choice",
        prompt: "Why can alliances make a conflict larger?",
        options: [
          { id: "a", text: "They always prevent disagreement" },
          { id: "b", text: "They can require more groups to become involved" },
          { id: "c", text: "They remove all political tension" },
          { id: "d", text: "They reduce the importance of major events" }
        ],
        correctOptionId: "b"
      }
    ],
    posttest: [
      {
        id: "history_01_post_01",
        type: "multiple_choice",
        prompt: "In the History Wing example, what role did the attack on the envoy play?",
        options: [
          { id: "a", text: "It reduced regional tension" },
          { id: "b", text: "It acted as a trigger within an already unstable system" },
          { id: "c", text: "It created alliances between states" },
          { id: "d", text: "It solved the food shortage problem" }
        ],
        correctOptionId: "b"
      },
      {
        id: "history_01_post_02",
        type: "ordering",
        prompt: "Arrange these elements from earlier systemic condition to later escalation.",
        items: [
          { id: "o1", text: "Scarcity" },
          { id: "o2", text: "Alliance linkage" },
          { id: "o3", text: "Trigger incident" },
          { id: "o4", text: "Escalation" }
        ],
        correctOrder: ["o1", "o2", "o3", "o4"]
      },
      {
        id: "history_01_post_03",
        type: "multiple_choice",
        prompt:
          "A region has rising shortages and strong military promises between neighboring states. Which new event is most likely to produce rapid escalation?",
        options: [
          { id: "a", text: "A minor trade agreement" },
          { id: "b", text: "A diplomatic attack during a tense negotiation" },
          { id: "c", text: "A harvest improvement" },
          { id: "d", text: "A reduction in border contact" }
        ],
        correctOptionId: "b"
      }
    ],
    delayedTest: [
      {
        id: "history_01_delayed_01",
        type: "multiple_choice",
        prompt: "Which statement best reflects the conflict model from the History Wing?",
        options: [
          { id: "a", text: "A single dramatic event alone usually explains large conflicts" },
          { id: "b", text: "Large conflicts often emerge when pressure, connection, and a trigger combine" },
          { id: "c", text: "Alliances always reduce the scale of war" },
          { id: "d", text: "Scarcity matters only after conflict begins" }
        ],
        correctOptionId: "b"
      },
      {
        id: "history_01_delayed_02",
        type: "ordering",
        prompt: "Reconstruct the most likely escalation path.",
        items: [
          { id: "d1", text: "Political tension rises under shortage conditions" },
          { id: "d2", text: "States are linked by defense commitments" },
          { id: "d3", text: "A violent border incident occurs" },
          { id: "d4", text: "A wider regional conflict begins" }
        ],
        correctOrder: ["d1", "d2", "d3", "d4"]
      },
      {
        id: "history_01_delayed_03",
        type: "multiple_choice",
        prompt:
          "Two regions face severe shortages. Several nearby states are bound by defense agreements. Which explanation best predicts why conflict may spread widely after one assassination?",
        options: [
          { id: "a", text: "Because shortages and alliances create an unstable system before the attack" },
          { id: "b", text: "Because one event always causes war regardless of prior conditions" },
          { id: "c", text: "Because alliances are unrelated to escalation" },
          { id: "d", text: "Because resource pressure reduces political tension" }
        ],
        correctOptionId: "a"
      }
    ]
  }
};

export function getHistoryWing1(condition) {
  const key = condition === "non-narrative" ? "nonNarrative" : "narrative";
  const conditionData = HISTORY_WING_1.conditions[key];
  return {
    wingId: HISTORY_WING_1.wingId,
    wingTitle: HISTORY_WING_1.wingTitle,
    domain: HISTORY_WING_1.domain,
    learningObjective: HISTORY_WING_1.learningObjective,
    schema: HISTORY_WING_1.schema,
    presentation: HISTORY_WING_1.presentation,
    snippetChecks: HISTORY_WING_1.snippetChecks,
    intro: conditionData.intro,
    snippets: conditionData.snippets,
    puzzle: conditionData.puzzle,
    assessments: HISTORY_WING_1.assessments
  };
}

