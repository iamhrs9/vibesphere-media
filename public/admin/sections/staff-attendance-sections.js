(function () {
    const STAFF_SECTION_HTML = "<div id=\"staff-section\" class=\"section\" data-module-mounted=\"true\">\n                <div class=\"premium-section\">\n                    <div class=\"section-header\">\n                        <div>\n                            <h2 class=\"section-title\">Staff Management</h2>\n                            <p class=\"section-subtitle\">Switch between an executive data grid and profile-card view, open teammate details in a slide-over panel, and keep people ops actions tidy.</p>\n                        </div>\n                        <div class=\"section-actions\">\n                            <div class=\"view-toggle\">\n                                <button id=\"staffListViewBtn\" class=\"active\" onclick=\"setStaffViewMode('list')\">List View</button>\n                                <button id=\"staffGridViewBtn\" onclick=\"setStaffViewMode('grid')\">Grid View</button>\n                            </div>\n                            <button onclick=\"fetchStaffData(); fetchPayoutRequests();\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button>\n                        </div>\n                    </div>\n\n                <div class=\"staff-layout staff-workspace\">\n                    <div class=\"workspace-toolbar\" style=\"width:100%;\">\n                        <div class=\"workspace-toolbar-left\" style=\"display:flex;align-items:center;gap:16px;\">\n                            <span class=\"workspace-label\">Workspace</span>\n                            <select id=\"staffWorkspaceSelect\" class=\"workspace-select\" onchange=\"changeStaffWorkspace(this.value)\">\n                                <option value=\"panel-performance\">Work &amp; Performance</option>\n                                <option value=\"panel-assign\">Assign Leads</option>\n                                <option value=\"panel-payouts\">Payout Requests</option>\n                                <option value=\"panel-notices\">Notice Board</option>\n                                <option value=\"panel-leaves\">Leave Requests</option>\n                                <option value=\"panel-attendance\">Attendance Log</option>\n                            </select>\n                        </div>\n                        <div class=\"workspace-toolbar-right\" style=\"display:flex;align-items:center;gap:12px;\">\n                            <button type=\"button\" class=\"workspace-action-btn\" data-staff-action=\"panel-add-staff\" onclick=\"switchStaffView('panel-add-staff', this)\">+ Add Staff</button>\n                            <button type=\"button\" class=\"workspace-action-btn\" data-staff-action=\"panel-access\" onclick=\"switchStaffView('panel-access', this)\">Access Control</button>\n                        </div>\n                    </div>\n                    <div class=\"staff-content\" style=\"width:100%;\">\n\n                        <div id=\"panel-performance\" class=\"staff-panel active\">\n                            <div class=\"staff-card\" style=\"margin-top: 0;\">\n                                <h3 style=\"color: #4f46e5;\">📊 Staff Work Chart</h3>\n                                <div class=\"table-responsive\" style=\"overflow-x: auto; width: 100%;\">\n                                    <table>\n                                        <thead>\n                                            <tr>\n                                                <th>Staff Email</th>\n                                                <th>Total Leads</th>\n                                                <th>Completed</th>\n                                                <th>Pending Calls</th>\n                                                <th>Action</th>\n                                            </tr>\n                                        </thead>\n                                        <tbody id=\"performanceTableBody\"></tbody>\n                                    </table>\n                                </div>\n                            </div>\n                        </div>\n\n                        <div id=\"panel-assign\" class=\"staff-panel\">\n                            <div class=\"staff-card\" style=\"margin-top: 0; border-top: 4px solid #3b82f6;\">\n                                <h3>🎯 Assign New Lead</h3>\n                                <form id=\"assignLeadForm\" style=\"display: flex; flex-direction: column; gap: 15px;\"\n                                    onsubmit=\"submitLead(event)\">\n                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                        <input type=\"text\" id=\"leadClientName\" placeholder=\"Client / Business Name\"\n                                            required>\n                                    </div>\n                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                        <input type=\"text\" id=\"leadContact\" placeholder=\"Contact Number (Phone/Insta)\"\n                                            required>\n                                    </div>\n                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                        <select id=\"leadService\" required>\n                                            <option value=\"\">-- Select Service to Pitch --</option>\n                                            <option value=\"Instagram Growth\">Instagram Growth</option>\n                                            <option value=\"Web Development\">Web Development</option>\n                                            <option value=\"Combo Package\">Combo Package</option>\n                                        </select>\n                                    </div>\n                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                        <select id=\"leadAssignTo\" required>\n                                            <option value=\"\">-- Assign to Staff --</option>\n                                        </select>\n                                    </div>\n                                    <button type=\"submit\" id=\"btnLead\" class=\"btn-publish\"\n                                        style=\"width: 100%; background: #3b82f6;\">Assign Lead 🚀</button>\n                                </form>\n                            </div>\n                        </div>\n\n                        <div id=\"panel-payouts\" class=\"staff-panel\">\n                            <div class=\"staff-card\" style=\"margin-top: 0; border-top: 4px solid #f59e0b;\">\n                                <h3>💸 Staff Payout Requests</h3>\n                                <div class=\"table-responsive\" style=\"overflow-x: auto; width: 100%;\">\n                                    <table>\n                                        <thead>\n                                            <tr>\n                                                <th>Date</th>\n                                                <th>Staff Name</th>\n                                                <th>Requested Amount</th>\n                                                <th>Transfer Details</th>\n                                                <th>Status</th>\n                                                <th>Action</th>\n                                            </tr>\n                                        </thead>\n                                        <tbody id=\"payoutsTableBody\"></tbody>\n                                    </table>\n                                </div>\n                            </div>\n                        </div>\n\n                        <div id=\"panel-leaves\" class=\"staff-panel\">\n                            <div class=\"staff-card\" style=\"margin-top: 0; border-top: 4px solid #f43f5e;\">\n                                <h3>🏖️ Staff Leave Requests</h3>\n                                <div class=\"table-responsive\" style=\"overflow-x: auto; width: 100%;\">\n                                    <table>\n                                        <thead>\n                                            <tr>\n                                                <th>Applied On</th>\n                                                <th>Staff Name</th>\n                                                <th>Dates</th>\n                                                <th>Reason</th>\n                                                <th>Status</th>\n                                                <th>Action</th>\n                                            </tr>\n                                        </thead>\n                                        <tbody id=\"adminLeavesTableBody\"></tbody>\n                                    </table>\n                                </div>\n                            </div>\n                        </div>\n                        <div id=\"panel-notices\" class=\"staff-panel\">\n                            <div class=\"staff-card\"\n                                style=\"margin-top: 0; border-top: 4px solid #10b981; margin-bottom: 20px;\">\n                                <h3>📢 Post Notice (Board)</h3>\n                                <form id=\"addNoticeForm\" style=\"display: flex; flex-direction: column; gap: 15px;\"\n                                    onsubmit=\"submitNotice(event)\">\n                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                        <input type=\"text\" id=\"noticeTitle\"\n                                            placeholder=\"Notice Title (e.g., Target Update!)\" required>\n                                    </div>\n                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                        <textarea id=\"noticeMessage\" rows=\"4\"\n                                            placeholder=\"Type your full message here...\" required></textarea>\n                                    </div>\n                                    <button type=\"submit\" id=\"btnNotice\" class=\"btn-publish\"\n                                        style=\"width: 100%; background: #10b981;\">Send Notice 🔔</button>\n                                </form>\n                            </div>\n\n                            <div class=\"staff-card\">\n                                <h3>📋 Manage Sent Notices</h3>\n                                <div class=\"table-responsive\" style=\"overflow-x: auto; width: 100%;\">\n                                    <table>\n                                        <thead>\n                                            <tr>\n                                                <th>Date</th>\n                                                <th>Title</th>\n                                                <th>Message</th>\n                                                <th>Action</th>\n                                            </tr>\n                                        </thead>\n                                        <tbody id=\"noticesTableBody\"></tbody>\n                                    </table>\n                                </div>\n                            </div>\n                        </div>\n\n\t                        <div id=\"panel-add-staff\" class=\"staff-panel\">\n\t                            <div class=\"staff-card\" style=\"margin-top: 0; max-width: 500px;\">\n\t                                <h3>➕ Add New Staff</h3>\n\t                                <form id=\"addStaffForm\" style=\"display: flex; flex-direction: column; gap: 15px;\">\n                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                        <input type=\"text\" id=\"staffName\" placeholder=\"Full Name\" required>\n                                    </div>\n                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                        <input type=\"email\" id=\"staffEmail\" placeholder=\"Login Email\" required>\n                                    </div>\n                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                        <input type=\"text\" id=\"staffPassword\" placeholder=\"Password\" required>\n                                    </div>\n\t                                    <div class=\"form-group\" style=\"margin-bottom: 0;\">\n\t                                        <select id=\"staffRole\">\n\t                                            <option value=\"Sales Executive\">Sales Executive</option>\n\t                                            <option value=\"Manager\">Manager</option>\n\t                                            <option value=\"Editor\">Editor</option>\n\t                                        </select>\n\t                                    </div>\n                                        <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                            <input type=\"date\" id=\"staffJoiningDate\" placeholder=\"Joining Date\">\n                                        </div>\n                                        <div class=\"form-group\" style=\"margin-bottom: 0;\">\n                                            <input type=\"number\" id=\"staffSalaryCtc\" placeholder=\"Monthly Salary (CTC)\">\n                                        </div>\n\t                                    <button type=\"submit\" class=\"btn-publish\" style=\"width: 100%;\">Create Staff\n\t                                        ID</button>\n\t                                </form>\n\t                            </div>\n\t                        </div>\n\n\t                        <div id=\"panel-access\" class=\"staff-panel\">\n\t                            <div class=\"staff-card staff-access-shell\" style=\"margin-top: 0;\">\n\t                                <div class=\"staff-access-header\">\n                                        <div>\n\t                                        <h3 style=\"margin:0;\">Directory &amp; Access</h3>\n                                            <p class=\"section-subtitle\" style=\"margin-top:6px;\">Browse employees as cards or rows, review live status, and open a focused side panel for details.</p>\n                                        </div>\n                                        <div class=\"view-toggle\">\n                                            <button class=\"active\" onclick=\"setStaffViewMode('list')\">List</button>\n                                            <button onclick=\"setStaffViewMode('grid')\">Grid</button>\n                                        </div>\n                                    </div>\n                                    <div class=\"toolbar-card\">\n                                        <div class=\"toolbar-grid\">\n                                            <div class=\"toolbar-field\">\n                                                <label>Global Search Mirror</label>\n                                                <input id=\"staffSearchMirror\" type=\"text\" placeholder=\"Search by name or employee ID\" readonly>\n                                            </div>\n                                            <div class=\"toolbar-field\">\n                                                <label>Live Status Filter</label>\n                                                <select id=\"staffStatusFilter\" onchange=\"handleStaffFilterChange()\">\n                                                    <option value=\"all\">All Staff</option>\n                                                    <option value=\"active\">Active / Online</option>\n                                                    <option value=\"inactive\">Inactive / Offline</option>\n                                                </select>\n                                            </div>\n                                            <div class=\"toolbar-field\">\n                                                <label>Page Size</label>\n                                                <select id=\"staffPageSize\" onchange=\"handleStaffFilterChange()\">\n                                                    <option value=\"8\">8 rows</option>\n                                                    <option value=\"12\">12 rows</option>\n                                                    <option value=\"20\">20 rows</option>\n                                                </select>\n                                            </div>\n                                        </div>\n                                    </div>\n                                    <div id=\"staffDirectoryMeta\" class=\"section-subtitle\" style=\"margin-top:-4px;\"></div>\n\t                                <div id=\"staffListView\" class=\"table-responsive data-grid\" style=\"overflow-x: auto; width: 100%;\">\n\t                                    <table>\n\t                                        <thead>\n                                            <tr>\n                                                <th>Name</th>\n                                                <th>Email</th>\n                                                <th>Role</th>\n                                                <th>Status</th>\n                                                <th>Target</th>\n                                                <th>Action</th>\n                                            </tr>\n\t                                        </thead>\n\t                                        <tbody id=\"staffTableBody\"></tbody>\n\t                                    </table>\n\t                                </div>\n                                    <div id=\"staffGridView\" class=\"staff-view-grid\" style=\"display:none;\"></div>\n                                    <div id=\"staffPagination\" class=\"pagination-bar\"></div>\n\t                            </div>\n\t                        </div>\n\n                            <div id=\"panel-attendance\" class=\"staff-panel\">\n                                <div class=\"staff-card\" style=\"margin-top:0;\">\n                                    <div class=\"staff-access-header\">\n                                        <div>\n                                            <h3 style=\"margin:0;\">Attendance Log</h3>\n                                            <p class=\"section-subtitle\" style=\"margin-top:6px;\">Review attendance inside the workspace without leaving staff operations.</p>\n                                        </div>\n                                        <button onclick=\"fetchAdminAttendance('workspace')\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button>\n                                    </div>\n                                    <div class=\"toolbar-card\">\n                                        <div class=\"toolbar-grid\">\n                                            <div class=\"toolbar-field\">\n                                                <label>Global Search Mirror</label>\n                                                <input id=\"attendanceSearchMirrorWorkspace\" type=\"text\" placeholder=\"Search by name, email or employee ID\" readonly>\n                                            </div>\n                                            <div class=\"toolbar-field\">\n                                                <label>Status</label>\n                                                <select id=\"attendanceStatusFilterWorkspace\" onchange=\"handleAttendanceFilterChange('workspace')\">\n                                                    <option value=\"all\">All Statuses</option>\n                                                    <option value=\"Present\">Present</option>\n                                                    <option value=\"Absent\">Absent</option>\n                                                    <option value=\"Leave\">Leave</option>\n                                                </select>\n                                            </div>\n                                            <div class=\"toolbar-field\">\n                                                <label>Month</label>\n                                                <select id=\"attendanceMonthFilterAdminWorkspace\" onchange=\"handleAttendanceFilterChange('workspace')\"></select>\n                                            </div>\n                                            <div class=\"toolbar-field\">\n                                                <label>Year</label>\n                                                <select id=\"attendanceYearFilterAdminWorkspace\" onchange=\"handleAttendanceFilterChange('workspace')\"></select>\n                                            </div>\n                                        </div>\n                                    </div>\n                                    <div class=\"table-responsive\" style=\"overflow-x:auto; width:100%;\">\n                                        <table class=\"attendance-table\">\n                                            <thead>\n                                                <tr>\n                                                    <th>Date</th>\n                                                    <th>Employee</th>\n                                                    <th>Emp ID</th>\n                                                    <th>Status</th>\n                                                    <th>Check In</th>\n                                                    <th>Check Out</th>\n                                                    <th>Worked</th>\n                                                </tr>\n                                            </thead>\n                                            <tbody id=\"adminAttendanceWorkspaceTableBody\">\n                                                <tr><td colspan=\"7\" style=\"text-align:center;padding:20px;color:#64748b;\">Attendance data will appear here.</td></tr>\n                                            </tbody>\n                                        </table>\n                                    </div>\n                                    <div id=\"adminAttendanceWorkspacePagination\" class=\"pagination-bar\"></div>\n                                </div>\n                            </div>\n\n\t                    </div>\n\t                </div>\n                </div>\n\t            </div>\n<div id=\"staffSlideover\" class=\"slideover\">\n                <div class=\"slideover-backdrop\" onclick=\"closeStaffSlideover()\"></div>\n                <div class=\"slideover-panel\">\n                    <div style=\"display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;\">\n                        <strong style=\"font-size:1.1rem;\">Staff Profile</strong>\n                        <button class=\"slideover-close\" onclick=\"closeStaffSlideover()\">×</button>\n                    </div>\n                    <div id=\"staffSlideoverBody\"></div>\n                </div>\n            </div>\n<div id=\"staffWorkModal\"\n                style=\"display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 3000; justify-content: center; align-items: center;\">\n                <div\n                    style=\"background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 800px; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.2); max-height: 80vh; overflow-y: auto;\">\n                    <span onclick=\"closeStaffWork()\"\n                        style=\"position: absolute; right: 20px; top: 15px; cursor: pointer; font-size: 24px; color: #64748b;\">&times;</span>\n                    <h2 id=\"workModalTitle\" style=\"margin-bottom: 20px; color: #1e293b;\">Work Details</h2>\n                    <div class=\"table-responsive\" style=\"overflow-x: auto; width: 100%;\">\n                        <table>\n                            <thead>\n                                <tr>\n                                    <th>Client & Contact</th>\n                                    <th>Service</th>\n                                    <th>Status</th>\n                                    <th>Staff Notes</th>\n                                    <th>Action</th>\n                                </tr>\n                            </thead>\n                            <tbody id=\"workModalBody\"></tbody>\n                        </table>\n                    </div>\n                </div>\n            </div>";
    const ATTENDANCE_SECTION_HTML = "<div id=\"attendance-section\" class=\"section\" data-module-mounted=\"true\">\n                <div style=\"display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px;\">\n                    <div>\n                        <h2 class=\"section-title\">Attendance &amp; Shifts</h2>\n                        <p class=\"section-subtitle\">Fast, paginated attendance logs with month filters and search-linked employee discovery.</p>\n                    </div>\n                    <button onclick=\"fetchAdminAttendance()\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button>\n                </div>\n                <div class=\"toolbar-card\">\n                    <div class=\"toolbar-grid\">\n                        <div class=\"toolbar-field\">\n                            <label>Global Search Mirror</label>\n                            <input id=\"attendanceSearchMirror\" type=\"text\" placeholder=\"Search by name, email or employee ID\" readonly>\n                        </div>\n                        <div class=\"toolbar-field\">\n                            <label>Status</label>\n                            <select id=\"attendanceStatusFilter\" onchange=\"handleAttendanceFilterChange()\">\n                                <option value=\"all\">All Statuses</option>\n                                <option value=\"Present\">Present</option>\n                                <option value=\"Absent\">Absent</option>\n                                <option value=\"Leave\">Leave</option>\n                            </select>\n                        </div>\n                        <div class=\"toolbar-field\">\n                            <label>Month</label>\n                            <select id=\"attendanceMonthFilterAdmin\" onchange=\"handleAttendanceFilterChange()\"></select>\n                        </div>\n                        <div class=\"toolbar-field\">\n                            <label>Year</label>\n                            <select id=\"attendanceYearFilterAdmin\" onchange=\"handleAttendanceFilterChange()\"></select>\n                        </div>\n                    </div>\n                </div>\n                <div class=\"table-responsive\" style=\"overflow-x:auto; width:100%;\">\n                    <table class=\"attendance-table\">\n                        <thead>\n                            <tr>\n                                <th>Date</th>\n                                <th>Employee</th>\n                                <th>Emp ID</th>\n                                <th>Status</th>\n                                <th>Check In</th>\n                                <th>Check Out</th>\n                                <th>Worked</th>\n                            </tr>\n                        </thead>\n                        <tbody id=\"adminAttendanceTableBody\">\n                            <tr><td colspan=\"7\" style=\"text-align:center;padding:20px;color:#64748b;\">Attendance data will appear here.</td></tr>\n                        </tbody>\n                    </table>\n                </div>\n                <div id=\"adminAttendancePagination\" class=\"pagination-bar\"></div>\n            </div>";
    let staffDomBound = false;
    let staffRealtimeBound = false;
    let adminBountyTaskCache = [];
    let adminBountyStaffOptionsLoaded = false;

    function mountSections() {
        const staffTarget = document.getElementById('staff-section');
        if (staffTarget && staffTarget.dataset.moduleMounted !== 'true') {
            staffTarget.outerHTML = STAFF_SECTION_HTML;
        }

        const attendanceTarget = document.getElementById('attendance-section');
        if (attendanceTarget && attendanceTarget.dataset.moduleMounted !== 'true') {
            attendanceTarget.outerHTML = ATTENDANCE_SECTION_HTML;
        }

        ensureStaffBountyWorkspace();
        bindStaffDom();
    }

    function ensureStaffBountyWorkspace() {
        const workspaceSelect = document.getElementById('staffWorkspaceSelect');
        if (workspaceSelect && !workspaceSelect.querySelector('option[value="panel-bounties"]')) {
            workspaceSelect.insertAdjacentHTML('beforeend', '<option value="panel-bounties">Task Bounties</option>');
        }

        const staffContent = document.querySelector('#staff-section .staff-content');
        const payoutPanel = document.getElementById('panel-payouts');
        if (staffContent && payoutPanel && !document.getElementById('panel-bounties')) {
            payoutPanel.insertAdjacentHTML('afterend', `
                <div id="panel-bounties" class="staff-panel">
                    <div class="staff-card" style="margin-top:0;border-top:4px solid #8b5cf6;">
                        <div class="staff-access-header">
                            <div>
                                <h3 style="margin:0;">Task Bounties</h3>
                                <p class="section-subtitle" style="margin-top:6px;">Assign payout-based tasks, review submissions, and approve bounty payouts.</p>
                            </div>
                            <button onclick="fetchAdminBountyTasks(true)" class="section-refresh-btn"><i class="ri-refresh-line"></i> Refresh</button>
                        </div>
                        <form id="adminBountyTaskForm" style="margin-bottom:20px;" onsubmit="createAdminBountyTask(event)">
                            <div class="toolbar-grid">
                                <div class="toolbar-field">
                                    <label>Assign To</label>
                                    <select id="bountyAssignedStaff" required>
                                        <option value="">Select staff member</option>
                                    </select>
                                </div>
                                <div class="toolbar-field">
                                    <label>Task Title</label>
                                    <input type="text" id="bountyTaskTitle" placeholder="e.g. Edit brand reel" required>
                                </div>
                                <div class="toolbar-field">
                                    <label>Bounty Amount</label>
                                    <input type="number" id="bountyTaskAmount" min="1" step="1" placeholder="1500" required>
                                </div>
                            </div>
                            <div class="toolbar-field" style="margin-top:14px;">
                                <label>Description</label>
                                <textarea id="bountyTaskDescription" rows="3" placeholder="Explain scope, deliverables, and deadline."></textarea>
                            </div>
                            <div style="display:flex;justify-content:flex-end;margin-top:14px;">
                                <button type="submit" class="btn-publish">Assign Task</button>
                            </div>
                        </form>
                        <div class="modern-table-shell" style="margin-bottom:20px;">
                            <div class="table-head">
                                <div>
                                    <h3 style="margin:0;font-size:1.02rem;color:var(--text);">Review Queue</h3>
                                    <p class="section-subtitle" style="margin-top:6px;">Submitted tasks waiting for approval or revision.</p>
                                </div>
                            </div>
                            <div class="table-responsive" style="overflow-x:auto;width:100%;">
                                <table class="modern-list-table">
                                    <thead>
                                        <tr>
                                            <th>Task</th>
                                            <th>Staff</th>
                                            <th>Bounty</th>
                                            <th>Submission</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="bountyReviewQueueBody">
                                        <tr><td colspan="5" style="text-align:center;color:#64748b;padding:20px;">Loading review queue...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modern-table-shell">
                            <div class="table-head">
                                <div>
                                    <h3 style="margin:0;font-size:1.02rem;color:var(--text);">All Bounty Tasks</h3>
                                    <p class="section-subtitle" style="margin-top:6px;">Track assignment, revision notes, submission links, and approved payouts.</p>
                                </div>
                            </div>
                            <div class="table-responsive" style="overflow-x:auto;width:100%;">
                                <table class="modern-list-table">
                                    <thead>
                                        <tr>
                                            <th>Created</th>
                                            <th>Task</th>
                                            <th>Staff</th>
                                            <th>Status</th>
                                            <th>Submission</th>
                                            <th>Feedback</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="bountyAllTasksBody">
                                        <tr><td colspan="7" style="text-align:center;color:#64748b;padding:20px;">Loading tasks...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }
    }

    function bindStaffDom() {
        if (staffDomBound) return;
        staffDomBound = true;

        document.getElementById('staffSalaryCtc')?.closest('.form-group')?.remove();

        document.addEventListener('click', function (event) {
            if (!event.target.closest('.staff-menu-container')) {
                document.querySelectorAll('.staff-action-menu').forEach((menu) => {
                    menu.style.display = 'none';
                });
            }
        });

        document.getElementById('addStaffForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.innerText = 'Creating...';
            const newStaff = {
                name: document.getElementById('staffName').value,
                email: document.getElementById('staffEmail').value,
                password: document.getElementById('staffPassword').value,
                role: document.getElementById('staffRole').value,
                joiningDate: document.getElementById('staffJoiningDate').value
            };
            try {
                const res = await fetch('/api/admin/add-staff', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newStaff),
                    credentials: 'include'
                });
                const result = await res.json();
                if (result.success) {
                    alert('✅ ' + result.message);
                    document.getElementById('addStaffForm').reset();
                    adminUiState.staffOptionsLoaded = false;
                    populateStaffAssignDropdown(true);
                    fetchDashboardSummary();
                    fetchStaffData();
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (err) {
                alert('Server connection failed');
            }
            btn.innerText = 'Create Staff ID';
        });
    }

                function getStaffRoleLabel(roleValue) {
                    const roles = Array.isArray(roleValue)
                        ? roleValue
                        : String(roleValue || '').split(',');
                    return roles
                        .map((role) => String(role || '').trim())
                        .filter(Boolean)
                        .join(', ') || 'Staff';
                }

                function buildStaffEditPanel(staff) {
                    return `
                        <div id="staffProfileEditPanel" class="toolbar-card" style="display:none;margin-top:18px;">
                            <div class="toolbar-grid">
                                <div class="toolbar-field">
                                    <label>Full Name</label>
                                    <input type="text" id="staffEditName" value="${escapeHtml(staff.name || '')}" placeholder="Full Name">
                                </div>
                                <div class="toolbar-field">
                                    <label>Role(s)</label>
                                    <input type="text" id="staffEditRoles" value="${escapeHtml(getStaffRoleLabel(staff.role))}" placeholder="Sales Executive, Video Editor">
                                    <div class="section-subtitle" style="margin-top:6px;">Use comma-separated roles for multi-role staff.</div>
                                </div>
                                <div class="toolbar-field">
                                    <label>Joining Date</label>
                                    ${staff.joiningDate
                            ? `<div style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#0f172a;font-weight:600;">${formatAdminDate(staff.joiningDate)}</div>
                                       <div class="section-subtitle" style="margin-top:6px;">Joining date is already set and can’t be edited.</div>`
                            : `<input type="date" id="staffEditJoiningDate">
                                       <div class="section-subtitle" style="margin-top:6px;">This can only be set once.</div>`}
                                </div>
                            </div>
                            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
                                <button class="btn-publish" onclick="saveStaffProfileEdits('${staff._id}')">Save Profile</button>
                                <button class="btn-ghost" onclick="toggleStaffProfileEditor(false)">Cancel</button>
                            </div>
                        </div>
                    `;
                }

                window.toggleStaffProfileEditor = function (forceState) {
                    const panel = document.getElementById('staffProfileEditPanel');
                    const trigger = document.getElementById('staffProfileEditToggle');
                    if (!panel) return;

                    const shouldOpen = typeof forceState === 'boolean'
                        ? forceState
                        : panel.style.display !== 'block';

                    panel.style.display = shouldOpen ? 'block' : 'none';
                    if (trigger) trigger.innerText = shouldOpen ? 'Close Edit' : 'Edit Profile';
                };

                window.saveStaffProfileEdits = async function (staffId) {
                    const payload = {
                        name: document.getElementById('staffEditName')?.value || '',
                        role: document.getElementById('staffEditRoles')?.value || ''
                    };
                    const joiningDateInput = document.getElementById('staffEditJoiningDate');
                    if (joiningDateInput) payload.joiningDate = joiningDateInput.value;

                    try {
                        const res = await fetch(`/api/admin/staff/${staffId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                            credentials: 'include'
                        });
                        const result = await res.json();
                        if (!result.success) {
                            return showToast(result.message || 'Failed to update staff profile.', 'error');
                        }

                        showToast(result.message || 'Staff profile updated.', 'success');
                        adminUiState.staffOptionsLoaded = false;
                        await populateStaffAssignDropdown(true);
                        await fetchStaffData();

                        const refreshed = (adminUiState.staffRecords || []).find((item) => item._id === staffId || item.email === result.staff?.email);
                        if (refreshed) openStaffSlideover(refreshed.email);
                    } catch (e) {
                        showToast('Failed to update staff profile.', 'error');
                    }
                };

                function syncSearchMirrors() {
                    const value = adminUiState.globalSearch;
                    const staffMirror = document.getElementById('staffSearchMirror');
                    const attendanceMirror = document.getElementById('attendanceSearchMirror');
                    const attendanceWorkspaceMirror = document.getElementById('attendanceSearchMirrorWorkspace');
                    if (staffMirror) staffMirror.value = value;
                    if (attendanceMirror) attendanceMirror.value = value;
                    if (attendanceWorkspaceMirror) attendanceWorkspaceMirror.value = value;
                }

                function seedAdminAttendanceFilters() {
                    const monthSelect = document.getElementById('attendanceMonthFilterAdmin');
                    const yearSelect = document.getElementById('attendanceYearFilterAdmin');
                    const workspaceMonthSelect = document.getElementById('attendanceMonthFilterAdminWorkspace');
                    const workspaceYearSelect = document.getElementById('attendanceYearFilterAdminWorkspace');
                    const monthOptions = Array.from({ length: 12 }).map((_, index) => {
                        const month = index + 1;
                        return `<option value="${month}">${adminMonthLabel(month, 2026).replace(/\s+\d+$/, '')}</option>`;
                    }).join('');
                    const currentYear = new Date().getFullYear();
                    const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]
                        .map((year) => `<option value="${year}">${year}</option>`).join('');

                    [monthSelect, workspaceMonthSelect].forEach((select) => {
                        if (!select) return;
                        select.innerHTML = monthOptions;
                        select.value = adminUiState.attendanceMonth;
                    });

                    [yearSelect, workspaceYearSelect].forEach((select) => {
                        if (!select) return;
                        select.innerHTML = yearOptions;
                        select.value = adminUiState.attendanceYear;
                    });
                }

                const workspacePanelIds = new Set(['panel-performance', 'panel-assign', 'panel-payouts', 'panel-bounties', 'panel-notices', 'panel-leaves', 'panel-attendance']);

                window.changeStaffWorkspace = function (panelId) {
                    window.switchStaffView(panelId, null);
                };

                window.switchStaffView = function (panelId, element) {
                    document.querySelectorAll('.staff-panel').forEach(p => p.classList.remove('active'));
                    document.querySelectorAll('.workspace-action-btn[data-staff-action]').forEach((button) => {
                        button.classList.toggle('active', button.dataset.staffAction === panelId);
                    });

                    const targetPanel = document.getElementById(panelId);
                    if (targetPanel) targetPanel.classList.add('active');
                    if (element?.dataset?.staffAction) {
                        element.classList.add('active');
                    }

                    const workspaceSelect = document.getElementById('staffWorkspaceSelect');
                    if (workspaceSelect && workspacePanelIds.has(panelId)) {
                        workspaceSelect.value = panelId;
                    }

                    if (panelId === 'panel-access') fetchStaffData();
                    if (panelId === 'panel-assign') populateStaffAssignDropdown();
                    if (panelId === 'panel-payouts') fetchPayoutRequests();
                    if (panelId === 'panel-bounties') fetchAdminBountyTasks(true);
                    if (panelId === 'panel-leaves') fetchAllLeaves();
                    if (panelId === 'panel-attendance') fetchAdminAttendance('workspace');
                }


                function handleStaffFilterChange() {
                    adminUiState.staffStatus = document.getElementById('staffStatusFilter')?.value || 'all';
                    adminUiState.staffLimit = Number(document.getElementById('staffPageSize')?.value || 8);
                    adminUiState.staffPage = 1;
                    fetchStaffData();
                }

                window.handleStaffFilterChange = handleStaffFilterChange;

                window.changeStaffPage = function (delta) {
                    const nextPage = adminUiState.staffPage + delta;
                    if (nextPage < 1 || nextPage > adminUiState.staffTotalPages) return;
                    adminUiState.staffPage = nextPage;
                    fetchStaffData();
                };

                function renderStaffDirectoryViews(records = []) {
                    const staffTbody = document.getElementById('staffTableBody');
                    const cardGrid = document.getElementById('staffGridView');
                    const meta = document.getElementById('staffDirectoryMeta');
                    if (meta) meta.innerText = `${adminUiState.staffTotal} people matched the current search and filters.`;

                    if (staffTbody) {
                        if (!records.length) {
                            staffTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:20px;">No staff matched the current filters.</td></tr>';
                        } else {
                            staffTbody.innerHTML = records.map((staff) => `
                                <tr>
                                    <td>
                                        <div class="staff-table-name">
                                            ${renderAvatarMarkup(staff)}
                                            <button onclick="openStaffSlideover('${escapeHtml(staff.email)}')">
                                                <strong>${escapeHtml(staff.name)}</strong><br>
                                                <small style="color:#94a3b8;">${escapeHtml(staff.empId || 'No ID yet')}</small>
                                            </button>
                                        </div>
                                    </td>
                                    <td>${escapeHtml(staff.email)}</td>
                                    <td><span style="background:#eff6ff;color:#1d4ed8;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700;">${escapeHtml(getStaffRoleLabel(staff.role))}</span></td>
                                    <td>${describeStaffStatus(staff)}</td>
                                    <td><strong style="color:#1d4ed8;">${formatCurrency(staff.monthlyTarget || 50000)}</strong></td>
                                    <td>
                                        <div class="staff-menu-container">
                                            <button class="staff-menu-button" onclick="toggleStaffActionMenu(event, 'staff-menu-${escapeHtml(staff.email)}')">⋮</button>
                                            <div id="staff-menu-${escapeHtml(staff.email)}" class="staff-action-menu">
                                                <button onclick="openStaffSlideover('${escapeHtml(staff.email)}')">Edit Profile</button>
                                                <button onclick="openStaffAttendanceView('${escapeHtml(staff.email)}')">View Attendance</button>
                                                <button onclick="deleteStaff('${staff._id}')">Revoke Access</button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `).join('');
                        }
                    }

                    if (cardGrid) {
                        if (!records.length) {
                            cardGrid.innerHTML = '<div class="chat-empty" style="grid-column:1/-1;">No staff records found for the active filters.</div>';
                        } else {
                            cardGrid.innerHTML = records.map((staff) => `
                                <article class="staff-profile-card">
                                    <div class="staff-profile-top">
                                        <div style="display:flex;gap:12px;align-items:center;min-width:0;">
                                            ${renderAvatarMarkup(staff)}
                                            <div class="staff-meta">
                                                <h4>${escapeHtml(staff.name)}</h4>
                                                <p>${escapeHtml(getStaffRoleLabel(staff.role))}</p>
                                            </div>
                                        </div>
                                        <div class="staff-menu-container">
                                            <button class="staff-menu-button" onclick="toggleStaffActionMenu(event, 'staff-menu-${escapeHtml(staff.email)}-grid')">⋮</button>
                                            <div id="staff-menu-${escapeHtml(staff.email)}-grid" class="staff-action-menu">
                                                <button onclick="openStaffSlideover('${escapeHtml(staff.email)}')">Edit Profile</button>
                                                <button onclick="openStaffAttendanceView('${escapeHtml(staff.email)}')">View Attendance</button>
                                                <button onclick="deleteStaff('${staff._id}')">Revoke Access</button>
                                            </div>
                                        </div>
                                    </div>
                                    ${describeStaffStatus(staff)}
                                    <div class="staff-profile-stats">
                                        <div class="mini-stat">
                                            <span class="label">Employee ID</span>
                                            <span class="value">${escapeHtml(staff.empId || 'Pending')}</span>
                                        </div>
                                        <div class="mini-stat">
                                            <span class="label">Monthly Target</span>
                                            <span class="value">${formatCurrency(staff.monthlyTarget || 50000)}</span>
                                        </div>
                                        <div class="mini-stat">
                                            <span class="label">Joining Date</span>
                                            <span class="value">${staff.joiningDate ? formatAdminDate(staff.joiningDate) : 'Not set'}</span>
                                        </div>
                                        <div class="mini-stat">
                                            <span class="label">Role(s)</span>
                                            <span class="value">${escapeHtml(getStaffRoleLabel(staff.role))}</span>
                                        </div>
                                    </div>
                                    <div class="staff-card-actions">
                                        <button class="btn-ghost" onclick="openStaffSlideover('${escapeHtml(staff.email)}')">Open Profile</button>
                                        <button class="btn-publish" onclick="openStaffAttendanceView('${escapeHtml(staff.email)}')">Attendance</button>
                                    </div>
                                </article>
                            `).join('');
                        }
                    }

                    const listView = document.getElementById('staffListView');
                    if (listView) listView.style.display = adminUiState.staffView === 'list' ? 'block' : 'none';
                    if (cardGrid) cardGrid.style.display = adminUiState.staffView === 'grid' ? 'grid' : 'none';
                    document.querySelectorAll('.view-toggle button').forEach((button) => {
                        if (button.closest('#staff-section')) {
                            button.classList.toggle('active', button.innerText.toLowerCase().includes(adminUiState.staffView));
                        }
                    });
                }

                window.setStaffViewMode = function (mode) {
                    adminUiState.staffView = mode === 'grid' ? 'grid' : 'list';
                    renderStaffDirectoryViews(adminUiState.staffRecords || []);
                };

                window.toggleStaffActionMenu = function (event, menuId) {
                    if (event) event.stopPropagation();
                    document.querySelectorAll('.staff-action-menu').forEach((menu) => {
                        const shouldOpen = menu.id === menuId;
                        menu.style.display = shouldOpen && menu.style.display !== 'block' ? 'block' : 'none';
                    });
                };

                window.openStaffAttendanceView = function (email) {
                    adminUiState.globalSearch = email;
                    const search = document.getElementById('adminGlobalSearch');
                    if (search) search.value = email;
                    syncSearchMirrors();
                    if (adminUiState.activeSection !== 'staff-section') {
                        navTo('staff-section', document.querySelector('.sidebar-link[data-label="Staff Mgmt"]'));
                    }
                    switchStaffView('panel-attendance', null);
                    fetchAdminAttendance('workspace');
                };

                window.closeStaffSlideover = function () {
                    document.getElementById('staffSlideover')?.classList.remove('open');
                    adminUiState.selectedStaff = null;
                };

                window.openStaffSlideover = function (email) {
                    const staff = (adminUiState.staffRecords || []).find((item) => item.email === email);
                    if (!staff) return;
                    adminUiState.selectedStaff = staff;
                    const body = document.getElementById('staffSlideoverBody');
                    if (!body) return;
                    body.innerHTML = `
                        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
                            ${renderAvatarMarkup(staff, 'lg')}
                            <div>
                                <h3 style="margin:0 0 6px;">${escapeHtml(staff.name)}</h3>
                                <div style="color:var(--muted);font-size:0.92rem;">${escapeHtml(getStaffRoleLabel(staff.role))} • ${escapeHtml(staff.email)}</div>
                            </div>
                        </div>
                        <div style="margin-bottom:16px;">${describeStaffStatus(staff)}</div>
                        <div class="staff-profile-stats" style="margin-bottom:18px;">
                            <div class="mini-stat"><span class="label">Employee ID</span><span class="value">${escapeHtml(staff.empId || 'Pending')}</span></div>
                            <div class="mini-stat"><span class="label">Role(s)</span><span class="value">${escapeHtml(getStaffRoleLabel(staff.role))}</span></div>
                            <div class="mini-stat"><span class="label">Joining Date</span><span class="value">${staff.joiningDate ? formatAdminDate(staff.joiningDate) : 'Not set'}</span></div>
                            <div class="mini-stat"><span class="label">Current Target</span><span class="value">${formatCurrency(staff.monthlyTarget || 50000)}</span></div>
                        </div>
                        <div class="toolbar-field" style="margin-bottom:14px;">
                            <label>Edit Monthly Target</label>
                            <input type="number" id="staffSlideoverTarget" value="${Number(staff.monthlyTarget || 50000)}">
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <button class="btn-ghost" id="staffProfileEditToggle" onclick="toggleStaffProfileEditor()">Edit Profile</button>
                            <button class="btn-publish" onclick="saveStaffTargetFromSlideover('${escapeHtml(staff.email)}')">Save Target</button>
                            <button class="btn-ghost" onclick="openStaffAttendanceView('${escapeHtml(staff.email)}')">View Attendance</button>
                            <button class="btn-ghost" onclick="viewStaffWork('${escapeHtml(staff.email)}')">Work Details</button>
                        </div>
                        ${buildStaffEditPanel(staff)}
                    `;
                    document.getElementById('staffSlideover')?.classList.add('open');
                };

                window.saveStaffTargetFromSlideover = async function (email) {
                    const value = Number(document.getElementById('staffSlideoverTarget')?.value || 0);
                    if (!value || value <= 0) return showToast('Enter a valid monthly target.', 'warning');
                    await window.updateStaffTarget(email, value, true);
                };

                async function fetchStaffData() {
                    const staffTbody = document.getElementById('staffTableBody');
                    const grid = document.getElementById('staffGridView');
                    const perfTbody = document.getElementById('performanceTableBody');
                    const shouldRefreshPerformance = document.getElementById('panel-performance')?.classList.contains('active');
                    if (staffTbody) staffTbody.innerHTML = renderLoadingRows(6, 4);
                    if (grid) grid.innerHTML = '';
                    if (perfTbody && shouldRefreshPerformance) perfTbody.innerHTML = renderLoadingRows(5, 3);
                    try {
                        const staffQuery = new URLSearchParams({
                            page: String(adminUiState.staffPage),
                            limit: String(adminUiState.staffLimit),
                            status: adminUiState.staffStatus,
                            search: adminUiState.globalSearch
                        });
                        const staffRes = await fetch(`/api/admin/staff-directory?${staffQuery.toString()}`, { credentials: 'include' });
                        const staffData = await staffRes.json();

                        if (!staffData.success) throw new Error(staffData.message || 'Failed to load staff directory.');

                        adminUiState.staffPage = staffData.pagination?.page || 1;
                        adminUiState.staffTotalPages = staffData.pagination?.totalPages || 1;
                        adminUiState.staffTotal = staffData.pagination?.total || 0;
                        adminUiState.staffRecords = staffData.staff || [];
                        renderStaffDirectoryViews(adminUiState.staffRecords);

                        renderPagination('staffPagination', adminUiState.staffPage, adminUiState.staffTotalPages, adminUiState.staffTotal, 'staff record', 'changeStaffPage(-1)', 'changeStaffPage(1)');
                        if (shouldRefreshPerformance) {
                            const perfRes = await fetch('/api/admin/staff-performance', { credentials: 'include' });
                            const perfData = await perfRes.json();
                            if (perfTbody && perfData.success && perfData.performance) {
                                globalPerformanceData = perfData.performance;
                                perfTbody.innerHTML = Object.keys(perfData.performance).map((email) => {
                                    const p = perfData.performance[email];
                                    return `
                                        <tr>
                                            <td><strong>${email}</strong></td>
                                            <td style="font-weight:800;">${p.total}</td>
                                            <td style="color:#16a34a;">${p.completed} ✓</td>
                                            <td style="color:#dc2626;">${p.pending} ⏳</td>
                                            <td><button onclick="viewStaffWork('${email}')" class="btn-publish" style="padding:8px 12px; font-size:12px;">View Details 👁️</button></td>
                                        </tr>
                                    `;
                                }).join('');
                            }
                        }
                        updateTopbarStatus('Staff directory loaded');
                    } catch (e) {
                        console.error("Error fetching staff data", e);
                        if (staffTbody) staffTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:20px;">Failed to load staff directory.</td></tr>';
                        showToast(e.message || 'Failed to load staff directory.', 'error');
                    }
                }

                async function fetchAdminAttendance(context = 'section') {
                    const ids = context === 'workspace'
                        ? {
                            tbody: 'adminAttendanceWorkspaceTableBody',
                            pagination: 'adminAttendanceWorkspacePagination'
                        }
                        : {
                            tbody: 'adminAttendanceTableBody',
                            pagination: 'adminAttendancePagination'
                        };
                    const tbody = document.getElementById(ids.tbody);
                    if (tbody) tbody.innerHTML = renderLoadingRows(7, 5);
                    try {
                        const params = new URLSearchParams({
                            page: String(adminUiState.attendancePage),
                            limit: String(adminUiState.attendanceLimit),
                            status: adminUiState.attendanceStatus,
                            month: String(adminUiState.attendanceMonth),
                            year: String(adminUiState.attendanceYear),
                            search: adminUiState.globalSearch
                        });
                        const res = await fetch(`/api/admin/attendance-log?${params.toString()}`, { credentials: 'include' });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.message || 'Failed to load attendance logs.');

                        adminUiState.attendancePage = data.pagination?.page || 1;
                        adminUiState.attendanceTotalPages = data.pagination?.totalPages || 1;
                        adminUiState.attendanceTotal = data.pagination?.total || 0;

                        if (tbody) {
                            if (!(data.attendance || []).length) {
                                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:20px;">No attendance records matched the current filters.</td></tr>';
                            } else {
                                tbody.innerHTML = data.attendance.map((row) => `
                                    <tr>
                                        <td class="attendance-secondary">${row.dateString || '—'}</td>
                                        <td><span class="attendance-primary">${escapeHtml(row.staffName || row.staffEmail || 'Unknown')}</span><br><span class="attendance-secondary">${escapeHtml(row.staffEmail || '—')}</span></td>
                                        <td class="attendance-secondary">${escapeHtml(row.empId || '—')}</td>
                                        <td>${attendanceStatusBadge(row.status)}</td>
                                        <td class="attendance-secondary">${formatAdminTime(row.checkInTime)}</td>
                                        <td class="attendance-secondary">${formatAdminTime(row.checkOutTime)}</td>
                                        <td class="attendance-primary">${formatAdminDuration(row.totalWorkingMsLive)}</td>
                                    </tr>
                                `).join('');
                            }
                        }

                        const prevAction = context === 'workspace' ? 'changeWorkspaceAttendancePage(-1)' : 'changeAttendancePage(-1)';
                        const nextAction = context === 'workspace' ? 'changeWorkspaceAttendancePage(1)' : 'changeAttendancePage(1)';
                        renderPagination(ids.pagination, adminUiState.attendancePage, adminUiState.attendanceTotalPages, adminUiState.attendanceTotal, 'attendance record', prevAction, nextAction);
                        updateTopbarStatus('Attendance logs loaded');
                    } catch (e) {
                        console.error('Error fetching attendance logs', e);
                        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#dc2626;padding:20px;">Failed to load attendance logs.</td></tr>';
                        showToast(e.message || 'Failed to load attendance logs.', 'error');
                    }
                }

                function handleAttendanceFilterChange(context = 'section') {
                    const statusId = context === 'workspace' ? 'attendanceStatusFilterWorkspace' : 'attendanceStatusFilter';
                    const monthId = context === 'workspace' ? 'attendanceMonthFilterAdminWorkspace' : 'attendanceMonthFilterAdmin';
                    const yearId = context === 'workspace' ? 'attendanceYearFilterAdminWorkspace' : 'attendanceYearFilterAdmin';
                    adminUiState.attendanceStatus = document.getElementById(statusId)?.value || 'all';
                    adminUiState.attendanceMonth = document.getElementById(monthId)?.value || adminUiState.attendanceMonth;
                    adminUiState.attendanceYear = document.getElementById(yearId)?.value || adminUiState.attendanceYear;
                    adminUiState.attendancePage = 1;
                    fetchAdminAttendance(context);
                }

                window.handleAttendanceFilterChange = handleAttendanceFilterChange;

                window.changeAttendancePage = function (delta) {
                    const nextPage = adminUiState.attendancePage + delta;
                    if (nextPage < 1 || nextPage > adminUiState.attendanceTotalPages) return;
                    adminUiState.attendancePage = nextPage;
                    fetchAdminAttendance();
                };

                window.changeWorkspaceAttendancePage = function (delta) {
                    const nextPage = adminUiState.attendancePage + delta;
                    if (nextPage < 1 || nextPage > adminUiState.attendanceTotalPages) return;
                    adminUiState.attendancePage = nextPage;
                    fetchAdminAttendance('workspace');
                };

                window.deleteStaff = async function (id) {
                    if (!confirm("Are you sure? Is staff ka access delete ho jayega!")) return;
                    try {
                        const res = await fetch(`/api/admin/delete-staff/${id}`, { method: 'DELETE', credentials: 'include' });
                        const result = await res.json();
                        if (result.success) {
                            adminUiState.staffOptionsLoaded = false;
                            populateStaffAssignDropdown(true);
                            fetchDashboardSummary();
                            fetchStaffData();
                        }
                    } catch (e) { alert("Failed to delete staff."); }
                }

                window.submitLead = async function (e) {
                    e.preventDefault();
                    const btn = document.getElementById('btnLead');
                    btn.innerText = "Assigning...";
                    const taskData = {
                        clientName: document.getElementById('leadClientName').value,
                        contactNumber: document.getElementById('leadContact').value,
                        servicePitch: document.getElementById('leadService').value,
                        assignedTo: document.getElementById('leadAssignTo').value
                    };
                    try {
                        const res = await fetch('/api/admin/add-task', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(taskData)
                            , credentials: 'include'
                        });
                        const result = await res.json();
                        if (result.success) {
                            alert("✅ " + result.message);
                            document.getElementById('assignLeadForm').reset();
                            fetchStaffData();
                        } else { alert("❌ Error: " + result.error); }
                    } catch (err) { alert("Server connection failed"); }
                    btn.innerText = "Assign Lead 🚀";
                };

                window.viewStaffWork = function (email) {
                    const data = globalPerformanceData[email];
                    if (!data || !data.details) return;

                    document.getElementById('workModalTitle').innerText = `Work Details: ${email}`;
                    const tbody = document.getElementById('workModalBody');
                    tbody.innerHTML = '';

                    if (data.details.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No leads assigned yet.</td></tr>';
                    } else {
                        data.details.forEach(task => {
                            let statusColor = '#333';
                            if (task.status === 'pending' || task.status === 'call-back') statusColor = 'orange';
                            if (task.status === 'interested') statusColor = 'green';
                            if (task.status === 'rejected' || task.status === 'not-answering') statusColor = 'red';

                            tbody.innerHTML += `
                    <tr>
                        <td><strong>${task.clientName}</strong><br><small>${task.contactNumber}</small></td>
                        <td>${task.servicePitch}</td>
                        <td style="color:${statusColor}; font-weight:bold; text-transform:uppercase; font-size:12px;">${task.status}</td>
                        <td>${task.aiScore ? `<span style="font-size:13px;font-weight:bold;background:${task.aiScore.includes('Hot') ? '#fef2f2' : task.aiScore.includes('Cold') ? '#eff6ff' : '#fffbeb'};padding:4px 10px;border-radius:20px;">${task.aiScore}</span>` : '<span style="color:#999;font-size:12px;">Scoring...</span>'}</td>
                        <td style="background: #f9f9f9; font-style: italic;">${task.notes || '<span style="color:#999;">No review yet</span>'}</td>
                        <td><button onclick="deleteLead('${task._id}')" class="delete-btn" style="padding:6px 10px; font-size:12px;">🗑️ Delete</button></td>
                    </tr>`;
                        });
                    }
                    document.getElementById('staffWorkModal').style.display = 'flex';
                }

                window.closeStaffWork = function () { document.getElementById('staffWorkModal').style.display = 'none'; };

                window.deleteLead = async function (taskId) {
                    if (!confirm("Are you sure? Yeh lead hamesha ke liye delete ho jayegi!")) return;
                    try {
                        const res = await fetch(`/api/admin/delete-task/${taskId}`, { method: 'DELETE', credentials: 'include' });
                        const result = await res.json();
                        if (result.success) {
                            closeStaffWork();
                            fetchStaffData();
                        } else { alert("❌ Error: " + result.error); }
                    } catch (e) { alert("Failed to connect to server"); }
                };

                // --- NOTICES ---
                async function fetchNoticesAdmin() {
                    try {
                        const res = await fetch('/api/admin/notices', { credentials: 'include' });
                        const data = await res.json();
                        const tbody = document.getElementById('noticesTableBody');
                        tbody.innerHTML = '';
                        if (data.success && data.notices) {
                            if (data.notices.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No notices sent yet.</td></tr>'; return; }
                            data.notices.forEach(n => {
                                tbody.innerHTML += `
                        <tr>
                            <td>${new Date(n.date).toLocaleDateString()}</td>
                            <td><strong>${n.title}</strong></td>
                            <td>${n.message}</td>
                            <td><button onclick="deleteNotice('${n._id}')" class="delete-btn">Delete</button></td>
                        </tr>`;
                            });
                        }
                    } catch (e) { }
                }

                window.submitNotice = async function (e) {
                    e.preventDefault();
                    const btn = document.getElementById('btnNotice');
                    btn.innerText = "Posting...";
                    try {
                        const res = await fetch('/api/admin/add-notice', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: document.getElementById('noticeTitle').value, message: document.getElementById('noticeMessage').value }), credentials: 'include'
                        });
                        const result = await res.json();
                        if (result.success) {
                            alert("✅ " + result.message);
                            document.getElementById('addNoticeForm').reset();
                            fetchNoticesAdmin();
                        }
                    } catch (err) { alert("Server connection failed"); }
                    btn.innerText = "Send Notice 🔔";
                }

                window.deleteNotice = async function (id) {
                    if (confirm("Are you sure? Yeh notice delete ho jayega!")) {
                        try {
                            const res = await fetch(`/api/admin/delete-notice/${id}`, { method: 'DELETE', credentials: 'include' });
                            const result = await res.json();
                            if (result.success) fetchNoticesAdmin();
                        } catch (e) { }
                    }
                };


                window.fetchPayoutRequests = async function () {
                    try {
                        const res = await fetch('/api/admin/payout-requests', { credentials: 'include' });
                        const data = await res.json();
                        const tbody = document.getElementById('payoutsTableBody');
                        if (!tbody) return;
                        tbody.innerHTML = '';

                        // Table ka header bhi badal dena HTML mein: <th>Transfer Details</th> add kar dena Amount ke baad.

                        if (data.success && data.requests) {
                            if (data.requests.length === 0) {
                                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748b;">No payout requests pending.</td></tr>';
                                return;
                            }

                            data.requests.forEach(p => {
                                let statusBadge = p.status === 'Paid'
                                    ? `<span style="background:#d1fae5; color:#10b981; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">Paid ✅</span>`
                                    : `<span style="background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">Pending ⏳</span>`;

                                let actionBtn = p.status === 'Pending'
                                    ? `<button onclick="approvePayout('${p._id}')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow: 0 2px 4px rgba(16,185,129,0.3);">Approve & Pay</button>`
                                    : `<span style="color:#94a3b8; font-size:12px; font-weight: bold;">Settled</span>`;

                                // 🟢 NAYA: Payment Details Box (Copy to Clipboard Feature)
                                let transferDetails = 'N/A';
                                if (p.paymentMethod === 'UPI' && p.paymentDetails) {
                                    transferDetails = `
                                <div style="background:#f8fafc; padding:8px 12px; border-radius:6px; border:1px dashed #cbd5e1; font-size:12px;">
                                    <strong style="color: #475569;">📱 UPI:</strong> <br>
                                    <span style="color:#2563eb; cursor:pointer; font-weight: 600;" onclick="navigator.clipboard.writeText('${p.paymentDetails.upiId}'); alert('UPI ID Copied!')">${p.paymentDetails.upiId} 📋</span>
                                </div>`;
                                } else if (p.paymentMethod === 'Bank' && p.paymentDetails) {
                                    transferDetails = `
                                <div style="background:#f8fafc; padding:8px 12px; border-radius:6px; border:1px dashed #cbd5e1; font-size:12px; line-height: 1.5;">
                                    <strong style="color: #475569;">🏦 Bank Transfer</strong><br>
                                    <span style="color:#64748b;">Name:</span> <strong>${p.paymentDetails.accName}</strong><br>
                                    <span style="color:#64748b;">A/c:</span> <span style="color:#2563eb; cursor:pointer; font-weight: 600;" onclick="navigator.clipboard.writeText('${p.paymentDetails.accNo}'); alert('Account No Copied!')">${p.paymentDetails.accNo} 📋</span><br>
                                    <span style="color:#64748b;">IFSC:</span> <strong>${p.paymentDetails.ifsc}</strong>
                                </div>`;
                                }

                                tbody.innerHTML += `
                        <tr>
                            <td>${new Date(p.date).toLocaleDateString()}</td>
                            <td><strong>${p.staffName}</strong><br><small style="color:#64748b;">${p.staffEmail}</small></td>
                            <td><strong style="color: #10b981; font-size: 16px;">₹${p.amount.toLocaleString('en-IN')}</strong></td>
                            <td>${transferDetails}</td>
                            <td>${statusBadge}</td>
                            <td>${actionBtn}</td>
                        </tr>`;
                            });
                        }
                    } catch (e) { console.error("Error fetching payouts"); }
                };
                window.approvePayout = async function (payoutId) {
                    if (!confirm("Did you transfer the money? Mark this payout as Paid?")) return;

                    try {
                        const res = await fetch('/api/admin/approve-payout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            // 👇 YAHAN FIX KIYA HAI (payoutId ko 'id' variable mein bhejna hai)
                            body: JSON.stringify({ id: payoutId }), credentials: 'include'
                        });
                        const result = await res.json();

                        if (result.success) {
                            alert("✅ Payout Approved successfully!");
                            await Promise.all([
                                fetchPayoutRequests(),
                                fetchFinanceData()
                            ]);
                        } else {
                            alert("❌ Error: " + result.message);
                        }
                    } catch (e) {
                        alert("Server connection failed");
                    }
                };
                window.fetchAllLeaves = async function () {
                    const tbody = document.getElementById('adminLeavesTableBody');
                    try {
                        const res = await fetch('/api/admin/leaves', { credentials: 'include' });
                        const data = await res.json();
                        if (data.success && data.leaves) {
                            tbody.innerHTML = data.leaves.map(l => {
                                let statusBadge = l.status === 'Approved' ? '<span style="color:green;font-weight:bold;">Approved</span>'
                                    : (l.status === 'Rejected' ? '<span style="color:red;font-weight:bold;">Rejected</span>'
                                        : '<span style="color:orange;font-weight:bold;">Pending</span>');

                                let actionBtns = l.status === 'Pending' ? `
                    <button onclick="updateLeaveStatus('${l._id}', 'Approved')" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Approve</button>
                    <button onclick="updateLeaveStatus('${l._id}', 'Rejected')" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Reject</button>
                ` : '-';

                                return `<tr>
                    <td>${new Date(l.appliedOn).toLocaleDateString()}</td>
                    <td><strong>${l.staffName}</strong><br><small>${l.staffEmail}</small></td>
                    <td>${l.dateFrom} <br>to<br> ${l.dateTo}</td>
                    <td>${l.reason}</td>
                    <td>${statusBadge}</td>
                    <td style="display:flex; gap:5px;">${actionBtns}</td>
                </tr>`;
                            }).join('');
                        }
                    } catch (e) { }
                }

                window.updateLeaveStatus = async function (leaveId, status) {
                    if (!confirm(`Are you sure you want to mark this leave as ${status}?`)) return;
                    try {
                        const res = await fetch('/api/admin/update-leave', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ leaveId, status }), credentials: 'include'
                        });
                        const result = await res.json();
                        if (result.success) { fetchAllLeaves(); }
                    } catch (e) { alert("Server Error"); }
                }

                window.updateStaffTarget = async function (email, currentTarget, skipPrompt = false) {
                    let newTarget = currentTarget;
                    if (!skipPrompt) {
                        newTarget = prompt(`Naya monthly target enter karein ${email} ke liye:`, currentTarget);
                    }

                    // Agar cancel dabaya ya khali chhoda
                    if (newTarget === null || String(newTarget).trim() === "") return;

                    newTarget = parseInt(newTarget);
                    if (isNaN(newTarget) || newTarget <= 0) {
                        return alert("⚠️ Please valid amount enter karein!");
                    }

                    try {
                        const res = await fetch('/api/admin/update-target', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email, newTarget: newTarget }), credentials: 'include'
                        });
                        const data = await res.json();

                        if (data.success) {
                            alert("✅ " + data.message);
                            fetchStaffData(); // Table refresh karega
                            if (skipPrompt) closeStaffSlideover();
                        } else {
                            alert("❌ Error: " + data.message);
                        }
                    } catch (e) {
                        alert("⚠️ Server error! Apna internet check karein.");
                    }
                };

                function renderAdminBountyStatusBadge(status) {
                    const palette = {
                        Assigned: ['#e0e7ff', '#3730a3'],
                        Submitted: ['#fef3c7', '#b45309'],
                        Revision: ['#fee2e2', '#b91c1c'],
                        Approved: ['#dcfce7', '#166534']
                    };
                    const [bg, fg] = palette[status] || ['#e2e8f0', '#475569'];
                    return `<span style="display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:800;">${status || 'Assigned'}</span>`;
                }

                async function populateAdminBountyStaffDropdown(force = false) {
                    if (adminBountyStaffOptionsLoaded && !force) return;
                    const select = document.getElementById('bountyAssignedStaff');
                    if (!select) return;

                    try {
                        const res = await fetch('/api/admin/staff-directory?all=1', { credentials: 'include' });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.message || 'Failed to load staff list.');

                        select.innerHTML = '<option value="">Select staff member</option>';
                        (data.staff || []).forEach((staff) => {
                            select.innerHTML += `<option value="${staff.email}">${escapeHtml(staff.name)} (${escapeHtml(staff.email)})</option>`;
                        });
                        adminBountyStaffOptionsLoaded = true;
                    } catch (e) {
                        showToast?.('Could not load staff options for bounty tasks.', 'error');
                    }
                }

                function renderAdminBountyTaskTables(tasks = []) {
                    const reviewBody = document.getElementById('bountyReviewQueueBody');
                    const allBody = document.getElementById('bountyAllTasksBody');
                    if (!reviewBody || !allBody) return;

                    const submittedTasks = tasks.filter((task) => task.status === 'Submitted');
                    reviewBody.innerHTML = submittedTasks.length ? submittedTasks.map((task) => `
                        <tr>
                            <td>
                                <div style="font-weight:700;color:#0f172a;">${escapeHtml(task.title)}</div>
                                <div style="margin-top:4px;font-size:0.8rem;color:#64748b;">${escapeHtml(task.description || 'No description')}</div>
                            </td>
                            <td>
                                <div style="font-weight:700;color:#0f172a;">${escapeHtml(task.assignedStaffName || task.assignedStaffEmail)}</div>
                                <div style="margin-top:4px;font-size:0.8rem;color:#64748b;">${escapeHtml(task.assignedStaffEmail || '')}</div>
                            </td>
                            <td style="font-weight:800;color:#0f172a;">${formatCurrency(Number(task.bountyAmount || 0))}</td>
                            <td>
                                ${task.submissionLink
                            ? `<a href="${escapeHtml(task.submissionLink)}" target="_blank" rel="noopener" style="color:#2563eb;font-weight:700;text-decoration:none;">Open Submission ↗</a>`
                            : '<span style="color:#94a3b8;">No link submitted</span>'}
                            </td>
                            <td>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                    <button class="modern-action-btn" onclick="approveAdminBountyTask('${task._id}')"><i class="ri-checkbox-circle-line"></i> Approve</button>
                                    <button class="modern-action-btn" onclick="requestAdminBountyRevision('${task._id}')" style="background:#fee2e2;color:#b91c1c;border-color:#fecaca;"><i class="ri-arrow-go-back-line"></i> Request Revision</button>
                                </div>
                            </td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:20px;">No submitted tasks waiting for review.</td></tr>';

                    allBody.innerHTML = tasks.length ? tasks.map((task) => `
                        <tr>
                            <td style="color:#64748b;">${formatAdminDate(task.createdAt || task.updatedAt || new Date())}</td>
                            <td>
                                <div style="font-weight:700;color:#0f172a;">${escapeHtml(task.title)}</div>
                                <div style="margin-top:4px;font-size:0.8rem;color:#64748b;">${formatCurrency(Number(task.bountyAmount || 0))}</div>
                            </td>
                            <td>
                                <div style="font-weight:700;color:#0f172a;">${escapeHtml(task.assignedStaffName || task.assignedStaffEmail)}</div>
                                <div style="margin-top:4px;font-size:0.8rem;color:#64748b;">${escapeHtml(task.assignedStaffEmail || '')}</div>
                            </td>
                            <td>${renderAdminBountyStatusBadge(task.status)}</td>
                            <td>
                                ${task.submissionLink
                            ? `<a href="${escapeHtml(task.submissionLink)}" target="_blank" rel="noopener" style="color:#2563eb;font-weight:700;text-decoration:none;">View Link ↗</a>`
                            : '<span style="color:#94a3b8;">Pending submission</span>'}
                            </td>
                            <td style="max-width:220px;color:#475569;">${escapeHtml(task.adminFeedback || '—')}</td>
                            <td>
                                <button class="modern-action-btn" onclick="deleteAdminBountyTask('${task._id}')" style="background:#fff1f2;color:#be123c;border-color:#fecdd3;"><i class="ri-delete-bin-6-line"></i> Delete</button>
                            </td>
                        </tr>
                    `).join('') : '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:20px;">No bounty tasks created yet.</td></tr>';
                }

                async function fetchAdminBountyTasks(forceStaffRefresh = false) {
                    ensureStaffBountyWorkspace();
                    if (forceStaffRefresh) await populateAdminBountyStaffDropdown(true);
                    const reviewBody = document.getElementById('bountyReviewQueueBody');
                    const allBody = document.getElementById('bountyAllTasksBody');
                    if (reviewBody) reviewBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:20px;">Loading review queue...</td></tr>';
                    if (allBody) allBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:20px;">Loading tasks...</td></tr>';

                    try {
                        const res = await fetch('/api/admin/bounty-tasks', { credentials: 'include' });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.message || 'Failed to load bounty tasks.');
                        adminBountyTaskCache = data.tasks || [];
                        renderAdminBountyTaskTables(adminBountyTaskCache);
                    } catch (e) {
                        if (reviewBody) reviewBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#dc2626;padding:20px;">${escapeHtml(e.message || 'Failed to load review queue.')}</td></tr>`;
                        if (allBody) allBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#dc2626;padding:20px;">${escapeHtml(e.message || 'Failed to load tasks.')}</td></tr>`;
                    }
                }

                window.createAdminBountyTask = async function (event) {
                    event.preventDefault();
                    const payload = {
                        assignedStaffEmail: document.getElementById('bountyAssignedStaff')?.value || '',
                        title: document.getElementById('bountyTaskTitle')?.value || '',
                        description: document.getElementById('bountyTaskDescription')?.value || '',
                        bountyAmount: Number(document.getElementById('bountyTaskAmount')?.value || 0)
                    };

                    try {
                        const res = await fetch('/api/admin/bounty-tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(payload)
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.message || 'Failed to assign task.');

                        document.getElementById('adminBountyTaskForm')?.reset();
                        showToast?.(data.message || 'Task assigned successfully.', 'success');
                        await fetchAdminBountyTasks();
                    } catch (e) {
                        showToast?.(e.message || 'Failed to assign task.', 'error');
                    }
                };

                window.requestAdminBountyRevision = async function (taskId) {
                    const feedback = prompt('Add revision notes for the staff member:');
                    if (!feedback || !feedback.trim()) return;

                    try {
                        const res = await fetch(`/api/admin/bounty-tasks/${taskId}/revision`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ adminFeedback: feedback.trim() })
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.message || 'Failed to request revision.');

                        showToast?.(data.message || 'Revision requested.', 'success');
                        await fetchAdminBountyTasks();
                    } catch (e) {
                        showToast?.(e.message || 'Failed to request revision.', 'error');
                    }
                };

                window.approveAdminBountyTask = async function (taskId) {
                    try {
                        const res = await fetch(`/api/admin/bounty-tasks/${taskId}/approve`, {
                            method: 'PATCH',
                            credentials: 'include'
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.message || 'Failed to approve task.');

                        showToast?.(data.message || 'Task approved.', 'success');
                        if (typeof fetchFinanceData === 'function') fetchFinanceData();
                        if (typeof fetchDashboardSummary === 'function') fetchDashboardSummary();
                        await fetchAdminBountyTasks();
                    } catch (e) {
                        showToast?.(e.message || 'Failed to approve task.', 'error');
                    }
                };

                window.deleteAdminBountyTask = async function (taskId) {
                    if (!confirm('Delete this task permanently?')) return;

                    try {
                        const res = await fetch(`/api/admin/bounty-tasks/${taskId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.message || 'Failed to delete task.');

                        showToast?.(data.message || 'Task deleted.', 'success');
                        await fetchAdminBountyTasks();
                    } catch (e) {
                        showToast?.(e.message || 'Failed to delete task.', 'error');
                    }
                };



    window.mountAdminStaffAttendanceSections = mountSections;
    window.syncSearchMirrors = syncSearchMirrors;
    window.seedAdminAttendanceFilters = seedAdminAttendanceFilters;
    window.fetchStaffData = fetchStaffData;
    window.fetchAdminAttendance = fetchAdminAttendance;
    window.fetchNoticesAdmin = fetchNoticesAdmin;
    window.fetchAdminBountyTasks = fetchAdminBountyTasks;
    window.populateAdminBountyStaffDropdown = populateAdminBountyStaffDropdown;

    window.initAdminStaffRealtime = function (socket) {
        if (!socket || staffRealtimeBound) return;
        staffRealtimeBound = true;

        socket.on('lead_status_updated', () => {
            if (typeof fetchStaffData === 'function') fetchStaffData();
        });

        socket.on('new_leave_request', () => {
            if (typeof fetchAllLeaves === 'function') fetchAllLeaves();
            if (window.notificationManager) {
                window.notificationManager.notify('Nayi Leave Request 🏖️', 'A staff member has applied for leave.');
            }
        });

        socket.on('new_payout_request', () => {
            if (typeof fetchPayoutRequests === 'function') fetchPayoutRequests();
            if (window.notificationManager) {
                window.notificationManager.notify('Nayi Payout Request 💰', 'A staff member is requesting payment.');
            }
        });

        socket.on('staff_list_updated', () => {
            if (typeof fetchStaffData === 'function') fetchStaffData();
        });

        socket.on('staff_performance_updated', () => {
            if (typeof fetchStaffData === 'function') fetchStaffData();
        });

        socket.on('bounty_task_updated', () => {
            if (document.getElementById('panel-bounties')?.classList.contains('active')) {
                fetchAdminBountyTasks();
            }
            if (typeof fetchFinanceData === 'function') fetchFinanceData();
            if (typeof fetchDashboardSummary === 'function') fetchDashboardSummary();
        });

        socket.on('notice_posted', () => {
            if (typeof fetchNoticesAdmin === 'function') fetchNoticesAdmin();
        });

        socket.on('new_task_globally', (task) => {
            window.notificationManager?.playSound?.();
            window.notificationManager?.showNativeNotification?.(
                '🎯 Nayi Lead Boli Jaa Rahi Hai!',
                'Naya Lead assign hua hai: ' + task.clientName + ' (' + task.servicePitch + ')',
                window.location.href
            );
            fetchStaffData();
        });

        socket.on('task_updated', (updatedTask) => {
            if (document.getElementById('staffWorkModal')?.style.display === 'flex') {
                fetchStaffData().then(() => {
                    viewStaffWork(updatedTask.assignedTo);
                });
            } else {
                fetchStaffData();
            }
        });

        socket.on('task_deleted', () => {
            fetchStaffData();
            if (document.getElementById('staffWorkModal')?.style.display === 'flex') {
                const currentTitle = document.getElementById('workModalTitle').innerText;
                const email = currentTitle.replace('Work Details: ', '').trim();
                fetchStaffData().then(() => viewStaffWork(email));
            }
        });
    };
})();
