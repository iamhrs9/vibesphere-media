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
            const avatar = r.avatar ? `<img src="${r.avatar}">` : `<div style="width:40px;height:40px;background:#ddd;border-radius:50%;display:flex;align-items:center;justify-content:center;">${r.name[0]}</div>`;
            tbody.innerHTML += `
    <tr>
        <td>${new Date(r.date).toLocaleDateString()}</td>
        <td style="display:flex; gap:10px; align-items:center;">${avatar}<div><strong>${r.name}</strong><br><small style="color:#6c63ff">${r.instaId}</small></div></td>
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
async function fetchAdminTickets() {
    try {
        const res = await fetch('/api/admin/tickets', { credentials: 'include' });
        const data = await res.json();
        if (!data.success) return;
        document.getElementById('ticketCount').innerText = data.tickets.length + ' Tickets';
        const tbody = document.getElementById('ticketsTable');
        tbody.innerHTML = '';
        if (data.tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:30px;">No tickets yet 🎉</td></tr>';
            return;
        }
        data.tickets.forEach(t => {
            const statusColors = { 'Open': '#f59e0b', 'In Progress': '#3b82f6', 'Resolved': '#10b981' };
            const repliesHtml = t.replies.map(r => `<div style="font-size:11px;color:#475569;background:#f8fafc;padding:5px 8px;border-radius:6px;margin-top:4px;"><strong>${r.sender}:</strong> ${r.message}</div>`).join('');
            tbody.innerHTML += `
        <tr>
            <td><strong>${t.clientName || 'Client'}</strong><br><small style="color:#94a3b8;">${t.clientEmail}</small></td>
            <td style="font-weight:600;">${t.subject}</td>
            <td style="max-width:200px;font-size:13px;">${t.issue}${repliesHtml}</td>
            <td>
                <select onchange="updateTicketStatus('${t._id}', this.value)" style="padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-weight:bold;color:${statusColors[t.status] || '#333'};">
                    <option value="Open" ${t.status === 'Open' ? 'selected' : ''}>🟡 Open</option>
                    <option value="In Progress" ${t.status === 'In Progress' ? 'selected' : ''}>🔵 In Progress</option>
                    <option value="Resolved" ${t.status === 'Resolved' ? 'selected' : ''}>✅ Resolved</option>
                </select>
            </td>
            <td>
                <div style="display:flex;gap:5px;">
                    <input type="text" id="reply-${t._id}" placeholder="Type reply..." style="flex:1;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;">
                    <button onclick="replyToTicket('${t._id}')" style="background:#6c63ff;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">Reply</button>
                </div>
            </td>
        </tr>`;
        });
    } catch (e) { console.error('Ticket fetch error:', e); }
}
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
    const reply = document.getElementById('reply-' + id).value.trim();
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
