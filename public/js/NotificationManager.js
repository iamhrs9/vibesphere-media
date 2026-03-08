class NotificationManager {
    constructor() {
        this.permissionGranted = false;
        this.init();
    }

    async init() {
        if (!("Notification" in window)) {
            console.warn("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === "granted") {
            this.permissionGranted = true;
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            this.permissionGranted = permission === "granted";
        }
    }

    playSound(soundUrl = '/sounds/notification.mp3') {
        try {
            // We need to create a dummy sound that doesn't 404 if we don't have the file yet,
            // or we use a fallback base64 sound later if needed. For now, we assume /sounds/notification.mp3 exists or fails silently.
            const audio = new Audio(soundUrl);
            audio.play().catch(e => {
                console.warn("Audio playback prevented by browser policy (requires user interaction first):", e);
            });
        } catch (error) {
            console.error("Error playing notification sound:", error);
        }
    }

    showNativeNotification(title, body, url = null) {
        if (!this.permissionGranted) return;

        const options = {
            body: body,
            icon: '/images/favicon.png', // Assuming a favicon exists, otherwise fallback to default
            vibrate: [200, 100, 200]
        };

        const notification = new Notification(title, options);

        notification.onclick = function (event) {
            event.preventDefault();
            window.focus();
            if (url) {
                // If a specific URL is provided, navigate there or focus on the current tab and handle UI
                window.location.href = url;
            }
            notification.close();
        };
    }

    // Helper for combined alert
    notify(title, body, url = null) {
        this.playSound();
        this.showNativeNotification(title, body, url);
    }
}

// Initialize globally
window.notificationManager = new NotificationManager();
