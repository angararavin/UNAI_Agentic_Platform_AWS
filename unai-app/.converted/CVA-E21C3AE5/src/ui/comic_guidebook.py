"""
Comic-Style Agent Guidebook & Storyboard Engine
Provides an engaging, visual panel-by-panel comic workflow for each of the 5 SAP agents,
illustrating real-world supply chain crises, agent investigations, deterministic math, and resolutions.
"""

import streamlit as st

def get_comic_css():
    return """
    <style>
        .comic-banner {
            background: linear-gradient(135deg, #1e1b4b 0%, #31104b 50%, #4c0519 100%);
            border: 3px solid #0f172a;
            border-radius: 14px;
            box-shadow: 6px 6px 0px #0f172a;
            padding: 1.5rem 2rem;
            margin-bottom: 2rem;
            color: #ffffff;
        }
        .comic-title {
            font-family: 'Outfit', 'Inter', sans-serif !important;
            font-size: 2.2rem !important;
            font-weight: 800 !important;
            color: #fde047 !important;
            text-shadow: 2px 2px 0px #000000;
            margin: 0 0 0.5rem 0;
            letter-spacing: -0.01em;
        }
        .comic-subtitle {
            color: #e2e8f0;
            font-size: 1.05rem;
            margin: 0;
            line-height: 1.5;
        }
        .comic-panel {
            background: #ffffff;
            border: 3px solid #0f172a;
            border-radius: 12px;
            box-shadow: 5px 5px 0px #0f172a;
            padding: 1.25rem;
            margin-bottom: 1.5rem;
            position: relative;
            transition: transform 0.15s ease;
        }
        .comic-panel:hover {
            transform: translateY(-2px);
            box-shadow: 7px 7px 0px #0f172a;
        }
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.6rem;
            margin-bottom: 0.8rem;
        }
        .panel-num {
            background: #0f172a;
            color: #fde047;
            font-weight: 800;
            font-size: 0.85rem;
            padding: 3px 10px;
            border-radius: 6px;
            text-transform: uppercase;
        }
        .sfx-badge {
            font-weight: 900;
            font-size: 0.95rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 3px 10px;
            border-radius: 20px;
            box-shadow: 2px 2px 0px rgba(0,0,0,0.2);
        }
        .sfx-crisis { background: #fee2e2; color: #991b1b; border: 1.5px solid #ef4444; }
        .sfx-investigate { background: #e0f2fe; color: #075985; border: 1.5px solid #0284c7; }
        .sfx-math { background: #fef3c7; color: #92400e; border: 1.5px solid #f59e0b; }
        .sfx-action { background: #dcfce7; color: #166534; border: 1.5px solid #22c55e; }
        .sfx-resolve { background: #f3e8ff; color: #6b21a8; border: 1.5px solid #a855f7; }

        .bubble {
            border-radius: 12px;
            padding: 0.85rem 1.1rem;
            margin: 0.6rem 0;
            font-size: 0.92rem;
            line-height: 1.5;
            position: relative;
        }
        .bubble-speaker {
            font-weight: 700;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 3px;
            display: block;
        }
        .bubble-human {
            background: #f8fafc;
            border: 2px solid #64748b;
            color: #1e293b;
        }
        .bubble-erp {
            background: #f1f5f9;
            border: 2px solid #475569;
            color: #0f172a;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
        }
        .bubble-agent {
            background: #eff6ff;
            border: 2px solid #2563eb;
            color: #1e3a8a;
        }
        .bubble-policy {
            background: #fffbeb;
            border: 2px solid #d97706;
            color: #78350f;
        }
        .bubble-action {
            background: #f0fdf4;
            border: 2px solid #16a34a;
            color: #14532d;
        }

        .use-case-card {
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            border: 2px solid #cbd5e1;
            border-radius: 10px;
            padding: 1.25rem;
            margin-top: 1rem;
        }
        .use-case-tag {
            background: #0284c7;
            color: #ffffff;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 4px;
            text-transform: uppercase;
        }
    </style>
    """

def _guidebook_css():
    return """
    <style>
    .gb-hero {
        background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #312e81 100%);
        border-radius: 20px;
        padding: 36px 40px;
        color: #fff;
        margin-bottom: 28px;
        box-shadow: 0 20px 40px -10px rgba(15,23,42,0.3);
        border: 1px solid rgba(255,255,255,0.08);
        position: relative;
        overflow: hidden;
    }
    .gb-hero::before {
        content: "";
        position: absolute;
        top: -40px; right: -40px;
        width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%);
        border-radius: 50%;
    }
    .gb-hero h1 { color: #fff !important; font-size: 2rem; margin-bottom: 8px; }
    .gb-hero p  { color: #94a3b8; font-size: 1.05rem; margin: 0; line-height: 1.6; }
    .gb-hero-tag {
        display: inline-block;
        background: rgba(253,224,71,0.15);
        border: 1px solid rgba(253,224,71,0.4);
        color: #fde047;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 14px;
    }

    /* Agent Card */
    .agent-card {
        background: #fff;
        border: 1.5px solid #e2e8f0;
        border-radius: 16px;
        padding: 22px;
        height: 100%;
        position: relative;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        overflow: hidden;
    }
    .agent-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 16px 32px -8px rgba(0,0,0,0.12);
        border-color: #93c5fd;
    }
    .agent-card-accent {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 4px;
        border-radius: 16px 16px 0 0;
    }
    .agent-icon {
        font-size: 2.4rem;
        margin-bottom: 12px;
        display: block;
    }
    .agent-name {
        font-family: 'Outfit', sans-serif;
        font-size: 1.08rem;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 4px;
    }
    .agent-tagline {
        font-size: 0.82rem;
        font-weight: 600;
        color: #6366f1;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 10px;
    }
    .agent-problem {
        font-size: 0.88rem;
        color: #475569;
        line-height: 1.55;
        margin-bottom: 12px;
    }
    .agent-outcome {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.82rem;
        color: #166534;
        font-weight: 600;
        margin-bottom: 10px;
    }
    .agent-when {
        font-size: 0.78rem;
        color: #94a3b8;
        font-style: italic;
        line-height: 1.45;
    }
    .agent-badge {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 10px;
    }
    .badge-purchasing { background: #eff6ff; color: #1d4ed8; }
    .badge-warehouse  { background: #faf5ff; color: #7e22ce; }
    .badge-logistics  { background: #fff7ed; color: #c2410c; }
    .badge-finance    { background: #ecfdf5; color: #047857; }
    .badge-planning   { background: #fef9c3; color: #854d0e; }

    /* Decision Guide */
    .decision-card {
        background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
        border: 1.5px solid #e2e8f0;
        border-left: 5px solid;
        border-radius: 12px;
        padding: 18px 20px;
        margin-bottom: 14px;
        transition: transform 0.15s ease;
    }
    .decision-card:hover { transform: translateX(4px); }
    .decision-q {
        font-family: 'Outfit', sans-serif;
        font-size: 0.95rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 6px;
    }
    .decision-a {
        font-size: 0.85rem;
        color: #475569;
        line-height: 1.5;
    }
    .decision-agent-tag {
        display: inline-block;
        margin-top: 8px;
        background: #0f172a;
        color: #fde047;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 4px;
        letter-spacing: 0.04em;
    }

    /* Role card */
    .role-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px 18px;
        margin-bottom: 10px;
    }
    .role-name {
        font-weight: 700;
        font-size: 0.88rem;
        color: #0f172a;
        margin-bottom: 4px;
    }
    .role-desc {
        font-size: 0.82rem;
        color: #64748b;
        line-height: 1.5;
    }

    .section-header {
        font-family: 'Outfit', sans-serif;
        font-size: 1.4rem;
        font-weight: 800;
        color: #0f172a;
        margin: 28px 0 6px 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .section-sub {
        font-size: 0.9rem;
        color: #64748b;
        margin-bottom: 18px;
    }
    </style>
    """

