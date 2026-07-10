"""
Placement & Interview Prep Assistant — Gradio Space
Serves the GGUF-quantized final model via llama-cpp-python.
"""

import os
import gradio as gr
from huggingface_hub import hf_hub_download
from llama_cpp import Llama

# ── Config ──────────────────────────────────────────────────────────
GGUF_REPO = "Gourabswain/placement-assistant-gguf"

# Pick ONE quant to serve. Q4_K_M is small + fast, good default for CPU Basic.
GGUF_FILENAME = "final_merged_model.Q4_K_M.gguf"

SYSTEM_PROMPT = (
    "You are a helpful, professional college placement and interview "
    "preparation assistant. Give specific, accurate, safe advice."
)

MAX_NEW_TOKENS = 400
CONTEXT_LENGTH = 4096

# ── Download + load model (runs once at Space startup) ───────────────
print(f"Downloading {GGUF_FILENAME} from {GGUF_REPO} ...", flush=True)
model_path = hf_hub_download(repo_id=GGUF_REPO, filename=GGUF_FILENAME)

print("Download complete. Loading model into llama.cpp ...", flush=True)
llm = Llama(
    model_path=model_path,
    n_ctx=CONTEXT_LENGTH,
    n_threads=os.cpu_count(),  # use all available CPU cores on the Space
    verbose=False,
)
print("Model loaded. Ready for requests.", flush=True)


# ── Chat function ──────────────────────────────────────────────────
def respond(message, history):
    """
    Builds a Qwen-style chat prompt from the running history and streams
    the model's response token by token.

    Handles BOTH Gradio history formats defensively:
    - Newer Gradio ("messages" type): history is a flat list of
      {"role": ..., "content": ...} dicts
    - Older Gradio ("tuples" type, the default when `type=` isn't
      supported by the installed version): history is a list of
      (user_msg, assistant_msg) pairs

    This avoids depending on a specific Gradio version being installed
    on the Space, since requirements.txt doesn't pin one.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for item in history:
        if isinstance(item, dict):
            # Newer format — already a proper role/content dict
            messages.append(item)
        else:
            # Older format — (user_msg, assistant_msg) tuple
            user_msg, assistant_msg = item
            messages.append({"role": "user", "content": user_msg})
            if assistant_msg:
                messages.append({"role": "assistant", "content": assistant_msg})

    messages.append({"role": "user", "content": message})

    stream = llm.create_chat_completion(
        messages=messages,
        max_tokens=MAX_NEW_TOKENS,
        temperature=0.7,
        top_p=0.9,
        stream=True,
    )

    partial = ""
    for chunk in stream:
        delta = chunk["choices"][0]["delta"].get("content", "")
        if delta:
            partial += delta
            yield partial


# ── UI ────────────────────────────────────────────────────────────
# NOTE: no `type=` kwarg here — the installed Gradio version on this
# Space doesn't support it. respond() above handles both formats
# defensively instead, so this works regardless of Gradio version.
demo = gr.ChatInterface(
    fn=respond,
    title="🎓 Placement & Interview Prep Assistant",
    description=(
        "Fine-tuned Qwen2.5-1.5B (Stage 1 domain FT → Stage 2 SFT → Stage 3 DPO), "
        "served here as a Q4_K_M GGUF via llama.cpp."
    ),
    examples=[
        "How should I prepare for Amazon SDE-1 placement?",
        "I have a 6.5 CGPA. Can I still get into good companies?",
        "What is the TCS NQT exam pattern?",
    ],
    cache_examples=False,   # prevents llama.cpp segfault during example pre-caching
)

if __name__ == "__main__":
    demo.queue().launch()