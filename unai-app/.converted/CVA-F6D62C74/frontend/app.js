document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    const runPipelineBtn = document.getElementById('runPipelineBtn');
    const applyParamsBtn = document.getElementById('applyParamsBtn');
    const healthyStateBtn = document.getElementById('healthyStateBtn');

    const inputSupplier = document.getElementById('inputSupplier');
    const inputOrigin = document.getElementById('inputOrigin');
    const inputDestination = document.getElementById('inputDestination');
    const selectTransportMode = document.getElementById('selectTransportMode');
    
    let isLiveApiMode = true;
    let currentPipelineData = null;
    let selectedOptionId = null;
    let activeTopologyData = null;
    let hoveredNode = null;
    let activeFilter = 'all';

    // Light / Dark Theme Switching Logic
    const savedTheme = localStorage.getItem('appTheme') || 'dark';
    setAppTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setAppTheme(newTheme);
        });
    }

    function setAppTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            document.body.setAttribute('data-theme', 'light');
            if (themeIcon) themeIcon.textContent = '🌙';
            if (themeText) themeText.textContent = 'Dark Mode';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.body.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.textContent = '☀️';
            if (themeText) themeText.textContent = 'Light Mode';
        }
        localStorage.setItem('appTheme', theme);
        if (activeTopologyData) {
            renderTopologyGraph(activeTopologyData);
        }
    }

    // Buttons
    if (runPipelineBtn) runPipelineBtn.addEventListener('click', () => triggerPipeline());
    if (applyParamsBtn) applyParamsBtn.addEventListener('click', () => triggerPipeline());
    
    if (healthyStateBtn) {
        healthyStateBtn.addEventListener('click', () => triggerPipeline({ forceNoEvent: true }));
    }

    // Enter Key triggers
    [inputSupplier, inputOrigin, inputDestination].forEach(input => {
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') triggerPipeline();
            });
        }
    });

    if (selectTransportMode) {
        selectTransportMode.addEventListener('change', () => triggerPipeline());
    }

    // -------------------------------------------------------------
    // Supplier Suggestion Autocomplete & Fuzzy Matcher
    // -------------------------------------------------------------
    const suggestionsDropdown = document.getElementById('supplierSuggestionsDropdown');
    let suggestionDebounceTimer = null;

    if (inputSupplier && suggestionsDropdown) {
        inputSupplier.addEventListener('input', (e) => {
            clearTimeout(suggestionDebounceTimer);
            const val = e.target.value.trim();
            suggestionDebounceTimer = setTimeout(() => {
                fetchSupplierSuggestions(val);
            }, 180);
        });

        inputSupplier.addEventListener('focus', () => {
            fetchSupplierSuggestions(inputSupplier.value.trim());
        });

        document.addEventListener('click', (e) => {
            if (!inputSupplier.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
                suggestionsDropdown.style.display = 'none';
            }
        });
    }

    async function fetchSupplierSuggestions(query) {
        try {
            const url = new URL('/api/suppliers/suggest', window.location.origin);
            if (query) url.searchParams.append('q', query);
            url.searchParams.append('limit', '8');

            const res = await fetch(url);
            const data = await res.json();
            const suggestions = Array.isArray(data) ? data : (data.suggestions || []);

            if (!suggestions || suggestions.length === 0) {
                // Show Unrecognized supplier warning with fallback suggestions
                suggestionsDropdown.innerHTML = `
                    <div class="unrecognized-warning">
                        ⚠️ <strong>Unrecognized Supplier</strong> — Select from registered enterprise vendors:
                    </div>
                    <div class="suggestion-item" data-name="TSMC" data-origin="Hsinchu" data-dest="Austin, Texas">
                        <div>
                            <div class="suggestion-name">TSMC</div>
                            <div class="suggestion-meta">Taiwan • Semiconductor Foundry</div>
                        </div>
                        <span class="suggestion-badge">Tier-1</span>
                    </div>
                    <div class="suggestion-item" data-name="Foxconn" data-origin="Shenzhen" data-dest="Long Beach Port">
                        <div>
                            <div class="suggestion-name">Foxconn</div>
                            <div class="suggestion-meta">China • Electronics Assembly</div>
                        </div>
                        <span class="suggestion-badge">Tier-1</span>
                    </div>
                    <div class="suggestion-item" data-name="Samsung Electronics" data-origin="Busan" data-dest="Austin, Texas">
                        <div>
                            <div class="suggestion-name">Samsung Electronics</div>
                            <div class="suggestion-meta">South Korea • Semiconductor & Display</div>
                        </div>
                        <span class="suggestion-badge">Tier-1</span>
                    </div>
                `;
                suggestionsDropdown.style.display = 'flex';
                bindSuggestionClicks();
                return;
            }

            let html = `<div class="suggestion-header">Enterprise Supplier Registry</div>`;
            suggestions.forEach(s => {
                html += `
                    <div class="suggestion-item" data-name="${s.supplier_name}" data-city="${s.city}" data-country="${s.country}">
                        <div>
                            <div class="suggestion-name">${s.supplier_name}</div>
                            <div class="suggestion-meta">${s.city ? s.city + ', ' : ''}${s.country} • ${s.category}</div>
                        </div>
                        <span class="suggestion-badge">Tier-${s.tier}</span>
                    </div>
                `;
            });

            suggestionsDropdown.innerHTML = html;
            suggestionsDropdown.style.display = 'flex';
            bindSuggestionClicks();
        } catch (err) {
            console.error("Failed to load supplier suggestions:", err);
        }
    }

    function bindSuggestionClicks() {
        const items = suggestionsDropdown.querySelectorAll('.suggestion-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const name = item.getAttribute('data-name');
                const city = item.getAttribute('data-city');
                const country = item.getAttribute('data-country');
                const origin = item.getAttribute('data-origin');
                const dest = item.getAttribute('data-dest');

                if (inputSupplier) inputSupplier.value = name;
                if (origin && inputOrigin) inputOrigin.value = origin;
                else if (city && inputOrigin && !inputOrigin.value) inputOrigin.value = `${city}, ${country}`;

                if (dest && inputDestination) inputDestination.value = dest;

                suggestionsDropdown.style.display = 'none';
                triggerPipeline();
            });
        });
    }

    // -------------------------------------------------------------
    // Exposure View Tabs & Node Filter Pills
    // -------------------------------------------------------------
    const tabTopologyBtn = document.getElementById('tabTopologyBtn');
    const tabBomBtn = document.getElementById('tabBomBtn');
    const topologyViewContainer = document.getElementById('topologyViewContainer');
    const exposureContainer = document.getElementById('exposureContainer');

    const filterAllNodes = document.getElementById('filterAllNodes');
    const filterAffectedNodes = document.getElementById('filterAffectedNodes');
    const filterSafeNodes = document.getElementById('filterSafeNodes');

    if (tabTopologyBtn && tabBomBtn) {
        tabTopologyBtn.addEventListener('click', () => {
            tabTopologyBtn.classList.add('active');
            tabBomBtn.classList.remove('active');
            if (topologyViewContainer) topologyViewContainer.style.display = 'flex';
            if (exposureContainer) exposureContainer.style.display = 'none';
            if (activeTopologyData) renderTopologyGraph(activeTopologyData);
        });

        tabBomBtn.addEventListener('click', () => {
            tabBomBtn.classList.add('active');
            tabTopologyBtn.classList.remove('active');
            if (topologyViewContainer) topologyViewContainer.style.display = 'none';
            if (exposureContainer) exposureContainer.style.display = 'block';
        });
    }

    [filterAllNodes, filterAffectedNodes, filterSafeNodes].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                [filterAllNodes, filterAffectedNodes, filterSafeNodes].forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn === filterAffectedNodes) activeFilter = 'affected';
                else if (btn === filterSafeNodes) activeFilter = 'safe';
                else activeFilter = 'all';

                if (activeTopologyData) renderTopologyGraph(activeTopologyData);
            });
        }
    });

    // -------------------------------------------------------------
    // Premier Interactive Center Network Topology Canvas Renderer
    // -------------------------------------------------------------
    function renderTopologyGraph(topology) {
        activeTopologyData = topology;
        const canvas = document.getElementById('topologyCanvas');
        const summaryText = document.getElementById('topologySummaryText');
        const exposureBadge = document.getElementById('exposureBadge');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        const w = rect.width || 860;
        const h = rect.height || 380;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';

        if (!topology || !topology.nodes || topology.nodes.length === 0) {
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = isLight ? "#4B5563" : "#94A3B8";
            ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Enter parameters and click 'Run Agentic Pipeline' to map supply chain nodes", w / 2, h / 2);
            return;
        }

        const rawNodes = topology.nodes;
        const rawLinks = topology.links || [];
        const summary = topology.summary || {};
        const isHealthy = topology.is_healthy || false;

        if (summaryText) {
            if (isHealthy) {
                summaryText.innerHTML = `<strong style="color:#10B981;">🟢 Network Safe:</strong> Zero disruption events detected across monitored corridors. Carry on with regular operations.`;
            } else {
                summaryText.innerHTML = `<strong style="color:#EF4444;">🔴 ${summary.affected_suppliers_count || 0} Affected Suppliers</strong> • <strong style="color:#10B981;">🟢 ${summary.safe_suppliers_count || 0} Safe Nodes</strong> • <strong style="color:#F59E0B;">🏭 ${summary.exposed_plants_count || 0} Exposed Plants</strong>`;
            }
        }
        if (exposureBadge) {
            exposureBadge.textContent = isHealthy ? "All Safe (0 Affected)" : `${rawNodes.length} Nodes • ${summary.corridor_status || 'Corridor'}`;
            exposureBadge.className = isHealthy ? "badge badge-success" : "badge badge-warning";
        }

        // Filter nodes based on active filter
        let nodes = rawNodes;
        if (activeFilter === 'affected') {
            nodes = rawNodes.filter(n => n.status === 'affected' || n.type === 'plant' || n.type === 'hub');
        } else if (activeFilter === 'safe') {
            nodes = rawNodes.filter(n => n.status === 'safe' || n.type === 'plant' || n.type === 'hub');
        }

        // Layout node positions across 4 distinct, spacious columns
        // Col 1: Tier 2 Raw Suppliers (X = 90)
        // Col 2: Tier 1 Prime Vendors (X = 280)
        // Col 3: Manufacturing Assembly Plants (X = 510)
        // Col 4: Destination Customer Hub (X = 670)
        const t2Nodes = nodes.filter(n => n.type === 'supplier' && n.tier === 2);
        const t1Nodes = nodes.filter(n => n.type === 'supplier' && n.tier === 1);
        const plantNodes = nodes.filter(n => n.type === 'plant');
        const hubNodes = nodes.filter(n => n.type === 'hub');

        function assignY(list, startY, availableH) {
            const count = list.length;
            if (count === 0) return;
            if (count === 1) {
                list[0]._y = startY + availableH / 2;
                return;
            }
            const spacing = availableH / (count - 1);
            list.forEach((n, idx) => {
                n._y = startY + idx * spacing;
            });
        }

        const col1X = Math.round(w * 0.12);
        const col2X = Math.round(w * 0.38);
        const col3X = Math.round(w * 0.68);
        const col4X = Math.round(w * 0.90);

        assignY(t2Nodes, 45, h - 90);
        assignY(t1Nodes, 35, h - 70);
        assignY(plantNodes, 45, h - 90);
        assignY(hubNodes, 40, h - 80);

        t2Nodes.forEach(n => { n._x = col1X; });
        t1Nodes.forEach(n => { n._x = col2X; });
        plantNodes.forEach(n => { n._x = col3X; });
        hubNodes.forEach(n => { n._x = col4X; });

        // Background
        ctx.clearRect(0, 0, w, h);

        // -------------------------------------------------------------
        // Draw Organic Regional Cluster Blobs (Blob Style Map)
        // -------------------------------------------------------------
        function drawRegionalBlob(nodeList, defaultX, title, icon, colorTheme, isAffectedCluster) {
            if (!nodeList || nodeList.length === 0) return;

            let minY = Math.min(...nodeList.map(n => n._y)) - 28;
            let maxY = Math.max(...nodeList.map(n => n._y)) + 28;
            minY = Math.max(12, minY);
            maxY = Math.min(h - 12, maxY);

            const blobW = Math.round(w * 0.22);
            const blobX = defaultX - Math.round(blobW * 0.45);
            const blobH = Math.max(75, maxY - minY);

            // Organic gradient fill
            const blobGrad = ctx.createLinearGradient(blobX, minY, blobX + blobW, minY + blobH);
            if (isLight) {
                if (isAffectedCluster && !isHealthy) {
                    blobGrad.addColorStop(0, "rgba(254, 226, 226, 0.70)");
                    blobGrad.addColorStop(1, "rgba(254, 202, 202, 0.40)");
                } else if (colorTheme === 'emerald') {
                    blobGrad.addColorStop(0, "rgba(209, 250, 229, 0.65)");
                    blobGrad.addColorStop(1, "rgba(236, 253, 245, 0.40)");
                } else if (colorTheme === 'blue') {
                    blobGrad.addColorStop(0, "rgba(219, 234, 254, 0.65)");
                    blobGrad.addColorStop(1, "rgba(239, 246, 255, 0.40)");
                } else if (colorTheme === 'indigo') {
                    blobGrad.addColorStop(0, "rgba(224, 231, 255, 0.65)");
                    blobGrad.addColorStop(1, "rgba(238, 242, 255, 0.40)");
                } else {
                    blobGrad.addColorStop(0, "rgba(237, 233, 254, 0.65)");
                    blobGrad.addColorStop(1, "rgba(245, 243, 255, 0.40)");
                }
            } else {
                if (isAffectedCluster && !isHealthy) {
                    blobGrad.addColorStop(0, "rgba(239, 68, 68, 0.16)");
                    blobGrad.addColorStop(1, "rgba(185, 28, 28, 0.05)");
                } else if (colorTheme === 'emerald') {
                    blobGrad.addColorStop(0, "rgba(16, 185, 129, 0.13)");
                    blobGrad.addColorStop(1, "rgba(5, 150, 105, 0.03)");
                } else if (colorTheme === 'blue') {
                    blobGrad.addColorStop(0, "rgba(59, 130, 246, 0.13)");
                    blobGrad.addColorStop(1, "rgba(37, 99, 235, 0.03)");
                } else if (colorTheme === 'indigo') {
                    blobGrad.addColorStop(0, "rgba(99, 102, 241, 0.13)");
                    blobGrad.addColorStop(1, "rgba(79, 70, 229, 0.03)");
                } else {
                    blobGrad.addColorStop(0, "rgba(139, 92, 246, 0.13)");
                    blobGrad.addColorStop(1, "rgba(124, 58, 237, 0.03)");
                }
            }

            // Draw organic rounded blob container
            ctx.save();
            ctx.fillStyle = blobGrad;
            ctx.strokeStyle = isLight 
                ? (isAffectedCluster && !isHealthy ? "rgba(220, 38, 38, 0.4)" : "rgba(100, 116, 139, 0.25)") 
                : (isAffectedCluster && !isHealthy ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.12)");
            ctx.lineWidth = 1.2;
            ctx.setLineDash([6, 4]);

            ctx.beginPath();
            ctx.roundRect(blobX, minY, blobW, blobH, 22);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            // Blob Region Pill Tag
            const tagW = 124;
            const tagH = 17;
            const tagX = defaultX - tagW / 2;
            const tagY = minY - 9;

            ctx.fillStyle = isLight ? "#FFFFFF" : "rgba(15, 23, 42, 0.95)";
            ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.2)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(tagX, tagY, tagW, tagH, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isLight 
                ? (isAffectedCluster && !isHealthy ? "#991B1B" : "#0F172A") 
                : (isAffectedCluster && !isHealthy ? "#FCA5A5" : "#E2E8F0");
            ctx.font = "bold 9.5px 'Plus Jakarta Sans', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${icon} ${title}`, defaultX, tagY + 12);
            ctx.restore();
        }

        const isT1Affected = t1Nodes.some(n => n.status === 'affected');
        const isT2Affected = t2Nodes.some(n => n.status === 'affected');
        const isPlantAffected = plantNodes.some(n => n.status === 'exposed');

        drawRegionalBlob(t2Nodes, col1X, "Tier-2 Material Basin", "🌱", "emerald", isT2Affected);
        drawRegionalBlob(t1Nodes, col2X, "Tier-1 Foundry Hubs", "🏭", "blue", isT1Affected);
        drawRegionalBlob(plantNodes, col3X, "Assembly Super-Plants", "⚙️", "indigo", isPlantAffected);
        drawRegionalBlob(hubNodes, col4X, "Demand Market Hub", "🏢", "purple", false);

        // Draw Organic Bezier Trade Corridors
        const nodeMap = {};
        nodes.forEach(n => { nodeMap[n.id] = n; });

        rawLinks.forEach(link => {
            const src = nodeMap[link.source];
            const tgt = nodeMap[link.target];
            if (!src || !tgt) return;

            // Check if hovered link
            const isHovered = hoveredNode && (hoveredNode.id === src.id || hoveredNode.id === tgt.id);
            const isDimmed = hoveredNode && !isHovered;

            ctx.beginPath();
            ctx.moveTo(src._x, src._y);

            const cp1x = src._x + (tgt._x - src._x) * 0.45;
            const cp1y = src._y;
            const cp2x = src._x + (tgt._x - src._x) * 0.55;
            const cp2y = tgt._y;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tgt._x, tgt._y);

            if (link.status === 'disrupted' && !isHealthy) {
                ctx.strokeStyle = isDimmed ? "rgba(239, 68, 68, 0.15)" : (isHovered ? "rgba(239, 68, 68, 1.0)" : "rgba(239, 68, 68, 0.75)");
                ctx.lineWidth = isHovered ? 3.5 : 2.2;
                ctx.setLineDash([6, 4]);
            } else {
                ctx.strokeStyle = isDimmed 
                    ? (isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)") 
                    : (isHovered ? "#10B981" : (isLight ? "rgba(5, 150, 105, 0.65)" : "rgba(16, 185, 129, 0.45)"));
                ctx.lineWidth = isHovered ? 3 : 1.8;
                ctx.setLineDash([]);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // Draw Nodes with Organic Blob Liquid Gradients & High-Contrast Badges
        nodes.forEach(n => {
            const isHovered = hoveredNode && hoveredNode.id === n.id;
            const isDimmed = hoveredNode && !isHovered;
            const nodeRadius = isHovered ? 12 : 9.5;

            ctx.globalAlpha = isDimmed ? 0.35 : 1.0;

            // Liquid Organic Radial Halo Blob around node
            if (n.status === 'affected' && !isHealthy) {
                const auraGrad = ctx.createRadialGradient(n._x, n._y, 2, n._x, n._y, nodeRadius + 9);
                auraGrad.addColorStop(0, "rgba(239, 68, 68, 0.65)");
                auraGrad.addColorStop(1, "rgba(239, 68, 68, 0.0)");

                ctx.beginPath();
                ctx.arc(n._x, n._y, nodeRadius + 9, 0, Math.PI * 2);
                ctx.fillStyle = auraGrad;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(n._x, n._y, nodeRadius, 0, Math.PI * 2);
                ctx.fillStyle = "#EF4444";
                ctx.fill();
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 2.5;
                ctx.stroke();
            } else if (n.status === 'safe' || isHealthy) {
                const auraGrad = ctx.createRadialGradient(n._x, n._y, 2, n._x, n._y, nodeRadius + 7);
                auraGrad.addColorStop(0, isLight ? "rgba(5, 150, 105, 0.4)" : "rgba(16, 185, 129, 0.45)");
                auraGrad.addColorStop(1, "rgba(16, 185, 129, 0.0)");

                ctx.beginPath();
                ctx.arc(n._x, n._y, nodeRadius + 7, 0, Math.PI * 2);
                ctx.fillStyle = auraGrad;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(n._x, n._y, nodeRadius, 0, Math.PI * 2);
                ctx.fillStyle = isLight ? "#059669" : "#10B981";
                ctx.fill();
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (n.type === 'plant') {
                const auraGrad = ctx.createRadialGradient(n._x, n._y, 2, n._x, n._y, 16);
                auraGrad.addColorStop(0, "rgba(59, 130, 246, 0.45)");
                auraGrad.addColorStop(1, "rgba(59, 130, 246, 0.0)");

                ctx.beginPath();
                ctx.arc(n._x, n._y, 16, 0, Math.PI * 2);
                ctx.fillStyle = auraGrad;
                ctx.fill();

                ctx.fillStyle = (n.status === 'exposed' && !isHealthy) ? "#F59E0B" : "#3B82F6";
                ctx.fillRect(n._x - 8, n._y - 8, 16, 16);
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 2;
                ctx.strokeRect(n._x - 8, n._y - 8, 16, 16);
            } else if (n.type === 'hub') {
                const auraGrad = ctx.createRadialGradient(n._x, n._y, 2, n._x, n._y, 15);
                auraGrad.addColorStop(0, "rgba(139, 92, 246, 0.45)");
                auraGrad.addColorStop(1, "rgba(139, 92, 246, 0.0)");

                ctx.beginPath();
                ctx.arc(n._x, n._y, 15, 0, Math.PI * 2);
                ctx.fillStyle = auraGrad;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(n._x, n._y, nodeRadius + 2, 0, Math.PI * 2);
                ctx.fillStyle = "#8B5CF6";
                ctx.fill();
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // High-Contrast Label Pill Badge
            const labelText = n.name;
            ctx.font = isHovered ? "bold 12px 'Plus Jakarta Sans', sans-serif" : "bold 11px 'Plus Jakarta Sans', sans-serif";
            const textWidth = ctx.measureText(labelText).width;

            const isRightSide = n._x > w * 0.55;
            const badgeX = isRightSide ? n._x - textWidth - 22 : n._x + 16;
            const badgeY = n._y - 10;

            // Pill background for maximum contrast against any lines
            ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(15, 23, 42, 0.92)";
            ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.22)" : "rgba(255, 255, 255, 0.22)";
            ctx.lineWidth = 1;
            
            // Draw rounded pill
            const pillW = textWidth + 12;
            const pillH = 19;
            ctx.beginPath();
            ctx.roundRect(badgeX - 4, badgeY, pillW, pillH, 4);
            ctx.fill();
            ctx.stroke();

            // High-Contrast Text Label
            if (n.status === 'affected' && !isHealthy) {
                ctx.fillStyle = isLight ? "#991B1B" : "#FCA5A5"; // Deep crimson in light mode
            } else if (n.status === 'safe' || isHealthy) {
                ctx.fillStyle = isLight ? "#064E3B" : "#6EE7B7"; // Deep forest green in light mode
            } else if (n.type === 'plant') {
                ctx.fillStyle = isLight ? "#1E3A8A" : "#93C5FD"; // Deep navy in light mode
            } else if (n.type === 'hub') {
                ctx.fillStyle = isLight ? "#581C87" : "#C4B5FD"; // Deep purple in light mode
            } else {
                ctx.fillStyle = isLight ? "#0F172A" : "#F8FAFC";
            }
            ctx.textAlign = "left";
            ctx.fillText(labelText, badgeX + 2, badgeY + 13.5);

            ctx.globalAlpha = 1.0;
        });

        // Draw Interactive Rich Tooltip on Hover
        if (hoveredNode) {
            const hx = Math.min(w - 200, Math.max(15, hoveredNode._x - 90));
            const hy = Math.max(15, hoveredNode._y - 65);

            const tipW = 180;
            const tipH = 55;

            ctx.fillStyle = isLight ? "#FFFFFF" : "#0F172A";
            ctx.strokeStyle = isLight ? "#CBD5E1" : "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(hx, hy, tipW, tipH, 6);
            ctx.fill();
            ctx.stroke();

            // Tooltip Title
            ctx.fillStyle = isLight ? "#0F172A" : "#FFFFFF";
            ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(hoveredNode.name, hx + 8, hy + 15);

            // Status Badge
            const isAff = hoveredNode.status === 'affected' && !isHealthy;
            ctx.fillStyle = isAff ? "#EF4444" : "#10B981";
            ctx.font = "bold 9px 'Plus Jakarta Sans', sans-serif";
            const statText = isAff 
                ? `🔴 DISRUPTED (${hoveredNode.category || 'Supplier'})` 
                : (isHealthy ? `🟢 HEALTHY (100% Operational)` : `🟢 SAFE (${hoveredNode.category || 'Supplier'})`);
            ctx.fillText(statText, hx + 8, hy + 29);

            // Proximity & details
            ctx.fillStyle = isLight ? "#64748B" : "#94A3B8";
            ctx.font = "9px 'Plus Jakarta Sans', sans-serif";
            const detailText = hoveredNode.city ? `${hoveredNode.city}, ${hoveredNode.country} • Tier-${hoveredNode.tier || 1}` : (hoveredNode.impact_reason || 'Operational node');
            ctx.fillText(detailText, hx + 8, hy + 44);
        }
    }

    // Canvas Mouse Interaction (Hover tooltip and click select)
    const topologyCanvas = document.getElementById('topologyCanvas');
    if (topologyCanvas) {
        topologyCanvas.addEventListener('mousemove', (e) => {
            if (!activeTopologyData || !activeTopologyData.nodes) return;
            const rect = topologyCanvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let hitNode = null;
            activeTopologyData.nodes.forEach(n => {
                if (n._x !== undefined && n._y !== undefined) {
                    const dist = Math.hypot(n._x - mouseX, n._y - mouseY);
                    if (dist <= 20) {
                        hitNode = n;
                    }
                }
            });

            if (hitNode !== hoveredNode) {
                hoveredNode = hitNode;
                topologyCanvas.style.cursor = hitNode ? "pointer" : "default";
                renderTopologyGraph(activeTopologyData);
            }
        });

        topologyCanvas.addEventListener('mouseleave', () => {
            if (hoveredNode) {
                hoveredNode = null;
                topologyCanvas.style.cursor = "default";
                renderTopologyGraph(activeTopologyData);
            }
        });

        topologyCanvas.addEventListener('click', (e) => {
            if (hoveredNode && hoveredNode.type === 'supplier') {
                if (inputSupplier) inputSupplier.value = hoveredNode.name;
                if (hoveredNode.city && inputOrigin) inputOrigin.value = `${hoveredNode.city}, ${hoveredNode.country}`;
                triggerPipeline();
            }
        });
    }

    async function triggerPipeline(options = {}) {
        let supplier = inputSupplier ? inputSupplier.value.trim() : "";
        let origin = inputOrigin ? inputOrigin.value.trim() : "";
        let destination = inputDestination ? inputDestination.value.trim() : "";
        const transportMode = selectTransportMode ? selectTransportMode.value : "Ocean Freight";
        const forceNoEvent = options.forceNoEvent || false;

        if (runPipelineBtn) {
            runPipelineBtn.innerHTML = `<span class="btn-icon">⏳</span> Running Multi-Agent Pipeline...`;
            runPipelineBtn.disabled = true;
        }

        // Sequential step pulse animation during agent execution
        const stepIds = ['step1', 'step2', 'step3', 'step4', 'step5'];
        stepIds.forEach(id => {
            const stepEl = document.getElementById(id);
            if (stepEl) stepEl.classList.remove('running');
        });

        let currentStepIdx = 0;
        const stepInterval = setInterval(() => {
            if (currentStepIdx < stepIds.length) {
                const prev = document.getElementById(stepIds[currentStepIdx - 1]);
                if (prev) prev.classList.remove('running');
                const curr = document.getElementById(stepIds[currentStepIdx]);
                if (curr) curr.classList.add('running');
                currentStepIdx++;
            }
        }, 220);

        try {
            const url = new URL('/api/pipeline', window.location.origin);
            if (supplier) url.searchParams.append('supplier', supplier);
            if (origin) url.searchParams.append('origin', origin);
            if (destination) url.searchParams.append('destination', destination);
            if (transportMode) url.searchParams.append('transport_mode', transportMode);
            if (forceNoEvent) url.searchParams.append('force_no_event', 'true');
            url.searchParams.append('use_live_api', isLiveApiMode);

            const res = await fetch(url);
            const data = await res.json();

            currentPipelineData = data;
            
            const rec = data.recommendation || {};
            const opts = rec.allOptions || [];
            const recOpt = opts.find(o => o.isRecommended) || opts[1] || opts[0];
            selectedOptionId = recOpt ? recOpt.id : 1;

            renderDashboard();
        } catch (err) {
            console.error("Pipeline Execution Error:", err);
        } finally {
            clearInterval(stepInterval);
            stepIds.forEach(id => {
                const stepEl = document.getElementById(id);
                if (stepEl) stepEl.classList.remove('running');
            });
            if (runPipelineBtn) {
                runPipelineBtn.innerHTML = `<span class="btn-icon">⚡</span> Run Agentic Pipeline`;
                runPipelineBtn.disabled = false;
            }
        }
    }

    function renderDashboard() {
        if (!currentPipelineData) return;
        const data = currentPipelineData;

        // 1. Disruption Feed (Agent 1)
        const eventIntel = data.eventIntelligence;
        const allDisruptions = Array.isArray(eventIntel) ? eventIntel : (eventIntel?.allDisruptions || []);
        const activeDisruption = Array.isArray(eventIntel) ? eventIntel[0] : (eventIntel?.activeDisruption || {});
        renderDisruptionFeed(allDisruptions, activeDisruption);

        // 1b. Supplier Live News & Raw Material Shortage Radar
        renderSupplierNewsAndShortages(data.supplierNews, data.executiveSummary);

        // 2. Exposure & Network Topology (Agent 2)
        renderExposure(data.exposureAnalysis);
        if (data.topologyGraph) {
            renderTopologyGraph(data.topologyGraph);
        }

        // 3. Operations & Commercial Telemetry (Agents 3 & 4)
        renderOperations(data.operationsImpact);
        renderCommercial(data.commercialImpact);

        // Executive Summary & Risk Gauge
        const exec = data.executiveSummary || {};
        const fin = data.financialImpact || {};
        const isHealthy = exec.severity === 'None' || exec.severityScore === 0;

        const riskPct = exec.riskScorePct || (isHealthy ? 0.0 : 75.0);
        const riskLevel = isHealthy ? "HEALTHY & SAFE (0% RISK)" : (riskPct >= 70 ? "CRITICAL RISK" : (riskPct >= 45 ? "HIGH RISK" : "MODERATE RISK"));
        
        document.getElementById('riskScorePctVal').textContent = `${riskPct}%`;
        const fillElem = document.getElementById('riskProgressFill');
        fillElem.style.width = `${Math.min(100, Math.max(0, riskPct))}%`;

        const badgeElem = document.getElementById('riskLevelBadge');
        badgeElem.textContent = riskLevel;
        badgeElem.className = `badge ${isHealthy ? 'badge-healthy' : (riskPct >= 70 ? 'badge-danger' : 'badge-warning')}`;

        document.getElementById('riskScoreCardTitle').textContent = isHealthy ? "NETWORK HEALTHY • NORMAL BASELINE" : `ACTIVE DISRUPTION • ${exec.activeEvent?.toUpperCase()}`;
        document.getElementById('riskScoreSub').textContent = isHealthy 
            ? "Zero active disruption risk. Standard inventory buffering is sufficient — carry on with regular operations."
            : `Multi-agent intelligence is evaluating mitigation strategies for ${exec.affectedSupplier} along ${exec.locationDisplay}.`;

        document.getElementById('execTitle').textContent = isHealthy ? "🟢 Normal Baseline Operations • Safe" : `${exec.affectedSupplier} — ${exec.activeEvent}`;
        document.getElementById('execDesc').textContent = isHealthy
            ? "No natural disaster events (earthquake, flood, storm) or financial crises detected across monitored corridors. All supply lines, factory shifts, and customer delivery commitments are operating within standard parameters — carry on with regular operations."
            : `Severe external disruption detected. The autonomous agentic team has calculated BOM exposure, manufacturing capacity loss, stockout horizon, and customer SLA penalties.`;
        
        document.getElementById('execSupplier').textContent = exec.affectedSupplier || "Target Vendor";
        document.getElementById('execLocation').textContent = exec.locationDisplay || "Global Network";
        
        const sevElem = document.getElementById('execSeverity');
        sevElem.textContent = isHealthy ? "Normal / Safe" : exec.severity || "High";
        sevElem.className = isHealthy ? "text-success" : "text-danger";

        document.getElementById('execEngine').textContent = isHealthy ? "Autonomous Health Monitor" : "Multi-Agent Decision Intelligence";

        // 4. Recommendation & Strategy Leaderboard (Agent 5)
        const rec = data.recommendation || {};
        const options = rec.allOptions || [];
        
        renderScenarioOptions(options);
        updateSelectedOptionResults(options, fin, isHealthy, data.commercialImpact);
    }

    function renderExposure(exposure) {
        const container = document.getElementById('exposureContainer');
        const badge = document.getElementById('exposureBadge');
        if (!container || !exposure) return;

        if (exposure.suppliers_impacted_count === 0 && exposure.parts_affected_count === 0) {
            badge.textContent = "0 Exposed";
            container.innerHTML = `<div class="signal-item"><span>No tier-1 or tier-2 supplier exposure detected. All supply lines normal.</span></div>`;
            return;
        }

        badge.textContent = `${exposure.suppliers_impacted_count} Suppliers • ${exposure.parts_affected_count} Parts`;

        let partsHtml = (exposure.affected_parts || []).slice(0, 4).map(p => 
            `<span class="part-pill">${p.part_id}: ${p.part_name}</span>`
        ).join('');

        let plantsHtml = (exposure.exposed_plants || []).map(pl => 
            `<span class="pill" style="font-size:10px;">🏭 ${pl.plant_name} (${pl.parts_exposed?.length || 1} parts)</span>`
        ).join(' ');

        container.innerHTML = `
            <div class="tree-node">
                <div class="tree-header">
                    <span>Direct & Upstream Suppliers</span>
                    <span class="badge badge-info">${exposure.tier1_suppliers?.length || 1} Tier-1 | ${exposure.tier2_suppliers?.length || 0} Tier-2</span>
                </div>
                <div class="tree-sub">Primary Hit: <strong>${exposure.supplier_hit}</strong></div>
            </div>
            <div class="tree-node">
                <div class="tree-header">
                    <span>Impacted BOM Components</span>
                    <span class="badge badge-warning">${exposure.parts_affected_count} Parts</span>
                </div>
                <div class="part-tag-list">${partsHtml}</div>
            </div>
            <div class="tree-node">
                <div class="tree-header">
                    <span>Downstream Exposed Plants</span>
                    <span class="badge badge-danger">${exposure.plants_exposed_count} Plants</span>
                </div>
                <div style="margin-top:4px; display:flex; flex-wrap:wrap; gap:4px;">${plantsHtml}</div>
            </div>
        `;
    }

    function renderSupplierNewsAndShortages(supplierNews, execSummary) {
        const container = document.getElementById('supplierNewsContainer');
        const badge = document.getElementById('shortageBadge');
        if (!container) return;

        if (!supplierNews) {
            container.innerHTML = `<div class="signal-item" style="font-size: 11px;"><span>No supplier shortage signals detected.</span></div>`;
            if (badge) badge.textContent = "Stable";
            return;
        }

        const rawMaterials = supplierNews.rawMaterials || [];
        const latestNews = supplierNews.latestNews || [];
        const shortageLevel = supplierNews.shortageLevel || "Normal Buffer";

        if (badge) {
            badge.textContent = shortageLevel;
            if (shortageLevel.includes("Critical")) {
                badge.className = "badge badge-danger";
            } else if (shortageLevel.includes("Moderate")) {
                badge.className = "badge badge-warning";
            } else {
                badge.className = "badge badge-success";
            }
        }

        let html = '';

        // Upstream Raw Material Shortages Section
        if (rawMaterials.length > 0) {
            html += `<div class="radar-sub-header"><span>🧱 Upstream Raw Material Shortages</span> <span>${rawMaterials.length} Tracked</span></div>`;
            html += `<div class="raw-materials-grid">`;
            rawMaterials.slice(0, 3).forEach(rm => {
                let badgeClass = 'scarcity-low';
                if (rm.scarcity === 'Critical') badgeClass = 'scarcity-critical';
                else if (rm.scarcity === 'High') badgeClass = 'scarcity-high';
                else if (rm.scarcity === 'Moderate') badgeClass = 'scarcity-moderate';

                html += `
                    <div class="raw-mat-card">
                        <div class="raw-mat-info">
                            <span class="raw-mat-name">${rm.material}</span>
                            <span class="raw-mat-vendor">Vendor: ${rm.supplier} • Lead Time: ${rm.lead_time_impact}</span>
                        </div>
                        <span class="raw-mat-badge ${badgeClass}">${rm.scarcity}</span>
                    </div>
                `;
            });
            html += `</div>`;
        }

        // Live Supplier News Articles
        if (latestNews.length > 0) {
            html += `<div class="radar-sub-header" style="margin-top: 8px;"><span>📰 Latest Supplier Headlines</span> <span>${latestNews.length} Signals</span></div>`;
            latestNews.slice(0, 3).forEach(n => {
                html += `
                    <a href="${n.url || '#'}" target="_blank" class="news-item-card">
                        <div class="news-card-header">
                            <span class="news-tag-pill">${n.category || 'Market'}</span>
                            <span class="news-time">${n.source} • ${n.published || 'Live'}</span>
                        </div>
                        <div class="news-title">${n.title}</div>
                        <div class="news-summary">${n.summary}</div>
                    </a>
                `;
            });
        }

        container.innerHTML = html || `<div class="signal-item" style="font-size: 11px;"><span>Operating within normal supplier thresholds.</span></div>`;
    }

    function renderOperations(ops) {
        if (!ops) return;
        const cap = ops.capacity || {};
        const inv = ops.inventory || {};

        const capLossElem = document.getElementById('opsCapacityLoss');
        const recDaysElem = document.getElementById('opsRecoveryDays');
        const dosElem = document.getElementById('opsDos');
        const safetyElem = document.getElementById('opsSafetyBreaches');

        if (capLossElem) capLossElem.textContent = `${cap.weighted_avg_capacity_loss_pct || 0}%`;
        if (recDaysElem) recDaysElem.textContent = `${cap.max_recovery_days || 0} Days`;
        if (dosElem) dosElem.textContent = inv.earliest_stockout_days ? `${inv.earliest_stockout_days} Days` : '-- Days';
        if (safetyElem) safetyElem.textContent = `${inv.safety_stock_breaches || 0} Parts`;
    }

    function renderCommercial(comm) {
        if (!comm) return;
        const custElem = document.getElementById('commCustomersCount');
        const ordElem = document.getElementById('commOrdersCount');
        const otifElem = document.getElementById('commOtifDrop');
        const slaElem = document.getElementById('commSlaPenalties');

        if (custElem) custElem.textContent = `${comm.impacted_customers_count || 0} (${comm.strategic_tier1_customers_count || 0} Tier-1 VIP)`;
        if (ordElem) ordElem.textContent = `${comm.impacted_orders_count || 0} Orders`;
        if (otifElem) otifElem.textContent = `-${comm.otif_drop_pct || 0}% (To ${comm.projected_otif_pct || 98}%)`;
        if (slaElem) slaElem.textContent = `$${((comm.total_sla_penalties_usd || 0)/1e6).toFixed(2)}M`;
    }

    function updateSelectedOptionResults(options, fin, isHealthy, commercialImpact) {
        const selectedOpt = options.find(o => o.id === selectedOptionId) || options[0];
        const recOpt = options.find(o => o.isRecommended) || options[2] || options[0];
        if (!selectedOpt) return;

        const baseRev = Number(commercialImpact?.revenue_at_risk_usd || fin.revenueRisk || 0);
        const baseRiskPct = Number(fin.riskScorePct) || (isHealthy ? 0.0 : 75.0);

        const selRiskPct = isHealthy ? 0.0 : (selectedOpt.postMitigationRiskPct !== undefined ? selectedOpt.postMitigationRiskPct : (selectedOpt.id === 1 ? baseRiskPct : 12.5));
        const selRiskLevel = selRiskPct <= 0.0 ? "HEALTHY (0% RISK)" : (selRiskPct <= 15.0 ? "LOW RESIDUAL RISK" : (selRiskPct <= 35.0 ? "MODERATE RISK" : "HIGH EXPOSURE"));
        
        document.getElementById('riskScorePctVal').textContent = `${selRiskPct}%`;
        const fillElem = document.getElementById('riskProgressFill');
        fillElem.style.width = `${Math.min(100, Math.max(0, selRiskPct))}%`;

        const badgeElem = document.getElementById('riskLevelBadge');
        badgeElem.textContent = selRiskLevel;
        badgeElem.className = `badge ${isHealthy ? 'badge-healthy' : (selRiskPct <= 15.0 ? 'badge-success' : (selRiskPct <= 35.0 ? 'badge-warning' : 'badge-danger'))}`;

        let remRisk = selectedOpt.revenueAtRiskUsd;
        if (remRisk === undefined || remRisk === null) {
            remRisk = isHealthy ? 0 : Math.round(baseRev * (selRiskPct / (baseRiskPct || 100)));
        }

        const revSaved = Math.max(0, baseRev - remRisk);
        const pctSaved = baseRev > 0 ? ((revSaved / baseRev) * 100).toFixed(1) : (isHealthy ? "100.0" : "0.0");

        // KPI Card 1: Remaining Risk
        const kpiRevRiskElem = document.getElementById('kpiRevRisk');
        if (isHealthy || remRisk === 0) {
            kpiRevRiskElem.textContent = "$0";
        } else {
            kpiRevRiskElem.textContent = `$${(remRisk / 1e6).toFixed(2)}M`;
        }
        document.getElementById('kpiRevSub').textContent = isHealthy 
            ? "0% Residual Risk • Fully Protected" 
            : `Residual Risk: ${selRiskPct}% | Base: $${(baseRev / 1e6).toFixed(2)}M`;

        // KPI Card 2: Revenue Protected
        const kpiProtectedElem = document.getElementById('kpiRevProtected');
        if (isHealthy) {
            kpiProtectedElem.textContent = "$0 (Baseline)";
            document.getElementById('kpiProtectedSub').textContent = "100% Protected (No Event)";
        } else {
            kpiProtectedElem.textContent = `$${(revSaved / 1e6).toFixed(2)}M`;
            document.getElementById('kpiProtectedSub').textContent = `${pctSaved}% Revenue Saved (${selRiskLevel})`;
        }

        // KPI Card 3: Projected OTIF
        document.getElementById('kpiOtif').textContent = isHealthy ? "98.0%" : (selectedOpt.projectedOtif || "96.0%");
        document.getElementById('kpiOtifSub').textContent = isHealthy ? "Standard Delivery Schedule" : `Post-Mitigation OTIF`;

        // KPI Card 4: Timeline & Cost
        const costVal = selectedOpt.costUsd || 0;
        document.getElementById('kpiTimeline').textContent = isHealthy ? "0 Weeks" : `${selectedOpt.recoveryWeeks} ${selectedOpt.recoveryWeeks === 1 ? 'Week' : 'Weeks'}`;
        document.getElementById('kpiTimelineSub').textContent = isHealthy ? "Zero Mitigation Cost ($0)" : `Strategy Cost: $${(costVal / 1e6).toFixed(2)}M`;

        // Update Active Selected Option Box on Right Panel
        document.getElementById('recHighlightBadge').textContent = selectedOpt.isRecommended ? "🏆 AI RECOMMENDED STRATEGY" : "👉 USER SELECTED SCENARIO";
        document.getElementById('recHighlightBadge').className = `highlight-label ${selectedOpt.isRecommended ? 'badge-success' : 'badge-warning'}`;
        document.getElementById('recTitle').textContent = selectedOpt.name;
        document.getElementById('recDetails').textContent = selectedOpt.actionDetails || "";
        document.getElementById('recCost').textContent = `$${costVal.toLocaleString()}`;
        document.getElementById('recTimeline').textContent = `${selectedOpt.recoveryWeeks} Weeks`;

        const netBenefitVal = Math.max(0, revSaved - costVal);
        document.getElementById('recTradeoff').innerHTML = isHealthy
            ? "Supply chain network is operating under normal parameters with zero active disruption risk."
            : `Executing <strong>${selectedOpt.name}</strong> achieves <strong>$${(revSaved / 1e6).toFixed(2)}M in Revenue Protection</strong> for an operational mitigation cost of <strong>$${(costVal / 1e6).toFixed(2)}M</strong> (Net Strategy Benefit: <strong>+$${(netBenefitVal / 1e6).toFixed(2)}M</strong>).`;

        // Update Comparison Delta Table
        updateComparisonTable(recOpt, selectedOpt, baseRev, baseRiskPct, isHealthy);
    }

    function updateComparisonTable(recOpt, selOpt, baseRev, baseRiskPct, isHealthy) {
        if (!recOpt || !selOpt) return;

        document.getElementById('cmpRecName').textContent = recOpt.name.split(':')[1] || recOpt.name;
        document.getElementById('cmpSelName').textContent = selOpt.name.split(':')[1] || selOpt.name;

        const isMatch = recOpt.id === selOpt.id;
        document.getElementById('cmpNameDelta').innerHTML = isMatch 
            ? `<span class="delta-tag positive">Matching (Optimal)</span>` 
            : `<span class="delta-tag warning">Alternative Strategy</span>`;

        const recRisk = isHealthy ? 0.0 : (recOpt.postMitigationRiskPct !== undefined ? recOpt.postMitigationRiskPct : 10.0);
        const selRisk = isHealthy ? 0.0 : (selOpt.postMitigationRiskPct !== undefined ? selOpt.postMitigationRiskPct : (selOpt.id === 1 ? baseRiskPct : 12.5));
        
        const recLevelTag = recRisk <= 0.0 ? "(HEALTHY)" : (recRisk <= 15.0 ? "(LOW RISK)" : (recRisk <= 35.0 ? "(MODERATE RISK)" : "(HIGH RISK)"));
        const selLevelTag = selRisk <= 0.0 ? "(HEALTHY)" : (selRisk <= 15.0 ? "(LOW RISK)" : (selRisk <= 35.0 ? "(MODERATE RISK)" : "(HIGH RISK)"));
        
        document.getElementById('cmpRecRisk').textContent = `${recRisk}% ${recLevelTag}`;
        document.getElementById('cmpSelRisk').textContent = `${selRisk}% ${selLevelTag}`;
        
        const riskDelta = (selRisk - recRisk).toFixed(1);
        document.getElementById('cmpRiskDelta').innerHTML = riskDelta == 0 
            ? `<span class="delta-tag neutral">0.0%</span>` 
            : (riskDelta > 0 ? `<span class="delta-tag negative">+${riskDelta}% Risk</span>` : `<span class="delta-tag positive">${riskDelta}% Risk</span>`);

        const recRem = recOpt.revenueAtRiskUsd !== undefined ? recOpt.revenueAtRiskUsd : (isHealthy ? 0 : Math.round(baseRev * (recRisk / (baseRiskPct || 100))));
        const selRem = selOpt.revenueAtRiskUsd !== undefined ? selOpt.revenueAtRiskUsd : (isHealthy ? 0 : Math.round(baseRev * (selRisk / (baseRiskPct || 100))));
        
        const recSaved = Math.max(0, baseRev - recRem);
        const selSaved = Math.max(0, baseRev - selRem);

        document.getElementById('cmpRecRev').textContent = isHealthy ? "$0.00M" : `$${(recSaved / 1e6).toFixed(2)}M`;
        document.getElementById('cmpSelRev').textContent = isHealthy ? "$0.00M" : `$${(selSaved / 1e6).toFixed(2)}M`;
        
        const revDelta = ((selSaved - recSaved) / 1e6).toFixed(2);
        document.getElementById('cmpRevDelta').innerHTML = revDelta == 0 
            ? `<span class="delta-tag neutral">$0.00M</span>` 
            : (revDelta > 0 ? `<span class="delta-tag positive">+$${revDelta}M Saved</span>` : `<span class="delta-tag negative">-$${Math.abs(revDelta)}M Loss</span>`);

        document.getElementById('cmpRecCost').textContent = `$${(recOpt.costUsd || 0).toLocaleString()}`;
        document.getElementById('cmpSelCost').textContent = `$${(selOpt.costUsd || 0).toLocaleString()}`;
        
        const costDelta = (selOpt.costUsd || 0) - (recOpt.costUsd || 0);
        document.getElementById('cmpCostDelta').innerHTML = costDelta == 0 
            ? `<span class="delta-tag neutral">$0</span>` 
            : (costDelta > 0 ? `<span class="delta-tag negative">+$${(costDelta / 1e6).toFixed(2)}M Cost</span>` : `<span class="delta-tag positive">-$${(Math.abs(costDelta) / 1e6).toFixed(2)}M Cost</span>`);

        document.getElementById('cmpRecOtif').textContent = recOpt.projectedOtif || "--%";
        document.getElementById('cmpSelOtif').textContent = selOpt.projectedOtif || "--%";
        
        const recOtifNum = parseFloat(recOpt.projectedOtif) || 96;
        const selOtifNum = parseFloat(selOpt.projectedOtif) || 90;
        const otifDelta = (selOtifNum - recOtifNum).toFixed(1);
        document.getElementById('cmpOtifDelta').innerHTML = otifDelta == 0 
            ? `<span class="delta-tag neutral">0.0%</span>` 
            : (otifDelta > 0 ? `<span class="delta-tag positive">+${otifDelta}% OTIF</span>` : `<span class="delta-tag negative">${otifDelta}% OTIF</span>`);

        document.getElementById('cmpRecTimeline').textContent = `${recOpt.recoveryWeeks} Wks`;
        document.getElementById('cmpSelTimeline').textContent = `${selOpt.recoveryWeeks} Wks`;
        
        const timeDelta = selOpt.recoveryWeeks - recOpt.recoveryWeeks;
        document.getElementById('cmpTimelineDelta').innerHTML = timeDelta == 0 
            ? `<span class="delta-tag neutral">0 Wks</span>` 
            : (timeDelta > 0 ? `<span class="delta-tag negative">+${timeDelta} Wks</span>` : `<span class="delta-tag positive">${timeDelta} Wks</span>`);
    }

    function renderScenarioOptions(options) {
        const list = document.getElementById('optionsList');
        list.innerHTML = '';

        options.forEach(opt => {
            const isSelected = opt.id === selectedOptionId;
            const card = document.createElement('div');
            card.className = `option-card ${opt.isRecommended ? 'recommended' : ''} ${isSelected ? 'selected' : ''}`;
            
            const riskPctDisplay = opt.postMitigationRiskPct !== undefined ? `${opt.postMitigationRiskPct}%` : (opt.id === 1 ? 'High' : 'Low');
            const remRiskDollar = opt.revenueAtRiskUsd ? `$${(opt.revenueAtRiskUsd / 1e6).toFixed(2)}M` : '$0';

            card.innerHTML = `
                <div class="opt-head">
                    <span class="opt-title">${opt.name}</span>
                    ${opt.isRecommended ? '<span class="badge badge-success">AI Recommended 🏆</span>' : ''}
                </div>
                <div class="opt-body">
                    <p>${opt.actionDetails || ''}</p>
                </div>
                <div class="opt-footer">
                    <span>Exposure: <strong>${remRiskDollar}</strong></span>
                    <span>Risk: <strong>${riskPctDisplay}</strong></span>
                    <span>Cost: <strong>$${(opt.costUsd || 0).toLocaleString()}</strong></span>
                    <span>OTIF: <strong>${opt.projectedOtif}</strong></span>
                    <span>Recovery: <strong>${opt.recoveryWeeks} Wks</strong></span>
                </div>
            `;

            card.addEventListener('click', () => {
                selectedOptionId = opt.id;
                renderDashboard();
            });

            list.appendChild(card);
        });
    }

    function renderDisruptionFeed(disruptions, activeEvent) {
        const feed = document.getElementById('disruptionFeed');
        feed.innerHTML = '';

        if (!disruptions || disruptions.length === 0) {
            feed.innerHTML = `
                <div class="idle-feed-msg">
                    <div class="idle-icon">📡</div>
                    <h4>System Standby</h4>
                    <p>Enter a supplier and shipment route above, then click <strong>"Run Agentic Pipeline"</strong> to sense live global logistics disruptions.</p>
                </div>
            `;
            return;
        }

        disruptions.forEach((d) => {
            const isActive = activeEvent && d.id === activeEvent.id;
            const item = document.createElement('div');
            item.className = `disruption-item ${isActive ? 'active' : ''}`;
            const isHealthy = d.severity === 'None';
            item.innerHTML = `
                <div class="d-head">
                    <span class="d-title">${d.event_type}</span>
                    <span class="badge ${isHealthy ? 'badge-healthy' : (d.severity === 'Critical' || d.severity === 'High' ? 'badge-danger' : 'badge-info')}">${isHealthy ? 'Normal' : d.severity}</span>
                </div>
                <div class="d-supplier">${d.supplier} (${d.location})</div>
                <div class="d-desc">${d.description}</div>
            `;
            item.addEventListener('click', () => {
                if (d.supplier && inputSupplier) inputSupplier.value = d.supplier;
                if (d.origin && inputOrigin) inputOrigin.value = d.origin;
                if (d.destination && inputDestination) inputDestination.value = d.destination;
                triggerPipeline();
            });
            feed.appendChild(item);
        });
    }

    // -------------------------------------------------------------
    // Agent 6: Smart Q&A Copilot Interactive Chat
    // -------------------------------------------------------------
    const copilotToggleBtn = document.getElementById('copilotToggleBtn');
    const copilotDrawer = document.getElementById('copilotDrawer');
    const closeCopilotBtn = document.getElementById('closeCopilotBtn');
    const copilotInput = document.getElementById('copilotInput');
    const copilotSendBtn = document.getElementById('copilotSendBtn');
    const copilotMessages = document.getElementById('copilotMessages');
    const chipBtns = document.querySelectorAll('.chip-btn');

    if (copilotToggleBtn && copilotDrawer) {
        copilotToggleBtn.addEventListener('click', () => {
            copilotDrawer.classList.toggle('active');
            if (copilotDrawer.classList.contains('active')) {
                copilotInput.focus();
            }
        });

        if (closeCopilotBtn) {
            closeCopilotBtn.addEventListener('click', () => {
                copilotDrawer.classList.remove('active');
            });
        }

        chipBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.getAttribute('data-prompt');
                if (prompt) {
                    copilotInput.value = prompt;
                    sendCopilotMessage();
                }
            });
        });

        if (copilotSendBtn) {
            copilotSendBtn.addEventListener('click', sendCopilotMessage);
        }

        if (copilotInput) {
            copilotInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    sendCopilotMessage();
                }
            });
        }
    }

    async function sendCopilotMessage() {
        const text = copilotInput.value.trim();
        if (!text) return;

        appendMessage('user', text);
        copilotInput.value = '';

        const typingId = 'typing-' + Date.now();
        const typingEl = document.createElement('div');
        typingEl.className = 'copilot-msg assistant';
        typingEl.id = typingId;
        typingEl.innerHTML = `
            <div class="msg-bubble">
                <em>Synthesizing multi-agent telemetry...</em>
            </div>
        `;
        copilotMessages.appendChild(typingEl);
        copilotMessages.scrollTop = copilotMessages.scrollHeight;

        try {
            const payload = {
                question: text,
                supplier: (inputSupplier && inputSupplier.value.trim()) ? inputSupplier.value.trim() : 'TSMC',
                origin: (inputOrigin && inputOrigin.value.trim()) ? inputOrigin.value.trim() : 'Hsinchu',
                destination: (inputDestination && inputDestination.value.trim()) ? inputDestination.value.trim() : 'Austin, Texas',
                transport_mode: (selectTransportMode && selectTransportMode.value) ? selectTransportMode.value : 'Ocean Freight'
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            const typingNode = document.getElementById(typingId);
            if (typingNode) typingNode.remove();

            appendMessage('assistant', data.answer, data.source, data.tokensEstimated);
        } catch (err) {
            const typingNode = document.getElementById(typingId);
            if (typingNode) typingNode.remove();

            appendMessage('assistant', '⚠️ Unable to connect to Copilot service. Please verify server connectivity.', 'Error', 0);
        }
    }

    function appendMessage(sender, text, source = null, tokens = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `copilot-msg ${sender}`;

        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.2); padding:1px 4px; border-radius:4px;">$1</code>')
            .replace(/\n/g, '<br/>');

        let metaHtml = '';
        if (source) {
            metaHtml = `
                <div class="msg-meta">
                    <span>⚡ ${source}</span>
                    ${tokens !== null && tokens !== undefined ? `<span>• ~${tokens} tokens</span>` : ''}
                </div>
            `;
        }

        msgDiv.innerHTML = `
            <div class="msg-bubble">${formattedText}</div>
            ${metaHtml}
        `;

        copilotMessages.appendChild(msgDiv);
        copilotMessages.scrollTop = copilotMessages.scrollHeight;
    }

    // -------------------------------------------------------------
    // Expanded Dataset Uploader Modal Wiring (6 Datasets)
    // -------------------------------------------------------------
    const openUploadModalBtn = document.getElementById('openUploadModalBtn');
    const uploadModal = document.getElementById('uploadModal');
    const closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
    const closeUploadModalFooterBtn = document.getElementById('closeUploadModalFooterBtn');

    if (openUploadModalBtn && uploadModal) {
        openUploadModalBtn.addEventListener('click', () => {
            uploadModal.style.display = 'flex';
        });

        const closeModal = () => {
            uploadModal.style.display = 'none';
        };

        if (closeUploadModalBtn) closeUploadModalBtn.addEventListener('click', closeModal);
        if (closeUploadModalFooterBtn) closeUploadModalFooterBtn.addEventListener('click', closeModal);

        uploadModal.addEventListener('click', (e) => {
            if (e.target === uploadModal) closeModal();
        });

        // Setup upload channels for all 6 datasets
        setupUploadCard('fileSuppliers', 'nameSuppliers', 'btnUploadSuppliers', 'statusSuppliers', '/api/upload/suppliers');
        setupUploadCard('fileBom', 'nameBom', 'btnUploadBom', 'statusBom', '/api/upload/bom');
        setupUploadCard('fileCapacity', 'nameCapacity', 'btnUploadCapacity', 'statusCapacity', '/api/upload/plant-capacity');
        setupUploadCard('fileInventory', 'nameInventory', 'btnUploadInventory', 'statusInventory', '/api/upload/inventory');
        setupUploadCard('fileOrders', 'nameOrders', 'btnUploadOrders', 'statusOrders', '/api/upload/customer-orders');
        setupUploadCard('fileRiskEvents', 'nameRiskEvents', 'btnUploadEvents', 'statusRiskEvents', '/api/upload/risk-events');
    }

    function setupUploadCard(inputId, nameId, btnId, statusId, endpoint) {
        const fileInput = document.getElementById(inputId);
        const nameLabel = document.getElementById(nameId);
        const actionBtn = document.getElementById(btnId);
        const statusDiv = document.getElementById(statusId);

        if (!fileInput || !actionBtn) return;

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                nameLabel.textContent = file.name;
                nameLabel.classList.add('selected');
                actionBtn.removeAttribute('disabled');
                statusDiv.textContent = '';
                statusDiv.className = 'upload-status';
            }
        });

        actionBtn.addEventListener('click', async () => {
            if (!fileInput.files || fileInput.files.length === 0) return;

            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);

            actionBtn.setAttribute('disabled', 'true');
            statusDiv.textContent = 'Uploading dataset...';
            statusDiv.className = 'upload-status loading';

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();
                if (res.ok) {
                    statusDiv.textContent = `✓ ${data.filename || file.name} loaded`;
                    statusDiv.className = 'upload-status success';
                    setTimeout(() => {
                        triggerPipeline();
                    }, 500);
                } else {
                    statusDiv.textContent = `⚠️ ${data.detail || 'Upload failed'}`;
                    statusDiv.className = 'upload-status error';
                    actionBtn.removeAttribute('disabled');
                }
            } catch (err) {
                statusDiv.textContent = '⚠️ Upload connection error';
                statusDiv.className = 'upload-status error';
                actionBtn.removeAttribute('disabled');
            }
        });
    }

    // Interactive Step Navigation
    setupPipelineStepInteractions();

    function setupPipelineStepInteractions() {
        const steps = [
            { id: 'step1', target: '.param-bar' },
            { id: 'step2', target: '.topology-canvas-center-box' },
            { id: 'step3', target: '#operationsCard' },
            { id: 'step4', target: '#commercialCard' },
            { id: 'step5', target: '.scenarios-card' }
        ];

        steps.forEach((s) => {
            const el = document.getElementById(s.id);
            if (el) {
                el.addEventListener('click', () => {
                    const targetEl = document.querySelector(s.target) || document.getElementById(s.target.replace('#', ''));
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetEl.style.transition = 'box-shadow 0.4s ease';
                        targetEl.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.6)';
                        setTimeout(() => {
                            targetEl.style.boxShadow = '';
                        }, 1200);
                    }
                });
            }
        });
    }
});
