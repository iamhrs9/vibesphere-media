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
                        </div>

                        <!-- Restored Service Details Fields -->
                        <div style="border-top:1px solid rgba(148,163,184,0.12);padding-top:16px;margin-bottom:20px;">
                            <h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;font-weight:700;">ℹ️ Service Details</h4>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:16px;">
                                <div>
                                    <label style="display:block;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:#475569">Start Time</label>
                                    <input type="text" id="smmStartTime" placeholder="e.g. 0-1 Hours, Instant"
                                        style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;color:#1e293b;font-weight:600;outline:none;">
                                </div>
                                <div>
                                    <label style="display:block;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:#475569">Refill Guarantee</label>
                                    <input type="text" id="smmRefillGuarantee" placeholder="e.g. 30 Days Refill, No Refill"
                                        style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;color:#1e293b;font-weight:600;outline:none;">
                                </div>
                                <div>
                                    <label style="display:block;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:#475569">Speed</label>
                                    <input type="text" id="smmSpeed" placeholder="e.g. 1K - 5K / Day"
                                        style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;color:#1e293b;font-weight:600;outline:none;">
                                </div>
                            </div>
                            <div style="margin-bottom:16px;">
                                <label style="display:block;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:#475569">Detailed Description</label>
                                <textarea id="smmDescription" placeholder="Enter service details, start time info, or rules here..." rows="3"
                                    style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;color:#1e293b;font-weight:600;outline:none;font-family:inherit;resize:vertical;"></textarea>
                            </div>
                        </div>

                        <!-- Dynamic Pricing Variants Section -->
                        <div style="border-top:1px solid rgba(148,163,184,0.12);padding-top:16px;margin-bottom:20px;">
                            <h4 style="margin:0 0 12px 0;font-size:0.95rem;color:#1e293b;font-weight:700;">💰 Dynamic Pricing Variants</h4>
                            <div id="smmVariantsContainer">
                                <!-- Variants will be added here -->
                            </div>
                            <button type="button" onclick="addSmmVariant()" style="margin-top:10px;background:#f1f5f9;color:#475569;border:1px dashed #cbd5e1;padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer;width:100%;">+ Add Variant</button>
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
        if (typeof renderSmmVariants === 'function') renderSmmVariants();
    };

    window.currentSmmVariants = [];

    window.addSmmVariant = function() {
        window.currentSmmVariants.push({ country: '', quality: 'Standard', speed: '', refillGuarantee: 'No Refill', price: '' });
        window.renderSmmVariants();
    };

    window.removeSmmVariant = function(index) {
        window.currentSmmVariants.splice(index, 1);
        window.renderSmmVariants();
    };

    window.updateSmmVariant = function(index, field, value) {
        window.currentSmmVariants[index][field] = value;
    };

    window.renderSmmVariants = function() {
        const container = document.getElementById('smmVariantsContainer');
        if (!container) return;
        if (window.currentSmmVariants.length === 0) {
            container.innerHTML = '<p style="color:#64748b;font-size:0.85rem;">No variants added. Add at least one variant to define pricing.</p>';
            return;
        }
        container.innerHTML = window.currentSmmVariants.map((v, i) => `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1.2fr 1fr auto;gap:10px;margin-bottom:10px;align-items:end;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.75rem;font-weight:600;color:#475569">Country</label>
                    <input type="text" value="${escapeHtml(v.country)}" onchange="updateSmmVariant(${i}, 'country', this.value)" placeholder="e.g. Global" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;outline:none;">
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.75rem;font-weight:600;color:#475569">Quality/Type</label>
                    <input type="text" value="${escapeHtml(v.quality || 'Standard')}" onchange="updateSmmVariant(${i}, 'quality', this.value)" placeholder="e.g. High Quality" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;outline:none;">
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.75rem;font-weight:600;color:#475569">Speed</label>
                    <input type="text" value="${escapeHtml(v.speed)}" onchange="updateSmmVariant(${i}, 'speed', this.value)" placeholder="e.g. 1K-5K/day" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;outline:none;">
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.75rem;font-weight:600;color:#475569">Refill Guarantee</label>
                    <select onchange="updateSmmVariant(${i}, 'refillGuarantee', this.value)" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;outline:none;">
                        <option value="No Refill" ${v.refillGuarantee === 'No Refill' ? 'selected' : ''}>No Refill</option>
                        <option value="30 Days Refill" ${v.refillGuarantee === '30 Days Refill' ? 'selected' : ''}>30 Days Refill</option>
                        <option value="60 Days Refill" ${v.refillGuarantee === '60 Days Refill' ? 'selected' : ''}>60 Days Refill</option>
                        <option value="Lifetime Refill" ${v.refillGuarantee === 'Lifetime Refill' ? 'selected' : ''}>Lifetime Refill</option>
                    </select>
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.75rem;font-weight:600;color:#475569">Price/1k</label>
                    <input type="number" value="${v.price}" onchange="updateSmmVariant(${i}, 'price', this.value)" placeholder="e.g. 150" min="0" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;outline:none;">
                </div>
                <div>
                    <button type="button" onclick="removeSmmVariant(${i})" style="background:#ef4444;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">🗑️</button>
                </div>
            </div>
        `).join('');
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
            let priceDisplayHtml = '';
            if (rate.pricingVariants?.length > 0) {
                const validPrices = rate.pricingVariants.map(v => v?.price).filter(p => p !== undefined && p !== null);
                if (validPrices.length > 0) {
                    const lowestPrice = Math.min(...validPrices);
                    priceDisplayHtml = `
                        <div style="line-height:1.2;">
                            <strong style="color:#10b981;font-size:0.9rem;">Starting at ₹${lowestPrice}</strong>
                            <br/>
                            <span style="display:inline-block;margin-top:4px;font-size:0.7rem;font-weight:600;color:#6366f1;background:#e0e7ff;padding:2px 6px;border-radius:10px;">${rate.pricingVariants.length} variants</span>
                        </div>
                    `;
                } else {
                    priceDisplayHtml = `<span style="color:#94a3b8;font-size:0.85rem;">No valid pricing</span>`;
                }
            } else if (rate.ratePer1000 !== undefined && rate.ratePer1000 !== null) {
                priceDisplayHtml = `<strong style="color:#475569;">₹${Number(rate.ratePer1000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>`;
            } else {
                priceDisplayHtml = `<span style="color:#94a3b8;font-size:0.85rem;">₹0.00</span>`;
            }

            return `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:16px 20px;"><strong>${escapeHtml(rate.platform)}</strong></td>
                    <td style="padding:16px 20px;">${escapeHtml(rate.serviceType)}</td>
                    <td style="padding:16px 20px;"><code>${escapeHtml(rate.serviceId)}</code></td>
                    <td style="padding:16px 20px;">${priceDisplayHtml}</td>
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
        document.getElementById('smmStartTime').value = rate.serviceDetails?.startTime || '';
        document.getElementById('smmRefillGuarantee').value = rate.serviceDetails?.refillGuarantee || '';
        document.getElementById('smmSpeed').value = rate.serviceDetails?.speed || '';
        document.getElementById('smmDescription').value = rate.serviceDetails?.description || '';
        
        window.currentSmmVariants = rate.pricingVariants ? JSON.parse(JSON.stringify(rate.pricingVariants)) : [];
        if (window.currentSmmVariants.length === 0 && rate.ratePer1000) {
            // Legacy mapping
            window.currentSmmVariants.push({
                country: Array.isArray(rate.targetCountries) && rate.targetCountries.length > 0 ? rate.targetCountries[0] : 'Global',
                speed: rate.serviceDetails?.speed || 'Instant',
                refillGuarantee: rate.serviceDetails?.refillGuarantee || 'No Refill',
                price: rate.ratePer1000
            });
        }
        window.renderSmmVariants();

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
    document.getElementById('smmStartTime').value = '';
    document.getElementById('smmRefillGuarantee').value = '';
    document.getElementById('smmSpeed').value = '';
    document.getElementById('smmDescription').value = '';
    window.currentSmmVariants = [];
    window.renderSmmVariants();
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
    const startTime = document.getElementById('smmStartTime').value.trim();
    const refillGuarantee = document.getElementById('smmRefillGuarantee').value.trim();
    const speed = document.getElementById('smmSpeed').value.trim();
    const description = document.getElementById('smmDescription').value.trim();

    if (!platform || !serviceType || window.currentSmmVariants.length === 0) {
        alert('⚠️ Platform, service type, and at least one pricing variant are required.');
        return;
    }

    // Validate variants
    for (const v of window.currentSmmVariants) {
        if (!v.quality || !v.quality.trim()) {
            v.quality = 'Standard';
        }
        if (!v.country || !v.speed || !v.refillGuarantee || v.price === '' || isNaN(v.price) || Number(v.price) <= 0) {
            alert('⚠️ All variant fields (country, speed, refill, valid price) must be filled correctly.');
            return;
        }
        v.price = Number(v.price);
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

    const payload = { 
        serviceId, 
        platform, 
        serviceType, 
        pricingVariants: window.currentSmmVariants,
        serviceDetails: {
            startTime,
            refillGuarantee,
            speed,
            description
        }
    };

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

// Bindings to window for global access (required by inline HTML event handlers)
window.fetchAdminSmmRates = fetchAdminSmmRates;
window.editSmmRate = editSmmRate;
window.resetSmmForm = resetSmmForm;
window.saveSmmRate = saveSmmRate;
window.deleteSmmRate = deleteSmmRate;
