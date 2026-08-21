(function () {
    const SECTION_HTML = {
        "resources-section": "<div id=\"resources-section\" class=\"section\" data-module-mounted=\"true\">\n                <div class=\"premium-section resource-shell\">\n                    <div class=\"section-header\">\n                        <div>\n                            <h2 class=\"section-title\">Resource Management</h2>\n                            <p class=\"section-subtitle\">A cleaner cloud-drive style knowledge base with upload-first actions and richer file cards.</p>\n                        </div>\n                        <div class=\"section-actions\">\n                            <button class=\"section-refresh-btn\" onclick=\"fetchAdminResources()\"><i class=\"ri-refresh-line\"></i> Refresh</button>\n                        </div>\n                    </div>\n\n                    <div class=\"resource-dropzone\" id=\"resourceDropzone\" onclick=\"document.getElementById('resType').value='pdf'; toggleResourceInput(); document.getElementById('resFile').click();\">\n                        <div>\n                            <div style=\"font-size:2rem;margin-bottom:8px;\">☁️</div>\n                            <strong style=\"display:block;font-size:1.05rem;color:var(--text);\">Drag and drop files here to upload</strong>\n                            <p class=\"section-subtitle\" style=\"margin-top:8px;\">Perfect for PDFs, playbooks, reference docs, and shareable links.</p>\n                        </div>\n                    </div>\n\n                    <div class=\"staff-card\" style=\"padding:20px;margin:0;\">\n                        <div class=\"resource-form-grid\">\n                            <div class=\"toolbar-field\" style=\"margin:0;\">\n                                <label>Title</label>\n                                <input type=\"text\" id=\"resTitle\" placeholder=\"e.g. Sales Script v2\">\n                            </div>\n                            <div class=\"toolbar-field\" style=\"margin:0;\">\n                                <label>Type</label>\n                                <select id=\"resType\" onchange=\"toggleResourceInput()\">\n                                    <option value=\"link\">Link</option>\n                                    <option value=\"text\">Text</option>\n                                    <option value=\"pdf\">PDF Upload</option>\n                                </select>\n                            </div>\n                            <div id=\"resContentWrap\" class=\"toolbar-field\" style=\"margin:0;\">\n                                <label>Content / URL</label>\n                                <input type=\"text\" id=\"resContent\" placeholder=\"https://... or paste notes\">\n                            </div>\n                            <div id=\"resFileWrap\" class=\"toolbar-field\" style=\"display:none;margin:0;\">\n                                <label>PDF File</label>\n                                <input type=\"file\" id=\"resFile\" accept=\".pdf\">\n                            </div>\n                            <button onclick=\"addResource()\" class=\"btn-publish\">Add Resource</button>\n                        </div>\n                    </div>\n\n                    <div id=\"resourcesList\" class=\"resource-drive-grid\"></div>\n                </div>\n            </div>",
        "blogs": "<div id=\"blogs\" class=\"section\" data-module-mounted=\"true\">\n                <div class=\"premium-section\">\n                    <div class=\"section-header\">\n                        <div>\n                            <h2 id=\"formTitle\" class=\"section-title\">Write Blog</h2>\n                            <p class=\"section-subtitle\">A calmer writing environment inspired by modern editorial tools, with the publishing controls moved into a dedicated settings rail.</p>\n                        </div>\n                    </div>\n\n                    <div class=\"blog-shell\">\n                        <div class=\"editor-shell\">\n                            <form id=\"blogForm\">\n                                <input type=\"hidden\" id=\"editBlogId\">\n                                <input type=\"hidden\" id=\"bImage\">\n\n                                <div id=\"blogCoverDropzone\" class=\"cover-dropzone\" onclick=\"document.getElementById('blogCoverFile').click()\">\n                                    <div class=\"cover-copy\">\n                                        <div style=\"font-size:2rem;margin-bottom:10px;\">🖼️</div>\n                                        <strong style=\"display:block;font-size:1.08rem;\">Upload Cover Image</strong>\n                                        <p style=\"margin:8px 0 0;color:inherit;\">Drag an image here or click to choose a cover. Image URLs still work too.</p>\n                                    </div>\n                                </div>\n                                <input type=\"file\" id=\"blogCoverFile\" accept=\"image/*\" style=\"display:none;\">\n\n                                <input type=\"text\" id=\"bTitle\" class=\"blog-title-input\" placeholder=\"Untitled story\" required onkeyup=\"generateSlug()\">\n\n                                <div class=\"toolbar-field\" style=\"margin-bottom:16px;\">\n                                    <label>Slug</label>\n                                    <input type=\"text\" id=\"bSlug\" readonly style=\"background:#f8fafc;color:#64748b;\">\n                                </div>\n\n                                <div class=\"form-group\" style=\"margin-bottom:0;\">\n                                    <label style=\"margin-bottom:10px;\">Story Content</label>\n                                    <textarea id=\"bContent\" rows=\"15\" placeholder=\"Start writing your next article...\"></textarea>\n                                </div>\n\n                                <div style=\"display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;\">\n                                    <button type=\"submit\" class=\"btn-publish\" id=\"submitBtn\">Save Blog</button>\n                                    <button type=\"button\" class=\"btn-cancel\" id=\"cancelBtn\" onclick=\"resetForm()\">Cancel</button>\n                                </div>\n                            </form>\n                        </div>\n\n                        <aside class=\"editor-settings\">\n                            <div class=\"settings-block\">\n                                <strong style=\"display:block;font-size:1rem;color:var(--text);margin-bottom:12px;\">Publishing</strong>\n                                <div class=\"toolbar-field\" style=\"margin-bottom:12px;\">\n                                    <label>Status</label>\n                                    <select id=\"bStatus\" required>\n                                        <option value=\"Published\">Published</option>\n                                        <option value=\"Draft\">Draft</option>\n                                    </select>\n                                </div>\n                                <div class=\"toolbar-field\" style=\"margin:0;\">\n                                    <label>Category</label>\n                                    <select id=\"bCategory\" required>\n                                        <option value=\"\">Select Category</option>\n                                        <option value=\"Digital Marketing\">Digital Marketing</option>\n                                        <option value=\"Web Development\">Web Development</option>\n                                        <option value=\"Instagram Growth\">Instagram Growth</option>\n                                        <option value=\"Business Tips\">Business Tips</option>\n                                        <option value=\"Tech News\">Tech News</option>\n                                    </select>\n                                </div>\n                            </div>\n\n                            <div class=\"settings-block\">\n                                <strong style=\"display:block;font-size:1rem;color:var(--text);margin-bottom:12px;\">Discoverability</strong>\n                                <div class=\"toolbar-field\" style=\"margin-bottom:12px;\">\n                                    <label>Tags</label>\n                                    <input type=\"text\" id=\"bTags\" placeholder=\"SEO, growth, strategy\">\n                                </div>\n                                <div class=\"toolbar-field\" style=\"margin:0;\">\n                                    <label>Cover Image URL</label>\n                                    <input type=\"text\" id=\"bImageProxy\" placeholder=\"Paste image link here...\">\n                                </div>\n                            </div>\n\n                            <div class=\"settings-block\">\n                                <strong style=\"display:block;font-size:1rem;color:var(--text);margin-bottom:12px;\">SEO Settings</strong>\n                                <div class=\"toolbar-field\" style=\"margin-bottom:12px;\">\n                                    <label>Meta Title</label>\n                                    <input type=\"text\" id=\"bMetaTitle\" maxlength=\"60\" placeholder=\"SEO optimized title for Google...\">\n                                </div>\n                                <div class=\"toolbar-field\" style=\"margin:0;\">\n                                    <label>Meta Description</label>\n                                    <textarea id=\"bMetaDesc\" rows=\"4\" maxlength=\"160\" placeholder=\"Write a short, catchy description for search results...\"></textarea>\n                                </div>\n                            </div>\n                        </aside>\n                    </div>\n\n                    <div class=\"modern-table-shell\">\n                        <div class=\"table-head\">\n                            <div>\n                                <h3 style=\"margin:0;font-size:1.02rem;color:var(--text);\">Existing Blogs</h3>\n                                <p class=\"section-subtitle\" style=\"margin-top:6px;\">Published and drafted posts in a cleaner editorial library.</p>\n                            </div>\n                            <div class=\"section-actions\">\n                                <button onclick=\"fetchBlogs()\" class=\"section-refresh-btn\"><i class=\"ri-refresh-line\"></i> Refresh</button>\n                            </div>\n                        </div>\n                        <div id=\"blogsTable\" class=\"record-card-grid\"></div>\n                    </div>\n                </div>\n            </div>"
    };

    function mountSections(sectionIds) {
        sectionIds.forEach((sectionId) => {
            const target = document.getElementById(sectionId);
            const markup = SECTION_HTML[sectionId];
            if (!target || !markup || target.dataset.moduleMounted === 'true') return;
            target.outerHTML = markup;
        });
    }

    window.mountAdminContentKnowledgeSections = function () {
        mountSections(["resources-section","blogs"]);
    };
})();

