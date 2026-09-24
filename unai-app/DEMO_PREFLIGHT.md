# UNAI Demo Pre-Flight

A 5-minute runbook to run **before every CIO / customer demo** so a stale label,
a truncated spec, or a dead model never surfaces live. Two automated guards plus
a short manual pass.

> Why this exists: the failures that embarrass a demo are not crashes — they are
> *plausible-looking wrong output*. A claim hardcoded to always fire, a spec that
> truncated mid-table, a model id the provider quietly retired. The two scripts
> below catch the first class statically and the second class at runtime.

---

## 1. Static scan — stale claims, template leaks, dead models (30 sec)

Run from the app folder. No server needed.

```
node demo_scan.js
```

**Green light = 0 HIGH findings.** HIGH means one of:

- `DEPRECATED_MODEL` — a shut-down model id used as a *default* (will 404 live).
- `TEMPLATE_LEAK` — placeholder / TODO / "template preview" text that can render.
- `HARDCODED_CLAIM` — a comparative verdict ("cheaper", "100% lower", "guaranteed")
  baked into a static string, so it fires regardless of the real numbers. *This is
  the exact class as the "UNAI is not cheaper here" bug.*

MEDIUM/LOW are advisory (nested `.toLocaleString()` without a guard, rate-card
reference prices, contradiction pairs to eyeball). Exit code: `2` if any HIGH,
`1` if only MEDIUM, `0` if clean. Use `--json` for CI.

If it flags something you've reviewed and accept, fix it or note why — don't ship
a HIGH into a demo.

---

## 2. Runtime pre-flight — live generation actually works (2–3 min)

Server must be **running** with a **model key connected**, and up ~15 s so the
boot model self-check has run.

```
node demo_preflight.js                       # default http://localhost:3000
node demo_preflight.js --url http://localhost:3001
```

If your build has the login wall on, pass your session cookie:

```
UNAI_COOKIE="unai_role=admin; unai_auth=…" node demo_preflight.js
```

It runs a real SDLC generation on a sample SAP BRD and asserts:

- the model self-check reports a live provider + its resolved (current) model,
- **every** section generated — none `failed` (throttled) or `incomplete` (truncated),
- `demoClean` is true, latency is measured,
- no `template preview` / `did not generate` text and no dangling table rows in the output,
- the **Gen-1 vs UNAI verdict is self-consistent** — the token delta and the cost
  saving agree in sign (so the label can't contradict the numbers).

**Green light = `RESULT: ✓ demo-ready`.** A `⚠` warning (e.g. "3 sections
auto-recovered on retry") is fine but tells you the provider is flaky — prefer a
paid tier or a second failover key for the demo. A `✗` is blocking; the message
says exactly what and how to fix (usually: re-run, or lower `SDLC_CONCURRENCY`,
or raise `SDLC_SECTION_TOKENS`).

---

## 3. Manual eyeball (2 min) — the things a script can't judge

- Open the **actual page you'll demo** and click the actual button. Watch it once.
- On the **SDLC Spec Factory**: generate once. Confirm the FS/TS read like real
  spec sections (full tables, populated rows), the **Explainability** panel shows
  all sections `live` (not "re-run needed"), and the **Gen-1 vs UNAI** card's
  sentence matches its own table (cheaper ↔ green ✓, pricier ↔ amber ⚠).
- On the **Sizing / Cost / TCO** page: confirm measured vs modeled pills read
  correctly and no number shows `NaN` / `undefined` / `$0` where a value belongs.
- **Gateway / keys**: the Run panel shows "model connected" (green), not a warning.

---

## Tuning knobs (set before the demo if the provider is rate-limited)

| Env var | Default | Effect |
|---|---|---|
| `SDLC_CONCURRENCY` | 4 | Sections generated at once. **Lower to 2** for a gentle/free-tier provider (fewer 429s), raise for speed on a paid tier. |
| `SDLC_SECTION_TOKENS` | 1500 | Per-section output budget. Raise if long tables truncate. |
| `SDLC_REPAIR_TOKENS` | 2400 | Budget for the serial repair retry of a failed/truncated section. |
| `UNAI_STARTUP_MODEL_CHECK` | 1 | Boot-time model ping + self-heal. Leave on. |

## One-liner before you present

```
node demo_scan.js && node demo_preflight.js
```

Both green → you're clear.