def render_comic_guidebook():
    """Renders the comprehensive Agent Operations Guidebook with business-friendly content and comic storyboards."""
    st.markdown(get_comic_css(), unsafe_allow_html=True)
    st.markdown(_guidebook_css(), unsafe_allow_html=True)

    # ── HERO BANNER ────────────────────────────────────────────────────────────
    st.markdown("""
    <div class="gb-hero">
        <div class="gb-hero-tag">📖 Agent Operations Guidebook — Non-Technical Edition</div>
        <h1>🏭 Your Complete Guide to the 5 SAP AI Agents</h1>
        <p>
            This guide explains <b style="color:#fff;">what each agent does</b>, <b style="color:#fff;">who should use it</b>,
            <b style="color:#fff;">when to trigger it</b>, and <b style="color:#fff;">what business problem it solves</b> —
            in plain language anyone can understand.
            No technical background required.
        </p>
    </div>
    """, unsafe_allow_html=True)

    # ── TAB NAVIGATION ─────────────────────────────────────────────────────────
    # Pre-initialize defaults so comic rendering below can reference them safely
    agent_story = "📖 Issue #1: The Case of the Over-Optimistic Supplier (Agent 1: PO Promise Drift)"
    presentation_view = "🎨 Comic Storyboard View"

    tab_overview, tab_decide, tab_comic = st.tabs([
        "🗺️  Meet the Agents",
        "🧭  Which Agent to Use?",
        "🎨  Comic Storyboards & Architecture"
    ])

    # ==========================================================================
    # TAB 1: MEET THE AGENTS — Business-Friendly Agent Cards
    # ==========================================================================
    with tab_overview:
        st.markdown('<div class="section-header">🤖 Your 5 AI Agents at a Glance</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">Each agent is a specialist. Think of them like different doctors in a hospital — you go to the right specialist for the right problem.</div>', unsafe_allow_html=True)

        # Row 1: Agents 1 & 2
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("""
            <div class="agent-card">
                <div class="agent-card-accent" style="background: linear-gradient(90deg,#2563eb,#60a5fa);"></div>
                <span class="agent-icon">🚚</span>
                <div class="agent-name">Agent 1 — The Delivery Truth Teller</div>
                <div class="agent-tagline">PO Promise Drift Intelligence</div>
                <div class="agent-problem">
                    <b>The Problem it Solves:</b><br>
                    Your supplier promised delivery by Friday. SAP says "On Time." But your factory floor will run out of parts by Wednesday.
                    This agent exposes the gap between <i>what suppliers promise</i> and <i>what they actually deliver</i>
                    — based on 237+ real historical shipments.
                </div>
                <div class="agent-outcome">✅ Business Outcome: Prevents assembly line shutdowns by triggering buyer action 3–5 days before a stockout occurs.</div>
                <div class="agent-when">
                    <b>Use when:</b> You suspect a supplier might be late and want to know the real probability of on-time delivery — not just what they promised.
                </div>
                <div><span class="agent-badge badge-purchasing">📦 Purchasing / Procurement</span></div>
            </div>
            """, unsafe_allow_html=True)

        with c2:
            st.markdown("""
            <div class="agent-card">
                <div class="agent-card-accent" style="background: linear-gradient(90deg,#7c3aed,#a78bfa);"></div>
                <span class="agent-icon">👻</span>
                <div class="agent-name">Agent 2 — The Phantom Inventory Hunter</div>
                <div class="agent-tagline">Ghost Stock & Warehouse Reality Check</div>
                <div class="agent-problem">
                    <b>The Problem it Solves:</b><br>
                    SAP shows 1,000 units in stock. But 400 are blocked in Quality Inspection, 250 are damaged and awaiting write-off,
                    and 180 are reserved for another plant. In reality, only 170 units are available.
                    This agent cuts through the numbers to show your <i>true usable inventory</i>.
                </div>
                <div class="agent-outcome">✅ Business Outcome: Reveals hidden inventory gaps before they cause production halts. Prevents last-minute rush orders.</div>
                <div class="agent-when">
                    <b>Use when:</b> SAP shows enough stock but the warehouse floor tells a different story — or you want to clear blocked, expired, or ghost inventory.
                </div>
                <div><span class="agent-badge badge-warehouse">🏭 Warehouse / Quality</span></div>
            </div>
            """, unsafe_allow_html=True)

        st.write("")
        # Row 2: Agents 3 & 4
        c3, c4 = st.columns(2)
        with c3:
            st.markdown("""
            <div class="agent-card">
                <div class="agent-card-accent" style="background: linear-gradient(90deg,#ea580c,#fb923c);"></div>
                <span class="agent-icon">🏗️</span>
                <div class="agent-name">Agent 3 — The Inter-Plant Matchmaker</div>
                <div class="agent-tagline">Sister Plant Stock Arbitrage</div>
                <div class="agent-problem">
                    <b>The Problem it Solves:</b><br>
                    Plant A is running out of a critical part. Plant B, 200 km away, has 300 extra units sitting idle.
                    The question: Is it cheaper to ship from Plant B, or place a new purchase order?
                    This agent calculates the economics in real time — freight cost vs. avoided downtime cost.
                </div>
                <div class="agent-outcome">✅ Business Outcome: Avoids expensive emergency purchases by utilizing existing inventory across your own plant network. Typical savings: ₹15,000–₹40,000 per event.</div>
                <div class="agent-when">
                    <b>Use when:</b> One plant is short on material and you want to know if another plant in your network can cover the gap faster or cheaper than a new order.
                </div>
                <div><span class="agent-badge badge-logistics">🚛 Logistics / Supply Planning</span></div>
            </div>
            """, unsafe_allow_html=True)

        with c4:
            st.markdown("""
            <div class="agent-card">
                <div class="agent-card-accent" style="background: linear-gradient(90deg,#059669,#34d399);"></div>
                <span class="agent-icon">🧟</span>
                <div class="agent-name">Agent 4 — The Zombie PO Terminator</div>
                <div class="agent-tagline">Aging Purchase Order Cleanup</div>
                <div class="agent-problem">
                    <b>The Problem it Solves:</b><br>
                    Your company has hundreds of purchase orders that were created months ago and never fulfilled —
                    yet they still sit open in SAP, tying up financial commitments, confusing MRP, and blocking goods receipt.
                    These "Zombie POs" silently consume working capital and distort inventory planning.
                </div>
                <div class="agent-outcome">✅ Business Outcome: Recovers trapped working capital by closing stale POs. Cleans up SAP commitments to give Finance accurate liability numbers.</div>
                <div class="agent-when">
                    <b>Use when:</b> Quarter-end cleanup, financial audits, or MRP accuracy improvement are priorities. Also trigger when buyers report "SAP commitments don't match reality."
                </div>
                <div><span class="agent-badge badge-finance">💰 Finance / Controlling</span></div>
            </div>
            """, unsafe_allow_html=True)

        st.write("")
        # Row 3: Agent 5 — full width
        st.markdown("""
        <div class="agent-card" style="margin-bottom: 20px;">
            <div class="agent-card-accent" style="background: linear-gradient(90deg,#d97706,#fbbf24);"></div>
            <div style="display:flex; gap: 20px; align-items: flex-start;">
                <div style="flex-shrink:0;">
                    <span class="agent-icon" style="font-size: 3rem;">🌪️</span>
                </div>
                <div style="flex:1;">
                    <div class="agent-name" style="font-size: 1.15rem;">Agent 5 — The MRP Chaos Tamer</div>
                    <div class="agent-tagline">Requirement Contradiction & Schedule Freeze Guardian</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px;">
                        <div>
                            <div class="agent-problem">
                                <b>The Problem it Solves:</b><br>
                                MRP (Material Requirements Planning) can "flap" — creating and deleting planned orders repeatedly due to conflicting forecasts,
                                safety stock changes, and late deliveries all happening at once. This confuses planners, wastes buyer time,
                                and creates anxiety across the supply chain.
                                This agent detects the contradiction, freezes the planning horizon, and recommends a stable resolution.
                            </div>
                        </div>
                        <div>
                            <div class="agent-outcome">✅ Business Outcome: Stops MRP-induced chaos. Gives Master Schedulers a single, stable plan instead of contradictory signals every hour.</div>
                            <div class="agent-when" style="margin-top: 8px;">
                                <b>Use when:</b> Planners complain that SAP keeps creating and deleting orders for the same material.
                                Or when a production schedule keeps shifting for no clear reason.
                            </div>
                            <div><span class="agent-badge badge-planning">📅 Production Planning / MRP</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # ==========================================================================
    # TAB 2: WHICH AGENT TO USE? — Decision Guide
    # ==========================================================================
    # ==========================================================================
    # TAB 2: WHICH AGENT TO USE? — Unified Decision Hub (By Problem, Role & Matrix)
    # ==========================================================================
    with tab_decide:
        st.markdown('<div class="section-header">🧭 Which Agent Should I Use?</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">Choose your preferred way to find the right agent: by your immediate problem, by your job role, or via the full comparison matrix.</div>', unsafe_allow_html=True)

        decide_mode = st.radio(
            "How would you like to decide?",
            ["🚨 By Current Situation / Problem", "👤 By Your Job Role", "📊 Quick Comparison Matrix"],
            horizontal=True,
            key="guidebook_decide_mode"
        )

        if "Situation" in decide_mode:

            scenario = st.selectbox(
                "What is your current situation?",
                [
                    "🔍 Choose your situation...",
                    "🚨 My factory might run out of parts because a supplier could be late",
                    "📦 SAP says we have enough stock, but the warehouse floor disagrees",
                    "🏗️ One plant is short on material — another plant might have extra",
                    "💸 Finance says our open PO commitments are too high / inaccurate",
                    "🔄 MRP keeps creating and deleting the same planned orders (flapping)",
                    "⚠️ An anomaly alert fired and I don't know which agent to run",
                    "🎯 I want to run a full health check across all supply chain areas",
                ],
                key="decision_guide_selector"
            )

            if "factory might run out" in scenario:
                st.markdown("""
                <div class="decision-card" style="border-left-color: #2563eb;">
                    <div class="decision-q">🚚 Situation: Potential Supplier Delay → Factory Stockout Risk</div>
                    <div class="decision-a">
                        Your factory has limited buffer stock and a supplier delivery is coming up.
                        Even though SAP shows the PO as "on schedule," you're not confident the goods will arrive on time.<br><br>
                        <b>What Agent 1 will do for you:</b>
                        <ul style="margin: 8px 0 0 16px; line-height: 1.8;">
                            <li>Pull the supplier's <i>actual</i> delivery history (not what they promised)</li>
                            <li>Calculate the probability that this specific delivery will be late</li>
                            <li>Tell you exactly how many days of factory cover you have left</li>
                            <li>Recommend whether to call the supplier, place an emergency order, or simply monitor</li>
                        </ul>
                    </div>
                    <div><span class="decision-agent-tag">→ Run Agent 1: Delivery Truth Teller</span></div>
                </div>
                """, unsafe_allow_html=True)

            elif "warehouse floor disagrees" in scenario:
                st.markdown("""
                <div class="decision-card" style="border-left-color: #7c3aed;">
                    <div class="decision-q">👻 Situation: SAP Stock Numbers Don't Match Physical Reality</div>
                    <div class="decision-a">
                        Your system says you have plenty of stock, but when production asks for materials,
                        the warehouse says "we don't actually have that much available."
                        Common causes: blocked batches, QA holds, reserved-but-not-moved stock, expired materials.<br><br>
                        <b>What Agent 2 will do for you:</b>
                        <ul style="margin: 8px 0 0 16px; line-height: 1.8;">
                            <li>Separate "physically present" stock from "operationally usable" stock</li>
                            <li>Identify blocked, expired, or quality-held inventory that can't be used</li>
                            <li>Calculate the true gap between what SAP reports and what production can actually consume</li>
                            <li>Recommend unblocking, write-off, or emergency replenishment actions</li>
                        </ul>
                    </div>
                    <div><span class="decision-agent-tag">→ Run Agent 2: Phantom Inventory Hunter</span></div>
                </div>
                """, unsafe_allow_html=True)

            elif "another plant might have extra" in scenario:
                st.markdown("""
                <div class="decision-card" style="border-left-color: #ea580c;">
                    <div class="decision-q">🏗️ Situation: Borrow from Another Plant vs. Buy New?</div>
                    <div class="decision-a">
                        Plant A is short. You suspect Plant B might have excess inventory.
                        The agent will run the economic calculation: Is it worth shipping internally, or is a new purchase order cheaper/faster?<br><br>
                        <b>What Agent 3 will do for you:</b>
                        <ul style="margin: 8px 0 0 16px; line-height: 1.8;">
                            <li>Check all sister plants for available surplus inventory</li>
                            <li>Calculate the freight cost of a stock transfer order</li>
                            <li>Compare transfer cost vs. cost of a new purchase order + delivery lead time</li>
                            <li>Recommend whether to transfer or buy, and generate the transfer order proposal</li>
                        </ul>
                    </div>
                    <div><span class="decision-agent-tag">→ Run Agent 3: Inter-Plant Matchmaker</span></div>
                </div>
                """, unsafe_allow_html=True)

            elif "commitments are too high" in scenario:
                st.markdown("""
                <div class="decision-card" style="border-left-color: #059669;">
                    <div class="decision-q">💸 Situation: Old/Stale Purchase Orders Blocking Working Capital</div>
                    <div class="decision-a">
                        Finance is asking why open PO commitments are so high.
                        Or buyers are telling you SAP has hundreds of old orders that were never fulfilled.
                        These "zombie" POs distort your financial commitments and confuse Material Requirements Planning.<br><br>
                        <b>What Agent 4 will do for you:</b>
                        <ul style="margin: 8px 0 0 16px; line-height: 1.8;">
                            <li>Scan all open POs and flag those that have been open too long without goods receipt</li>
                            <li>Classify each as: Cancel, Reschedule, Expedite, or Keep</li>
                            <li>Calculate how much working capital is locked in stale commitments</li>
                            <li>Create a prioritized action list for the purchasing team</li>
                        </ul>
                    </div>
                    <div><span class="decision-agent-tag">→ Run Agent 4: Zombie PO Terminator</span></div>
                </div>
                """, unsafe_allow_html=True)

            elif "flapping" in scenario or "MRP keeps creating" in scenario:
                st.markdown("""
                <div class="decision-card" style="border-left-color: #d97706;">
                    <div class="decision-q">🌪️ Situation: MRP Is Generating Contradictory/Unstable Plans</div>
                    <div class="decision-a">
                        Planners are seeing planned orders appear and disappear. The same material keeps getting flagged.
                        Procurement doesn't know what to buy because the plan keeps changing every MRP run.<br><br>
                        <b>What Agent 5 will do for you:</b>
                        <ul style="margin: 8px 0 0 16px; line-height: 1.8;">
                            <li>Identify the conflicting signals causing MRP instability (duplicate requirements, wrong safety stock, late supply)</li>
                            <li>Determine if the contradiction is inside or outside the planning "freeze fence"</li>
                            <li>Recommend a stable, consolidated plan to replace the conflicting signals</li>
                            <li>Route to the Master Scheduler for final sign-off before any changes are committed</li>
                        </ul>
                    </div>
                    <div><span class="decision-agent-tag">→ Run Agent 5: MRP Chaos Tamer</span></div>
                </div>
                """, unsafe_allow_html=True)

            elif "anomaly alert fired" in scenario:
                st.markdown("""
                <div class="decision-card" style="border-left-color: #ef4444;">
                    <div class="decision-q">⚠️ Situation: An Anomaly Was Detected — Which Agent to Run?</div>
                    <div class="decision-a">
                        The Live Anomaly Triage Feed shows a red alert. Here's how to read it:<br><br>
                        <table style="width:100%; font-size:0.85rem; border-collapse: collapse;">
                            <tr style="background:#f8fafc;">
                                <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Alert Type</th>
                                <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Run This Agent</th>
                            </tr>
                            <tr><td style="padding:8px; border:1px solid #e2e8f0;">🚚 "PO Drift" or "Supplier Delay"</td><td style="padding:8px; border:1px solid #e2e8f0; color:#2563eb; font-weight:600;">Agent 1 — Delivery Truth Teller</td></tr>
                            <tr style="background:#f8fafc;"><td style="padding:8px; border:1px solid #e2e8f0;">👻 "Phantom Stock" or "Blocked Inventory"</td><td style="padding:8px; border:1px solid #e2e8f0; color:#7c3aed; font-weight:600;">Agent 2 — Phantom Hunter</td></tr>
                            <tr><td style="padding:8px; border:1px solid #e2e8f0;">🏗️ "Twin Location" or "Transfer Opportunity"</td><td style="padding:8px; border:1px solid #e2e8f0; color:#ea580c; font-weight:600;">Agent 3 — Matchmaker</td></tr>
                            <tr style="background:#f8fafc;"><td style="padding:8px; border:1px solid #e2e8f0;">🧟 "Aging PO" or "Zombie Commitment"</td><td style="padding:8px; border:1px solid #e2e8f0; color:#059669; font-weight:600;">Agent 4 — PO Terminator</td></tr>
                            <tr><td style="padding:8px; border:1px solid #e2e8f0;">🌪️ "MRP Contradiction" or "Flapping Orders"</td><td style="padding:8px; border:1px solid #e2e8f0; color:#d97706; font-weight:600;">Agent 5 — Chaos Tamer</td></tr>
                        </table>
                        <br>Navigate to <b>Agent Investigation Cockpit</b> (in the sidebar) and select the matching agent.
                    </div>
                </div>
                """, unsafe_allow_html=True)

            elif "full health check" in scenario:
                st.markdown("""
                <div class="decision-card" style="border-left-color: #6366f1;">
                    <div class="decision-q">🎯 Situation: Running a Full Supply Chain Health Check</div>
                    <div class="decision-a">
                        For a complete picture, run agents in this order:<br><br>
                        <ol style="line-height: 2.2; font-size: 0.88rem;">
                            <li><b>Start with Agent 1</b> — Identify all at-risk incoming deliveries</li>
                            <li><b>Then Agent 2</b> — Verify actual usable stock at each plant</li>
                            <li><b>Then Agent 3</b> — Check if surplus at one plant can cover deficits at another</li>
                            <li><b>Then Agent 4</b> — Clean up zombie POs to free working capital</li>
                            <li><b>Finally Agent 5</b> — Stabilize the MRP plan with all the above corrected</li>
                        </ol>
                        This sequence ensures each agent builds on the corrected picture from the previous one.
                        Go to <b>Live Anomaly Triage</b> to see all active issues ranked by financial priority.
                    </div>
                </div>
                """, unsafe_allow_html=True)

            else:
                st.info("👆 Select a situation above to get personalized guidance on which agent to use.")

        # ==========================================================================
        # TAB 3: BY YOUR ROLE

        elif "Role" in decide_mode:

            role = st.selectbox(
                "What is your role?",
                [
                    "Select your role...",
                    "🛒 Purchasing Manager / Buyer",
                    "🏭 Plant Manager / Production Supervisor",
                    "📦 Warehouse / Stores Manager",
                    "📊 Supply Chain Planner / MRP Controller",
                    "💰 Finance / Controlling Manager",
                    "🎯 Supply Chain Director / VP Operations",
                ],
                key="role_selector"
            )

            role_data = {
                "Purchasing Manager / Buyer": {
                    "primary": ["Agent 1 — Delivery Truth Teller", "Agent 4 — Zombie PO Terminator"],
                    "secondary": ["Agent 3 — Inter-Plant Matchmaker"],
                    "daily": "Use Agent 1 every morning to check if any incoming deliveries are at risk. Use Agent 4 at month-end to clean stale POs and free commitments.",
                    "kpi": "On-Time Delivery Rate, Supplier SLA Compliance, Open Commitment Value"
                },
                "Plant Manager / Production Supervisor": {
                    "primary": ["Agent 1 — Delivery Truth Teller", "Agent 2 — Phantom Inventory Hunter"],
                    "secondary": ["Agent 3 — Inter-Plant Matchmaker"],
                    "daily": "Check Agent 1 daily for any delivery risks that could halt your production line. Use Agent 2 when the warehouse count doesn't match what production is consuming.",
                    "kpi": "Production Uptime %, Line Stoppage Events, Material Availability Rate"
                },
                "Warehouse / Stores Manager": {
                    "primary": ["Agent 2 — Phantom Inventory Hunter"],
                    "secondary": ["Agent 3 — Inter-Plant Matchmaker"],
                    "daily": "Run Agent 2 when you suspect blocked or expired stock is inflating SAP numbers. Use Agent 3 to propose inter-plant transfers instead of emergency purchases.",
                    "kpi": "Inventory Accuracy %, Blocked Stock Value, Write-Off Rate"
                },
                "Supply Chain Planner / MRP Controller": {
                    "primary": ["Agent 5 — MRP Chaos Tamer", "Agent 3 — Inter-Plant Matchmaker"],
                    "secondary": ["Agent 1 — Delivery Truth Teller"],
                    "daily": "Use Agent 5 whenever the plan is unstable or buyers are complaining about contradictory SAP signals. Agent 3 helps you balance stock across the plant network before triggering new POs.",
                    "kpi": "MRP Stability Index, Planning Adherence %, Expediting Events"
                },
                "Finance / Controlling Manager": {
                    "primary": ["Agent 4 — Zombie PO Terminator"],
                    "secondary": ["Agent 2 — Phantom Inventory Hunter"],
                    "daily": "Run Agent 4 at quarter-end to clean open PO commitments and get accurate liability numbers. Agent 2 helps validate inventory valuations by separating usable from blocked stock.",
                    "kpi": "Open Commitment Accuracy, Working Capital Released, Inventory Valuation Accuracy"
                },
                "Supply Chain Director / VP Operations": {
                    "primary": ["All 5 Agents — via Executive Analytics Dashboard"],
                    "secondary": [],
                    "daily": "Go to 'Executive Analytics' for a real-time overview of risk exposure, agent performance, and capital defended across all five domains. Use the Triage Feed as your daily situational awareness briefing.",
                    "kpi": "Total Risk Exposure (₹), Agent Decision Accuracy %, Economic Value Defended"
                }
            }

            role_key = role.split("  ")[-1].strip() if "  " in role else role.replace("🛒 ", "").replace("🏭 ", "").replace("📦 ", "").replace("📊 ", "").replace("💰 ", "").replace("🎯 ", "")
            matched = next((v for k, v in role_data.items() if k in role), None)

            if matched:
                st.markdown(f"""
                <div class="role-card" style="border-left: 4px solid #6366f1;">
                    <div class="role-name">🎯 Your Primary Agents</div>
                    <div class="role-desc">{"  |  ".join(matched['primary'])}</div>
                </div>
                """, unsafe_allow_html=True)
                if matched["secondary"]:
                    st.markdown(f"""
                    <div class="role-card" style="border-left: 4px solid #94a3b8;">
                        <div class="role-name">📌 Also Useful For You</div>
                        <div class="role-desc">{"  |  ".join(matched['secondary'])}</div>
                    </div>
                    """, unsafe_allow_html=True)
                st.markdown(f"""
                <div class="role-card" style="border-left: 4px solid #10b981;">
                    <div class="role-name">📅 Suggested Daily Workflow</div>
                    <div class="role-desc">{matched['daily']}</div>
                </div>
                <div class="role-card" style="border-left: 4px solid #f59e0b;">
                    <div class="role-name">📊 KPIs This Platform Helps You Improve</div>
                    <div class="role-desc">{matched['kpi']}</div>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.info("👆 Select your role above to see personalized recommendations.")

        # ==========================================================================
        # TAB 4: COMIC STORYBOARDS (original content preserved)

        else:
            st.markdown("""
            <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin-top: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h4 style="margin: 0 0 1rem 0; color: #1e293b; font-family: 'Outfit', sans-serif;">📊 Cross-Agent Capability & Decision Matrix</h4>
                <table style="width: 100%; font-size: 0.88rem; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #0f172a; color: #f8fafc;">
                            <th style="padding: 10px; text-align: left; border-radius: 6px 0 0 0;">Agent</th>
                            <th style="padding: 10px; text-align: left;">Role & Analogy</th>
                            <th style="padding: 10px; text-align: left;">Typical Business Trigger</th>
                            <th style="padding: 10px; text-align: left;">SAP Objects</th>
                            <th style="padding: 10px; text-align: left; border-radius: 0 6px 0 0;">Risk Prevented</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #e2e8f0; background: #eff6ff;">
                            <td style="padding: 10px; font-weight: 700; color: #1e40af;">🚚 Agent 1: Delivery Truth Teller</td>
                            <td style="padding: 10px;">PO Promise Drift<br><span style="font-size:0.75rem; color:#64748b;">(GPS traffic recalculator)</span></td>
                            <td style="padding: 10px;">Supplier promises on-time but has history of late deliveries</td>
                            <td style="padding: 10px; font-family: monospace;">EKPO, EKET, EKBE</td>
                            <td style="padding: 10px; color: #166534; font-weight: 600;">Assembly line stockout</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0; background: #faf5ff;">
                            <td style="padding: 10px; font-weight: 700; color: #6b21a8;">👻 Agent 2: Phantom Inventory Hunter</td>
                            <td style="padding: 10px;">Stock Reality Check<br><span style="font-size:0.75rem; color:#64748b;">(Forensic warehouse auditor)</span></td>
                            <td style="padding: 10px;">SAP shows stock, but production finds none on the shelf</td>
                            <td style="padding: 10px; font-family: monospace;">MARD, MSKA, RESB, QALS</td>
                            <td style="padding: 10px; color: #166534; font-weight: 600;">Negative stock write-offs</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0; background: #fff7ed;">
                            <td style="padding: 10px; font-weight: 700; color: #c2410c;">🏗️ Agent 3: Inter-Plant Matchmaker</td>
                            <td style="padding: 10px;">Sister Plant Balancing<br><span style="font-size:0.75rem; color:#64748b;">(Internal ride-share coordinator)</span></td>
                            <td style="padding: 10px;">Plant A has stockout, Plant B has idle surplus</td>
                            <td style="padding: 10px; font-family: monospace;">MARC, T001W, Freight Lanes</td>
                            <td style="padding: 10px; color: #166534; font-weight: 600;">Rush procurement premiums</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0; background: #f0fdf4;">
                            <td style="padding: 10px; font-weight: 700; color: #15803d;">🧟 Agent 4: Zombie PO Slayer</td>
                            <td style="padding: 10px;">Aging Commitments<br><span style="font-size:0.75rem; color:#64748b;">(Debt collector & shredder)</span></td>
                            <td style="padding: 10px;">Old unfulfilled POs locking open commitments in finance</td>
                            <td style="padding: 10px; font-family: monospace;">EKKO, RSEG, GR/IR Account</td>
                            <td style="padding: 10px; color: #166534; font-weight: 600;">Audit write-down penalties</td>
                        </tr>
                        <tr style="background: #fffbeb;">
                            <td style="padding: 10px; font-weight: 700; color: #b45309;">🧘 Agent 5: Demand Chaos Calmer</td>
                            <td style="padding: 10px;">Requirement Contradiction<br><span style="font-size:0.75rem; color:#64748b;">(Air traffic controller)</span></td>
                            <td style="padding: 10px;">MRP nervousness creating/deleting duplicate requisitions</td>
                            <td style="padding: 10px; font-family: monospace;">EBAN, MD04, PLAF</td>
                            <td style="padding: 10px; color: #166534; font-weight: 600;">Over-procurement waste</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            """, unsafe_allow_html=True)

    with tab_comic:
        st.markdown("""
        <div class="comic-banner">
            <span style="background: #fde047; color: #000; font-weight: 800; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase;">
                Interactive Illustrated Edition
            </span>
            <h1 class="comic-title">⚡ The Autonomous Supply Chain Chronicles</h1>
            <p class="comic-subtitle">
                Explore how 5 specialized agents rescue manufacturing plants from delivery drift, ghost inventory,
                idle sister plants, zombie commitments, and chaotic MRP flapping — told in <b>action-packed comic storyboards</b>!
            </p>
        </div>
        """, unsafe_allow_html=True)

        c_mode_col1, c_mode_col2 = st.columns([2, 1])
        with c_mode_col1:
            agent_story = st.selectbox(
                "Select Episode & Agent Storyboard",
                [
                    "📖 Issue #1: The Case of the Over-Optimistic Supplier (Agent 1: PO Promise Drift)",
                    "📦 Issue #2: The Mystery of the Ghost Pallets (Agent 2: Phantom Inventory)",
                    "🚚 Issue #3: The Tale of Two Sister Plants (Agent 3: Twin-Location Arbitrage)",
                    "⏳ Issue #4: The Haunting of the Zombie POs (Agent 4: PO Aging Intelligence)",
                    "🛑 Issue #5: The Calamity of the Nervous MRP (Agent 5: Requirement Contradiction)",
                    "🏛️ The Grand Council: Why 5 Agents Instead of One Monolith?"
                ],
                key="comic_episode_selector"
            )
        with c_mode_col2:
            presentation_view = st.radio(
                "Presentation Mode",
                ["🎨 Comic Storyboard View", "📋 Technical Architecture View"],
                horizontal=True,
                key="comic_pres_mode"
            )

        st.write("")

        # =========================================================================
        # ISSUE #1: AGENT 1 (PO PROMISE DRIFT)
        # =========================================================================
        if "Issue #1" in agent_story:
            if presentation_view == "🎨 Comic Storyboard View":
                st.markdown("### 📖 Issue #1: The Case of the Over-Optimistic Supplier")
                st.caption("Agent 1 (SC-A01-PPO-001) vs. Vendor Latency & Line Starvation")

                p1, p2 = st.columns(2)
                with p1:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 1: THE BLIND TRUST</span>
                            <span class="sfx-badge sfx-crisis">💥 DANGER LOOMING</span>
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">🏭 Plant Assembly Manager (Ramesh)</span>
                            "Our Main Line 2 requires 500 steering pump sub-assemblies by Friday morning. If they don't arrive, the whole shift stands idle!"
                        </div>
                        <div class="bubble bubble-erp">
                            <span class="bubble-speaker">🖥️ SAP ERP (EKPO / Commitments)</span>
                            PO 450010000 · Supplier SUP1004 · Promised Date: Oct 15 (On-Time) · Status: Normal
                        </div>
                        <p style="color: #64748b; font-size: 0.85rem; margin-top: 8px; font-style: italic;">
                            Everything looks green in SAP... but is it a trap?
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                with p2:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 2: THE DETECTIVE ENTERS</span>
                            <span class="sfx-badge sfx-investigate">🔍 SCANNING EKBE</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 01 (PO Drift Detective)</span>
                            "Hold everything! Never trust promise dates blindly. Let me pull the historical goods receipt logs (EKBE) for Supplier SUP1004 across their last 237 deliveries!"
                        </div>
                        <div class="bubble bubble-erp">
                            <span class="bubble-speaker">📊 Empirical Distribution Discovered</span>
                            Historical Deliveries: 237 · Late Rate: <b>82.3%</b> · P90 Delay: <b>+2.8 Days</b> · Average Drift: <b>+1.24 Days</b>
                        </div>
                        <p style="color: #64748b; font-size: 0.85rem; margin-top: 8px; font-style: italic;">
                            SUP1004 has failed their delivery commitment 8 times out of 10!
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                p3, p4 = st.columns(2)
                with p3:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 3: THE MATHEMATICAL CLASH</span>
                            <span class="sfx-badge sfx-math">🧮 PURE MATH ENGINE</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 01 (Calculating Impact)</span>
                            "Checking factory consumption: Plant PL01 only has <b>3 days of buffer stock</b>! With a 1.24-day expected drift, stock will deplete to ZERO on Thursday afternoon!"
                        </div>
                        <div class="bubble bubble-policy">
                            <span class="bubble-speaker">📜 Corporate Policy Engine (Rule 4-C)</span>
                            Risk Score: <b>45.5 / 100 (HIGH RISK)</b><br/>
                            Capital Exposure at Risk: <b>₹21,148.68</b><br/>
                            Affected Production Orders: 1 · Sales Orders in Jeopardy: 4
                        </div>
                        <p style="color: #64748b; font-size: 0.85rem; margin-top: 8px; font-style: italic;">
                            Pure Python arithmetic computes the financial blast radius without LLM hallucinations.
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                with p4:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 4: THE HEROIC INTERVENTION</span>
                            <span class="sfx-badge sfx-action">⚡ CRISIS AVERTED</span>
                        </div>
                        <div class="bubble bubble-action">
                            <span class="bubble-speaker">🚀 Action Dispatch & HITL Gate</span>
                            Action Proposed: <b>SUPPLIER_FOLLOW_UP & EXPEDITE</b><br/>
                            Automated Supplier Escalation Draft generated & staged in Human Approvals Desk!
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">👤 Senior Buyer (Priya)</span>
                            "One click approved! Supplier SUP1004 dispatched hot air-freight shipment immediately. Factory Line 2 kept running smoothly!"
                        </div>
                        <p style="color: #166534; font-size: 0.85rem; margin-top: 8px; font-weight: 600;">
                            🛡️ Result: ₹21,148 line-stoppage avoided 3 days before anyone noticed!
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                # Sample Use Case Card
                st.markdown("#### 🎯 Concrete Walkthrough: Sample Use Case")
                st.markdown("""
                <div class="use-case-card">
                    <span class="use-case-tag">Case ID: 450010000</span> &nbsp; <b>Supplier Delivery Latency vs. Factory Stockout</b>
                    <table style="width: 100%; font-size: 0.88rem; margin-top: 10px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600; width: 25%;">Input Parameters:</td>
                            <td style="padding: 6px;">PO <code>450010000</code>, Vendor <code>SUP1004</code>, Material <code>MAT1001</code>, Plant <code>PL01</code>, Order Qty: <code>500 units</code></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">SAP Tables Queried:</td>
                            <td style="padding: 6px;"><code>EKKO</code>, <code>EKPO</code>, <code>EKET</code> (Schedule Lines), <code>EKBE</code> (GR Latency), <code>MD04</code> (Stock Buffer)</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">Deterministic Calculation:</td>
                            <td style="padding: 6px;">$$\\text{Buffer Days} = 3, \\quad \\text{Avg Delay} = +1.24\\text{ d}, \\quad \\text{Late Pct} = 82.3\\%, \\quad \\text{Net Drift Risk} = 45.5$$</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; font-weight: 600;">Output Action:</td>
                            <td style="padding: 6px; color: #166534; font-weight: 700;">SUPPLIER_FOLLOW_UP (Dispatched through HITL Governance Desk)</td>
                        </tr>
                    </table>
                </div>
                """, unsafe_allow_html=True)

            else:
                st.markdown("### 📋 Agent 1 Technical Architecture & Data Flow")
                st.markdown("""
                ```mermaid
                flowchart LR
                    A[SAP PO Ingestion EKPO/EKET] --> B[Delivery History Mining EKBE/MSEG]
                    B --> C[Statistical Drift Engine: Mean, P90, StdDev]
                    C --> D[MRP Impact Analysis MD04 Stock Cover]
                    D --> E[Corporate Policy Matrix Evaluation]
                    E --> F{Risk Band >= High?}
                    F -->|Yes| G[Stage Expedite Ticket in HITL Desk]
                    F -->|No| H[Record Low-Risk Audit Log]
                    G --> I[Buyer 1-Click Authorize]
                    I --> J[SAP S/4HANA PO Rescheduling Write]
                ```
                """)

        # =========================================================================
        # ISSUE #2: AGENT 2 (PHANTOM INVENTORY)
        # =========================================================================
        elif "Issue #2" in agent_story:
            if presentation_view == "🎨 Comic Storyboard View":
                st.markdown("### 📦 Issue #2: The Mystery of the Ghost Pallets")
                st.caption("Agent 2 (SC-A02-PHI-001) Reconciles Nominal Physical Stock vs. Usable Operational Stock")

                p1, p2 = st.columns(2)
                with p1:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 1: THE MIRAGE</span>
                            <span class="sfx-badge sfx-crisis">👻 GHOST STOCK</span>
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">🏭 Production Planner (Amit)</span>
                            "SAP says we have 1,200 units of Material MAT2001 in Warehouse SL01! Let's schedule 800 units for production tonight!"
                        </div>
                        <div class="bubble bubble-erp">
                            <span class="bubble-speaker">🖥️ SAP MARD (Physical Stock)</span>
                            Material: MAT2001 · Plant: 1000 · Storage Loc: SL01 · LABST (Unrestricted): 1,200 Units
                        </div>
                        <p style="color: #64748b; font-size: 0.85rem; margin-top: 8px; font-style: italic;">
                            On paper, inventory is plenty. But what's really happening inside the warehouse?
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                with p2:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 2: THE FORENSIC INVESTIGATION</span>
                            <span class="sfx-badge sfx-investigate">🔬 QA & BATCH AUDIT</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 02 (Inventory Detective)</span>
                            "Wait! Physical stock is NOT usable stock! Let me inspect QM inspection lots (QALS), production reservations (RESB), and shelf-life expiration (MCHB)!"
                        </div>
                        <div class="bubble bubble-erp">
                            <span class="bubble-speaker">📋 The Shocking Breakdown</span>
                            • QA Inspection Hold: <b>400 units</b> (pending lab test)<br/>
                            • Active Line Reservations: <b>350 units</b> (already committed)<br/>
                            • Expired Lots (Past SLED): <b>250 units</b> (scrap candidate!)
                        </div>
                        <p style="color: #64748b; font-size: 0.85rem; margin-top: 8px; font-style: italic;">
                            A staggering 1,000 units are completely locked and unusable!
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                p3, p4 = st.columns(2)
                with p3:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 3: THE WATERFALL RECONCILIATION</span>
                            <span class="sfx-badge sfx-math">💧 USABILITY WATERFALL</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 02 (Mathematical Reality)</span>
                            $$\\text{Usable Stock} = 1,200 - (400 + 350 + 250) = \\mathbf{200 \\text{ Units}}$$
                            "If you schedule 800 units, the manufacturing line will starve 600 units short in the middle of the night!"
                        </div>
                        <div class="bubble bubble-policy">
                            <span class="bubble-speaker">📜 Policy Evaluation: PHANTOM DEFICIT</span>
                            Stock Discrepancy: <b>-1,000 Units</b><br/>
                            Exposure: <b>₹45,000</b> at risk<br/>
                            Mandated Action: <b>CYCLE_COUNT_RECONCILIATION & QM_EXPEDITE</b>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                with p4:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 4: THE TARGETED DISPATCH</span>
                            <span class="sfx-badge sfx-action">🎯 THREE-WAY RESOLUTION</span>
                        </div>
                        <div class="bubble bubble-action">
                            <span class="bubble-speaker">⚡ Multi-Department Resolution</span>
                            1. 🧪 <b>QM Lab Alert:</b> Expedite test for 400 units.<br/>
                            2. 🗑️ <b>Scrap Proposal:</b> Write off 250 expired units (Mvt 551).<br/>
                            3. 🏭 <b>Production Resequence:</b> Shift scheduled run to avoid line crash.
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">👤 Warehouse Supervisor (Devendra)</span>
                            "We avoided shutting down the night shift! Real usable inventory is now synchronized with reality!"
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                # Sample Use Case Card
                st.markdown("#### 🎯 Concrete Walkthrough: Sample Use Case")
                st.markdown("""
                <div class="use-case-card">
                    <span class="use-case-tag">Case ID: STK100000</span> &nbsp; <b>Physical Mirage vs. Quality Inspection Block</b>
                    <table style="width: 100%; font-size: 0.88rem; margin-top: 10px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600; width: 25%;">Input Parameters:</td>
                            <td style="padding: 6px;">Material <code>MAT2001</code>, Plant <code>1000</code>, Storage Loc <code>SL01</code>, Physical Stock: <code>1,200</code></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">SAP Tables Queried:</td>
                            <td style="padding: 6px;"><code>MARD</code> (SLoc Stock), <code>QALS</code> (QA Lots), <code>RESB</code> (Reservations), <code>MCHB</code> (Batch SLED)</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">Reconciliation Formula:</td>
                            <td style="padding: 6px;">$$\\text{True Usable} = \\max(0, \\text{Physical} - [\\text{Blocked} + \\text{QA} + \\text{Reserved} + \\text{Expired}])$$</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; font-weight: 600;">Output Action:</td>
                            <td style="padding: 6px; color: #166534; font-weight: 700;">EXPEDITE_QA_RELEASE & CYCLE_COUNT_RECONCILIATION</td>
                        </tr>
                    </table>
                </div>
                """, unsafe_allow_html=True)

            else:
                st.markdown("### 📋 Agent 2 Technical Architecture & Data Flow")
                st.markdown("""
                ```mermaid
                flowchart LR
                    A[MARD Physical Stock] --> B[QALS Inspection Hold Audit]
                    A --> C[RESB Reservation Commitments]
                    A --> D[MCHB SLED Expiration Check]
                    B & C & D --> E[Deterministic Usability Math Engine]
                    E --> F{Deficit Detected?}
                    F -->|Yes| G[Isolate Root Cause: QA / Batch / SLoc]
                    F -->|No| H[Flag Fully Usable Stock]
                    G --> I[Route Disposition: Mvt 343 / QA11 / Mvt 551]
                    I --> J[Human-in-the-Loop Warehouse Approval]
                ```
                """)

        # =========================================================================
        # ISSUE #3: AGENT 3 (TWIN-LOCATION ARBITRAGE)
        # =========================================================================
        elif "Issue #3" in agent_story:
            if presentation_view == "🎨 Comic Storyboard View":
                st.markdown("### 🚚 Issue #3: The Tale of Two Sister Plants")
                st.caption("Agent 3 (SC-A03-MTL-001) Optimizes Inter-Plant Inventory Balancing & Logistics Economics")

                p1, p2 = st.columns(2)
                with p1:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 1: THE TALE OF TWO CITIES</span>
                            <span class="sfx-badge sfx-crisis">⚡ STOCKOUT THREAT</span>
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">🏭 Plant Manager Mumbai (Raj)</span>
                            "We are out of industrial bearings! An emergency procurement from Europe will cost ₹120,000 with a 3-week lead time, shutting down our line!"
                        </div>
                        <div class="bubble bubble-erp">
                            <span class="bubble-speaker">🖥️ Plant Pune Inventory (MARC)</span>
                            Plant Pune holds <b>2,500 units</b> of the identical bearing sitting idle! Distance: 150 km.
                        </div>
                        <p style="color: #64748b; font-size: 0.85rem; margin-top: 8px; font-style: italic;">
                            Traditional SAP MRP treats plants in silos. Neither plant knows what the other has!
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                with p2:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 2: THE TWIN-LOCATION SCOUT</span>
                            <span class="sfx-badge sfx-investigate">🌐 NETWORK RADAR</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 03 (Network Optimizer)</span>
                            "Scanning all sister plants within 300 km transit radius! Plant Pune identified as an eligible twin location holding surplus!"
                        </div>
                        <div class="bubble bubble-policy">
                            <span class="bubble-speaker">🛡️ Safety Stock Shield Enforced</span>
                            Pune 30-Day Demand: 1,000 units<br/>
                            Pune Safety Buffer: 500 units<br/>
                            <b>Shielded Reserve: 1,500 units</b> · Available for Transfer: <b>1,000 units</b>
                        </div>
                        <p style="color: #64748b; font-size: 0.85rem; margin-top: 8px; font-style: italic;">
                            The agent protects the donor plant first so Pune doesn't stock out next week!
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                p3, p4 = st.columns(2)
                with p3:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 3: THE ECONOMIC ARBITRAGE</span>
                            <span class="sfx-badge sfx-math">⚖️ FREIGHT VS PENALTY</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 03 (Logistics Economics)</span>
                            • Avoided Emergency Air Freight: ₹120,000<br/>
                            • Inter-Plant Dedicated Trucking Cost: ₹8,500<br/>
                            • Transit Time: <b>1 Day</b> (vs. 21 Days from Europe)<br/>
                            $$\\text{Net Economic Arbitrage} = ₹120,000 - ₹8,500 = \\mathbf{+₹111,500 \\text{ Profit}}$$
                        </div>
                        <div class="bubble bubble-policy">
                            <span class="bubble-speaker">📜 Decision Matrix: POSITIVE_ARBITRAGE</span>
                            Recommendation: <b>INITIATE_INTERPLANT_TRANSFER (STO)</b>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                with p4:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 4: THE EXPRESS CONVOY</span>
                            <span class="sfx-badge sfx-action">🚚 STO CREATED</span>
                        </div>
                        <div class="bubble bubble-action">
                            <span class="bubble-speaker">🚀 Automated Execution</span>
                            SAP Stock Transport Order (UB document type) drafted between Plant Pune and Plant Mumbai for 600 units!
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">👤 Network Logistics Director</span>
                            "Authorized with 1 click! The truck arrived in Mumbai the next morning. Factory saved, zero downtime, ₹1.1 Lakh saved!"
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                # Sample Use Case Card
                st.markdown("#### 🎯 Concrete Walkthrough: Sample Use Case")
                st.markdown("""
                <div class="use-case-card">
                    <span class="use-case-tag">Case ID: TR70000</span> &nbsp; <b>Inter-Plant Freight Arbitrage & Safety Stock Shielding</b>
                    <table style="width: 100%; font-size: 0.88rem; margin-top: 10px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600; width: 25%;">Donor / Target:</td>
                            <td style="padding: 6px;">Source: <code>PL02 (Pune)</code>, Destination: <code>PL01 (Mumbai)</code>, Material: <code>MAT3001</code></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">Safety Shield:</td>
                            <td style="padding: 6px;">Donor Stock: 2,500 · 30-Day Protected: 1,500 · <b>Max Transferable: 1,000 units</b></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">Arbitrage Equation:</td>
                            <td style="padding: 6px;">$$\\text{ROI} = \\text{Avoided Line Downtime} - (\\text{Freight Cost} + \\text{Handling})$$</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; font-weight: 600;">Output Action:</td>
                            <td style="padding: 6px; color: #166534; font-weight: 700;">CREATE_STOCK_TRANSPORT_ORDER (Doc Type UB)</td>
                        </tr>
                    </table>
                </div>
                """, unsafe_allow_html=True)

            else:
                st.markdown("### 📋 Agent 3 Technical Architecture & Data Flow")
                st.markdown("""
                ```mermaid
                flowchart LR
                    A[Deficit Detection Target Plant MD04] --> B[Multi-Plant Inventory MARC/T001W]
                    B --> C[Candidate Twin Plants Distance Filter <= 300km]
                    C --> D[Donor Plant Safety Stock Shielding]
                    D --> E[Logistics Cost Engine: Transit vs Downtime]
                    E --> F{Net Economic Arbitrage > 0?}
                    F -->|Yes| G[Propose Stock Transport Order UB]
                    F -->|No| H[Flag Transfer Infeasible -> Expedite PO]
                    G --> I[Central Logistics Human Approval]
                    I --> J[Post ME21N STO in SAP]
                ```
                """)

        # =========================================================================
        # ISSUE #4: AGENT 4 (PO AGING INTELLIGENCE)
        # =========================================================================
        elif "Issue #4" in agent_story:
            if presentation_view == "🎨 Comic Storyboard View":
                st.markdown("### ⏳ Issue #4: The Haunting of the Zombie POs")
                st.caption("Agent 4 (SC-A04-POA-001) Audits Stale Commitments, 3-Way Match & Working Capital")

                p1, p2 = st.columns(2)
                with p1:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 1: THE ACCUMULATED GHOSTS</span>
                            <span class="sfx-badge sfx-crisis">🧟 DEAD CAPITAL</span>
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">💼 CFO / Finance Controller (Mehta)</span>
                            "We have ₹12 Crores in open purchase commitments over 90 days old! Run a batch script to delete all of them immediately!"
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 04 (Halting the Blunt Script)</span>
                            "STOP! Blunt scripts destroy supply chains! Some aged POs are long-lead turbine components required for next month's shutdown!"
                        </div>
                        <p style="color: #64748b; font-size: 0.85rem; margin-top: 8px; font-style: italic;">
                            Canceling blindly causes catastrophic line stockouts; doing nothing locks working capital.
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                with p2:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 2: THREE-WAY MATCH AUTOPSY</span>
                            <span class="sfx-badge sfx-investigate">🔬 GR/IR ANALYSIS</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 04 (Diagnosing Root Causes)</span>
                            "Let's audit each aged PO across 3-way match: Goods Receipts (`EKBE`), Invoice Receipts (`RSEG`), Purchasing Blocks, and Future Demand (`MD04`)."
                        </div>
                        <div class="bubble bubble-erp">
                            <span class="bubble-speaker">📑 Discrepancy Findings</span>
                            • Case A: 100% delivered, 0% invoiced, vendor ceased trading (Zombie liability!).<br/>
                            • Case B: Long-lead tooling, promised next quarter (Valid future demand!).
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                p3, p4 = st.columns(2)
                with p3:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 3: SEVEN ARCHETYPE CLASSIFIER</span>
                            <span class="sfx-badge sfx-math">🧠 7-WAY TAXONOMY</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 04 (Smart Categorization)</span>
                            Classified into 7 precise archetypes:<br/>
                            1. `VALID_FUTURE_DEMAND` ➜ <b>KEEP_OPEN</b><br/>
                            2. `DEAD_SUPPLIER_OR_CLOSED` ➜ <b>DE_OBLIGATE_PO</b><br/>
                            3. `GR_IR_IMBALANCE` ➜ <b>FINANCE_CLEARING_AP</b>
                        </div>
                        <div class="bubble bubble-policy">
                            <span class="bubble-speaker">📜 Working Capital Impact</span>
                            De-obligated ₹85,000 in unfulfilled ghost commitments without touching the critical turbine order!
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                with p4:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 4: THE CLEAN BALANCE SHEET</span>
                            <span class="sfx-badge sfx-action">🎉 CLEAN LEDGER</span>
                        </div>
                        <div class="bubble bubble-action">
                            <span class="bubble-speaker">🚀 Automated Resolution</span>
                            Staged PO line delivery completion indicator (`ELIKZ`) and AP clearing proposal in Approvals Desk!
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">👤 Procurement Controller</span>
                            "Accruals cleared, working capital liberated, and zero production disruptions. Brilliant surgical cleanup!"
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                # Sample Use Case Card
                st.markdown("#### 🎯 Concrete Walkthrough: Sample Use Case")
                st.markdown("""
                <div class="use-case-card">
                    <span class="use-case-tag">Case ID: CASE01</span> &nbsp; <b>Aged Open PO vs. Zero Remaining Demand</b>
                    <table style="width: 100%; font-size: 0.88rem; margin-top: 10px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600; width: 25%;">Aged Document:</td>
                            <td style="padding: 6px;">PO <code>450030005</code>, Days Open: <code>184 days</code>, Fulfillment: <code>0%</code></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">Downstream Audit:</td>
                            <td style="padding: 6px;">Zero active demand in <code>MD04</code>, vendor contract terminated</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">Classification:</td>
                            <td style="padding: 6px;"><code>DEAD_COMMITMENT</code> (Liberates working capital liability)</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; font-weight: 600;">Output Action:</td>
                            <td style="padding: 6px; color: #166534; font-weight: 700;">SET_DELIVERY_COMPLETED_INDICATOR (ELIKZ)</td>
                        </tr>
                    </table>
                </div>
                """, unsafe_allow_html=True)

            else:
                st.markdown("### 📋 Agent 4 Technical Architecture & Data Flow")
                st.markdown("""
                ```mermaid
                flowchart LR
                    A[EKPO Open Purchase Orders] --> B[Aging Calculation Days Open/Overdue]
                    B --> C[3-Way Match Audit EKBE Receipts & RSEG Invoices]
                    C --> D[MD04 Downstream Need State Verification]
                    D --> E[7-Archetype Root Cause Classifier]
                    E --> F{Has Valid Future Demand?}
                    F -->|Yes| G[Keep PO Open & Log Clean Audit]
                    F -->|No| H[Flag for De-Obligation or AP Clearing]
                    H --> I[Review by Procurement & AP Controller]
                    I --> J[Post ME22N Delivery Complete in SAP]
                ```
                """)

        # =========================================================================
        # ISSUE #5: AGENT 5 (REQUIREMENT CONTRADICTION & FLAPPING)
        # =========================================================================
        elif "Issue #5" in agent_story:
            if presentation_view == "🎨 Comic Storyboard View":
                st.markdown("### 🛑 Issue #5: The Calamity of the Nervous MRP")
                st.caption("Agent 5 (SC-A05-RCA-001) Stabilizes Flapping Demand Signals & Deduplicates Orders")

                p1, p2 = st.columns(2)
                with p1:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 1: THE MRP CHAOS</span>
                            <span class="sfx-badge sfx-crisis">🌀 SYSTEM NERVOUSNESS</span>
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">🏭 Master Scheduler (Deepak)</span>
                            "MRP regenerated 12 new planned orders for raw steel today, cancelled 8 yesterday, and moved dates twice inside the freeze fence! Buyers are losing their minds!"
                        </div>
                        <div class="bubble bubble-erp">
                            <span class="bubble-speaker">🖥️ SAP MD04 (Demand Stream)</span>
                            Material: MAT5001 · Overlapping forecast runs · 14 schedule line revisions in 7 days
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                with p2:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 2: CLUSTER & DISAMBIGUATE</span>
                            <span class="sfx-badge sfx-investigate">🧩 SIGNAL DEDUPLICATION</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 05 (MRP Stabilizer)</span>
                            "Clustering all demand elements across Material, Plant, and 14-Day Horizon to isolate true net customer demand from artificial MRP noise!"
                        </div>
                        <div class="bubble bubble-erp">
                            <span class="bubble-speaker">📊 Disambiguation Result</span>
                            • Gross Unfiltered Demand: <b>1,800 tons</b><br/>
                            • Duplicate Flapping Requisitions: <b>-600 tons</b><br/>
                            • True Net Stabilized Requirement: <b>1,200 tons</b>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                p3, p4 = st.columns(2)
                with p3:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 3: DAMPENING THE FLAPPING</span>
                            <span class="sfx-badge sfx-math">🛡️ FREEZE FENCE SHIELD</span>
                        </div>
                        <div class="bubble bubble-agent">
                            <span class="bubble-speaker">🤖 Agent 05 (Policy Gate)</span>
                            "Applying freeze fence dampening policy! We reject the 600-ton duplicate requisition and prevent the procurement team from over-buying ₹18 Lakhs of steel!"
                        </div>
                        <div class="bubble bubble-policy">
                            <span class="bubble-speaker">📜 Contradiction Type: DUPLICATE_MRP_RUN</span>
                            Oscillation Metric: 4.2 changes/wk (Severe)<br/>
                            Action: <b>DEDUPLICATE_AND_FREEZE_SCHEDULE</b>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                with p4:
                    st.markdown("""
                    <div class="comic-panel">
                        <div class="panel-header">
                            <span class="panel-num">PANEL 4: TRANQUILITY RESTORED</span>
                            <span class="sfx-badge sfx-action">🎯 STABILIZED MRP</span>
                        </div>
                        <div class="bubble bubble-action">
                            <span class="bubble-speaker">🚀 Execution & Order Confirmation</span>
                            Reconciled net procurement queue staged in SAP without duplicate PO creation.
                        </div>
                        <div class="bubble bubble-human">
                            <span class="bubble-speaker">👤 Chief Supply Chain Officer</span>
                            "The bullwhip effect was killed before it even left our factory. Our purchasing team has their sanity back!"
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                # Sample Use Case Card
                st.markdown("#### 🎯 Concrete Walkthrough: Sample Use Case")
                st.markdown("""
                <div class="use-case-card">
                    <span class="use-case-tag">Case ID: DEM0001</span> &nbsp; <b>Duplicate Planned Order Collisions within Freeze Fence</b>
                    <table style="width: 100%; font-size: 0.88rem; margin-top: 10px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600; width: 25%;">Demand Signal:</td>
                            <td style="padding: 6px;">Material <code>MAT5001</code>, Horizon: <code>7 Days</code>, Raw Demand: <code>1,800 units</code></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">Diagnosis:</td>
                            <td style="padding: 6px;">Overlapping weekly MRP runs created twin planned orders for single sales order</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; font-weight: 600;">Stabilization:</td>
                            <td style="padding: 6px;">$$\\text{Net Reconciled Demand} = \\text{Gross Demand} - \\text{Flapping Duplicates}$$</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; font-weight: 600;">Output Action:</td>
                            <td style="padding: 6px; color: #166534; font-weight: 700;">DEDUPLICATE_REQUIREMENTS & FREEZE_SCHEDULE_LINE</td>
                        </tr>
                    </table>
                </div>
                """, unsafe_allow_html=True)

            else:
                st.markdown("### 📋 Agent 5 Technical Architecture & Data Flow")
                st.markdown("""
                ```mermaid
                flowchart LR
                    A[MD04 Gross Demand Requirements] --> B[Clustering by Material & Horizon]
                    B --> C[Flapping Frequency & Oscillation Counter]
                    C --> D[5-Way Contradiction Classifier]
                    D --> E{Signal Inside Freeze Fence?}
                    E -->|Yes| F[Dampen Flapping & Consolidate Schedule]
                    E -->|No| G[Allow Upstream Forecast Adjustment]
                    F --> H[Master Scheduler Review & Consent]
                    H --> I[Update Reconciled Planned Order in SAP]
                ```
                """)

        # =========================================================================
        # GRAND COUNCIL: WHY 5 AGENTS?
        # =========================================================================
        elif "The Grand Council" in agent_story:
            st.markdown("### 🏛️ The Grand Council: Why 5 Agents Instead of One Monolith?")
            st.markdown("""
            In enterprise SAP systems, supply chain functions operate on strictly segregated data objects, business transactions, and organizational departments:
            """)

            col_gc1, col_gc2, col_gc3 = st.columns(3)
            with col_gc1:
                st.markdown("""
                <div class="comic-panel">
                    <span class="sfx-badge sfx-crisis">🏢 DEPT BOUNDARIES</span>
                    <h4 style="margin: 0.5rem 0 0.2rem 0;">Real-World Stakeholders</h4>
                    <p style="font-size: 0.88rem; color: #475569; line-height: 1.5;">
                        A warehouse supervisor cannot cancel a purchase order; a purchasing buyer cannot write off expired batches in Quality Inspection. 
                        Segregating agents ensures strictly mapped authorization controls.
                    </p>
                </div>
                """, unsafe_allow_html=True)

            with col_gc2:
                st.markdown("""
                <div class="comic-panel">
                    <span class="sfx-badge sfx-math">🧮 DETERMINISTIC MATH</span>
                    <h4 style="margin: 0.5rem 0 0.2rem 0;">No Arithmetic Hallucinations</h4>
                    <p style="font-size: 0.88rem; color: #475569; line-height: 1.5;">
                        LLMs cannot reliably subtract warehouse reservations or calculate P90 delay curves. 
                        In this platform, 100% of arithmetic is handled by isolated, deterministic Python engines.
                    </p>
                </div>
                """, unsafe_allow_html=True)

            with col_gc3:
                st.markdown("""
                <div class="comic-panel">
                    <span class="sfx-badge sfx-action">⚡ PRODUCTION EVENT BUS</span>
                    <h4 style="margin: 0.5rem 0 0.2rem 0;">Event-Driven Mesh</h4>
                    <p style="font-size: 0.88rem; color: #475569; line-height: 1.5;">
                        In production, SAP Event Mesh and Kafka automatically route business events to the right agent. 
                        This Cockpit is your sandbox to inspect, audit, and simulate any scenario on demand!
                    </p>
                </div>
                """, unsafe_allow_html=True)
