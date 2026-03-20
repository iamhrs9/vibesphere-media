(function () {
    const SECTION_HTML = {
        "document-approvals-section": "<div id=\"document-approvals-section\" class=\"section\" data-module-mounted=\"true\">\n                <div class=\"premium-section\">\n                    <div class=\"approvals-shell\">\n                        <div class=\"approvals-header\">\n                            <div>\n                                <h2 class=\"section-title\" style=\"font-size:1.4rem;\">Document Approvals</h2>\n                                <p class=\"section-subtitle\" style=\"margin-top:6px;\">Review staff-submitted payroll and attendance documents from a cleaner approval workspace.</p>\n                            </div>\n                            <div class=\"approvals-header-actions\">\n                                <div class=\"approvals-search\">\n                                    <i class=\"ri-search-line\"></i>\n                                    <input id=\"documentApprovalSearch\" type=\"text\" placeholder=\"Search by name, email, or document...\" oninput=\"fetchDocumentApprovals()\">\n                                </div>\n                                <select id=\"documentApprovalStatusFilter\" class=\"approvals-filter\" onchange=\"fetchDocumentApprovals()\">\n                                    <option value=\"all\">Filter by Status</option>\n                                    <option value=\"Pending_Approval\">Pending</option>\n                                    <option value=\"Approved\">Approved</option>\n                                    <option value=\"Denied\">Rejected</option>\n                                </select>\n                            </div>\n                        </div>\n\n                        <div class=\"approvals-table-wrap\">\n                            <table class=\"approvals-table\">\n                                <thead>\n                                    <tr>\n                                        <th>Uploader Details</th>\n                                        <th>Document Name / Type</th>\n                                        <th>Submission Date</th>\n                                        <th>Status</th>\n                                        <th style=\"text-align:right;\">Actions</th>\n                                    </tr>\n                                </thead>\n                                <tbody id=\"documentApprovalsTableBody\">\n                                    <tr>\n                                        <td colspan=\"5\" style=\"text-align:center;padding:20px;color:#64748b;\">Loading document approvals...</td>\n                                    </tr>\n                                </tbody>\n                            </table>\n                        </div>\n                    </div>\n                </div>\n            </div>"
    };

    function mountSections(sectionIds) {
        sectionIds.forEach((sectionId) => {
            const target = document.getElementById(sectionId);
            const markup = SECTION_HTML[sectionId];
            if (!target || !markup || target.dataset.moduleMounted === 'true') return;
            target.outerHTML = markup;
        });
    }

    window.mountAdminDocumentApprovalsSection = function () {
        mountSections(["document-approvals-section"]);
    };
})();


// --- AUTOMATICALLY EXTRACTED MODULE FUNCTIONS ---

