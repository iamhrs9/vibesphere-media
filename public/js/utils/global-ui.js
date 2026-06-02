document.addEventListener('DOMContentLoaded', async () => {
    // 0. Initialize Auth (recover session if needed)
    await VibeAuth.init();
    TopBanner.init();

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
const TOP_BANNER_STYLE_ID = 'vibe-top-banner-styles';
const TOP_BANNER_ROOT_ID = 'vibe-top-banner-root';

let topBannerSettingsPromise = null;

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

function splitBannerLines(value) {
    return String(value ?? '')
        .split(/\r?\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function buildBannerTickerText(value) {
    const lines = splitBannerLines(value);
    const content = lines.length ? lines : [String(value ?? '').trim()].filter(Boolean);
    const separator = ' \u00A0\u00A0•\u00A0\u00A0 ';
    const joined = content.join(separator).trim();
    if (!joined) return '';

    if (joined.length < 80) {
        return Array.from({ length: 4 }, () => joined).join(separator);
    }

    return joined;
}

function escapeTopBannerHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function ensureTopBannerStyles() {
    if (document.getElementById(TOP_BANNER_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = TOP_BANNER_STYLE_ID;
    style.textContent = `
        #${TOP_BANNER_ROOT_ID} {
            width: 100%;
            position: relative;
            z-index: 1100;
            isolation: isolate;
        }

        #${TOP_BANNER_ROOT_ID} .vs-top-banner-shell {
            display: flex;
            align-items: center;
            overflow: hidden;
            white-space: nowrap;
            width: 100%;
            min-height: 32px;
            padding: 0.375rem 0;
            background: linear-gradient(90deg, #6d28d9 0%, #4f46e5 45%, #2563eb 100%);
            color: #fff;
            box-shadow: 0 14px 30px rgba(37, 99, 235, 0.18);
            border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }

        #${TOP_BANNER_ROOT_ID} .vs-top-banner-marquee-track {
            display: flex;
            align-items: center;
            width: max-content;
            white-space: nowrap;
            flex-shrink: 0;
            will-change: transform;
            animation: marquee-scroll 15s linear infinite;
        }

        #${TOP_BANNER_ROOT_ID} .vs-top-banner-marquee-track > span {
            display: inline-flex;
            align-items: center;
            gap: 0.55rem;
            padding-right: 2rem;
            flex-shrink: 0;
        }

        #${TOP_BANNER_ROOT_ID} .vs-top-banner-marquee-track i {
            font-size: 0.92rem;
            flex-shrink: 0;
        }

        #${TOP_BANNER_ROOT_ID} .vs-top-banner-marquee-track span span {
            color: #fff;
            font-size: 0.78rem;
            line-height: 1.2;
            font-weight: 700;
            letter-spacing: 0.02em;
            text-shadow: 0 1px 1px rgba(15, 23, 42, 0.12);
        }

        #${TOP_BANNER_ROOT_ID} .animate-marquee {
            animation: marquee-scroll 15s linear infinite;
        }

        @keyframes marquee-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }

        @media (max-width: 640px) {
            #${TOP_BANNER_ROOT_ID} .vs-top-banner-shell {
                min-height: 30px;
                padding: 0.25rem 0;
            }

            #${TOP_BANNER_ROOT_ID} .vs-top-banner-marquee-track > span {
                padding-right: 1.5rem;
            }

            #${TOP_BANNER_ROOT_ID} .vs-top-banner-marquee-track span span {
                font-size: 0.72rem;
                gap: 0.45rem;
            }
        }
    `;
    document.head.appendChild(style);
}

function buildTopBannerMarkup(text) {
    const prefix = '<i class="ri-megaphone-line" aria-hidden="true"></i>';
    const tickerText = buildBannerTickerText(text);
    const safeText = escapeTopBannerHtml(tickerText || String(text ?? '').trim()) || '\u00A0';

    return `
        <div class="vs-top-banner-shell overflow-hidden whitespace-nowrap bg-gradient-to-r from-purple-600 to-blue-600 py-1.5 text-white text-sm">
            <div class="flex w-max animate-marquee" aria-label="${escapeTopBannerHtml(String(text ?? '').replace(/\r?\n+/g, ' • '))}">
                <span class="pr-8">${prefix}<span>${safeText}</span></span>
                <span class="pr-8" aria-hidden="true">${prefix}<span>${safeText}</span></span>
            </div>
        </div>
    `;
}

const TopBanner = {
    async init() {
        if (!document.body || document.getElementById(TOP_BANNER_ROOT_ID)) return;

        ensureTopBannerStyles();

        try {
            if (!topBannerSettingsPromise) {
                topBannerSettingsPromise = fetch('/api/site-settings/banners', { credentials: 'include' })
                    .then(async (res) => {
                        if (!res.ok) throw new Error('Failed to load banner settings.');
                        return res.json();
                    })
                    .catch((error) => {
                        console.error('Top banner settings fetch failed:', error);
                        return null;
                    });
            }

            const response = await topBannerSettingsPromise;
            const settings = response?.banners;
            if (!settings) return;

            const isSmmPage = window.location.pathname.toLowerCase().includes('/smm');
            const bannerText = isSmmPage ? settings.smmBannerText : settings.normalBannerText;
            const isActive = isSmmPage ? settings.isSmmActive : settings.isNormalActive;

            if (!isActive || !bannerText) return;

            const root = document.createElement('div');
            root.id = TOP_BANNER_ROOT_ID;
            root.setAttribute('role', 'region');
            root.setAttribute('aria-label', 'Announcement banner');

            root.innerHTML = `
                ${buildTopBannerMarkup(bannerText)}
            `;

            document.body.prepend(root);
        } catch (error) {
            console.error('Top banner init failed:', error);
        }
    }
};

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
        let container = document.getElementById('vibe-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'vibe-toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                align-items: flex-end;
                z-index: 99999999;
                pointer-events: none;
                max-width: 380px;
                width: 90%;
            `;
            document.body.appendChild(container);
        }

        const escapeHtml = (val) => String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        let bg = 'rgba(15, 23, 42, 0.72)';
        let border = '1px solid rgba(255, 255, 255, 0.15)';
        let color = '#f8fafc';
        let icon = 'ℹ️';
        
        const lowerMsg = String(msg || '').toLowerCase();
        if (lowerMsg.includes('success') || lowerMsg.includes('✅') || lowerMsg.includes('saved') || lowerMsg.includes('completed') || lowerMsg.includes('added') || lowerMsg.includes('sent')) {
            bg = 'rgba(16, 185, 129, 0.16)';
            border = '1px solid rgba(16, 185, 129, 0.28)';
            color = '#34d399';
            icon = '✅';
        } else if (lowerMsg.includes('error') || lowerMsg.includes('failed') || lowerMsg.includes('❌') || lowerMsg.includes('insufficient') || lowerMsg.includes('invalid') || lowerMsg.includes('missing') || lowerMsg.includes('required') || lowerMsg.includes('⚠️')) {
            bg = 'rgba(239, 68, 68, 0.16)';
            border = '1px solid rgba(239, 68, 68, 0.28)';
            color = '#f87171';
            icon = '⚠️';
        }

        const toast = document.createElement('div');
        toast.className = 'vibe-toast-item';
        toast.style.cssText = `
            background: ${bg};
            border: ${border};
            color: ${color};
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
            font-size: 0.9rem;
            font-weight: 600;
            border-radius: 14px;
            padding: 14px 24px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: inherit;
            width: 100%;
            pointer-events: auto;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        toast.innerHTML = `<span style="font-size:1.1rem;flex-shrink:0;">${icon}</span> <span style="line-height:1.4;">${escapeHtml(msg)}</span>`;
        container.appendChild(toast);

        // Animate entrance
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 30);

        // Auto-dismiss exactly 3 seconds (3000ms) after it appears
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            // Remove from DOM after fade-out transition completes
            setTimeout(() => {
                toast.remove();
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 400);
        }, 3000);
    },
    showConfirm: (message, onConfirm, onCancel) => {
        let overlay = document.getElementById('global-confirm-modal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-confirm-modal';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(overlay);
        }

        const escapeHtml = (val) => String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        overlay.innerHTML = `
            <div style="
                background: rgba(255, 255, 255, 0.82);
                backdrop-filter: blur(30px);
                -webkit-backdrop-filter: blur(30px);
                border: 1px solid rgba(255, 255, 255, 0.45);
                border-radius: 24px;
                padding: 32px;
                width: 90%;
                max-width: 420px;
                box-shadow: 0 30px 60px rgba(0,0,0,0.18);
                text-align: center;
                transform: scale(0.9);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            " class="confirm-content">
                <div style="font-size: 2.5rem; margin-bottom: 14px;">⚠️</div>
                <h3 style="margin: 0 0 10px 0; font-size: 1.3rem; font-weight: 800; color: #0f172a; font-family: inherit;">Please Confirm</h3>
                <p style="margin: 0 0 28px 0; font-size: 0.95rem; color: #475569; line-height: 1.5; font-family: inherit; font-weight: 600;">${escapeHtml(message)}</p>
                <div style="display: flex; gap: 14px; justify-content: center;">
                    <button id="confirm-cancel-btn" style="
                        background: rgba(148, 163, 184, 0.1);
                        color: #475569;
                        border: 1px solid rgba(148, 163, 184, 0.25);
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-weight: 700;
                        font-size: 0.92rem;
                        cursor: pointer;
                        flex: 1;
                        transition: all 0.25s;
                        font-family: inherit;
                    ">Cancel</button>
                    <button id="confirm-ok-btn" style="
                        background: #6c63ff;
                        color: #fff;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-weight: 700;
                        font-size: 0.92rem;
                        cursor: pointer;
                        flex: 1;
                        box-shadow: 0 8px 20px rgba(108, 99, 255, 0.3);
                        transition: all 0.25s;
                        font-family: inherit;
                    ">Confirm</button>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';
        overlay.offsetHeight;
        overlay.style.opacity = '1';
        overlay.querySelector('.confirm-content').style.transform = 'scale(1)';

        const closeConfirm = () => {
            overlay.style.opacity = '0';
            overlay.querySelector('.confirm-content').style.transform = 'scale(0.9)';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        };

        const handleCancel = () => {
            closeConfirm();
            if (typeof onCancel === 'function') onCancel();
        };

        const handleConfirm = () => {
            closeConfirm();
            if (typeof onConfirm === 'function') onConfirm();
        };

        overlay.querySelector('#confirm-cancel-btn').onclick = handleCancel;
        overlay.querySelector('#confirm-ok-btn').onclick = handleConfirm;
        overlay.onclick = (e) => {
            if (e.target === overlay) handleCancel();
        };
    }
};

(function() {
    window.alert = function (msg) {
        if (typeof VibeUI !== 'undefined' && typeof VibeUI.showToast === 'function') {
            VibeUI.showToast(msg);
        } else {
            console.log("Native Alert:", msg);
        }
    };
})();

window.VibeUI = VibeUI;
window.VibeGuestCart = VibeGuestCart;
window.TopBanner = TopBanner;
