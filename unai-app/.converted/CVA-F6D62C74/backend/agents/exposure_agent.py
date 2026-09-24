import csv
import math
import difflib
from pathlib import Path
from backend.config import DATA_DIR


class ExposureAgent:
    """
    Agent 2 / Team 2: Exposure Lead Agent (Supply Network Analysis Team)
    Traces multi-tier supplier dependencies (Tier 1 & Tier 2 cascading),
    traverses the Bill of Materials (BOM), maps exposed downstream manufacturing plants,
    and constructs dynamic Supply Chain Network Topology Graphs (Affected vs. Safe nodes).
    """

    def __init__(self):
        self.suppliers_path = DATA_DIR / "suppliers.csv"
        self.bom_path = DATA_DIR / "bom.csv"
        self.plant_parts_path = DATA_DIR / "plant_parts.csv"
        self.plant_capacity_path = DATA_DIR / "plant_capacity.csv"

        self._suppliers = self._load_csv(self.suppliers_path)
        self._bom = self._load_csv(self.bom_path)
        self._plant_parts = self._load_csv(self.plant_parts_path)
        self._plants = self._load_csv(self.plant_capacity_path)

    def reload_data(self):
        """Reloads CSV datasets from disk."""
        self._suppliers = self._load_csv(self.suppliers_path)
        self._bom = self._load_csv(self.bom_path)
        self._plant_parts = self._load_csv(self.plant_parts_path)
        self._plants = self._load_csv(self.plant_capacity_path)

    def suggest_suppliers(self, query: str = "", limit: int = 10) -> list:
        """
        Fuzzy matches and suggests valid registered suppliers from the active dataset.
        Returns all suppliers if query is blank, or ranked suggestions if query is provided.
        """
        self.reload_data()
        if not self._suppliers:
            return []

        q = (query or "").strip().lower()
        if not q:
            # Return all sorted by tier and name
            results = []
            for s in self._suppliers[:limit]:
                results.append({
                    "supplier_id": s.get("supplier_id", ""),
                    "supplier_name": s.get("supplier_name", ""),
                    "tier": s.get("tier", "1"),
                    "country": s.get("country", ""),
                    "city": s.get("city", ""),
                    "category": s.get("category", "Component Supplier"),
                    "risk_score": float(s.get("risk_score", 30.0) or 30.0)
                })
            return results

        # 1. Exact or Substring match
        scored_matches = []
        for s in self._suppliers:
            name = s.get("supplier_name", "")
            name_lower = name.lower()
            category = s.get("category", "").lower()
            city = s.get("city", "").lower()
            country = s.get("country", "").lower()

            score = 0.0
            if q == name_lower:
                score = 1.0
            elif name_lower.startswith(q):
                score = 0.9
            elif q in name_lower:
                score = 0.8
            elif q in category or q in city or q in country:
                score = 0.6
            else:
                # Fuzzy ratio match
                ratio = difflib.SequenceMatcher(None, q, name_lower).ratio()
                if ratio >= 0.45:
                    score = ratio * 0.75

            if score > 0.35:
                scored_matches.append((score, s))

        # Sort descending by score
        scored_matches.sort(key=lambda x: x[0], reverse=True)

        suggestions = []
        for _, s in scored_matches[:limit]:
            suggestions.append({
                "supplier_id": s.get("supplier_id", ""),
                "supplier_name": s.get("supplier_name", ""),
                "tier": s.get("tier", "1"),
                "country": s.get("country", ""),
                "city": s.get("city", ""),
                "category": s.get("category", "Component Supplier"),
                "risk_score": float(s.get("risk_score", 30.0) or 30.0)
            })

        return suggestions

    def analyze_exposure(self, disruption_event: dict) -> dict:
        """
        Main entry point for supply network exposure analysis.
        """
        self.reload_data()
        supplier_name = (disruption_event.get("supplier") or "").strip()
        disruption_id = disruption_event.get("id", "UNKNOWN")

        if not supplier_name or disruption_event.get("severity") == "None":
            return self._empty_result(disruption_id, reason="Normal baseline operations — zero supplier exposure")

        if not self._suppliers:
            return self._synthetic_result(disruption_id, supplier_name, reason="suppliers.csv missing or empty")

        tier1_suppliers, tier2_suppliers, matched = self._trace_tiers(supplier_name)

        if not matched:
            # Fallback: create dynamic single-tier record for supplier
            tier1_suppliers = [{
                "supplier_id": f"SUPP-{supplier_name[:4].upper()}",
                "supplier_name": supplier_name,
                "tier": "1",
                "depends_on_supplier_id": "",
                "country": disruption_event.get("country", "Global"),
                "category": "Primary Component Supplier"
            }]
            tier2_suppliers = []

        impacted_supplier_ids = {s.get("supplier_id") for s in (tier1_suppliers + tier2_suppliers) if s.get("supplier_id")}

        affected_parts = self._traverse_bom(impacted_supplier_ids)
        if not affected_parts:
            # Generate parametric parts if not in flat file BOM
            affected_parts = [
                {
                    "part_id": f"PART-{supplier_name[:3].upper()}-01",
                    "part_name": f"{supplier_name} Core Component Module",
                    "supplier_id": list(impacted_supplier_ids)[0] if impacted_supplier_ids else "SUPP-01",
                    "product_id": "PROD-GENERIC",
                    "criticality": "Critical"
                }
            ]

        exposed_plants = self._map_plant_exposure({p["part_id"] for p in affected_parts})
        if not exposed_plants:
            exposed_plants = [
                {
                    "plant_id": "PL-MAIN",
                    "plant_name": disruption_event.get("destination", "Regional Final Assembly Plant"),
                    "parts_exposed": [p["part_id"] for p in affected_parts]
                }
            ]

        return {
            "disruption_id": disruption_id,
            "supplier_hit": supplier_name,
            "tier1_suppliers": tier1_suppliers,
            "tier2_suppliers": tier2_suppliers,
            "suppliers_impacted_count": len(tier1_suppliers) + len(tier2_suppliers),
            "affected_parts": affected_parts,
            "parts_affected_count": len(affected_parts),
            "exposed_plants": exposed_plants,
            "plants_exposed_count": len(exposed_plants),
            "is_synthetic": False,
            "source": "Supply Network Analysis (Multi-Tier BOM Traversal)",
        }

    def generate_network_topology(
        self,
        origin: str = "",
        destination: str = "",
        supplier: str = "",
        risk_event: dict = None,
        radius_km: float = 400.0
    ) -> dict:
        """
        Builds a comprehensive Supply Chain Network Topology Graph.
        Categorizes all regional & global nodes into:
          - Affected Suppliers (🔴 Red) vs Safe Suppliers (🟢 Green)
          - Transport Shipping Corridors (Disrupted ⚡ vs Operational)
          - Receiver Manufacturing Plants & Customer Hubs (Exposed vs Operational)
        """
        self.reload_data()
        risk_event = risk_event or {}
        event_severity = risk_event.get("severity", "Moderate")
        is_healthy = event_severity.upper() in ["NONE", "HEALTHY", "LOW_RISK", "NORMAL"]
        event_title = risk_event.get("event_type") or risk_event.get("headline") or "Disruption Zone"

        origin_clean = (origin or risk_event.get("origin") or "Origin Hub").strip()
        dest_clean = (destination or risk_event.get("destination") or "Destination Assembly").strip()
        supplier_clean = (supplier or risk_event.get("supplier") or "").strip().lower()

        nodes = []
        links = []
        node_id_map = {}

        # 1. Evaluate All Suppliers in Dataset
        affected_suppliers = []
        safe_suppliers = []

        # Coordinates lookup for common hubs
        hub_coords = {
            "hsinchu": (24.7801, 120.9937),
            "taiwan": (24.7801, 120.9937),
            "shenzhen": (22.5431, 114.0579),
            "yantian": (22.5800, 114.2800),
            "busan": (35.1796, 129.0756),
            "tokyo": (35.6762, 139.6503),
            "chennai": (13.0827, 80.2707),
            "anantapur": (14.6819, 77.6006),
            "austin": (30.2672, -97.7431),
            "phoenix": (33.4484, -112.0740),
            "long beach": (33.7701, -118.1937),
            "frankfurt": (50.1109, 8.6821),
            "dresden": (51.0504, 13.7373)
        }

        # Determine epicenter coordinates
        epicenter_coord = None
        for k, coords in hub_coords.items():
            if k in origin_clean.lower() or k in (risk_event.get("location") or "").lower():
                epicenter_coord = coords
                break
        if not epicenter_coord:
            epicenter_coord = (24.7801, 120.9937)  # default Hsinchu/East Asia

        for s in self._suppliers:
            s_name = s.get("supplier_name", "Supplier")
            s_id = s.get("supplier_id", f"SUPP-{s_name[:3].upper()}")
            s_country = s.get("country", "")
            s_city = s.get("city", "")
            s_tier = int(s.get("tier", "1") or 1)
            s_cat = s.get("category", "Component Supplier")
            base_risk = float(s.get("risk_score", 35.0) or 35.0)

            # Get coordinates
            s_lat = float(s.get("lat", 0.0) or 0.0)
            s_lon = float(s.get("lon", 0.0) or 0.0)
            if s_lat == 0.0 and s_lon == 0.0:
                for k, coords in hub_coords.items():
                    if k in s_city.lower() or k in s_country.lower():
                        s_lat, s_lon = coords
                        break

            # Calculate proximity to epicenter
            distance_km = self._haversine(epicenter_coord[0], epicenter_coord[1], s_lat, s_lon) if s_lat and s_lon else 9999.0

            is_target = supplier_clean and (supplier_clean in s_name.lower() or s_name.lower() in supplier_clean)
            is_near_epicenter = (distance_km <= radius_km) or (s_city.lower() in origin_clean.lower() and origin_clean)

            if not is_healthy and (is_target or (not supplier_clean and is_near_epicenter)):
                status = "affected"
                impact_reason = f"Inside {event_title} zone ({distance_km:,.0f} km from epicenter)" if not is_target else f"Primary impacted supplier ({event_title})"
                affected_suppliers.append(s)
            else:
                status = "safe"
                impact_reason = f"Operational ({distance_km:,.0f} km clear from disruption)"
                safe_suppliers.append(s)

            node_obj = {
                "id": s_id,
                "name": s_name,
                "type": "supplier",
                "tier": s_tier,
                "status": status,
                "country": s_country,
                "city": s_city,
                "category": s_cat,
                "risk_score": base_risk if status == "safe" else min(95.0, base_risk + 40.0),
                "distance_km": round(distance_km, 1),
                "impact_reason": impact_reason
            }
            nodes.append(node_obj)
            node_id_map[s_id] = node_obj

        # 2. Add Downstream Manufacturing Assembly Plants
        exposed_plants_count = 0
        operational_plants_count = 0

        for p in (self._plants or [{"plant_id": "PL-01", "plant_name": "Austin Assembly Giga-Plant (USA)", "baseline_capacity_units_per_day": "1200"}]):
            p_id = p.get("plant_id", "PL-01")
            p_name = p.get("plant_name", "Regional Assembly Plant")

            # Check if any affected supplier feeds this plant via BOM
            is_plant_exposed = not is_healthy and (len(affected_suppliers) > 0)

            p_status = "exposed" if is_plant_exposed else "operational"
            if is_plant_exposed:
                exposed_plants_count += 1
                p_reason = f"Exposed to component shortages from {len(affected_suppliers)} affected upstream supplier(s)"
            else:
                operational_plants_count += 1
                p_reason = "Operating at baseline capacity — standard buffer available"

            plant_node = {
                "id": p_id,
                "name": p_name,
                "type": "plant",
                "status": p_status,
                "country": "Regional Final Assembly",
                "impact_reason": p_reason,
                "capacity_units": p.get("baseline_capacity_units_per_day", 1500)
            }
            nodes.append(plant_node)
            node_id_map[p_id] = plant_node

        # 3. Add Customer Destination Distribution Hub
        hub_id = "HUB-DEST"
        hub_status = "exposed" if not is_healthy and len(affected_suppliers) > 0 else "operational"
        dest_node = {
            "id": hub_id,
            "name": f"Destination Hub ({dest_clean})",
            "type": "hub",
            "status": hub_status,
            "country": dest_clean,
            "impact_reason": f"Customer delivery SLA at risk due to corridor disruption" if hub_status == "exposed" else "SLA deliveries on track"
        }
        nodes.append(dest_node)
        node_id_map[hub_id] = dest_node

        # 4. Construct Links (Tier 2 -> Tier 1 -> Assembly Plant -> Customer Hub)
        for s in self._suppliers:
            s_id = s.get("supplier_id")
            parent_id = s.get("depends_on_supplier_id", "").strip()

            # Tier 2 to Tier 1 connection
            if parent_id and parent_id in node_id_map and s_id in node_id_map:
                source_stat = node_id_map[s_id]["status"]
                target_stat = node_id_map[parent_id]["status"]
                link_stat = "disrupted" if (source_stat == "affected" or target_stat == "affected") else "active"
                links.append({
                    "source": s_id,
                    "target": parent_id,
                    "type": "tier2_tier1_bom",
                    "status": link_stat
                })

            # Tier 1 to Assembly Plant connection
            if s.get("tier") == "1" and s_id in node_id_map:
                source_stat = node_id_map[s_id]["status"]
                # Connect to first plant
                first_plant = nodes[len(self._suppliers)]["id"]
                link_stat = "disrupted" if source_stat == "affected" else "active"
                links.append({
                    "source": s_id,
                    "target": first_plant,
                    "type": "supply_corridor",
                    "status": link_stat
                })

        # Assembly Plant to Customer Hub connection
        for n in nodes:
            if n["type"] == "plant":
                p_stat = n["status"]
                links.append({
                    "source": n["id"],
                    "target": hub_id,
                    "type": "finished_goods_lane",
                    "status": "disrupted" if p_stat == "exposed" else "active"
                })

        return {
            "origin": origin_clean,
            "destination": dest_clean,
            "disruption_event": event_title,
            "is_healthy": is_healthy,
            "summary": {
                "total_suppliers": len(self._suppliers),
                "affected_suppliers_count": len(affected_suppliers),
                "safe_suppliers_count": len(safe_suppliers),
                "exposed_plants_count": exposed_plants_count,
                "operational_plants_count": operational_plants_count,
                "corridor_status": "Disrupted Lane" if len(affected_suppliers) > 0 and not is_healthy else "Clear Lane"
            },
            "nodes": nodes,
            "links": links
        }

    def _trace_tiers(self, supplier_name: str):
        name_lower = supplier_name.lower()
        matched_row = next(
            (s for s in self._suppliers if name_lower in s.get("supplier_name", "").lower()
             or s.get("supplier_name", "").lower() in name_lower or s.get("supplier_id", "").lower() == name_lower),
            None,
        )

        if not matched_row:
            return [], [], False

        tier = str(matched_row.get("tier", "")).strip()

        if tier == "1":
            tier1_suppliers = [matched_row]
            depends_on = matched_row.get("depends_on_supplier_id", "").strip()
            tier2_suppliers = [
                s for s in self._suppliers if s.get("supplier_id") == depends_on
            ] if depends_on else []
            return tier1_suppliers, tier2_suppliers, True

        if tier == "2":
            tier2_suppliers = [matched_row]
            tier1_suppliers = [
                s for s in self._suppliers
                if s.get("depends_on_supplier_id") == matched_row.get("supplier_id")
            ]
            return tier1_suppliers, tier2_suppliers, True

        return [matched_row], [], True

    def _traverse_bom(self, supplier_ids: set) -> list:
        if not supplier_ids:
            return []
        
        # 1. First check enterprise data loader index
        from backend.data_loader import get_data_loader
        dl = get_data_loader()
        
        results = []
        seen_parts = set()
        
        # Check by vendor ID in enterprise BOM
        for sid in supplier_ids:
            # Check vendor direct match or mapped vendor codes (e.g. V-00770)
            if sid in dl.bom_by_vendor:
                for entry in dl.bom_by_vendor[sid]:
                    pid = entry["part_id"]
                    if pid not in seen_parts:
                        seen_parts.add(pid)
                        fg_info = dl.finished_goods.get(entry["fg_id"], {})
                        results.append({
                            "part_id": pid,
                            "part_name": entry["part_name"],
                            "supplier_id": sid,
                            "product_id": entry["fg_id"],
                            "product_desc": fg_info.get("description", ""),
                            "program": fg_info.get("program", ""),
                            "criticality": entry["criticality"],
                            "qty_per": entry["qty_per"],
                            "bom_level": entry["bom_level"]
                        })

        if results:
            return results

        # 2. Check loaded legacy CSV rows
        if self._bom:
            legacy_matches = [
                row for row in self._bom 
                if row.get("supplier_id") in supplier_ids 
                or any(sid in row.get("supplier_id", "") for sid in supplier_ids)
                or row.get("part_primary_vendor_id") in supplier_ids
            ]
            if legacy_matches:
                return legacy_matches

        return []

    def _map_plant_exposure(self, part_ids: set) -> list:
        if not part_ids:
            return []

        from backend.data_loader import get_data_loader
        dl = get_data_loader()

        seen_plants = {}

        # 1. Map via enterprise BOM -> Finished Goods -> Plant ID
        for pid in part_ids:
            bom_entries = dl.bom_by_part.get(pid, [])
            for entry in bom_entries:
                fg_id = entry["fg_id"]
                fg_info = dl.finished_goods.get(fg_id, {})
                plant_id = fg_info.get("plant_id")
                if plant_id:
                    if plant_id not in seen_plants:
                        seen_plants[plant_id] = {
                            "plant_id": plant_id,
                            "plant_name": f"Assembly Plant {plant_id} ({fg_info.get('program', 'Modular Line')})",
                            "parts_exposed": [],
                            "fgs_impacted": []
                        }
                    if pid not in seen_plants[plant_id]["parts_exposed"]:
                        seen_plants[plant_id]["parts_exposed"].append(pid)
                    if fg_id not in seen_plants[plant_id]["fgs_impacted"]:
                        seen_plants[plant_id]["fgs_impacted"].append(fg_id)

        if seen_plants:
            return list(seen_plants.values())

        # 2. Check legacy plant_parts.csv
        if self._plant_parts:
            for row in self._plant_parts:
                if row.get("part_id") in part_ids:
                    plant_id = row.get("plant_id")
                    if plant_id not in seen_plants:
                        seen_plants[plant_id] = {
                            "plant_id": plant_id,
                            "plant_name": row.get("plant_name", f"Assembly Plant {plant_id}"),
                            "parts_exposed": [],
                        }
                    seen_plants[plant_id]["parts_exposed"].append(row.get("part_id"))

        return list(seen_plants.values())

    def _empty_result(self, disruption_id: str, reason: str) -> dict:
        return {
            "disruption_id": disruption_id,
            "supplier_hit": None,
            "tier1_suppliers": [],
            "tier2_suppliers": [],
            "suppliers_impacted_count": 0,
            "affected_parts": [],
            "parts_affected_count": 0,
            "exposed_plants": [],
            "plants_exposed_count": 0,
            "is_synthetic": False,
            "source": "No exposure computed",
            "note": reason,
        }

    def _synthetic_result(self, disruption_id: str, supplier_name: str, reason: str) -> dict:
        return {
            "disruption_id": disruption_id,
            "supplier_hit": supplier_name,
            "tier1_suppliers": [],
            "tier2_suppliers": [],
            "suppliers_impacted_count": 0,
            "affected_parts": [],
            "parts_affected_count": 0,
            "exposed_plants": [],
            "plants_exposed_count": 0,
            "is_synthetic": True,
            "source": "Synthetic/Placeholder — No Data Found",
            "note": reason,
        }

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Computes great-circle distance between two points in km."""
        r = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    @staticmethod
    def _load_csv(path: Path) -> list:
        if not path.exists():
            return []
        with open(path, mode="r", encoding="utf-8") as f:
            return list(csv.DictReader(f))
