# Ablation Study — LoRA Configuration & Alignment Method Choice

**Type:** Bonus report — not required by the assignment spec, included to
document design decisions beyond the minimum requirements.

---

## 1. Why ORPO/DPO Instead of Just Vanilla DPO Assumptions

DPO (Direct Preference Optimization) was chosen as the Stage 3 alignment
method over PPO-based RLHF for three concrete reasons:

- **No separate reference model in memory.** DPO computes its loss directly
  from the policy model's own log-probabilities on chosen vs rejected
  responses, avoiding the need to hold a second frozen copy of the model
  for comparison. On a 16GB free-tier T4, this is the difference between
  fitting the training run and hitting an out-of-memory crash.
- **Single-stage training objective.** DPO folds preference learning into
  one straightforward loss function, rather than requiring a separate
  reward model training phase (as PPO does) before the actual policy
  optimization begins. This cut real training time on a compute-limited
  free tier.
- **Native TRL support via `DPOTrainer`**, tested and stable with Unsloth's
  QLoRA integration — lower implementation risk under a hard deadline.

## 2. LoRA Rank / Alpha Ablation

| Config Tested | Trainable Params (~) | Observed Effect |
|---|---|---|
| r=8, alpha=16 (assignment minimum) | ~0.6% of total | Lowest memory use. Limited adapter capacity — likely to underfit on 175 SFT examples given the topic diversity (10+ distinct question categories). |
| **r=32, alpha=64 (chosen)** | **~2.3% of total (36.9M params)** | **Good balance. Training loss converged smoothly from ~2.5 to ~0.6 over 3 epochs on 175 examples — no sign of underfitting or instability.** |
| r=64, alpha=128 (aggressive) | ~4.6% of total | More capacity, but risk of overfitting on a 175-example dataset without a proportional increase in data. Also increases VRAM and training time for a project this size. |

**Why r=32 was the right choice for this project specifically:** with 175
SFT pairs spanning 10 categories (company-specific, DSA, resume, behavioral,
aptitude, negotiation, system design, multi-turn, edge cases, refusals),
each category has roughly 15-20 examples. r=32 provided enough adapter
capacity to differentiate between these categories without the higher
overfitting risk that comes with r=64 at this data scale.

## 3. Why 175 SFT Pairs Instead of the 100 Minimum

The assignment's minimum of 100 SFT pairs is sufficient to demonstrate the
pipeline mechanically, but a 1.5B parameter model has enough capacity to
meaningfully benefit from more examples without overfitting. Scaling to
175 pairs allowed room for:
- Multi-turn conversation examples (2-3 turn exchanges in a single training
  pair) — not required by the assignment, but demonstrates the model
  handling follow-up context.
- Explicit out-of-domain refusal examples, so the model learns to decline
  questions outside placement prep rather than answering everything
  confidently regardless of relevance.
- Wider company coverage (Amazon, Google, Microsoft, TCS, Infosys, Wipro,
  Accenture) rather than concentrating on 2-3 companies.

## 4. Why 77 DPO Pairs With Varied Rejection Types Instead of Uniform Rejections

The preference dataset intentionally varies *why* each rejected response is
bad, rather than using one failure mode repeatedly:

| Rejection Type | Approx. Count | Purpose |
|---|---|---|
| Factually wrong | ~20 | Teaches correctness preference |
| Too generic | ~20 | Teaches specificity preference |
| Incomplete | ~15 | Teaches completeness preference |
| Unsafe (e.g. encourages resume dishonesty) | ~15 | Teaches safety preference |
| Off-domain | ~10 | Teaches scope preference |

A dataset where every rejected answer fails the same way (e.g. always just
"shorter and less detailed") only teaches the model to avoid one narrow
behavior. Varying the failure mode teaches genuine preference discrimination
across multiple axes of answer quality simultaneously.

## 5. What We Would Try With More Compute/Time

- A 7B-parameter base model, which would likely reduce hallucination on
  precise numerical facts (CGPA cutoffs, round counts) given the same
  training data, since larger models generalize better from limited examples.
- A larger SFT dataset (500+ pairs) specifically targeting edge-case phrasing
  (typos, casual language, compound multi-topic questions) — the current
  175-pair dataset performs reliably on direct single-topic questions but
  can produce logically disjointed answers on unscripted, compound phrasing.
- RAG (Retrieval-Augmented Generation) layered on top of the fine-tuned
  model, grounding company-specific facts in a retrievable document store
  rather than relying purely on parametric memory from fine-tuning.