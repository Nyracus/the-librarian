// src/core/openaiAi.js — High-level OpenAI helpers for The Librarian.

import { openaiChat } from "./openaiClient.js";

const SYSTEM_JSON =
  "You are a careful educational assistant for The Librarian, a learning game. Reply with valid JSON only when asked. Do not include markdown fences.";

/**
 * @returns {Promise<{ ok: true; reply: string } | { ok: false; error: string }>}
 */
export async function aiPing() {
  const r = await openaiChat({
    messages: [
      { role: "system", content: "Reply with exactly: ok" },
      { role: "user", content: "ping" }
    ],
    temperature: 0,
    max_tokens: 16
  });
  if (!r.ok) return r;
  return { ok: true, reply: r.content.trim() };
}

/**
 * @param {{ topic: string; wing: string; difficulty: string; count: number; extra?: string }}
 */
export async function aiGenerateMcqBankBatch({ topic, wing, difficulty, count, extra }) {
  const n = Math.min(Math.max(Math.floor(count) || 1, 1), 8);
  const user = `Generate exactly ${n} multiple-choice assessment items for a university-level learning game.

Topic focus: ${topic}
Wing (subject area label): ${wing}
Difficulty: ${difficulty}
${extra ? `Additional constraints: ${extra}` : ""}

Return a JSON object with this exact shape (no markdown):
{
  "questions": [
    {
      "label": "short label for CMS list",
      "wing": "one of: history, geography, literature, theology, general",
      "difficulty": "one of: easy, medium, hard",
      "tags": ["tag1", "tag2"],
      "item": {
        "type": "multiple_choice",
        "prompt": "question stem",
        "options": [
          { "id": "a", "text": "option A" },
          { "id": "b", "text": "option B" },
          { "id": "c", "text": "option C" },
          { "id": "d", "text": "option D" }
        ],
        "correctOptionId": "a"
      }
    }
  ]
}

Rules: four options per item, ids must be a,b,c,d. correctOptionId must match one option id. Prompts must be factual and appropriate for the wing.`;

  const r = await openaiChat({
    messages: [
      { role: "system", content: SYSTEM_JSON },
      { role: "user", content: user }
    ],
    temperature: 0.45,
    max_tokens: 8192,
    response_format: { type: "json_object" }
  });
  if (!r.ok) return r;
  try {
    const parsed = JSON.parse(r.content);
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: "Model did not return valid JSON.", raw: r.content };
  }
}

/**
 * @param {{ prompt: string; options: { id: string; text: string }[]; correctOptionId: string }}
 */
export async function aiExplainAnswer({ prompt, options, correctOptionId }) {
  const opts = options.map((o) => `${o.id}) ${o.text}`).join("\n");
  const user = `Question:\n${prompt}\n\nOptions:\n${opts}\n\nCorrect option id: ${correctOptionId}\n\nGive a 2–4 sentence explanation suitable for a learner: why the correct answer is right (no lecturing). Plain text only.`;

  const r = await openaiChat({
    messages: [
      { role: "system", content: "You are a concise tutor. Plain text only." },
      { role: "user", content: user }
    ],
    temperature: 0.35,
    max_tokens: 400
  });
  if (!r.ok) return r;
  return { ok: true, explanation: r.content.trim() };
}

/**
 * @param {{ summaryText: string }}
 */
export async function aiLearnerFeedback({ summaryText }) {
  const user = `Based on this session summary for a learner, write 3–5 short bullet lines of supportive, specific feedback (no diagnosis, no medical claims). Use plain text with line breaks.

Summary:
${summaryText}`;

  const r = await openaiChat({
    messages: [
      { role: "system", content: "You are an encouraging learning coach. Plain text only." },
      { role: "user", content: user }
    ],
    temperature: 0.5,
    max_tokens: 500
  });
  if (!r.ok) return r;
  return { ok: true, feedback: r.content.trim() };
}

/**
 * @param {{ topic: string; wing?: string }}
 */
export async function aiFabricatorBrainstorm({ topic, wing }) {
  const user = `A narrative learning game needs content ideas.

Topic / request: ${topic}
${wing ? `Wing: ${wing}` : ""}

Return plain text with:
- 5 bullet ideas for story beats or learning beats
- 3 ideas for light puzzles or interactions
- 1 note on assessment alignment

Keep each bullet one line.`;

  const r = await openaiChat({
    messages: [
      { role: "system", content: "You are a narrative learning designer. Plain text only." },
      { role: "user", content: user }
    ],
    temperature: 0.65,
    max_tokens: 700
  });
  if (!r.ok) return r;
  return { ok: true, text: r.content.trim() };
}
