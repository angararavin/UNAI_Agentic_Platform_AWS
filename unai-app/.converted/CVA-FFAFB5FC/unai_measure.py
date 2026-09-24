# Generated measurement harness -- best-effort, generalizes this project's
# existing measure_real_tokens.py pattern instead of guessing SDK import paths
# (which breaks across e.g. langchain_ollama vs langchain_community, or SDK
# version bumps): run each source file with runpy.run_path(), find whatever
# LLM-client-shaped OBJECT it actually instantiated (by class-name heuristic +
# an invoke/generate/create method -- no hardcoded package names), patch that
# exact class, then call the file's own capability functions in order (seeded
# from its own TEST_CASES[0] convention when present, like the real
# measure_real_tokens.py does) and sum REAL usage. Never fabricates a number --
# anything that can't be patched/invoked just reports zero for that file, and
# unai-server.cjs falls back to the modeled comparison instead.
import json, os, runpy

TOKENS_IN = 0
TOKENS_OUT = 0
CALLS = 0

def _record(inp, outp):
    global TOKENS_IN, TOKENS_OUT, CALLS
    TOKENS_IN += inp or 0
    TOKENS_OUT += outp or 0
    CALLS += 1

def _extract_usage(resp):
    um = getattr(resp, "usage_metadata", None)
    if isinstance(um, dict) and um:
        return um.get("input_tokens", 0) or 0, um.get("output_tokens", 0) or 0
    u = getattr(resp, "usage", None)
    if u is not None:
        inp = getattr(u, "prompt_tokens", None); inp = getattr(u, "input_tokens", 0) if inp is None else inp
        outp = getattr(u, "completion_tokens", None); outp = getattr(u, "output_tokens", 0) if outp is None else outp
        return inp or 0, outp or 0
    return 0, 0

def _find_llm_objects(ns):
    found = []
    for val in ns.values():
        cls = type(val)
        name = cls.__name__
        if any(k in name for k in ("Chat", "LLM", "Client", "Model")) and any(hasattr(cls, m) for m in ("invoke", "generate", "create")):
            found.append(val)
    return found

def _patch_and_run(script_path, symbols):
    try:
        ns = runpy.run_path(script_path)
    except Exception:
        return  # best-effort -- this file's own imports/env may not be satisfiable here
    patched = []
    for llm in _find_llm_objects(ns):
        cls = type(llm)
        for meth_name in ("invoke", "generate", "create"):
            if not hasattr(cls, meth_name):
                continue
            orig = getattr(cls, meth_name)
            def wrapped(self, *a, __orig=orig, **kw):
                r = __orig(self, *a, **kw)
                inp, outp = _extract_usage(r)
                if inp or outp: _record(inp, outp)
                return r
            setattr(cls, meth_name, wrapped)
            patched.append((cls, meth_name, orig))
            break   # one patched method per discovered object is enough
    try:
        seed = None
        if isinstance(ns.get("TEST_CASES"), (list, tuple)) and ns["TEST_CASES"]:
            try: seed = dict(ns["TEST_CASES"][0])
            except Exception: seed = None
        state = dict(seed) if seed else {}
        for sym in symbols:
            fn = ns.get(sym)
            if not callable(fn):
                continue
            try:
                if state:
                    result = fn(state)
                    if isinstance(result, dict): state.update(result)
                else:
                    fn()
            except Exception:
                pass  # best-effort -- this function may need different args/state than we guessed
    finally:
        for cls, meth_name, orig in patched:
            setattr(cls, meth_name, orig)

TARGETS = {"Agent 1/agent.py":["__init__","_load_csv","_build_graph","_node_ingest"],"Agent 1/tools.py":["compute_supplier_stats","calculate_downstream_exposure"],"Agent 2/agent.py":["fetch_inventory_state","reconcile_usable_stock","evaluate_demand_coverage","formulate_disposition"],"Agent 2/tools.py":["calculate_usable_stock","map_inventory_action"],"Agent 4/agent.py":["fetch_po_context","compute_aging_metrics","diagnose_root_cause"]}
BASE = os.path.dirname(os.path.abspath(__file__))
for rel, symbols in TARGETS.items():
    _patch_and_run(os.path.join(BASE, rel), symbols)

with open(os.path.join(BASE, "unai_measure_report.json"), "w") as f:
    json.dump({"tokensIn": TOKENS_IN, "tokensOut": TOKENS_OUT, "calls": CALLS}, f)
