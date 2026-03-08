const VibeAuth = {
    _user: null, // Cached user object

    isLoggedIn: () => {
        return VibeAuth._user !== null;
    },

    getUser: () => {
        return VibeAuth._user;
    },

    _initialized: false,
    isInitialized: () => VibeAuth._initialized,

    init: async () => {
        if (VibeAuth._initialized) return VibeAuth._user;
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user) {
                    VibeAuth._user = data.user;
                } else {
                    VibeAuth._user = null;
                }
            } else {
                VibeAuth._user = null;
            }
        } catch (e) {
            console.error("Auth Init Error:", e);
            VibeAuth._user = null;
        }

        VibeAuth._initialized = true;
        // Always sync UI after init
        if (window.VibeUI) VibeUI.updateNavAuth();
        return VibeAuth._user;
    },

    logout: async () => {
        if (confirm("Are you sure you want to logout?")) {
            try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            } catch (e) { }
            VibeAuth._user = null;
            window.location.href = '/login.html';
        }
    },

    requireAuth: async (redirectUrl) => {
        // If not logged in, wait for init to be sure
        if (!VibeAuth.isInitialized()) {
            await VibeAuth.init();
        }
        // Check again after init
        if (!VibeAuth.isLoggedIn()) {
            const target = redirectUrl || encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login.html?redirect=${target}`;
            return false;
        }
        return true;
    }
};
window.VibeAuth = VibeAuth;
