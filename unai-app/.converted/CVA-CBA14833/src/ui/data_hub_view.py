"""
Data Sources & Ingestion Hub View
Enterprise control panel for switching between Synthetic Benchmark Data (demo mode),
Custom Flat Files & Local Folders (CSV / Excel / JSON / Parquet), and Relational Databases (SQL / SAP HANA).
"""

import streamlit as st
import pandas as pd
from pathlib import Path
from typing import Dict, Any

from src.data.manager import data_source_manager, DataSourceMode
from src.data.schema_mapper import SchemaMapper

# Standard entity names per agent
AGENT_ENTITIES = {
    "agent_01": [
        ("current_purchase_orders", "Current Purchase Orders (EKPO / Commitments)"),
        ("historical_po_deliveries", "Historical Delivery Receipts (EKBE / Variance)"),
        ("mrp_supply_context", "MRP Stock & Supply Context (MD04)"),
        ("downstream_impact", "Downstream Manufacturing Impact (AFPO)")
    ],
    "agent_02": [
        ("inventory_stock", "Physical & Storage Location Stock (MARD)"),
        ("quality_inspection", "Quality Inspection Holds (QALS)"),
        ("stock_reservations", "Production Reservations (RESB)"),
        ("batch_master", "Batch Expiry & SLED Master (MCHA)")
    ],
    "agent_03": [
        ("twin_plant_pairs", "Twin Plant Feasible Pairs"),
        ("plant_inventory", "Multi-Plant Network Stock"),
        ("transfer_costs", "Logistics & Freight Arbitrage Matrix")
    ],
    "agent_04": [
        ("open_purchase_orders", "Open Aged Purchase Orders"),
        ("gr_ir_ledger", "Goods Receipt / Invoice Receipt Ledger (GR/IR)")
    ],
    "agent_05": [
        ("mrp_demand_stream", "Gross Demand Stream Requirements"),
        ("order_amendments", "Schedule Line Change Audit Log")
    ]
}

AGENT_NAMES = {
    "agent_01": "Agent 1: Purchase Order Delivery Drift",
    "agent_02": "Agent 2: Phantom Inventory Usability",
    "agent_03": "Agent 3: Material Twin-Location Arbitrage",
    "agent_04": "Agent 4: PO Aging & Accrual Hygiene",
    "agent_05": "Agent 5: Requirement Contradiction"
}

