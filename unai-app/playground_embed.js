// ==========================================================================
// playground_embed.js — per-app reverse-proxy for the Converted Agents
// Playground's iframe, so the Studio can detect a real "run" happening
// inside an arbitrary embedded app and pop the token-comparison modal.
//
// Serves each app at ROOT ("/") on its own dedicated port (like
// customer_api.js's live-link gateway) rather than under a path prefix --
// a path prefix breaks any app whose own JS/CSS/API calls use absolute
// root paths (the common case for a Vite build or a FastAPI-served SPA),
// since the browser resolves those against the page's ORIGIN, not its own
// path, and they'd silently miss the proxy entirely. Root-serving avoids
// that class of bug altogether.
//
// For an HTML response only, a small script is injected before </body>
// that patches window.fetch/XMLHttpRequest and postMessages the parent
// (window.top) when a POST matching a "this looks like a real run" path
// pattern comes back successful -- postMessage works across origins, so
// this needs no same-origin trick, unlike an earlier (broken) attempt at
// this that tried to reach into the iframe directly from the parent.
// ==========================================================================
"use strict";
const http = require("http");
const https = require("https");
const net = require("net");

const PROXIES = new Map();   // appId -> { server, port }

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
    srv.on("error", reject);
  });
}

function buildInjectScript(appId) {
  return `<script>(function(){
var RUN_RE=/\\/(run|agents\\/[\\w-]+|simulate|generate|execute|analy[sz]e|diagnos|triage)(\\/|$|\\?)/i;
var lastPop=0;
function maybeTrigger(url,ok){
  if(!ok) return;
  var p; try{ p=new URL(url, location.href).pathname; }catch(e){ p=String(url||''); }
  if(!RUN_RE.test(p)) return;
  var now=Date.now(); if(now-lastPop<1500) return; lastPop=now;
  try{ window.top.postMessage({type:'unai-agent-run', appId:${JSON.stringify(appId)}}, '*'); }catch(e){}
}
var origFetch=window.fetch;
if(origFetch) window.fetch=function(input,init){
  var method=(init&&init.method)||(input&&typeof input==='object'&&input.method)||'GET';
  var url=typeof input==='string'?input:((input&&input.url)||'');
  return origFetch.apply(this,arguments).then(function(resp){ if(String(method).toUpperCase()==='POST') maybeTrigger(url, resp&&resp.ok); return resp; });
};
var OrigXHR=window.XMLHttpRequest;
if(OrigXHR){
  var origOpen=OrigXHR.prototype.open, origSend=OrigXHR.prototype.send;
  OrigXHR.prototype.open=function(method,url){ this.__unaiMethod=method; this.__unaiUrl=url; return origOpen.apply(this,arguments); };
  OrigXHR.prototype.send=function(){
    this.addEventListener('loadend',function(){ if(String(this.__unaiMethod||'').toUpperCase()==='POST') maybeTrigger(this.__unaiUrl, this.status>=200&&this.status<300); });
    return origSend.apply(this,arguments);
  };
}
})();</script>`;
}

/** getTargetBase() is called fresh on EVERY request (not cached at proxy-
 * creation time) so this keeps working across the underlying app relaunching
 * on a new port -- same reasoning as foundry_convert.js's own RUNNING map
 * lookups happening per-call rather than once. */
function startPlaygroundProxy(appId, getTargetBase) {
  if (PROXIES.has(appId)) return Promise.resolve(PROXIES.get(appId));
  return pickFreePort().then(port => {
    const server = http.createServer((req, res) => {
      const base = getTargetBase();
      if (!base) { res.writeHead(503, { "Content-Type": "text/plain" }); return res.end("Agent is not currently running."); }
      const target = new URL(req.url, base);
      const client = target.protocol === "https:" ? https : http;
      const headers = Object.assign({}, req.headers);
      delete headers.host;
      const preq = client.request(target, { method: req.method, headers }, pres => {
        const ct = pres.headers["content-type"] || "";
        const outHeaders = Object.assign({}, pres.headers);
        delete outHeaders["x-frame-options"]; delete outHeaders["content-security-policy"];
        if (/text\/html/i.test(ct)) {
          const chunks = [];
          pres.on("data", c => chunks.push(c));
          pres.on("end", () => {
            let body = Buffer.concat(chunks).toString("utf8");
            // Streamlit (and possibly others) labels small internal responses
            // like /healthz ("ok") as text/html too, not just real pages --
            // injecting a script into that broke Streamlit's own healthcheck
            // contract (its client expects an EXACT "ok", nothing appended),
            // which made its reconnect logic misbehave. Only inject into
            // something that actually looks like a full HTML document.
            if (!/^\s*(<!doctype html|<html)/i.test(body)) {
              const outHeaders2 = Object.assign({}, pres.headers);
              delete outHeaders2["x-frame-options"]; delete outHeaders2["content-security-policy"];
              res.writeHead(pres.statusCode, outHeaders2);
              return res.end(body);
            }
            const script = buildInjectScript(appId);
            body = /<\/body>/i.test(body) ? body.replace(/<\/body>/i, script + "</body>") : body + script;
            delete outHeaders["content-length"];
            res.writeHead(pres.statusCode, outHeaders);
            res.end(body);
          });
        } else {
          res.writeHead(pres.statusCode, outHeaders);
          pres.pipe(res);
        }
      });
      preq.on("error", () => { try { res.writeHead(502, { "Content-Type": "text/plain" }); res.end("Agent temporarily unavailable."); } catch (_) {} });
      req.pipe(preq);
    });
    server.listen(port, "127.0.0.1");
    const entry = { server, port };
    PROXIES.set(appId, entry);
    return entry;
  });
}

module.exports = { startPlaygroundProxy };
