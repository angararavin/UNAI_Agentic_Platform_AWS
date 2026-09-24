# Deploy to Cloud Run

I couldn't run these from this session — this sandbox's network is blocked from
downloading the Cloud SDK installer (Google returns a direct 403 on the
download itself). Everything below is tested and ready; run it from a
terminal where you already have `gcloud` (or install it fresh — see below).

## 0. If you don't have gcloud yet
Install it from https://cloud.google.com/sdk/docs/install, then:
```bash
gcloud init
gcloud auth login
```

## 1. Point it at your project
```bash
gcloud config set project bcone-comp-analysis-dev-prj
```

## 2. Enable the APIs Cloud Run needs (one-time per project)
```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```
This requires a billing account attached to the project (a card on file) —
GCP won't let you enable these APIs without one, even though Cloud Run's
free tier (2M requests/mo) means you likely won't be charged for this demo.

## 3. Deploy — Cloud Build builds the Dockerfile for you, no local Docker needed
From inside this folder (`unai-spares-ibp-standalone/`):
```bash
gcloud run deploy unai-spares-ibp \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars APP_PASSWORD=changeme,GEMINI_API_KEY=YOUR_GEMINI_KEY,GEMINI_MODEL=gemini-flash-lite-latest,LLM_ROUTER_ORDER=gemini
```
Replace `changeme` with a real password (this is the app's own login wall —
without it, anyone with the URL can run it and burn your Gemini free-tier
quota) and `YOUR_GEMINI_KEY` with your real key.

`--allow-unauthenticated` makes the URL publicly reachable (still behind the
app's own password). Drop that flag (use `--no-allow-unauthenticated`
instead) if you'd rather restrict it to people with IAM access on this GCP
project — then sharing the link alone isn't enough, they'd also need
`roles/run.invoker` granted.

It prints a **Service URL** like `https://unai-spares-ibp-xxxxx-uc.a.run.app`
when done — that's the whole app, live.

## Notes
- **State resets on cold start.** Cloud Run containers don't keep a
  persistent disk, so the bundled ADK data snapshot (`data/adk_seed.json`)
  reloads fresh each time a new instance spins up — writes during a session
  (stock transfers, POs) persist for that instance's lifetime, not forever.
  That's expected for a demo; if you want durable state, swap the adapter's
  temp-file copy for a Cloud SQL/Firestore-backed one.
- **Secrets as plain env vars** are fine for a quick demo but visible to
  anyone with read access to the Cloud Run revision config. For anything
  longer-lived, move `GEMINI_API_KEY` into Secret Manager and reference it
  with `--set-secrets` instead of `--set-env-vars`.
- To update after a code change, re-run the same `gcloud run deploy` command
  — it builds and rolls out a new revision.
- To tear it down: `gcloud run services delete unai-spares-ibp --region us-central1`.