// ==========================================
// ⭐ 1. REVIEWS MANAGEMENT
// ==========================================
async function fetchReviews() {
    try {
        const res = await fetch(`${API_URL}/reviews`, { credentials: 'include' });
        const data = await res.json();
        const tbody = document.getElementById('reviewsTable');
        tbody.innerHTML = '';
        (data.reviews || []).forEach(r => {
            const initial = (r.name || 'U')[0].toUpperCase();
            const avatar = r.avatar 
                ? `<img src="${r.avatar}" style="width:44px;height:44px;min-width:44px;border-radius:50%;object-fit:cover;border:1.5px solid #e2e8f0;box-shadow:0 2px 4px rgba(0,0,0,0.05);" onerror="this.outerHTML='<div style=\\'width:44px;height:44px;min-width:44px;background:#6c63ff;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;\\'>${initial}</div>'">` 
                : `<div style="width:44px;height:44px;min-width:44px;background:#6c63ff;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">${initial}</div>`;
            tbody.innerHTML += `
    <tr>
        <td>${new Date(r.date).toLocaleDateString()}</td>
        <td style="display:flex; gap:12px; align-items:center;">${avatar}<div><strong style="color:#1e293b;">${r.name}</strong><br><small style="color:#6c63ff;font-weight:500;">${r.instaId}</small></div></td>
        <td>${'⭐'.repeat(r.rating)}</td>
        <td>${r.message}</td>
        <td><button class="delete-btn" onclick="deleteReview('${r._id}')">Delete</button></td>
    </tr>`;
        });
    } catch (e) { }
}
async function deleteReview(id) {
    if (confirm("Delete Review?")) {
        await fetch(`${API_URL}/admin/delete-review/${id}`, { method: 'DELETE', credentials: 'include' });
        fetchReviews();
    }
}
// --- PACKAGE REVIEW MODERATION ---
async function fetchPendingReviews() {
    const tbody = document.getElementById('pendingReviewsTable');
    try {
        const res = await fetch('/api/admin/reviews/pending', { credentials: 'include' });
        const data = await res.json();
        if (!data.success || !data.reviews.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No pending reviews.</td></tr>';
            return;
        }
        tbody.innerHTML = data.reviews.map(r => `
        <tr>
            <td><strong>${r.packageTitle}</strong></td>
            <td>${r.userName}</td>
            <td>${'★'.repeat(r.rating)}</td>
            <td>${r.comment}</td>
            <td style="display:flex; gap:8px;">
                <button onclick="moderateReview('${r.packageId}', '${r.reviewId}', 'approved')" style="background:#22c55e; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:bold;">Approve</button>
                <button onclick="moderateReview('${r.packageId}', '${r.reviewId}', 'rejected')" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:bold;">Reject</button>
            </td>
        </tr>
    `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Failed to load reviews</td></tr>';
    }
}
async function moderateReview(packageId, reviewId, status) {
    if (!confirm(`Are you sure you want to ${status} this review?`)) return;
    try {
        const res = await fetch(`/api/admin/packages/${packageId}/reviews/${reviewId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            fetchPendingReviews();
        } else {
            alert("Error: " + data.error);
        }
    } catch (e) {
        alert("Update failed");
    }
}
// ==========================================
// ✍️ 3. BLOGS MANAGEMENT
// ==========================================
async function fetchBlogs() {
    try {
        const res = await fetch('/api/blogs', { credentials: 'include' });
        allBlogs = await res.json();
        const grid = document.getElementById('blogsTable');
        grid.innerHTML = '';
        allBlogs = Array.isArray(allBlogs) ? allBlogs : [];
        if (!allBlogs.length) {
            grid.innerHTML = '<div class="chat-empty" style="grid-column:1/-1;">No blogs found yet. Drafts and published stories will appear here.</div>';
            return;
        }
        grid.innerHTML = allBlogs.map((blog) => {
            const displayTitle = blog.title || blog.titleHinglish || blog.titleHindi || 'Untitled';
            const statusLabel = blog.status || 'Published';
            return `
                <article class="blog-archive-card">
                    ${blog.image
                        ? `<img src="${blog.image}" alt="${escapeHtml(displayTitle)}">`
                        : `<div style="height:160px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#eff6ff,#f8fafc);color:#64748b;font-weight:700;">No Cover Image</div>`}
                    <div class="blog-archive-body">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                            ${renderModernStatusBadge(statusLabel, statusLabel)}
                            <span style="font-size:0.78rem;color:#64748b;">${formatAdminDate(blog.date)}</span>
                        </div>
                        <h3 style="margin:14px 0 8px;font-size:1rem;color:#0f172a;">${escapeHtml(displayTitle)}</h3>
                        <p style="margin:0;color:#64748b;font-size:0.86rem;line-height:1.6;min-height:44px;">${escapeHtml((blog.metaDesc || blog.excerpt || 'Published in the editorial library.').slice(0, 110))}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:16px;">
                            <span style="font-size:0.8rem;color:#94a3b8;">${escapeHtml(blog.category || 'General')}</span>
                            <div style="display:flex;gap:8px;">
                                <button class="modern-action-btn" onclick="prepareEdit('${blog._id}')" title="Edit Blog"><i class="ri-pencil-line"></i></button>
                                <button class="modern-action-btn" onclick="deleteBlog('${blog._id}')" title="Delete Blog"><i class="ri-delete-bin-6-line"></i></button>
                            </div>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    } catch (e) { }
}
function generateSlug() {
    const title = document.getElementById('bTitle').value;
    document.getElementById('bSlug').value = title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}
function updateBlogCoverPreview(imageUrl) {
    const dropzone = document.getElementById('blogCoverDropzone');
    const hiddenInput = document.getElementById('bImage');
    const proxyInput = document.getElementById('bImageProxy');
    if (!dropzone || !hiddenInput) return;
    hiddenInput.value = imageUrl || '';
    if (proxyInput && proxyInput.value !== imageUrl) proxyInput.value = imageUrl || '';
    dropzone.classList.toggle('has-image', Boolean(imageUrl));
    dropzone.style.backgroundImage = imageUrl ? `url('${imageUrl}')` : 'none';
}
async function loadBlogCoverFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateBlogCoverPreview(reader.result);
    reader.readAsDataURL(file);
}
window.prepareEdit = function (id) {
    const blog = allBlogs.find(b => b._id === id);
    if (!blog) return;
    document.getElementById('editBlogId').value = blog._id;
    document.getElementById('bTitle').value = blog.title || blog.titleHinglish || blog.titleHindi;
    document.getElementById('bSlug').value = blog.slug;
    updateBlogCoverPreview(blog.image || '');
    document.getElementById('bCategory').value = blog.category || '';
    document.getElementById('bStatus').value = blog.status || 'Published';
    document.getElementById('bTags').value = blog.tags || '';
    document.getElementById('bMetaTitle').value = blog.metaTitle || '';
    document.getElementById('bMetaDesc').value = blog.metaDesc || '';
    const content = blog.content || blog.contentHinglish || blog.contentHindi;
    tinymce.get('bContent').setContent(content || "");
    document.getElementById('formTitle').innerText = "Edit Blog Post ✏️";
    document.getElementById('submitBtn').innerText = "Update Blog 🔄";
    document.getElementById('cancelBtn').style.display = "block";
    document.getElementById('formTitle').scrollIntoView({ behavior: 'smooth' });
}
window.resetForm = function () {
    document.getElementById('blogForm').reset();
    tinymce.get('bContent').setContent("");
    document.getElementById('editBlogId').value = "";
    updateBlogCoverPreview('');
    document.getElementById('formTitle').innerText = "Create New Blog Post";
    document.getElementById('submitBtn').innerText = "Save Blog";
    document.getElementById('cancelBtn').style.display = "none";
}
document.getElementById('blogForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editBlogId').value;
    const isEdit = id ? true : false;
    const blogData = {
        title: document.getElementById('bTitle').value,
        slug: document.getElementById('bSlug').value,
        category: document.getElementById('bCategory').value,
        status: document.getElementById('bStatus').value,
        image: document.getElementById('bImage').value,
        tags: document.getElementById('bTags').value,
        content: tinymce.get('bContent').getContent(),
        metaTitle: document.getElementById('bMetaTitle').value,
        metaDesc: document.getElementById('bMetaDesc').value
    };
    const url = isEdit ? `/api/edit-blog/${id}` : `/api/add-blog`;
    const method = isEdit ? 'PUT' : 'POST';
    const btn = document.getElementById('submitBtn');
    btn.innerText = "Saving...";
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blogData)
            , credentials: 'include'
        });
        const result = await res.json();
        if (result.success) {
            alert(isEdit ? '✅ Blog Updated!' : '✅ Blog Saved!');
            resetForm();
            fetchBlogs();
        } else { alert("Error: " + result.error); }
    } catch (e) { alert("Server Error"); }
    btn.innerText = isEdit ? "Update Blog 🔄" : "Save Blog";
});
document.getElementById('bImageProxy')?.addEventListener('input', (event) => {
    updateBlogCoverPreview(event.target.value.trim());
});
document.getElementById('blogCoverFile')?.addEventListener('change', (event) => {
    loadBlogCoverFile(event.target.files?.[0]);
});
document.getElementById('blogCoverDropzone')?.addEventListener('dragover', (event) => {
    event.preventDefault();
});
document.getElementById('blogCoverDropzone')?.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
        loadBlogCoverFile(file);
    }
});
window.deleteBlog = async function (id) {
    if (confirm("Delete Permanently?")) {
        await fetch(`/api/delete-blog/${id}`, { method: 'DELETE', credentials: 'include' });
        fetchBlogs();
    }
}
// ==========================================
// 🎧 HELPDESK FUNCTIONS
// ==========================================
let activeAdminTicketId = null;
let helpdeskSocket = null;
let adminChatCurrentTicket = null; // full ticket object currently open in admin chat modal

