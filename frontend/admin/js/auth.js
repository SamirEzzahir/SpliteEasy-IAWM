const API_URL = "http://127.0.0.1:8006/api";

async function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch user");
        }

        const user = await response.json();

        // Check if user has a role
        if (!user.role) {
            alert("Access Denied: You do not have administrative privileges.");
            window.location.href = "/";
            return;
        }

        // Check permissions (client-side check, backend enforces real security)
        let permissions = [];
        try {
            permissions = JSON.parse(user.role.permissions);
        } catch (e) {
            permissions = [];
        }

        if (!permissions.includes("*") && !permissions.includes("view_dashboard")) {
            alert("Access Denied: You do not have permission to view the dashboard.");
            window.location.href = "/";
            return;
        }

        // Set username in navbar
        document.getElementById("admin-username").textContent = user.username;

        // Store user info for other scripts
        window.currentUser = user;
        window.userPermissions = permissions;

    } catch (error) {
        console.error("Auth Error:", error);
        localStorage.removeItem("token");
        window.location.href = "/login.html";
    }
}

// Run check immediately
checkAuth();

// Logout handler
document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
});

document.getElementById("nav-logout").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
});
