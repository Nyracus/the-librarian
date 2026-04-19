# Dharmaganja — design & product context (The Librarian)

Single reference for **thesis + course + future commercial** build. Update as research tightens.

---

## Historical anchor (for tone, not literal simulation)

**Dharmaganja** (often discussed as the great library cluster of **Nālandā Mahāvihāra**, Magadha / present-day Bihar) names a **repository of learning**, not a single modern “room.” Scholarly and popular sources associate the complex with enormous **manuscript** holdings (palm leaf, birch bark), **multi-lingual** scholarship (Sanskrit, Pāli, Tibetan, Chinese transmission via travelers such as Xuanzang), and subjects spanning **dharma**, **medicine**, **grammar**, **astronomy**, **poetics**, and more.

Traditional names for **three library structures** appear often in secondary literature: **Ratnasāgara**, **Ratnodadhi**, **Ratnarañjaka** (“jewel / treasure” imagery — use as **in-game wing names or meta-layers**, not as claims about exact archaeology).

**Destruction in the 12th century** is a common narrative hook (fire, loss of texts). Treat as **emotional backdrop** for “restoration / fractured record” themes — historiography is debated; avoid presenting one version as settled fact in UI copy if you want academic rigor.

**Design takeaway:** The Librarian is a **custodian of scattered knowledge**; wings are **galleries of practice** (history, geography, stars, words, doctrine, politics) under one **mahāvihāra-scale** roof — cosmopolitan, scholarly, manuscript-forward, calm dignity over arcade flash.

---

## Game / UI architecture (aligned with Dharmaganja)

| Idea | Implementation direction |
|------|---------------------------|
| **Wings** | Distinct zones (History, Geography, Astronomy, Literature, Vocabulary, Theology, Politics, …) as **chapters** or **halls**; unlock order can echo “deeper stacks.” |
| **Three jewels** | Optional meta: three “vault” acts or difficulty tiers named after Ratnasāgara / Ratnodadhi / Ratnarañjaka. |
| **Manuscript & scroll** | Primary **content chrome** for narrative and quizzes (parchment panels, seals, marginalia — **16-bit warm palette**, Stardew-adjacent readability). |
| **Pilgrim / traveler** | Optional framing for **open cohort** (500+): anonymous visitors to the library; **cohort P##** for thesis participants. |
| **Restoration** | Existing “Fractured Treaty” style = **one wing’s myth**; other wings get their own “damaged catalog” arcs later. |

**Aesthetic lock (current decision):** **16-bit colour**, **Stardew Valley–like warmth** — reference mockups about **layout and content type** (scroll, banner, chapter select), **not** forced greyscale.

---

## Technical roadmap (decisions as of last sync)

1. **Course:** Java is **not** required for this repo; core logic is **JavaScript**. HTML/CSS are in this project. A Java stack is optional only if an instructor asks for a separate artifact.
2. **Backend:** **No custom API for v1.** **Firebase Auth + Cloud Firestore**: signed-in players emit **`events`** documents (app writes automatically; players do not open the Firebase console). Rules in `firestore.rules`.
3. **Participants:** **Simple path** — users **register normally**; you **manually assign / record P##** in your study spreadsheet or a Firestore `participants` doc. No bespoke P-login system required for v1.
4. **Event taxonomy (v1 seeds):** `history`, `geography`, `astronomy`, `literature`, `vocabulary`, `theology`, `politics`, … (extend as wings ship).
5. **PII:** **Store as needed** for research (subject to **ethics / consent** — document in thesis methods).
6. **Hosting / cost:** Prefer **Firebase free tier** until traffic or monetization justifies **Blaze** or other paid caps.
7. **Build order:** **Path A** — instrumentation + play so data exists for v1. **Path B** — cohort workflow + richer dashboards. **AI** — deferred.
8. **Art:** **No commissioned tileset** for now; expect **CC0 / licensed tile packs** + placeholders until art direction finalizes.

---

## External references (starting points)

- Nālandā Mahāvihāra — UNESCO / academic histories for **institutional** framing.  
- Xuanzang’s account — **traveler’s eye** on the monastery (use carefully; primary vs secondary).  
- Modern scholarship on **manuscript cultures** in South Asia for **UI metaphors** (labels, colophons, “folios”).

---

*This file is for the team and AI context; it is not player-facing copy.*