// ---- Admin Socket ----
window.adminSocket = io();
window.adminSocket.on('connect', () => {
    console.log('Admin Socket Connected:', window.adminSocket.id);
    window.adminSocket.emit('join_admin_room');
});

window.adminSocket.on('new_support_ticket', (ticketData) => {
    // 1. Prepend to _adminAllTickets if not already present
    if (!_adminAllTickets.some(t => t._id === ticketData._id)) {
        _adminAllTickets.unshift(ticketData);
    }
    
    // 2. Play notification sound
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}

    // 3. Show notification toast
    if (window.notificationManager) {
        window.notificationManager.notify('🎫 New Ticket Received', `${ticketData.clientName || 'Client'}: ${ticketData.subject}`);
    }

    // 4. If current subtab matches the ticket status or is 'All', dynamically prepend to the table
    if (typeof _adminTicketSubTab !== 'undefined' && (_adminTicketSubTab === 'All' || _adminTicketSubTab === ticketData.status)) {
        const tbody = document.getElementById('ticketsTable');
        if (tbody) {
            // If empty table placeholder is currently displayed, clear it
            const activeSubTabCount = _adminTicketSubTab === 'All' ? _adminAllTickets.length : _adminAllTickets.filter(t => t.status === _adminTicketSubTab).length;
            if (activeSubTabCount === 1) {
                tbody.innerHTML = '';
            }

            const statusColors = {
                'Open':        { bg: '#fef3c7', text: '#92400e' },
                'Pending':     { bg: '#fef3c7', text: '#92400e' },
                'In Progress': { bg: '#eff6ff', text: '#1d4ed8' },
                'Resolved':    { bg: '#f0fdf4', text: '#15803d' },
                'Closed':      { bg: '#f1f5f9', text: '#64748b' }
            };
            const style = statusColors[ticketData.status] || { bg: '#f1f5f9', text: '#64748b' };
            let contextMeta = '';
            if (ticketData.orderId && ticketData.orderId !== 'N/A') contextMeta = `<br><span style="background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">Order: ${ticketData.orderId}</span>`;
            if (ticketData.category) contextMeta += ` <span style="background:#e0e7ff;color:#4f46e5;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">${ticketData.category}</span>`;
            if (ticketData.subcategory) contextMeta += ` <span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">${ticketData.subcategory}</span>`;
            const ticketNum = ticketData.ticketNumber || ('#' + String(ticketData._id).slice(-6).toUpperCase());

            let liveBadge = '';
            if (ticketData.chatActive && (ticketData.isLiveChat || ticketData.category === 'Live Chat')) {
                liveBadge = ` <span class="live-chat-glow-badge"><span style="width:6px;height:6px;background:#ef4444;border-radius:50%;display:inline-block;"></span>🔴 Live Chat</span>`;
            }

            let refillBadge = '';
            if (ticketData.actionRequired === 'Refill') {
                refillBadge = ` <span class="refill-glow-badge"><span style="width:6px;height:6px;background:#0369a1;border-radius:50%;display:inline-block;"></span>🔄 Refill Request</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${ticketData.clientName || 'Client'}</strong><br><small style="color:#94a3b8;">${ticketData.clientEmail}</small></td>
                <td style="font-weight:600;">${ticketNum}${liveBadge}${refillBadge}<br>${ticketData.subject}${contextMeta}</td>
                <td style="max-width:160px;font-size:13px;color:#475569;">${(ticketData.issue||'').substring(0,80)}...</td>
                <td>
                    <select onchange="updateTicketStatus('${ticketData._id}', this.value)" style="padding:6px 12px;border:none;border-radius:20px;font-weight:bold;font-size:12px;background:${style.bg};color:${style.text};outline:none;cursor:pointer;">
                        <option value="Open" ${ticketData.status==='Open'?'selected':''} style="background:#ffffff;color:#92400e;">🟡 Open</option>
                        <option value="Pending" ${ticketData.status==='Pending'?'selected':''} style="background:#ffffff;color:#92400e;">🟣 Processing/Pending</option>
                        <option value="Resolved" ${ticketData.status==='Resolved'?'selected':''} style="background:#ffffff;color:#15803d;">✅ Resolved</option>
                        <option value="Closed" ${ticketData.status==='Closed'?'selected':''} style="background:#ffffff;color:#64748b;">⛔ Closed</option>
                    </select>
                </td>
                <td>
                    <button onclick="openAdminTicketChat('${ticketData._id}')" style="background:linear-gradient(135deg,#6c63ff,#4f46e5);color:white;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="ri-chat-3-line"></i> Open Chat</button>
                </td>
            `;
            tbody.insertBefore(tr, tbody.firstChild);

            const filteredCount = _adminTicketSubTab === 'All' ? _adminAllTickets.length : _adminAllTickets.filter(t => t.status === _adminTicketSubTab).length;
            const countEl = document.getElementById('ticketCount');
            if (countEl) countEl.innerText = filteredCount + ' Tickets';
        }
    }
});

