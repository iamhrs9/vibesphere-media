// public/admin/sections/legal-management-section.js

window.legalPagesState = {
    currentTab: 'refund',
    pages: {
        refund: '',
        terms: '',
        privacy: ''
    }
};

window.initLegalPagesSection = function() {
    const container = document.getElementById('legal-pages-section');
    if (!container || container.dataset.moduleMounted) {
        if (typeof window.fetchLegalPages === 'function') {
            window.fetchLegalPages();
        }
        return;
    }

    container.innerHTML = `
        <div class="px-6 py-6 max-w-7xl mx-auto">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Legal Pages CMS</h2>
                    <p class="text-sm text-gray-500 mt-1">Manage the content for your Refund Policy, Terms & Conditions, and Privacy Policy.</p>
                </div>
                <button type="button" onclick="window.fetchLegalPages()" class="px-4 py-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    Refresh
                </button>
            </div>

            <!-- Tabs -->
            <div class="flex space-x-2 mb-6 bg-gray-100/50 p-1.5 rounded-xl border border-gray-100 inline-flex">
                <button class="workspace-action-btn px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-md transition-all" data-tab="refund" onclick="window.switchLegalTab('refund')">Refund Policy</button>
                <button class="workspace-action-btn px-5 py-2.5 bg-transparent text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200/50 transition-all" data-tab="terms" onclick="window.switchLegalTab('terms')">Terms & Conditions</button>
                <button class="workspace-action-btn px-5 py-2.5 bg-transparent text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200/50 transition-all" data-tab="privacy" onclick="window.switchLegalTab('privacy')">Privacy Policy</button>
            </div>

            <!-- Editor Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h3 id="legalEditorTitle" class="text-lg font-bold text-gray-800">Refund Policy Editor</h3>
                        <p class="text-sm text-gray-500 mt-1">Use standard HTML formatting tags (&lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, etc.) to style this page.</p>
                    </div>
                    <div id="legalManagementStatus" class="text-sm text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-full border border-blue-100">Ready.</div>
                </div>

                <div class="p-6">
                    <textarea id="legalPageContent" class="w-full min-h-[500px] p-5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-700 font-mono leading-relaxed shadow-inner resize-y" placeholder="Loading content..."></textarea>
                    
                    <div class="flex items-center justify-end mt-6 pt-6 border-t border-gray-100">
                        <button type="button" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2" id="legalSaveBtn" onclick="window.saveLegalPage()">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('legalPageContent').addEventListener('input', () => {
        const status = document.getElementById('legalManagementStatus');
        if (status && window.legalPagesState.loaded && !window.legalPagesState.saving) {
            status.textContent = 'Unsaved changes';
            status.dataset.tone = 'warning';
        }
    });

    container.dataset.moduleMounted = "true";
    window.fetchLegalPages();
};

window.switchLegalTab = function(tabName) {
    const contentArea = document.getElementById('legalPageContent');
    const tabs = document.querySelectorAll('#legal-pages-section .workspace-action-btn');
    const title = document.getElementById('legalEditorTitle');
    const status = document.getElementById('legalManagementStatus');

    if (contentArea) {
        window.legalPagesState.pages[window.legalPagesState.currentTab] = contentArea.value;
    }

    window.legalPagesState.currentTab = tabName;

    if (tabs) {
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.className = "workspace-action-btn px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-md transition-all";
            } else {
                tab.className = "workspace-action-btn px-5 py-2.5 bg-transparent text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200/50 transition-all";
            }
        });
    }

    if (title) {
        const titles = {
            refund: 'Refund Policy Editor',
            terms: 'Terms & Conditions Editor',
            privacy: 'Privacy Policy Editor'
        };
        title.textContent = titles[tabName] || 'Editor';
    }

    if (contentArea) {
        contentArea.value = window.legalPagesState.pages[tabName] || '';
    }
    
    if (status) {
        status.textContent = `Viewing ${tabName} policy.`;
        status.dataset.tone = 'info';
    }
};

window.fetchLegalPages = async function() {
    const status = document.getElementById('legalManagementStatus');
    if (status) {
        status.textContent = window.legalPagesState.loaded ? 'Refreshing content...' : 'Loading legal pages...';
        status.dataset.tone = 'info';
    }

    try {
        const slugs = ['refund', 'terms', 'privacy'];
        for (const slug of slugs) {
            const res = await fetch(`/api/legal/${slug}`);
            const data = await res.json();
            if (data.success) {
                window.legalPagesState.pages[slug] = data.content || '';
            }
        }

        window.legalPagesState.loaded = true;
        window.switchLegalTab(window.legalPagesState.currentTab);
        
        if (status) {
            status.textContent = 'Content loaded successfully.';
            status.dataset.tone = 'success';
        }
    } catch (error) {
        if (status) {
            status.textContent = 'Failed to load legal pages.';
            status.dataset.tone = 'error';
        }
        if (typeof showToast === 'function') {
            showToast('Failed to load legal pages.', 'error');
        }
    }
};

window.saveLegalPage = async function() {
    const contentArea = document.getElementById('legalPageContent');
    const status = document.getElementById('legalManagementStatus');
    const saveBtn = document.getElementById('legalSaveBtn');
    if (!contentArea) return;

    const content = contentArea.value || '';
    const slug = window.legalPagesState.currentTab;

    window.legalPagesState.saving = true;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';
    }
    if (status) {
        status.textContent = `Saving ${slug} policy...`;
        status.dataset.tone = 'info';
    }

    try {
        const res = await fetch(`/api/admin/legal/${slug}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        
        if (!res.ok || !data.success) {
            throw new Error(data.error || data.message || 'Failed to save page.');
        }

        window.legalPagesState.pages[slug] = content;
        if (status) {
            status.textContent = `${slug} policy saved successfully.`;
            status.dataset.tone = 'success';
        }
        if (typeof showToast === 'function') {
            showToast(`${slug} policy saved successfully.`, 'success');
        }
    } catch (error) {
        if (status) {
            status.textContent = error.message || 'Failed to save page.';
            status.dataset.tone = 'error';
        }
        if (typeof showToast === 'function') {
            showToast(error.message || 'Failed to save page.', 'error');
        }
    } finally {
        window.legalPagesState.saving = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ri-save-line"></i> Save Changes';
        }
    }
};

