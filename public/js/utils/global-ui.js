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
});

const VibeUI = {
    updateCartCount: async () => {
        const badge = document.getElementById('cart-count');
        if (!badge) return;

        try {
            const res = await fetch('/api/cart', { credentials: 'include' });
            if (!res.ok) {
                badge.style.display = 'none';
                return;
            }
            const data = await res.json();
            const count = data.cart?.items?.length || 0;
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        } catch (e) {
            badge.style.display = 'none';
        }
    },
    updateNavAuth: () => {
        const user = VibeAuth.getUser();
        const loginBtn = document.getElementById('nav-login-btn');
        const userProf = document.getElementById('user-profile');
        const usernameSpan = document.getElementById('nav-username');

        if (!loginBtn || !userProf) return;

        if (user) {
            loginBtn.style.display = 'none';
            userProf.style.display = 'flex';
            if (usernameSpan) usernameSpan.textContent = user.name || 'Account';
        } else {
            loginBtn.style.display = 'block';
            userProf.style.display = 'none';
            // Also hide menu if it was open
            const menu = document.getElementById('account-menu');
            if (menu) menu.classList.add('hidden');
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