// ---- Shared chat bubble renderer (used in admin chat modal) ----
function adminAppendBubble(text, sender, ts) {
    const el = document.getElementById('adminChatHistory');
    if (!el) return;
    const isAdmin = sender === 'Admin' || sender === 'Admin Support';
    const isSystem = sender === 'System' || sender === 'System/Admin' || sender === 'System/Bot';
    const time = ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    let bubbleStyle, wrapStyle;
    if (isSystem) {
        wrapStyle = 'justify-content:center;';
        bubbleStyle = 'background:#fef9c3;border:1px solid #fde047;color:#713f12;border-radius:10px;font-size:0.8rem;font-style:italic;padding:8px 14px;max-width:90%;text-align:center;';
    } else if (isAdmin) {
        wrapStyle = 'justify-content:flex-end;';
        bubbleStyle = 'background:linear-gradient(135deg,#6c63ff,#4f46e5);color:#fff;border-radius:16px 16px 4px 16px;padding:9px 14px;max-width:78%;font-size:0.85rem;';
    } else {
        wrapStyle = 'justify-content:flex-start;';
        bubbleStyle = 'background:#fff;border:1.5px solid #e2e8f0;color:#334155;border-radius:16px 16px 16px 4px;padding:9px 14px;max-width:78%;font-size:0.85rem;';
    }

    const div = document.createElement('div');
    div.style.cssText = `display:flex;${wrapStyle}margin-bottom:8px;`;
    div.innerHTML = `<div style="${bubbleStyle}">
        ${!isSystem ? `<div style="font-size:10px;font-weight:700;opacity:0.7;margin-bottom:3px;">${sender}</div>` : ''}
        <div>${escAdminText(text)}</div>
        <div style="font-size:10px;opacity:0.5;margin-top:3px;text-align:right;">${time}</div>
    </div>`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

function escAdminText(t) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(t || ''));
    return d.innerHTML;
}

// ---- Global incoming message listener ----
window.adminSocket.on('support_receive_msg', (message) => {
    // Append to admin chat modal if it is open for this ticket
    if (adminChatCurrentTicket && message.ticketId === String(adminChatCurrentTicket._id)) {
        adminAppendBubble(message.text || message.message, message.sender, message.createdAt);
    } else {
        // Notification for background messages
        if (window.notificationManager) {
            window.notificationManager.notify('💬 New Support Message', `${message.sender}: ${(message.text||'').substring(0,60)}`);
        }
    }
});

window.adminSocket.on('support_client_waiting', (data) => {
    if (window.notificationManager) {
        window.notificationManager.notify('💬 Live Support Request', `${data.name} is requesting assistance.`);
    }
    if (document.getElementById('live-chats-view') && document.getElementById('live-chats-view').style.display !== 'none') {
        fetchLiveChats();
    }
});

window.adminSocket.on('support_chat_closed', () => {
    if (adminChatCurrentTicket) {
        adminAppendBubble('This support session has been ended.', 'System', new Date());
        const inp = document.getElementById('adminChatInput');
        const btn = document.getElementById('adminChatSendBtn');
        if (inp) inp.disabled = true;
        if (btn) btn.disabled = true;
    }
});

window.adminSocket.on('support_chat_terminated', (data) => {
    if (adminChatCurrentTicket && String(adminChatCurrentTicket._id) === data.ticketId) {
        const isResolved = data.status === 'Resolved';
        const msg = isResolved 
            ? '*Support Executive marked this ticket as Resolved.*'
            : '*Live chat session ended. Ticket remains open for processing.*';

        adminAppendBubble(msg, 'System', new Date());
        const inp = document.getElementById('adminChatInput');
        const btn = document.getElementById('adminChatSendBtn');
        if (inp) inp.disabled = true;
        if (btn) btn.disabled = true;

        const endChatBtn = document.getElementById('adminEndChatBtn');
        if (endChatBtn) endChatBtn.style.display = 'none';

        if (isResolved) {
            const resolveBtn = document.getElementById('adminResolveBtn');
            if (resolveBtn) resolveBtn.style.display = 'none';

            const pillEl = document.getElementById('adminChatModalStatusPill');
            if (pillEl) {
                pillEl.textContent = 'Resolved';
                pillEl.style.cssText = 'background:#f0fdf4;color:#15803d;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;';
            }
            adminChatCurrentTicket.status = 'Resolved';
        }
        adminChatCurrentTicket.chatActive = false;
    }
    
    if (typeof fetchAdminTickets === 'function') {
        fetchAdminTickets();
    }
});

// ---- Tab switching ----
window.switchHelpdeskTab = function (tabId) {
    document.querySelectorAll('.helpdesk-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.helpdesk-tab-content').forEach(view => view.style.display = 'none');
    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById(tabId + '-view').style.display = 'block';
    if (tabId === 'active-tickets') fetchAdminTickets();
    else if (tabId === 'live-chats') fetchLiveChats();
};

// ==========================================
// 🗂️  ACTIVE TICKETS TAB
// ==========================================
let _adminAllTickets = [];
let _adminTicketSubTab = 'All';
let _adminTicketSearchQuery = '';
let _adminSearchTimeout = null;

window.handleAdminTicketSearchInput = function (event) {
    const val = event.target.value;
    const clearBtn = document.getElementById('adminTicketSearchClear');
    if (clearBtn) {
        clearBtn.style.display = val ? 'block' : 'none';
    }

    if (_adminSearchTimeout) {
        clearTimeout(_adminSearchTimeout);
    }

    _adminSearchTimeout = setTimeout(() => {
        _adminTicketSearchQuery = val;
        fetchAdminTickets();
    }, 400);
};

window.handleAdminTicketSearchKey = function (event) {
    if (event.key === 'Enter') {
        if (_adminSearchTimeout) {
            clearTimeout(_adminSearchTimeout);
        }
        _adminTicketSearchQuery = event.target.value;
        fetchAdminTickets();
    }
};

window.clearAdminTicketSearch = function () {
    const input = document.getElementById('adminTicketSearch');
    if (input) {
        input.value = '';
    }
    const clearBtn = document.getElementById('adminTicketSearchClear');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    if (_adminSearchTimeout) {
        clearTimeout(_adminSearchTimeout);
    }
    _adminTicketSearchQuery = '';
    fetchAdminTickets();
};

window.setAdminTicketSubTab = function (subtab) {
    _adminTicketSubTab = subtab;
    const tabs = ['All', 'Open', 'Pending', 'Resolved', 'Closed'];
    tabs.forEach(t => {
        const btn = document.getElementById('adminTicketSubTab-' + t);
        if (btn) {
            if (t === subtab) {
                btn.style.background = '#ffffff';
                btn.style.color = '#4f46e5';
                btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            } else {
                btn.style.background = 'none';
                btn.style.color = '#64748b';
                btn.style.boxShadow = 'none';
            }
        }
    });
    renderAdminTicketsTable();
};

async function fetchAdminTickets() {
    try {
        let url = '/api/admin/tickets';
        if (_adminTicketSearchQuery && _adminTicketSearchQuery.trim() !== '') {
            url += '?search=' + encodeURIComponent(_adminTicketSearchQuery.trim());
        }
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) return;

        // Unified list: Keep all tickets including SMM Refills in the main flow
        _adminAllTickets = data.tickets;

        renderAdminTicketsTable();
    } catch (e) { console.error('Ticket fetch error:', e); }
}

