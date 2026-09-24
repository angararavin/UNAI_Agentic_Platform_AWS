// UNAI hardening self-check — run offline (no server, no login):
//   UNAI_NO_TIMERS=1 node verify_hardening.js
// Exercises every safety/governance feature added this cycle and prints PASS/FAIL.
process.env.UNAI_NO_TIMERS = "1";
const assert = (name, cond) => console.log((cond ? "PASS  " : "FAIL  ") + name);

const gw = require("./gateway.js");
const c  = require("./containment.js");
const m  = require("./misalignment.js");
const { UNAI } = require("./engine.js");

console.log("\n== 1. Data-residency gate + PII redaction (gateway) ==");
assert("EU class defaults to Mistral only", JSON.stringify(gw.allowedProvidersFor("eu")) === JSON.stringify(["mistral"]));
gw.setProviderRegion("anthropic", "eu");
assert("declaring Claude EU adds it to the EU set", gw.allowedProvidersFor("eu").includes("anthropic"));
const cands = [{label:"openai",model:"x"},{label:"mistral",model:"x"},{label:"groq",model:"x"}];
assert("PII route excludes non-EU (groq)", !gw.routeOrder(cands,"complex","pii").some(x=>x.label==="groq"));
gw.setResidencyPolicy({ general:{any:true}, secret:{regions:["nowhere"]} });
assert("fail-closed: no permitted provider -> HOLD ([])", gw.routeOrder(cands,"complex","secret").length === 0);
const red = gw.redactPII("a@b.com 123-45-6789 4111 1111 1111 1111 +1 415 555 0199");
assert("redaction masks email+ssn+card+phone (4)", red.redactions === 4 && !/b\.com/.test(red.text));

console.log("\n== 2. Egress control (containment) ==");
const st = c.status();
assert("allowlist populated by default (not empty)", st.egressAllowlist.length > 0);
assert("default mode is monitor", st.egressMode === "monitor");
c.setEgressMode("monitor");
assert("monitor: unlisted host ALLOWED but logged", c.assertEgress("https://evil.example.com","t") === true);
c.setEgressMode("enforce");
let blocked=false; try{ c.assertEgress("https://evil.example.com","t"); }catch(e){ blocked = e.code==="EGRESS_BLOCKED"; }
assert("enforce: unlisted host BLOCKED", blocked);
assert("enforce: provider host ALLOWED", c.assertEgress("https://api.openai.com/v1","t") === true);
c.setEgressMode("monitor");

console.log("\n== 3. Anomaly auto-halt (containment) ==");
c.setAnomalyConfig({ maxActions: 10, windowMs: 60000 });
let r; for (let i=0;i<3;i++) r = c.recordActions(5);   // 15 > 10
assert("action spike trips auto-halt", r.tripped === true);
assert("safe mode auto-engaged", c.safeMode === true);
c.setKillSwitch(false, "verify-reset");

console.log("\n== 4. Alerting + 24/7 escalation (containment) ==");
c.setKillSwitch(false, "verify-reset");
c.setAlertConfig({ minSeverity:"high", escalateAfterMs: 0, autoPauseOnEscalate: true });
c.record("egress_blocked", { host:"evil.example.com" });   // high-severity event
assert("high-severity event raises an alert", c.alertsSummary().open >= 1);
c.checkEscalations();                                        // window=0 -> escalate now
assert("unacknowledged alert escalates", c.alertsSummary().escalated >= 1);
assert("escalation auto-engaged safe mode", c.safeMode === true);
c.setKillSwitch(false, "verify-reset"); c.setAlertConfig({ escalateAfterMs: 1800000 });
c.record("egress_blocked", { host:"evil2.example.com" });
const open = c.listAlerts(10).find(a=>a.status==="open");
assert("acknowledge stops escalation", c.acknowledgeAlert(open.id,"admin").status === "acknowledged");

console.log("\n== 5. Behavioural misalignment classifier ==");
const clean = new UNAI({ detailedExplainability:false }).run("agri_fresh_supply");
const cm = m.classifyRun(clean, {});
assert("clean run is NOT flagged (no false positive)", cm.flagged === false && cm.score === 0);
const bad = { observability:{decisions:50,autonomyRatePct:96,avgConfidence:0.55,a2aMessages:400,totalSystemCalls:80},
  config:{maxActions:50},
  evidence:[{decision:"reroute",autonomous:true,gate:"food-safety hold"}],
  pendingApprovals:[{op:"DELETE_BATCH",decision:"purge lots"}] };
const bm = m.classifyRun(bad, { egressBlocked: 2 });
assert("misaligned run flagged critical", bm.flagged === true && bm.severity === "critical");
assert("classifier explains each signal", bm.signals.length >= 4 && bm.signals.every(s=>s.detail));
console.log("      signals:", bm.signals.map(s=>s.type).join(", "));

console.log("\nDone. Any FAIL above needs attention.\n");
