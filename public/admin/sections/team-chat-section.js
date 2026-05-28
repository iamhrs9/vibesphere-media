(function () {
    const CHAT_SECTION_HTML = "<div id=\"chat-section\" class=\"section\" data-module-mounted=\"true\">\n                <div class=\"premium-section\">\n                    <div class=\"section-header\">\n                        <div>\n                            <h2 class=\"section-title\">Team Chat</h2>\n                            <p class=\"section-subtitle\">A cleaner Slack-style command chat with live staff presence, richer messages, and focused conversation browsing.</p>\n                        </div>\n                    </div>\n\n                    <div id=\"adminChatShell\" class=\"chat-shell\">\n                        <div class=\"chat-sidebar-shell\">\n                            <div class=\"chat-toolbar\">\n                                <div>\n                                    <strong style=\"display:block;font-size:1rem;color:var(--text);\">Conversations</strong>\n                                    <span style=\"font-size:0.8rem;color:var(--muted);\">Staff members and recent threads</span>\n                                </div>\n                                <button class=\"icon-button\" onclick=\"fetchAdminChat()\" style=\"width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;\">\n                                    <i class=\"ri-refresh-line\"></i>\n                                </button>\n                            </div>\n                            <div class=\"toolbar-field\" style=\"margin:0;\">\n                                <label>Search chats</label>\n                                <input id=\"adminChatSearch\" type=\"text\" placeholder=\"Find a teammate or message\" oninput=\"renderAdminChatContacts()\">\n                            </div>\n                            <div id=\"adminChatSidebarList\" class=\"chat-contact-list\">\n                                <div class=\"chat-empty\">Conversations will appear here.</div>\n                            </div>\n                        </div>\n\n                        <div class=\"chat-window-shell\">\n                            <div class=\"chat-window-head\">\n                                <div class=\"chat-window-head-left\">\n                                    <button id=\"adminChatSidebarToggle\" class=\"icon-button chat-sidebar-toggle\" onclick=\"toggleChatSidebar()\" style=\"width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;\" title=\"Hide conversations\">\n                                        <i class=\"ri-menu-line\"></i>\n                                    </button>\n                                    <div class=\"chat-head-trigger\" onclick=\"openChatGroupInfo()\">\n                                        <strong id=\"adminActiveChatName\" style=\"display:block;font-size:1rem;\">Team Broadcast</strong>\n                                        <span id=\"adminActiveChatMeta\" style=\"font-size:0.82rem;color:var(--muted);\">All recent staff conversations</span>\n                                    </div>\n                                </div>\n                                <div class=\"section-actions\">\n                                    <button class=\"btn-ghost\" onclick=\"setActiveChat('all')\">All Messages</button>\n                                </div>\n                            </div>\n\n                            <div id=\"adminPinnedChatBanner\" class=\"pinned-chat-banner\">\n                                <div class=\"pinned-chat-copy\">\n                                    <strong>Pinned Message</strong>\n                                    <span id=\"adminPinnedChatText\">No pinned message yet.</span>\n                                </div>\n                                <button class=\"icon-button\" style=\"width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;\" onclick=\"scrollToPinnedMessage()\" title=\"Jump to pinned message\">\n                                    <i class=\"ri-pushpin-2-line\"></i>\n                                </button>\n                            </div>\n\n                            <div id=\"teamChatMessages\" class=\"chat-message-stream\"></div>\n\n                            <div class=\"chat-input-shell\">\n                                <div id=\"adminChatReplyDraft\" class=\"chat-reply-draft\">\n                                    <div class=\"chat-reply-draft-copy\">\n                                        <strong id=\"adminChatReplyAuthor\">Replying to</strong>\n                                        <span id=\"adminChatReplyText\">Message preview</span>\n                                    </div>\n                                    <button class=\"icon-button\" style=\"width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;\" onclick=\"clearAdminReplyDraft()\" title=\"Cancel reply\">\n                                        <i class=\"ri-close-line\"></i>\n                                    </button>\n                                </div>\n                                <input type=\"file\" id=\"adminChatFileInput\" style=\"display:none;\" accept=\"image/*,.pdf\" onchange=\"previewAdminChatFile(event)\">\n\n                                <button onclick=\"document.getElementById('adminChatFileInput').click()\" class=\"icon-button\" style=\"width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;\" title=\"Attach Image or PDF\">\n                                    <i class=\"ri-attachment-2\"></i>\n                                </button>\n\n                                <button id=\"adminMicBtn\" onclick=\"toggleAdminVoiceRecording()\" class=\"icon-button\" style=\"width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;\" title=\"Record Voice Note\">🎤</button>\n                                <span id=\"adminVoiceTimer\" style=\"display:none;font-size:13px;font-weight:700;color:#ef4444;min-width:50px;\">00:00</span>\n\n                                <div id=\"adminChatFilePreview\" style=\"display:none;position:absolute;bottom:80px;left:18px;background:white;padding:10px;border-radius:14px;box-shadow:0 18px 34px rgba(15,23,42,0.14);border:1px solid #e2e8f0;\">\n                                    <div id=\"adminChatPreviewContent\"></div>\n                                    <span onclick=\"removeAdminChatFile()\" style=\"position:absolute;top:-8px;right:-8px;background:#ef4444;color:white;border-radius:999px;width:22px;height:22px;display:flex;justify-content:center;align-items:center;cursor:pointer;font-size:12px;font-weight:700;\">×</span>\n                                </div>\n\n                                <input type=\"text\" id=\"teamChatInput\" placeholder=\"Message the team...\" onkeypress=\"if(event.key === 'Enter') sendAdminMessage()\">\n\n                                <button id=\"teamSendBtn\" onclick=\"sendAdminMessage()\" class=\"btn-publish\" style=\"min-width:48px;padding:0 16px;border-radius:999px;\">\n                                    <i class=\"ri-send-plane-fill\"></i>\n                                </button>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            </div>";
    const CHAT_GROUP_PANEL_HTML = "<div id=\"chatGroupInfoPanel\" class=\"chat-group-panel\">\n                <div class=\"chat-group-backdrop\" onclick=\"closeChatGroupInfo()\"></div>\n                <aside class=\"chat-group-sheet\">\n                    <div style=\"display:flex;align-items:center;justify-content:space-between;gap:12px;\">\n                        <div>\n                            <h3 style=\"margin:0;font-size:1.2rem;color:var(--text);\">Group Info</h3>\n                            <p id=\"chatGroupInfoMeta\" class=\"section-subtitle\" style=\"margin-top:6px;\">0 participants</p>\n                        </div>\n                        <button class=\"slideover-close\" onclick=\"closeChatGroupInfo()\">×</button>\n                    </div>\n                    <div class=\"chat-group-section\">\n                        <h4 class=\"chat-group-section-title\">Group Settings</h4>\n                        <div class=\"chat-group-toggle-row\">\n                            <div>\n                                <strong>Block All Chat</strong>\n                                <span id=\"chatGlobalMuteStatus\">Everyone can currently send messages to the group.</span>\n                            </div>\n                            <label class=\"chat-switch\" title=\"Restrict everyone from messaging\">\n                                <input id=\"chatGlobalMuteToggle\" type=\"checkbox\" onchange=\"handleGroupChatToggle(this.checked)\">\n                                <span class=\"chat-switch-slider\"></span>\n                            </label>\n                        </div>\n                    </div>\n                    <div class=\"chat-group-section\">\n                        <h4 class=\"chat-group-section-title\">Participants</h4>\n                        <div class=\"chat-group-list\" id=\"chatGroupInfoList\">\n                            <div class=\"chat-empty\">Participants will appear here.</div>\n                        </div>\n                    </div>\n                </aside>\n            </div>";
    let chatSocket = null;
    let chatListenersBound = false;
    let chatUiListenersBound = false;

    function mountAdminTeamChatSection() {
        const target = document.getElementById('chat-section');
        if (!target || target.dataset.moduleMounted === 'true') return;
        target.outerHTML = CHAT_SECTION_HTML + '\n' + CHAT_GROUP_PANEL_HTML;
    }

    function bindChatUiListeners() {
        if (chatUiListenersBound) return;
        chatUiListenersBound = true;
        document.addEventListener('click', function (event) {
            if (!event.target.closest('.chat-menu-container')) {
                document.querySelectorAll('[id^="chat-menu-"]').forEach((menu) => {
                    menu.style.display = 'none';
                });
            }
        });
    }

                let chatBlocked = false;

                function getFilteredChatMessages() {
                    if (adminUiState.activeChatEmail === 'all') return adminUiState.chatMessages;
                    return (adminUiState.chatMessages || []).filter((msg) => msg.role === 'Admin' || msg.senderEmail === adminUiState.activeChatEmail);
                }

                function scrollAdminChatToBottom() {
                    const box = document.getElementById('teamChatMessages');
                    if (!box) return;
                    requestAnimationFrame(() => {
                        box.scrollTop = box.scrollHeight;
                    });
                }

                function renderChatAttachment(msg, isAdmin) {
                    if (!msg.fileUrl) return '';
                    if (msg.fileType === 'audio') {
                        return `<div style="margin-bottom:8px;"><audio controls src="${msg.fileUrl}" style="width:100%;max-width:280px;height:38px;" preload="metadata"></audio></div>`;
                    }
                    if (msg.fileType === 'pdf') {
                        return `<div style="margin-bottom:8px;"><a href="${msg.fileUrl}" target="_blank" style="display:inline-flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;text-decoration:none;background:${isAdmin ? 'rgba(255,255,255,0.16)' : '#fff'};color:${isAdmin ? '#fff' : '#1d4ed8'};border:${isAdmin ? '1px solid rgba(255,255,255,0.15)' : '1px solid #dbeafe'};"><span style="font-size:1.1rem;">📄</span><span>${escapeHtml(msg.fileName || 'Document.pdf')}</span></a></div>`;
                    }
                    return `<div style="margin-bottom:8px;"><img src="${msg.fileUrl}" style="max-width:240px;border-radius:14px;display:block;" onclick="window.open('${msg.fileUrl}','_blank')"></div>`;
                }

                function getChatPreviewText(msg) {
                    if (msg?.message) return String(msg.message).slice(0, 90);
                    if (msg?.fileName) return msg.fileName;
                    if (msg?.fileType === 'audio') return 'Voice note';
                    return 'Attachment';
                }

                function renderChatReplyBlock(msg, isAdmin) {
                    if (!msg?.replyTo?.senderName && !msg?.replyTo?.previewText) return '';
                    return `
                        <div class="chat-reply-preview">
                            <strong style="display:block;margin-bottom:4px;font-size:0.72rem;opacity:0.86;">Replying to ${escapeHtml(msg.replyTo.senderName || 'Message')}</strong>
                            <span>${escapeHtml(msg.replyTo.previewText || 'Message')}</span>
                        </div>
                    `;
                }

                function renderChatActionButtons(msg) {
                    return `
                        <div class="chat-message-actions">
                            <button class="chat-message-action-btn" onclick="setAdminReplyDraft('${msg._id}', '${escapeHtml(msg.senderName || msg.senderEmail || 'Message')}', '${escapeHtml(getChatPreviewText(msg))}')" title="Reply">
                                <i class="ri-reply-line"></i>
                            </button>
                            <button class="chat-message-action-btn pin" onclick="pinChatMessage('${msg._id}')" title="Pin message">
                                <i class="ri-pushpin-line"></i>
                            </button>
                            <button class="chat-message-action-btn delete" onclick="deleteMessage('${msg._id}')" title="Delete message">
                                <i class="ri-delete-bin-6-line"></i>
                            </button>
                        </div>
                    `;
                }

                function renderPinnedChatBanner() {
                    const banner = document.getElementById('adminPinnedChatBanner');
                    const text = document.getElementById('adminPinnedChatText');
                    if (!banner || !text) return;
                    const pinned = adminUiState.pinnedChatMessage;
                    if (!pinned) {
                        banner.classList.remove('active');
                        text.innerText = 'No pinned message yet.';
                        return;
                    }
                    banner.classList.add('active');
                    text.innerText = `${pinned.senderName || pinned.senderEmail || 'Message'}: ${getChatPreviewText(pinned)}`;
                }

                function renderAdminChatLayout() {
                    const shell = document.getElementById('adminChatShell');
                    const toggle = document.getElementById('adminChatSidebarToggle');
                    if (shell) {
                        shell.classList.toggle('sidebar-collapsed', Boolean(adminUiState.chatSidebarCollapsed));
                    }
                    if (toggle) {
                        toggle.setAttribute('title', adminUiState.chatSidebarCollapsed ? 'Show conversations' : 'Hide conversations');
                        toggle.setAttribute('aria-pressed', adminUiState.chatSidebarCollapsed ? 'true' : 'false');
                    }
                }

                function renderChatGroupInfo() {
                    const list = document.getElementById('chatGroupInfoList');
                    const meta = document.getElementById('chatGroupInfoMeta');
                    if (!list || !meta) return;
                    const staffDirectory = Array.isArray(adminUiState.staffDirectory) ? adminUiState.staffDirectory : [];
                    meta.innerText = `${staffDirectory.length} participant${staffDirectory.length === 1 ? '' : 's'}`;
                    if (!staffDirectory.length) {
                        list.innerHTML = '<div class="chat-empty">No participants available right now.</div>';
                        return;
                    }
                    list.innerHTML = staffDirectory.map((staff) => `
                        <div class="chat-group-member">
                            <div class="chat-group-member-copy">
                                <div style="position:relative;">
                                    ${renderAvatarMarkup(staff)}
                                    <span class="online-dot ${staff.isOnline ? 'online' : ''}"></span>
                                </div>
                                <div>
                                    <strong>${escapeHtml(staff.name || staff.email || 'Staff')}</strong>
                                    <span>${escapeHtml(staff.role || 'Staff')} • ${escapeHtml(staff.email || '')}</span>
                                </div>
                            </div>
                            <button class="chat-member-toggle ${staff.isMuted ? 'is-muted' : ''}" onclick="muteStaffInChat('${staff.email}', ${!staff.isMuted})">${staff.isMuted ? 'Unmute' : 'Mute'}</button>
                        </div>
                    `).join('');
                }

                function buildChatContacts(staffDirectory = []) {
                    const directory = Array.isArray(staffDirectory) ? staffDirectory : [];
                    const staffMap = new Map(directory.map((staff) => [staff.email, staff]));
                    const contactsMap = new Map();
                    (adminUiState.chatMessages || []).forEach((msg) => {
                        if (msg.role === 'Admin') return;
                        const staff = staffMap.get(msg.senderEmail) || {};
                        const current = contactsMap.get(msg.senderEmail) || {
                            email: msg.senderEmail,
                            name: staff.name || msg.senderName || msg.senderEmail,
                            lastMessage: 'No message yet',
                            date: null,
                            isOnline: Boolean(staff.isOnline),
                            isMuted: Boolean(staff.isMuted),
                            profilePhoto: staff.profilePhoto || '',
                            role: staff.role || 'Staff'
                        };
                        if (!current.date || new Date(msg.date) > new Date(current.date)) {
                            current.lastMessage = msg.message || msg.fileName || 'Attachment';
                            current.date = msg.date;
                        }
                        contactsMap.set(msg.senderEmail, current);
                    });
                    directory.forEach((staff) => {
                        if (!staff.email) return;
                        if (!contactsMap.has(staff.email)) {
                            contactsMap.set(staff.email, {
                                email: staff.email,
                                name: staff.name || staff.email,
                                lastMessage: 'No message yet',
                                date: null,
                                isOnline: Boolean(staff.isOnline),
                                isMuted: Boolean(staff.isMuted),
                                profilePhoto: staff.profilePhoto || '',
                                role: staff.role || 'Staff'
                            });
                        }
                    });
                    adminUiState.chatContacts = [
                        {
                            email: 'all',
                            name: 'Team Broadcast',
                            lastMessage: 'Group announcements and team updates',
                            date: null,
                            isOnline: true,
                            isMuted: false,
                            profilePhoto: '',
                            role: 'Group'
                        },
                        ...Array.from(contactsMap.values()).sort((a, b) => {
                            const onlineDelta = Number(Boolean(b.isOnline)) - Number(Boolean(a.isOnline));
                            if (onlineDelta !== 0) return onlineDelta;
                            return String(a.name || '').localeCompare(String(b.name || ''));
                        })
                    ];
                }

                window.renderAdminChatContacts = function () {
                    const list = document.getElementById('adminChatSidebarList');
                    if (!list) return;
                    const term = String(document.getElementById('adminChatSearch')?.value || '').trim().toLowerCase();
                    const contacts = (adminUiState.chatContacts || []).filter((contact) => {
                        if (!term) return true;
                        return String(contact.name || '').toLowerCase().includes(term) || String(contact.email || '').toLowerCase().includes(term);
                    });

                    if (!contacts.length) {
                        list.innerHTML = '<div class="chat-empty">No matching conversations.</div>';
                        return;
                    }

                    list.innerHTML = contacts.map((contact) => `
                        <button class="chat-contact ${adminUiState.activeChatEmail === contact.email ? 'active' : ''}" onclick="setActiveChat('${escapeHtml(contact.email)}')">
                            <div style="position:relative;">
                                ${contact.email === 'all' ? '<div class="staff-avatar">TG</div>' : renderAvatarMarkup(contact)}
                                <span class="online-dot ${contact.isOnline ? 'online' : ''}"></span>
                            </div>
                            <div class="chat-contact-copy">
                                <strong>${escapeHtml(contact.name)}${contact.email === 'all' ? ' (Group)' : ''}</strong>
                                <span>${escapeHtml(contact.lastMessage || 'No message yet')}</span>
                            </div>
                        </button>
                    `).join('');
                };

                function renderAdminChatMessages() {
                    const box = document.getElementById('teamChatMessages');
                    if (!box) return;
                    const messages = getFilteredChatMessages();
                    if (!messages.length) {
                        box.innerHTML = '<div class="chat-empty">No messages in this conversation yet.</div>';
                        return;
                    }

                    box.innerHTML = messages.map((msg) => {
                        const isAdmin = msg.role === 'Admin';
                        const time = new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return `
                            <div class="chat-bubble-row ${isAdmin ? 'admin' : 'staff'}" id="msg-${msg._id}">
                                <div class="chat-message-cluster ${isAdmin ? 'admin' : 'staff'}">
                                    <div class="chat-bubble ${isAdmin ? 'admin' : 'staff'}">
                                        ${!isAdmin ? `<strong style="display:block;margin-bottom:6px;">${escapeHtml(msg.senderName || msg.senderEmail)}</strong>` : ''}
                                        ${isAdmin ? `<div class="chat-reply-chip">Official <span class="admin-chat-badge">Admin</span></div>` : ''}
                                        ${renderChatReplyBlock(msg, isAdmin)}
                                        ${renderChatAttachment(msg, isAdmin)}
                                        ${msg.message ? `<div>${escapeHtml(msg.message)}</div>` : ''}
                                        <div class="chat-meta">${isAdmin ? 'Admin' : escapeHtml(msg.senderEmail || '')}${isAdmin ? ' • Announcement' : ''} • ${time}</div>
                                    </div>
                                    ${renderChatActionButtons(msg)}
                                </div>
                            </div>
                        `;
                    }).join('');
                    scrollAdminChatToBottom();
                }

                window.openChatGroupInfo = function () {
                    document.getElementById('chatGroupInfoPanel')?.classList.add('open');
                    renderChatGroupInfo();
                    updateAdminChatBtn();
                };

                window.closeChatGroupInfo = function () {
                    document.getElementById('chatGroupInfoPanel')?.classList.remove('open');
                };

                window.toggleChatSidebar = function () {
                    adminUiState.chatSidebarCollapsed = !adminUiState.chatSidebarCollapsed;
                    renderAdminChatLayout();
                };

                window.setAdminReplyDraft = function (messageId, senderName, previewText) {
                    adminUiState.chatReplyDraft = {
                        messageId,
                        senderName,
                        previewText
                    };
                    const draft = document.getElementById('adminChatReplyDraft');
                    if (!draft) return;
                    document.getElementById('adminChatReplyAuthor').innerText = `Replying to ${senderName || 'Message'}`;
                    document.getElementById('adminChatReplyText').innerText = previewText || 'Message';
                    draft.classList.add('active');
                };

                window.clearAdminReplyDraft = function () {
                    adminUiState.chatReplyDraft = null;
                    document.getElementById('adminChatReplyDraft')?.classList.remove('active');
                };

                window.pinChatMessage = async function (id) {
                    try {
                        const res = await fetch(`/api/admin/pin-message/${id}`, {
                            method: 'POST',
                            credentials: 'include'
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.message || 'Failed to pin message.');
                        adminUiState.pinnedChatMessage = data.pinnedMessage || null;
                        renderPinnedChatBanner();
                    } catch (e) {
                        showToast(e.message || 'Failed to pin message.', 'error');
                    }
                };

                window.scrollToPinnedMessage = function () {
                    const id = adminUiState.pinnedChatMessage?._id;
                    if (!id) return;
                    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                };

                window.setActiveChat = function (email) {
                    adminUiState.activeChatEmail = email || 'all';
                    const activeName = document.getElementById('adminActiveChatName');
                    const activeMeta = document.getElementById('adminActiveChatMeta');
                    if (email === 'all') {
                        if (activeName) activeName.innerText = 'Team Broadcast';
                        if (activeMeta) activeMeta.innerText = 'All recent staff conversations';
                    } else {
                        const contact = (adminUiState.chatContacts || []).find((item) => item.email === email);
                        if (activeName) activeName.innerText = contact?.name || email;
                        if (activeMeta) activeMeta.innerText = `${contact?.role || 'Staff'} • ${email}`;
                    }
                    renderAdminChatContacts();
                    renderAdminChatMessages();
                };

                async function fetchAdminChat() {
                    try {
                        const [setRes, hisRes, staffRes] = await Promise.all([
                            fetch('/api/chat/settings', { credentials: 'include' }),
                            fetch('/api/chat/history', { credentials: 'include' }),
                            fetch('/api/admin/staff-directory?all=1', { credentials: 'include' })
                        ]);
                        const setJson = await setRes.json();
                        chatBlocked = Boolean(setJson.isChatBlocked);
                        updateAdminChatBtn();
                        const hisJson = await hisRes.json();
                        if (hisJson.success) {
                            adminUiState.chatMessages = hisJson.messages || [];
                            adminUiState.pinnedChatMessage = hisJson.pinnedMessage || null;
                            const staffJson = await staffRes.json();
                            adminUiState.staffDirectory = staffJson.staff || [];
                            buildChatContacts(adminUiState.staffDirectory);
                            if (adminUiState.activeChatEmail !== 'all' && !(adminUiState.chatContacts || []).some((contact) => contact.email === adminUiState.activeChatEmail)) {
                                adminUiState.activeChatEmail = 'all';
                            }
                            renderPinnedChatBanner();
                            renderChatGroupInfo();
                            renderAdminChatLayout();
                            renderAdminChatContacts();
                            renderAdminChatMessages();
                        }
                    } catch (e) { }
                }

                function updateAdminChatBtn() {
                    const toggle = document.getElementById('chatGlobalMuteToggle');
                    const status = document.getElementById('chatGlobalMuteStatus');
                    if (toggle) toggle.checked = Boolean(chatBlocked);
                    if (status) {
                        status.innerText = chatBlocked
                            ? 'Everyone is currently restricted from messaging the group.'
                            : 'Everyone can currently send messages to the group.';
                    }
                }

                async function toggleGlobalChat() {
                    try {
                        const res = await fetch('/api/admin/toggle-chat', { method: 'POST', credentials: 'include' });
                        const data = await res.json();
                        if (data.success) {
                            chatBlocked = Boolean(data.isChatBlocked);
                            updateAdminChatBtn();
                            showToast(chatBlocked ? 'Group chat is now blocked for everyone.' : 'Group chat has been reopened for everyone.', 'success');
                        } else {
                            throw new Error(data.message || 'Unable to update chat permissions.');
                        }
                    } catch (e) {
                        updateAdminChatBtn();
                        showToast(e.message || 'Failed to update group chat permissions.', 'error');
                    }
                }

                window.handleGroupChatToggle = function (checked) {
                    if (Boolean(checked) === Boolean(chatBlocked)) {
                        updateAdminChatBtn();
                        return;
                    }
                    toggleGlobalChat();
                };
                // ==========================================
                // ☁️ CHAT ATTACHMENT LOGIC (CLOUD UPLOAD)
                // ==========================================
                let selectedAdminChatFile = null; // { fileUrl, fileType, fileName }
                let isAdminUploading = false;

                window.previewAdminChatFile = async function (event) {
                    const file = event.target.files[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) return alert("File size must be less than 10MB!");

                    const previewDiv = document.getElementById('adminChatPreviewContent');
                    const previewContainer = document.getElementById('adminChatFilePreview');

                    // Show uploading state
                    isAdminUploading = true;
                    previewContainer.style.display = 'block';
                    previewDiv.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:10px;"><div style="width:20px;height:20px;border:3px solid #e2e8f0;border-top:3px solid #6c63ff;border-radius:50%;animation:spin 1s linear infinite;"></div><span style="font-size:13px;color:#475569;">Uploading...</span></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;

                    try {
                        const formData = new FormData();
                        formData.append('file', file);

                        const res = await fetch('/api/chat/upload', { credentials: 'include', method: 'POST', body: formData });
                        const data = await res.json();

                        if (data.success) {
                            selectedAdminChatFile = { fileUrl: data.fileUrl, fileType: data.fileType, fileName: data.fileName };

                            if (data.fileType === 'image') {
                                previewDiv.innerHTML = `<img src="${data.fileUrl}" style="width:100px;height:100px;object-fit:cover;border-radius:5px;">`;
                            } else {
                                previewDiv.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:5px;"><span style="font-size:28px;">📄</span><span style="font-size:12px;color:#475569;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${data.fileName}</span></div>`;
                            }
                        } else {
                            throw new Error(data.message);
                        }
                    } catch (e) {
                        alert('Upload failed: ' + e.message);
                        previewContainer.style.display = 'none';
                        selectedAdminChatFile = null;
                    }
                    isAdminUploading = false;
                };

                // ==========================================
                // 🎤 ADMIN VOICE RECORDING LOGIC
                // ==========================================
                let adminMediaRecorder = null;
                let adminAudioChunks = [];
                let adminRecordingTimer = null;
                let adminRecordingSeconds = 0;

                window.toggleAdminVoiceRecording = function () {
                    if (adminMediaRecorder && adminMediaRecorder.state === 'recording') {
                        // Stop recording
                        adminMediaRecorder.stop();
                    } else {
                        // Start recording
                        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                            adminAudioChunks = [];
                            adminRecordingSeconds = 0;
                            const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
                            adminMediaRecorder = new MediaRecorder(stream, options);

                            adminMediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) adminAudioChunks.push(e.data); };

                            adminMediaRecorder.onstop = async () => {
                                stream.getTracks().forEach(t => t.stop());
                                clearInterval(adminRecordingTimer);
                                const micBtn = document.getElementById('adminMicBtn');
                                const timerEl = document.getElementById('adminVoiceTimer');
                                micBtn.innerHTML = '🎤'; micBtn.style.background = '#f1f5f9'; micBtn.style.color = '#64748b';
                                timerEl.style.display = 'none';

                                const blob = new Blob(adminAudioChunks, { type: adminMediaRecorder.mimeType || 'audio/webm' });
                                if (blob.size < 1000) return; // Too short, ignore

                                // Upload to Cloudinary via backend
                                const formData = new FormData();
                                const ext = (adminMediaRecorder.mimeType || 'audio/webm').includes('webm') ? 'webm' : 'ogg';
                                formData.append('file', blob, `voice_note_${Date.now()}.${ext}`);

                                micBtn.innerHTML = '⏳'; micBtn.style.background = '#fef3c7';
                                try {
                                    const res = await fetch('/api/chat/upload', { credentials: 'include', method: 'POST', body: formData });
                                    const data = await res.json();
                                    if (data.success) {
                                        // Auto-send voice message
                                        const msgData = {
                                            senderName: 'Admin',
                                            senderEmail: 'admin@vibespheremedia.in',
                                            role: 'Admin',
                                            message: '',
                                            fileUrl: data.fileUrl,
                                            fileType: data.fileType,
                                            fileName: data.fileName
                                        };
                                        chatSocket?.emit('send_message', msgData);
                                    } else { alert('Voice upload failed: ' + data.message); }
                                } catch (err) { alert('Voice upload error!'); }
                                micBtn.innerHTML = '🎤'; micBtn.style.background = '#f1f5f9';
                            };

                            adminMediaRecorder.start();
                            const micBtn = document.getElementById('adminMicBtn');
                            const timerEl = document.getElementById('adminVoiceTimer');
                            micBtn.innerHTML = '⏹'; micBtn.style.background = '#fee2e2'; micBtn.style.color = '#ef4444';
                            timerEl.style.display = 'inline'; timerEl.innerText = '00:00';
                            adminRecordingTimer = setInterval(() => {
                                adminRecordingSeconds++;
                                const m = String(Math.floor(adminRecordingSeconds / 60)).padStart(2, '0');
                                const s = String(adminRecordingSeconds % 60).padStart(2, '0');
                                timerEl.innerText = `${m}:${s}`;
                            }, 1000);
                        }).catch(err => {
                            alert('🎤 Microphone access denied! Please allow mic permission.');
                        });
                    }
                };

                window.removeAdminChatFile = function () {
                    selectedAdminChatFile = null;
                    document.getElementById('adminChatFileInput').value = '';
                    document.getElementById('adminChatFilePreview').style.display = 'none';
                };
                // ==========================================
                // 🔇 MUTE / UNMUTE STAFF IN CHAT LOGIC
                // ==========================================
                window.muteStaffInChat = async function (email, isMuted) {
                    try {
                        const res = await fetch('/api/admin/mute-staff', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email, isMuted: isMuted }), credentials: 'include'
                        });
                        const data = await res.json();

                        if (data.success) {
                            adminUiState.staffDirectory = (adminUiState.staffDirectory || []).map((staff) => {
                                if (staff.email !== email) return staff;
                                return { ...staff, isMuted: Boolean(isMuted) };
                            });
                            buildChatContacts(adminUiState.staffDirectory);
                            renderChatGroupInfo();
                            renderAdminChatContacts();
                            if (adminUiState.activeChatEmail === email) {
                                const activeMeta = document.getElementById('adminActiveChatMeta');
                                if (activeMeta) activeMeta.innerText = `${(adminUiState.staffDirectory.find((staff) => staff.email === email)?.role) || 'Staff'} • ${email}`;
                            }
                            if (typeof fetchStaffData === 'function') {
                                fetchStaffData();
                            }
                            showToast(data.message || (isMuted ? 'Staff member muted.' : 'Staff member unmuted.'), 'success');
                        } else {
                            throw new Error(data.message || 'Action failed.');
                        }
                    } catch (e) {
                        showToast(e.message || 'Failed to update member chat permission.', 'error');
                    }
                };
                window.deleteChatMessage = async function (id) {
                    if (!confirm("Kya aap sach mein is message ko delete karna chahte hain?")) return;
                    try {
                        await fetch(`/api/admin/delete-message/${id}`, { method: 'DELETE', credentials: 'include' });
                    } catch (e) {
                        alert("Delete fail ho gaya, internet check karo!");
                    }
                }
                window.deleteMessage = window.deleteChatMessage;
                // ==========================================
                // 💬 THREE-DOT MENU LOGIC
                // ==========================================
                window.toggleChatMenu = function (id) {
                    // Pehle baaki saare khule hue menu band karo
                    document.querySelectorAll('[id^="chat-menu-"]').forEach(menu => {
                        if (menu.id !== `chat-menu-${id}`) menu.style.display = 'none';
                    });
                    // Ab jispe click kiya hai usko Toggle (Open/Close) karo
                    const menu = document.getElementById(`chat-menu-${id}`);
                    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                };

                // ==========================================
                // 💬 MESSAGE UI BANAO (With Clean 3-Dots)
                // ==========================================
                function appendAdminMessageUI(msg) {
                    if ((adminUiState.chatMessages || []).some((item) => item._id === msg._id)) return;
                    adminUiState.chatMessages = [...(adminUiState.chatMessages || []), msg];
                    buildChatContacts(adminUiState.staffDirectory);
                    renderAdminChatContacts();
                    renderAdminChatMessages();
                }


                // ☁️ MSG Send Update (Cloud upload ke baad URL bhejne ke liye)
                window.sendAdminMessage = function () {
                    if (isAdminUploading) return alert('File abhi upload ho rahi hai, zara ruko!');

                    const input = document.getElementById('teamChatInput');
                    const text = input.value.trim();
                    if (!text && !selectedAdminChatFile) return;

                    const msgData = {
                        senderName: 'Admin',
                        senderEmail: 'admin@vibespheremedia.in',
                        role: 'Admin',
                        message: text
                    };

                    if (adminUiState.chatReplyDraft) {
                        msgData.replyTo = {
                            messageId: adminUiState.chatReplyDraft.messageId,
                            senderName: adminUiState.chatReplyDraft.senderName,
                            previewText: adminUiState.chatReplyDraft.previewText
                        };
                    }

                    if (selectedAdminChatFile) {
                        msgData.fileUrl = selectedAdminChatFile.fileUrl;
                        msgData.fileType = selectedAdminChatFile.fileType;
                        msgData.fileName = selectedAdminChatFile.fileName;
                    }

                    chatSocket?.emit('team_send_msg', msgData);

                    input.value = '';
                    clearAdminReplyDraft();
                    removeAdminChatFile();
                };


    function bindChatSocketListeners() {
        if (!chatSocket || chatListenersBound) return;
        chatListenersBound = true;

        chatSocket.on('team_receive_msg', (msg) => {
            if (document.getElementById('teamChatMessages')) {
                appendAdminMessageUI(msg);
            }
        });

        chatSocket.on('team_message_deleted', (id) => {
            adminUiState.chatMessages = (adminUiState.chatMessages || []).filter((item) => item._id !== id);
            if (adminUiState.pinnedChatMessage?._id === id) {
                adminUiState.pinnedChatMessage = null;
                renderPinnedChatBanner();
            }
            buildChatContacts(adminUiState.staffDirectory);
            renderAdminChatContacts();
            renderAdminChatMessages();
        });

        chatSocket.on('team_message_pinned', (msg) => {
            adminUiState.pinnedChatMessage = msg || null;
            renderPinnedChatBanner();
        });
    }

    window.mountAdminTeamChatSection = function () {
        mountAdminTeamChatSection();
        bindChatUiListeners();
    };

    window.initAdminChatModule = function (socket) {
        chatSocket = socket || chatSocket;
        chatSocket?.emit('join_team_room');
        bindChatUiListeners();
        bindChatSocketListeners();
    };

    window.fetchAdminChat = fetchAdminChat;
})();