function renderAdminTicketsTable() {
    let filtered = _adminAllTickets;
    if (_adminTicketSubTab === 'Open') {
        filtered = _adminAllTickets.filter(t => t.status === 'Open');
    } else if (_adminTicketSubTab === 'Pending') {
        filtered = _adminAllTickets.filter(t => t.status === 'Pending' || t.status === 'In Progress');
    } else if (_adminTicketSubTab === 'Resolved') {
        filtered = _adminAllTickets.filter(t => t.status === 'Resolved');
    } else if (_adminTicketSubTab === 'Closed') {
        filtered = _adminAllTickets.filter(t => t.status === 'Closed');
    }

    document.getElementById('ticketCount').innerText = filtered.length + ' Tickets';
    const tbody = document.getElementById('ticketsTable');
    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:30px;">No tickets found here 🎉</td></tr>';
        return;
    }
    
    const statusColors = {
        'Open':        { bg: '#fef3c7', text: '#92400e' },
        'Pending':     { bg: '#fef3c7', text: '#92400e' },
        'In Progress': { bg: '#eff6ff', text: '#1d4ed8' },
        'Resolved':    { bg: '#f0fdf4', text: '#15803d' },
        'Closed':      { bg: '#f1f5f9', text: '#64748b' }
    };

    filtered.forEach(t => {
        const style = statusColors[t.status] || { bg: '#f1f5f9', text: '#64748b' };
        let contextMeta = '';
        if (t.orderId && t.orderId !== 'N/A') contextMeta = `<br><span style="background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">Order: ${t.orderId}</span>`;
        if (t.category) contextMeta += ` <span style="background:#e0e7ff;color:#4f46e5;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">${t.category}</span>`;
        if (t.subcategory) contextMeta += ` <span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">${t.subcategory}</span>`;
        const ticketNum = t.ticketNumber || ('#' + String(t._id).slice(-6).toUpperCase());

        let liveBadge = '';
        if (t.chatActive && t.category === 'Live Chat') {
            liveBadge = ` <span class="live-chat-glow-badge"><span style="width:6px;height:6px;background:#ef4444;border-radius:50%;display:inline-block;"></span>🔴 Live Chat</span>`;
        }

        let refillBadge = '';
        if (t.actionRequired === 'Refill') {
            refillBadge = ` <span class="refill-glow-badge"><span style="width:6px;height:6px;background:#0369a1;border-radius:50%;display:inline-block;"></span>🔄 Refill Request</span>`;
        }

        tbody.innerHTML += `
        <tr>
            <td><strong>${t.clientName || 'Client'}</strong><br><small style="color:#94a3b8;">${t.clientEmail}</small></td>
            <td style="font-weight:600;">${ticketNum}${liveBadge}${refillBadge}<br>${t.subject}${contextMeta}</td>
            <td style="max-width:160px;font-size:13px;color:#475569;">${(t.issue||'').substring(0,80)}...</td>
            <td>
                <select onchange="updateTicketStatus('${t._id}', this.value)" style="padding:6px 12px;border:none;border-radius:20px;font-weight:bold;font-size:12px;background:${style.bg};color:${style.text};outline:none;cursor:pointer;">
                    <option value="Open" ${t.status==='Open'?'selected':''} style="background:#ffffff;color:#92400e;">🟡 Open</option>
                    <option value="Pending" ${t.status==='Pending'?'selected':''} style="background:#ffffff;color:#92400e;">🟣 Processing/Pending</option>
                    <option value="Resolved" ${t.status==='Resolved'?'selected':''} style="background:#ffffff;color:#15803d;">✅ Resolved</option>
                    <option value="Closed" ${t.status==='Closed'?'selected':''} style="background:#ffffff;color:#64748b;">⛔ Closed</option>
                </select>
            </td>
            <td>
                <button onclick="openAdminTicketChat('${t._id}')" style="background:linear-gradient(135deg,#6c63ff,#4f46e5);color:white;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px;"><i class="ri-chat-3-line"></i> Open Chat</button>
            </td>
        </tr>`;
    });
}

// ==========================================
// 💬  LIVE CHATS TAB
// ==========================================
async function fetchLiveChats() {
    try {
        const res = await fetch('/api/admin/tickets', { credentials: 'include' });
        const data = await res.json();
        if (!data.success) return;

        const liveChats = data.tickets.filter(t => t.category === 'Live Chat' && t.chatActive);
        const tbody = document.getElementById('liveChatsTableBody');
        tbody.innerHTML = '';
        if (liveChats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:30px;">No active live chat requests 💬</td></tr>';
            return;
        }
        liveChats.forEach(t => {
            const isActive = activeAdminTicketId === t._id;
            const btnHtml = isActive
                ? `<span style="color:#10b981;font-weight:bold;animation:pulse 1.5s infinite;">Active Chatting...</span>`
                : `<button onclick="openAdminTicketChat('${t._id}')" style="background:#10b981;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;">Join Chat 💬</button>`;

            tbody.innerHTML += `
        <tr>
            <td><strong>${t.clientName||'Client'}</strong><br><small style="color:#94a3b8;">${t.clientEmail}</small></td>
            <td style="font-weight:700;">${t.orderId}</td>
            <td>${t.subject}</td>
            <td><span style="background:#d1fae5;color:#065f46;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;">Waiting</span></td>
            <td>${btnHtml}</td>
        </tr>`;
        });
    } catch (e) { console.error('Live chats fetch error:', e); }
}

// ==========================================
// 💬  ADMIN CHAT MODAL  (unified for all ticket types)
// ==========================================
window.openAdminTicketChat = async function (ticketId) {
    // Fetch the full ticket
    try {
        const res  = await fetch('/api/admin/tickets', { credentials: 'include' });
        const data = await res.json();
        if (!data.success) return;
        const ticket = data.tickets.find(t => t._id === ticketId);
        if (!ticket) return alert('Ticket not found');
        adminOpenChatModal(ticket);
    } catch (e) { alert('Error loading ticket'); }
};

