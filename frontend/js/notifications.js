// Global Notification Manager
class NotificationManager {
    constructor() {
        this.ws = null;
        this.currentUserId = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.notifications = [];
        this.soundEnabled = true;

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log("🔔 Initializing Global Notification Manager");

        // Check authentication
        this.loadAuth();
        if (!localStorage.getItem("token")) {
            console.log("⚠️ User not authenticated, skipping notifications");
            return;
        }

        // Get current user and initialize WebSocket
        this.initializeNotifications();

        // Add sound notification capability
        this.setupSoundNotification();

        // Refresh notifications periodically (every 5 mins)
        setInterval(() => this.loadNotifications(), 5 * 60 * 1000);
    }

    async initializeNotifications() {
        try {
            const user = await this.fetchCurrentUser();
            if (user && user.id) {
                console.log("✅ User authenticated for notifications:", user.username);
                this.currentUserId = user.id;
                this.connectWebSocket();
                this.loadNotifications();
            }
        } catch (error) {
            console.error("❌ Error getting current user for notifications:", error);
        }
    }

    connectWebSocket() {
        if (!this.currentUserId) return;

        // TODO: Implement WebSocket server support
        console.log("🔌 WebSocket notifications disabled - server implementation pending");
        return;

        try {
            const wsUrl = `${API_URL.replace("http://", "ws://").replace("/api", "")}/api/notifications/ws/${this.currentUserId}`;
            console.log("🔌 Connecting to WebSocket:", wsUrl);

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log("✅ Global WebSocket connected successfully");
                this.isConnected = true;
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                console.log("📨 Received global notification:", event.data);
                this.handleNotification(event.data);
            };

            this.ws.onerror = (error) => {
                console.error("❌ Global WebSocket error:", error);
                this.isConnected = false;
            };

            this.ws.onclose = (event) => {
                console.log("🔌 Global WebSocket disconnected:", event.code, event.reason);
                this.isConnected = false;

                // Only attempt to reconnect if it wasn't a manual close
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay / 1000} seconds...`);
                    setTimeout(() => {
                        if (this.currentUserId && localStorage.getItem("token")) {
                            this.connectWebSocket();
                        }
                    }, this.reconnectDelay);
                }
            };
        } catch (error) {
            console.error("❌ Failed to initialize global WebSocket:", error);
        }
    }

    handleNotification(message) {
        // Parse message if it's JSON (future proofing), currently string
        // We reload notifications from server to get full object details or just prepend a temp one
        this.loadNotifications();

        // Show toast notification
        this.showToast(message, "info");

        // Play sound notification
        if (this.soundEnabled) {
            this.playNotificationSound();
        }

        // Refresh friends page if relevant
        if (window.location.pathname.includes('friends.html') && message.toLowerCase().includes('friend')) {
            if (typeof loadFriends === 'function') loadFriends();
        }
    }

    async loadNotifications() {
        try {
            const res = await fetch(`${API_URL}/Notifications/?limit=10`, {
                headers: this.getHeaders()
            });

            if (res.ok) {
                this.notifications = await res.json();
                this.renderNotifications();
                this.updateBadgeCount();
            }
        } catch (error) {
            console.error("❌ Error loading notifications:", error);
        }
    }

    renderNotifications() {
        const listContainer = document.getElementById('notification-list');
        if (!listContainer) return;

        if (this.notifications.length === 0) {
            listContainer.innerHTML = `
                <li class="text-center p-4 text-muted">
                   <p class="mb-0 small">No notifications</p>
                </li>`;
            return;
        }

        listContainer.innerHTML = this.notifications.map(notif => `
            <li class="dropdown-item p-3 border-bottom ${notif.is_read ? 'bg-light' : 'bg-white'}" style="white-space: normal;">
                <a href="${notif.link || '#'}" class="text-decoration-none text-dark d-block">
                    <div class="d-flex align-items-start">
                        <div class="me-3 mt-1">
                            <i class="bi ${this.getIconForType(notif.type)} fs-5 text-${this.getColorForType(notif.type)}"></i>
                        </div>
                        <div>
                            <p class="mb-1 small">${notif.message}</p>
                            <small class="text-muted" style="font-size: 0.7rem;">${this.timeAgo(notif.created_at)}</small>
                        </div>
                        ${!notif.is_read ? '<span class="ms-auto bg-primary rounded-circle" style="width: 8px; height: 8px;"></span>' : ''}
                    </div>
                </a>
            </li>
        `).join('');
    }

    updateBadgeCount() {
        const unreadCount = this.notifications.filter(n => !n.is_read).length;
        const badge = document.getElementById('nav-notification-badge');

        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    async markAllRead() {
        try {
            await fetch(`${API_URL}/Notifications/read-all`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            this.loadNotifications(); // Reload to update UI
        } catch (error) {
            console.error("❌ Error marking all read:", error);
        }
    }

    getIconForType(type) {
        switch (type) {
            case 'expense': return 'bi-cash-stack';
            case 'group': return 'bi-people';
            case 'friend': return 'bi-person-plus';
            default: return 'bi-info-circle';
        }
    }

    getColorForType(type) {
        switch (type) {
            case 'expense': return 'success';
            case 'group': return 'primary';
            case 'friend': return 'info';
            default: return 'secondary';
        }
    }

    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    }

    setupSoundNotification() {
        // Create audio context for notification sound
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn("⚠️ Audio context not supported:", error);
            this.soundEnabled = false;
        }
    }

    playNotificationSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            // Create a simple notification sound
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);

            console.log("🔊 Played notification sound");
        } catch (error) {
            console.warn("⚠️ Failed to play notification sound:", error);
        }
    }

    showToast(message, type = "primary") {
        // Create toast container if it doesn't exist
        let container = document.getElementById("globalToastContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "globalToastContainer";
            container.className = "toast-container position-fixed top-0 end-0 p-3";
            container.style.zIndex = "9999";
            document.body.appendChild(container);
        }

        const toastEl = document.createElement("div");
        toastEl.className = `toast align-items-center text-bg-${type} border-0`;
        toastEl.setAttribute("role", "alert");
        toastEl.setAttribute("aria-live", "assertive");
        toastEl.setAttribute("aria-atomic", "true");

        const icon = type === "success" ? "check-circle" :
            type === "danger" ? "exclamation-triangle" :
                type === "info" ? "info-circle" : "bell";

        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${icon} me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        container.appendChild(toastEl);

        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        toast.show();

        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }

    // Utility functions (reused from config.js)
    loadAuth() {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        if (token) {
            this.setToken(token);
        }

        if (user) {
            try {
                this.setCurrentUser(JSON.parse(user));
            } catch (e) {
                console.error("Error parsing current user:", e);
            }
        }
    }

    setToken(token) {
        localStorage.setItem("token", token);
    }

    setCurrentUser(user) {
        window.currentUser = user;
        localStorage.setItem("user", JSON.stringify(user));
    }

    getHeaders() {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    }

    async fetchCurrentUser() {
        try {
            const res = await fetch(`${API_URL}/users/user/me`, {
                headers: this.getHeaders()
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const user = await res.json();
            this.setCurrentUser(user);
            localStorage.setItem("user", JSON.stringify(user));
            return user;
        } catch (err) {
            console.error("❌ Error fetching current user:", err);
            throw err;
        }
    }

    // Cleanup when page is unloaded
    cleanup() {
        if (this.ws) {
            this.ws.close(1000, "Page unloading");
            this.ws = null;
        }
    }

    clearNotifications() {
        console.log("🧹 Clearing notifications");
        this.notifications = [];
        
        // Clear notification badge if it exists
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.style.display = 'none';
        }
        
        // Clear notification dropdown if it exists
        const dropdown = document.querySelector('.notification-dropdown');
        if (dropdown) {
            dropdown.innerHTML = '<div class="text-muted p-3">No new notifications</div>';
        }
    }
}

// Initialize global notification manager
const globalNotifications = new NotificationManager();

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
    globalNotifications.cleanup();
});

// Export for use in other scripts
window.globalNotifications = globalNotifications;




