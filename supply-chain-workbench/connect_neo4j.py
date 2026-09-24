# ==========================================================================
# UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
# Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
#
# PROPRIETARY & CONFIDENTIAL. See LICENSE.  [UNAI-COPYRIGHT v1]
# ==========================================================================
"""
Neo4j ontology store — persists the canonical ontology as a graph so it
survives across sessions and is queryable in Cypher. Works with Neo4j AuraDB
Free (a hosted, no-cost instance).

SET (in your shell / env.sh, never in code):
    export NEO4J_URI=neo4j+s://<xxxx>.databases.neo4j.io   # AuraDB connection URI
    export NEO4J_USER=neo4j
    export NEO4J_PASSWORD=...                               # from AuraDB when you create the instance
THEN:
    python3 -m pip install neo4j     # macOS: add --break-system-packages if needed
    python connect_neo4j.py test     # verify connection
    python connect_neo4j.py publish  # write the canonical ontology graph
    python connect_neo4j.py fetch    # read it back (feeds the Knowledge Graph view)
"""
import os, sys

URI = os.environ.get("NEO4J_URI", "")
USER = os.environ.get("NEO4J_USER", "neo4j")
PWD = os.environ.get("NEO4J_PASSWORD", "")


def _need():
    miss = [k for k, v in [("NEO4J_URI", URI), ("NEO4J_PASSWORD", PWD)] if not v]
    if miss:
        print("Missing env vars:", ", ".join(miss), "\nSee this file's header / the Connections tab."); sys.exit(1)


def _driver():
    _need()
    try:
        from neo4j import GraphDatabase
    except ImportError:
        print(f"Neo4j driver not installed for this Python:\n  {sys.executable}\n"
              f"Install it into THIS interpreter:\n  {sys.executable} -m pip install neo4j\n"
              f"(macOS: add --break-system-packages if it reports an externally-managed environment)")
        sys.exit(1)
    return GraphDatabase.driver(URI, auth=(USER, PWD))


def _ontology():
    try:
        from sa.ontology import ONTOLOGY
        return ONTOLOGY
    except Exception as e:
        print("could not load sa/ontology.py:", e); return {}


def cmd_test():
    d = _driver()
    with d.session() as s:
        rec = s.run("RETURN 1 AS ok").single()
    d.close()
    print(f"connected to Neo4j at {URI}\n  ok={rec['ok']}  user={USER}")


def cmd_publish():
    import os, json
    d = _driver(); ont = _ontology(); nC = 0; systems = set(); nE = 0; nLibC = 0; nLearn = 0
    with d.session() as s:
        s.run("MERGE (o:UNAIOntology {name:'canonical'}) SET o.updated = datetime()")
        # 1) base ontology (systems of record)
        for concept, m in ont.items():
            s.run("MERGE (c:Concept {name:$c})", c=concept); nC += 1
            for sysname, field in (m or {}).items():
                if not field:
                    continue
                systems.add(sysname)
                s.run("MERGE (sys:System {name:$s}) MERGE (c:Concept {name:$c}) "
                      "MERGE (c)-[r:MAPS_TO]->(sys) SET r.field=$f", s=sysname, c=concept, f=str(field)); nE += 1
        # 2) FULL Cognition Layer: all library concepts (+ cross-deployment aliases)
        #    and every learned per-system mapping — written by the server before publish.
        cf = os.environ.get("COGNITION_ONTOLOGY_FILE", "")
        if cf and os.path.exists(cf):
            data = json.load(open(cf))
            for c in data.get("concepts", []):
                s.run("MERGE (c:Concept {name:$c}) SET c.domain=$d, c.aliases=$a, c.type=$t",
                      c=c["concept"], d=c.get("domain"), a=c.get("aliases", []), t=c.get("type")); nLibC += 1
            for r in data.get("systems", []):
                systems.add(r["system"])
                s.run("MERGE (sys:System {name:$s}) MERGE (c:Concept {name:$c}) "
                      "MERGE (c)-[rel:MAPS_TO]->(sys) SET rel.field=$f, rel.source='learned'",
                      s=r["system"], c=r["concept"], f=str(r["field"])); nLearn += 1
    d.close()
    print(f"published {nC} base concepts + {nLibC} cognition concepts, {len(systems)} systems, "
          f"{nE} base mappings + {nLearn} learned mappings to Neo4j ({URI})")
    print("  the FULL canonical ontology (base + cognition library + learned per-system maps) "
          "now persists as a graph — query it in Cypher or read it in the Knowledge Graph tab.")


def cmd_fetch():
    import json as _json
    d = _driver(); edges = []; systems = set(); concepts = set()
    with d.session() as s:
        for rec in s.run("MATCH (c:Concept)-[r:MAPS_TO]->(sys:System) RETURN c.name AS c, sys.name AS s, r.field AS f, r.source AS src"):
            concepts.add(rec["c"]); systems.add(rec["s"])
            edges.append({"table": rec["s"], "column": rec["f"], "concept": rec["c"], "confidence": 1, "auto": True,
                          "source": rec["src"] or "base"})
    d.close()
    graph = {"source": "neo4j", "catalog": "neo4j", "schema": "canonical",
             "tables": [{"name": x, "columns": 0, "mapped": 0} for x in sorted(systems)],
             "concepts": sorted(concepts), "edges": edges,
             "summary": {"columns": len(edges), "mapped": len(edges), "auto_accepted": len(edges),
                         "coverage": 100, "autorate": 100, "grade": "Persisted"}}
    print(f"read {len(concepts)} concepts / {len(edges)} mappings from Neo4j")
    print("===UNAI_ONTOLOGY===" + _json.dumps(graph, default=str))


CMDS = {"test": cmd_test, "publish": cmd_publish, "create": cmd_publish, "fetch": cmd_fetch}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "test"
    if cmd not in CMDS:
        print("usage: python connect_neo4j.py [test|publish|fetch]"); sys.exit(1)
    CMDS[cmd]()
