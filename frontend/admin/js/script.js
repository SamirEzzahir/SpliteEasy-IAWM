// Navigation Logic
const views = ["dashboard", "users", "roles", "reclamations"];

function showView(viewName) {
    views.forEach(v => {
        document.getElementById(`view-${v}`).classList.add("d-none");
        document.getElementById(`nav-${v}`).classList.remove("active");
    });
    document.getElementById(`view-${viewName}`).classList.remove("d-none");
    document.getElementById(`nav-${viewName}`).classList.add("active");
    document.getElementById("page-title").textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);

    // Load data based on view
    if (viewName === "users") loadUsers();
    if (viewName === "roles") loadRoles();
    if (viewName === "reclamations") loadReclamations();
    if (viewName === "dashboard") loadStats();
}

views.forEach(v => {
    document.getElementById(`nav-${v}`).addEventListener("click", (e) => {
        e.preventDefault();
        showView(v);
    });
});

// Sidebar Toggle
const el = document.getElementById("wrapper");
const toggleButton = document.getElementById("menu-toggle");

toggleButton.onclick = function () {
    el.classList.toggle("toggled");
};

// ======================
// Data Fetching & Rendering
// ======================

async function apiCall(endpoint, method = "GET", body = null) {
    const token = localStorage.getItem("token");
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}${endpoint}`, config);
    if (response.status === 401) {
        window.location.href = "/login.html";
        return;
    }
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "API Error");
    }
    return response.json();
}

// --- Dashboard Stats ---
async function loadStats() {
    try {
        // Simple stats for now, can be optimized with specific endpoint
        const users = await apiCall("/admin/users?limit=1"); // Just to get count if API supported it, but we fetch all for now or add stats endpoint
        // Since we don't have a stats endpoint yet, we'll fetch lists. 
        // Note: In prod, create specific stats endpoints.

        // We'll just fetch counts if possible or list length
        const allUsers = await apiCall("/admin/users");
        const allRecs = await apiCall("/admin/reclamations");

        document.getElementById("stat-users-count").textContent = allUsers.length;
        document.getElementById("stat-reclamations-count").textContent = allRecs.length;
    } catch (e) {
        console.error("Stats error", e);
    }
}

// --- Users ---
async function loadUsers() {
    const tbody = document.getElementById("users-table-body");
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        const users = await apiCall("/admin/users");
        tbody.innerHTML = "";

        users.forEach(user => {
            const roleName = user.role ? `<span class="badge bg-info text-dark">${user.role.name}</span>` : '<span class="badge bg-secondary">No Role</span>';
            const statusBadge = user.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Disabled</span>';
            const toggleBtnClass = user.is_active ? 'btn-outline-danger' : 'btn-outline-success';
            const toggleBtnText = user.is_active ? 'Disable' : 'Enable';
            const toggleIcon = user.is_active ? 'fa-ban' : 'fa-check';

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${roleName}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-2" onclick="openAssignRoleModal(${user.id})">
                        <i class="fas fa-user-tag"></i> Role
                    </button>
                    <button class="btn btn-sm ${toggleBtnClass}" onclick="toggleUserStatus(${user.id})">
                        <i class="fas ${toggleIcon}"></i> ${toggleBtnText}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error: ${e.message}</td></tr>`;
    }
}

async function toggleUserStatus(userId) {
    if (!confirm("Are you sure you want to change this user's status?")) return;
    try {
        await apiCall(`/admin/users/${userId}/status`, "POST");
        loadUsers();
    } catch (e) {
        alert(e.message);
    }
}

// --- Roles ---
async function loadRoles() {
    const tbody = document.getElementById("roles-table-body");
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';

    try {
        const roles = await apiCall("/admin/roles");
        tbody.innerHTML = "";

        // Populate select for user assignment too
        const roleSelect = document.getElementById("assignRoleSelect");
        roleSelect.innerHTML = "";

        roles.forEach(role => {
            // Table Row
            let perms = [];
            try { perms = JSON.parse(role.permissions); } catch (e) { }
            const permBadges = perms.includes("*")
                ? '<span class="badge bg-danger">ALL ACCESS</span>'
                : perms.map(p => `<span class="badge bg-secondary me-1">${p}</span>`).join("");

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${role.id}</td>
                <td><span class="fw-bold">${role.name}</span></td>
                <td>${permBadges}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" disabled>Edit</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Select Option
            const option = document.createElement("option");
            option.value = role.id;
            option.textContent = role.name;
            roleSelect.appendChild(option);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Error: ${e.message}</td></tr>`;
    }
}

document.getElementById("saveRoleBtn").addEventListener("click", async () => {
    const name = document.getElementById("roleName").value;
    if (!name) return alert("Role name required");

    const perms = [];
    document.querySelectorAll(".permission-check:checked").forEach(cb => {
        perms.push(cb.value);
    });

    try {
        await apiCall("/admin/roles", "POST", {
            name: name,
            permissions: JSON.stringify(perms)
        });
        bootstrap.Modal.getInstance(document.getElementById("roleModal")).hide();
        loadRoles();
        document.getElementById("roleForm").reset();
    } catch (e) {
        alert(e.message);
    }
});

// --- Assign Role ---
window.openAssignRoleModal = (userId) => {
    document.getElementById("assignUserId").value = userId;
    // Ensure roles are loaded
    if (document.getElementById("assignRoleSelect").options.length === 0) {
        loadRoles().then(() => {
            new bootstrap.Modal(document.getElementById("userRoleModal")).show();
        });
    } else {
        new bootstrap.Modal(document.getElementById("userRoleModal")).show();
    }
};

document.getElementById("saveUserRoleBtn").addEventListener("click", async () => {
    const userId = document.getElementById("assignUserId").value;
    const roleId = document.getElementById("assignRoleSelect").value;

    try {
        await apiCall(`/admin/users/${userId}/role?role_id=${roleId}`, "POST");
        bootstrap.Modal.getInstance(document.getElementById("userRoleModal")).hide();
        loadUsers();
    } catch (e) {
        alert(e.message);
    }
});


// --- Reclamations ---
async function loadReclamations() {
    const tbody = document.getElementById("reclamations-table-body");
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        const recs = await apiCall("/admin/reclamations");
        tbody.innerHTML = "";

        recs.forEach(rec => {
            let statusColor = "secondary";
            if (rec.status === "pending") statusColor = "warning text-dark";
            if (rec.status === "resolved") statusColor = "success";
            if (rec.status === "rejected") statusColor = "danger";
            if (rec.status === "in_progress") statusColor = "info text-dark";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${rec.id}</td>
                <td>User #${rec.user_id}</td>
                <td>${rec.subject}</td>
                <td><span class="badge bg-${statusColor}">${rec.status}</span></td>
                <td>${new Date(rec.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-success" onclick="updateRecStatus(${rec.id}, 'resolved')">Resolve</button>
                        <button class="btn btn-sm btn-danger" onclick="updateRecStatus(${rec.id}, 'rejected')">Reject</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error: ${e.message}</td></tr>`;
    }
}

window.updateRecStatus = async (id, status) => {
    if (!confirm(`Mark ticket #${id} as ${status}?`)) return;
    try {
        await apiCall(`/admin/reclamations/${id}/status`, "POST", { status });
        loadReclamations();
    } catch (e) {
        alert(e.message);
    }
};

// Initial Load
showView("dashboard");
