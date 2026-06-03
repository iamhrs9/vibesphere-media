window.initSiteSettingsSection = async function () {
    const section = document.getElementById('site-settings-section');
    if (!section) return;

    if (section.dataset.moduleMounted) return;
    section.dataset.moduleMounted = 'true';

    // Render initial UI
    section.innerHTML = `
        <div class="h-full w-full flex flex-col p-6 animate-fade-in" style="background: #f8fafc; font-family: 'Outfit', sans-serif;">
            
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h2 class="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <i class="ri-settings-4-fill text-indigo-600"></i> Site Settings
                    </h2>
                    <p class="text-slate-500 mt-1 text-sm font-medium">Manage global compliance modes and feature flags.</p>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl">
                <div class="p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-bold text-slate-800">SMM Packages Visibility (Gateway Mode)</h3>
                            <p class="text-slate-500 text-sm mt-1">If turned off, all SMM related packages and "Boost Socials" buttons will be hidden from the frontend to pass payment gateway compliance audits.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer ml-4">
                            <input type="checkbox" id="smmToggle" class="sr-only peer">
                            <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>
            </div>
            
            <div id="settingsLoading" class="mt-8 text-center hidden">
                <i class="ri-loader-4-line text-3xl animate-spin text-indigo-500"></i>
                <p class="text-slate-500 mt-2">Saving configuration...</p>
            </div>
            
        </div>
    `;

    const toggle = document.getElementById('smmToggle');
    const loader = document.getElementById('settingsLoading');

    // Fetch initial state
    try {
        const res = await fetch('/api/site-settings/compliance');
        const data = await res.json();
        if (data.success) {
            toggle.checked = data.isSmmEnabled;
        }
    } catch (e) {
        console.error('Failed to load compliance settings', e);
        if (window.VibeUI) VibeUI.showToast('Failed to load settings');
    }

    // Handle toggle
    toggle.addEventListener('change', async (e) => {
        const isEnabled = e.target.checked;
        loader.classList.remove('hidden');
        
        try {
            const res = await fetch('/api/admin/site-settings/compliance', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSmmEnabled: isEnabled })
            });
            const data = await res.json();
            
            if (data.success) {
                if (window.VibeUI) VibeUI.showToast('✅ Compliance settings updated successfully');
            } else {
                e.target.checked = !isEnabled; // revert
                if (window.VibeUI) VibeUI.showToast('❌ Failed to update settings: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating compliance settings', error);
            e.target.checked = !isEnabled; // revert
            if (window.VibeUI) VibeUI.showToast('❌ Failed to connect to server');
        } finally {
            loader.classList.add('hidden');
        }
    });
};