function adminOpenChatModal(ticket) {
    adminChatCurrentTicket = ticket;
    window.currentActiveChatId = ticket._id;
    activeAdminTicketId = ticket._id;

    // Build or reuse modal
    let modal = document.getElementById('adminTicketChatModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'adminTicketChatModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:#fff;width:95%;max-width:620px;border-radius:20px;box-shadow:0 24px 60px rgba(15,23,42,0.2);display:flex;flex-direction:column;overflow:hidden;max-height:90vh;">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#6c63ff,#4f46e5);padding:16px 20px;display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:#fff;flex-shrink:0;">🎧</div>
                <div style="flex:1;">
                    <h4 id="adminChatModalTitle" style="margin:0;color:#fff;font-size:1rem;font-weight:700;"></h4>
                    <span id="adminChatModalMeta" style="color:rgba(255,255,255,0.75);font-size:0.78rem;"></span>
                </div>
                <div id="adminChatModalStatusPill" style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;"></div>
                <button id="adminEndChatBtn" onclick="adminEndActiveChat()" style="background:#fee2e2;color:#ef4444;border:none;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;display:none;align-items:center;gap:3px;"><i class="ri-close-circle-line"></i> End Live Chat Session</button>
                <button id="adminResolveBtn" onclick="adminResolveActiveTicket()" style="background:#d1fae5;color:#065f46;border:none;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;display:none;align-items:center;gap:3px;"><i class="ri-checkbox-circle-line"></i> Mark Resolved</button>
                <button onclick="adminCloseTicketModal()" style="background:rgba(255,255,255,0.15);border:none;width:30px;height:30px;border-radius:50%;color:#fff;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <!-- Ticket context strip -->
            <div id="adminChatContextStrip" style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 20px;font-size:12px;color:#475569;display:flex;gap:8px;flex-wrap:wrap;"></div>
            <!-- Messages -->
            <div id="adminChatHistory" style="height:calc(100vh - 300px);min-height:380px;overflow-y:auto;padding:16px;background:#f8fafc;display:flex;flex-direction:column;gap:4px;"></div>
            <!-- Input -->
            <div id="adminChatInputRow" style="border-top:1px solid #f1f5f9;padding:12px 14px;display:flex;gap:8px;align-items:center;background:#fff;">
                <input type="text" id="adminChatInput" placeholder="Type a reply to the client..."
                    style="flex:1;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:0.88rem;outline:none;font-family:inherit;background:#f8fafc;"
                    onfocus="this.style.borderColor='#6c63ff'" onblur="this.style.borderColor='#e2e8f0'"
                    onkeypress="if(event.key==='Enter')adminSendChatMessage()">
                <button id="adminChatSendBtn" onclick="adminSendChatMessage()"
                    style="width:42px;height:42px;border-radius:12px;border:none;background:linear-gradient(135deg,#6c63ff,#4f46e5);color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="ri-send-plane-fill"></i></button>
            </div>
            <!-- Refill Action Bar (visible only for Refill tickets) -->
            <div id="adminRefillActionBar" style="display:none;border-top:1px solid #fde68a;background:#fffbeb;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <span style="font-size:0.85rem;color:#92400e;font-weight:600;">💧 This is a Refill ticket.</span>
                <div style="display:flex;gap:8px;">
                    <button id="adminStartRefillBtn" onclick="adminStartRefillFromChat()" style="background:linear-gradient(135deg,#6c63ff,#4f46e5);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-size:0.85rem;font-weight:700;cursor:pointer;">🚀 Refill Started</button>
                    <button id="adminProcessRefillBtn" onclick="adminProcessRefillFromChat()" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-size:0.85rem;font-weight:700;cursor:pointer;">✅ Refill Completed</button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modal);
        // Close on backdrop click
        modal.addEventListener('click', (e) => { if (e.target === modal) adminCloseTicketModal(); });
    }

    // Toggle End Chat button visibility based on ticket.chatActive status
    const endChatBtn = document.getElementById('adminEndChatBtn');
    if (endChatBtn) {
        endChatBtn.style.display = ticket.chatActive ? 'flex' : 'none';
    }

    // Always show Mark Resolved button if the ticket is not already Resolved or Closed
    const resolveBtn = document.getElementById('adminResolveBtn');
    if (resolveBtn) {
        const isOpenOrWaiting = ticket.status !== 'Resolved' && ticket.status !== 'Closed';
        resolveBtn.style.display = isOpenOrWaiting ? 'flex' : 'none';
    }

    // Populate header
    const ticketNum = ticket.ticketNumber || ('#' + String(ticket._id).slice(-6).toUpperCase());
    document.getElementById('adminChatModalTitle').textContent = ticket.subject;
    document.getElementById('adminChatModalMeta').textContent = `${ticketNum} · ${ticket.clientName || ticket.clientEmail}`;

    // Status pill
    const pillEl = document.getElementById('adminChatModalStatusPill');
    const pillColors = { Open:'background:#fff7ed;color:#c2410c;', Pending:'background:#ede9fe;color:#6d28d9;', 'In Progress':'background:#eff6ff;color:#1d4ed8;', Resolved:'background:#f0fdf4;color:#15803d;', Closed:'background:#f1f5f9;color:#64748b;' };
    pillEl.style.cssText = (pillColors[ticket.status]||'background:#f1f5f9;color:#64748b;') + 'font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;';
    pillEl.textContent = ticket.status;

    // Context strip
    const strip = document.getElementById('adminChatContextStrip');
    strip.innerHTML = '';
    if (ticket.orderId && ticket.orderId !== 'N/A') strip.innerHTML += `<span style="background:#e0e7ff;color:#4f46e5;padding:2px 8px;border-radius:20px;font-weight:700;">Order: ${ticket.orderId}</span>`;
    if (ticket.category) strip.innerHTML += `<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:20px;font-weight:700;">${ticket.category}</span>`;
    if (ticket.subcategory) strip.innerHTML += `<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:20px;font-weight:700;">${ticket.subcategory}</span>`;
    if (ticket.clientEmail) strip.innerHTML += `<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:20px;">✉️ ${ticket.clientEmail}</span>`;

    // Refill action bar
    const refillBar = document.getElementById('adminRefillActionBar');
    const isRefill  = ticket.actionRequired === 'Refill';
    const isRefillDone = ticket.actionRequired === 'Completed' || ticket.status === 'Resolved' || ticket.status === 'Closed';
    if (refillBar) {
        refillBar.style.display = isRefill ? 'flex' : 'none';
        const startBtn = document.getElementById('adminStartRefillBtn');
        const processBtn = document.getElementById('adminProcessRefillBtn');
        if (startBtn && processBtn) {
            if (isRefillDone) {
                startBtn.style.display = 'none';
                processBtn.disabled = true;
                processBtn.textContent = '✅ Refill Completed';
                processBtn.style.background = '#e2e8f0';
                processBtn.style.color = '#94a3b8';
            } else {
                startBtn.style.display = 'inline-block';
                processBtn.disabled = false;
                processBtn.textContent = '✅ Refill Completed';
                processBtn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
                processBtn.style.color = '#fff';
                
                if (ticket.status === 'Pending') {
                    startBtn.disabled = true;
                    startBtn.textContent = '🚀 Refill In Progress';
                    startBtn.style.background = '#e2e8f0';
                    startBtn.style.color = '#94a3b8';
                } else {
                    startBtn.disabled = false;
                    startBtn.textContent = '🚀 Refill Started';
                    startBtn.style.background = 'linear-gradient(135deg,#6c63ff,#4f46e5)';
                    startBtn.style.color = '#fff';
                }
            }
        }
    }

    // Render message history
    const history = document.getElementById('adminChatHistory');
    history.innerHTML = '';
    adminAppendBubble(`Ticket opened: ${ticket.subject}`, 'System/Bot', ticket.date);
    if (ticket.issue) adminAppendBubble(ticket.issue, ticket.clientName || 'Client', ticket.date);
    (ticket.replies || []).forEach(r => adminAppendBubble(r.text || r.message, r.sender, r.createdAt || r.date));

    // Input state
    const isClosed = ticket.status === 'Closed' || ticket.status === 'Resolved';
    document.getElementById('adminChatInput').disabled = isClosed;
    document.getElementById('adminChatSendBtn').disabled = isClosed;

    // Join the socket room
    if (window.adminSocket) {
        window.adminSocket.emit('support_agent_join', { ticketId: ticket._id, agentName: 'Admin Support', agentEmail: 'admin@vibesphere.in' });
    }

    modal.style.display = 'flex';
}

window.adminCloseTicketModal = function () {
    const modal = document.getElementById('adminTicketChatModal');
    if (modal) modal.style.display = 'none';
    adminChatCurrentTicket = null;
    window.currentActiveChatId = null;
    activeAdminTicketId = null;
};

window.adminSendChatMessage = function () {
    const inp  = document.getElementById('adminChatInput');
    const text = (inp?.value || '').trim();
    if (!text || !adminChatCurrentTicket) return;
    if (window.adminSocket) {
        window.adminSocket.emit('support_send_msg', { ticketId: adminChatCurrentTicket._id, text, sender: 'Admin' });
    }
    adminAppendBubble(text, 'Admin', new Date());
    inp.value = '';
};

window.adminStartRefillFromChat = async function () {
    if (!adminChatCurrentTicket) return;
    const btn = document.getElementById('adminStartRefillBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Initiating...';
    try {
        const res = await fetch('/api/admin/start-refill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: adminChatCurrentTicket._id }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            btn.textContent = '🚀 Refill In Progress';
            btn.style.background = '#e2e8f0';
            btn.style.color = '#94a3b8';
            const pillEl = document.getElementById('adminChatModalStatusPill');
            if (pillEl) {
                pillEl.textContent = 'Pending';
                pillEl.style.cssText = 'background:#ede9fe;color:#6d28d9;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;';
            }
            adminChatCurrentTicket.status = 'Pending';
            if (typeof fetchAdminTickets === 'function') fetchAdminTickets();
        } else {
            btn.disabled = false;
            btn.textContent = '🚀 Refill Started';
            alert(data.message || 'Failed to start refill');
        }
    } catch (e) {
        btn.disabled = false;
        btn.textContent = '🚀 Refill Started';
        alert('Error starting refill');
    }
};

window.adminProcessRefillFromChat = async function () {
    if (!adminChatCurrentTicket) return;
    const btn = document.getElementById('adminProcessRefillBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Processing...';
    try {
        const res  = await fetch('/api/admin/process-refill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: adminChatCurrentTicket._id }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            btn.textContent = '✅ Refill Completed';
            btn.style.background = '#e2e8f0';
            btn.style.color = '#94a3b8';
            const startBtn = document.getElementById('adminStartRefillBtn');
            if (startBtn) startBtn.style.display = 'none';
            const pillEl = document.getElementById('adminChatModalStatusPill');
            if (pillEl) { pillEl.textContent = 'Resolved'; pillEl.style.cssText = 'background:#f0fdf4;color:#15803d;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;'; }
            document.getElementById('adminChatInput').disabled = true;
            document.getElementById('adminChatSendBtn').disabled = true;
            adminChatCurrentTicket.status = 'Resolved';
            adminChatCurrentTicket.actionRequired = 'Completed';
            if (typeof fetchAdminTickets === 'function') fetchAdminTickets();
        } else {
            btn.disabled = false;
            btn.textContent = '✅ Refill Completed';
            alert(data.message || 'Failed to process refill');
        }
    } catch (e) {
        btn.disabled = false;
        btn.textContent = '✅ Refill Completed';
        alert('Error processing refill');
    }
};

// ---- Legacy function stubs kept for backward compat ----

window.joinLiveChat = async function (ticketId, clientName) {
    await window.openAdminTicketChat(ticketId);
};

window.handleAdminChatKey = function (event) {
    if (event.key === 'Enter') { event.preventDefault(); window.adminSendChatMessage(); }
};

window.sendAdminChatMessage = function (event) {
    if (event) event.preventDefault();
    window.adminSendChatMessage();
};

window.closeAdminChat = function () {
    window.adminCloseTicketModal();
};

window.initHelpdeskRealtime = function (socket) {
    helpdeskSocket = socket;
    window.socket = socket;
};

async function updateTicketStatus(id, status) {
    try {
        await fetch('/api/admin/update-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: id, status, sender: 'Admin' }), credentials: 'include'
        });
        fetchAdminTickets();
    } catch (e) { alert('Failed to update ticket'); }
}

async function replyToTicket(id) {
    const reply = (document.getElementById('reply-' + id)?.value || '').trim();
    if (!reply) return alert('Please type a reply');
    try {
        await fetch('/api/admin/update-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: id, reply, sender: 'Admin' }), credentials: 'include'
        });
        fetchAdminTickets();
    } catch (e) { alert('Failed to send reply'); }
}

