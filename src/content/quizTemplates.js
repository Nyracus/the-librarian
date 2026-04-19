// src/content/quizTemplates.js — readymade quiz templates for Architect quiz studio.

/**
 * @typedef {{ id: string; text: string }} QuizOption
 * @typedef {{ id: string; type: 'multiple_choice'; prompt: string; options: QuizOption[]; correctOptionId: string }} McqItem
 * @typedef {{ id: string; type: 'ordering'; prompt: string; items: { id: string; text: string }[]; correctOrder: string[] }} OrderingItem
 * @typedef {McqItem | OrderingItem} QuizTemplateItem
 */

function sub(s, topic, title) {
  const t = topic.trim() || "your topic";
  const ttl = (title || "").trim() || `Quiz: ${t}`;
  return String(s).replace(/\{\{topic\}\}/gi, t).replace(/\{\{title\}\}/gi, ttl);
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 7)}`;
}

/**
 * @param {string} templateId
 * @param {{ topic: string; quizTitle?: string }} vars
 * @returns {{ templateId: string; title: string; items: QuizTemplateItem[]; builtAt: string }}
 */
export function buildQuizFromTemplate(templateId, vars) {
  const t = getQuizTemplate(templateId);
  if (!t) throw new Error(`Unknown template: ${templateId}`);
  const topic = vars.topic || "";
  const quizTitle = vars.quizTitle?.trim();
  const makeId = (prefix) => uid(prefix);
  return t.build({ topic, quizTitle, makeId });
}

export function listQuizTemplates() {
  return QUIZ_TEMPLATES.map((x) => ({
    id: x.id,
    name: x.name,
    description: x.description,
    wing: x.wing
  }));
}

export function getQuizTemplate(id) {
  return QUIZ_TEMPLATES.find((t) => t.id === id) || null;
}

const QUIZ_TEMPLATES = [
  {
    id: "tpl_quick_diagnostic_mcq3",
    name: "Quick diagnostic — 3 multiple choice",
    description: "Three four-option questions. Stems reference your topic label for classroom reuse.",
    wing: "general",
    build: ({ topic, quizTitle, makeId }) => {
      const title = quizTitle || sub("Diagnostic: {{topic}}", topic, quizTitle);
      const items = [
        {
          id: makeId("mcq"),
          type: "multiple_choice",
          prompt: sub(
            "Which goal is most appropriate for a short lesson on {{topic}}?",
            topic,
            quizTitle
          ),
          options: [
            { id: "a", text: "Memorize isolated dates without context" },
            { id: "b", text: "Connect concepts and explain at least one cause-effect link" },
            { id: "c", text: "Avoid any mention of sources or evidence" },
            { id: "d", text: "Skip formative checks entirely" }
          ],
          correctOptionId: "b"
        },
        {
          id: makeId("mcq"),
          type: "multiple_choice",
          prompt: sub(
            "For {{topic}}, what is the strongest reason to use varied question formats (MCQ, ordering, short tasks)?",
            topic,
            quizTitle
          ),
          options: [
            { id: "a", text: "They reduce the need for learning objectives" },
            { id: "b", text: "They sample different skills and reduce format-specific guessing" },
            { id: "c", text: "They guarantee equal difficulty across items" },
            { id: "d", text: "They replace the need for feedback" }
          ],
          correctOptionId: "b"
        },
        {
          id: makeId("mcq"),
          type: "multiple_choice",
          prompt: sub(
            "When assessing {{topic}}, which practice best supports fair interpretation of scores?",
            topic,
            quizTitle
          ),
          options: [
            { id: "a", text: "Use a single item to decide mastery" },
            { id: "b", text: "Align items to objectives and report patterns across items" },
            { id: "c", text: "Hide rubrics from learners" },
            { id: "d", text: "Ignore time on task" }
          ],
          correctOptionId: "b"
        }
      ];
      return { templateId: "tpl_quick_diagnostic_mcq3", title, items, builtAt: new Date().toISOString() };
    }
  },
  {
    id: "tpl_history_escalation_mcq2_order1",
    name: "History-style — 2 MCQ + escalation ordering",
    description: "Matches the conflict-model pattern: two MCQs plus a four-step ordering item.",
    wing: "history",
    build: ({ topic, quizTitle, makeId }) => {
      const title = quizTitle || sub("History model quiz — {{topic}}", topic, quizTitle);
      const items = [
        {
          id: makeId("mcq"),
          type: "multiple_choice",
          prompt: sub(
            "In a lesson on {{topic}}, why can alliances increase the scale of conflict?",
            topic,
            quizTitle
          ),
          options: [
            { id: "a", text: "They always prevent disputes from spreading" },
            { id: "b", text: "They can bind additional states to enter if commitments activate" },
            { id: "c", text: "They remove scarcity as a factor" },
            { id: "d", text: "They make trigger events irrelevant" }
          ],
          correctOptionId: "b"
        },
        {
          id: makeId("mcq"),
          type: "multiple_choice",
          prompt: sub(
            "For {{topic}}, what best describes a “trigger event” in a systems view of conflict?",
            topic,
            quizTitle
          ),
          options: [
            { id: "a", text: "The only cause of war, regardless of context" },
            { id: "b", text: "An incident that activates instability already present in the system" },
            { id: "c", text: "A guaranteed path to immediate peace" },
            { id: "d", text: "A measure that always reduces escalation" }
          ],
          correctOptionId: "b"
        },
        {
          id: makeId("ord"),
          type: "ordering",
          prompt: sub(
            "Order these stages from earlier systemic pressure to later escalation ({{topic}} context).",
            topic,
            quizTitle
          ),
          items: [
            { id: "s1", text: sub("Rising pressure from resource or political strain around {{topic}}", topic, quizTitle) },
            { id: "s2", text: "Linkage across states through commitments or dependencies" },
            { id: "s3", text: "A sharp incident that activates existing tensions" },
            { id: "s4", text: "Wider escalation involving additional actors" }
          ],
          correctOrder: ["s1", "s2", "s3", "s4"]
        }
      ];
      return {
        templateId: "tpl_history_escalation_mcq2_order1",
        title,
        items,
        builtAt: new Date().toISOString()
      };
    }
  },
  {
    id: "tpl_geography_literacy_mcq2",
    name: "Geography literacy — 2 MCQ",
    description: "Map and channel vocabulary suited to river / region teaching; topic labels the unit.",
    wing: "geography",
    build: ({ topic, quizTitle, makeId }) => {
      const title = quizTitle || sub("Geography check — {{topic}}", topic, quizTitle);
      const items = [
        {
          id: makeId("mcq"),
          type: "multiple_choice",
          prompt: sub(
            "When teaching {{topic}}, what does a watershed most directly refer to?",
            topic,
            quizTitle
          ),
          options: [
            { id: "a", text: "Only the river mouth" },
            { id: "b", text: "The land area draining to a common outlet" },
            { id: "c", text: "Political borders only" },
            { id: "d", text: "Average annual rainfall worldwide" }
          ],
          correctOptionId: "b"
        },
        {
          id: makeId("mcq"),
          type: "multiple_choice",
          prompt: sub(
            "Which practice best supports reading terrain for {{topic}}?",
            topic,
            quizTitle
          ),
          options: [
            { id: "a", text: "Ignore contour spacing" },
            { id: "b", text: "Relate channel position to surrounding relief and flow direction" },
            { id: "c", text: "Use only political maps" },
            { id: "d", text: "Assume uniform slope everywhere" }
          ],
          correctOptionId: "b"
        }
      ];
      return {
        templateId: "tpl_geography_literacy_mcq2",
        title,
        items,
        builtAt: new Date().toISOString()
      };
    }
  }
];