function documentApprovalDisplayName(item) {
    const type = adminDocumentLabel(item.documentType);
    return `${adminMonthLabel(item.month, item.year)} ${type}`;
}
function documentApprovalTypeLabel(item) {
    return item.documentType === 'AttendanceReport' ? 'Attendance Report' : 'Payslip';
}
function documentApprovalSubmittedAt(item) {
    return formatAdminDate(item.requestedAt || item.createdAt || item.updatedAt || new Date());
}
async function fetchDocumentApprovals() {
    const tbody = document.getElementById('documentApprovalsTableBody');
    if (!tbody) return;
    tbody.innerHTML = renderLoadingRows(5, 4);
    try {
        const status = document.getElementById('documentApprovalStatusFilter')?.value || 'all';
        const searchTerm = String(document.getElementById('documentApprovalSearch')?.value || '').trim().toLowerCase();
        const res = await fetch(`/api/admin/document-approvals?status=${encodeURIComponent(status)}`, { credentials: 'include' });
        const data = await res.json();
        const approvals = (data.approvals || []).filter((item) => {
            if (!searchTerm) return true;
            const haystack = [
                item.staffName,
                item.staffEmail,
                item.staffEmpId,
                documentApprovalDisplayName(item),
                documentApprovalTypeLabel(item)
            ].join(' ').toLowerCase();
            return haystack.includes(searchTerm);
        });
if (!data.success || !Array.isArray(data.approvals) || approvals.length === 0) {
tbody.innerHTML = `
                    <tr>
                        <td colspan="5">
                            <div class="approvals-empty">
                                <div class="approvals-empty-icon"><i class="ri-inbox-archive-line"></i></div>
                                <strong style="font-size:1rem;color:#0f172a;">No pending documents for approval</strong>
                                <span style="margin-top:6px;color:#64748b;font-size:0.9rem;">Try changing the search or status filter. New submissions will appear here automatically.</span>
                            </div>
                        </td>
                    </tr>
                `;
return;
}
        tbody.innerHTML = approvals.map((item) => {
            const initials = getInitials(item.staffName || item.staffEmail || 'VS');
            const documentName = documentApprovalDisplayName(item);
            const documentType = documentApprovalTypeLabel(item);
            const isPending = item.approvalStatus === 'Pending_Approval';
            const actionContent = isPending ? `
                <div class="approvals-actions">
                    <button class="approvals-icon-btn view" onclick="openDocumentPreview('${item.documentType}', '${item._id}')" title="View Document" aria-label="View Document">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="approvals-icon-btn approve" onclick="approveDocumentRequest('${item.staffEmail}', '${item.documentType}', ${item.month}, ${item.year}, this)" title="Approve Document" aria-label="Approve Document">
                        <i class="ri-check-line"></i>
                    </button>
                    <button class="approvals-icon-btn reject" onclick="denyDocumentRequest('${item.staffEmail}', '${item.documentType}', ${item.month}, ${item.year}, this)" title="Reject Document" aria-label="Reject Document">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
            ` : `
                <div class="approvals-actions" style="justify-content: flex-end; gap: 12px;">
                    <button class="approvals-icon-btn view" onclick="openDocumentPreview('${item.documentType}', '${item._id}')" title="View Document" aria-label="View Document">
                        <i class="ri-eye-line"></i>
                    </button>
                    ${docStatusBadge(item.approvalStatus)}
                </div>
            `;
            return `
                <tr>
                    <td>
                        <div class="approvals-uploader">
                            ${item.staffProfilePhoto
                                ? `<img src="${item.staffProfilePhoto}" alt="${escapeHtml(item.staffName || 'Staff')}" class="approvals-avatar">`
                                : `<div class="approvals-avatar">${escapeHtml(initials)}</div>`}
                            <div>
                                <div style="font-size:0.94rem;font-weight:700;color:#0f172a;">${escapeHtml(item.staffName || 'Unknown')}</div>
                                <div style="margin-top:2px;font-size:0.82rem;color:#64748b;">${escapeHtml(item.staffEmail || '—')}</div>
                            </div>
                        </div>
                    </td>
                    <td class="approvals-doc-cell">
                        <div style="font-size:0.92rem;font-weight:700;color:#0f172a;">${escapeHtml(documentName)}</div>
                        <div style="margin-top:2px;font-size:0.82rem;color:#64748b;">${escapeHtml(documentType)}</div>
                    </td>
                    <td style="font-size:0.88rem;color:#475569;">${documentApprovalSubmittedAt(item)}</td>
                    <td>${docStatusBadge(item.approvalStatus)}</td>
                    <td>
                        ${actionContent}
                    </td>
                </tr>
            `;
        }).join('');
        updateTopbarStatus('Pending document approvals loaded');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#dc2626;">Failed to load document approvals.</td></tr>';
        showToast('Failed to load pending document approvals.', 'error');
    }
}
async function approveDocumentRequest(staffEmail, documentType, month, year, btn) {
setApprovalActionButtonState(btn, true, 'Approving...');
try {
const res = await fetch('/api/admin/approve-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ staffEmail, documentType, month, year })
        });
        const data = await res.json();
        if (!data.success) {
            alert(data.message || 'Could not approve document.');
            return;
        }
        alert('Document approved successfully.');
        fetchDocumentApprovals();
        fetchDashboardSummary();
    } catch (e) {
        alert('Could not approve document.');
    } finally {
setApprovalActionButtonState(btn, false);
}
}
async function denyDocumentRequest(staffEmail, documentType, month, year, btn) {
setApprovalActionButtonState(btn, true, 'Denying...');
try {
const res = await fetch('/api/admin/deny-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ staffEmail, documentType, month, year })
        });
        const data = await res.json();
        if (!data.success) {
            alert(data.message || 'Could not deny document.');
            return;
        }
        alert('Document denied and staff notified.');
        fetchDocumentApprovals();
        fetchDashboardSummary();
    } catch (e) {
        alert('Could not deny document.');
    } finally {
setApprovalActionButtonState(btn, false);
}
}

// Window Bindings
window.fetchDocumentApprovals = fetchDocumentApprovals;
window.approveDocumentRequest = approveDocumentRequest;
window.denyDocumentRequest = denyDocumentRequest;
