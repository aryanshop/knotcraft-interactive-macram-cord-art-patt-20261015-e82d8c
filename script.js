document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let state = {
        title: "My Macramé Wall Hanging",
        columns: 5,
        zoom: 1,
        cordColor: "#d4a373",
        cordThickness: 4,
        rows: 5, // Default 5 rows
        nodes: {}, // Key: "row-col" -> { type, name, color, thickness }
        selectedKey: null
    };

    // DOM Elements
    const designCanvas = document.getElementById('design-canvas');
    const gridWidthInput = document.getElementById('grid-width');
    const gridWidthVal = document.getElementById('grid-width-val');
    const cordColorInput = document.getElementById('cord-color');
    const cordThicknessSelect = document.getElementById('cord-thickness');
    const projectTitleEl = document.getElementById('project-title');
    
    const statKnots = document.getElementById('stat-knots');
    const statLength = document.getElementById('stat-length');
    const statWidth = document.getElementById('stat-width');
    
    const inspectorContent = document.getElementById('inspector-content');
    
    const btnNew = document.getElementById('btn-new');
    const btnCalc = document.getElementById('btn-calc');
    const btnExport = document.getElementById('btn-export');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    
    const modalSummary = document.getElementById('modal-summary');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const summaryBody = document.getElementById('summary-body');
    const btnPrint = document.getElementById('btn-print');

    // Initialize Canvas Grid
    function renderCanvas() {
        designCanvas.innerHTML = '';
        
        // Calculate estimated hanging width: columns * 8cm
        const estWidthCm = state.columns * 7;
        statWidth.textContent = `${estWidthCm} cm`;

        for (let r = 0; r < state.rows; r++) {
            const rowEl = document.createElement('div');
            rowEl.className = 'canvas-row';
            
            for (let c = 0; c < state.columns; c++) {
                const key = `${r}-${c}`;
                const slotEl = document.createElement('div');
                slotEl.className = 'drop-slot';
                slotEl.dataset.row = r;
                slotEl.dataset.col = c;

                // Check if node exists
                if (state.nodes[key]) {
                    const nodeData = state.nodes[key];
                    const nodeEl = document.createElement('div');
                    nodeEl.className = `canvas-node ${nodeData.type}`;
                    if (state.selectedKey === key) nodeEl.classList.add('selected');
                    
                    nodeEl.style.backgroundColor = nodeData.color;
                    
                    // Inner visual icon
                    const innerIcon = document.createElement('div');
                    innerIcon.className = `knot-icon ${nodeData.type}`;
                    nodeEl.appendChild(innerIcon);

                    // Remove button
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-node';
                    removeBtn.innerHTML = '&times;';
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        delete state.nodes[key];
                        if (state.selectedKey === key) state.selectedKey = null;
                        renderCanvas();
                        updateStats();
                        renderInspector();
                    });
                    nodeEl.appendChild(removeBtn);

                    // Selection & Click
                    nodeEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        state.selectedKey = key;
                        renderCanvas();
                        renderInspector();
                    });

                    slotEl.appendChild(nodeEl);
                } else {
                    // Drag and Drop listeners for empty slot
                    slotEl.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        slotEl.classList.add('drag-over');
                    });

                    slotEl.addEventListener('dragleave', () => {
                        slotEl.classList.remove('drag-over');
                    });

                    slotEl.addEventListener('drop', (e) => {
                        e.preventDefault();
                        slotEl.classList.remove('drag-over');
                        const knotType = e.dataTransfer.getData('text/knot-type');
                        const knotName = e.dataTransfer.getData('text/knot-name');
                        
                        if (knotType) {
                            state.nodes[key] = {
                                type: knotType,
                                name: knotName,
                                color: state.cordColor,
                                thickness: state.cordThickness
                            };
                            state.selectedKey = key;
                            renderCanvas();
                            updateStats();
                            renderInspector();
                        }
                    });
                }

                rowEl.appendChild(slotEl);
            }
            designCanvas.appendChild(rowEl);
        }

        // Add row control at bottom
        const addRowBar = document.createElement('div');
        addRowBar.style.textAlign = 'center';
        addRowBar.style.marginTop = '10px';
        const btnAddRow = document.createElement('button');
        btnAddRow.className = 'btn secondary';
        btnAddRow.textContent = '+ Add Row';
        btnAddRow.addEventListener('click', () => {
            state.rows++;
            renderCanvas();
        });
        addRowBar.appendChild(btnAddRow);
        designCanvas.appendChild(addRowBar);
    }

    // Setup Drag from Sidebar Toolbox
    const knotItems = document.querySelectorAll('.knot-item');
    knotItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/knot-type', item.dataset.type);
            e.dataTransfer.setData('text/knot-name', item.dataset.name);
        });
    });

    // Inspector Panel Rendering
    function renderInspector() {
        if (!state.selectedKey || !state.nodes[state.selectedKey]) {
            inspectorContent.innerHTML = `<p class="empty-state">Select a knot on the canvas to edit its properties, color, or delete it.</p>`;
            return;
        }

        const node = state.nodes[state.selectedKey];
        inspectorContent.innerHTML = `
            <div class="inspector-form">
                <div class="form-group">
                    <label>Knot Type</label>
                    <strong>${node.name}</strong>
                </div>
                <div class="form-group">
                    <label for="insp-color">Knot Cord Color</label>
                    <input type="color" id="insp-color" value="${node.color}">
                </div>
                <div class="form-group">
                    <button class="btn secondary" id="btn-delete-node" style="width: 100%; color: #e76f51; border-color: #e76f51;">Remove Knot</button>
                </div>
            </div>
        `;

        document.getElementById('insp-color').addEventListener('input', (e) => {
            node.color = e.target.value;
            renderCanvas();
        });

        document.getElementById('btn-delete-node').addEventListener('click', () => {
            delete state.nodes[state.selectedKey];
            state.selectedKey = null;
            renderCanvas();
            updateStats();
            renderInspector();
        });
    }

    // Calculate Stats
    function updateStats() {
        const keys = Object.keys(state.nodes);
        statKnots.textContent = keys.length;

        // Cord calculation formula: each square/spiral knot needs roughly 4x length multiplier per cord
        let totalMeters = 0;
        keys.forEach(k => {
            const node = state.nodes[k];
            if (node.type === 'square' || node.type === 'spiral') {
                totalMeters += 1.6; // ~1.6m per 4-cord knot set
            } else if (node.type === 'half-hitch') {
                totalMeters += 0.8;
            } else {
                totalMeters += 0.5;
            }
        });
        statLength.textContent = `${totalMeters.toFixed(1)} meters`;
    }

    // Event Listeners for Global Controls
    gridWidthInput.addEventListener('input', (e) => {
        state.columns = parseInt(e.target.value);
        gridWidthVal.textContent = `${state.columns} cols`;
        renderCanvas();
    });

    cordColorInput.addEventListener('input', (e) => {
        state.cordColor = e.target.value;
    });

    cordThicknessSelect.addEventListener('change', (e) => {
        state.cordThickness = parseInt(e.target.value);
    });

    projectTitleEl.addEventListener('blur', () => {
        state.title = projectTitleEl.textContent.trim() || "Untitled Macramé";
    });

    // Zoom Controls
    btnZoomIn.addEventListener('click', () => {
        state.zoom = Math.min(state.zoom + 0.1, 1.4);
        designCanvas.style.transform = `scale(${state.zoom})`;
    });

    btnZoomOut.addEventListener('click', () => {
        state.zoom = Math.max(state.zoom - 0.1, 0.7);
        designCanvas.style.transform = `scale(${state.zoom})`;
    });

    // New Pattern
    btnNew.addEventListener('click', () => {
        if (confirm("Start a new pattern? All unsaved grid changes will be reset.")) {
            state.nodes = {};
            state.rows = 5;
            state.selectedKey = null;
            projectTitleEl.textContent = "My Macramé Wall Hanging";
            state.title = "My Macramé Wall Hanging";
            renderCanvas();
            updateStats();
            renderInspector();
        }
    });

    // Calculate & Summary Modal
    btnCalc.addEventListener('click', () => {
        const keys = Object.keys(state.nodes);
        let knotCounts = {};
        keys.forEach(k => {
            const n = state.nodes[k];
            knotCounts[n.name] = (knotCounts[n.name] || 0) + 1;
        });

        let breakdownHTML = '';
        for (let name in knotCounts) {
            breakdownHTML += `<li><strong>${knotCounts[name]}x</strong> ${name}</li>`;
        }

        summaryBody.innerHTML = `
            <div class="summary-card">
                <h4>Project Title</h4>
                <p>${state.title}</p>
            </div>
            <div class="summary-card">
                <h4>Dimensions & Materials</h4>
                <p><strong>Estimated Width:</strong> ${state.columns * 7} cm</p>
                <p><strong>Cord Thickness:</strong> ${state.cordThickness}mm</p>
                <p><strong>Total Cord Estimated:</strong> ${statLength.textContent}</p>
            </div>
            <div class="summary-card">
                <h4>Knot Breakdown</h4>
                <ul>${breakdownHTML || '<li>No knots placed yet.</li>'}</ul>
            </div>
        `;
        modalSummary.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', () => {
        modalSummary.classList.add('hidden');
    });

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // Export JSON
    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${state.title.toLowerCase().replace(/\s+/g, '-')}-blueprint.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Initial Render
    renderCanvas();
    updateStats();
});