def render_data_hub():
    """Renders the comprehensive Data Sources & Ingestion Hub."""
    st.markdown("""
    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); 
                padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border-left: 5px solid #38bdf8;">
        <h2 style="color: #f8fafc; margin: 0; font-size: 1.6rem;">📁 Data Sources & Ingestion Hub</h2>
        <p style="color: #94a3b8; margin: 0.4rem 0 0 0; font-size: 0.95rem;">
            Connect your company's own <b>Local Folders</b>, <b>Flat Files (CSV, Excel XLSX, JSON)</b>, or 
            <b>Live Relational Databases (PostgreSQL, MySQL, SQL Server, SAP HANA, SQLite)</b>, with instant 1-click fallback to 
            <b>Synthetic Benchmark Datasets</b> for risk-free testing.
        </p>
    </div>
    """, unsafe_allow_html=True)

    status = data_source_manager.get_status()
    current_mode = status["active_mode"]

    # Current Status Banner
    col_status, col_btn = st.columns([3, 1])
    with col_status:
        mode_color = "#10b981" if current_mode == "SYNTHETIC" else "#3b82f6" if current_mode == "CUSTOM_FLAT_FILE" else "#8b5cf6"
        detail_txt = (
            f"Active Directory: <code>{status['active_folder_path']}</code>" if (current_mode == "CUSTOM_FLAT_FILE" and status.get("active_folder_path")) else
            f"Connected DB: <code>{status.get('database_url_masked') or 'Configured'}</code>" if current_mode == "DATABASE" else
            "All 5 Agents running on calibrated synthetic SAP benchmark datasets."
        )
        st.markdown(f"""
        <div style="background: #1e293b; padding: 0.9rem 1.2rem; border-radius: 8px; border: 1px solid {mode_color}40;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <span style="color: #94a3b8; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em;">Active Ingestion Engine</span><br/>
                    <span style="color: {mode_color}; font-size: 1.15rem; font-weight: 700;">{status["display_name"]}</span>
                </div>
                <div style="text-align: right;">
                    <span style="color: #64748b; font-size: 0.78rem;">Adapter Class</span><br/>
                    <code style="color: #cbd5e1; background: #0f172a; padding: 0.2rem 0.5rem; border-radius: 4px;">{status["source_class"]}</code>
                </div>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #cbd5e1;">
                {detail_txt}
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_btn:
        st.write("")
        if st.button("🔄 Refresh Data Sources", use_container_width=True):
            st.rerun()

    st.write("")

    # 4 Main Tabs
    tab_synthetic, tab_flat, tab_db, tab_health = st.tabs([
        "🟢 Synthetic Benchmark Data (Demo)",
        "📂 Custom Files & Local Folder Ingestion",
        "🗄️ Relational Database (SQL / SAP HANA)",
        "🔍 Schema Health & Field Diagnostics"
    ])

    # -------------------------------------------------------------
    # TAB 1: Synthetic Benchmark Data
    # -------------------------------------------------------------
    with tab_synthetic:
        st.markdown("### 🟢 Synthetic Benchmark Datasets (Demo Mode)")
        st.markdown("""
        The platform includes production-grade synthetic SAP datasets mirroring realistic enterprise distribution curves, 
        designed for risk profiling, compliance evaluation, and instant demonstration without needing live credentials.
        """)

        col_syn_a, col_syn_b = st.columns([2, 1])
        with col_syn_a:
            st.info("""
            **Included Synthetic Datasets:**
            - **Agent 1:** 2,400+ PO Delivery Records (`EKPO`), Historical Supplier Receipts (`EKBE`), MRP Lines (`MD04`).
            - **Agent 2:** 1,800+ Physical Inventory Records (`MARD`), QA Blocks (`QALS`), Production Reservations (`RESB`).
            - **Agent 3:** Cross-plant twin location pairs with logistics transfer cost matrix.
            - **Agent 4:** Open commitment aged ledger with GR/IR balance discrepancy amounts.
            - **Agent 5:** Clustered MRP demand signal oscillations and schedule line revision logs.
            """)

        with col_syn_b:
            st.markdown("""
            <div style="background: #0f172a; padding: 1.2rem; border-radius: 8px; border: 1px solid #334155; text-align: center;">
                <span style="font-size: 2.5rem;">⚡</span>
                <h4 style="color: #f8fafc; margin: 0.5rem 0;">Zero Setup Demo</h4>
                <p style="color: #94a3b8; font-size: 0.85rem;">Instantly restore all agents to curated benchmark data.</p>
            </div>
            """, unsafe_allow_html=True)
            st.write("")
            if st.button("🚀 Activate Synthetic Benchmark Mode", type="primary", use_container_width=True):
                data_source_manager.set_mode(DataSourceMode.SYNTHETIC)
                st.success("✅ Synthetic Benchmark Mode activated! All agents are running on benchmark datasets.")
                st.rerun()

    # -------------------------------------------------------------
    # TAB 2: Custom Files & Local Folder Ingestion
    # -------------------------------------------------------------
    with tab_flat:
        st.markdown("### 📂 Custom Files & Local Folder Ingestion")
        st.markdown("""
        You can either **point to an entire local folder** containing your company's CSV/Excel exports, 
        or **upload individual files**. The built-in **SchemaMapper** automatically inspects files and maps technical 
        SAP fields (`EBELN`, `MATNR`, `WERKS`, `MENGE`, `LIFNR`) to canonical agent entities!
        """)

        # Option A: Ingest Whole Local Directory
        st.markdown("#### Option A: 📁 Ingest from a Local Directory Path")
        st.markdown("Specify a folder path on your machine where your company's SAP exports are stored:")
        
        folder_col1, folder_col2 = st.columns([3, 1])
        with folder_col1:
            folder_input = st.text_input(
                "Local Directory Path",
                value=status.get("active_folder_path") or str(Path("data/custom_uploads").resolve()),
                help="Absolute or relative path to a folder containing .csv, .xlsx, .json, or .parquet files."
            )
        with folder_col2:
            st.write("")
            st.write("")
            scan_folder_clicked = st.button("📂 Scan & Ingest Folder", type="primary", use_container_width=True)

        if scan_folder_clicked:
            if not folder_input.strip():
                st.error("Please enter a valid directory path.")
            else:
                try:
                    with st.spinner(f"Scanning and ingesting files from '{folder_input}'..."):
                        ingest_result = data_source_manager.ingest_custom_folder(folder_input)
                        tables = ingest_result.get("tables_ingested", [])
                        if tables:
                            st.success(f"✅ Ingested {len(tables)} tables from {ingest_result.get('files_scanned')} files! Custom Flat Files Mode activated.")
                            st.dataframe(pd.DataFrame(tables), use_container_width=True)
                        else:
                            st.warning(f"No compatible flat files (.csv, .xlsx, .json, .parquet) found in '{folder_input}'.")
                        st.rerun()
                except Exception as e:
                    st.error(f"❌ Failed to ingest directory: {e}")

        st.write("---")

        # Option B: Upload Individual / Multiple Files
        st.markdown("#### Option B: 📤 Drag & Drop File Upload")
        col_sel_agent, col_sel_table = st.columns(2)
        with col_sel_agent:
            target_agent = st.selectbox(
                "Target Agent",
                options=list(AGENT_NAMES.keys()),
                format_func=lambda k: AGENT_NAMES[k],
                key="custom_upload_agent"
            )
        with col_sel_table:
            available_entities = AGENT_ENTITIES[target_agent]
            target_table = st.selectbox(
                "Target Entity / Table",
                options=[e[0] for e in available_entities],
                format_func=lambda k: next(e[1] for e in available_entities if e[0] == k),
                key="custom_upload_table"
            )

        uploaded_file = st.file_uploader(
            f"Upload file for '{target_table}'",
            type=["csv", "xlsx", "xls", "json", "parquet"],
            help="Columns will be automatically normalized using SAP technical aliases.",
            key="custom_file_uploader"
        )

        if uploaded_file is not None:
            try:
                fname = uploaded_file.name.lower()
                if fname.endswith(".csv"):
                    df_preview = pd.read_csv(uploaded_file)
                elif fname.endswith((".xlsx", ".xls")):
                    df_preview = pd.read_excel(uploaded_file)
                elif fname.endswith(".json"):
                    df_preview = pd.read_json(uploaded_file)
                elif fname.endswith(".parquet"):
                    df_preview = pd.read_parquet(uploaded_file)
                else:
                    df_preview = pd.read_csv(uploaded_file)

                st.markdown("##### 🔍 Schema Inspection & Field Mapping")
                inspection = SchemaMapper.inspect_schema(list(df_preview.columns))

                col_stat1, col_stat2, col_stat3 = st.columns(3)
                col_stat1.metric("Rows Parsed", len(df_preview))
                col_stat2.metric("Total Columns", inspection["total_columns"])
                col_stat3.metric("SAP Match Rate", f"{int(inspection['recognized_ratio'] * 100)}%")

                if inspection["matched_canonical_fields"]:
                    st.write("**Detected SAP Field Mappings:**")
                    pill_html = " ".join([
                        f"<span style='background: #1e3a8a; color: #93c5fd; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; margin: 2px;'>{orig} ➜ <b>{canon}</b></span>"
                        for orig, canon in inspection["matched_canonical_fields"].items()
                    ])
                    st.markdown(pill_html, unsafe_allow_html=True)
                    st.write("")

                st.write("**Data Preview (First 5 Rows):**")
                st.dataframe(df_preview.head(5), use_container_width=True)

                if st.button("💾 Ingest & Activate This File", type="primary"):
                    uploaded_file.seek(0)
                    res = data_source_manager.custom_flat_file_source.ingest_file(
                        agent_id=target_agent,
                        table_name=target_table,
                        file_path_or_buffer=uploaded_file,
                        filename=uploaded_file.name
                    )
                    data_source_manager.set_mode(DataSourceMode.CUSTOM_FLAT_FILE)
                    st.success(f"✅ Ingested {res['rows']} rows for {target_table}! Custom Flat Files mode activated.")
                    st.rerun()

            except Exception as e:
                st.error(f"❌ Error parsing uploaded file: {e}")

        # Show currently uploaded custom tables
        uploaded_tables = data_source_manager.custom_flat_file_source.list_uploaded_tables()
        if uploaded_tables:
            st.write("---")
            st.markdown("#### 📋 Stored & Active Custom Flat Files")
            for ag, tables in uploaded_tables.items():
                st.write(f"- **{ag.upper()}**: {', '.join(tables)}")
            
            if current_mode != "CUSTOM_FLAT_FILE":
                if st.button("📂 Switch to Custom Flat Files Mode"):
                    data_source_manager.set_mode(DataSourceMode.CUSTOM_FLAT_FILE)
                    st.rerun()

    # -------------------------------------------------------------
    # TAB 3: Relational Database (SQL / SAP HANA)
    # -------------------------------------------------------------
    with tab_db:
        st.markdown("### 🗄️ Relational Database (SQL / SAP HANA)")
        st.markdown("""
        Connect directly to ANY relational database supported by SQLAlchemy or ODBC:
        **PostgreSQL**, **MySQL**, **Microsoft SQL Server**, **SAP HANA**, **Oracle**, or **SQLite**.
        """)

        saved_profiles = data_source_manager.get_saved_db_profiles()

        # Database Profile Selection
        profile_options = ["➕ Add New Database Connection"] + [p["name"] for p in saved_profiles]
        selected_profile = st.selectbox(
            "Database Connection Profiles",
            options=profile_options,
            key="db_profile_selector"
        )

        active_profile_data = next((p for p in saved_profiles if p["name"] == selected_profile), None)

        st.markdown("#### ⚙️ Connection Configuration")

        col_pname, col_dialect = st.columns(2)
        with col_pname:
            p_name = st.text_input(
                "Profile Name",
                value=active_profile_data["name"] if active_profile_data else "Production S4HANA Replica",
                help="Descriptive name to save and reuse this connection profile."
            )
        with col_dialect:
            db_dialect = st.selectbox(
                "Database Dialect",
                options=["PostgreSQL", "MySQL", "SAP HANA (ODBC / SQLA)", "Microsoft SQL Server", "SQLite (Local File)", "Generic Connection URL"],
                key="db_dialect_selector"
            )

        # Connection Mode Choice
        input_mode = st.radio(
            "Connection Input Method",
            ["Structured Fields (Host / Port / User / Pass)", "Direct Connection String (URL)"],
            horizontal=True
        )

        conn_url = ""
        if input_mode == "Direct Connection String (URL)":
            default_url = active_profile_data["connection_url"] if active_profile_data else (
                "postgresql://user:password@localhost:5432/sap_erp" if db_dialect == "PostgreSQL" else
                "mysql+pymysql://user:password@localhost:3306/sap_erp" if db_dialect == "MySQL" else
                "hana://user:password@host:30015/tenant" if "HANA" in db_dialect else
                "mssql+pyodbc://user:password@host/sap_erp?driver=ODBC+Driver+17+for+SQL+Server" if "SQL Server" in db_dialect else
                "sqlite:///data/sap_live.db"
            )
            conn_url = st.text_input(
                "SQLAlchemy Connection URL",
                value=default_url,
                help="Passwords are encrypted/masked in logs and user interfaces."
            )
        else:
            # Structured Form Builder
            c_host, c_port = st.columns([3, 1])
            with c_host:
                host = st.text_input("Database Host / IP", value="localhost" if "SQLite" not in db_dialect else "data/sap_live.db")
            with c_port:
                default_port = "5432" if db_dialect == "PostgreSQL" else "3306" if db_dialect == "MySQL" else "30015" if "HANA" in db_dialect else "1433" if "SQL Server" in db_dialect else "N/A"
                port = st.text_input("Port", value=default_port)

            c_db, c_user, c_pass = st.columns(3)
            with c_db:
                dbname = st.text_input("Database / Tenant Name", value="sap_erp" if "SQLite" not in db_dialect else "")
            with c_user:
                username = st.text_input("Username", value="sap_user" if "SQLite" not in db_dialect else "")
            with c_pass:
                password = st.text_input("Password", type="password", value="")

            # Construct URL
            if db_dialect == "PostgreSQL":
                conn_url = f"postgresql://{username}:{password}@{host}:{port}/{dbname}"
            elif db_dialect == "MySQL":
                conn_url = f"mysql+pymysql://{username}:{password}@{host}:{port}/{dbname}"
            elif "HANA" in db_dialect:
                conn_url = f"hana://{username}:{password}@{host}:{port}/{dbname}"
            elif "SQL Server" in db_dialect:
                conn_url = f"mssql+pyodbc://{username}:{password}@{host}:{port}/{dbname}?driver=ODBC+Driver+17+for+SQL+Server"
            else:
                conn_url = f"sqlite:///{host}"

        st.caption(f"Constructed Connection URL: `{SchemaMapper.canonical_column_name(conn_url[:30])}...`")

        col_test_btn, col_conn_btn = st.columns([1, 1])
        with col_test_btn:
            test_clicked = st.button("🔌 Test Connection Handshake", use_container_width=True)
        with col_conn_btn:
            connect_clicked = st.button("💾 Save Profile & Connect Database", type="primary", use_container_width=True)

        if test_clicked or connect_clicked:
            if not conn_url:
                st.error("Please provide valid connection parameters.")
            else:
                with st.spinner("Executing database handshake..."):
                    res = data_source_manager.configure_database(
                        connection_url=conn_url,
                        profile_name=p_name if p_name else None,
                        activate=connect_clicked
                    )
                    test = res.get("test_result", {})
                    if test.get("status") == "CONNECTED":
                        st.success(f"✅ Connection successful! Latency: {test.get('latency_ms')} ms. Discovered {test.get('total_tables')} tables and views.")
                        if test.get("discovered_tables"):
                            st.write(f"**Discovered Tables:** `{', '.join(test['discovered_tables'][:15])}`")
                        if connect_clicked:
                            st.success(f"✅ Saved profile '{p_name}' and activated Database Mode! Agents will query this database.")
                            st.rerun()
                    else:
                        st.error(f"❌ Connection failed: {test.get('error')}")

        st.write("---")
        st.markdown("#### 💡 Zero-Setup Local SQLite Database Generator")
        st.markdown("""
        If you want to immediately test live database features without configuring an external server, 
        click below to generate and populate a demo SQLite database:
        """)
        if st.button("🛠️ Create & Populate Demo SQLite Database (`data/demo_sap.db`)"):
            try:
                import sqlite3
                demo_db_path = "data/demo_sap.db"
                conn = sqlite3.connect(demo_db_path)
                pos_df = pd.DataFrame([
                    {"po_number": "PO-9001", "supplier_id": "SUP1001", "material_id": "MAT1001", "plant_id": "PL01", "order_quantity": 500, "promised_delivery_date": "2026-10-15"},
                    {"po_number": "PO-9002", "supplier_id": "SUP1004", "material_id": "MAT1002", "plant_id": "PL02", "order_quantity": 250, "promised_delivery_date": "2026-10-20"},
                    {"po_number": "PO-9003", "supplier_id": "SUP1002", "material_id": "MAT1003", "plant_id": "PL01", "order_quantity": 800, "promised_delivery_date": "2026-10-25"}
                ])
                pos_df.to_sql("current_purchase_orders", conn, if_exists="replace", index=False)
                conn.close()

                data_source_manager.configure_database(f"sqlite:///{demo_db_path}", profile_name="Demo Local SQLite", activate=True)
                st.success(f"✅ Demo SQLite database created and activated at `sqlite:///{demo_db_path}`!")
                st.rerun()
            except Exception as e:
                st.error(f"Failed to create demo SQLite database: {e}")

    # -------------------------------------------------------------
    # TAB 4: Schema Health & Field Diagnostics
    # -------------------------------------------------------------
    with tab_health:
        st.markdown("### 🔍 Schema Health & Field Diagnostics")
        st.markdown("Audit how the active data source maps to the required fields for each of the 5 agents:")

        active_source = data_source_manager.get_active_source()
        audit_rows = []

        for agent_key, entities in AGENT_ENTITIES.items():
            for entity_table, label in entities:
                try:
                    records = active_source.load_table(agent_key, entity_table)
                    row_count = len(records)
                    cols = list(records[0].keys()) if records else []
                    status_text = "🟢 Ready" if row_count > 0 else "🟡 Empty"
                except Exception:
                    row_count = 0
                    cols = []
                    status_text = "🔴 Error"

                audit_rows.append({
                    "Agent": AGENT_NAMES[agent_key].split(":")[0],
                    "Entity Table": entity_table,
                    "Description": label,
                    "Row Count": row_count,
                    "Columns Detected": len(cols),
                    "Status": status_text
                })

        audit_df = pd.DataFrame(audit_rows)
        st.dataframe(audit_df, use_container_width=True)
