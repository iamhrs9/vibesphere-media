document.addEventListener('DOMContentLoaded', async () => {
    // 0. Initialize Auth (recover session if needed)
    await VibeAuth.init();

    // 1. Mobile Menu Toggle
    const hamburger = document.getElementById('hamburger-menu');
    const navMenu = document.getElementById('nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            hamburger.querySelector('i').classList.toggle('ri-menu-3-line');
            hamburger.querySelector('i').classList.toggle('ri-close-line');
        });
    }

    // 2. Load Cart Count Badge
    VibeUI.updateCartCount();

    // 3. Update Auth UI state (Login vs User Profile)
    VibeUI.updateNavAuth();

    // 4. Initialize Dropdown
    VibeUI.initAccountDropdown();

    // 5. Handle Mobile Logout Click
    document.addEventListener('click', (e) => {
        const mobileLogout = e.target.closest('#mobileLogoutBtn');
        if (mobileLogout) {
            e.preventDefault();
            VibeAuth.logout();
        }
    });

    // 6. Handle Mobile Profile Accordion Toggle
    document.addEventListener('click', (e) => {
        const profileHeader = e.target.closest('.mobile-profile-header');
        if (profileHeader) {
            const parent = profileHeader.parentElement;
            const actions = parent.querySelector('.mobile-profile-actions');
            const chevron = profileHeader.querySelector('.accordion-chevron');
            if (actions) {
                const isExpanded = actions.classList.toggle('expanded');
                if (chevron) {
                    chevron.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            }
        }
    });
});

const GUEST_CART_KEY = 'vibeGuestCart';
const LEGACY_GUEST_CART_KEY = 'vibeCart';

function readGuestCart() {
    try {
        const raw = localStorage.getItem(GUEST_CART_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed) && parsed.length) {
            return parsed;
        }

        // Backward compatibility for older guest cart key.
        const legacyRaw = localStorage.getItem(LEGACY_GUEST_CART_KEY);
        const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : [];
        if (Array.isArray(legacyParsed) && legacyParsed.length) {
            // Migrate once to the new key and clean up legacy storage.
            localStorage.setItem(GUEST_CART_KEY, JSON.stringify(legacyParsed));
            localStorage.removeItem(LEGACY_GUEST_CART_KEY);
            return legacyParsed;
        }

        return [];
    } catch (e) {
        return [];
    }
}

function writeGuestCart(items) {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    localStorage.removeItem(LEGACY_GUEST_CART_KEY);
}

const VibeGuestCart = {
    key: GUEST_CART_KEY,
    getItems: () => readGuestCart(),
    setItems: (items) => writeGuestCart(Array.isArray(items) ? items : []),
    getCount: () => readGuestCart().length,
    addItem: (item) => {
        if (!item || !item.packageId) return { added: false, reason: 'invalid' };
        const items = readGuestCart();
        const exists = items.some((x) => x.packageId === item.packageId);
        if (exists) return { added: false, reason: 'exists' };
        items.push(item);
        writeGuestCart(items);
        return { added: true };
    },
    removeItem: (packageId) => {
        const items = readGuestCart().filter((x) => x.packageId !== packageId);
        writeGuestCart(items);
    },
    clear: () => writeGuestCart([])
};