window.fetchAdminTickets = fetchAdminTickets;
// ==========================================
// 📚 RESOURCE HUB FUNCTIONS
// ==========================================
function toggleResourceInput() {
    const type = document.getElementById('resType').value;
    document.getElementById('resContentWrap').style.display = type === 'pdf' ? 'none' : 'block';
    document.getElementById('resFileWrap').style.display = type === 'pdf' ? 'block' : 'none';
}
async function fetchAdminResources() {
    try {
        const res = await fetch('/api/resources', { credentials: 'include' });
        const data = await res.json();
        const list = document.getElementById('resourcesList');
        list.innerHTML = '';
        if (!data.resources || data.resources.length === 0) {
            list.innerHTML = '<div class="chat-empty" style="grid-column:1/-1;">No resources added yet.</div>';
            return;
        }
        data.resources.forEach(r => {
            const inferredIcon = r.type === 'pdf'
                ? '📄'
                : r.type === 'text'
                    ? '📝'
                    : /\.(png|jpe?g|webp|gif)$/i.test(r.content || '')
                        ? '🖼️'
                        : /\.(doc|docx)$/i.test(r.content || '')
                            ? '📘'
                            : '🔗';
            const contentHtml = r.type === 'link' ? `<a href="${r.content}" target="_blank" style="color:#6c63ff;text-decoration:none;word-break:break-all;">${escapeHtml(r.content)}</a>`
                : r.type === 'pdf' ? `<a href="${r.content}" target="_blank" style="color:#6c63ff;text-decoration:none;">📥 Download PDF</a>`
                    : `<p style="font-size:13px;color:#475569;margin:0;white-space:pre-wrap;">${escapeHtml(r.content)}</p>`;
            list.innerHTML += `
        <div class="resource-drive-card">
            <div class="resource-head">
                <div style="display:flex;gap:12px;align-items:flex-start;">
                    <div class="resource-kind-icon">${inferredIcon}</div>
                    <div>
                        <h4 style="margin:0 0 4px;color:#1e293b;">${escapeHtml(r.title)}</h4>
                        <span style="font-size:12px;background:#eff6ff;color:#1d4ed8;padding:4px 10px;border-radius:999px;font-weight:700;">${String(r.type || 'link').toUpperCase()}</span>
                    </div>
                </div>
                <button onclick="deleteResource('${r._id}')" class="resource-icon-btn" style="width:36px;height:36px;">🗑️</button>
            </div>
            ${contentHtml}
            <div style="margin-top:12px;font-size:11px;color:#94a3b8;">${new Date(r.date).toLocaleDateString()}</div>
        </div>`;
        });
    } catch (e) { console.error('Resources fetch error:', e); }
}
async function addResource() {
    const title = document.getElementById('resTitle').value.trim();
    const type = document.getElementById('resType').value;
    if (!title) return alert('Title is required!');
    const formData = new FormData();
    formData.append('title', title);
    formData.append('type', type);
    if (type === 'pdf') {
        const file = document.getElementById('resFile').files[0];
        if (!file) return alert('Please select a PDF file!');
        formData.append('file', file);
        formData.append('content', '');
    } else {
        const content = document.getElementById('resContent').value.trim();
        if (!content) return alert('Content/URL is required!');
        formData.append('content', content);
    }
    try {
        const res = await fetch('/api/admin/add-resource', {
            method: 'POST', credentials: 'include',
            body: formData
        });
        const data = await res.json();
        alert(data.message);
        document.getElementById('resTitle').value = '';
        document.getElementById('resContent').value = '';
        if (document.getElementById('resFile')) document.getElementById('resFile').value = '';
        fetchAdminResources();
    } catch (e) { alert('Failed to add resource'); }
}
async function deleteResource(id) {
    if (!confirm('Delete this resource?')) return;
    try {
        await fetch('/api/admin/delete-resource/' + id, { method: 'DELETE', credentials: 'include' });
        fetchAdminResources();
    } catch (e) { alert('Failed to delete'); }
}
document.getElementById('resourceDropzone')?.addEventListener('dragover', (event) => {
    event.preventDefault();
});
document.getElementById('resourceDropzone')?.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    document.getElementById('resType').value = 'pdf';
    toggleResourceInput();
    const fileInput = document.getElementById('resFile');
    try {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
    } catch (e) {
        showToast('Drag-and-drop ready. Please choose the PDF again if your browser blocked the file handoff.', 'warning');
    }
});
// ==========================================
// 🎬 MEETING FUNCTIONS
// ==========================================
async function scheduleMeeting() {
    const topic = document.getElementById('meetTopic').value.trim();
    const localTime = document.getElementById('meetTime').value;
    const password = document.getElementById('meetPass').value.trim();
    if (!topic || !localTime) return alert('Topic & Time required!');
    // 🟢 Timezone Fix: Convert local time to UTC (ISO)
    const scheduledTime = new Date(localTime).toISOString();
    try {
        const res = await fetch('/api/admin/create-meeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, scheduledTime, password }), credentials: 'include'
        });
        const data = await res.json();
        alert(data.message);
        document.getElementById('meetTopic').value = '';
        document.getElementById('meetTime').value = '';
        document.getElementById('meetPass').value = '';
        fetchMeetings();
    } catch (e) { alert('Failed to schedule meeting'); }
}
async function fetchMeetings() {
    try {
        const res = await fetch('/api/meetings', { credentials: 'include' });
        const data = await res.json();
        const list = document.getElementById('meetingsList');
        list.innerHTML = '';
        if (!data.meetings || data.meetings.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:40px;grid-column:1/-1;">No meetings scheduled yet 🎬</div>';
            return;
        }
        data.meetings.forEach(m => {
            const statusColors = { 'Scheduled': '#f59e0b', 'Live': '#10b981', 'Ended': '#94a3b8' };
            const statusBg = { 'Scheduled': '#fffbeb', 'Live': '#f0fdf4', 'Ended': '#f8fafc' };
            const isUpcoming = new Date(m.scheduledTime) > new Date() || m.status === 'Live';
            // 🟢 Escape quotes for safe onclick handlers
            const safeTopic = (m.topic || "").replace(/'/g, "\\'");
            const safeRoom = (m.roomName || "").replace(/'/g, "\\'");
            list.innerHTML += `
        <div class="staff-card" style="padding:20px;border-left:4px solid ${statusColors[m.status] || '#cbd5e1'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <span style="font-size:12px;padding:3px 10px;border-radius:12px;font-weight:bold;background:${statusBg[m.status]};color:${statusColors[m.status]};">${m.status === 'Live' ? '🔴 LIVE' : m.status === 'Ended' ? '⭕ Ended' : '📅 Scheduled'} ${m.password ? '🔒' : ''}</span>
                <div style="display:flex;gap:5px;">
                    <button onclick="openEditMeetingModal('${m._id}', '${safeTopic}', '${m.scheduledTime}')" style="background:#f1f5f9;border:none;color:#64748b;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;">✏️</button>
                    <button onclick="deleteMeeting('${m._id}')" style="background:#fee2e2;border:none;color:#ef4444;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;">🗑️</button>
                </div>
            </div>
            <h4 style="margin-bottom:8px;color:#1e293b;">${m.topic}</h4>
            <p style="font-size:13px;color:#64748b;margin-bottom:12px;">🕒 ${new Date(m.scheduledTime).toLocaleString()}</p>
            
            <div style="display:flex;gap:8px;">
                ${isUpcoming ? `<button onclick="joinMeeting('${safeRoom}', 'Admin')" style="flex:1;background:#6c63ff;color:white;border:none;padding:10px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;transition:0.3s;" onmouseover="this.style.background='#5a52d5'" onmouseout="this.style.background='#6c63ff'">🎬 Join Meeting</button>` : ''}
                <button onclick="copyMeetingLink('${safeRoom}', this)" style="flex:1;background:#f1f5f9;color:#64748b;border:none;padding:10px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;">🔗 Copy Link</button>
            </div>
        </div>`;
        });
    } catch (e) { console.error('Meetings error:', e); }
}
async function deleteMeeting(id) {
    if (!confirm('Delete this meeting?')) return;
    try {
        await fetch('/api/admin/delete-meeting/' + id, { method: 'DELETE', credentials: 'include' });
        fetchMeetings();
    } catch (e) { alert('Failed to delete'); }
}
function joinMeeting(roomName, displayName) {
    // Hide meetings list section and show JaaS container
    document.getElementById('meetings-section').style.display = 'none';
    document.getElementById('jaas-container').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const container = document.getElementById('jitsi-iframe-wrapper');
    container.innerHTML = '';
    // Load JaaS External API script
    const script = document.createElement('script');
    script.src = 'https://8x8.vc/external_api.js';
    script.onload = () => {
        const cleanRoomName = roomName.trim();
        window.currentJaasRoomName = cleanRoomName;
        const api = new JitsiMeetExternalAPI('8x8.vc', {
            roomName: cleanRoomName,
            parentNode: container,
            width: '100%',
            height: '100%',
            userInfo: { displayName: displayName || 'Admin' },
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: false,
                prejoinPageEnabled: true
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'participants-pane', 'tileview', 'hangup'],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false
            }
        });
        window.currentJaasApi = api;
        api.addEventListener('videoConferenceLeft', () => {
            leaveJaasCall();
        });
    };
    document.body.appendChild(script);
}
function toggleFullScreen(elemId) {
    const elem = document.getElementById(elemId);
    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}
