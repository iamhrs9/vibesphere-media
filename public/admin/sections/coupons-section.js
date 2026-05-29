(function () {
    const state = {
        coupons: [],
        formBound: false
    };

    const SECTION_HTML = {
        'coupons-section': `
            <div id="coupons-section" class="section" data-module-mounted="true">
                <style>
                    #coupons-section .coupon-shell {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }

                    #coupons-section .coupon-panel {
                        background: rgba(255, 255, 255, 0.95);
                        border: 1px solid rgba(226, 232, 240, 0.9);
                        border-radius: 24px;
                        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
                    }

                    #coupons-section .coupon-toolbar {
                        padding: 26px 28px;
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 16px;
                        flex-wrap: wrap;
                    }

                    #coupons-section .coupon-kicker {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 12px;
                        border-radius: 999px;
                        background: rgba(79, 70, 229, 0.1);
                        color: #4338ca;
                        font-size: 0.78rem;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                    }

                    #coupons-section .coupon-title {
                        margin: 12px 0 6px;
                        color: #0f172a;
                        font-size: 1.65rem;
                        font-weight: 800;
                        letter-spacing: -0.03em;
                    }

                    #coupons-section .coupon-subtitle {
                        margin: 0;
                        max-width: 760px;
                        color: #64748b;
                        line-height: 1.7;
                    }

                    #coupons-section .coupon-toolbar-actions {
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                    }

                    #coupons-section .coupon-btn {
                        appearance: none;
                        -webkit-appearance: none;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        border: 1px solid transparent;
                        border-radius: 14px;
                        padding: 11px 16px;
                        font-weight: 700;
                        cursor: pointer;
                        text-decoration: none;
                        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
                    }

                    #coupons-section .coupon-btn:hover {
                        transform: translateY(-1px);
                    }

                    #coupons-section .coupon-btn-primary {
                        background: linear-gradient(135deg, #4f46e5, #7c3aed);
                        color: #fff;
                        box-shadow: 0 18px 34px rgba(79, 70, 229, 0.24);
                    }

                    #coupons-section .coupon-btn-secondary {
                        background: linear-gradient(180deg, #f8fafc, #eef2ff);
                        border-color: rgba(203, 213, 225, 0.95);
                        color: #334155;
                    }

                    #coupons-section .coupon-btn-danger {
                        background: linear-gradient(180deg, #fff1f2, #ffe4e6);
                        border-color: rgba(251, 191, 193, 0.95);
                        color: #be123c;
                    }

                    #coupons-section .coupon-btn-soft {
                        background: linear-gradient(180deg, #ffffff, #f8fafc);
                        border-color: rgba(203, 213, 225, 0.95);
                        color: #334155;
                    }

                    #coupons-section .coupon-grid {
                        display: grid;
                        grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.25fr);
                        gap: 20px;
                    }

                    #coupons-section .coupon-card {
                        padding: 22px;
                    }

                    #coupons-section .coupon-card__header {
                        margin-bottom: 18px;
                    }

                    #coupons-section .coupon-card__header h3 {
                        margin: 8px 0 6px;
                        color: #0f172a;
                        font-size: 1.15rem;
                        font-weight: 800;
                    }

                    #coupons-section .coupon-card__header p {
                        margin: 0;
                        color: #64748b;
                        line-height: 1.65;
                    }

                    #coupons-section .coupon-form-grid {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 14px;
                    }

                    #coupons-section .coupon-field {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    #coupons-section .coupon-field--full {
                        grid-column: 1 / -1;
                    }

                    #coupons-section .coupon-field label,
                    #coupons-section .coupon-field span {
                        color: #334155;
                        font-size: 0.82rem;
                        font-weight: 700;
                    }

                    #coupons-section .coupon-input,
                    #coupons-section .coupon-select {
                        width: 100%;
                        border: 1px solid rgba(203, 213, 225, 0.95);
                        border-radius: 14px;
                        background: #f8fafc;
                        padding: 12px 14px;
                        font-size: 0.94rem;
                        color: #0f172a;
                        outline: none;
                        transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
                    }

                    #coupons-section .coupon-input:focus,
                    #coupons-section .coupon-select:focus {
                        border-color: rgba(79, 70, 229, 0.45);
                        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.10);
                        background: #fff;
                    }

                    #coupons-section .coupon-form-actions {
                        grid-column: 1 / -1;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        flex-wrap: wrap;
                        margin-top: 2px;
                    }

                    #coupons-section .coupon-message {
                        margin: 12px 0 0;
                        font-size: 0.9rem;
                        font-weight: 600;
                    }

                    #coupons-section .coupon-message.is-error {
                        color: #b91c1c;
                    }

                    #coupons-section .coupon-message.is-success {
                        color: #047857;
                    }

                    #coupons-section .coupon-table-wrap {
                        overflow-x: auto;
                    }

                    #coupons-section .coupon-table {
                        width: 100%;
                        border-collapse: collapse;
                    }

                    #coupons-section .coupon-table thead th {
                        padding: 16px 18px;
                        text-align: left;
                        font-size: 0.75rem;
                        font-weight: 800;
                        letter-spacing: 0.06em;
                        text-transform: uppercase;
                        color: #475569;
                        background: rgba(248, 250, 252, 0.95);
                        border-bottom: 1px solid rgba(226, 232, 240, 0.9);
                    }

                    #coupons-section .coupon-table tbody td {
                        padding: 16px 18px;
                        border-bottom: 1px solid rgba(226, 232, 240, 0.82);
                        vertical-align: top;
                        color: #0f172a;
                    }

                    #coupons-section .coupon-table tbody tr:hover {
                        background: rgba(248, 250, 252, 0.72);
                    }

                    #coupons-section .coupon-meta {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }

                    #coupons-section .coupon-strong {
                        font-weight: 800;
                    }

                    #coupons-section .coupon-muted {
                        color: #64748b;
                        font-size: 0.84rem;
                    }

                    #coupons-section .coupon-pill-row {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                    }

                    #coupons-section .coupon-pill {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 6px 10px;
                        border-radius: 999px;
                        background: rgba(79, 70, 229, 0.08);
                        color: #4338ca;
                        font-size: 0.76rem;
                        font-weight: 700;
                        white-space: nowrap;
                    }

                    #coupons-section .coupon-pill--neutral {
                        background: rgba(148, 163, 184, 0.12);
                        color: #475569;
                    }

                    #coupons-section .coupon-pill--active {
                        background: rgba(16, 185, 129, 0.12);
                        color: #047857;
                    }

                    #coupons-section .coupon-pill--inactive {
                        background: rgba(248, 113, 113, 0.12);
                        color: #b91c1c;
                    }

                    #coupons-section .coupon-actions {
                        display: flex;
                        gap: 8px;
                        flex-wrap: wrap;
                    }

                    #coupons-section .coupon-action-btn {
                        padding: 9px 12px;
                        border-radius: 12px;
                        border: 1px solid rgba(203, 213, 225, 0.95);
                        background: #fff;
                        color: #334155;
                        font-weight: 700;
                        cursor: pointer;
                        transition: transform 0.18s ease, box-shadow 0.18s ease;
                    }

                    #coupons-section .coupon-action-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 12px 22px rgba(15, 23, 42, 0.08);
                    }

                    #coupons-section .coupon-action-btn--toggle {
                        background: linear-gradient(180deg, #eef2ff, #e0e7ff);
                        color: #3730a3;
                    }

                    #coupons-section .coupon-action-btn--delete {
                        background: linear-gradient(180deg, #fff1f2, #ffe4e6);
                        color: #be123c;
                        border-color: rgba(251, 191, 193, 0.95);
                    }

                    @media (max-width: 1100px) {
                        #coupons-section .coupon-grid {
                            grid-template-columns: 1fr;
                        }
                    }

                    @media (max-width: 768px) {
                        #coupons-section .coupon-toolbar {
                            padding: 20px;
                        }

                        #coupons-section .coupon-card {
                            padding: 18px;
                        }

                        #coupons-section .coupon-form-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                </style>

                <div class="coupon-shell">
                    <section class="coupon-panel coupon-toolbar">
                        <div>
                            <span class="coupon-kicker">Promo Codes</span>
                            <h2 class="coupon-title">Coupon Manager</h2>
                            <p class="coupon-subtitle">Create promo codes, set order and module limits, and manage active discounts from one place.</p>
                        </div>
                        <div class="coupon-toolbar-actions">
                            <button type="button" class="coupon-btn coupon-btn-secondary" onclick="window.fetchCoupons?.()">Refresh</button>
                        </div>
                    </section>

                    <div class="coupon-grid">
                        <section class="coupon-panel coupon-card">
                            <div class="coupon-card__header">
                                <span class="coupon-kicker">Create New Coupon</span>
                                <h3>Build a promo code</h3>
                                <p>Choose a module, set the discount, and define any caps or usage rules.</p>
                            </div>

                            <form id="couponCreateForm" class="coupon-form-grid">
                                <label class="coupon-field">
                                    <span>Code Name</span>
                                    <input id="couponCodeInput" class="coupon-input" type="text" placeholder="SUMMER2026" oninput="this.value=this.value.toUpperCase()" required>
                                </label>

                                <label class="coupon-field">
                                    <span>Type</span>
                                    <select id="couponTypeInput" class="coupon-select" required>
                                        <option value="percent">Percent</option>
                                        <option value="fixed">Flat</option>
                                    </select>
                                </label>

                                <label class="coupon-field">
                                    <span>Value</span>
                                    <input id="couponValueInput" class="coupon-input" type="number" min="0.01" step="0.01" placeholder="10" required>
                                </label>

                                <label class="coupon-field">
                                    <span>Applicable Module</span>
                                    <select id="couponModuleInput" class="coupon-select" required>
                                        <option value="all">All</option>
                                        <option value="smm">SMM</option>
                                        <option value="web_design">Web Design</option>
                                        <option value="seo">SEO</option>
                                    </select>
                                </label>

                                <label class="coupon-field coupon-field--full">
                                    <span>Restrict to User (Optional)</span>
                                    <input id="couponUserEmail" class="coupon-input" type="email" placeholder="Enter user's exact email (Leave empty for everyone)">
                                    <span class="coupon-muted">If filled, only this user can apply the code.</span>
                                </label>

                                <label class="coupon-field">
                                    <span>Max Discount Cap</span>
                                    <input id="couponMaxDiscountInput" class="coupon-input" type="number" min="0" step="0.01" placeholder="0 for no cap">
                                </label>

                                <label class="coupon-field">
                                    <span>Min Order Value</span>
                                    <input id="couponMinOrderInput" class="coupon-input" type="number" min="0" step="0.01" placeholder="0">
                                </label>

                                <label class="coupon-field">
                                    <span>Usage Limit</span>
                                    <input id="couponUsageLimitInput" class="coupon-input" type="number" min="0" step="1" placeholder="0 for unlimited">
                                </label>

                                <label class="coupon-field">
                                    <span>Expiry Date</span>
                                    <input id="couponExpiryInput" class="coupon-input" type="date">
                                </label>

                                <div class="coupon-form-actions">
                                    <button type="reset" class="coupon-btn coupon-btn-secondary">Reset</button>
                                    <button type="submit" class="coupon-btn coupon-btn-primary">Create Coupon</button>
                                </div>
                            </form>

                            <p id="couponFormMessage" class="coupon-message" style="display:none;"></p>
                        </section>

                        <section class="coupon-panel coupon-card">
                            <div class="coupon-card__header">
                                <span class="coupon-kicker">Existing Coupons</span>
                                <h3>Manage live promo codes</h3>
                                <p>Review module targeting, usage progress, expiry, and status at a glance.</p>
                            </div>

                            <div class="coupon-table-wrap">
                                <table class="coupon-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Type</th>
                                            <th>Value</th>
                                            <th>Modules</th>
                                            <th>Uses / Limit</th>
                                            <th>Expiry</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="couponTableBody">
                                        <tr>
                                            <td colspan="8" style="padding:28px;text-align:center;color:#64748b;">Loading coupons...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        `
    };

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
            const markup = SECTION_HTML[sectionId];
            if (!target || !markup || target.dataset.moduleMounted === 'true') return;
            target.outerHTML = markup;
        });
    }

    function formatCurrency(value) {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric)) return '₹0.00';
        return `₹${numeric.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function formatModules(modules = []) {
        const list = Array.isArray(modules) ? modules : [];
        if (!list.length || list.includes('all')) {
            return ['All'];
        }

        return list.map((moduleName) => {
            const key = String(moduleName ?? '').trim().toLowerCase();
            if (key === 'smm') return 'SMM';
            if (key === 'seo') return 'SEO';
            if (key === 'web_design' || key === 'web' || key === 'website') return 'Web Design';
            return String(moduleName ?? '').trim() || 'All';
        });
    }

    function formatExpiry(expiryDate) {
        if (!expiryDate) return 'No expiry';
        const parsed = new Date(expiryDate);
        if (Number.isNaN(parsed.getTime())) return 'No expiry';
        return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function formatCouponValue(coupon) {
        const value = Number(coupon?.discountValue || 0);
        if ((coupon?.discountType || 'percent') === 'fixed') {
            return `${formatCurrency(value)}`;
        }

        return `${Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, '') : '0'}%`;
    }

    function formatUsage(coupon) {
        const used = Number(coupon?.usageCount || 0);
        const limit = Number(coupon?.usageLimit || 0);
        if (!Number.isFinite(limit) || limit <= 0) {
            return `${used} / Unlimited`;
        }

        return `${used} / ${limit}`;
    }

    function formatStatusPill(coupon) {
        return coupon?.isActive
            ? '<span class="coupon-pill coupon-pill--active">Active</span>'
            : '<span class="coupon-pill coupon-pill--inactive">Inactive</span>';
    }

    function formatValueMeta(coupon) {
        const parts = [];
        const maxCap = Number(coupon?.maxDiscountAmount || 0);
        const minOrder = Number(coupon?.minOrderValue || 0);

        if (maxCap > 0) {
            parts.push(`Cap ${formatCurrency(maxCap)}`);
        }

        if (minOrder > 0) {
            parts.push(`Min order ${formatCurrency(minOrder)}`);
        }

        return parts;
    }

    function setFormMessage(message, type = '') {
        const messageEl = document.getElementById('couponFormMessage');
        if (!messageEl) return;

        messageEl.textContent = String(message ?? '').trim();
        messageEl.style.display = message ? 'block' : 'none';
        messageEl.classList.remove('is-error', 'is-success');
        if (type === 'error') messageEl.classList.add('is-error');
        if (type === 'success') messageEl.classList.add('is-success');
    }

    function renderCouponsTable() {
        const tbody = document.getElementById('couponTableBody');
        if (!tbody) return;

        if (!state.coupons.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="padding:28px;text-align:center;color:#64748b;">No coupons created yet.</td></tr>';
            return;
        }

        tbody.innerHTML = state.coupons.map((coupon) => {
            const moduleBadges = formatModules(coupon.applicableModules).map((moduleName) => `<span class="coupon-pill">${escapeHtml(moduleName)}</span>`).join('');
            const valueMeta = formatValueMeta(coupon).map((item) => `<div class="coupon-muted">${escapeHtml(item)}</div>`).join('');
            return `
                <tr>
                    <td>
                        <div class="coupon-meta">
                            <span class="coupon-strong">${escapeHtml(coupon.code || '')}</span>
                            ${valueMeta}
                        </div>
                    </td>
                    <td>${escapeHtml((coupon.discountType || 'percent') === 'fixed' ? 'Flat' : 'Percent')}</td>
                    <td>
                        <div class="coupon-meta">
                            <span class="coupon-strong">${escapeHtml(formatCouponValue(coupon))}</span>
                            ${Number(coupon.maxDiscountAmount || 0) > 0 ? `<span class="coupon-muted">Cap ${escapeHtml(formatCurrency(coupon.maxDiscountAmount))}</span>` : ''}
                        </div>
                    </td>
                    <td><div class="coupon-pill-row">${moduleBadges}</div></td>
                    <td>${escapeHtml(formatUsage(coupon))}</td>
                    <td>${escapeHtml(formatExpiry(coupon.expiryDate || coupon.expiresAt))}</td>
                    <td>${formatStatusPill(coupon)}</td>
                    <td>
                        <div class="coupon-actions">
                            <button type="button" class="coupon-action-btn coupon-action-btn--toggle" onclick="window.toggleCouponStatus?.('${escapeHtml(coupon._id || '')}')">${coupon.isActive ? 'Deactivate' : 'Activate'}</button>
                            <button type="button" class="coupon-action-btn coupon-action-btn--delete" onclick="window.deleteCoupon?.('${escapeHtml(coupon._id || '')}', '${escapeHtml(coupon.code || '')}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function fetchCoupons() {
        const tbody = document.getElementById('couponTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="padding:28px;text-align:center;color:#64748b;">Loading coupons...</td></tr>';
        }

        try {
            const res = await fetch('/api/admin/coupons', { credentials: 'include' });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to load coupons.');
            }

            state.coupons = Array.isArray(data.coupons) ? data.coupons : [];
            renderCouponsTable();
        } catch (error) {
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="8" style="padding:28px;text-align:center;color:#b91c1c;">${escapeHtml(error.message || 'Failed to load coupons.')}</td></tr>`;
            }
        }
    }

    async function handleCouponSubmit(event) {
        event.preventDefault();
        setFormMessage('');

        const code = (document.getElementById('couponCodeInput')?.value || '').trim().toUpperCase();
        const discountType = (document.getElementById('couponTypeInput')?.value || '').trim().toLowerCase() === 'fixed' ? 'fixed' : 'percent';
        const discountValue = Number(document.getElementById('couponValueInput')?.value);
        const applicableModule = (document.getElementById('couponModuleInput')?.value || '').trim().toLowerCase() || 'all';
        const restrictedEmail = (document.getElementById('couponUserEmail')?.value || '').trim().toLowerCase();
        const maxDiscountAmount = Number(document.getElementById('couponMaxDiscountInput')?.value || 0);
        const minOrderValue = Number(document.getElementById('couponMinOrderInput')?.value || 0);
        const usageLimit = Number(document.getElementById('couponUsageLimitInput')?.value || 0);
        const expiryDate = (document.getElementById('couponExpiryInput')?.value || '').trim();
        const submitBtn = event.submitter || document.querySelector('#couponCreateForm button[type="submit"]');

        if (!code) {
            setFormMessage('Coupon code is required.', 'error');
            return;
        }

        if (!Number.isFinite(discountValue) || discountValue <= 0) {
            setFormMessage('Discount value must be a positive number.', 'error');
            return;
        }

        if (discountType === 'percent' && discountValue > 100) {
            setFormMessage('Percent discounts cannot exceed 100.', 'error');
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        setFormMessage('Creating coupon...', '');

        try {
            const res = await fetch('/api/admin/coupons', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    discountType,
                    discountValue,
                    maxDiscountAmount: Number.isFinite(maxDiscountAmount) && maxDiscountAmount > 0 ? maxDiscountAmount : 0,
                    minOrderValue: Number.isFinite(minOrderValue) && minOrderValue > 0 ? minOrderValue : 0,
                    applicableModules: [applicableModule],
                    usageLimit: Number.isFinite(usageLimit) && usageLimit > 0 ? Math.floor(usageLimit) : 0,
                    expiryDate: expiryDate || null,
                    restrictedEmail
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create coupon.');
            }

            setFormMessage(`Coupon ${code} created successfully.`, 'success');
            const form = document.getElementById('couponCreateForm');
            if (form) form.reset();
            const moduleSelect = document.getElementById('couponModuleInput');
            if (moduleSelect) moduleSelect.value = 'all';
            const typeSelect = document.getElementById('couponTypeInput');
            if (typeSelect) typeSelect.value = 'percent';
            await fetchCoupons();
        } catch (error) {
            setFormMessage(error.message || 'Failed to create coupon.', 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    async function toggleCouponStatus(couponId) {
        if (!couponId) return;

        try {
            const res = await fetch(`/api/admin/coupons/${encodeURIComponent(couponId)}/toggle`, {
                method: 'PUT',
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to toggle coupon status.');
            }

            await fetchCoupons();
        } catch (error) {
            alert(error.message || 'Failed to toggle coupon status.');
        }
    }

    async function deleteCoupon(couponId, couponCode = '') {
        if (!couponId) return;

        const confirmed = confirm(`Delete coupon ${couponCode || couponId}? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/coupons/${encodeURIComponent(couponId)}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete coupon.');
            }

            await fetchCoupons();
        } catch (error) {
            alert(error.message || 'Failed to delete coupon.');
        }
    }

    function bindFormEvents() {
        if (state.formBound) return;
        state.formBound = true;

        const form = document.getElementById('couponCreateForm');
        if (form) {
            form.addEventListener('submit', handleCouponSubmit);
            form.addEventListener('reset', () => setFormMessage(''));
        }
    }

    window.mountAdminCouponSection = async function () {
        mountSections(['coupons-section']);
        bindFormEvents();
        await fetchCoupons();
        window.updateTopbarStatus?.('Coupon Manager');
    };

    window.fetchCoupons = fetchCoupons;
    window.toggleCouponStatus = toggleCouponStatus;
    window.deleteCoupon = deleteCoupon;
})();