const VibeUI = {
    updateCartCount: async () => {
        const badge = document.getElementById('cart-count');
        if (!badge) return;

        const setBadge = (count) => {
            if (count > 0) {
                badge.textContent = String(count);
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        };

        try {
            if (!VibeAuth.isLoggedIn()) {
                setBadge(VibeGuestCart.getCount());
                return;
            }

            const res = await fetch('/api/cart', { credentials: 'include' });
            if (!res.ok) {
                setBadge(VibeGuestCart.getCount());
                return;
            }
            const data = await res.json();
            const count = data.cart?.items?.length || 0;
            setBadge(count);
        } catch (e) {
            setBadge(VibeGuestCart.getCount());
        }
    },
    updateNavAuth: () => {
        const user = VibeAuth.getUser();
        const loginBtn = document.getElementById('nav-login-btn');
        const userProf = document.getElementById('user-profile');
        const trigger = document.getElementById('account-trigger');
        const navMenu = document.getElementById('nav-menu');

        if (!loginBtn || !userProf) return;

        if (user) {
            loginBtn.style.display = 'none';
            userProf.style.display = 'flex';
            
            const displayName = user.name || user.email || 'Account';
            const initial = displayName.trim().charAt(0).toUpperCase();
            
            if (trigger) {
                trigger.classList.add('avatar-mode');
                trigger.title = displayName;
                trigger.innerHTML = `
                    <div class="initial-avatar">${initial}</div>
                    <i class="ri-arrow-down-s-line"></i>
                `;
            }

            // Mobile menu profile injection
            if (navMenu) {
                let mobileProfile = document.getElementById('mobile-profile-section');
                if (!mobileProfile) {
                    mobileProfile = document.createElement('li');
                    mobileProfile.id = 'mobile-profile-section';
                    mobileProfile.className = 'mobile-profile-section';
                    navMenu.appendChild(mobileProfile);
                }
                mobileProfile.innerHTML = `
                    <div class="mobile-profile-header" style="cursor: pointer; user-select: none;">
                        <div class="initial-avatar">${initial}</div>
                        <div class="mobile-profile-info">
                            <span class="mobile-profile-name">${displayName}</span>
                            <span class="mobile-profile-email">${user.email}</span>
                        </div>
                        <i class="ri-arrow-down-s-line accordion-chevron"></i>
                    </div>
                    <div class="mobile-profile-actions">
                        <a href="/dashboard.html" class="mobile-profile-link">
                            <i class="ri-dashboard-line"></i> My Orders
                        </a>
                        <a href="/dashboard.html?tab=settings" class="mobile-profile-link" onclick="localStorage.setItem('dashboard_tab', 'settings')">
                            <i class="ri-user-settings-line"></i> Account Settings
                        </a>
                        <a href="#" class="mobile-profile-link logout" id="mobileLogoutBtn">
                            <i class="ri-logout-box-r-line"></i> Logout
                        </a>
                    </div>
                `;
            }
        } else {
            loginBtn.style.display = 'block';
            userProf.style.display = 'none';
            if (trigger) {
                trigger.classList.remove('avatar-mode');
                trigger.removeAttribute('title');
                trigger.innerHTML = `
                    <i class="ri-user-smile-line"></i> <span id="nav-username">Account</span>
                    <i class="ri-arrow-down-s-line"></i>
                `;
            }
            
            // Remove mobile profile if present
            const mobileProfile = document.getElementById('mobile-profile-section');
            if (mobileProfile) {
                mobileProfile.remove();
            }

            // Also hide menu if it was open
            const menu = document.getElementById('account-menu');
            if (menu) menu.classList.add('hidden');
        }

        // Sync wallet navigation pill
        VibeUI.updateNavWallet();
    },
    updateNavWallet: async () => {
        const user = VibeAuth.getUser();
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        // If logged out or Admin, hide/remove the wallet wrapper
        if (!user || user.role === 'Admin') {
            const existingWrapper = document.getElementById('nav-wallet-wrapper');
            if (existingWrapper) {
                existingWrapper.style.display = 'none';
            }
            return;
        }

        // We have a logged in user (Client)
        let wrapper = document.getElementById('nav-wallet-wrapper');
        let pill = document.getElementById('nav-wallet-pill');
        let dropdown = document.getElementById('nav-wallet-dropdown');

        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'nav-wallet-wrapper';
            wrapper.className = 'wallet-dropdown-wrapper';
            wrapper.style.cssText = 'position: relative; display: inline-flex; align-items: center;';

            pill = document.createElement('button');
            pill.id = 'nav-wallet-pill';
            pill.className = 'wallet-btn';
            pill.type = 'button';
            pill.title = 'My Wallet';
            pill.style.cssText = 'cursor: pointer; border: none; font-family: inherit; display: inline-flex; align-items: center;';

            dropdown = document.createElement('div');
            dropdown.id = 'nav-wallet-dropdown';
            dropdown.className = 'wallet-dropdown-menu hidden';
            dropdown.style.cssText = 'position: absolute; right: 0; top: 110%; background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 16px; box-shadow: 0 10px 30px rgba(108, 99, 255, 0.12); z-index: 10000; min-width: 220px; overflow: hidden; padding: 8px 0; display: flex; flex-direction: column; text-align: left;';

            dropdown.innerHTML = `
                <a href="/dashboard.html?tab=wallet" class="wallet-dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 12px 18px; color: #334155; text-decoration: none; font-size: 0.88rem; font-weight: 600; transition: 0.2s;" onclick="localStorage.setItem('wallet_action', 'topup')">
                    <i class="ri-add-circle-line" style="color: #6c63ff; font-size: 1.05rem;"></i> Top-up Wallet
                </a>
                <a href="/dashboard.html?tab=wallet" class="wallet-dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 12px 18px; color: #334155; text-decoration: none; font-size: 0.88rem; font-weight: 600; transition: 0.2s;" onclick="localStorage.setItem('wallet_action', 'transactions')">
                    <i class="ri-receipt-line" style="color: #6c63ff; font-size: 1.05rem;"></i> View Transactions
                </a>
                <hr style="border: 0; border-top: 1px solid rgba(108, 99, 255, 0.1); margin: 6px 0;">
                <a href="/dashboard.html?tab=wallet" class="wallet-dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 12px 18px; color: #334155; text-decoration: none; font-size: 0.88rem; font-weight: 600; transition: 0.2s;">
                    <i class="ri-dashboard-line" style="color: #6c63ff; font-size: 1.05rem;"></i> Wallet Dashboard
                </a>
            `;

            wrapper.appendChild(pill);
            wrapper.appendChild(dropdown);

            // Insert next to the cart icon (after .cart-btn)
            const cartBtn = navActions.querySelector('.cart-btn');
            if (cartBtn) {
                cartBtn.after(wrapper);
            } else {
                navActions.prepend(wrapper);
            }

            // Click listener to toggle dropdown
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Close account dropdown if open
                const accMenu = document.getElementById('account-menu');
                if (accMenu) accMenu.classList.add('hidden');
                
                dropdown.classList.toggle('hidden');
            });

            // Click-outside listener
            if (!wrapper.dataset.listenerAttached) {
                document.addEventListener('click', (e) => {
                    if (!wrapper.contains(e.target)) {
                        dropdown.classList.add('hidden');
                    }
                });
                wrapper.dataset.listenerAttached = 'true';
            }
        }

        // Show loading state (skeleton / spinner)
        wrapper.style.display = 'inline-flex';
        pill.innerHTML = `
            <i class="ri-wallet-3-line"></i>
            <span id="nav-wallet-balance" style="display: inline-flex; align-items: center; gap: 4px;">
                <svg class="wallet-spinner" viewBox="0 0 50 50" style="width: 12px; height: 12px; display: inline-block;">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#6c63ff" stroke-width="5" stroke-linecap="round" style="stroke-dasharray: 50, 150; stroke-dashoffset: 0;"></circle>
                </svg>
                ...
            </span>
        `;

        try {
            const res = await fetch('/api/user/wallet', { credentials: 'include' });
            if (!res.ok) {
                throw new Error('Failed to fetch wallet');
            }
            const data = await res.json();
            if (data.success && data.wallet) {
                const bal = data.wallet.walletBalance || 0;
                const formatted = `₹${bal.toLocaleString('en-IN')}`;
                pill.innerHTML = `
                    <i class="ri-wallet-3-line"></i>
                    <span id="nav-wallet-balance">${formatted}</span>
                `;
            } else {
                pill.innerHTML = `
                    <i class="ri-wallet-3-line"></i>
                    <span id="nav-wallet-balance">₹0</span>
                `;
            }
        } catch (e) {
            console.error('Error loading nav wallet balance:', e);
            pill.innerHTML = `
                <i class="ri-wallet-3-line"></i>
                <span id="nav-wallet-balance">₹0</span>
            `;
        }
    },
    initAccountDropdown: () => {
        const trigger = document.getElementById('account-trigger');
        const menu = document.getElementById('account-menu');
        const logoutBtn = document.getElementById('logoutBtn');

        if (!trigger || !menu) return;

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!trigger.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });

        // Connect Logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                VibeAuth.logout();
            });
        }
    },
    showToast: (msg) => {
        let toast = document.getElementById('global-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'global-toast';
            toast.className = 'vibe-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};
window.VibeUI = VibeUI;
window.VibeGuestCart = VibeGuestCart;
