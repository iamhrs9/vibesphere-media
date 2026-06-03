// public/admin/sections/admin-management-section.js
window.initAdminManagementSection = function() {
    const container = document.getElementById('admin-management-section');
    if (!container || container.dataset.moduleMounted) {
        if (typeof window.fetchAdminsList === 'function') {
            window.fetchAdminsList();
        }
        return;
    }

    container.innerHTML = `
    <!-- Top Header -->
    <div class="flex items-center justify-between mb-8">
        <div>
            <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Admin Directory</h2>
            <p class="text-sm text-gray-500 mt-1">Manage SuperAdmins and SubAdmins, and configure their access permissions.</p>
        </div>
        <div>
            <button onclick="window.openAdminModal()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                Invite Admin
            </button>
        </div>
    </div>

    <!-- Data Table Card -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full whitespace-nowrap text-left text-sm text-gray-600">
                <thead class="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-medium">
                    <tr>
                        <th class="px-6 py-4">Name & Email</th>
                        <th class="px-6 py-4">Role</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4">Permissions Summary</th>
                        <th class="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody id="adminsTableBody" class="divide-y divide-gray-100">
                    <tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">Loading admins...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Form Modal (Hidden by Default) -->
    <div id="admin-modal" class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center hidden" onclick="if(event.target===this) window.closeAdminModal()">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden transform transition-all">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 id="adminModalTitle" class="text-lg font-bold text-gray-800">Invite Sub-Admin</h3>
                <button onclick="window.closeAdminModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <!-- Modal Body -->
            <div class="px-6 py-6 max-h-[80vh] overflow-y-auto">
                <form id="subAdminForm" onsubmit="event.preventDefault(); window.saveAdmin();" class="space-y-5">
                    <input type="hidden" id="subAdminId">
                    
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input type="text" id="subAdminName" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="subAdminEmail" required class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password <span class="text-xs text-gray-400 font-normal ml-1">(Leave blank to keep current)</span></label>
                        <input type="text" id="subAdminPassword" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                    </div>

                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select id="subAdminRole" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white">
                                <option value="SubAdmin">SubAdmin</option>
                                <option value="SuperAdmin">SuperAdmin (Full Access)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
                            <select id="subAdminIsActive" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white">
                                <option value="true">Active</option>
                                <option value="false">Disabled</option>
                            </select>
                        </div>
                    </div>

                    <div id="permissionsContainer" class="pt-2">
                        <label class="block text-sm font-medium text-gray-700 mb-3">Module Permissions</label>
                        <div class="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            
                            <!-- Toggle: Staff Ops -->
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="perm_staff" class="sr-only peer admin-perm-cb">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                <span class="ml-3 text-sm font-medium text-gray-600">Staff Ops</span>
                            </label>
                            
                            <!-- Toggle: Finance -->
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="perm_finance" class="sr-only peer admin-perm-cb">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                <span class="ml-3 text-sm font-medium text-gray-600">Finance</span>
                            </label>

                            <!-- Toggle: Orders -->
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="perm_orders" class="sr-only peer admin-perm-cb">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                <span class="ml-3 text-sm font-medium text-gray-600">Orders</span>
                            </label>

                            <!-- Toggle: Commerce -->
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="perm_commerce" class="sr-only peer admin-perm-cb">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                <span class="ml-3 text-sm font-medium text-gray-600">Commerce</span>
                            </label>

                            <!-- Toggle: SMM -->
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="perm_smm" class="sr-only peer admin-perm-cb">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                <span class="ml-3 text-sm font-medium text-gray-600">SMM</span>
                            </label>

                            <!-- Toggle: Content -->
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="perm_content" class="sr-only peer admin-perm-cb">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                <span class="ml-3 text-sm font-medium text-gray-600">Content</span>
                            </label>

                            <!-- Toggle: Clients -->
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="perm_clients" class="sr-only peer admin-perm-cb">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                <span class="ml-3 text-sm font-medium text-gray-600">Clients</span>
                            </label>

                            <!-- Toggle: Helpdesk -->
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="perm_helpdesk" class="sr-only peer admin-perm-cb">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                <span class="ml-3 text-sm font-medium text-gray-600">Helpdesk</span>
                            </label>
                            
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="window.closeAdminModal()" class="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" id="saveAdminBtn" class="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                            Save Admin
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    // Global state
    window.allAdminsData = [];

    // Attach Role Change Event Listener
    document.getElementById('subAdminRole').addEventListener('change', (e) => {
        const permContainer = document.getElementById('permissionsContainer');
        permContainer.style.opacity = e.target.value === 'SuperAdmin' ? '0.5' : '1';
        permContainer.style.pointerEvents = e.target.value === 'SuperAdmin' ? 'none' : 'auto';
    });

    window.fetchAdminsList = async function() {
        const tbody = document.getElementById('adminsTableBody');
        try {
            const res = await fetch('/api/admin/admins', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                window.allAdminsData = data.admins;
                renderAdminsTable();
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">${data.message || 'Access Denied'}</td></tr>`;
            }
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Failed to load admins.</td></tr>`;
        }
    };

    function renderAdminsTable() {
        const tbody = document.getElementById('adminsTableBody');
        if (!window.allAdminsData || window.allAdminsData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No admins found.</td></tr>';
            return;
        }

        tbody.innerHTML = window.allAdminsData.map(admin => {
            let permBadges = [];
            if (admin.role === 'SuperAdmin') {
                permBadges = ['<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 m-0.5 border border-purple-200">All Access</span>'];
            } else if (admin.permissions) {
                const activePerms = Object.keys(admin.permissions).filter(k => admin.permissions[k]);
                if (activePerms.length === 0) {
                    permBadges = ['<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 m-0.5 border border-gray-200">No Access</span>'];
                } else {
                    permBadges = activePerms.map(p => `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 m-0.5 border border-blue-100 capitalize">${p}</span>`);
                }
            }

            return `
                <tr class="hover:bg-gray-50 transition-colors group">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                ${admin.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="font-medium text-gray-900">${admin.name}</div>
                                <div class="text-xs text-gray-500">${admin.email}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${admin.role === 'SuperAdmin' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
                            <svg class="mr-1.5 h-3 w-3 ${admin.role === 'SuperAdmin' ? 'text-amber-500' : 'text-slate-500'}" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                            ${admin.role}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${admin.isActive 
                            ? '<span class="inline-flex items-center text-xs font-medium text-emerald-600"><span class="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span>Active</span>' 
                            : '<span class="inline-flex items-center text-xs font-medium text-red-600"><span class="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>Disabled</span>'}
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-wrap gap-1 max-w-[280px]">
                            ${permBadges.join('')}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="window.openAdminModal('${admin._id}')" class="text-blue-600 hover:text-blue-900 mx-2 transition-colors">Edit</button>
                        ${admin._id === window.adminSession?.adminId 
                            ? '<span class="text-gray-400 cursor-not-allowed mx-2 text-xs border border-gray-200 px-2 py-1 rounded-md">(You)</span>'
                            : `<button onclick="window.deleteAdmin('${admin._id}')" class="text-red-500 hover:text-red-700 transition-colors">Delete</button>`}
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.openAdminModal = function(adminId = null) {
        const modal = document.getElementById('admin-modal');
        const form = document.getElementById('subAdminForm');
        form.reset();
        document.getElementById('subAdminId').value = '';
        document.querySelectorAll('.admin-perm-cb').forEach(cb => cb.checked = false);

        if (adminId) {
            const admin = window.allAdminsData.find(a => a._id === adminId);
            if (admin) {
                document.getElementById('adminModalTitle').innerText = 'Edit Admin';
                document.getElementById('subAdminId').value = admin._id;
                document.getElementById('subAdminName').value = admin.name;
                document.getElementById('subAdminEmail').value = admin.email;
                document.getElementById('subAdminRole').value = admin.role;
                document.getElementById('subAdminIsActive').value = admin.isActive.toString();
                document.getElementById('subAdminPassword').required = false;
                
                if (admin.permissions) {
                    Object.keys(admin.permissions).forEach(key => {
                        const cb = document.getElementById('perm_' + key);
                        if (cb) cb.checked = admin.permissions[key];
                    });
                }
                
                document.getElementById('subAdminRole').dispatchEvent(new Event('change'));
            }
        } else {
            document.getElementById('adminModalTitle').innerText = 'Invite Sub-Admin';
            document.getElementById('subAdminPassword').required = true;
            document.getElementById('subAdminRole').value = 'SubAdmin';
            document.getElementById('subAdminRole').dispatchEvent(new Event('change'));
        }

        // Show modal by removing hidden
        modal.classList.remove('hidden');
    };

    window.closeAdminModal = function() {
        const modal = document.getElementById('admin-modal');
        // Hide modal by adding hidden
        modal.classList.add('hidden');
    };

    window.saveAdmin = async function() {
        const id = document.getElementById('subAdminId').value;
        const name = document.getElementById('subAdminName').value.trim();
        const email = document.getElementById('subAdminEmail').value.trim();
        const password = document.getElementById('subAdminPassword').value;
        const role = document.getElementById('subAdminRole').value;
        const isActive = document.getElementById('subAdminIsActive').value === 'true';
        
        const permissions = {};
        document.querySelectorAll('.admin-perm-cb').forEach(cb => {
            const key = cb.id.replace('perm_', '');
            permissions[key] = cb.checked;
        });

        const payload = { name, email, role, isActive, permissions };
        if (password) payload.password = password;

        const btn = document.getElementById('saveAdminBtn');
        btn.disabled = true;
        btn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...';

        try {
            const url = id ? `/api/admin/admins/${id}` : '/api/admin/admins';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const data = await res.json();
            
            if (data.success) {
                if (typeof showToast === 'function') showToast(data.message, 'success');
                window.closeAdminModal();
                window.fetchAdminsList();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Failed to save admin', 'error');
                else alert(data.message || 'Failed to save admin');
            }
        } catch (err) {
            console.error(err);
            if (typeof showToast === 'function') showToast('Server error', 'error');
            else alert('Server error');
        } finally {
            btn.disabled = false;
            btn.innerText = 'Save Admin';
        }
    };

    window.deleteAdmin = async function(id) {
        if (!confirm("Are you sure you want to permanently delete this Admin user?")) return;
        
        try {
            const res = await fetch(`/api/admin/admins/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                if (typeof showToast === 'function') showToast(data.message, 'success');
                window.fetchAdminsList();
            } else {
                if (typeof showToast === 'function') showToast(data.message || 'Failed to delete admin', 'error');
                else alert(data.message || 'Failed to delete admin');
            }
        } catch (err) {
            console.error(err);
            if (typeof showToast === 'function') showToast('Server error', 'error');
            else alert('Server error');
        }
    };

    // Mark as mounted and fetch initial data
    container.dataset.moduleMounted = "true";
    window.fetchAdminsList();
};
