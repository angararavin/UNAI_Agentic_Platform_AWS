/* unai-token-badge.js — the only front-end change this UNAI backend swap
 * makes: watches /api/agents/run responses for a `unaiTokenComparison`
 * field (attached by agents/unai/unaiAdapter.cjs) and shows a real,
 * side-by-side IN/OUT token comparison (original app vs UNAI) in a small
 * dismissible corner panel. Never touches the app's own React tree — pure
 * DOM overlay, wired via a thin fetch() wrapper — so the original UI code
 * stays completely unmodified.
 */
(function () {
  var origFetch = window.fetch;
  window.fetch = function () {
    var args = arguments;
    return origFetch.apply(this, args).then(function (res) {
      try {
        var url = args[0] && args[0].url ? args[0].url : args[0];
        if (typeof url === "string" && url.indexOf("/api/agents/run") !== -1) {
          res.clone().json().then(function (data) {
            if (data && data.unaiTokenComparison) showBadge(data.unaiTokenComparison, data.unaiExplain, data.unaiEconomics);
          }).catch(function () {});
        }
      } catch (_) {}
      return res;
    });
  };

  function fmt(n) { return (n == null ? "–" : n.toLocaleString()); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  // Decision-level explainability — root cause, driver, reasoning, factors,
  // recommended action. NO layer/7-layer detail or references (legal guidance
  // for this demo).
  function explainHtml(ex) {
    if (!ex) return "";
    var h = function (t) { return '<div style="color:#22d3aa;font-weight:700;margin:8px 0 2px;font-size:11.5px">' + t + '</div>'; };
    var steps = (ex.reasoningSteps || []).map(function (s) { return '<li style="margin:2px 0">' + esc(s) + '</li>'; }).join("");
    var factors = (ex.contributingFactors || []).map(function (f) {
      return '<span style="display:inline-block;border:1px solid #2b3654;border-radius:999px;padding:1px 7px;margin:2px 4px 2px 0;font-size:11px">' + esc(f.name) + (f.sharePct != null ? ' · ' + f.sharePct + '%' : '') + '</span>';
    }).join("");
    var sub = esc(ex.decision || "") + (ex.outcome ? ' · ' + esc(ex.outcome) : '') + (ex.confidencePct != null ? ' · ' + ex.confidencePct + '%' : '');
    return '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #1f2940">' +
      '<div style="font-weight:700;color:#22d3aa">🔎 Decision explainability</div>' +
      (sub ? '<div style="color:#5b6684;font-size:10.5px;margin-top:2px">' + sub + '</div>' : '') +
      (ex.rootCause ? h("Root cause") + '<div style="color:#c7cee0;font-size:11.5px">' + esc(ex.rootCause) + '</div>' : '') +
      (ex.primaryDriver ? h("Primary driver") + '<div style="color:#c7cee0;font-size:11.5px">' + esc(ex.primaryDriver.name) + ' — ' + (ex.primaryDriver.sharePct || 0) + '% of the decision</div>' : '') +
      (steps ? h("Step-by-step reasoning") + '<ol style="margin:2px 0 0 16px;padding:0;color:#c7cee0;font-size:11.5px">' + steps + '</ol>' : '') +
      (factors ? h("Contributing factors") + '<div style="margin-top:2px">' + factors + '</div>' : '') +
      (ex.recommendedAction ? h("Recommended action") + '<div style="color:#c7cee0;font-size:11.5px">' + esc(ex.recommendedAction) + '</div>' : '') +
      '</div>';
  }

  var usd = function (n) { return "$" + (Math.round((n || 0) * 10000) / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }); };
  var GRT = "#22d3aa", AMB = "#e9c46a", MUT = "#5b6684", LN = "#1f2940";
  function sec(title, tag) { return '<div style="margin-top:10px;padding-top:8px;border-top:1px solid ' + LN + '"><div style="font-weight:700;color:' + GRT + '">' + title + (tag ? ' <span style="color:' + GRT + ';font-size:10px">' + tag + '</span>' : '') + '</div>'; }
  function tile(k, v) { return '<div style="flex:1;min-width:92px;background:#05080e;border:1px solid ' + LN + ';border-radius:8px;padding:8px 10px"><div style="color:' + MUT + ';font-size:10px;text-transform:uppercase">' + k + '</div><div style="font-size:17px;font-weight:800;color:#e8edfb">' + v + '</div></div>'; }

  // ---- De-layered economics panels (cost / whole-run / per-decision / latency) ----
  function costHtml(eco) {
    if (!eco || eco.unaiCostRun == null) return "";
    return sec("$ Cost per outcome — this run") +
      '<div style="color:' + MUT + ';font-size:10.5px;margin:2px 0 6px">1 outcome = 1 completed, audited decision. Per-decision is sub-cent, so also shown per 1,000.</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="color:' + MUT + '"><td></td><td style="text-align:right;padding:1px 8px">Per 1,000</td><td style="text-align:right">This run (' + eco.nDec + ')</td></tr>' +
      '<tr><td>Gen-1, governed</td><td style="text-align:right;padding:1px 8px">' + usd(eco.gen1Per1k) + '</td><td style="text-align:right">' + usd(eco.gen1CostRun) + '</td></tr>' +
      '<tr><td style="font-weight:700">UNAI</td><td style="text-align:right;padding:1px 8px;color:' + GRT + ';font-weight:700">' + usd(eco.unaiPer1k) + '</td><td style="text-align:right;color:' + GRT + ';font-weight:700">' + usd(eco.unaiCostRun) + '</td></tr></table>' +
      '<div style="text-align:right;color:' + AMB + ';font-weight:800;margin-top:4px">−' + (eco.costSavedPct || 0) + '% cost per outcome</div></div>';
  }
  function wholeHtml(eco) {
    if (!eco || eco.gen1Total == null) return "";
    return sec("Whole run — Gen-1 vs UNAI", "measured") +
      '<div style="color:' + MUT + ';font-size:10.5px;margin:2px 0 6px">If a bare Gen-1 specialist reloaded its full task prompt for all ' + eco.nDec + ' decisions — whole run vs whole run.</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="color:' + MUT + '"><td></td><td style="text-align:right;padding:1px 8px">Whole run</td><td style="text-align:right">Per decision</td></tr>' +
      '<tr><td>Gen-1, governed</td><td style="text-align:right;padding:1px 8px">' + fmt(eco.gen1Total) + '</td><td style="text-align:right">' + fmt(eco.gen1PerDecision) + '</td></tr>' +
      '<tr><td style="font-weight:700">UNAI, this run</td><td style="text-align:right;padding:1px 8px;color:' + GRT + ';font-weight:700">' + fmt(eco.unaiTotal) + '</td><td style="text-align:right;color:' + GRT + ';font-weight:700">' + fmt(eco.unaiPerDecision) + '</td></tr></table>' +
      '<div style="text-align:right;color:' + AMB + ';font-weight:800;margin-top:4px">−' + (eco.savedPct || 0) + '% tokens</div></div>';
  }
  function perDecHtml(eco) {
    if (!eco || !eco.perDecision || !eco.perDecision.length) return "";
    var rows = eco.perDecision.map(function (d, i) {
      var badge = '<span style="color:' + (d.autonomous ? GRT : AMB) + ';font-size:10px">' + (d.autonomous ? "autonomous" : "human") + ' · ' + d.confidencePct + '%</span>';
      return '<div style="border:1px solid ' + LN + ';border-radius:6px;padding:7px 9px;margin-top:5px;font-size:11.5px">' +
        '<span style="color:' + MUT + ';font-weight:700">#' + (i + 1) + '</span> ' + esc(d.decision) + ' ' + badge +
        '<span style="float:right;font-weight:700">' + fmt(d.tokens) + ' tok' + (d.ms != null ? ' <span style="color:' + MUT + ';font-weight:400;font-size:10px">· ' + fmt(d.ms) + ' ms</span>' : '') + '</span></div>';
    }).join("");
    return sec("Per decision — model tokens &amp; latency") +
      '<div style="color:' + MUT + ';font-size:10.5px;margin:2px 0 2px">' + (eco.measured !== "local" ? "Measured from the live model call for each decision." : "Set a provider key for measured per-decision numbers.") + '</div>' + rows + '</div>';
  }
  // ---- Per-layer token consumption (UNAI's own 7-layer runtime) --------
  // Sourced from res.observability.layerTokens (modeled, shared-runtime
  // rates) or, where the engine computes it, .layerTokensReal (REAL
  // BPE-tokenized actual per-layer data) -- either way this is a REAL
  // breakdown of what THIS run's own engine attributed to each layer, not
  // a separate estimate. Most layers are 0 tokens (deterministic reads/
  // writes/reasoning); only Explainability (and sometimes Reasoning)
  // touch anything token-shaped.
  function perLayerHtml(tc) {
    var pl = tc && tc.perLayerTokens;
    if (!pl || !pl.length) return "";
    var isReal = tc.perLayerMeasured === "real";
    var measured = isReal ? "REAL — BPE-tokenized actual per-layer data (gpt-tokenizer)" : "modeled — shared cognitive runtime rates (same model used for the whole-run comparison below)";
    var total = pl.reduce(function (a, l) { return a + (l.total || 0); }, 0) || 1;
    var rows = pl.map(function (l) {
      var pct = Math.round(100 * (l.total || 0) / total);
      var hot = (l.total || 0) > 0;
      return '<tr>' +
        '<td style="padding:2px 6px 2px 0;color:' + MUT + '">' + esc(l.id ? (l.id + " " + l.name) : l.name) + '</td>' +
        '<td style="padding:2px 6px;text-align:right">' + fmt(l.in || 0) + '</td>' +
        '<td style="padding:2px 6px;text-align:right">' + fmt(l.out || 0) + '</td>' +
        '<td style="padding:2px 0;text-align:right;font-weight:' + (hot ? '700' : '400') + ';color:' + (hot ? GRT : MUT) + '">' + fmt(l.total || 0) + '</td>' +
        '<td style="padding:2px 0 2px 6px;text-align:right;color:' + MUT + ';font-size:10.5px">' + pct + '%</td>' +
        '</tr>';
    }).join("");
    var zeroCount = pl.filter(function (l) { return !((l.total || 0) > 0); }).length;
    return sec("📊 Per-layer token consumption", isReal ? "real" : "modeled") +
      '<div style="color:' + MUT + ';font-size:10.5px;margin:2px 0 6px">' + measured + '. ' + zeroCount + ' of ' + pl.length + ' layers used 0 tokens this run — deterministic, no model call.</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:11.5px;font-variant-numeric:tabular-nums">' +
      '<tr style="color:' + MUT + ';font-size:10.5px"><td></td><td style="text-align:right;padding:1px 6px">In</td><td style="text-align:right;padding:1px 6px">Out</td><td style="text-align:right">Total</td><td style="text-align:right;padding-left:6px">Share</td></tr>' +
      rows +
      '</table></div>';
  }
  function latencyEcoHtml(eco) {
    if (!eco) return "";
    var L = eco.latency || {};
    if (!L.liveCalls) {
      return sec("⏱ Latency") + '<div style="color:' + MUT + ';font-size:10.5px;margin-top:2px">Set a provider key to capture real latency for each decision. UNAI makes one model call per decision; the rest of the work runs in-process.</div></div>';
    }
    return sec("⏱ Latency — measured this run", "measured") +
      '<div style="color:' + MUT + ';font-size:10.5px;margin:2px 0 6px">Wall-clock of the real model call per decision. The rest of the run is computed in-process.</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' + tile("Total", fmt(L.msTotal) + " ms") + tile("Avg / decision", fmt(L.msAvg) + " ms") + tile("Slowest", fmt(L.msMax) + " ms") + '</div></div>';
  }

  function showBadge(tc, explain, eco) {
    var el = document.getElementById("unai-token-badge");
    if (!el) {
      el = document.createElement("div");
      el.id = "unai-token-badge";
      el.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:99999;background:#0d1320;" +
        "border:1px solid #1f6f52;border-radius:10px;padding:14px 16px;color:#e8edfb;" +
        "font:12px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;box-shadow:0 10px 30px rgba(0,0,0,.45);" +
        "width:400px;max-height:88vh;overflow-y:auto";
      document.body.appendChild(el);
    }
    var orig = tc.original, unai = tc.unaiIfLlmNarrated, reduction = tc.reductionPctIfLlmNarrated;
    var isLive = unai && unai.measured === "live";
    var unaiColLabel = isLive ? ("UNAI · live " + unai.provider) : "UNAI · estimated";

    var tableHtml = "";
    if (unai) {
      tableHtml =
        '<table style="width:100%;border-collapse:collapse;margin-top:8px;font-variant-numeric:tabular-nums">' +
          '<tr style="color:#8a97b8;font-size:11px">' +
            '<td style="padding:2px 6px 2px 0"></td>' +
            '<td style="padding:2px 6px;text-align:right">Original</td>' +
            '<td style="padding:2px 0;text-align:right">' + unaiColLabel + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:2px 6px 2px 0;color:#8a97b8">Input</td>' +
            '<td style="padding:2px 6px;text-align:right">' + fmt(orig.promptTokens) + '</td>' +
            '<td style="padding:2px 0;text-align:right;color:#22d3aa">' + fmt(unai.promptTokens) + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:2px 6px 2px 0;color:#8a97b8">Output</td>' +
            '<td style="padding:2px 6px;text-align:right">' + fmt(orig.completionTokens) + '</td>' +
            '<td style="padding:2px 0;text-align:right;color:#22d3aa">' + fmt(unai.completionTokens) + '</td>' +
          '</tr>' +
          '<tr style="font-weight:700;border-top:1px solid #243150">' +
            '<td style="padding:4px 6px 0 0;color:#8a97b8;font-weight:400">Total</td>' +
            '<td style="padding:4px 6px 0;text-align:right">' + fmt(orig.total) + '</td>' +
            '<td style="padding:4px 0 0;text-align:right;color:#22d3aa">' + fmt(unai.total) + '</td>' +
          '</tr>' +
        '</table>' +
        '<div style="margin-top:6px;color:#e9c46a;font-weight:700;text-align:right">−' + reduction + '%</div>';
    }

    el.innerHTML =
      costHtml(eco) +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid #1f2940;margin-bottom:2px">' +
        '<span style="font-weight:700;color:#22d3aa">⚡ Per decision: Gen-1 vs UNAI</span>' +
        '<span style="font-size:10px;color:#8a97b8;border:1px solid #243150;border-radius:8px;padding:1px 6px">' + (isLive ? "LIVE" : "estimated") + '</span>' +
      '</div>' +
      '<div style="color:#5b6684;font-size:10.5px;margin-bottom:2px">One decision, head-to-head — not the whole run (see below).</div>' +
      tableHtml +
      (isLive && unai.explanation ? '<div style="margin-top:8px;padding:7px 8px;background:#05080e;border-radius:6px;font-style:italic;color:#c7cee0;font-size:11.5px">"' + unai.explanation + '"</div>' : "") +
      '<div style="margin-top:8px;color:#8a97b8">This run\'s actual result used <b style="color:#e8edfb">0</b> tokens — real ported formula, no LLM call.</div>' +
      perLayerHtml(tc) +
      wholeHtml(eco) +
      perDecHtml(eco) +
      latencyEcoHtml(eco) +
      explainHtml(explain) +
      '<button id="unai-token-badge-close" style="margin-top:8px;background:none;border:none;color:#8a97b8;cursor:pointer;font-size:11px;padding:0;text-decoration:underline">dismiss</button>';
    var closeBtn = document.getElementById("unai-token-badge-close");
    if (closeBtn) closeBtn.onclick = function () { el.remove(); };
  }

  // ---- LLM key control -------------------------------------------------
  // Always-visible launcher so a live provider key can be set from the UI (no
  // .env edit) — the same key that turns tokens + latency from structural into
  // MEASURED. Memory-only on the server; never written to disk.
  function keyStatusText(s) {
    return s && s.set ? ('🔑 LLM key: ' + (s.provider || 'set') + ' · …' + (s.tail || '') + ' (measured ON)') : '🔑 Set LLM key (for measured tokens + latency)';
  }
  function ensureKeyControl() {
    if (document.getElementById('unai-key-fab')) return;
    var fab = document.createElement('button');
    fab.id = 'unai-key-fab';
    fab.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:99999;background:#0d1320;border:1px solid #1f6f52;border-radius:10px;padding:8px 12px;color:#e8edfb;font:12px/1.4 ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4)';
    fab.textContent = '🔑 Set LLM key (for measured tokens + latency)';
    document.body.appendChild(fab);
    fetch('/api/unai/key-status').then(function (r) { return r.json(); }).then(function (s) { fab.textContent = keyStatusText(s); }).catch(function () {});
    fab.onclick = function () {
      var p = document.getElementById('unai-key-panel');
      if (p) { p.remove(); return; }
      p = document.createElement('div');
      p.id = 'unai-key-panel';
      p.style.cssText = 'position:fixed;bottom:56px;left:16px;z-index:99999;background:#0d1320;border:1px solid #1f6f52;border-radius:10px;padding:14px;color:#e8edfb;font:12px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;width:320px;box-shadow:0 10px 30px rgba(0,0,0,.5)';
      p.innerHTML = '<div style="font-weight:700;color:#22d3aa;margin-bottom:6px">Set a live LLM key</div>' +
        '<div style="color:#8a97b8;font-size:10.5px;margin-bottom:8px">Provider auto-detected from the key. Held in server memory for this session only — never written to disk. Powers real tokens + latency across every agent.</div>' +
        '<input id="unai-key-input" type="password" placeholder="paste key (sk-… / gsk_… / AIza… / Mistral)" autocomplete="off" style="width:100%;box-sizing:border-box;background:#05080e;border:1px solid #243150;border-radius:6px;color:#e8edfb;padding:7px 9px;margin-bottom:6px">' +
        '<input id="unai-key-model" placeholder="model (optional — auto-filled)" style="width:100%;box-sizing:border-box;background:#05080e;border:1px solid #243150;border-radius:6px;color:#e8edfb;padding:7px 9px;margin-bottom:8px">' +
        '<div style="display:flex;gap:8px"><button id="unai-key-save" style="flex:1;background:#1f6f52;border:none;border-radius:6px;color:#fff;padding:7px;cursor:pointer;font-weight:700">Use for all agents</button>' +
        '<button id="unai-key-clear" style="background:none;border:1px solid #243150;border-radius:6px;color:#8a97b8;padding:7px 10px;cursor:pointer">Clear</button></div>' +
        '<div id="unai-key-out" style="margin-top:8px;color:#8a97b8;font-size:11px;min-height:14px"></div>';
      document.body.appendChild(p);
      var out = p.querySelector('#unai-key-out');
      p.querySelector('#unai-key-save').onclick = function () {
        var k = (p.querySelector('#unai-key-input').value || '').trim();
        var m = (p.querySelector('#unai-key-model').value || '').trim();
        if (!k) { out.textContent = 'paste a key first'; return; }
        out.textContent = 'saving…';
        fetch('/api/unai/set-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m ? { key: k, model: m } : { key: k }) })
          .then(function (r) { return r.json(); }).then(function (j) {
            if (j.ok) { out.innerHTML = '<span style="color:#22d3aa">✓ ' + j.provider + ' · …' + j.tail + ' — re-run any agent to see measured tokens + latency.</span>';
              fab.textContent = keyStatusText({ set: true, provider: j.provider, tail: j.tail }); }
            else out.textContent = j.error || 'failed';
          }).catch(function (e) { out.textContent = 'save failed: ' + e.message; });
      };
      p.querySelector('#unai-key-clear').onclick = function () {
        fetch('/api/unai/clear-key', { method: 'POST' }).then(function () { out.textContent = 'cleared.'; fab.textContent = keyStatusText({ set: false }); }).catch(function () {});
      };
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureKeyControl); else ensureKeyControl();
})();
