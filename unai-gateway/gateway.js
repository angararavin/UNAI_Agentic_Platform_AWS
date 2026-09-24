/*
 * UNAI AI Gateway — token economizer  (reference stub)
 * -----------------------------------------------------------------------------
 * A zero-dependency proxy that sits between YOUR apps and the Claude API and
 * CONTROLS token spend. Point any OpenAI-compatible client at it:
 *     base_url = http://localhost:8790/v1        (POST /v1/chat/completions)
 *
 * It applies, in order: budget check -> response cache -> model routing ->
 * prompt caching -> forward to Claude -> meter. A tiny dashboard is at "/".
 *
 * Modes:
 *   • With ANTHROPIC_API_KEY set  -> forwards to the real Claude API (Measured).
 *   • Without a key               -> MODELED mock so you can see caching,
 *                                     routing, budgets and metering work offline.
 *
 * NOTE: This governs apps you control. You cannot put it between Anthropic's
 * Claude Desktop app and the models — that path is sealed (see README).
 */
const http = require("http");
const crypto = require("crypto");

const PORT   = process.env.PORT || 8790;
const KEY    = process.env.ANTHROPIC_API_KEY || "";
const SIMPLE = process.env.ROUTE_SIMPLE_MODEL  || "claude-haiku-4-5-20251001";
const COMPLEX= process.env.ROUTE_COMPLEX_MODEL || "claude-sonnet-5";
const BUDGET = Number(process.env.DAILY_TOKEN_BUDGET || 0);      // 0 = unlimited
const TTL    = Number(process.env.CACHE_TTL_MS || 10*60*1000);   // response-cache TTL

// Illustrative Claude list prices ($/1M tokens, in/out). cache read = 0.1x in, write = 1.25x in.
const PRICE = { haiku:[0.80,4.00], sonnet:[3.00,15.00], opus:[15.00,75.00] };
const priceFor = m => /opus/i.test(m)?PRICE.opus : /haiku/i.test(m)?PRICE.haiku : PRICE.sonnet;
const estTok = s => Math.max(1, Math.round((s||"").length/4));   // ~4 chars/token

const cache = new Map();   // responseHash -> {t, body, model, tokens}
const stats = { started:Date.now(), requests:0, cacheHits:0, routedSimple:0, routedComplex:0,
  tokensIn:0, tokensOut:0, cacheReadTokens:0, cost:0, baselineCost:0, budgetBlocks:0, day:new Date().toDateString(), daySpentTok:0 };

function rollDay(){ const d=new Date().toDateString(); if(d!==stats.day){ stats.day=d; stats.daySpentTok=0; } }
function routeModel(text, requested){
  if(requested && requested!=="auto") return requested;
  const heavy=/(analy|plan|reason|forecast|optimi|root cause|why|strategy|design|compare)/i.test(text) || text.length>1200;
  return heavy?COMPLEX:SIMPLE;
}
function complete({model, system, user}){
  // MODELED mock (no key): deterministic short answer + modeled token counts.
  const answer = "〔modeled answer for: "+user.slice(0,80).replace(/\s+/g," ")+"〕";
  return { text:answer, usage:{ input_tokens:estTok(system)+estTok(user), output_tokens:estTok(answer),
    cache_read_input_tokens:0, cache_creation_input_tokens:estTok(system) } };
}
async function callClaude({model, system, user, maxTokens}){
  const body = { model, max_tokens:maxTokens||512,
    system:[{ type:"text", text:system||"You are a helpful assistant.", cache_control:{type:"ephemeral"} }],
    messages:[{ role:"user", content:user }] };
  const r = await fetch("https://api.anthropic.com/v1/messages", { method:"POST",
    headers:{ "content-type":"application/json", "x-api-key":KEY, "anthropic-version":"2023-06-01",
      "anthropic-beta":"prompt-caching-2024-07-31" }, body:JSON.stringify(body) });
  const j = await r.json();
  const text = (j.content && j.content[0] && j.content[0].text) || JSON.stringify(j).slice(0,200);
  return { text, usage:j.usage||{} };
}
function meter(model, u){
  const [pin,pout]=priceFor(model);
  const readTok=u.cache_read_input_tokens||0, writeTok=u.cache_creation_input_tokens||0;
  const freshIn=(u.input_tokens||0)-readTok-writeTok>0?(u.input_tokens||0)-readTok-writeTok:(u.input_tokens||0);
  // cost with caching: fresh in @1x + write @1.25x + read @0.1x + out
  const cost = (freshIn*pin + writeTok*pin*1.25 + readTok*pin*0.1)/1e6 + (u.output_tokens||0)*pout/1e6;
  // baseline = same tokens billed at full input rate, no cache, on the COMPLEX model (naive)
  const [bpin,bpout]=priceFor(COMPLEX);
  const baseline = ((u.input_tokens||0)*bpin + (u.output_tokens||0)*bpout)/1e6;
  stats.tokensIn+=(u.input_tokens||0); stats.tokensOut+=(u.output_tokens||0);
  stats.cacheReadTokens+=readTok; stats.cost+=cost; stats.baselineCost+=baseline;
  stats.daySpentTok+=(u.input_tokens||0)+(u.output_tokens||0);
  return {cost, baseline};
}

