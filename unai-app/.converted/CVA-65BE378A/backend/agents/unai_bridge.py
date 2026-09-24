"""unai_bridge.py -- calls into the UNAI shared cognitive engine (a Node/JS
runtime, see agents/unai/bridge.cjs) from this Python app, one subprocess
call per decision. Each of the 5 agent_NN_*.py workflows uses this in its
node_llm_reasoning step in place of LLMFactory.generate_completion, so the
actual reasoning is computed by UNAI's real capability functions instead of
a configurable external LLM -- and a real per-run token comparison (what
this agent's actual bespoke LLM call would have cost vs. UNAI's side) is
returned alongside it.

Never raises past the caller in normal operation: any subprocess/parse
failure is surfaced as a RuntimeError, and every call site in the agent
files catches it and falls back to the same deterministic reasoning text
the original app already used when its own LLM was offline.
"""
import json
import os
import subprocess
from typing import Any, Dict, List, Optional, Tuple

_APP_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_BRIDGE_PATH = os.path.join(_APP_ROOT, "agents", "unai", "bridge.cjs")


def run_unai(
    capability: str,
    systems: List[str],
    agent_id: str,
    system_instruction: str,
    prompt: str,
    completion_text: str,
    timeout_s: int = 20,
) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
    """Runs one real UNAI capability + real token comparison. Returns
    (evidence, tokenComparison). Raises RuntimeError on any failure -- catch
    this at the call site and fall back to the original deterministic text."""
    payload = json.dumps({
        "capability": capability,
        "systems": systems,
        "agentId": agent_id,
        "systemInstruction": system_instruction,
        "prompt": prompt,
        "completionText": completion_text,
    })
    try:
        proc = subprocess.run(
            ["node", _BRIDGE_PATH],
            input=payload,
            capture_output=True,
            text=True,
            encoding="utf-8",  # engine.js's evidence text uses curly quotes
            # (e.g. "top driver") -- Windows' default cp1252 stdout decoding
            # crashed on those bytes without this.
            timeout=timeout_s,
            cwd=_APP_ROOT,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
        raise RuntimeError(f"UNAI bridge could not run: {e}")

    if not proc.stdout.strip():
        raise RuntimeError(f"UNAI bridge produced no output (stderr: {proc.stderr[:300]})")
    try:
        result = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"UNAI bridge returned non-JSON output: {e} ({proc.stdout[:200]})")
    if not result.get("ok"):
        raise RuntimeError(f"UNAI bridge error: {result.get('error')}")
    return result["evidence"], result.get("tokenComparison")
