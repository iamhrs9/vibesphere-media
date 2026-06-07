window.mountWhatsAppControlSection = function() {
    const container = document.getElementById('whatsapp-control-section');
    if (!container) return;

    container.innerHTML = `
        <div class="section-header" style="margin-bottom:20px;">
            <h2 class="section-title">WhatsApp Control System</h2>
            <p class="section-subtitle">Manage engine status, link devices, and route notifications.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom:20px;">
            <!-- API Gateway Status Card -->
            <div class="toolbar-card" style="padding: 24px; text-align: center;">
                <h3 style="margin-bottom: 15px; font-size: 1.1rem; color: var(--text);">OpenWA API Gateway</h3>
                <div id="wa-status-badge" style="font-size: 1.5rem; font-weight: 800; margin-bottom: 20px; color: #64748b;">Loading...</div>
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 10px;">
                    <button onclick="toggleWhatsApp(true)" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Enable API</button>
                    <button onclick="toggleWhatsApp(false)" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Disable API</button>
                </div>
                <p style="font-size: 0.85rem; color: #64748b; margin-top: 10px;">Note: Session connections and QR code scanning must now be done directly on your <a href="https://harshh.in" target="_blank" style="color:var(--primary); font-weight:600;">VibeWA Dashboard</a>.</p>
            </div>

            <!-- Group Sync Card -->
            <div class="toolbar-card" style="padding: 24px;">
                <h3 style="margin-bottom: 15px; font-size: 1.1rem; color: var(--text);">Group Synchronization</h3>
                <p style="font-size: 0.9rem; color: var(--muted); margin-bottom: 20px;">Sync groups via OpenWA is currently under development (Phase 4). Custom numbers can still be configured below.</p>
                <button disabled style="background: #cbd5e1; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: not-allowed; display: flex; align-items: center; gap: 8px;">
                    <i class="ri-refresh-line"></i> Sync Groups Now
                </button>
            </div>
        </div>

        <!-- Tabs Navigation -->
        <div style="display: flex; gap: 15px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <button id="tab-btn-groups" onclick="switchWaTab('groups')" style="background: none; border: none; font-size: 1.05rem; font-weight: 600; color: var(--primary); cursor: pointer; padding: 5px 10px; border-bottom: 3px solid var(--primary);">Groups</button>
            <button id="tab-btn-contacts" onclick="switchWaTab('contacts')" style="background: none; border: none; font-size: 1.05rem; font-weight: 600; color: #64748b; cursor: pointer; padding: 5px 10px; border-bottom: 3px solid transparent;">Custom Numbers</button>
        </div>

        <!-- Groups Tab Content -->
        <div id="wa-tab-groups" style="display: block;">
            <div class="table-responsive">
                <h3 style="padding: 16px 20px; border-bottom: 1px solid rgba(226, 232, 240, 0.88); margin: 0; font-size: 1.05rem;">WhatsApp Group Notification Routing</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 0.85rem; color: #64748b;">
                            <th style="padding: 12px 20px;">Group Name</th>
                            <th style="padding: 12px 20px;">Group JID</th>
                            <th style="padding: 12px 20px;">Notification Preferences</th>
                            <th style="padding: 12px 20px;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="wa-groups-table">
                        <tr><td colspan="4" style="text-align: center; padding: 20px;">Loading groups...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Custom Contacts Tab Content -->
        <div id="wa-tab-contacts" style="display: none;">
            <div class="toolbar-card" style="padding: 24px; margin-bottom: 20px;">
                <h3 style="margin-bottom: 15px; font-size: 1.1rem; color: var(--text);">Add Custom Mobile Number</h3>
                <p style="font-size: 0.9rem; color: var(--muted); margin-bottom: 20px;">Route specific alerts directly to a personal number (e.g., 919876543210).</p>
                <div style="display: flex; gap: 15px; align-items: flex-end;">
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 5px;">Name</label>
                        <input type="text" id="wa-contact-name" placeholder="e.g. Founder" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 5px;">Phone Number (with Country Code)</label>
                        <input type="text" id="wa-contact-number" placeholder="e.g. 918302485826" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px;">
                    </div>
                    <button onclick="addWhatsAppContact()" style="background: var(--primary); color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Add Number</button>
                </div>
            </div>

            <div class="table-responsive">
                <h3 style="padding: 16px 20px; border-bottom: 1px solid rgba(226, 232, 240, 0.88); margin: 0; font-size: 1.05rem;">Custom Numbers Routing</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 0.85rem; color: #64748b;">
                            <th style="padding: 12px 20px;">Name</th>
                            <th style="padding: 12px 20px;">Phone Number</th>
                            <th style="padding: 12px 20px;">Notification Preferences</th>
                            <th style="padding: 12px 20px;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="wa-contacts-table">
                        <tr><td colspan="4" style="text-align: center; padding: 20px;">Loading contacts...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    window.switchWaTab = function(tabName) {
        document.getElementById('wa-tab-groups').style.display = (tabName === 'groups') ? 'block' : 'none';
        document.getElementById('wa-tab-contacts').style.display = (tabName === 'contacts') ? 'block' : 'none';
        
        document.getElementById('tab-btn-groups').style.color = (tabName === 'groups') ? 'var(--primary)' : '#64748b';
        document.getElementById('tab-btn-groups').style.borderBottomColor = (tabName === 'groups') ? 'var(--primary)' : 'transparent';
        
        document.getElementById('tab-btn-contacts').style.color = (tabName === 'contacts') ? 'var(--primary)' : '#64748b';
        document.getElementById('tab-btn-contacts').style.borderBottomColor = (tabName === 'contacts') ? 'var(--primary)' : 'transparent';
    };

    window.fetchWhatsAppStatus = async function() {
        try {
            const res = await fetch('/api/admin/whatsapp/status', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
            });
            const data = await res.json();
            
            const badge = document.getElementById('wa-status-badge');

            if (data.isWhatsAppEnabled) {
                if (data.isConnected) {
                    badge.innerHTML = '🟢 API Connected';
                    badge.style.color = '#10b981';
                } else {
                    badge.innerHTML = '🟡 Session Not Active';
                    badge.style.color = '#eab308';
                }
            } else {
                badge.innerHTML = '🔴 API Disabled';
                badge.style.color = '#ef4444';
            }

            fetchWhatsAppGroups();
            fetchWhatsAppContacts();
            
        } catch (e) {
            console.error("Status fetch error", e);
        }
    };

    window.toggleWhatsApp = async function(isEnabled) {
        if (!confirm(`Are you sure you want to turn WhatsApp Engine ${isEnabled ? 'ON' : 'OFF'}?`)) return;
        try {
            const res = await fetch('/api/admin/whatsapp/toggle', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken') 
                },
                body: JSON.stringify({ isEnabled })
            });
            const data = await res.json();
            if (data.success) {
                alert(`WhatsApp Engine turned ${isEnabled ? 'ON' : 'OFF'}`);
                fetchWhatsAppStatus();
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Network error.");
        }
    };

    window.syncWhatsAppGroups = async function() {
        try {
            const res = await fetch('/api/admin/whatsapp/sync-groups', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
            });
            const data = await res.json();
            if (data.success) {
                alert("Groups synced successfully!");
                fetchWhatsAppGroups();
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Network error. Ensure engine is ON and connected.");
        }
    };

    window.fetchWhatsAppGroups = async function() {
        try {
            const res = await fetch('/api/admin/whatsapp/groups', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
            });
            const data = await res.json();
            if (data.success) {
                const tbody = document.getElementById('wa-groups-table');
                tbody.innerHTML = '';
                
                if (data.groups.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No groups synced yet.</td></tr>';
                    return;
                }

                data.groups.forEach(group => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #e2e8f0';
                    
                    const prefs = group.notificationPreferences || [];
                    const isChecked = (val) => prefs.includes(val) ? 'checked' : '';

                    tr.innerHTML = `
                        <td style="padding: 12px 20px; font-weight: 600;">${group.groupName}</td>
                        <td style="padding: 12px 20px; font-size: 0.8rem; color: var(--muted);">${group.groupId}</td>
                        <td style="padding: 12px 20px;">
                            <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:0.85rem;" id="prefs-${group._id}">
                                <label><input type="checkbox" value="NEW_LEAD" ${isChecked('NEW_LEAD')}> New Leads</label>
                                <label><input type="checkbox" value="ORDER_CREATED" ${isChecked('ORDER_CREATED')}> Orders</label>
                                <label><input type="checkbox" value="DAILY_ATTENDANCE" ${isChecked('DAILY_ATTENDANCE')}> Attendance</label>
                                <label><input type="checkbox" value="SYSTEM_ALERTS" ${isChecked('SYSTEM_ALERTS')}> Alerts</label>
                            </div>
                        </td>
                        <td style="padding: 12px 20px;">
                            <button onclick="saveGroupPreferences('${group._id}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Save</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch (e) {}
    };

    window.fetchWhatsAppContacts = async function() {
        try {
            const res = await fetch('/api/admin/whatsapp/contacts', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
            });
            const data = await res.json();
            if (data.success) {
                const tbody = document.getElementById('wa-contacts-table');
                tbody.innerHTML = '';
                
                if (data.contacts.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No custom numbers added yet.</td></tr>';
                    return;
                }

                data.contacts.forEach(contact => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #e2e8f0';
                    
                    const prefs = contact.notificationPreferences || [];
                    const isChecked = (val) => prefs.includes(val) ? 'checked' : '';

                    tr.innerHTML = `
                        <td style="padding: 12px 20px; font-weight: 600;">${contact.name}</td>
                        <td style="padding: 12px 20px; font-size: 0.9rem;">${contact.phoneNumber}</td>
                        <td style="padding: 12px 20px;">
                            <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:0.85rem;" id="contact-prefs-${contact._id}">
                                <label><input type="checkbox" value="NEW_LEAD" ${isChecked('NEW_LEAD')}> New Leads</label>
                                <label><input type="checkbox" value="ORDER_CREATED" ${isChecked('ORDER_CREATED')}> Orders</label>
                                <label><input type="checkbox" value="DAILY_ATTENDANCE" ${isChecked('DAILY_ATTENDANCE')}> Attendance</label>
                                <label><input type="checkbox" value="SYSTEM_ALERTS" ${isChecked('SYSTEM_ALERTS')}> Alerts</label>
                            </div>
                        </td>
                        <td style="padding: 12px 20px;">
                            <button onclick="saveContactPreferences('${contact._id}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-right: 5px;">Save</button>
                            <button onclick="deleteWhatsAppContact('${contact._id}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Delete</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch (e) {}
    };

    window.addWhatsAppContact = async function() {
        const name = document.getElementById('wa-contact-name').value;
        const phoneNumber = document.getElementById('wa-contact-number').value;

        if (!name || !phoneNumber) return alert("Please fill both Name and Phone Number");

        try {
            const res = await fetch('/api/admin/whatsapp/contacts', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken') 
                },
                body: JSON.stringify({ name, phoneNumber })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('wa-contact-name').value = '';
                document.getElementById('wa-contact-number').value = '';
                fetchWhatsAppContacts();
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) { alert("Network error"); }
    };

    window.saveContactPreferences = async function(id) {
        const container = document.getElementById(`contact-prefs-${id}`);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

        try {
            const res = await fetch(`/api/admin/whatsapp/contacts/${id}/preferences`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken') 
                },
                body: JSON.stringify({ notificationPreferences: selected })
            });
            const data = await res.json();
            if (data.success) {
                alert("Contact preferences saved!");
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) { alert("Network error"); }
    };

    window.deleteWhatsAppContact = async function(id) {
        if (!confirm("Are you sure you want to delete this custom number?")) return;
        try {
            const res = await fetch(`/api/admin/whatsapp/contacts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
            });
            if (res.ok) {
                fetchWhatsAppContacts();
            }
        } catch (e) { alert("Network error"); }
    };

    // Auto refresh status when section is open
    setInterval(() => {
        if (document.getElementById('whatsapp-control-section') && document.getElementById('whatsapp-control-section').classList.contains('active')) {
            fetchWhatsAppStatus();
        }
    }, 5000);
};
