(function () {
    // 1. Local State
    let gateways = [];

    // Fetch Gateways from DB
    async function fetchGateways() {
        try {
            const response = await fetch('/api/admin/gateways');
            const data = await response.json();
            if (data.success) {
                gateways = data.gateways || [];
                refreshPgGrid();
            }
        } catch (err) {
            console.error('Error fetching gateways:', err);
        }
    }

    function renderGridCards() {
        // 2. Empty State Handling
        if (gateways.length === 0) {
            return `
                <div class="col-span-1 md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300 text-center">
                    <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <i class="ri-bank-card-line text-3xl text-gray-400"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 mb-1">No payment gateways added yet</h3>
                    <p class="text-sm text-gray-500 max-w-sm">Click the "Add New Gateway" button above to configure your first backend routing provider.</p>
                </div>
            `;
        }

        // Render Dynamic Cards
        return gateways.map((gw, index) => {
            const isActive = gw.isActive !== false; // use isActive mapping
            const displayName = escapeHtml(gw.gatewayId || 'Gateway').toUpperCase();

            return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                                <i class="ri-bank-card-fill text-indigo-600 text-xl"></i>
                            </div>
                            <div>
                                <h2 class="font-bold text-gray-900">${displayName}</h2>
                                <p class="text-xs ${isActive ? 'text-green-600' : 'text-gray-500'} font-medium flex items-center gap-1">
                                    <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}"></span> 
                                    ${isActive ? 'Active' : 'Inactive'}
                                </p>
                            </div>
                        </div>
                        
                        <!-- Tailwind Peer Toggle Switch -->
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="window.togglePgStatus(${index})" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>

                    <div class="space-y-2 mt-2 mb-4 flex-grow">
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-500">Min Order</span>
                            <span class="text-sm font-medium text-gray-900">₹${Number(gw.minOrder || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-500">Max Order</span>
                            <span class="text-sm font-medium text-gray-900">₹${Number(gw.maxOrder || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>

                    <button onclick="window.openPgModal('${escapeHtml(gw.gatewayId || '')}')" class="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium mt-4 flex justify-center items-center gap-2">
                        <i class="ri-settings-4-line text-gray-500"></i> Configure
                    </button>
                </div>
            `;
        }).join('');
    }

    function getSectionHTML() {
        return `
            <div id="payment-gateways-section" class="section" data-module-mounted="true">
                <div class="max-w-7xl mx-auto p-6 space-y-6">
                    
                    <!-- Header Section -->
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900">Payment Gateways</h1>
                            <p class="text-sm text-gray-500 mt-1">Manage backend routing logic, fallback priorities, and amount limits.</p>
                        </div>
                        <button onclick="window.openPgModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 whitespace-nowrap shadow-sm">
                            <i class="ri-add-line"></i> Add New Gateway
                        </button>
                    </div>

                    <!-- Main Gateways Grid -->
                    <div id="pg-grid-container" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        ${renderGridCards()}
                    </div>
                </div>

                <!-- Configuration Modal Backdrop -->
                <div id="pg-config-modal" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 opacity-0 transition-opacity duration-300">
                    <!-- Modal Content -->
                    <div class="bg-white rounded-xl shadow-xl w-full max-w-lg transform scale-95 transition-transform duration-300 flex flex-col overflow-hidden">
                        <!-- Modal Header -->
                        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 class="text-lg font-bold text-gray-900" id="pg-modal-title">Add Gateway</h3>
                                <p class="text-sm text-gray-500 mt-0.5">Update API credentials and routing rules.</p>
                            </div>
                            <button type="button" onclick="window.closePgModal()" class="text-gray-400 hover:text-gray-600 transition p-1">
                                <i class="ri-close-line text-2xl"></i>
                            </button>
                        </div>

                        <!-- Modal Body -->
                        <div class="p-6 overflow-y-auto">
                            <form id="pg-gateway-config-form" class="space-y-6" onsubmit="window.savePgConfiguration(event)">
                                
                                <!-- Gateway Name -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Gateway ID (e.g., razorpay)</label>
                                    <input type="text" id="pg-name" placeholder="razorpay" required class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                                </div>

                                <!-- API Credentials Section -->
                                <!-- API credentials are now managed securely via .env file. need to update -->

                                <!-- Routing Rules Section -->
                                <div>
                                    <h4 class="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <i class="ri-route-fill text-indigo-500"></i> Routing Rules
                                    </h4>
                                    <div class="text-xs text-indigo-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4 flex gap-2 items-start">
                                        <i class="ri-information-fill mt-0.5"></i>
                                        <p>Transactions outside this range will automatically route to the next available gateway.</p>
                                    </div>
                                    
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Min Order</label>
                                            <div class="relative">
                                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span class="text-gray-500 sm:text-sm">₹</span>
                                                </div>
                                                <input type="number" id="pg-min-order" min="0" step="0.01" placeholder="1.00" class="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Max Order</label>
                                            <div class="relative">
                                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span class="text-gray-500 sm:text-sm">₹</span>
                                                </div>
                                                <input type="number" id="pg-max-order" min="0" step="0.01" placeholder="500000.00" class="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Hidden submit to trigger native HTML5 validation -->
                                <button type="submit" id="pg-hidden-submit" class="hidden"></button>
                            </form>
                        </div>

                        <!-- Modal Footer -->
                        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onclick="window.closePgModal()" class="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button id="pg-save-btn" type="button" onclick="document.getElementById('pg-hidden-submit').click()" class="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm flex items-center gap-2">
                                <i class="ri-save-3-line"></i> Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function mountSections(sectionIds) {
        sectionIds.forEach((sectionId) => {
            const target = document.getElementById(sectionId);
            if (!target || target.dataset.moduleMounted === 'true') return;
            target.outerHTML = getSectionHTML();
        });
    }

    window.openPgModal = function(gatewayId) {
        const modal = document.getElementById('pg-config-modal');
        const modalContent = modal.querySelector('.transform');
        const modalTitle = document.getElementById('pg-modal-title');
        const form = document.getElementById('pg-gateway-config-form');
        
        // Reset form
        if (form) form.reset();

        if (gatewayId) {
            if (modalTitle) modalTitle.textContent = `Configure ${gatewayId.toUpperCase()}`;
            
            // If editing an existing gateway, populate values
            const existing = gateways.find(g => g.gatewayId === gatewayId);
            if (existing) {
                document.getElementById('pg-name').value = existing.gatewayId || '';
                document.getElementById('pg-name').readOnly = true; 
                document.getElementById('pg-name').classList.add('bg-gray-100');
                
                // document.getElementById('pg-api-key').value = existing.apiKey || '';
                // document.getElementById('pg-api-secret').value = existing.apiSecret || ''; // will be masked string
                document.getElementById('pg-min-order').value = existing.minOrder || '';
                document.getElementById('pg-max-order').value = existing.maxOrder || '';
            }
        } else {
            if (modalTitle) modalTitle.textContent = `Add New Gateway`;
            if (document.getElementById('pg-name')) {
                document.getElementById('pg-name').readOnly = false;
                document.getElementById('pg-name').classList.remove('bg-gray-100');
            }
        }
        
        if (modal) {
            modal.classList.remove('hidden');
            void modal.offsetWidth; // Trigger reflow
            modal.classList.remove('opacity-0');
        }
        
        if (modalContent) {
            modalContent.classList.remove('scale-95');
            modalContent.classList.add('scale-100');
        }
    };

    window.closePgModal = function() {
        const modal = document.getElementById('pg-config-modal');
        const modalContent = modal ? modal.querySelector('.transform') : null;
        
        if (modal) modal.classList.add('opacity-0');
        
        if (modalContent) {
            modalContent.classList.remove('scale-100');
            modalContent.classList.add('scale-95');
        }
        
        setTimeout(() => {
            if (modal) modal.classList.add('hidden');
        }, 300);
    };

    function refreshPgGrid() {
        const grid = document.getElementById('pg-grid-container');
        if (grid) {
            grid.innerHTML = renderGridCards();
        }
    }

    // Toggle logic instantly saves to backend
    window.togglePgStatus = async function(index) {
        if (gateways[index]) {
            const gw = gateways[index];
            const newStatus = !gw.isActive;
            
            // Optimistic UI update
            gw.isActive = newStatus;
            refreshPgGrid();
            
            try {
                const response = await fetch('/api/admin/gateways', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gatewayId: gw.gatewayId,
                        isActive: newStatus,
                        // apiKey: gw.apiKey,
                        // apiSecret: gw.apiSecret, // passing back the masked secret is handled by backend gracefully
                        minOrder: gw.minOrder,
                        maxOrder: gw.maxOrder
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    if (window.showToast) window.showToast(`${gw.gatewayId.toUpperCase()} marked as ${newStatus ? 'Active' : 'Inactive'}`, 'success');
                } else {
                    throw new Error(data.error);
                }
            } catch (err) {
                // Revert optimistic update
                gw.isActive = !newStatus;
                refreshPgGrid();
                if (window.showToast) window.showToast('Failed to update status: ' + err.message, 'error');
            }
        }
    };

    // Form submission processing
    window.savePgConfiguration = async function(event) {
        if (event) event.preventDefault();

        const btn = document.getElementById('pg-save-btn');
        if (btn) btn.disabled = true;

        const nameInput = document.getElementById('pg-name');
        // const keyInput = document.getElementById('pg-api-key');
        // const secretInput = document.getElementById('pg-api-secret');
        const minOrderInput = document.getElementById('pg-min-order');
        const maxOrderInput = document.getElementById('pg-max-order');

        const gatewayId = nameInput ? nameInput.value.trim().toLowerCase().replace(/\s+/g, '-') : '';
        
        // Find if existing to keep active status
        const existingGw = gateways.find(g => g.gatewayId === gatewayId);
        const isActive = existingGw ? existingGw.isActive : true;

        const payload = {
            gatewayId,
            // apiKey: keyInput ? keyInput.value.trim() : '',
            // apiSecret: secretInput ? secretInput.value.trim() : '',
            minOrder: minOrderInput && minOrderInput.value ? Number(minOrderInput.value) : 0,
            maxOrder: maxOrderInput && maxOrderInput.value ? Number(maxOrderInput.value) : 0,
            isActive: isActive
        };

        try {
            const response = await fetch('/api/admin/gateways', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                // Update local state with the returned document
                const existingIndex = gateways.findIndex(g => g.gatewayId === data.gateway.gatewayId);
                if (existingIndex !== -1) {
                    gateways[existingIndex] = data.gateway;
                } else {
                    gateways.push(data.gateway);
                }
                
                refreshPgGrid();
                window.closePgModal();

                if (window.showToast) {
                    window.showToast('Gateway configuration saved successfully!', 'success');
                } else {
                    alert('Gateway configuration saved successfully!');
                }
            } else {
                if (window.showToast) window.showToast(data.error || 'Failed to save', 'error');
            }
        } catch (err) {
            console.error('Save error', err);
            if (window.showToast) window.showToast('An error occurred while saving', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    };

    // Close modal on click outside
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('pg-config-modal');
        if (modal && e.target === modal) {
            window.closePgModal();
        }
    });

    window.mountAdminPaymentGatewaysSection = async function () {
        mountSections(['payment-gateways-section']);
        // Fetch data from backend on mount
        await fetchGateways();
        if (window.updateTopbarStatus) {
            window.updateTopbarStatus('Payment Gateways');
        }
    };
})();
