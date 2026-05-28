(function () {
    let orderStaffOptionsCache = [];

    const SECTION_HTML = {
        "reviews": "<div id=\"reviews\" class=\"section\" data-module-mounted=\"true\">\n                <h3>Manage General Reviews</h3>\n                <div class=\"table-responsive\" style=\"overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;\">\n                    <table>\n                        <thead>\n                            <tr>\n                                <th>Date</th>\n                                <th>User</th>\n                                <th>Rating</th>\n                                <th>Message</th>\n                                <th>Action</th>\n                            </tr>\n                        </thead>\n                        <tbody id=\"reviewsTable\"></tbody>\n                    </table>\n                </div>\n            </div>",
        "review-moderation": "<div id=\"review-moderation\" class=\"section\" data-module-mounted=\"true\">\n                <h3>🛡️ Package Review Moderation</h3>\n                <p style=\"color:#64748b; font-size:0.9rem; margin-bottom:15px;\">Approve or reject customer reviews for\n                    specific packages.</p>\n                <div class=\"table-responsive\" style=\"overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;\">\n                    <table>\n                        <thead>\n                            <tr>\n                                <th>Package</th>\n                                <th>User</th>\n                                <th>Rating</th>\n                                <th>Comment</th>\n                                <th>Actions</th>\n                            </tr>\n                        </thead>\n                        <tbody id=\"pendingReviewsTable\">\n                            <tr>\n                                <td colspan=\"5\" style=\"text-align:center;\">Loading pending reviews...</td>\n                            </tr>\n                        </tbody>\n                    </table>\n                </div>\n            </div>",
        "handover-doc": "<div id=\"handover-doc\" class=\"section\" data-module-mounted=\"true\">\n                <div class=\"premium-section\">\n                    <div class=\"section-header\">\n                        <div>\n                            <h2 class=\"section-title\">Delivered Projects</h2>\n                            <p class=\"section-subtitle\">Generate verified handover documents and manage already delivered project certificates from one clean workspace.</p>\n                        </div>\n                        <div class=\"section-actions\">\n                            <button onclick=\"fetchHandovers()\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button>\n                        </div>\n                    </div>\n                    <div class=\"staff-card\" style=\"padding: 30px;\">\n                        <form id=\"secureHandoverForm\" onsubmit=\"generateHandover(event)\">\n                            <div style=\"display: flex; gap: 15px; margin-bottom: 15px;\">\n                                <input type=\"text\" id=\"hOrder\" placeholder=\"Order No (e.g. #ORD-123)\" required style=\"flex:1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;\">\n                                <input type=\"text\" id=\"hClient\" placeholder=\"Client Name\" required style=\"flex:1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;\">\n                            </div>\n                            <div style=\"display: flex; gap: 15px; margin-bottom: 15px;\">\n                                <input type=\"text\" id=\"hProject\" placeholder=\"Project Title\" required style=\"flex:1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;\">\n                                <input type=\"date\" id=\"hDelDate\" required style=\"flex:1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;\" title=\"Delivery Date\">\n                                <input type=\"date\" id=\"hSupDate\" required style=\"flex:1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;\" title=\"Support Valid Till\">\n                            </div>\n                            <input type=\"text\" id=\"hLink\" placeholder=\"Live Link / Proof URL\" required style=\"width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px;\">\n                            <textarea id=\"hNotes\" rows=\"2\" placeholder=\"Admin Notes (Optional)\" style=\"width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px;\"></textarea>\n                            <div style=\"display: flex; gap: 15px;\">\n                                <button type=\"submit\" id=\"btnHandover\" class=\"btn-publish\" style=\"flex: 1; background: #6c63ff;\">📥 Download PDF</button>\n                                <button type=\"button\" id=\"btnEmailHandover\" class=\"btn-publish\" style=\"flex: 1; background: #10b981;\" onclick=\"emailHandover(event)\">📧 Email to Client</button>\n                            </div>\n                        </form>\n                    </div>\n                    <div class=\"modern-table-shell\">\n                        <div class=\"table-head\">\n                            <div>\n                                <h3 style=\"margin:0;font-size:1.02rem;color:var(--text);\">Delivery Archive</h3>\n                                <p class=\"section-subtitle\" style=\"margin-top:6px;\">Previously generated certificates and resend/download controls.</p>\n                            </div>\n                        </div>\n                        <div class=\"table-responsive\" style=\"overflow-x:auto;width:100%;\">\n                            <table class=\"modern-list-table\">\n                                <thead>\n                                    <tr>\n                                        <th>Date</th>\n                                        <th>Certificate</th>\n                                        <th>Order No</th>\n                                        <th>Client &amp; Project</th>\n                                        <th>Actions</th>\n                                    </tr>\n                                </thead>\n                                <tbody id=\"certificatesTableBody\"></tbody>\n                            </table>\n                        </div>\n                    </div>\n                </div>\n            </div>",
        "orders": "<div id=\"orders\" class=\"section\" data-module-mounted=\"true\">\n                <div class=\"premium-section\">\n                    <div class=\"section-header\">\n                        <div>\n                            <h2 class=\"section-title\">Orders</h2>\n                            <p class=\"section-subtitle\">Track transactions, delivery progress, invoice actions, and staff assignment from a cleaner order desk.</p>\n                        </div>\n                        <div class=\"section-actions\">\n                            <div class=\"approvals-search\" style=\"min-width: 280px;\">\n                                <i class=\"ri-search-line\"></i>\n                                <input id=\"orderSearch\" type=\"text\" placeholder=\"Search by Order ID...\" oninput=\"fetchOrders()\">\n                            </div>\n                            <button onclick=\"fetchOrders()\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button>\n                        </div>\n                    </div>\n                    <div class=\"modern-table-shell\">\n                        <div class=\"table-responsive\" style=\"overflow-x:auto;width:100%;\">\n                            <table class=\"modern-list-table\">\n                                <thead>\n                                    <tr>\n                                        <th>Order</th>\n                                        <th>Payment</th>\n                                        <th>Target Link</th>\n                                        <th>Customer</th>\n                                        <th>Package</th>\n                                        <th>Value &amp; Staff</th>\n                                        <th>Status</th>\n                                    </tr>\n                                </thead>\n                                <tbody id=\"ordersTable\"></tbody>\n                            </table>\n                        </div>\n                    </div>\n                </div>\n            </div>",
        "services-section": "<div id=\"services-section\" class=\"section\" data-module-mounted=\"true\">\n                <h2 style=\"margin-bottom:20px;\">🏢 Manage Services</h2>\n\n                <div class=\"staff-card\" style=\"padding:24px;margin-bottom:24px;\">\n                    <h3 id=\"svc-form-title\" style=\"margin-bottom:16px;\">➕ Add New Service</h3>\n                    <input type=\"hidden\" id=\"svcEditId\">\n                    <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">\n                        <div><label class=\"form-group\"\n                                style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Title *</label>\n                            <input type=\"text\" id=\"svcTitle\" placeholder=\"e.g. Instagram Growth\"\n                                style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;\">\n                        </div>\n                        <div><label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Slug *\n                                (URL-safe)</label>\n                            <input type=\"text\" id=\"svcSlug\" placeholder=\"e.g. instagram-growth\"\n                                style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;\">\n                        </div>\n                    </div>\n\n                    <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">\n                        <div><label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Icon (emoji or\n                                class)</label>\n                            <input type=\"text\" id=\"svcIcon\" placeholder=\"🚀\"\n                                style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;\">\n                        </div>\n                        <div><label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Short Description\n                                (Cards)</label>\n                            <input type=\"text\" id=\"svcDesc\" placeholder=\"One-line description\"\n                                style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;\">\n                        </div>\n                    </div>\n\n                    <div style=\"margin-bottom:12px;\">\n                        <label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Full\n                            Description</label>\n                        <textarea id=\"svcFullDesc\" rows=\"4\" placeholder=\"Detailed description for the service page...\"\n                            style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;resize:vertical;\"></textarea>\n                    </div>\n\n                    <div style=\"margin-bottom:12px;\">\n                        <label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Tagline (Hero\n                            Section)</label>\n                        <input type=\"text\" id=\"svcTagline\" placeholder=\"e.g. Master Your Online Narrative\"\n                            style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;\">\n                    </div>\n\n                    <div style=\"margin-bottom:12px;\">\n                        <label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">About Text (Detail\n                            Page)</label>\n                        <textarea id=\"svcAboutText\" rows=\"3\" placeholder=\"Explain your approach...\"\n                            style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;resize:vertical;\"></textarea>\n                    </div>\n\n                    <!-- Rich Content Arrays -->\n                    <div\n                        style=\"background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #eee;\">\n                        <h4 style=\"margin-bottom:10px;font-size:14px;color:#333;\">✨ Benefits</h4>\n                        <div id=\"benefits-container\"\n                            style=\"display:flex; flex-direction:column; gap:10px; margin-bottom:10px;\"></div>\n                        <button onclick=\"addBenefitField()\"\n                            style=\"padding:6px 12px;font-size:12px;background:#ddd;border:none;border-radius:4px;cursor:pointer;\">+\n                            Add Benefit</button>\n                    </div>\n\n                    <div\n                        style=\"background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #eee;\">\n                        <h4 style=\"margin-bottom:10px;font-size:14px;color:#333;\">⚙️ Process Steps</h4>\n                        <div id=\"process-container\"\n                            style=\"display:flex; flex-direction:column; gap:10px; margin-bottom:10px;\"></div>\n                        <button onclick=\"addProcessField()\"\n                            style=\"padding:6px 12px;font-size:12px;background:#ddd;border:none;border-radius:4px;cursor:pointer;\">+\n                            Add Process Step</button>\n                    </div>\n\n                    <div\n                        style=\"background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #eee;\">\n                        <h4 style=\"margin-bottom:10px;font-size:14px;color:#333;\">❓ FAQs</h4>\n                        <div id=\"faq-container\"\n                            style=\"display:flex; flex-direction:column; gap:10px; margin-bottom:10px;\">\n                        </div>\n                        <button onclick=\"addFaqField()\"\n                            style=\"padding:6px 12px;font-size:12px;background:#ddd;border:none;border-radius:4px;cursor:pointer;\">+\n                            Add FAQ</button>\n                    </div>\n\n                    <div style=\"display:flex;gap:10px;\">\n                        <button onclick=\"saveService()\" class=\"btn-publish\">💾 Save Service</button>\n                        <button id=\"svc-cancel-btn\" onclick=\"resetServiceForm()\" class=\"btn-cancel\"\n                            style=\"display:none;\">Cancel</button>\n                    </div>\n                </div>\n\n                <div class=\"table-responsive\" style=\"overflow-x:auto;\">\n                    <table>\n                        <thead>\n                            <tr>\n                                <th>Icon</th>\n                                <th>Title</th>\n                                <th>Slug</th>\n                                <th>Description</th>\n                                <th>Actions</th>\n                            </tr>\n                        </thead>\n                        <tbody id=\"servicesTable\">\n                            <tr>\n                                <td colspan=\"5\" style=\"text-align:center;color:#888\">Loading...</td>\n                            </tr>\n                        </tbody>\n                    </table>\n                </div>\n            </div>",
        "packages-section": "<div id=\"packages-section\" class=\"section\" data-module-mounted=\"true\">\n                <h2 style=\"margin-bottom:20px;\">📦 Manage Packages</h2>\n\n                <div class=\"staff-card\" style=\"padding:24px;margin-bottom:24px;\">\n                    <h3 id=\"pkg-form-title\" style=\"margin-bottom:16px;\">➕ Add New Package</h3>\n                    <input type=\"hidden\" id=\"pkgEditId\">\n\n                    <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">\n                        <div><label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Title *</label>\n                            <input type=\"text\" id=\"pkgTitle\" placeholder=\"e.g. Growth Package\"\n                                style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;\">\n                        </div>\n                        <div><label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Service *\n                                (parent)</label>\n                            <select id=\"pkgServiceId\"\n                                style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;\">\n                                <option value=\"\">-- Select Service --</option>\n                            </select>\n                        </div>\n                        <div><label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Rating\n                                (1-5)</label>\n                            <input type=\"number\" id=\"pkgRating\" value=\"4.9\" min=\"1\" max=\"5\" step=\"0.1\"\n                                style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;\">\n                        </div>\n                        <div style=\"display:flex;align-items:center;gap:10px;padding-top:20px;\">\n                            <input type=\"checkbox\" id=\"pkgFeatured\" style=\"width:20px;height:20px;\">\n                            <label style=\"font-size:14px;font-weight:600;\">Mark as Featured ⭐</label>\n                        </div>\n                    </div>\n\n                    <!-- Pricing — 3 separate fields -->\n                    <div\n                        style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:12px;\">\n                        <h4 style=\"margin-bottom:12px;color:#15803d\">💰 Manual Geo-Pricing</h4>\n                        <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;\">\n                            <div>\n                                <label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">🇮🇳 India\n                                    Price\n                                    (₹) *</label>\n                                <input type=\"number\" id=\"pkgPriceIN\" placeholder=\"5999\"\n                                    style=\"width:100%;padding:10px;border:2px solid #6B46C1;border-radius:8px;font-weight:600;\">\n                            </div>\n                            <div>\n                                <label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">🇺🇸 USA Price\n                                    ($)\n                                    *</label>\n                                <input type=\"number\" id=\"pkgPriceUS\" placeholder=\"79\"\n                                    style=\"width:100%;padding:10px;border:2px solid #0284c7;border-radius:8px;font-weight:600;\">\n                            </div>\n                            <div>\n                                <label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">🌍 Global Price\n                                    ($)\n                                    *</label>\n                                <input type=\"number\" id=\"pkgPriceGlobal\" placeholder=\"69\"\n                                    style=\"width:100%;padding:10px;border:2px solid #0891b2;border-radius:8px;font-weight:600;\">\n                            </div>\n                        </div>\n                    </div>\n\n                    <div style=\"margin-bottom:12px;\">\n                        <label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Description</label>\n                        <textarea id=\"pkgDesc\" rows=\"3\" placeholder=\"Package description...\"\n                            style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;resize:vertical;\"></textarea>\n                    </div>\n                    <div style=\"margin-bottom:12px;\">\n                        <label style=\"display:block;margin-bottom:4px;font-size:12px;color:#555\">Features (one per\n                            line)</label>\n                        <textarea id=\"pkgFeatures\" rows=\"4\"\n                            placeholder=\"15 Posts per month&#10;5-6 Pro Reels&#10;Story Updates\"\n                            style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;resize:vertical;\"></textarea>\n                    </div>\n\n                    <div\n                        style=\"background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:16px;\">\n                        <div\n                            style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;\">\n                            <h4 style=\"color:#1e293b; margin:0;\">📝 Package FAQs</h4>\n                            <button type=\"button\" onclick=\"addPkgFaq()\" class=\"btn-publish\"\n                                style=\"background:#0f172a; padding:6px 14px; font-size:12px;\">+ Add FAQ</button>\n                        </div>\n                        <div id=\"pkgFaqsContainer\"></div>\n                    </div>\n\n                    <div style=\"display:flex;gap:10px;\">\n                        <button onclick=\"savePackage()\" class=\"btn-publish\">💾 Save Package</button>\n                        <button id=\"pkg-cancel-btn\" onclick=\"resetPackageForm()\" class=\"btn-cancel\"\n                            style=\"display:none;\">Cancel</button>\n                    </div>\n                </div>\n\n                <div class=\"table-responsive\" style=\"overflow-x:auto;\">\n                    <table>\n                        <thead>\n                            <tr>\n                                <th>Title</th>\n                                <th>Service</th>\n                                <th>₹ IN</th>\n                                <th>$ US</th>\n                                <th>$ ROW</th>\n                                <th>Rating</th>\n                                <th>Actions</th>\n                            </tr>\n                        </thead>\n                        <tbody id=\"packagesTable\">\n                            <tr>\n                                <td colspan=\"7\" style=\"text-align:center;color:#888\">Loading...</td>\n                            </tr>\n                        </tbody>\n                    </table>\n                </div>\n            </div>",
        "smm-orders-section": "<div id=\"smm-orders-section\" class=\"section\" data-module-mounted=\"true\">\n                <div class=\"premium-section\">\n                    <div class=\"section-header\">\n                        <div>\n                            <h2 class=\"section-title\">SMM Orders</h2>\n                            <p class=\"section-subtitle\">Track SMM orders, quantities, profile/post links, and work fulfillment status.</p>\n                        </div>\n                        <div class=\"section-actions\">\n                            <div class=\"approvals-search\" style=\"min-width: 280px;\">\n                                <i class=\"ri-search-line\"></i>\n                                <input id=\"smmOrderSearch\" type=\"text\" placeholder=\"Search by Order ID...\" oninput=\"fetchSmmOrders()\">\n                            </div>\n                            <button onclick=\"fetchSmmOrders()\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button>\n                        </div>\n                    </div>\n                    <div class=\"modern-table-shell\">\n                        <div class=\"table-responsive\" style=\"overflow-x:auto;width:100%;\">\n                            <table class=\"modern-list-table\">\n                                <thead>\n                                    <tr>\n                                        <th>Order ID</th>\n                                        <th>Customer Name</th>\n                                        <th>Service Bought</th>\n                                        <th>Quantity</th>\n                                        <th>Target Profile/Post Link</th>\n                                        <th>Status</th>\n                                    </tr>\n                                </thead>\n                                <tbody id=\"smmOrdersTable\"></tbody>\n                            </table>\n                        </div>\n                    </div>\n                </div>\n            </div>"
    };

    function mountSections(sectionIds) {
        sectionIds.forEach((sectionId) => {
            const target = document.getElementById(sectionId);
            const markup = SECTION_HTML[sectionId];
            if (!target || !markup || target.dataset.moduleMounted === 'true') return;
            target.outerHTML = markup;
        });
    }

    function makeOrderSelectId(orderId) {
        return `orderAssign_${String(orderId || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }

    function buildOrderStaffOptions(selectedEmail = '') {
        const normalizedSelected = String(selectedEmail || '').trim().toLowerCase();
        if (!orderStaffOptionsCache.length) {
            return '<option value="">No staff available</option>';
        }

        return orderStaffOptionsCache.map((staff) => {
            const email = String(staff.email || '').trim().toLowerCase();
            const selected = email && email === normalizedSelected ? 'selected' : '';
            return `<option value="${escapeHtml(email)}" ${selected}>${escapeHtml(staff.name || 'Staff Member')}</option>`;
        }).join('');
    }

    function resolveOrderStaffName(staffEmail = '') {
        const normalizedEmail = String(staffEmail || '').trim().toLowerCase();
        const staff = orderStaffOptionsCache.find((item) => String(item.email || '').trim().toLowerCase() === normalizedEmail);
        return staff?.name || 'Staff Member';
    }

    function getOrderAssignmentMarkup(order) {
        const selectId = makeOrderSelectId(order.orderId);
        const buttonLabel = order.assignedStaff ? 'Reassign' : 'Assign Staff';

        return `
            ${order.assignedStaff
                ? `<div style="margin-top:8px;font-size:0.78rem;color:#0f766e;font-weight:700;">Assigned to ${escapeHtml(resolveOrderStaffName(order.assignedStaff))}</div>`
                : '<div style="margin-top:8px;font-size:0.78rem;color:#94a3b8;">Not assigned yet</div>'}
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">
                <select id="${selectId}" style="min-width:220px;padding:7px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;color:#0f172a;font-weight:600;" ${orderStaffOptionsCache.length ? '' : 'disabled'}>
                    <option value="">Select staff member</option>
                    ${buildOrderStaffOptions(order.assignedStaff || '')}
                </select>
                <button onclick="assignStaffFromDropdown('${order.orderId}', '${selectId}')" class="modern-action-btn" ${orderStaffOptionsCache.length ? '' : 'disabled'}>${buttonLabel}</button>
            </div>
        `;
    }

    function getOrderDescriptionMarkup(order) {
        let pkgMarkup = '';
        if (order.orderItems && order.orderItems.length > 0) {
            const items = order.orderItems.map(item => {
                return item.title || item.packageId?.title || item.serviceName || 'Package';
            });
            pkgMarkup = `<ol style="margin: 0; padding-left: 15px; font-size: 0.9rem; line-height: 1.4;">
                ${items.map(title => `<li style="font-weight: 700; color: #0f172a;">${escapeHtml(title)}</li>`).join('')}
            </ol>`;
        } else {
            pkgMarkup = `<div style="font-weight:700;color:#0f172a;">${escapeHtml(order.package || 'Custom Package')}</div>`;
        }

        const country = order.selectedCountry || order.country || '';
        const quality = order.selectedQuality || order.quality || '';
        const speed = order.selectedSpeed || order.speed || '';
        const refill = order.selectedRefill || order.refill || '';

        if (country?.length || quality?.length || speed?.length || refill?.length) {
            let details = [];
            if (country?.length) details.push(`📍 Country: ${escapeHtml(country)}`);
            if (quality?.length) details.push(`💎 Quality: ${escapeHtml(quality)}`);
            if (speed?.length) details.push(`⚡ Speed: ${escapeHtml(speed)}`);
            if (refill?.length) details.push(`🔄 Refill: ${escapeHtml(refill)}`);
            
            pkgMarkup += `<div class="text-xs text-gray-500 mt-1" style="font-size:0.75rem;color:#64748b;margin-top:4px;">${details.join(' | ')}</div>`;
        }

        if (order?.isDripFeed) {
            const hrs = order.interval ? (order.interval / 60) : 0;
            pkgMarkup += `<div class="drip-feed-badge" style="font-size:0.75rem;color:#0369a1;background-color:#e0f2fe;border:1px solid #bae6fd;border-radius:6px;padding:4px 8px;margin-top:6px;display:inline-block;font-weight:600;">
                💧 Drip Feed: ${order.runs || 0} Runs (Every ${hrs} hrs) | ${order.quantityPerRun || 0} qty/run
            </div>`;
        }

        return pkgMarkup;
    }

    async function fetchOrders() {
        try {
            const [ordersRes, staffRes] = await Promise.all([
                fetch(`${API_URL}/admin/orders?type=agency`, { credentials: 'include' }),
                fetch('/api/admin/staff-list', { credentials: 'include' }).catch(() => null)
            ]);

            if (ordersRes.status === 401 || ordersRes.status === 403) return logout();

            const orders = await ordersRes.json();
            if (staffRes?.ok) {
                const staffPayload = await staffRes.json();
                orderStaffOptionsCache = Array.isArray(staffPayload.staff) ? staffPayload.staff : [];
            }

            const tbody = document.getElementById('ordersTable');
            const searchTerm = String(document.getElementById('orderSearch')?.value || '').trim().toLowerCase();
            if (!tbody) return;

            tbody.innerHTML = '';
            let orderList = Array.isArray(orders) ? orders : [];

            if (searchTerm) {
                orderList = orderList.filter((order) => String(order.orderId || '').toLowerCase().includes(searchTerm));
            }

            if (!orderList.length) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#64748b;padding:24px;">${searchTerm ? 'No orders matching "' + searchTerm + '"' : 'No orders found.'}</td></tr>`;
                return;
            }

            tbody.innerHTML = orderList.map((order) => {
                const safeOrderId = escapeHtml(order.orderId || 'Order');
                const workStatus = order.workStatus || order.status || 'Work Pending';
                const paymentStatus = order.paymentStatus || (String(order.status || '').toLowerCase() === 'pending' ? 'Pending' : 'Paid');
                const workStatusLabel = workStatus === 'Review' ? 'Client Review' : workStatus;
                const paymentStatusLabel = paymentStatus;
                const isInProgress = ['Processing', 'In Progress'].includes(workStatus);
                const rawAmount = order.price
                    ?? order.amount
                    ?? order.value
                    ?? order.orderAmount
                    ?? (order.orderDetails && order.orderDetails.price)
                    ?? 0;
                const assignmentMarkup = getOrderAssignmentMarkup(order);

                return `
                    <tr id="order-row-${escapeHtml(order.orderId || '')}">
                        <td>
                            <div style="font-weight:700;color:#0f172a;">${safeOrderId}</div>
                            <div style="margin-top:4px;font-size:0.8rem;color:#64748b;">${formatAdminDate(order.date)}</div>
                        </td>
                        <td>
                            <div style="font-weight:700;color:#0f172a;">${escapeHtml(order.paymentId || 'N/A')}</div>
                            <div style="margin-top:4px;font-size:0.8rem;color:#64748b;">${escapeHtml(order.mode || 'Online')}</div>
                        </td>
                        <td>
                            ${order.instaLink
                                ? `<a href="${order.instaLink}" target="_blank" rel="noopener" style="color:#2563eb;font-weight:700;text-decoration:none;">Open Link ↗</a>`
                                : '<span style="color:#94a3b8;">Not provided</span>'}
                        </td>
                        <td>
                            <div style="font-weight:700;color:#0f172a;">${escapeHtml(order.customerName || 'Unknown Customer')}</div>
                            <div style="margin-top:4px;font-size:0.82rem;color:#64748b;">${escapeHtml(order.email || '—')}</div>
                        </td>
                        <td>
                            ${getOrderDescriptionMarkup(order)}
                        </td>
                        <td>
                            <div style="font-weight:800;color:#0f172a;">${formatCurrency(rawAmount)}</div>
                            ${assignmentMarkup}
                        </td>
                        <td>
                            <div style="display:flex;flex-direction:column;align-items:flex-start;gap:10px;">
                                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                                    ${renderModernStatusBadge(paymentStatus, `Payment: ${paymentStatusLabel}`)}
                                    ${renderModernStatusBadge(workStatus, `Work: ${workStatusLabel}`)}
                                </div>
                                <select onchange="updateStatus('${order.orderId}', this.value)" style="min-width:160px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;color:#0f172a;font-weight:600;">
                                    <option value="Work Pending" ${workStatus === 'Work Pending' ? 'selected' : ''}>Work Pending</option>
                                    <option value="In Progress" ${isInProgress ? 'selected' : ''}>In Progress</option>
                                    <option value="Completed" ${workStatus === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="Review" ${workStatus === 'Review' ? 'selected' : ''}>Client Review</option>
                                </select>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                    <button onclick="window.open('/api/download-invoice/${encodeURIComponent(order.orderId)}')" class="modern-action-btn" title="Download Invoice"><i class="ri-download-2-line"></i> Invoice</button>
                                    <button onclick="resendInvoice('${order.orderId}')" class="modern-action-btn" title="Resend Invoice"><i class="ri-mail-send-line"></i> Resend</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Admin Fetch Error:', error);
        }
    }

    async function updateStatus(id, newStatus) {
        await fetch(`${API_URL}/admin/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, workStatus: newStatus }),
            credentials: 'include'
        });
        fetchOrders();
        if (window.fetchSmmOrders) {
            window.fetchSmmOrders();
        }
    }

    async function fetchSmmOrders() {
        const tbody = document.getElementById('smmOrdersTable');
        if (tbody) {
            tbody.innerHTML = '';
        }
        try {
            const res = await fetch(`${API_URL}/admin/orders?type=smm`, { credentials: 'include' });

            if (res.status === 401 || res.status === 403) return logout();

            const orders = await res.json();

            const searchTerm = String(document.getElementById('smmOrderSearch')?.value || '').trim().toLowerCase();
            if (!tbody) return;

            tbody.innerHTML = '';
            let orderList = Array.isArray(orders) ? orders : [];

            if (searchTerm) {
                orderList = orderList.filter((order) => String(order.orderId || '').toLowerCase().includes(searchTerm));
            }

            if (!orderList.length) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:24px;">${searchTerm ? 'No orders matching "' + searchTerm + '"' : 'No orders found.'}</td></tr>`;
                return;
            }

            tbody.innerHTML = orderList.map((order) => {
                const safeOrderId = escapeHtml(order.orderId || 'Order');
                const workStatus = order.workStatus || order.status || 'Work Pending';
                const paymentStatus = order.paymentStatus || (String(order.status || '').toLowerCase() === 'pending' ? 'Pending' : 'Paid');
                const workStatusLabel = workStatus === 'Review' ? 'Client Review' : workStatus;
                const paymentStatusLabel = paymentStatus;
                const isInProgress = ['Processing', 'In Progress'].includes(workStatus);

                return `
                    <tr id="smm-order-row-${escapeHtml(order.orderId || '')}">
                        <td>
                            <div style="font-weight:700;color:#0f172a;">${safeOrderId}</div>
                            <div style="margin-top:4px;font-size:0.8rem;color:#64748b;">${formatAdminDate(order.date)}</div>
                        </td>
                        <td>
                            <div style="font-weight:700;color:#0f172a;">${escapeHtml(order.customerName || 'Unknown Customer')}</div>
                            <div style="margin-top:4px;font-size:0.82rem;color:#64748b;">${escapeHtml(order.email || '—')}</div>
                        </td>
                        <td>
                            ${getOrderDescriptionMarkup(order)}
                        </td>
                        <td>
                            <div style="font-weight:700;color:#0f172a;">${Number(order.quantity || 0).toLocaleString()}</div>
                        </td>
                        <td>
                            <div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${order.targetLink || order.instaLink
                                    ? '<a href="' + escapeHtml(order.targetLink || order.instaLink) + '" target="_blank" rel="noopener" style="color:#2563eb;font-weight:700;text-decoration:none;" title="' + escapeHtml(order.targetLink || order.instaLink) + '">' + escapeHtml(order.targetLink || order.instaLink) + ' ↗</a>'
                                    : '<span style="color:#94a3b8;">Not provided</span>'}
                            </div>
                        </td>
                        <td>
                            <div style="display:flex;flex-direction:column;align-items:flex-start;gap:10px;">
                                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                                    ${renderModernStatusBadge(paymentStatus, `Payment: ${paymentStatusLabel}`)}
                                    ${renderModernStatusBadge(workStatus, `Work: ${workStatusLabel}`)}
                                </div>
                                <select onchange="updateStatus('${order.orderId}', this.value)" style="min-width:160px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;color:#0f172a;font-weight:600;">
                                    <option value="Work Pending" ${workStatus === 'Work Pending' ? 'selected' : ''}>Work Pending</option>
                                    <option value="In Progress" ${isInProgress ? 'selected' : ''}>In Progress</option>
                                    <option value="Completed" ${workStatus === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="Review" ${workStatus === 'Review' ? 'selected' : ''}>Client Review</option>
                                </select>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                    <button onclick="window.open('/api/download-invoice/${encodeURIComponent(order.orderId)}')" class="modern-action-btn" title="Download Invoice"><i class="ri-download-2-line"></i> Invoice</button>
                                    <button onclick="resendInvoice('${order.orderId}')" class="modern-action-btn" title="Resend Invoice"><i class="ri-mail-send-line"></i> Resend</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Admin SMM Fetch Error:', error);
        }
    }

    async function assignStaffManual(orderId) {
        const selectId = makeOrderSelectId(orderId);
        return assignStaffFromDropdown(orderId, selectId);
    }

    async function assignStaffFromDropdown(orderId, selectId) {
        const selectNode = document.getElementById(selectId);
        const staffEmail = String(selectNode?.value || '').trim().toLowerCase();
        if (!staffEmail) {
            alert('⚠️ Please select a staff member first.');
            return;
        }

        try {
            const res = await fetch('/api/admin/assign-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, staffEmail }),
                credentials: 'include'
            });
            const result = await res.json();

            if (result.success) {
                alert('✅ ' + result.message);
                fetchOrders();
            } else {
                alert('⚠️ Error: ' + result.message);
            }
        } catch (error) {
            alert('Server Error');
        }
    }

    async function resendInvoice(orderId) {
        if (!confirm(`Do you want to resend the invoice to the client for ${orderId}?`)) return;
        try {
            const res = await fetch('/api/admin/resend-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
                credentials: 'include'
            });
            const result = await res.json();
            if (result.success) alert('✅ ' + result.message);
            else alert('❌ Error: ' + result.message);
        } catch (error) {
            alert('Server connection failed');
        }
    }

    async function fetchAdminServices() {
        const tbody = document.getElementById('servicesTable');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888">Loading...</td></tr>';
        try {
            const res = await fetch('/api/admin/services', { headers: { 'x-admin': 'true' } });
            const data = await res.json();
            if (!data.success || !data.services.length) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888">No services yet.</td></tr>';
                return;
            }
            tbody.innerHTML = data.services.map((service) => `
                <tr>
                    <td>${service.icon || '🚀'}</td>
                    <td><strong>${service.title}</strong></td>
                    <td><code>${service.slug}</code></td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${service.description || '-'}</td>
                    <td style="display:flex;gap:8px;">
                        <button class="btn-publish" style="padding:6px 14px;font-size:13px;" onclick="editService(${JSON.stringify(JSON.stringify(service)).replace(/"/g, '&quot;')})">✏️ Edit</button>
                        <button class="delete-btn" style="font-size:13px;" onclick="deleteService('${service._id}')">🗑️ Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:red;text-align:center">Error loading</td></tr>';
        }
    }

    function addBenefitField(iconUrl = '', title = '', desc = '') {
        const div = document.createElement('div');
        div.style.display = 'grid';
        div.style.gridTemplateColumns = '1fr 2fr 3fr auto';
        div.style.gap = '8px';
        div.innerHTML = `
            <input type="text" class="ben-icon" placeholder="Icon Class (e.g. ri-star-line)" value="${iconUrl}" style="padding:6px;border:1px solid #ddd;border-radius:4px;">
            <input type="text" class="ben-title" placeholder="Title" value="${title}" style="padding:6px;border:1px solid #ddd;border-radius:4px;">
            <input type="text" class="ben-desc" placeholder="Description" value="${desc}" style="padding:6px;border:1px solid #ddd;border-radius:4px;">
            <button type="button" onclick="this.parentElement.remove()" style="background:#ff4757;color:white;border:none;border-radius:4px;padding:0 10px;cursor:pointer;">X</button>
        `;
        document.getElementById('benefits-container')?.appendChild(div);
    }

    function addProcessField(stepNumber = '', title = '', desc = '') {
        const div = document.createElement('div');
        div.style.display = 'grid';
        div.style.gridTemplateColumns = '60px 2fr 3fr auto';
        div.style.gap = '8px';
        div.innerHTML = `
            <input type="number" class="proc-num" placeholder="01" value="${stepNumber}" style="padding:6px;border:1px solid #ddd;border-radius:4px;">
            <input type="text" class="proc-title" placeholder="Title" value="${title}" style="padding:6px;border:1px solid #ddd;border-radius:4px;">
            <input type="text" class="proc-desc" placeholder="Description" value="${desc}" style="padding:6px;border:1px solid #ddd;border-radius:4px;">
            <button type="button" onclick="this.parentElement.remove()" style="background:#ff4757;color:white;border:none;border-radius:4px;padding:0 10px;cursor:pointer;">X</button>
        `;
        document.getElementById('process-container')?.appendChild(div);
    }

    function addFaqField(question = '', answer = '') {
        const div = document.createElement('div');
        div.style.display = 'grid';
        div.style.gridTemplateColumns = '2fr 3fr auto';
        div.style.gap = '8px';
        div.innerHTML = `
            <input type="text" class="faq-q" placeholder="Question" value="${question}" style="padding:6px;border:1px solid #ddd;border-radius:4px;">
            <input type="text" class="faq-a" placeholder="Answer" value="${answer}" style="padding:6px;border:1px solid #ddd;border-radius:4px;">
            <button type="button" onclick="this.parentElement.remove()" style="background:#ff4757;color:white;border:none;border-radius:4px;padding:0 10px;cursor:pointer;">X</button>
        `;
        document.getElementById('faq-container')?.appendChild(div);
    }

    function getDynamicArray(containerId, keys, classes) {
        const rows = document.querySelectorAll(`#${containerId} > div`);
        const arr = [];
        rows.forEach((row) => {
            const obj = {};
            let hasData = false;
            classes.forEach((cls, index) => {
                const val = row.querySelector(`.${cls}`)?.value.trim() || '';
                obj[keys[index]] = val;
                if (val) hasData = true;
            });
            if (hasData) arr.push(obj);
        });
        return arr;
    }

    function editService(jsonStr) {
        const service = JSON.parse(jsonStr);
        document.getElementById('svcEditId').value = service._id;
        document.getElementById('svcTitle').value = service.title || '';
        document.getElementById('svcSlug').value = service.slug || '';
        document.getElementById('svcIcon').value = service.icon || '';
        document.getElementById('svcDesc').value = service.description || '';
        document.getElementById('svcFullDesc').value = service.fullDescription || '';
        document.getElementById('svcTagline').value = service.tagline || '';
        document.getElementById('svcAboutText').value = service.aboutText || '';

        document.getElementById('benefits-container').innerHTML = '';
        document.getElementById('process-container').innerHTML = '';
        document.getElementById('faq-container').innerHTML = '';

        if (service.benefits) service.benefits.forEach((item) => addBenefitField(item.iconUrl, item.title, item.description));
        if (service.processSteps) service.processSteps.forEach((item) => addProcessField(item.stepNumber, item.title, item.description));
        if (service.faqs) service.faqs.forEach((item) => addFaqField(item.question, item.answer));

        document.getElementById('svc-form-title').textContent = '✏️ Edit Service';
        document.getElementById('svc-cancel-btn').style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetServiceForm() {
        ['svcEditId', 'svcTitle', 'svcSlug', 'svcIcon', 'svcDesc', 'svcFullDesc', 'svcTagline', 'svcAboutText']
            .forEach((id) => {
                const node = document.getElementById(id);
                if (node) node.value = '';
            });
        document.getElementById('benefits-container').innerHTML = '';
        document.getElementById('process-container').innerHTML = '';
        document.getElementById('faq-container').innerHTML = '';
        document.getElementById('svc-form-title').textContent = '➕ Add New Service';
        document.getElementById('svc-cancel-btn').style.display = 'none';
    }

    async function saveService() {
        const editId = document.getElementById('svcEditId').value;
        const benefits = getDynamicArray('benefits-container', ['iconUrl', 'title', 'description'], ['ben-icon', 'ben-title', 'ben-desc']);
        const processSteps = getDynamicArray('process-container', ['stepNumber', 'title', 'description'], ['proc-num', 'proc-title', 'proc-desc']);
        const faqs = getDynamicArray('faq-container', ['question', 'answer'], ['faq-q', 'faq-a']);

        const payload = {
            title: document.getElementById('svcTitle').value.trim(),
            slug: document.getElementById('svcSlug').value.trim().toLowerCase().replace(/\s+/g, '-'),
            icon: document.getElementById('svcIcon').value.trim(),
            description: document.getElementById('svcDesc').value.trim(),
            fullDescription: document.getElementById('svcFullDesc').value.trim(),
            tagline: document.getElementById('svcTagline').value.trim(),
            aboutText: document.getElementById('svcAboutText').value.trim(),
            benefits,
            processSteps,
            faqs
        };

        if (!payload.title || !payload.slug) return alert('Title and Slug are required.');

        try {
            const url = editId ? `/api/admin/services/${editId}` : '/api/admin/services';
            const method = editId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert(editId ? '✅ Service updated!' : '✅ Service created!');
                resetServiceForm();
                fetchAdminServices();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Request failed.');
        }
    }

    async function deleteService(id) {
        if (!confirm('Delete this service AND all its packages?')) return;
        const res = await fetch(`/api/admin/services/${id}`, { credentials: 'include', method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            alert('✅ Deleted.');
            fetchAdminServices();
        } else {
            alert('Error: ' + data.error);
        }
    }

    async function fetchAdminPackages() {
        const tbody = document.getElementById('packagesTable');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888">Loading...</td></tr>';
        populateServiceDropdown();
        try {
            const res = await fetch('/api/admin/packages', { credentials: 'include' });
            const data = await res.json();
            if (!data.success || !data.packages.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888">No packages yet.</td></tr>';
                return;
            }
            tbody.innerHTML = data.packages.map((pkg) => `
                <tr>
                    <td><strong>${pkg.title}</strong>${pkg.isFeatured ? ' ⭐' : ''}</td>
                    <td>${pkg.serviceId?.title || '-'}</td>
                    <td style="color:#6B46C1;font-weight:700">₹${(pkg.pricing?.priceIN || 0).toLocaleString()}</td>
                    <td style="color:#0284c7;font-weight:700">$${pkg.pricing?.priceUS || 0}</td>
                    <td style="color:#0891b2;font-weight:700">$${pkg.pricing?.priceGlobal || 0}</td>
                    <td>★ ${pkg.rating}</td>
                    <td style="display:flex;gap:8px;">
                        <button class="btn-publish" style="padding:6px 14px;font-size:13px;" onclick="editPackage(${JSON.stringify(JSON.stringify(pkg)).replace(/"/g, '&quot;')})">✏️</button>
                        <button class="delete-btn" style="font-size:13px;" onclick="deletePackage('${pkg._id}')">🗑️</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="7" style="color:red;text-align:center">Error loading</td></tr>';
        }
    }

    async function populateServiceDropdown() {
        const select = document.getElementById('pkgServiceId');
        if (!select) return;
        try {
            const res = await fetch('/api/admin/services', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                const current = select.value;
                select.innerHTML = '<option value="">-- Select Service --</option>' +
                    data.services.map((service) => `<option value="${service._id}" ${service._id === current ? 'selected' : ''}>${service.icon || '🚀'} ${service.title}</option>`).join('');
            }
        } catch (error) {
        }
    }

    function editPackage(jsonStr) {
        const pkg = JSON.parse(jsonStr);
        document.getElementById('pkgEditId').value = pkg._id;
        document.getElementById('pkgTitle').value = pkg.title;
        document.getElementById('pkgServiceId').value = pkg.serviceId?._id || pkg.serviceId || '';
        document.getElementById('pkgRating').value = pkg.rating;
        document.getElementById('pkgFeatured').checked = pkg.isFeatured;
        document.getElementById('pkgPriceIN').value = pkg.pricing?.priceIN || '';
        document.getElementById('pkgPriceUS').value = pkg.pricing?.priceUS || '';
        document.getElementById('pkgPriceGlobal').value = pkg.pricing?.priceGlobal || '';
        document.getElementById('pkgDesc').value = pkg.description || '';
        document.getElementById('pkgFeatures').value = (pkg.features || []).join('\n');

        const faqContainer = document.getElementById('pkgFaqsContainer');
        faqContainer.innerHTML = '';
        if (pkg.faqs && pkg.faqs.length > 0) {
            pkg.faqs.forEach((faq) => addPkgFaq(faq.question, faq.answer));
        }

        document.getElementById('pkg-form-title').textContent = '✏️ Edit Package';
        document.getElementById('pkg-cancel-btn').style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetPackageForm() {
        ['pkgEditId', 'pkgTitle', 'pkgDesc', 'pkgFeatures', 'pkgPriceIN', 'pkgPriceUS', 'pkgPriceGlobal']
            .forEach((id) => {
                const node = document.getElementById(id);
                if (node) node.value = '';
            });
        document.getElementById('pkgServiceId').value = '';
        document.getElementById('pkgRating').value = '4.9';
        document.getElementById('pkgFeatured').checked = false;
        document.getElementById('pkgFaqsContainer').innerHTML = '';
        document.getElementById('pkg-form-title').textContent = '➕ Add New Package';
        document.getElementById('pkg-cancel-btn').style.display = 'none';
    }

    async function savePackage() {
        const editId = document.getElementById('pkgEditId').value;
        const features = document.getElementById('pkgFeatures').value.split('\n').map((line) => line.trim()).filter(Boolean);
        const faqs = [];
        document.querySelectorAll('.pkg-faq-row').forEach((row) => {
            const question = row.querySelector('.faq-q-input').value.trim();
            const answer = row.querySelector('.faq-a-input').value.trim();
            if (question && answer) faqs.push({ question, answer });
        });

        const payload = {
            title: document.getElementById('pkgTitle').value.trim(),
            serviceId: document.getElementById('pkgServiceId').value,
            rating: parseFloat(document.getElementById('pkgRating').value) || 4.9,
            isFeatured: document.getElementById('pkgFeatured').checked,
            description: document.getElementById('pkgDesc').value.trim(),
            features,
            faqs,
            pricing: {
                priceIN: parseFloat(document.getElementById('pkgPriceIN').value),
                priceUS: parseFloat(document.getElementById('pkgPriceUS').value),
                priceGlobal: parseFloat(document.getElementById('pkgPriceGlobal').value)
            }
        };

        if (!payload.title || !payload.serviceId) return alert('Title and Service are required.');
        if (!payload.pricing.priceIN || !payload.pricing.priceUS || !payload.pricing.priceGlobal) return alert('All 3 prices are required.');

        try {
            const url = editId ? `/api/admin/packages/${editId}` : '/api/admin/packages';
            const method = editId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert(editId ? '✅ Package updated!' : '✅ Package created!');
                resetPackageForm();
                fetchAdminPackages();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Request failed.');
        }
    }

    function addPkgFaq(question = '', answer = '') {
        const container = document.getElementById('pkgFaqsContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'pkg-faq-row';
        div.style = 'background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:10px; display:flex; flex-direction:column; gap:8px;';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:11px; font-weight:bold; color:#64748b; text-transform:uppercase;">FAQ Item</span>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="color:#ef4444; border:none; background:none; cursor:pointer; font-size:18px;">&times;</button>
            </div>
            <input type="text" class="faq-q-input" placeholder="Question..." value="${escHtml(question)}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
            <textarea class="faq-a-input" placeholder="Answer..." rows="2" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; resize:vertical;">${escHtml(answer)}</textarea>
        `;
        container.appendChild(div);
    }

    async function deletePackage(id) {
        if (!confirm('Delete this package?')) return;
        const res = await fetch(`/api/admin/packages/${id}`, { credentials: 'include', method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            alert('✅ Deleted.');
            fetchAdminPackages();
        } else {
            alert('Error: ' + data.error);
        }
    }

    function escHtml(str) {
        return String(str)
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    window.mountAdminOrdersCommerceSections = function () {
        mountSections(["reviews","review-moderation","handover-doc","orders","services-section","packages-section","smm-orders-section"]);
    };
    window.fetchOrders = fetchOrders;
    window.fetchSmmOrders = fetchSmmOrders;
    window.updateStatus = updateStatus;
    window.assignStaffManual = assignStaffManual;
    window.assignStaffFromDropdown = assignStaffFromDropdown;
    window.resendInvoice = resendInvoice;
    window.fetchAdminServices = fetchAdminServices;
    window.addBenefitField = addBenefitField;
    window.addProcessField = addProcessField;
    window.addFaqField = addFaqField;
    window.editService = editService;
    window.resetServiceForm = resetServiceForm;
    window.saveService = saveService;
    window.deleteService = deleteService;
    window.fetchAdminPackages = fetchAdminPackages;
    window.populateServiceDropdown = populateServiceDropdown;
    window.editPackage = editPackage;
    window.resetPackageForm = resetPackageForm;
    window.savePackage = savePackage;
    window.addPkgFaq = addPkgFaq;
    window.deletePackage = deletePackage;
})();


// --- AUTOMATICALLY EXTRACTED MODULE FUNCTIONS ---

// ==========================================
// 💼 5. MANAGE CAREERS / JOBS
// ==========================================
window.fetchAdminJobs = async function () {
    try {
        const res = await fetch('/api/jobs', { credentials: 'include' });
        const data = await res.json();
        const tbody = document.getElementById('jobsTableBody');
        tbody.innerHTML = '';
        if (data.success && data.jobs) {
            if (data.jobs.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No jobs posted.</td></tr>'; return; }
            data.jobs.forEach(job => {
                tbody.innerHTML += `
        <tr>
            <td><strong>${job.title}</strong></td>
            <td>${job.type} • ${job.location}</td>
            <td>${new Date(job.date).toLocaleDateString()}</td>
            <td><button onclick="deleteJob('${job._id}')" class="delete-btn">Remove</button></td>
        </tr>`;
            });
        }
    } catch (e) { }
}
window.submitJob = async function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnJob');
    btn.innerText = "Posting...";
    try {
        const res = await fetch('/api/admin/add-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: document.getElementById('jobTitle').value,
                type: document.getElementById('jobType').value,
                location: document.getElementById('jobLocation').value,
                description: document.getElementById('jobDesc').value
            }), credentials: 'include'
        });
        const result = await res.json();
        if (result.success) {
            alert("✅ " + result.message);
            document.getElementById('addJobForm').reset();
            fetchAdminJobs();
        }
    } catch (err) { alert("Server connection failed"); }
    btn.innerText = "Post Job 🚀";
};
window.deleteJob = async function (id) {
    if (confirm("Are you sure? This job will be removed!")) {
        await fetch(`/api/admin/delete-job/${id}`, { method: 'DELETE', credentials: 'include' });
        fetchAdminJobs();
    }
};
// ==========================================
// 📄 6. HANDOVER CERTIFICATES
// ==========================================
async function generateHandover(e) {
    e.preventDefault();
    const btn = document.getElementById('btnHandover');
    btn.innerText = "Processing...";
    const payload = {
        orderNumber: document.getElementById('hOrder').value,
        clientName: document.getElementById('hClient').value,
        projectName: document.getElementById('hProject').value,
        deliveryDate: document.getElementById('hDelDate').value,
        supportDate: document.getElementById('hSupDate').value,
        liveLink: document.getElementById('hLink').value,
        remarks: document.getElementById('hNotes').value
    };
    try {
        const res = await fetch('/api/admin/generate-handover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
            , credentials: 'include'
        });
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `VibeSphere_Handover_${payload.orderNumber}.pdf`;
            a.click();
            document.getElementById('secureHandoverForm').reset();
            fetchHandovers();
        } else { alert("Failed to generate PDF. Check auth."); }
    } catch (err) { alert("Server error"); }
    btn.innerText = "📥 Download PDF";
};
window.emailHandover = async function (e) {
    e.preventDefault();
    const payload = {
        orderNumber: document.getElementById('hOrder').value,
        clientName: document.getElementById('hClient').value,
        projectName: document.getElementById('hProject').value,
        deliveryDate: document.getElementById('hDelDate').value,
        supportDate: document.getElementById('hSupDate').value,
        liveLink: document.getElementById('hLink').value,
        remarks: document.getElementById('hNotes').value
    };
    if (!payload.orderNumber || !payload.clientName || !payload.projectName) return alert("⚠️ Please fill Order No, Client Name, and Project Title!");
    if (!confirm(`Send official handover email to the client?`)) return;
    const btn = document.getElementById('btnEmailHandover');
    btn.innerText = "Sending... ⏳";
    try {
        const res = await fetch('/api/admin/email-handover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
            , credentials: 'include'
        });
        const result = await res.json();
        if (result.success) {
            alert("✅ " + result.message);
            document.getElementById('secureHandoverForm').reset();
            fetchHandovers();
        } else { alert("❌ Error: " + result.message); }
    } catch (err) { alert("Server connection failed"); }
    btn.innerText = "📧 Email to Client";
}
window.fetchHandovers = async function () {
    try {
        const res = await fetch('/api/admin/handovers', { credentials: 'include' });
        const data = await res.json();
        const tbody = document.getElementById('certificatesTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (data.success) {
            const certs = Array.isArray(data.certs) ? data.certs : [];
            if (certs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px;">No certificates generated yet.</td></tr>';
                return;
            }
            tbody.innerHTML = certs.map((c) => `
                <tr>
                    <td>
                        <div style="font-weight:700;color:#0f172a;">${formatAdminDate(c.dateGenerated)}</div>
                        <div style="margin-top:4px;font-size:0.8rem;color:#64748b;">Delivery record</div>
                    </td>
                    <td>
                        <div style="font-weight:800;color:#059669;">${escapeHtml(c.certId || '—')}</div>
                        <div style="margin-top:4px;font-size:0.8rem;color:#64748b;">Verified certificate ID</div>
                    </td>
                    <td>
                        <div style="font-weight:700;color:#0f172a;">${escapeHtml(c.orderNumber || '—')}</div>
                    </td>
                    <td>
                        <div style="font-weight:700;color:#0f172a;">${escapeHtml(c.clientName || 'Unknown Client')}</div>
                        <div style="margin-top:4px;font-size:0.82rem;color:#64748b;">${escapeHtml(c.projectName || 'Untitled Project')}</div>
                    </td>
                    <td>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button onclick="window.open('/api/admin/download-saved-handover/${c._id}')" class="modern-action-btn" title="Download PDF"><i class="ri-download-2-line"></i> PDF</button>
                            <button onclick="reEmailSavedHandover('${c._id}')" class="modern-action-btn" title="Resend to Client"><i class="ri-mail-send-line"></i> Email</button>
                            <button onclick="deleteHandover('${c._id}')" class="modern-action-btn" title="Delete Certificate"><i class="ri-delete-bin-6-line"></i> Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) { }
};
window.deleteHandover = async function (id) {
    if (confirm("Are you sure? QR Code will become FAKE!")) {
        await fetch(`/api/admin/delete-handover/${id}`, { method: 'DELETE', credentials: 'include' });
        fetchHandovers();
    }
};
window.reEmailSavedHandover = async function (id) {
    if (!confirm("Resend this handover certificate to the client's email?")) return;
    try {
        const res = await fetch(`/api/admin/re-email-handover/${id}`, { method: 'POST', credentials: 'include' });
        const result = await res.json();
        if (result.success) alert("✅ " + result.message);
        else alert("❌ Error: " + result.message);
    } catch (e) { alert("Server connection failed"); }
};

// Window Bindings
window.generateHandover = generateHandover;
