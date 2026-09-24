#!/usr/bin/env node
// Minimal runnable demo: a terminal chat loop where OpenAI can call UNAI's
// tools (tools.js) via native function calling. This is the OpenAI-ecosystem
// counterpart to mcp/mcp-server.js — same UNAI tools, OpenAI's tool-calling
// protocol instead of MCP's, and a driver loop instead of a stdio server
// (OpenAI function calling has no client-side "server" to run; the caller
// owns the loop).
"use strict";
const readline = require("readline");
const { TOOLS, callTool } = require("./tools.js");

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
if (!OPENAI_KEY) { console.error("Set OPENAI_API_KEY first."); process.exit(1); }

async function chat(messages) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + OPENAI_KEY },
    body: JSON.stringify({ model: MODEL, messages, tools: TOOLS }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error((j.error && j.error.message) || ("HTTP " + res.status));
  return j.choices[0].message;
}

async function runTurn(messages) {
  let msg = await chat(messages);
  messages.push(msg);
  // Follow the tool-call chain until the model returns a plain answer.
  while (msg.tool_calls && msg.tool_calls.length) {
    for (const call of msg.tool_calls) {
      const result = await callTool(call.function.name, call.function.arguments);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
    msg = await chat(messages);
    messages.push(msg);
  }
  return msg.content;
}

const messages = [
  { role: "system", content: "You can call UNAI's tools to run governed supply-chain agents. UNAI does the reasoning; report its decisions, confidence, and containment status back to the user plainly." },
];
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "you> " });
console.log('UNAI + OpenAI function calling — try: "List the UNAI agents", then "Run dc_hw_rma and summarise it."');
rl.prompt();
rl.on("line", async (line) => {
  messages.push({ role: "user", content: line });
  try { console.log("assistant> " + await runTurn(messages)); }
  catch (e) { console.error("error: " + (e && e.message || e)); }
  rl.prompt();
}).on("close", () => process.exit(0));
