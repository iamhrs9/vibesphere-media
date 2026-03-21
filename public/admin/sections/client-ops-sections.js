(function () {
    const SECTION_HTML = {
        "helpdesk-section": "<div id=\"helpdesk-section\" class=\"section\" data-module-mounted=\"true\"><div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;\"><h2>🎧 Client Helpdesk</h2><span id=\"ticketCount\" style=\"background:#e0e7ff;color:#6c63ff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:bold;\">0 Tickets</span></div><div class=\"table-responsive\" style=\"overflow-x:auto;width:100%;\"><table><thead><tr><th>Client</th><th>Subject</th><th>Issue</th><th>Status</th><th>Reply & Action</th></tr></thead><tbody id=\"ticketsTable\"></tbody></table></div></div>",
        "staff-tickets-section": "<div id=\"staff-tickets-section\" class=\"section\" data-module-mounted=\"true\"><div class=\"premium-section\"><div class=\"section-header\"><div><h2 class=\"section-title\">Staff Internal Tickets</h2><p class=\"section-subtitle\">HR, IT, Accounts, and general support tickets raised by team members.</p></div><div class=\"section-actions\"><span style=\"color:#64748b;font-weight:700;\">Total: <span id=\"staffTicketCount\" style=\"color:#1d4ed8;\">0</span></span><button onclick=\"fetchStaffTickets()\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button></div></div><div class=\"table-responsive\" style=\"overflow-x:auto;width:100%;\"><table><thead><tr><th>Staff</th><th>Category</th><th>Subject</th><th>Issue</th><th>Status</th><th>Reply & Action</th></tr></thead><tbody id=\"staffTicketsTable\"></tbody></table></div></div></div>",
        "meetings-section": "<div id=\"meetings-section\" class=\"section\" data-module-mounted=\"true\">\n                <h2 style=\"margin-bottom:20px;\">🎬 Video Meetings</h2>\n\n                <div class=\"staff-card\" style=\"padding:20px;margin-bottom:20px;\">\n                    <h3 style=\"margin-bottom:15px;\">➕ Schedule New Meeting</h3>\n                    <div style=\"display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;\">\n                        <div style=\"flex:2;min-width:180px;\">\n                            <label style=\"font-size:12px;color:#64748b;display:block;margin-bottom:4px;\">Meeting\n                                Topic</label>\n                            <input type=\"text\" id=\"meetTopic\" placeholder=\"e.g. Weekly Team Sync\"\n                                style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;\">\n                        </div>\n                        <div style=\"flex:1;min-width:180px;\">\n                            <label style=\"font-size:12px;color:#64748b;display:block;margin-bottom:4px;\">Date &\n                                Time</label>\n                            <input type=\"datetime-local\" id=\"meetTime\"\n                                style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;\">\n                        </div>\n                        <div style=\"flex:1;min-width:150px;\">\n                            <label style=\"font-size:12px;color:#64748b;display:block;margin-bottom:4px;\">Password\n                                (Optional)</label>\n                            <input type=\"text\" id=\"meetPass\" placeholder=\"e.g. 1234\"\n                                style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;\">\n                        </div>\n                        <button onclick=\"scheduleMeeting()\" class=\"btn-publish\" style=\"padding:10px 20px;\">Schedule\n                            🎬</button>\n                    </div>\n                </div>\n\n                <div id=\"meetingsList\"\n                    style=\"display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:15px;\"></div>\n            </div>",
        "jobs-section": "<div id=\"jobs-section\" class=\"section\" data-module-mounted=\"true\">\n                <h3>💼 Manage Careers (Jobs)</h3>\n                <div class=\"staff-card\" style=\"padding: 20px; margin-bottom: 20px;\">\n                    <form id=\"addJobForm\" onsubmit=\"submitJob(event)\"\n                        style=\"display: flex; gap: 15px; flex-wrap: wrap;\">\n                        <input type=\"text\" id=\"jobTitle\" placeholder=\"Job Title (e.g. Graphic Designer)\" required\n                            style=\"flex:1; padding:10px; border:1px solid #ddd; border-radius:5px;\">\n                        <select id=\"jobType\" required\n                            style=\"flex:1; padding:10px; border:1px solid #ddd; border-radius:5px;\">\n                            <option value=\"Full-Time\">Full-Time</option>\n                            <option value=\"Part-Time\">Part-Time</option>\n                            <option value=\"Internship\">Internship</option>\n                            <option value=\"Freelance\">Freelance</option>\n                        </select>\n                        <input type=\"text\" id=\"jobLocation\" placeholder=\"Location (e.g. Remote / Jaipur)\" required\n                            style=\"flex:1; padding:10px; border:1px solid #ddd; border-radius:5px;\">\n                        <input type=\"text\" id=\"jobDesc\" placeholder=\"Short Description...\" required\n                            style=\"flex:2; padding:10px; border:1px solid #ddd; border-radius:5px;\">\n                        <button type=\"submit\" id=\"btnJob\" class=\"btn-publish\">Post Job 🚀</button>\n                    </form>\n                </div>\n                <div class=\"table-responsive\">\n                    <table>\n                        <thead>\n                            <tr>\n                                <th>Job Title</th>\n                                <th>Type & Location</th>\n                                <th>Posted On</th>\n                                <th>Action</th>\n                            </tr>\n                        </thead>\n                        <tbody id=\"jobsTableBody\"></tbody>\n                    </table>\n                </div>\n            </div>",
        "clients-section": "<div id=\"clients-section\" class=\"section\" data-module-mounted=\"true\">\n                <div class=\"premium-section\">\n                    <div class=\"section-header\">\n                        <div>\n                            <h2 class=\"section-title\">Clients</h2>\n                            <p class=\"section-subtitle\">A cleaner client directory with account state, onboarding context, and security controls.</p>\n                        </div>\n                        <div class=\"section-actions\">\n                            <div class=\"approvals-search\" style=\"min-width: 280px;\">\n                                <i class=\"ri-search-line\"></i>\n                                <input id=\"clientSearch\" type=\"text\" placeholder=\"Search by Name or Email...\" oninput=\"fetchClients()\">\n                            </div>\n                            <span style=\"color:#64748b;font-weight:700;\">Total: <span id=\"totalUsersCount\" style=\"color:#1d4ed8;\">0</span></span>\n                            <button onclick=\"fetchClients()\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button>\n                        </div>\n                    </div>\n                    <div class=\"modern-table-shell\">\n                        <div id=\"clientsTableBody\" class=\"record-card-grid\"></div>\n                    </div>\n                </div>\n            </div>"
    };

    function mountSections(sectionIds) {
        sectionIds.forEach((sectionId) => {
            const target = document.getElementById(sectionId);
            const markup = SECTION_HTML[sectionId];
            if (!target || !markup || target.dataset.moduleMounted === 'true') return;
            target.outerHTML = markup;
        });
    }

    // ==========================================
    // 🏢 STAFF INTERNAL TICKETS FUNCTIONS
    // ==========================================
    async function fetchStaffTickets() {
        const tbody = document.getElementById('staffTicketsTable');
        const countSpan = document.getElementById('staffTicketCount');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Loading staff tickets...</td></tr>';
        try {
            const res = await fetch('/api/admin/staff-tickets', { credentials: 'include' });
            const data = await res.json();
            if (!data.success) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:30px;">Failed to load staff tickets.</td></tr>';
                return;
            }
            const tickets = data.tickets || [];
            if (countSpan) countSpan.innerText = tickets.length;
            if (!tickets.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:30px;">No internal staff tickets yet 🎉</td></tr>';
                return;
            }
            const categoryColors = { 'IT Support': '#3b82f6', 'HR': '#f59e0b', 'Accounts': '#8b5cf6', 'General': '#64748b' };
            const statusColors = { 'Open': '#f59e0b', 'In Progress': '#3b82f6', 'Resolved': '#10b981' };
            tbody.innerHTML = tickets.map(t => {
                const repliesHtml = (t.replies || []).map(r =>
                    `<div style="font-size:11px;color:#475569;background:#f8fafc;padding:5px 8px;border-radius:6px;margin-top:4px;"><strong>${escapeHtml(r.sender || 'Admin')}:</strong> ${escapeHtml(r.message)}</div>`
                ).join('');
                const catColor = categoryColors[t.category] || '#64748b';
                return `
                    <tr>
                        <td><strong>${escapeHtml(t.staffName || 'Staff')}</strong><br><small style="color:#94a3b8;">${escapeHtml(t.staffEmail || '')}</small></td>
                        <td><span style="background:${catColor}14;color:${catColor};padding:4px 10px;border-radius:12px;font-size:12px;font-weight:700;">${escapeHtml(t.category || 'General')}</span></td>
                        <td style="font-weight:600;">${escapeHtml(t.subject || '')}</td>
                        <td style="max-width:200px;font-size:13px;">${escapeHtml(t.issue || '')}${repliesHtml}</td>
                        <td>
                            <select onchange="updateStaffTicketStatus('${t._id}', this.value)" style="padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-weight:bold;color:${statusColors[t.status] || '#333'};">
                                <option value="Open" ${t.status === 'Open' ? 'selected' : ''}>🟡 Open</option>
                                <option value="In Progress" ${t.status === 'In Progress' ? 'selected' : ''}>🟠 In Progress</option>
                                <option value="Resolved" ${t.status === 'Resolved' ? 'selected' : ''}>✅ Resolved</option>
                            </select>
                        </td>
                        <td>
                            <div style="display:flex;gap:5px;">
                                <input type="text" id="staff-reply-${t._id}" placeholder="Type reply..." style="flex:1;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;">
                                <button onclick="replyToStaffTicket('${t._id}')" style="background:#6c63ff;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">Reply</button>
                            </div>
                        </td>
                    </tr>`;
            }).join('');
        } catch (e) {
            console.error('Staff tickets fetch error:', e);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:30px;">Could not connect to server.</td></tr>';
        }
    }

    async function updateStaffTicketStatus(id, status) {
        try {
            await fetch('/api/admin/update-staff-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: id, status, sender: 'Admin' }),
                credentials: 'include'
            });
            fetchStaffTickets();
        } catch (e) { alert('Failed to update staff ticket'); }
    }

    async function replyToStaffTicket(id) {
        const input = document.getElementById('staff-reply-' + id);
        const reply = (input?.value || '').trim();
        if (!reply) return alert('Please type a reply');
        try {
            await fetch('/api/admin/update-staff-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: id, reply, sender: 'Admin' }),
                credentials: 'include'
            });
            fetchStaffTickets();
        } catch (e) { alert('Failed to send reply'); }
    }

    async function fetchClients() {
        const grid = document.getElementById('clientsTableBody');
        const countSpan = document.getElementById('totalUsersCount');
        if (!grid || !countSpan) return;

        try {
            grid.innerHTML = '<div class="chat-empty" style="grid-column:1/-1;">Fetching client directory...</div>';
            const res = await fetch('/api/admin/clients', { credentials: 'include' });
            const data = await res.json();
            const searchTerm = String(document.getElementById('clientSearch')?.value || '').trim().toLowerCase();

            if (!data.success) {
                grid.innerHTML = `<div class="chat-empty" style="grid-column:1/-1;color:#dc2626;">${escapeHtml(data.error || 'Failed to load clients.')}</div>`;
                return;
            }

            let clients = Array.isArray(data.clients) ? data.clients : [];
            if (searchTerm) {
                clients = clients.filter((client) =>
                    String(client.name || '').toLowerCase().includes(searchTerm) ||
                    String(client.email || '').toLowerCase().includes(searchTerm)
                );
            }

            countSpan.innerText = clients.length;
            grid.innerHTML = '';

            if (!clients.length) {
                grid.innerHTML = `<div class="chat-empty" style="grid-column:1/-1;">${searchTerm ? 'No clients matching "' + searchTerm + '"' : 'No clients found yet.'}</div>`;
                return;
            }

            grid.innerHTML = clients.map((client) => {
                const banBtnText = client.isBanned ? 'Unban' : 'Ban';
                const newBanStatus = !client.isBanned;
                const safeName = (client.name || 'Unknown User').replace(/'/g, "\\'");
                let brandDetailsUI = '<span style="color:#94a3b8;font-size:12px;font-style:italic;">Not onboarded</span>';

                if (client.isOnboarded) {
                    brandDetailsUI = `
                        <div style="background:#f8fafc;padding:12px;border-radius:14px;border:1px dashed #cbd5e1;font-size:12px;">
                            <strong style="color:#0f172a;font-size:13px;">${escapeHtml(client.brandName || 'Brand')}</strong><br>
                            <span style="color:#64748b;display:inline-block;margin-top:4px;">${escapeHtml(client.brandColors || 'No colors')}</span><br>
                            ${client.referenceLinks
                                ? `<a href="${client.referenceLinks.startsWith('http') ? client.referenceLinks : 'https://' + client.referenceLinks}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:none;font-weight:700;display:inline-block;margin-top:4px;">Reference Link</a>`
                                : '<span style="color:#94a3b8;display:inline-block;margin-top:4px;">No reference link</span>'}
                        </div>`;
                }

                return `
                    <article class="client-profile-card">
                        <div class="client-profile-body">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                                <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                                    <div class="staff-avatar-lg">${escapeHtml(getInitials(client.name || client.email || 'CL'))}</div>
                                    <div style="min-width:0;">
                                        <div style="font-weight:700;color:#0f172a;">${escapeHtml(client.name || 'Unknown User')}</div>
                                        <div style="margin-top:4px;font-size:0.83rem;color:#64748b;word-break:break-word;">${escapeHtml(client.email || '—')}</div>
                                    </div>
                                </div>
                                ${renderModernStatusBadge(client.isBanned ? 'Banned' : 'Active', client.isBanned ? 'Banned' : 'Active')}
                            </div>
                            <div style="display:grid;gap:10px;margin-top:16px;">
                                <div>
                                    <div style="font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Phone</div>
                                    <div style="margin-top:4px;color:#0f172a;">${escapeHtml(client.phone || 'No phone number')}</div>
                                </div>
                                <div>
                                    <div style="font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Joined</div>
                                    <div style="margin-top:4px;color:#0f172a;">${formatAdminDate(client.date)}</div>
                                </div>
                                <div>
                                    <div style="font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Brand Profile</div>
                                    ${brandDetailsUI}
                                </div>
                            </div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;">
                                <button onclick="adminResetPassword('${client._id}', '${safeName}')" class="modern-action-btn" title="Create Temporary Password"><i class="ri-key-2-line"></i> Password</button>
                                <button onclick="toggleBan('${client._id}', '${safeName}', ${newBanStatus})" class="modern-action-btn"><i class="ri-forbid-2-line"></i> ${banBtnText}</button>
                                <button onclick="deleteClient('${client._id}', '${safeName}')" class="modern-action-btn" title="Delete Client"><i class="ri-delete-bin-6-line"></i> Delete</button>
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        } catch (error) {
            grid.innerHTML = '<div class="chat-empty" style="grid-column:1/-1;color:#dc2626;">Frontend could not load the client directory.</div>';
        }
    }

    async function toggleBan(userId, userName, banStatus) {
        const actionText = banStatus ? 'BAN (Suspend)' : 'UNBAN (Activate)';
        if (!confirm(`Are you sure you want to ${actionText} ${userName}'s account?`)) return;
        try {
            const res = await fetch('/api/admin/toggle-ban-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isBanned: banStatus }),
                credentials: 'include'
            });
            const result = await res.json();
            if (result.success) fetchClients();
            else alert('Error: ' + result.error);
        } catch (error) {
            alert('Server connection failed');
        }
    }

    async function deleteClient(userId, userName) {
        if (!confirm(`🚨 EXTREME WARNING: Are you sure you want to PERMANENTLY DELETE ${userName}?`)) return;
        try {
            const res = await fetch(`/api/admin/delete-client/${userId}`, { method: 'DELETE', credentials: 'include' });
            const result = await res.json();
            if (result.success) fetchClients();
            else alert('Error: ' + result.error);
        } catch (error) {
            alert('Server connection failed');
        }
    }

    async function adminResetPassword(userId, userName) {
        const newPassword = prompt(`Enter new temporary password for ${userName}:`);
        if (!newPassword) return;
        if (newPassword.length < 6) return alert('⚠️ Password must be at least 6 characters long.');
        if (!confirm(`Change ${userName}'s password to: "${newPassword}"?\n\nAn automated email will be sent to the client.`)) return;

        try {
            const res = await fetch('/api/admin/reset-client-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, newPassword }),
                credentials: 'include'
            });
            const result = await res.json();
            if (result.success) alert(`✅ ${result.message}`);
            else alert('❌ Error: ' + result.error);
        } catch (error) {
            alert('Failed to connect to server');
        }
    }

    window.mountAdminClientOpsSections = function () {
        mountSections(["helpdesk-section","staff-tickets-section","meetings-section","jobs-section","clients-section"]);
    };
    window.fetchClients = fetchClients;
    window.toggleBan = toggleBan;
    window.deleteClient = deleteClient;
    window.adminResetPassword = adminResetPassword;
    window.fetchStaffTickets = fetchStaffTickets;
    window.updateStaffTicketStatus = updateStaffTicketStatus;
    window.replyToStaffTicket = replyToStaffTicket;
})();
