(function () {
    const SECTION_HTML = {
        "helpdesk-section": "<div id=\"helpdesk-section\" class=\"section\" data-module-mounted=\"true\"><style>.helpdesk-tab-btn { background:none; border:none; padding:10px 20px; font-weight:bold; cursor:pointer; color:#64748b; border-bottom:2px solid transparent; transition:0.2s; outline:none; font-family:inherit; font-size:14px; } .helpdesk-tab-btn.active { color:#6c63ff; border-bottom:2px solid #6c63ff; } .live-chat-glow-badge { background:#fee2e2; color:#ef4444; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; display:inline-flex; align-items:center; gap:4px; border:1px solid #fca5a5; animation:pulse-badge 1.5s infinite; } @keyframes pulse-badge { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } } .refill-glow-badge { background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; display:inline-flex; align-items:center; gap:4px; border:1px solid #7dd3fc; animation:pulse-refill 1.5s infinite; } @keyframes pulse-refill { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(3, 105, 161, 0.4); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(3, 105, 161, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(3, 105, 161, 0); } } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .refresh-spinning { display: inline-block; animation: spin 0.8s linear infinite; } #active-tickets-view .table-responsive::-webkit-scrollbar { width: 6px; height: 6px; } #active-tickets-view .table-responsive::-webkit-scrollbar-track { background: transparent; } #active-tickets-view .table-responsive::-webkit-scrollbar-thumb { background: rgba(108, 99, 255, 0.3); border-radius: 3px; } #active-tickets-view .table-responsive::-webkit-scrollbar-thumb:hover { background: rgba(108, 99, 255, 0.5); }</style><div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;\"><h2>🎧 Client Helpdesk</h2><span id=\"ticketCount\" style=\"background:#e0e7ff;color:#6c63ff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:bold;\">0 Tickets</span></div><div style=\"display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;\"><button onclick=\"switchHelpdeskTab('active-tickets')\" class=\"helpdesk-tab-btn active\" id=\"tab-active-tickets\">Active Tickets</button><button onclick=\"switchHelpdeskTab('live-chats')\" class=\"helpdesk-tab-btn\" id=\"tab-live-chats\">Live Chats 💬</button></div><div id=\"active-tickets-view\" class=\"helpdesk-tab-content\"><div style=\"display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; margin-bottom:15px;\"><div class=\"sub-tab-bar\" style=\"display:flex; gap:8px; background:#f1f5f9; padding:4px; border-radius:8px; border:1px solid #cbd5e1;\"><button id=\"adminTicketSubTab-All\" onclick=\"setAdminTicketSubTab('All')\" class=\"admin-subtab-btn\" style=\"background:#ffffff; color:#4f46e5; border:none; padding:6px 14px; font-weight:700; font-size:12px; border-radius:6px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:0.2s;\">🌐 All</button><button id=\"adminTicketSubTab-Open\" onclick=\"setAdminTicketSubTab('Open')\" class=\"admin-subtab-btn\" style=\"background:none; color:#64748b; border:none; padding:6px 14px; font-weight:700; font-size:12px; border-radius:6px; cursor:pointer; transition:0.2s;\">🟡 Open</button><button id=\"adminTicketSubTab-Pending\" onclick=\"setAdminTicketSubTab('Pending')\" class=\"admin-subtab-btn\" style=\"background:none; color:#64748b; border:none; padding:6px 14px; font-weight:700; font-size:12px; border-radius:6px; cursor:pointer; transition:0.2s;\">🟣 Pending</button><button id=\"adminTicketSubTab-Resolved\" onclick=\"setAdminTicketSubTab('Resolved')\" class=\"admin-subtab-btn\" style=\"background:none; color:#64748b; border:none; padding:6px 14px; font-weight:700; font-size:12px; border-radius:6px; cursor:pointer; transition:0.2s;\">✅ Resolved</button><button id=\"adminTicketSubTab-Closed\" onclick=\"setAdminTicketSubTab('Closed')\" class=\"admin-subtab-btn\" style=\"background:none; color:#64748b; border:none; padding:6px 14px; font-weight:700; font-size:12px; border-radius:6px; cursor:pointer; transition:0.2s;\">⛔ Closed</button></div><button id=\"refreshTicketsBtn\" onclick=\"triggerAdminTicketRefresh()\" style=\"background:#ffffff; color:#6c63ff; border:1px solid #6c63ff; padding:6px 14px; font-weight:700; font-size:12px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:5px; transition:0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.05); outline:none;\">🔄 Refresh</button><div style=\"position:relative; width:340px;\"><i class=\"ri-search-line\" style=\"position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:16px;\"></i><input type=\"text\" id=\"adminTicketSearch\" placeholder=\"Search by Ticket #, Order ID, Name, or Email...\" style=\"width:100%; padding:8px 36px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-weight:600; outline:none; background:#ffffff; transition:0.2s;\" onkeyup=\"handleAdminTicketSearchKey(event)\" oninput=\"handleAdminTicketSearchInput(event)\"><button id=\"adminTicketSearchClear\" onclick=\"clearAdminTicketSearch()\" style=\"position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px; display:none;\">&#10005;</button></div></div><div class=\"table-responsive\" style=\"overflow-x:auto;width:100%;height:calc(100vh - 250px);min-height:400px;overflow-y:auto;\"><table><thead><tr><th>Client</th><th>Subject</th><th>Issue</th><th>Status</th><th>Reply & Action</th></tr></thead><tbody id=\"ticketsTable\"></tbody></table></div></div><div id=\"live-chats-view\" class=\"helpdesk-tab-content\" style=\"display:none;\"><div class=\"table-responsive\" style=\"overflow-x:auto;width:100%;\"><table><thead><tr><th>Client</th><th>Order ID</th><th>Subject</th><th>Status</th><th>Action</th></tr></thead><tbody id=\"liveChatsTableBody\"></tbody></table></div><div id=\"adminLiveChatBox\" style=\"display:none; margin-top:20px; border:1px solid #cbd5e1; border-radius:12px; padding:20px; background:#f8fafc;\"><div style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;\"><h4 style=\"margin:0; color:#1e293b;\" id=\"adminChatTitle\">Chatting with Client</h4><button onclick=\"closeAdminChat()\" style=\"background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;\">Close Chat</button></div><div id=\"supportChatMessages\" style=\"height:250px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:white; padding:15px; margin-bottom:15px; display:flex; flex-direction:column; gap:10px;\"></div><div style=\"display:flex; gap:10px;\"><input type=\"text\" id=\"supportChatInput\" placeholder=\"Type message to client...\" style=\"flex:1; padding:12px; border:1px solid #cbd5e1; border-radius:8px;\" onkeypress=\"handleAdminChatKey(event)\"><button type=\"button\" id=\"supportSendBtn\" onclick=\"sendAdminChatMessage(event)\" style=\"background:#6c63ff; color:white; border:none; padding:0 25px; border-radius:8px; cursor:pointer; font-weight:bold;\">Send</button></div></div></div></div>",
        "staff-tickets-section": "<div id=\"staff-tickets-section\" class=\"section\" data-module-mounted=\"true\"><div class=\"premium-section\"><div class=\"section-header\"><div><h2 class=\"section-title\">Staff Internal Tickets</h2><p class=\"section-subtitle\">HR, IT, Accounts, and general support tickets raised by team members.</p></div><div class=\"section-actions\"><span style=\"color:#64748b;font-weight:700;\">Total: <span id=\"staffTicketCount\" style=\"color:#1d4ed8;\">0</span></span><button onclick=\"fetchStaffTickets()\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button></div></div><div class=\"table-responsive\" style=\"overflow-x:auto;width:100%;\"><table><thead><tr><th>Staff</th><th>Category</th><th>Subject</th><th>Issue</th><th>Status</th><th>Reply & Action</th></tr></thead><tbody id=\"staffTicketsTable\"></tbody></table></div></div></div>",
        "meetings-section": "<div id=\"meetings-section\" class=\"section\" data-module-mounted=\"true\">\n                <h2 style=\"margin-bottom:20px;\">🎬 Video Meetings</h2>\n\n                <div class=\"staff-card\" style=\"padding:20px;margin-bottom:20px;\">\n                    <h3 style=\"margin-bottom:15px;\">➕ Schedule New Meeting</h3>\n                    <div style=\"display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;\">\n                        <div style=\"flex:2;min-width:180px;\">\n                            <label style=\"font-size:12px;color:#64748b;display:block;margin-bottom:4px;\">Meeting\n                                Topic</label>\n                            <input type=\"text\" id=\"meetTopic\" placeholder=\"e.g. Weekly Team Sync\"\n                                style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;\">\n                        </div>\n                        <div style=\"flex:1;min-width:180px;\">\n                            <label style=\"font-size:12px;color:#64748b;display:block;margin-bottom:4px;\">Date &\n                                Time</label>\n                            <input type=\"datetime-local\" id=\"meetTime\"\n                                style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;\">\n                        </div>\n                        <div style=\"flex:1;min-width:150px;\">\n                            <label style=\"font-size:12px;color:#64748b;display:block;margin-bottom:4px;\">Password\n                                (Optional)</label>\n                            <input type=\"text\" id=\"meetPass\" placeholder=\"e.g. 1234\"\n                                style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;\">\n                        </div>\n                        <button onclick=\"scheduleMeeting()\" class=\"btn-publish\" style=\"padding:10px 20px;\">Schedule\n                            🎬</button>\n                    </div>\n                </div>\n\n                <div id=\"meetingsList\"\n                    style=\"display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:15px;\"></div>\n            </div>",
        "jobs-section": "<div id=\"jobs-section\" class=\"section\" data-module-mounted=\"true\">\n                <h3>💼 Manage Careers (Jobs)</h3>\n                <div class=\"staff-card\" style=\"padding: 20px; margin-bottom: 20px;\">\n                    <form id=\"addJobForm\" onsubmit=\"submitJob(event)\"\n                        style=\"display: flex; gap: 15px; flex-wrap: wrap;\">\n                        <input type=\"text\" id=\"jobTitle\" placeholder=\"Job Title (e.g. Graphic Designer)\" required\n                            style=\"flex:1; padding:10px; border:1px solid #ddd; border-radius:5px;\">\n                        <select id=\"jobType\" required\n                            style=\"flex:1; padding:10px; border:1px solid #ddd; border-radius:5px;\">\n                            <option value=\"Full-Time\">Full-Time</option>\n                            <option value=\"Part-Time\">Part-Time</option>\n                            <option value=\"Internship\">Internship</option>\n                            <option value=\"Freelance\">Freelance</option>\n                        </select>\n                        <input type=\"text\" id=\"jobLocation\" placeholder=\"Location (e.g. Remote / Jaipur)\" required\n                            style=\"flex:1; padding:10px; border:1px solid #ddd; border-radius:5px;\">\n                        <input type=\"text\" id=\"jobDesc\" placeholder=\"Short Description...\" required\n                            style=\"flex:2; padding:10px; border:1px solid #ddd; border-radius:5px;\">\n                        <button type=\"submit\" id=\"btnJob\" class=\"btn-publish\">Post Job 🚀</button>\n                    </form>\n                </div>\n                <div class=\"table-responsive\">\n                    <table>\n                        <thead>\n                            <tr>\n                                <th>Job Title</th>\n                                <th>Type & Location</th>\n                                <th>Posted On</th>\n                                <th>Action</th>\n                            </tr>\n                        </thead>\n                        <tbody id=\"jobsTableBody\"></tbody>\n                    </table>\n                </div>\n            </div>",
        "clients-section": `<div id="clients-section" class="section" data-module-mounted="true">
                <style>
                    .modern-list-table tbody tr.client-row-hoverable:hover {
                        background: rgba(107, 70, 193, 0.04) !important;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(15,23,42,0.02);
                    }
                    .modern-list-table tbody tr.client-row-hoverable {
                        transition: all 0.2s ease;
                    }
                </style>
                <div class="premium-section">
                    <div class="section-header">
                        <div>
                            <h2 class="section-title">Clients</h2>
                            <p class="section-subtitle">Manage registered users, settings, and wallet balances using a modern Master-Detail drawer.</p>
                        </div>
                        <div class="section-actions">
                            <div class="approvals-search" style="min-width: 280px;">
                                <i class="ri-search-line"></i>
                                <input id="clientSearch" type="text" placeholder="Search by Name or Email..." oninput="fetchClients()">
                            </div>
                            <span style="color:#64748b;font-weight:700;">Total: <span id="totalUsersCount" style="color:#1d4ed8;">0</span></span>
                            <button onclick="fetchClients()" class="section-refresh-btn"><i class="ri-refresh-line"></i> Refresh</button>
                        </div>
                    </div>
                    <div class="modern-table-shell">
                        <div class="table-responsive" style="overflow-x:auto; width:100%;">
                            <table class="modern-list-table">
                                <thead>
                                    <tr>
                                        <th>Avatar</th>
                                        <th>Full Name</th>
                                        <th>Email</th>
                                        <th>Mobile Number</th>
                                        <th>Account Status</th>
                                        <th>Wallet Balance</th>
                                    </tr>
                                </thead>
                                <tbody id="clientsTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Client Detail Side-Drawer -->
                <div id="clientDetailDrawer" class="detail-drawer" style="position:fixed; top:0; right:-480px; width:460px; height:100vh; background:rgba(255,255,255,0.92); backdrop-filter:blur(20px); border-left:1px solid rgba(148,163,184,0.18); box-shadow:-10px 0 30px rgba(15,23,42,0.1); z-index:1050; transition:right 0.3s cubic-bezier(0.4, 0, 0.2, 1); display:flex; flex-direction:column; overflow:hidden; font-family:'Poppins', sans-serif;">
                    <!-- Drawer Header -->
                    <div style="padding:20px 24px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg, rgba(107, 70, 193, 0.05), rgba(14, 165, 233, 0.05));">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div id="drawerAvatar" class="staff-avatar-lg" style="width:40px; height:40px; border-radius:50%; background:#e0e7ff; color:#6c63ff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">CL</div>
                            <div>
                                <h3 id="drawerTitleName" style="margin:0; font-size:1.1rem; color:#0f172a; font-weight:700;">Client Profile</h3>
                                <p id="drawerTitleEmail" style="margin:2px 0 0; font-size:0.78rem; color:#64748b;">client@example.com</p>
                            </div>
                        </div>
                        <button onclick="closeClientDetail()" style="background:none; border:none; color:#64748b; font-size:24px; cursor:pointer; line-height:1; padding:4px; border-radius:50%; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>

                    <!-- Tab Navigation -->
                    <div style="display:flex; border-bottom:1px solid #f1f5f9; background:#ffffff;">
                        <button id="tabGeneral" onclick="switchDrawerTab('general')" style="flex:1; padding:14px; border:none; background:transparent; font-weight:700; font-size:0.9rem; color:#6c63ff; border-bottom:3px solid #6c63ff; cursor:pointer; transition:0.2s;">
                            <i class="ri-settings-4-line" style="margin-right:4px;"></i> General Settings
                        </button>
                        <button id="tabWallet" onclick="switchDrawerTab('wallet')" style="flex:1; padding:14px; border:none; background:transparent; font-weight:600; font-size:0.9rem; color:#64748b; border-bottom:3px solid transparent; cursor:pointer; transition:0.2s;">
                            <i class="ri-wallet-3-line" style="margin-right:4px;"></i> Wallet Activity
                        </button>
                    </div>

                    <!-- Drawer Content (Scrollable) -->
                    <div style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px;">
                        <!-- TAB 1: GENERAL SETTINGS -->
                        <div id="drawerTabContentGeneral" style="display:block;">
                            <!-- Profile Details Form -->
                            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:18px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02); margin-bottom:20px;">
                                <h4 style="margin:0 0 14px 0; font-size:0.95rem; color:#0f172a; font-weight:700; display:flex; align-items:center; gap:6px;"><i class="ri-user-settings-line" style="color:#6c63ff;"></i> Profile Details</h4>
                                <div style="display:grid; gap:12px;">
                                    <div>
                                        <label style="font-size:0.75rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">Full Name</label>
                                        <input type="text" id="editClientName" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem; margin-top:4px; font-family:inherit;">
                                    </div>
                                    <div>
                                        <label style="font-size:0.75rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">Email Address</label>
                                        <input type="email" id="editClientEmail" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem; margin-top:4px; font-family:inherit;">
                                    </div>
                                    <div>
                                        <label style="font-size:0.75rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">Mobile Number</label>
                                        <input type="tel" id="editClientPhone" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:10px; font-size:0.9rem; margin-top:4px; font-family:inherit;">
                                    </div>
                                    <button onclick="saveClientProfile()" style="background:#6c63ff; color:#ffffff; border:none; padding:12px; border-radius:10px; font-weight:700; cursor:pointer; margin-top:6px; display:flex; justify-content:center; align-items:center; gap:6px; font-size:0.9rem; transition:0.2s;" onmouseover="this.style.filter='brightness(1.05)'" onmouseout="this.style.filter='none'">
                                        <i class="ri-save-line"></i> Save Changes
                                    </button>
                                </div>
                            </div>

                            <!-- Account Security & Status Settings -->
                            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:18px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02);">
                                <h4 style="margin:0 0 14px 0; font-size:0.95rem; color:#0f172a; font-weight:700; display:flex; align-items:center; gap:6px;"><i class="ri-shield-keyhole-line" style="color:#6c63ff;"></i> Safety & Account Controls</h4>
                                <div style="display:flex; flex-direction:column; gap:10px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f8fafc;">
                                        <div>
                                            <div style="font-weight:700; font-size:0.88rem; color:#0f172a;">Account Restriction</div>
                                            <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Restrict or restore client account access.</p>
                                        </div>
                                        <button id="btnToggleBanDrawer" onclick="toggleBanFromDrawer()" style="padding:8px 16px; border:none; border-radius:8px; font-weight:700; font-size:0.83rem; cursor:pointer; transition:0.2s;"></button>
                                    </div>

                                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f8fafc;">
                                        <div>
                                            <div style="font-weight:700; font-size:0.88rem; color:#0f172a;">Password Reset</div>
                                            <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Create and email a temporary password.</p>
                                        </div>
                                        <button onclick="resetPasswordFromDrawer()" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; padding:8px 16px; border-radius:8px; font-weight:700; font-size:0.83rem; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                                            <i class="ri-key-2-line"></i> Reset Password
                                        </button>
                                    </div>

                                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0;">
                                        <div>
                                            <div style="font-weight:700; font-size:0.88rem; color:#ef4444;">Delete Client</div>
                                            <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">Permanently remove this client and data.</p>
                                        </div>
                                        <button onclick="deleteClientFromDrawer()" style="background:#fee2e2; color:#ef4444; border:1px solid #fca5a5; padding:8px 16px; border-radius:8px; font-weight:700; font-size:0.83rem; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'">
                                            <i class="ri-delete-bin-6-line"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 2: WALLET ACTIVITY -->
                        <div id="drawerTabContentWallet" style="display:none;">
                            <!-- Wallet Overview & Control -->
                            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:18px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02); margin-bottom:20px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <i class="ri-wallet-3-line" style="font-size:20px; color:#1d4ed8;"></i>
                                        <span style="font-weight:700; font-size:0.95rem; color:#0f172a;">Wallet Control Panel</span>
                                    </div>
                                    <span id="drawerWalletId" class="wallet-badge" style="background:#e0e7ff; color:#1d4ed8; padding:4px 10px; border-radius:8px; font-weight:bold; font-family:monospace; font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                                        No ID
                                    </span>
                                </div>

                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:15px;">
                                    <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #f1f5f9; display:flex; flex-direction:column; justify-content:center;">
                                        <span style="font-size:0.68rem; color:#64748b; font-weight:bold; text-transform:uppercase; margin-bottom:2px;">Current Balance</span>
                                        <span id="drawerWalletBalance" style="font-size:1.15rem; font-weight:800; color:#0f172a;">₹0.00</span>
                                    </div>

                                    <div style="display:flex; flex-direction:column; justify-content:center;">
                                        <span style="font-size:0.68rem; color:#64748b; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">Wallet Status</span>
                                        <select id="drawerWalletStatus" onchange="updateWalletStatusFromDrawer(this.value)" style="padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-weight:bold; color:#0f172a; font-size:13px; height:38px; min-height:auto; background:#ffffff; font-family:inherit;">
                                            <option value="Active">Active</option>
                                            <option value="Frozen">Frozen</option>
                                            <option value="Hold">Hold</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Balance Adjust Form -->
                                <form onsubmit="submitWalletAdjustmentFromDrawer(event)" style="background:#f8fafc; padding:14px; border-radius:14px; border:1px solid #e2e8f0;">
                                    <div style="font-weight:700; font-size:0.85rem; color:#0f172a; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.04em;">Adjust Balance</div>
                                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                                        <div>
                                            <label style="font-size:0.68rem; color:#64748b; display:block; margin-bottom:4px; font-weight:700; text-transform:uppercase;">Adjustment Type</label>
                                            <select id="drawerAdjType" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; min-height:auto; height:38px; background:#ffffff; font-family:inherit;">
                                                <option value="Credit">Credit (Add Funds)</option>
                                                <option value="Debit">Debit (Deduct Funds)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style="font-size:0.68rem; color:#64748b; display:block; margin-bottom:4px; font-weight:700; text-transform:uppercase;">Amount (₹)</label>
                                            <input type="number" id="drawerAdjAmount" step="any" min="0.01" placeholder="0.00" required style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; min-height:auto; height:38px; background:#ffffff; font-family:inherit;">
                                        </div>
                                    </div>
                                    <div style="margin-bottom:10px;">
                                        <label style="font-size:0.68rem; color:#64748b; display:block; margin-bottom:4px; font-weight:700; text-transform:uppercase;">Adjustment Description</label>
                                        <input type="text" id="drawerAdjDesc" placeholder="Refund, compensation, custom charge..." required style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; min-height:auto; height:38px; background:#ffffff; font-family:inherit;">
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                                        <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; color:#64748b; cursor:pointer; min-height:auto; font-weight:600;">
                                            <input type="checkbox" id="drawerAdjNeg" style="min-height:auto; width:16px; height:16px;"> Allow Negative Balance
                                        </label>
                                        <button type="submit" style="background:#6c63ff; color:white; border:none; padding:8px 16px; font-size:0.83rem; font-weight:700; border-radius:8px; cursor:pointer; transition:0.2s;" onmouseover="this.style.filter='brightness(1.05)'" onmouseout="this.style.filter='none'">Update Wallet</button>
                                    </div>
                                </form>
                            </div>

                            <!-- Transaction Ledger -->
                            <div>
                                <h4 style="margin:0 0 10px 0; font-size:0.95rem; color:#0f172a; font-weight:700; display:flex; align-items:center; gap:6px;"><i class="ri-history-line" style="color:#6c63ff;"></i> Transaction History Ledger</h4>
                                <div style="border:1px solid #e2e8f0; border-radius:14px; background:#ffffff; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02);">
                                    <div style="max-height:300px; overflow-y:auto; overflow-x:auto;">
                                        <table style="width:100%; font-size:0.8rem; border-collapse:collapse; margin-top:0; border:none; box-shadow:none;">
                                            <thead>
                                                <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                                                    <th style="padding:10px 12px; font-size:0.68rem; color:#64748b; text-align:left; font-weight:700; text-transform:uppercase; position:sticky; top:0; background:#f8fafc;">Date</th>
                                                    <th style="padding:10px 12px; font-size:0.68rem; color:#64748b; text-align:left; font-weight:700; text-transform:uppercase; position:sticky; top:0; background:#f8fafc;">Type</th>
                                                    <th style="padding:10px 12px; font-size:0.68rem; color:#64748b; text-align:left; font-weight:700; text-transform:uppercase; position:sticky; top:0; background:#f8fafc;">Amount</th>
                                                    <th style="padding:10px 12px; font-size:0.68rem; color:#64748b; text-align:left; font-weight:700; text-transform:uppercase; position:sticky; top:0; background:#f8fafc;">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody id="drawerTxnTableBody">
                                                <tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;"><i class="ri-loader-4-line ri-spin" style="font-size:18px; margin-right:4px; vertical-align:middle;"></i> Loading Transactions...</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`
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
            const statusColors = { 'Open': '#f59e0b', 'Pending': '#8b5cf6', 'Resolved': '#10b981', 'Closed': '#64748b' };
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
                                <option value="Pending" ${t.status === 'Pending' ? 'selected' : ''}>🟣 Pending</option>
                                <option value="Resolved" ${t.status === 'Resolved' ? 'selected' : ''}>✅ Resolved</option>
                                <option value="Closed" ${t.status === 'Closed' ? 'selected' : ''}>⛔ Closed</option>
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

    let cachedClientsList = [];
    let currentActiveClientId = null;
    let currentActiveClientData = null;

    async function fetchClients() {
        const grid = document.getElementById('clientsTableBody');
        const countSpan = document.getElementById('totalUsersCount');
        if (!grid || !countSpan) return;

        try {
            grid.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;"><i class="ri-loader-4-line ri-spin" style="font-size:24px;vertical-align:middle;margin-right:8px;"></i> Fetching client directory...</td></tr>';
            const res = await fetch('/api/admin/clients', { credentials: 'include' });
            const data = await res.json();
            const searchTerm = String(document.getElementById('clientSearch')?.value || '').trim().toLowerCase();

            if (!data.success) {
                grid.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:30px;font-weight:bold;">${escapeHtml(data.error || 'Failed to load clients.')}</td></tr>`;
                return;
            }

            let clients = Array.isArray(data.clients) ? data.clients : [];
            cachedClientsList = clients; // Cache clients globally

            if (searchTerm) {
                clients = clients.filter((client) =>
                    String(client.name || '').toLowerCase().includes(searchTerm) ||
                    String(client.email || '').toLowerCase().includes(searchTerm)
                );
            }

            countSpan.innerText = clients.length;
            grid.innerHTML = '';

            if (!clients.length) {
                grid.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:30px;">${searchTerm ? 'No clients matching "' + searchTerm + '"' : 'No clients found yet.'}</td></tr>`;
                return;
            }

            grid.innerHTML = clients.map((client) => {
                const isBanned = client.isBanned;
                const statusBadge = renderModernStatusBadge(isBanned ? 'Banned' : 'Active', isBanned ? 'Banned' : 'Active');
                const safeName = (client.name || 'Unknown User').replace(/'/g, "\\'");
                const avatarInitials = escapeHtml(getInitials(client.name || client.email || 'CL'));
                const walletBalanceFormatted = formatCurrency(client.walletBalance || 0);

                return `
                    <tr onclick="openClientDetail('${client._id}')" style="cursor:pointer;" class="client-row-hoverable">
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
                            <div class="staff-avatar-sm" style="width:34px; height:34px; border-radius:50%; background:#e0e7ff; color:#6c63ff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">${avatarInitials}</div>
                        </td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${escapeHtml(client.name || 'Unknown User')}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #475569;">${escapeHtml(client.email || '—')}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #475569;">${escapeHtml(client.phone || '—')}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">${statusBadge}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #1e293b;">${walletBalanceFormatted}</td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            grid.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:30px;font-weight:bold;">Frontend could not load the client directory.</td></tr>';
        }
    }

    function openClientDetail(clientId) {
        currentActiveClientId = clientId;
        const client = cachedClientsList.find(c => c._id === clientId);
        if (!client) return;

        currentActiveClientData = client;
        populateDrawerDetails(client);
        switchDrawerTab('general');

        document.getElementById('clientDetailDrawer').style.right = '0';
    }

    function closeClientDetail() {
        document.getElementById('clientDetailDrawer').style.right = '-480px';
        currentActiveClientId = null;
        currentActiveClientData = null;
    }

    function switchDrawerTab(tab) {
        const tabGen = document.getElementById('tabGeneral');
        const tabWal = document.getElementById('tabWallet');
        const contentGen = document.getElementById('drawerTabContentGeneral');
        const contentWal = document.getElementById('drawerTabContentWallet');

        if (!tabGen || !tabWal || !contentGen || !contentWal) return;

        if (tab === 'general') {
            tabGen.style.color = '#6c63ff';
            tabGen.style.borderBottom = '3px solid #6c63ff';
            tabGen.style.fontWeight = '700';
            
            tabWal.style.color = '#64748b';
            tabWal.style.borderBottom = '3px solid transparent';
            tabWal.style.fontWeight = '600';

            contentGen.style.display = 'block';
            contentWal.style.display = 'none';
        } else {
            tabWal.style.color = '#6c63ff';
            tabWal.style.borderBottom = '3px solid #6c63ff';
            tabWal.style.fontWeight = '700';
            
            tabGen.style.color = '#64748b';
            tabGen.style.borderBottom = '3px solid transparent';
            tabGen.style.fontWeight = '600';

            contentGen.style.display = 'none';
            contentWal.style.display = 'block';

            // Lazy load wallet details ONLY now when clicked!
            if (currentActiveClientId) {
                loadWalletDetailsFromDrawer(currentActiveClientId);
            }
        }
    }

    function populateDrawerDetails(client) {
        const initials = getInitials(client.name || client.email || 'CL');
        document.getElementById('drawerAvatar').innerText = initials;
        document.getElementById('drawerTitleName').innerText = client.name || 'Unknown User';
        document.getElementById('drawerTitleEmail').innerText = client.email || '—';

        document.getElementById('editClientName').value = client.name || '';
        document.getElementById('editClientEmail').value = client.email || '';
        document.getElementById('editClientPhone').value = client.phone || '';

        const banBtn = document.getElementById('btnToggleBanDrawer');
        if (banBtn) {
            if (client.isBanned) {
                banBtn.innerHTML = '<i class="ri-checkbox-circle-line"></i> Unban User';
                banBtn.style.background = '#d1fae5';
                banBtn.style.color = '#065f46';
                banBtn.style.border = '1px solid #a7f3d0';
                banBtn.style.padding = '8px 16px';
                banBtn.style.borderRadius = '8px';
                banBtn.style.fontWeight = '700';
                banBtn.style.fontSize = '0.83rem';
                banBtn.style.cursor = 'pointer';
            } else {
                banBtn.innerHTML = '<i class="ri-forbid-2-line"></i> Ban User';
                banBtn.style.background = '#fee2e2';
                banBtn.style.color = '#991b1b';
                banBtn.style.border = '1px solid #fca5a5';
                banBtn.style.padding = '8px 16px';
                banBtn.style.borderRadius = '8px';
                banBtn.style.fontWeight = '700';
                banBtn.style.fontSize = '0.83rem';
                banBtn.style.cursor = 'pointer';
            }
        }
    }

    async function loadWalletDetailsFromDrawer(clientId) {
        const balanceEl = document.getElementById('drawerWalletBalance');
        const walletIdEl = document.getElementById('drawerWalletId');
        const statusEl = document.getElementById('drawerWalletStatus');
        const txnBody = document.getElementById('drawerTxnTableBody');

        if (txnBody) {
            txnBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;"><i class="ri-loader-4-line ri-spin" style="font-size:18px; margin-right:4px; vertical-align:middle;"></i> Loading Transactions...</td></tr>`;
        }

        try {
            const res = await fetch(`/api/admin/clients/${clientId}/wallet`, { credentials: 'include' });
            const data = await res.json();
            if (!data.success) {
                if (txnBody) txnBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#ef4444; font-weight:600;">Error: ${escapeHtml(data.error || 'Failed to load')}</td></tr>`;
                return;
            }

            const wallet = data.wallet || {};
            const transactions = data.transactions || [];

            if (balanceEl) balanceEl.innerText = formatCurrency(wallet.walletBalance || 0);
            if (walletIdEl) {
                walletIdEl.innerHTML = `${escapeHtml(wallet.walletId || 'No ID')} <i class="ri-file-copy-line"></i>`;
                walletIdEl.onclick = (e) => copyToClipboard(wallet.walletId || '', walletIdEl);
            }
            if (statusEl) statusEl.value = wallet.walletStatus || 'Active';

            if (txnBody) {
                if (transactions.length === 0) {
                    txnBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">No transactions found</td></tr>`;
                } else {
                    txnBody.innerHTML = transactions.map(t => {
                        const color = t.type === 'Credit' ? '#16a34a' : '#dc2626';
                        const txnId = t.transactionId || t._id || '';
                        const formattedTxnId = txnId.startsWith('#TXN-') ? txnId : `#TXN-${txnId.slice(-8).toUpperCase()}`;
                        return `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:10px 12px; color:#64748b; text-align:left;">${formatAdminDate(t.createdAt)}</td>
                                <td style="padding:10px 12px; font-weight:700; color:${color}; text-align:left;">${t.type}</td>
                                <td style="padding:10px 12px; font-weight:700; color:${color}; text-align:left;">${formatCurrency(t.amount)}</td>
                                <td style="padding:10px 12px; color:#334155; word-break:break-word; text-align:left;">
                                    <div style="display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
                                        <span style="font-family:monospace; font-size:10px; background:#f1f5f9; color:#475569; padding:2px 6px; border-radius:4px; font-weight:600; cursor:pointer;" onclick="copyToClipboard('${txnId}', this)" title="Click to copy Transaction ID">${formattedTxnId}</span>
                                    </div>
                                    <div style="display:block;">${escapeHtml(t.description)}</div>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        } catch (err) {
            if (txnBody) txnBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#ef4444;">Failed to connect to server</td></tr>`;
        }
    }

    async function toggleBanFromDrawer() {
        if (!currentActiveClientData) return;
        const banStatus = !currentActiveClientData.isBanned;
        const safeName = (currentActiveClientData.name || 'Unknown User').replace(/'/g, "\\'");
        await toggleBan(currentActiveClientData._id, safeName, banStatus);
        
        // Refresh local cache and drawer UI
        await fetchClients();
        const updated = cachedClientsList.find(c => c._id === currentActiveClientId);
        if (updated) {
            currentActiveClientData = updated;
            populateDrawerDetails(updated);
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
            if (result.success) {
                alert('✅ Account restriction status updated successfully.');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Server connection failed');
        }
    }

    async function resetPasswordFromDrawer() {
        if (!currentActiveClientData) return;
        const safeName = (currentActiveClientData.name || 'Unknown User').replace(/'/g, "\\'");
        await adminResetPassword(currentActiveClientData._id, safeName);
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

    async function deleteClientFromDrawer() {
        if (!currentActiveClientData) return;
        const safeName = (currentActiveClientData.name || 'Unknown User').replace(/'/g, "\\'");
        await deleteClient(currentActiveClientData._id, safeName);
        closeClientDetail();
    }

    async function deleteClient(userId, userName) {
        if (!confirm(`🚨 EXTREME WARNING: Are you sure you want to PERMANENTLY DELETE ${userName}?`)) return;
        try {
            const res = await fetch(`/api/admin/delete-client/${userId}`, { method: 'DELETE', credentials: 'include' });
            const result = await res.json();
            if (result.success) {
                alert('✅ Client deleted successfully.');
                fetchClients();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Server connection failed');
        }
    }

    async function saveClientProfile() {
        if (!currentActiveClientId) return;
        const nameInput = document.getElementById('editClientName');
        const emailInput = document.getElementById('editClientEmail');
        const phoneInput = document.getElementById('editClientPhone');

        const name = (nameInput?.value || '').trim();
        const email = (emailInput?.value || '').trim();
        const phone = (phoneInput?.value || '').trim();

        if (!name || !email) {
            alert('⚠️ Name and Email are required.');
            return;
        }

        try {
            const res = await fetch(`/api/admin/clients/${currentActiveClientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Client profile updated successfully.');
                await fetchClients();
                const updated = cachedClientsList.find(c => c._id === currentActiveClientId);
                if (updated) {
                    currentActiveClientData = updated;
                    populateDrawerDetails(updated);
                }
            } else {
                alert('❌ Error: ' + (data.error || 'Update failed.'));
            }
        } catch (err) {
            alert('❌ Failed to connect to server.');
        }
    }

    async function submitWalletAdjustmentFromDrawer(event) {
        event.preventDefault();
        if (!currentActiveClientId) return;

        const amountVal = document.getElementById('drawerAdjAmount')?.value;
        const typeVal = document.getElementById('drawerAdjType')?.value;
        const descVal = document.getElementById('drawerAdjDesc')?.value;
        const allowNegVal = document.getElementById('drawerAdjNeg')?.checked;

        if (!amountVal || !typeVal || !descVal) {
            alert('All adjustment fields are required.');
            return;
        }

        try {
            const res = await fetch(`/api/admin/clients/${currentActiveClientId}/wallet/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amountVal,
                    type: typeVal,
                    description: descVal,
                    allowNegative: allowNegVal
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert(`Success: ${data.message || 'Balance adjusted successfully.'}`);
                document.getElementById('drawerAdjAmount').value = '';
                document.getElementById('drawerAdjDesc').value = '';
                await loadWalletDetailsFromDrawer(currentActiveClientId);
                await fetchClients();
            } else {
                alert(`Error: ${data.error || 'Adjustment failed'}`);
            }
        } catch (err) {
            alert('Connection error');
        }
    }

    async function updateWalletStatusFromDrawer(status) {
        if (!currentActiveClientId) return;
        try {
            const res = await fetch(`/api/admin/clients/${currentActiveClientId}/wallet/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletStatus: status }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert(`Success: ${data.message || 'Wallet status updated.'}`);
                await loadWalletDetailsFromDrawer(currentActiveClientId);
            } else {
                alert(`Error: ${data.error || 'Failed to update status'}`);
            }
        } catch (err) {
            alert('Connection error');
        }
    }

    async function copyToClipboard(text, element) {
        try {
            await navigator.clipboard.writeText(text);
            const origHTML = element.innerHTML;
            element.innerHTML = 'Copied! <i class="ri-check-line"></i>';
            setTimeout(() => {
                element.innerHTML = origHTML;
            }, 1500);
        } catch (err) {
            alert('Failed to copy to clipboard');
        }
    }

    async function fetchStaffTickets() {
        const tbody = document.getElementById('staffTicketsTable');
        const countSpan = document.getElementById('staffTicketCount');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;"><i class="ri-loader-4-line ri-spin" style="font-size:18px;vertical-align:middle;margin-right:4px;"></i> Loading staff tickets...</td></tr>';
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
            const statusColors = { 'Open': '#f59e0b', 'Pending': '#8b5cf6', 'Resolved': '#10b981', 'Closed': '#64748b' };
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
                                <option value="Pending" ${t.status === 'Pending' ? 'selected' : ''}>🟣 Pending</option>
                                <option value="Resolved" ${t.status === 'Resolved' ? 'selected' : ''}>✅ Resolved</option>
                                <option value="Closed" ${t.status === 'Closed' ? 'selected' : ''}>⛔ Closed</option>
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
    
    // Modern side-drawer functions
    window.openClientDetail = openClientDetail;
    window.closeClientDetail = closeClientDetail;
    window.switchDrawerTab = switchDrawerTab;
    window.saveClientProfile = saveClientProfile;
    window.toggleBanFromDrawer = toggleBanFromDrawer;
    window.resetPasswordFromDrawer = resetPasswordFromDrawer;
    window.deleteClientFromDrawer = deleteClientFromDrawer;
    window.updateWalletStatusFromDrawer = updateWalletStatusFromDrawer;
    window.submitWalletAdjustmentFromDrawer = submitWalletAdjustmentFromDrawer;
    window.copyToClipboard = copyToClipboard;
})();
