(function () {
    const SECTION_HTML = {
        "smm-rates-section": `
            <div id="smm-rates-section" class="section" data-module-mounted="true">
                <div class="premium-section">
                    <div class="section-header">
                        <div>
                            <h2 class="section-title" style="font-size:1.4rem;">🚀 SMM Rate Manager</h2>
                            <p class="section-subtitle" style="margin-top:6px;">Update pricing base rates (per 1,000 units in INR) for platform SMM services.</p>
                        </div>
                    </div>

                    <div class="staff-card" style="padding:24px;margin-bottom:24px;background:#ffffff;border-radius:18px;border:1px solid rgba(148,163,184,0.12);box-shadow:0 4px 20px rgba(0,0,0,0.02);">
                        <h3 id="smm-form-title" style="margin-bottom:16px;font-size:1.1rem;color:#1e293b;font-weight:700;">➕ Add / Update SMM Service Rate</h3>
                        <p id="smm-form-error" style="display:none;margin:0 0 14px;color:#b91c1c;font-weight:600;"></p>
                        
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:16px;">
                            <div>
                                <label style="display:block;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:#475569">Platform *</label>
                                <select id="smmPlatform" style="width:100%;padding:11px 14px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;color:#1e293b;font-weight:600;outline:none;transition:0.2s;">
                                    <option value="Instagram">Instagram</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="Facebook">Facebook</option>
                                    <option value="Twitter">Twitter</option>
                                    <option value="TikTok">TikTok</option>
                                    <option value="Telegram">Telegram</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:#475569">Service Type *</label>
                                <input type="text" id="smmServiceType" placeholder="e.g. Followers, Likes, Views"
                                    style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;color:#1e293b;font-weight:600;outline:none;">
                            </div>
                            <div>
                                <label style="display:block;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:#475569">Rate Per 1,000 (INR) *</label>
                                <input type="number" id="smmRatePer1000" placeholder="e.g. 150" min="0.01" step="0.01"
                                    style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;color:#1e293b;font-weight:600;outline:none;">
                            </div>
                        </div>

                        <div style="display:flex;gap:10px;">
                            <button onclick="saveSmmRate()" class="btn-publish" style="background:#6c63ff;color:#fff;border:none;padding:11px 22px;border-radius:10px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">💾 Save Rate</button>
                            <button id="smm-cancel-btn" onclick="resetSmmForm()" class="btn-cancel" style="display:none;background:#f1f5f9;color:#475569;border:none;padding:11px 22px;border-radius:10px;font-weight:700;cursor:pointer;">Cancel</button>
                        </div>
                    </div>

                    <div class="modern-table-shell" style="background:#ffffff;border-radius:18px;border:1px solid rgba(148,163,184,0.12);box-shadow:0 4px 20px rgba(0,0,0,0.02);overflow:hidden;">
                        <div class="table-responsive" style="overflow-x:auto;width:100%;">
                            <table class="modern-list-table" style="width:100%;border-collapse:collapse;text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                                        <th style="padding:16px 20px;font-weight:700;color:#475569;font-size:0.85rem;">Platform</th>
                                        <th style="padding:16px 20px;font-weight:700;color:#475569;font-size:0.85rem;">Service Type</th>
                                        <th style="padding:16px 20px;font-weight:700;color:#475569;font-size:0.85rem;">Service ID</th>
                                        <th style="padding:16px 20px;font-weight:700;color:#475569;font-size:0.85rem;">Rate Per 1,000</th>
                                        <th style="padding:16px 20px;font-weight:700;color:#475569;font-size:0.85rem;text-align:right;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="smmRatesTable">
                                    <tr>
                                        <td colspan="5" style="text-align:center;padding:24px;color:#64748b;">Loading SMM rates...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
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

    window.mountAdminSmmRatesSection = function () {
        mountSections(["smm-rates-section"]);
    };
})();

async function fetchAdminSmmRates() {
    const tbody = document.getElementById('smmRatesTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#888;">Loading rates...</td></tr>';
    try {
        const res = await fetch('/api/smm/rates');
        const data = await res.json();
        if (!data.success || !data.rates || !data.rates.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#64748b;">No SMM rates defined. Add one above.</td></tr>';
            return;
        }
        tbody.innerHTML = data.rates.map((rate) => {
            return `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:16px 20px;"><strong>${escapeHtml(rate.platform)}</strong></td>
                    <td style="padding:16px 20px;">${escapeHtml(rate.serviceType)}</td>
                    <td style="padding:16px 20px;"><code>${escapeHtml(rate.serviceId)}</code></td>
                    <td style="padding:16px 20px;font-weight:700;color:#6b46c1;">₹${Number(rate.ratePer1000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style="padding:16px 20px;text-align:right;">
                        <div style="display:flex;gap:8px;justify-content:flex-end;">
                            <button type="button" class="btn-publish smm-edit-btn" data-rate="${escapeHtml(JSON.stringify(rate))}" style="background:#4f46e5;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;">✏️ Edit</button>
                            <button type="button" class="delete-btn smm-delete-btn" data-service-id="${escapeHtml(rate.serviceId)}" style="background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;">🗑️ Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.smm-edit-btn').forEach((button) => {
            button.addEventListener('click', () => {
                try {
                    editSmmRate(JSON.parse(button.dataset.rate || '{}'));
                } catch (err) {
                    editSmmRate(null);
                }
            });
        });

        tbody.querySelectorAll('.smm-delete-btn').forEach((button) => {
            button.addEventListener('click', () => {
                deleteSmmRate(button.dataset.serviceId || '');
            });
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:red;text-align:center;padding:24px;">Error loading SMM rates.</td></tr>';
    }
}

function editSmmRate(rate) {
    try {
        if (!rate || typeof rate !== 'object') {
            throw new Error('Invalid SMM rate data');
        }
        const errorEl = document.getElementById('smm-form-error');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
        document.getElementById('smmPlatform').value = rate.platform || 'Instagram';
        document.getElementById('smmServiceType').value = rate.serviceType || '';
        document.getElementById('smmRatePer1000').value = rate.ratePer1000 || '';
        document.getElementById('smm-form-title').textContent = '✏️ Edit SMM Service Rate';
        document.getElementById('smm-cancel-btn').style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error("Failed to parse SMM rate", err);
        const errorEl = document.getElementById('smm-form-error');
        if (errorEl) {
            errorEl.textContent = 'Invalid SMM rate data. Please try editing again or refresh the list.';
            errorEl.style.display = 'block';
        } else {
            window.alert('Invalid SMM rate data. Please try again.');
        }
        document.getElementById('smm-form-title').textContent = '➕ Add / Update SMM Service Rate';
        document.getElementById('smm-cancel-btn').style.display = 'none';
    }
}

function resetSmmForm() {
    document.getElementById('smmServiceType').value = '';
    document.getElementById('smmRatePer1000').value = '';
    document.getElementById('smm-form-title').textContent = '➕ Add / Update SMM Service Rate';
    document.getElementById('smm-cancel-btn').style.display = 'none';
    const errorEl = document.getElementById('smm-form-error');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
}

async function saveSmmRate() {
    const platform = document.getElementById('smmPlatform').value;
    const serviceType = document.getElementById('smmServiceType').value.trim();
    const ratePer1000 = document.getElementById('smmRatePer1000').value.trim();

    if (!platform || !serviceType || !ratePer1000) {
        alert('⚠️ All fields are required.');
        return;
    }

    // Auto-generate service ID from platform and serviceType, e.g. ig-followers
    const getPrefix = (plat) => {
        const p = plat.toLowerCase();
        if (p.includes('insta')) return 'ig';
        if (p.includes('youtube') || p.includes('yt')) return 'yt';
        if (p.includes('fb') || p.includes('facebook')) return 'fb';
        if (p.includes('twitter')) return 'tw';
        if (p.includes('tiktok')) return 'tk';
        if (p.includes('telegram')) return 'tg';
        return p.slice(0, 3);
    };
    const cleanType = serviceType.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const serviceId = `${getPrefix(platform)}-${cleanType}`;

    const payload = { serviceId, platform, serviceType, ratePer1000: Number(ratePer1000) };

    try {
        const res = await fetch('/api/admin/smm/rates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ SMM rate saved successfully!');
            resetSmmForm();
            fetchAdminSmmRates();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Server Error');
    }
}

async function deleteSmmRate(serviceId) {
    if (!confirm(`Are you sure you want to delete SMM rate for service "${serviceId}"?`)) return;
    try {
        const res = await fetch(`/api/admin/smm/rates/${serviceId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ SMM rate deleted.');
            fetchAdminSmmRates();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Server Error');
    }
}
