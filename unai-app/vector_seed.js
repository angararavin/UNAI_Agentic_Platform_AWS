/*
 * UNAI — vector store seed / init
 * -----------------------------------------------------------------------------
 * Ensures the shipped vector store (default: Qdrant) has a collection and the
 * Agentic-RAG knowledge base loaded, so retrieval works the moment UNAI boots.
 * Runs automatically in the deploy stack (docker-compose "vector-init" service);
 * safe to run by hand:   UNAI_VECTOR_URL=http://localhost:6333 node vector_seed.js
 *
 * Only Qdrant is auto-provisioned here (it's the default). Other backends
 * (Chroma, Weaviate, Pinecone, pgvector, Databricks, Azure) are provisioned by
 * their own managed tooling; point UNAI at them via UNAI_VECTOR_* and the
 * engine's connectors take over. If Qdrant is unreachable, UNAI still runs on
 * the built-in embedded store, so a failed seed never blocks the demo.
 */
const { unaiEmbed, RAG_SEED } = require("./engine.js");

const PROVIDER   = (process.env.UNAI_VECTOR_PROVIDER || "qdrant").toLowerCase();
const URL        = process.env.UNAI_VECTOR_URL || "http://localhost:6333";
const COLLECTION = process.env.UNAI_VECTOR_COLLECTION || "unai_kb";
const API_KEY    = process.env.UNAI_VECTOR_API_KEY || "";
const DIMS       = 96; // must match unaiEmbed()'s default dims
const headers    = Object.assign({ "Content-Type": "application/json" }, API_KEY ? { "api-key": API_KEY } : {});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForQdrant(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(URL + "/readyz"); if (r.ok) return true; } catch (e) {}
    try { const r = await fetch(URL + "/collections"); if (r.ok) return true; } catch (e) {}
    console.log(`[vector-seed] waiting for Qdrant at ${URL} (${i + 1}/${tries})…`);
    await sleep(2000);
  }
  return false;
}

async function main() {
  if (PROVIDER !== "qdrant") {
    console.log(`[vector-seed] provider is "${PROVIDER}", not qdrant — nothing to auto-provision. UNAI will use its connector or the embedded store.`);
    return;
  }
  const up = await waitForQdrant();
  if (!up) { console.log("[vector-seed] Qdrant not reachable — UNAI will fall back to the embedded store. Skipping seed."); return; }

  // 1) create (or confirm) the collection
  await fetch(URL + "/collections/" + COLLECTION, {
    method: "PUT", headers,
    body: JSON.stringify({ vectors: { size: DIMS, distance: "Cosine" } }),
  }).then(r => console.log(`[vector-seed] collection "${COLLECTION}" ready (${r.status})`));

  // 2) upsert the knowledge base
  const points = RAG_SEED.map((d, i) => ({
    id: i + 1,
    vector: unaiEmbed((d.text || "") + " " + ((d.tags || []).join(" ")), DIMS),
    payload: d,
  }));
  const r = await fetch(URL + "/collections/" + COLLECTION + "/points?wait=true", {
    method: "PUT", headers, body: JSON.stringify({ points }),
  });
  console.log(`[vector-seed] upserted ${points.length} passages into "${COLLECTION}" (${r.status}).`);
  console.log("[vector-seed] done. UNAI Agentic RAG is served by Qdrant.");
}

main().catch(e => { console.error("[vector-seed] error:", e.message, "— UNAI will use the embedded store."); process.exit(0); });
