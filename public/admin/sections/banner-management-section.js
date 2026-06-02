(function () {
    const state = {
        mounted: false,
        loaded: false,
        saving: false
    };

    const SECTION_HTML = {
        'banner-management-section': `
            <div id="banner-management-section" class="section" data-module-mounted="true">
                <div class="premium-section">
                    <div class="banner-shell">
                        <div class="banner-hero">
                            <div>
                                <span class="banner-kicker"><i class="ri-megaphone-line"></i> Site-wide announcements</span>
                                <h2 class="section-title" style="margin-top:14px;">Banner Management</h2>
                                <p class="section-subtitle" style="margin-top:6px; max-width: 860px;">
                                    Control the global homepage banner and the SMM-only banner without redeploying the site.
                                </p>
                            </div>
                            <button type="button" class="section-refresh-btn" onclick="fetchBannerSettings()">
                                <i class="ri-refresh-line"></i> Refresh
                            </button>
                        </div>

                        <div class="banner-grid">
                            <section class="banner-card">
                                <div class="banner-card__header">
                                    <div>
                                        <h3>Global Banner</h3>
                                        <p>Shown on every page except the SMM section when enabled.</p>
                                    </div>
                                    <span class="banner-chip">Global</span>
                                </div>

                                <div class="banner-field">
                                    <label for="normalBannerText">Global Banner Text</label>
                                    <textarea id="normalBannerText" class="banner-input banner-textarea" rows="4" placeholder="Enter each announcement on a new line"></textarea>
                                    <span class="banner-field-help">Enter each announcement on a new line.</span>
                                </div>

                                <div class="banner-toggle-row">
                                    <div>
                                        <strong>Show Global Banner</strong>
                                        <p>Use the iOS-style toggle to publish or hide this banner.</p>
                                    </div>
                                    <label class="banner-switch" aria-label="Toggle global banner">
                                        <input id="isNormalActive" class="banner-switch-input" type="checkbox">
                                        <span class="banner-switch-track" aria-hidden="true"></span>
                                    </label>
                                </div>
                            </section>

                            <section class="banner-card">
                                <div class="banner-card__header">
                                    <div>
                                        <h3>SMM Banner</h3>
                                        <p>Shown only on URLs that include <code>/smm</code> when enabled.</p>
                                    </div>
                                    <span class="banner-chip banner-chip--accent">SMM</span>
                                </div>

                                <div class="banner-field">
                                    <label for="smmBannerText">SMM Banner Text</label>
                                    <textarea id="smmBannerText" class="banner-input banner-textarea" rows="4" placeholder="Enter each announcement on a new line"></textarea>
                                    <span class="banner-field-help">Enter each announcement on a new line.</span>
                                </div>

                                <div class="banner-toggle-row">
                                    <div>
                                        <strong>Show SMM Banner</strong>
                                        <p>Use this toggle to control SMM-only visibility.</p>
                                    </div>
                                    <label class="banner-switch" aria-label="Toggle SMM banner">
                                        <input id="isSmmActive" class="banner-switch-input" type="checkbox">
                                        <span class="banner-switch-track" aria-hidden="true"></span>
                                    </label>
                                </div>
                            </section>
                        </div>

                        <div class="banner-footer">
                            <div class="banner-status" id="bannerManagementStatus">Loading banner settings...</div>
                            <button type="button" class="banner-save-btn" id="bannerSaveBtn" onclick="saveBannerSettings()">
                                <i class="ri-save-line"></i> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    function mountSections(sectionIds) {
        sectionIds.forEach((sectionId) => {
            const target = document.getElementById(sectionId);
            const markup = SECTION_HTML[sectionId];
            if (!target || !markup || target.dataset.moduleMounted === 'true') return;
            target.outerHTML = markup;
        });
    }

    function getBannerForm() {
        return {
            normalBannerText: document.getElementById('normalBannerText'),
            isNormalActive: document.getElementById('isNormalActive'),
            smmBannerText: document.getElementById('smmBannerText'),
            isSmmActive: document.getElementById('isSmmActive'),
            status: document.getElementById('bannerManagementStatus'),
            saveBtn: document.getElementById('bannerSaveBtn')
        };
    }

    function setBannerStatus(message, tone = 'info') {
        const { status } = getBannerForm();
        if (!status) return;
        status.textContent = message || '';
        status.dataset.tone = tone;
    }

    function setSaveState(isSaving) {
        const { saveBtn } = getBannerForm();
        if (!saveBtn) return;
        saveBtn.disabled = isSaving;
        saveBtn.innerHTML = isSaving
            ? '<i class="ri-loader-4-line ri-spin"></i> Saving...'
            : '<i class="ri-save-line"></i> Save Changes';
    }

    function populateBannerForm(banners) {
        const { normalBannerText, isNormalActive, smmBannerText, isSmmActive } = getBannerForm();
        if (normalBannerText) normalBannerText.value = banners?.normalBannerText || '';
        if (isNormalActive) isNormalActive.checked = Boolean(banners?.isNormalActive);
        if (smmBannerText) smmBannerText.value = banners?.smmBannerText || '';
        if (isSmmActive) isSmmActive.checked = Boolean(banners?.isSmmActive);
    }

    async function fetchBannerSettings() {
        if (state.loaded) {
            setBannerStatus('Refreshing banner settings...');
        }

        try {
            const res = await fetch('/api/site-settings/banners', { credentials: 'include' });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to load banner settings.');
            }

            populateBannerForm(data.banners || {});
            state.loaded = true;
            setBannerStatus('Banner settings loaded successfully.', 'success');
        } catch (error) {
            setBannerStatus(error.message || 'Failed to load banner settings.', 'error');
            if (typeof showToast === 'function') {
                showToast(error.message || 'Failed to load banner settings.', 'error');
            }
        }
    }

    async function saveBannerSettings() {
        const { normalBannerText, isNormalActive, smmBannerText, isSmmActive } = getBannerForm();
        if (!normalBannerText || !isNormalActive || !smmBannerText || !isSmmActive) return;

        const payload = {
            normalBannerText: normalBannerText.value || '',
            isNormalActive: Boolean(isNormalActive.checked),
            smmBannerText: smmBannerText.value || '',
            isSmmActive: Boolean(isSmmActive.checked)
        };

        state.saving = true;
        setSaveState(true);
        setBannerStatus('Saving banner settings...');

        try {
            const res = await fetch('/api/admin/site-settings/banners', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || data.message || 'Failed to save banner settings.');
            }

            populateBannerForm(data.banners || payload);
            setBannerStatus(data.message || 'Banner settings saved successfully.', 'success');
            if (typeof showToast === 'function') {
                showToast(data.message || 'Banner settings saved successfully.', 'success');
            }
        } catch (error) {
            setBannerStatus(error.message || 'Failed to save banner settings.', 'error');
            if (typeof showToast === 'function') {
                showToast(error.message || 'Failed to save banner settings.', 'error');
            }
        } finally {
            state.saving = false;
            setSaveState(false);
        }
    }

    function bindEventsOnce() {
        if (state.mounted) return;

        document.addEventListener('input', (event) => {
            if (event.target && event.target.matches('#normalBannerText, #smmBannerText')) {
                const { status } = getBannerForm();
                if (status && state.loaded && !state.saving) {
                    status.textContent = 'Unsaved changes';
                    status.dataset.tone = 'warning';
                }
            }
        });

        document.addEventListener('change', (event) => {
            if (event.target && event.target.matches('#isNormalActive, #isSmmActive')) {
                const { status } = getBannerForm();
                if (status && state.loaded && !state.saving) {
                    status.textContent = 'Unsaved changes';
                    status.dataset.tone = 'warning';
                }
            }
        });

        state.mounted = true;
    }

    window.mountAdminBannerManagementSection = function () {
        mountSections(['banner-management-section']);
        bindEventsOnce();
    };

    window.fetchBannerSettings = fetchBannerSettings;
    window.saveBannerSettings = saveBannerSettings;
})();