// 🟢 NAYA: Unified Copy Link Function
window.copyMeetingLink = function (arg1, arg2) {
    let link = "";
    let btn = null;
    if (arg1 === 'jaas-copy-btn') {
        if (!window.currentJaasRoomName) return;
        const roomId = window.currentJaasRoomName.split('/').pop();
        link = window.location.origin + '/join-meeting?room=' + encodeURIComponent(roomId);
        btn = document.getElementById(arg1);
    } else {
        const roomId = arg1.split('/').pop();
        link = window.location.origin + '/join-meeting?room=' + encodeURIComponent(roomId);
        btn = arg2;
    }
    if (link && btn) {
        navigator.clipboard.writeText(link).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            const originalColor = btn.style.color;
            btn.style.color = '#10b981';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.color = originalColor;
            }, 2000);
        }).catch(err => console.error('Copy failed:', err));
    }
}
// 🟢 NAYA: Meeting Rescheduling Logic
window.openEditMeetingModal = function (id, topic, time) {
    window.editingMeetingId = id;
    document.getElementById('editMeetTopic').innerText = topic;
    const d = new Date(time);
    const localStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    document.getElementById('editMeetTime').value = localStr;
    document.getElementById('editMeetingModal').style.display = 'flex';
}
window.closeEditMeetingModal = function () {
    document.getElementById('editMeetingModal').style.display = 'none';
}
window.updateMeetingTime = async function () {
    const localTime = document.getElementById('editMeetTime').value;
    if (!localTime) return;
    // 🟢 Timezone Fix: Convert local time to UTC (ISO)
    const newTime = new Date(localTime).toISOString();
    try {
        const res = await fetch('/api/admin/update-meeting-time', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingId: window.editingMeetingId, newTime }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message);
            closeEditMeetingModal();
            fetchMeetings();
        }
    } catch (e) { alert("Failed to update time"); }
}
function leaveJaasCall() {
    if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
    }
    if (window.currentJaasApi) {
        window.currentJaasApi.dispose();
        window.currentJaasApi = null;
    }
    document.getElementById('jitsi-iframe-wrapper').innerHTML = '';
    document.getElementById('jaas-container').style.display = 'none';
    document.getElementById('meetings-section').style.display = 'block';
    document.body.style.overflow = '';
}
// Socket: Listen for new meeting notifications
socket.on('new_meeting_scheduled', (data) => {
    console.log('🎬 Meeting Scheduled:', data.topic);
});

// Window Bindings
window.fetchReviews = fetchReviews;
window.deleteReview = deleteReview;
window.fetchPendingReviews = fetchPendingReviews;
window.moderateReview = moderateReview;
window.fetchBlogs = fetchBlogs;
window.generateSlug = generateSlug;
window.fetchAdminTickets = fetchAdminTickets;
window.updateTicketStatus = updateTicketStatus;
window.replyToTicket = replyToTicket;
window.fetchAdminResources = fetchAdminResources;
window.addResource = addResource;
window.deleteResource = deleteResource;
window.scheduleMeeting = scheduleMeeting;
window.fetchMeetings = fetchMeetings;
window.deleteMeeting = deleteMeeting;
window.joinMeeting = joinMeeting;

window.adminEndActiveChat = function () {
    if (!adminChatCurrentTicket) return;
    if (confirm('Are you sure you want to end this live chat session?')) {
        window.adminSocket.emit('support_close_chat', { ticketId: adminChatCurrentTicket._id, userType: 'Admin' });
    }
};

window.adminResolveActiveTicket = async function () {
    if (!adminChatCurrentTicket) return;
    if (confirm('Are you sure you want to mark this ticket as Resolved?')) {
        try {
            const res = await fetch('/api/admin/resolve-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: adminChatCurrentTicket._id }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert('Ticket resolved successfully!');

                const endChatBtn = document.getElementById('adminEndChatBtn');
                const resolveBtn = document.getElementById('adminResolveBtn');
                if (endChatBtn) endChatBtn.style.display = 'none';
                if (resolveBtn) resolveBtn.style.display = 'none';

                const pillEl = document.getElementById('adminChatModalStatusPill');
                if (pillEl) {
                    pillEl.textContent = 'Resolved';
                    pillEl.style.cssText = 'background:#f0fdf4;color:#15803d;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;';
                }

                adminChatCurrentTicket.status = 'Resolved';
                adminChatCurrentTicket.chatActive = false;

                if (typeof fetchAdminTickets === 'function') fetchAdminTickets();
            } else {
                alert(data.error || 'Failed to resolve ticket.');
            }
        } catch (e) {
            alert('Failed to connect to resolve endpoint.');
        }
    }
};

window.triggerAdminTicketRefresh = async function () {
    const btn = document.getElementById('refreshTicketsBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `<span class="refresh-spinning">🔄</span> Refreshing...`;
    
    if (typeof fetchAdminTickets === 'function') {
        await fetchAdminTickets();
    }
    
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = `🔄 Refresh`;
    }, 400);
};
