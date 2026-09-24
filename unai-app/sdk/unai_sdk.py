"""unai_sdk.py — tiny Python client for the UNAI API (/api/v1).

Standard library only (urllib) — no dependencies.

    from unai_sdk import UNAIClient
    unai = UNAIClient(base_url="https://<host>", token=os.environ["UNAI_API_KEY"])

    onto = unai.ontology()
    made = unai.create_agent(name="Spares Triage", capabilities=[
        {"label": "Read stock", "kind": "perception", "system": "SAP_MM"},
        {"label": "Create PO",  "kind": "action",     "system": "SAP_MM"},
    ])
    run = unai.run(made["id"])
    print(run["observability"], run["containment"])
"""
import json
import urllib.request
import urllib.error


class UNAIError(Exception):
    def __init__(self, message, status=None, data=None):
        super().__init__(message)
        self.status = status
        self.data = data


class UNAIClient:
    def __init__(self, base_url, token=""):
        if not base_url:
            raise ValueError("base_url required")
        self.base = base_url.rstrip("/") + "/api/v1"
        self.token = token or ""

    def _req(self, method, path, body=None):
        url = self.base + path
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode() or "{}")
        except urllib.error.HTTPError as e:
            payload = {}
            try:
                payload = json.loads(e.read().decode() or "{}")
            except Exception:
                pass
            raise UNAIError(payload.get("error", "HTTP %s" % e.code), status=e.code, data=payload)

    # --- discovery ---
    def health(self):    return self._req("GET", "/health")
    def ontology(self):  return self._req("GET", "/ontology")

    # --- agents ---
    def list_agents(self):                 return self._req("GET", "/agents")
    def create_agent(self, name, capabilities):
        return self._req("POST", "/agents", {"name": name, "capabilities": capabilities})
    def run(self, agent_id, config=None):
        return self._req("POST", "/agents/%s/run" % agent_id, {"config": config or {}})

    # --- data-foundation connections ---
    def list_connections(self):            return self._req("GET", "/connections")
    def configure_connection(self, type, config=None):
        return self._req("POST", "/connections", {"type": type, "config": config or {}})

    # --- Agent Safety & Containment ---
    def containment(self):                 return self._req("GET", "/containment")
    def kill(self, on):                    return self._req("POST", "/containment/kill", {"on": bool(on)})
    def set_egress(self, allowlist):       return self._req("POST", "/containment/egress", {"allowlist": allowlist or []})
    def set_policy(self, policy):          return self._req("POST", "/containment/policy", {"policy": policy})
