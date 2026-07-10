# Fine-Tuning Explanation Report

**Domain:** College Placement & Interview Prep Assistant
**Base Model:** Qwen2.5-1.5B-Instruct
**Pipeline:** Non-Instruction FT → Instruction FT (SFT) → DPO Preference Alignment

---

## 1. Why Full Fine-Tuning Is Expensive

Full fine-tuning updates every single parameter in the model. Qwen2.5-1.5B has 1.5 billion
parameters. Even in FP16 (2 bytes per parameter), just storing the weights takes 3GB. During
training, the Adam optimizer needs to store two additional states per parameter (momentum and
variance), roughly doubling memory to 6GB+. Add gradients (another 3GB) and activation memory
for backpropagation, and full fine-tuning easily needs 20-30GB of VRAM — more than a free Colab
T4's 16GB can provide. This is why full fine-tuning is out of reach for students without
dedicated GPU infrastructure or significant cloud spend.

## 2. What LoRA Does

LoRA (Low-Rank Adaptation) freezes all of the original model's weights and instead injects small,
trainable low-rank matrices alongside specific layers (attention projections and feed-forward
layers). Mathematically, instead of updating a full weight matrix W (size m×n), LoRA learns two
much smaller matrices B (m×r) and A (r×n), where r (the rank) is far smaller than m or n. The
model's effective weight becomes W + BA. Since r is small (32 in this project), the number of
trainable parameters drops from 1.5 billion to roughly 1% of that — around 15-20 million
parameters — while the frozen base model still provides all its pretrained knowledge.

## 3. What QLoRA Does

QLoRA extends LoRA by quantizing the frozen base model weights down to 4-bit precision (NF4
format) before applying LoRA adapters on top. The base weights, which never receive gradients,
don't need full precision — they only need to be accurate enough to produce useful activations.
The LoRA adapter matrices themselves stay in FP16/BF16 for stable gradient updates. This
combination reduces the base model's memory footprint by roughly 4x compared to FP16, while
keeping training quality nearly identical to full-precision LoRA.

## 4. Why QLoRA Is Useful on Limited GPU

On a free Colab T4 with 16GB VRAM, a 1.5B parameter model in FP16 already uses ~3GB just for
weights. Add optimizer states, gradients, and activation memory for a batch of sequences at
1024 tokens, and a full or even standard LoRA fine-tuning run can approach the VRAM ceiling.
QLoRA's 4-bit quantization of the base model frees up several GB of headroom, which is exactly
what allowed this project to train a 1.5B model through three sequential fine-tuning stages
(non-instruction FT, SFT, DPO) entirely on the free tier, without ever hitting an out-of-memory
error.

## 5. What Is Non-Instruction Fine-Tuning?

Non-instruction fine-tuning trains the model on raw, unstructured domain text — in this project,
80 paragraphs describing placement round structures, DSA priorities, resume writing, and
interview frameworks. There is no question-answer structure here; the model is simply doing
next-token prediction on domain text, the same objective used in the model's original
pretraining. The goal is narrow: shift the model's internal representations toward
placement-specific vocabulary and writing style (terms like "bar-raiser," "NQT," "PPO," "CGPA
cutoff") before it ever sees a single training question. This stage does not teach the model to
answer questions — that is Stage 2's job — it only prepares the vocabulary foundation Stage 2
builds on.

## 6. What Is Instruction Fine-Tuning (SFT)?

Instruction fine-tuning (Supervised Fine-Tuning) trains the model on structured
instruction-response pairs — 175 examples in this project, each formatted as a question followed
by its ideal answer. Unlike Stage 1, this stage explicitly teaches the model the input-output
mapping it needs: given a user's placement-related question, generate a specific, accurate,
well-structured answer. This is where the single largest visible quality improvement in the
entire pipeline occurs, because the model transitions from "completing text" to "answering
questions" for the first time.

## 7. What Is DPO?

DPO (Direct Preference Optimization) is a preference alignment technique that trains a model
using pairs of responses to the same prompt: one "chosen" (preferred) response and one "rejected"
(dispreferred) response. Rather than teaching the model new facts, DPO teaches it a preference
signal — increasing the probability it assigns to chosen-style responses relative to
rejected-style responses. In this project, 77 preference pairs were used, with rejected responses
spanning five distinct failure modes (factually wrong, too generic, incomplete, unsafe, and
off-domain), so the model learns to discriminate against several different kinds of bad answers
rather than just one narrow failure pattern.

## 8. Difference Between SFT and DPO

SFT teaches the model *what to say*: it maximizes the likelihood of producing a specific correct
answer for a given question. DPO teaches the model *what not to say*: it maximizes the relative
probability gap between a good response and a bad one, without requiring the "correct" answer to
be the only acceptable one. SFT is analogous to a student memorizing model answers; DPO is
analogous to a student learning to recognize why one answer is better than another. In practice,
SFT establishes baseline competence, and DPO refines tone, safety, and consistency on top of that
competence.

## 9. Hyperparameter Values Used

| Parameter | Value | Reason |
|---|---|---|
| **Rank (r)** | 32 | Above the assignment minimum; gives sufficient adapter capacity for 175 SFT examples without the overfitting risk of a higher rank like 64 on a dataset this size. |
| **Alpha** | 64 | Follows the standard alpha = 2×r ratio, which scales the LoRA update to match the magnitude of the original frozen weights. |
| **Dropout** | 0.05 | Light regularization to reduce overfitting risk on a relatively small (175-pair) instruction dataset. |
| **Learning rate (Stage 1 & 2)** | 2e-4 | Unsloth's well-tested default for LoRA fine-tuning; aggressive enough for meaningful domain and instruction learning within 3 epochs. |
| **Learning rate (Stage 3, DPO)** | 5e-5 | Deliberately much lower than SFT stages — DPO's ratio-based loss is highly sensitive to learning rate, and a higher LR risks "reward collapse," where the model becomes repetitive and overconfident. |
| **Batch size (per device)** | 2 | Fits comfortably within T4's 16GB VRAM alongside 4-bit quantized weights and gradient checkpointing. |
| **Gradient accumulation steps** | 4 | Combined with batch size 2, gives an effective batch size of 8 — stabilizes gradient estimates without exceeding available VRAM. |
| **DPO beta** | 0.1 | Standard value from the original DPO paper; controls how strongly the model is pushed away from rejected responses without over-correcting. |
| **Epochs (Stage 1)** | 3 | Ensures the model sees all 80 domain paragraphs multiple times for a meaningful vocabulary shift. |
| **Epochs (Stage 2)** | 3 | Standard for SFT on a dataset of this size — enough repetition to learn the Q&A format reliably. |
| **Epochs (Stage 3, DPO)** | 1 | DPO is intentionally trained for only one pass; additional epochs on preference data are known to degrade output diversity and quality. |