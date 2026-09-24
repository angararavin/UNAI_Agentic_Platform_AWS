# UNAI Vector Store — ships by default, connects to any

UNAI includes a vector store **out of the box** — a customer does not have to bring one.

## What ships

| Backend | Role | Notes |
|---|---|---|
| **Qdrant** | **Shipped default** | Bundled by the deploy stack (`docker-compose.yml`); scales to production. |
| **UNAI Embedded** | Zero-config fallback | In-process index; runs offline / air-gapped with no setup. Always available. |
| Chroma | Connector | Lightweight; great for dev / small KBs. |
| Weaviate | Connector | Hybrid search + modules. |
| Pinecone | Connector | Managed, serverless. |
| Milvus | Connector | High-scale OSS. |
| pgvector | Connector | Reuse existing Postgres / lakehouse. |
| Databricks Vector Search | Connector | Governed lakehouse-native. |
| Azure AI Search | Connector | Azure-native retrieval. |

All backends implement one interface (`upsert` / `query` / `health`), so retrieval,
grounding, citations and RBAC data-scope are identical whichever you pick. If the
configured backend is unreachable, UNAI transparently falls back to the embedded
index so a demo never breaks.

## Run the full stack (Qdrant + UNAI, auto-seeded)

```bash
cd unai-app
cp .env.example .env          # optional; defaults are fine
docker compose up --build
# UNAI  → http://localhost:8080
# Qdrant→ http://localhost:6333/dashboard
```

`vector-init` creates the `unai_kb` collection and loads the Agentic-RAG
knowledge base before the app starts, so retrieval works immediately.

## Point at a different backend

Set these (in `.env` or the environment) and restart — no code change:

```
UNAI_VECTOR_PROVIDER=pinecone
UNAI_VECTOR_URL=https://<your-index>.svc.<region>.pinecone.io
UNAI_VECTOR_API_KEY=<key>
UNAI_VECTOR_COLLECTION=unai_kb
```

In the app, the active backend is shown and switchable under
**Governance → Vector store**.

## Notes for production

The embedded/demo path uses a dependency-free deterministic embedding so it runs
anywhere; production deployments swap in a real embedding model at the same
interface (nothing downstream changes). pgvector connects through a thin HTTP
shim over Postgres at deploy time.
