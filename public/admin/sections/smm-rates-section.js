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
                                <select id="smmPlatform" onchange="handlePlatformDropdownChange(this)" style="width:100%;padding:11px 14px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;color:#1e293b;font-weight:600;outline:none;transition:0.2s;">
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

                <!-- Premium Modal Overlay for Adding Dynamic SMM Platform -->
                <div id="addPlatformModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:9999; align-items:center; justify-content:center;">
                    <div style="background:#ffffff; border-radius:20px; width:100%; max-width:480px; padding:32px; box-shadow:0 20px 40px rgba(0,0,0,0.15); border:1px solid rgba(148,163,184,0.12); position:relative; margin: 20px; animation: modalFadeIn 0.3s ease;">
                        <h3 style="margin-top:0; margin-bottom:8px; font-size:1.3rem; color:#1e293b; font-weight:800; display:flex; align-items:center; gap:8px;">➕ Add New SMM Platform</h3>
                        <p style="margin:0 0 20px 0; color:#64748b; font-size:0.85rem;">Create a custom platform by entering its name and uploading its logo.</p>
                        
                        <div style="margin-bottom:16px;">
                            <label style="display:block; margin-bottom:6px; font-size:0.8rem; font-weight:700; color:#475569;">Platform Name *</label>
                            <input type="text" id="newPlatformName" placeholder="e.g. Spotify, LinkedIn" style="width:100%; padding:11px 14px; border:1px solid #cbd5e1; border-radius:10px; color:#1e293b; font-weight:600; outline:none; transition:0.2s;">
                        </div>
                        
                        <div style="margin-bottom:24px;">
                            <label style="display:block; margin-bottom:6px; font-size:0.8rem; font-weight:700; color:#475569;">Platform Logo *</label>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div id="newPlatformLogoPreview" style="width:48px; height:48px; border-radius:10px; background:#f1f5f9; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:1.2rem; color:#64748b;">
                                    🌐
                                </div>
                                <div style="flex-grow:1;">
                                    <input type="file" id="newPlatformLogoFile" accept="image/*" style="display:none;" onchange="handleNewPlatformLogoUpload(event)">
                                    <button type="button" onclick="document.getElementById('newPlatformLogoFile').click()" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer; font-size:0.8rem; transition:0.2s;">📁 Choose Image</button>
                                    <span id="newPlatformUploadStatus" style="font-size:0.75rem; color:#64748b; margin-left:8px; display:inline-block; vertical-align:middle;"></span>
                                </div>
                            </div>
                            <input type="hidden" id="newPlatformLogoUrl">
                        </div>
                        
                        <div style="display:flex; justify-content:flex-end; gap:12px;">
                            <button type="button" onclick="closeAddPlatformModal()" style="background:#f1f5f9; color:#475569; border:none; padding:10px 20px; border-radius:10px; font-weight:700; cursor:pointer; font-size:0.85rem;">Cancel</button>
                            <button type="button" id="submitNewPlatformBtn" onclick="submitNewPlatform()" style="background:#6c63ff; color:#fff; border:none; padding:10px 20px; border-radius:10px; font-weight:700; cursor:pointer; font-size:0.85rem; display:inline-flex; align-items:center; gap:8px;">Add Platform</button>
                        </div>
                    </div>

                    <!-- Premium Modal Overlay for Managing Platforms -->
                    <div id="managePlatformsModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:9998; align-items:center; justify-content:center;">
                        <div style="background:#ffffff; border-radius:20px; width:100%; max-width:600px; padding:32px; box-shadow:0 20px 40px rgba(0,0,0,0.15); border:1px solid rgba(148,163,184,0.12); position:relative; margin: 20px; display:flex; flex-direction:column; max-height:85vh; animation: modalFadeIn 0.3s ease;">
                            <h3 style="margin-top:0; margin-bottom:8px; font-size:1.3rem; color:#1e293b; font-weight:800; display:flex; align-items:center; gap:8px;">⚙️ Manage SMM Platforms</h3>
                            <p style="margin:0 0 20px 0; color:#64748b; font-size:0.85rem;">View, edit, or delete the platform branding parameters in the system database.</p>
                            
                            <div style="overflow-y:auto; flex-grow:1; margin-bottom:20px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc; padding:8px;">
                                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem;">
                                    <thead>
                                        <tr style="border-bottom:2px solid #e2e8f0; color:#475569; font-weight:700;">
                                            <th style="padding:10px 14px; width:64px;">Logo</th>
                                            <th style="padding:10px 14px;">Platform Name</th>
                                            <th style="padding:10px 14px; text-align:right;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="managePlatformsTableBody">
                                        <!-- Dynamically loaded rows -->
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style="display:flex; justify-content:flex-end;">
                                <button type="button" onclick="closeManagePlatformsModal()" style="background:#f1f5f9; color:#475569; border:none; padding:10px 20px; border-radius:10px; font-weight:700; cursor:pointer; font-size:0.85rem;">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                </style>
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
        window.populateSmmPlatforms();
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

    let previousPlatformValue = 'Instagram';
    let editingPlatformId = null;

    window.populateSmmPlatforms = async function (selectedVal) {
        const selectEl = document.getElementById('smmPlatform');
        if (!selectEl) return;

        const currentVal = selectedVal || selectEl.value || previousPlatformValue || 'Instagram';

        let platforms = [];
        try {
            const res = await fetch('/api/platforms');
            const data = await res.json();
            if (data.success && data.platforms) {
                platforms = data.platforms;
            }
        } catch (e) {
            console.error('Failed to load platforms from API, falling back to local storage cache.', e);
        }

        // Standard default list fallback if API failed or returned empty
        if (platforms.length === 0) {
            const defaultPlatforms = ["Instagram", "YouTube", "Facebook", "Twitter", "TikTok", "Telegram"];
            platforms = defaultPlatforms.map(p => ({
                name: p,
                logoUrl: p === "Instagram" ? "https://img.icons8.com/color/96/instagram-new.png" :
                         p === "YouTube" ? "https://img.icons8.com/color/96/youtube-play.png" :
                         p === "Facebook" ? "https://img.icons8.com/color/96/facebook-new.png" :
                         p === "Twitter" ? "https://img.icons8.com/color/96/twitter--v1.png" :
                         p === "TikTok" ? "https://img.icons8.com/color/96/tiktok.png" :
                         "https://img.icons8.com/color/96/telegram-app.png"
            }));
        }

        // Map options
        let optionsHtml = platforms.map(plat => {
            return `<option value="${escapeHtml(plat.name)}">${escapeHtml(plat.name)}</option>`;
        }).join('');

        // Add special options at the bottom
        optionsHtml += `<option value="manage_platforms" style="font-weight:700;color:#e11d48;">⚙️ Manage Platforms...</option>`;
        optionsHtml += `<option value="add_new" class="add-new-opt" style="font-weight:700;color:#6c63ff;">➕ Add New Platform...</option>`;

        selectEl.innerHTML = optionsHtml;

        // Set value
        const platformNames = platforms.map(p => p.name);
        if (platformNames.includes(currentVal)) {
            selectEl.value = currentVal;
            previousPlatformValue = currentVal;
        } else {
            selectEl.value = platformNames[0] || 'Instagram';
            previousPlatformValue = selectEl.value;
        }
    };

    window.handlePlatformDropdownChange = function (select) {
        if (select.value === 'manage_platforms') {
            window.openManagePlatformsModal();
            select.value = previousPlatformValue || 'Instagram';
        } else if (select.value === 'add_new') {
            window.openAddPlatformModal();
            select.value = previousPlatformValue || 'Instagram';
        } else {
            previousPlatformValue = select.value;
        }
    };

    window.openAddPlatformModal = function (editId, name, logoUrl) {
        const modal = document.getElementById('addPlatformModal');
        if (!modal) return;
        
        editingPlatformId = editId || null;
        
        const titleEl = modal.querySelector('h3');
        const submitBtn = document.getElementById('submitNewPlatformBtn');
        const nameInput = document.getElementById('newPlatformName');
        const previewEl = document.getElementById('newPlatformLogoPreview');
        const urlInput = document.getElementById('newPlatformLogoUrl');
        const statusEl = document.getElementById('newPlatformUploadStatus');
        
        if (editingPlatformId) {
            titleEl.textContent = '✏️ Edit SMM Platform';
            submitBtn.textContent = 'Save Changes';
            nameInput.value = name || '';
            urlInput.value = logoUrl || '';
            previewEl.innerHTML = logoUrl ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : '🌐';
            statusEl.textContent = '';
        } else {
            titleEl.textContent = '➕ Add New SMM Platform';
            submitBtn.textContent = 'Add Platform';
            nameInput.value = '';
            urlInput.value = '';
            previewEl.innerHTML = '🌐';
            statusEl.textContent = '';
        }
        
        modal.style.display = 'flex';
    };

    window.closeAddPlatformModal = function () {
        const modal = document.getElementById('addPlatformModal');
        if (modal) {
            modal.style.display = 'none';
        }
        editingPlatformId = null;
    };

    window.handleNewPlatformLogoUpload = async function (event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            alert('⚠️ Image size must be less than 5MB!');
            return;
        }
        
        const statusEl = document.getElementById('newPlatformUploadStatus');
        const previewEl = document.getElementById('newPlatformLogoPreview');
        const urlInput = document.getElementById('newPlatformLogoUrl');
        
        statusEl.textContent = '⏳ Uploading...';
        statusEl.style.color = '#4f46e5';
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch('/api/chat/upload?cloudinary=true', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            const data = await res.json();
            if (data.success && data.fileUrl) {
                urlInput.value = data.fileUrl;
                previewEl.innerHTML = `<img src="${data.fileUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
                statusEl.textContent = '✅ Uploaded!';
                statusEl.style.color = '#10b981';
            } else {
                throw new Error(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error('Platform logo upload failed:', err);
            statusEl.textContent = '❌ Upload failed';
            statusEl.style.color = '#ef4444';
            alert('⚠️ Upload failed: ' + err.message);
        }
    };

    window.submitNewPlatform = async function () {
        const nameInput = document.getElementById('newPlatformName');
        const logoUrlInput = document.getElementById('newPlatformLogoUrl');
        
        const name = nameInput.value.trim();
        let logoUrl = logoUrlInput.value.trim();
        
        if (!name) {
            alert('⚠️ Please enter a Platform Name.');
            return;
        }
        
        if (!logoUrl) {
            logoUrl = '/assets/images/default-platform.png';
        }
        
        try {
            const url = editingPlatformId ? `/api/platforms/${editingPlatformId}` : '/api/platforms';
            const method = editingPlatformId ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, logoUrl }),
                credentials: 'include'
            });
            
            const data = await res.json();
            if (data.success) {
                alert(editingPlatformId ? '✅ Platform updated successfully!' : '✅ Platform added successfully!');
                
                // Keep frontend localStorage custom_platform_logos map synchronized for SMM calculator page fallback
                const storedLogos = JSON.parse(localStorage.getItem('custom_platform_logos') || '{}');
                storedLogos[name.toLowerCase()] = logoUrl;
                localStorage.setItem('custom_platform_logos', JSON.stringify(storedLogos));
                
                // Re-populate and auto-select
                await window.populateSmmPlatforms(name);
                
                // Close forms
                window.closeAddPlatformModal();
                
                // If manage modal is active, reload its table
                const manageModal = document.getElementById('managePlatformsModal');
                if (manageModal && manageModal.style.display === 'flex') {
                    window.renderManagePlatformsList();
                }
            } else {
                alert('⚠️ Error: ' + (data.error || 'Failed to save platform'));
            }
        } catch (e) {
            console.error(e);
            alert('⚠️ Server Error while saving platform.');
        }
    };

    window.openManagePlatformsModal = function () {
        const modal = document.getElementById('managePlatformsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        window.renderManagePlatformsList();
    };

    window.closeManagePlatformsModal = function () {
        const modal = document.getElementById('managePlatformsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    window.renderManagePlatformsList = async function () {
        const tbody = document.getElementById('managePlatformsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:#64748b;">Loading platforms...</td></tr>';
        
        try {
            const res = await fetch('/api/platforms');
            const data = await res.json();
            if (!data.success || !data.platforms || !data.platforms.length) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:#64748b;">No platforms found. Add one above.</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.platforms.map(p => {
                const logo = p.logoUrl || '/assets/images/default-platform.png';
                return `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:10px 14px; width:64px;">
                            <img src="${escapeHtml(logo)}" style="width:36px; height:36px; object-fit:contain; border-radius:6px; border:1px solid #e2e8f0; display:block;" onerror="this.onerror=null; this.src='/assets/images/default-platform.png';">
                        </td>
                        <td style="padding:10px 14px; font-weight:600; color:#1e293b;">
                            ${escapeHtml(p.name)}
                        </td>
                        <td style="padding:10px 14px; text-align:right;">
                            <div style="display:flex; gap:8px; justify-content:flex-end;">
                                <button type="button" onclick="window.editPlatform('${p._id}', '${escapeHtml(p.name)}', '${escapeHtml(p.logoUrl)}')" style="background:#4f46e5; color:#fff; border:none; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer;">✏️ Edit</button>
                                <button type="button" onclick="window.deletePlatform('${p._id}', '${escapeHtml(p.name)}')" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer;">🗑️ Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:#ef4444;">Failed to load SMM platforms.</td></tr>';
        }
    };

    window.editPlatform = function (id, name, logoUrl) {
        window.openAddPlatformModal(id, name, logoUrl);
    };

    window.deletePlatform = async function (id, name) {
        if (!confirm(`⚠️ Are you sure you want to delete platform "${name}"?\nThis will remove the platform logo and branding entry. Service rates belonging to this platform will remain in the database.`)) {
            return;
        }
        
        try {
            const res = await fetch(`/api/platforms/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Platform deleted successfully!');
                
                // Keep custom_platform_logos map clean
                const storedLogos = JSON.parse(localStorage.getItem('custom_platform_logos') || '{}');
                delete storedLogos[name.toLowerCase()];
                localStorage.setItem('custom_platform_logos', JSON.stringify(storedLogos));
                
                // Repopulate select and manage modal lists
                await window.populateSmmPlatforms();
                window.renderManagePlatformsList();
            } else {
                alert('⚠️ Error: ' + (data.error || 'Failed to delete platform'));
            }
        } catch (e) {
            console.error(e);
            alert('⚠️ Server Error while deleting platform.');
        }
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
            window.allSmmRates = [];
            window.populateSmmPlatforms();
            return;
        }
        window.allSmmRates = data.rates;
        window.populateSmmPlatforms();
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