const send=(res,code,obj)=>{ res.writeHead(code,{"content-type":"application/json"}); res.end(JSON.stringify(obj)); };

const server = http.createServer((req,res)=>{
  if(req.method==="GET" && req.url==="/stats") return send(res,200,summary());
  if(req.method==="GET" && (req.url==="/"||req.url==="/dashboard")) { res.writeHead(200,{"content-type":"text/html"}); return res.end(dashboard()); }
  if(req.method==="POST" && req.url.startsWith("/v1/chat/completions")){
    let b=""; req.on("data",c=>b+=c); req.on("end",async ()=>{
      rollDay(); stats.requests++;
      let j={}; try{ j=JSON.parse(b||"{}"); }catch(_){}
      const msgs=j.messages||[];
      const system=msgs.filter(m=>m.role==="system").map(m=>m.content).join("\n");
      const user=msgs.filter(m=>m.role!=="system").map(m=>m.content).join("\n");
      // 1) budget
      if(BUDGET>0 && stats.daySpentTok>=BUDGET){ stats.budgetBlocks++; return send(res,429,{error:"daily token budget exhausted", budget:BUDGET, spent:stats.daySpentTok}); }
      // 2) response cache (exact match)
      const hash=crypto.createHash("sha256").update((j.model||"auto")+"|"+system+"|"+user).digest("hex");
      const hit=cache.get(hash);
      if(hit && (Date.now()-hit.t)<TTL){ stats.cacheHits++;
        return send(res,200,openai(hit.model,hit.text,{input_tokens:0,output_tokens:0,cached:true})); }
      // 3) route
      const model=routeModel(user, j.model);
      (model===COMPLEX?stats.routedComplex++:stats.routedSimple++);
      // 4+5) prompt caching + forward (or mock)
      let out; try{ out = KEY ? await callClaude({model,system,user,maxTokens:j.max_tokens}) : complete({model,system,user}); }
      catch(e){ return send(res,502,{error:"upstream error: "+e.message}); }
      meter(model,out.usage);
      cache.set(hash,{t:Date.now(),body:b,model,text:out.text,tokens:out.usage});
      return send(res,200,openai(model,out.text,out.usage));
    });
    return;
  }
  send(res,404,{error:"not found"});
});
function openai(model,text,usage){ return { id:"unai-"+Date.now(), object:"chat.completion", model,
  choices:[{index:0,message:{role:"assistant",content:text},finish_reason:"stop"}],
  usage:{ prompt_tokens:usage.input_tokens||0, completion_tokens:usage.output_tokens||0,
    total_tokens:(usage.input_tokens||0)+(usage.output_tokens||0), cached:!!usage.cached } }; }
function summary(){ const saved=stats.baselineCost-stats.cost;
  return { mode: KEY?"live (measured)":"modeled (no key)", ...stats,
    cacheHitRate: stats.requests?+(stats.cacheHits/stats.requests).toFixed(3):0,
    estCost:+stats.cost.toFixed(6), baselineCost:+stats.baselineCost.toFixed(6),
    savedVsBaseline:+saved.toFixed(6), savedPct: stats.baselineCost?+(saved/stats.baselineCost*100).toFixed(1):0 }; }
function dashboard(){ const s=summary();
  return `<!doctype html><meta charset=utf8><title>UNAI AI Gateway</title>
  <style>body{font:14px system-ui;margin:32px;color:#1a2233}h1{color:#1E2761}.k{color:#5C6B88}
  .g{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:760px}
  .c{border:1px solid #D9E0EC;border-radius:10px;padding:14px}.n{font-size:22px;font-weight:800;color:#13B58C}</style>
  <h1>UNAI AI Gateway — token economizer</h1>
  <p class=k>Mode: <b>${s.mode}</b> · routing: simple=<code>${SIMPLE}</code> complex=<code>${COMPLEX}</code> · budget: ${BUDGET||'∞'} tok/day</p>
  <div class=g>
   <div class=c><div class=k>Requests</div><div class=n>${s.requests}</div></div>
   <div class=c><div class=k>Cache hit rate</div><div class=n>${(s.cacheHitRate*100).toFixed(0)}%</div></div>
   <div class=c><div class=k>Routed simple / complex</div><div class=n>${s.routedSimple} / ${s.routedComplex}</div></div>
   <div class=c><div class=k>Tokens in / out</div><div class=n>${s.tokensIn} / ${s.tokensOut}</div></div>
   <div class=c><div class=k>Est. cost</div><div class=n>$${s.estCost}</div></div>
   <div class=c><div class=k>Saved vs naive</div><div class=n>${s.savedPct}%</div></div>
  </div>
  <p class=k style="margin-top:16px">POST <code>/v1/chat/completions</code> · JSON at <code>/stats</code>. Repeat a prompt to see a cache hit; send a long/"analyze" prompt to see it route to the complex model.</p>`; }
server.listen(PORT,()=>console.log(`[unai-gateway] ${KEY?"LIVE (Claude API)":"MODELED (no key)"} on http://localhost:${PORT}  ·  dashboard /  ·  stats /stats`));
