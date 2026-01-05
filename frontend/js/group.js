// Enhanced Groups Page JavaScript
loadAuth();

let allGroups = [];
let filteredGroups = [];

// -----------------------------
// Utility Functions
// -----------------------------
function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-white bg-danger border-0';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-exclamation-triangle me-2"></i>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  toastContainer.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-white bg-success border-0';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-check-circle me-2"></i>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  toastContainer.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

function formatCurrency(amount, currency = 'MAD') {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' ' + currency;
}

function getRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function safe(str) {
  return str ? str.replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  )) : "";
}

// -----------------------------
// Data Fetching Functions
// -----------------------------
async function fetchGroups() {
  try {
    console.log("🔄 Fetching groups...");
    const res = await fetch(`${API_URL}/groups`, {
      headers: getHeaders()
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const groups = await res.json();
    console.log("📊 Fetched groups:", groups.length);
    return groups;
  } catch (err) {
    console.error("❌ Error fetching groups:", err);
    showError("Failed to load groups");
    return [];
  }
}

async function fetchGroupStats() {
  try {
    const [groups, friends] = await Promise.all([
      fetchGroups(),
      fetchFriends()
    ]);

    // Calculate stats using data from groups
    // Groups now include expenses_count and has_unsettled_balance from backend
    const totalExpenses = groups.reduce((sum, g) => sum + (g.expenses_count || 0), 0);
    const unsettledGroups = groups.filter(g => g.has_unsettled_balance === true).length;

    const stats = {
      totalGroups: groups.length,
      totalFriends: friends.length,
      totalExpenses: totalExpenses,
      unsettledGroups: unsettledGroups
    };

    console.log("📈 Group stats:", stats);
    console.log("📊 Groups data:", groups.map(g => ({ id: g.id, title: g.title, expenses_count: g.expenses_count, has_unsettled: g.has_unsettled_balance })));
    return stats;
  } catch (err) {
    console.error("❌ Error calculating stats:", err);
    return { totalGroups: 0, totalFriends: 0, totalExpenses: 0, unsettledGroups: 0 };
  }
}

async function fetchFriends() {
  try {
    const res = await fetch(`${API_URL}/friends/my`, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Error fetching friends:", err);
    return [];
  }
}

// -----------------------------
// Edit Group Modal Functions
// -----------------------------
async function openEditGroupModal(groupId) {
  try {
    // Fetch the specific group data
    const res = await fetch(`${API_URL}/groups/${groupId}`, { headers: getHeaders() });
    if (!res.ok) {
      throw new Error('Failed to load group');
    }

    const group = await res.json();

    // Check if modal exists, if not create it
    let modalEl = document.getElementById('editGroupModal');
    if (!modalEl) {
      // Create modal HTML dynamically
      const modalHTML = `
        <div class="modal fade" id="editGroupModal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header bg-warning">
                <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Edit Group</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <form id="editGroupForm">
                <div class="modal-body">
                  <input type="hidden" id="editGroupId">
                  
                  <div class="mb-3">
                    <label for="editGroupTitle" class="form-label">Group Name</label>
                    <input type="text" class="form-control" id="editGroupTitle" required>
                  </div>
                  
                  <div class="mb-3" id="editGroupCategoryDiv">
                    <label for="editGroupCategory" class="form-label">Category</label>
                    <select class="form-select" id="editGroupCategory" required>
                      <option value="Home">🏠 Home</option>
                      <option value="Couple">💕 Couple</option>
                      <option value="Trip">✈️ Trip</option>
                      <option value="Work">💼 Work</option>
                      <option value="Other">📝 Other</option>
                    </select>
                  </div>
                  
                  <div class="mb-3">
                    <label for="editGroupCurrency" class="form-label">Currency</label>
                    <select class="form-select" id="editGroupCurrency" required>
                      <option value="MAD">🇲🇦 MAD</option>
                      <option value="USD">🇺🇸 USD</option>
                      <option value="EUR">🇪🇺 EUR</option>
                      <option value="GBP">🇬🇧 GBP</option>
                    </select>
                  </div>
                  
                  <div class="mb-3">
                    <label for="editGroupDescription" class="form-label">Description</label>
                    <textarea class="form-control" id="editGroupDescription" rows="3"></textarea>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                  <button type="submit" class="btn btn-warning">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      modalEl = document.getElementById('editGroupModal');

      // Add form submit handler
      document.getElementById('editGroupForm').addEventListener('submit', saveGroupEdit);
    }

    // Populate form fields
    document.getElementById('editGroupId').value = group.id;
    document.getElementById('editGroupTitle').value = group.title || '';
    document.getElementById('editGroupCategory').value = group.category || 'Other';
    document.getElementById('editGroupCurrency').value = group.currency || 'MAD';
    document.getElementById('editGroupDescription').value = group.description || '';

    // ✅ Hide/show and disable fields based on group type
    const titleInput = document.getElementById('editGroupTitle');
    const categoryDiv = document.getElementById('editGroupCategoryDiv');
    const categorySelect = document.getElementById('editGroupCategory');

    // Check if it's the default Personal Expenses group
    const isDefaultPersonalGroup = (group.type === 'Personal' || group.type === 'Personal Expenses') && group.title === 'Personal Expenses';

    if (group.type === 'Personal' || group.type === 'Personal Expenses') {
      // For ALL Personal groups: HIDE category field completely
      if (categoryDiv) {
        categoryDiv.style.display = 'none';
      }

      // For DEFAULT Personal Expenses group ONLY: also disable title
      if (isDefaultPersonalGroup && titleInput) {
        titleInput.disabled = true;
        titleInput.style.backgroundColor = '#e9ecef';
        titleInput.title = 'Cannot edit title of default Personal Expenses group';
      } else if (titleInput) {
        // Other Personal groups can edit title
        titleInput.disabled = false;
        titleInput.style.backgroundColor = '';
        titleInput.title = '';
      }
    } else {
      // Non-Personal groups: show and enable both
      if (categoryDiv) {
        categoryDiv.style.display = 'block';
      }
      if (titleInput) {
        titleInput.disabled = false;
        titleInput.style.backgroundColor = '';
        titleInput.title = '';
      }
      if (categorySelect) {
        categorySelect.disabled = false;
        categorySelect.style.backgroundColor = '';
        categorySelect.title = '';
      }
    }

    // Show modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

  } catch (err) {
    console.error('Error opening edit modal:', err);
    showError('Failed to load group data');
  }
}

async function saveGroupEdit(e) {
  e.preventDefault();

  const groupId = document.getElementById('editGroupId').value;
  const title = document.getElementById('editGroupTitle').value.trim();
  const category = document.getElementById('editGroupCategory').value;
  const currency = document.getElementById('editGroupCurrency').value;
  const description = document.getElementById('editGroupDescription').value.trim();

  if (!title) {
    showError('Group title is required');
    return;
  }

  const payload = {
    title,
    category,
    currency,
    description: description || null
  };

  try {
    const res = await fetch(`${API_URL}/groups/${groupId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || 'Failed to update group');
    }

    showSuccess('Group updated successfully!');

    // Close modal
    const modalEl = document.getElementById('editGroupModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    // Reload groups
    await loadGroups();

  } catch (err) {
    console.error('Error updating group:', err);
    showError(err.message || 'Failed to update group');
  }
}

// -----------------------------
// Delete Group Function
// -----------------------------
async function deleteGroup(groupId) {
  try {
    // Fetch group to check if it's Personal
    const res = await fetch(`${API_URL}/groups/${groupId}`, { headers: getHeaders() });
    if (res.ok) {
      const group = await res.json();
      if (group.type === 'Personal') {
        showError('Cannot delete Personal Expenses group');
        return;
      }
    }

    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    const deleteRes = await fetch(`${API_URL}/groups/${groupId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!deleteRes.ok) {
      const errorData = await deleteRes.json();
      throw new Error(errorData.detail || 'Failed to delete group');
    }

    showSuccess('Group deleted successfully!');

    // Reload groups
    await loadGroups();

  } catch (err) {
    console.error('Error deleting group:', err);
    showError(err.message || 'Failed to delete group');
  }
}

// -----------------------------
// Summary Statistics
// -----------------------------
function updateSummaryStats(stats) {
  // Desktop stats
  document.getElementById('totalGroups').textContent = stats.totalGroups;
  document.getElementById('totalFriends').textContent = stats.totalFriends;
  document.getElementById('totalExpenses').textContent = stats.totalExpenses;
  document.getElementById('unsettledGroups').textContent = stats.unsettledGroups;

  // Mobile stats
  document.getElementById('mobileTotalGroups').textContent = stats.totalGroups;
  document.getElementById('mobileTotalFriends').textContent = stats.totalFriends;
}

// -----------------------------
// Desktop Table Rendering
// -----------------------------
async function renderGroupsList() {
  const table = document.getElementById("groupsTable");
  if (!table) return;

  try {
    // Show loading state
    table.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2">Loading groups...</div>
        </td>
      </tr>
    `;

    const groups = await fetchGroups();
    allGroups = groups;
    filteredGroups = groups;

    table.innerHTML = "";

    if (!groups.length) {
      table.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-5">
            <i class="bi bi-people fs-1 mb-3"></i>
            <h5>No groups yet</h5>
            <p>Create your first group to start splitting expenses!</p>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createGroupModal">
              <i class="bi bi-plus-circle me-1"></i>Create Group
            </button>
          </td>
        </tr>
      `;
      return;
    }

    groups.forEach(g => {
      const participants = (g.members_usernames || []).join(", ");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <span class="badge bg-secondary">${g.id}</span>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div class="group-avatar rounded-circle d-flex align-items-center justify-content-center me-2" 
                 style="width: 32px; height: 32px;" data-color="${(g.id % 6) + 1}">
              ${(g.title || "").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() || "G"}
            </div>
            <span class="fw-semibold">${safe(g.title)}</span>
          </div>
        </td>
        <td>
          <span class="badge bg-info">${g.currency}</span>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div class="rounded-circle bg-warning text-white d-flex align-items-center justify-content-center me-2" 
                 style="width: 24px; height: 24px;">
              <i class="bi bi-person" style="font-size: 0.75rem;"></i>
            </div>
            <span>${g.owner_username || "Unknown"}</span>
          </div>
        </td>
        <td>
          <span class="badge bg-success">${g.members_usernames?.length || 0} members</span>
        </td>
        <td>
          <small class="text-muted">${getRelativeTime(g.created_at)}</small>
        </td>
        <td>
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-primary" onclick="openGroup('${g.id}')" title="Open Group">
              <i class="bi bi-box-arrow-up-right"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning" 
                    onclick="openEditGroupModal('${g.id}')" title="Edit Group">
              <i class="bi bi-pencil"></i>
            </button>
            ${((g.type === "Personal" || g.type === "Personal Expenses") && g.title === "Personal Expenses")
          ? `<button class="btn btn-sm btn-outline-secondary" disabled title="Cannot delete default group"><i class="bi bi-lock"></i></button>`
          : `<button class="btn btn-sm btn-outline-danger" onclick="deleteGroup('${g.id}')" title="Delete Group"><i class="bi bi-trash"></i></button>`
        }
          </div>
          </td>
        `;
      table.appendChild(tr);
    });

    // Update stats
    const stats = await fetchGroupStats();
    updateSummaryStats(stats);

  } catch (err) {
    console.error("❌ Error rendering groups list:", err);
    table.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger py-4">
          <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
          <h5>Error loading groups</h5>
          <p>${err.message}</p>
          <button class="btn btn-outline-primary" onclick="renderGroupsList()">
            <i class="bi bi-arrow-clockwise me-1"></i>Retry
          </button>
        </td>
      </tr>
    `;
  }
}

// -----------------------------
// Mobile Cards Rendering
// -----------------------------
async function renderGroupsMobileCards() {
  const container = document.getElementById("groupsMobileCards");
  if (!container) return;

  try {
    // Show loading state
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="mt-2">Loading groups...</div>
      </div>
    `;

    const groups = await fetchGroups();
    allGroups = groups;
    filteredGroups = groups;

    container.innerHTML = "";

    if (!groups.length) {
      container.innerHTML = `
        <div class="text-center text-muted py-5">
          <i class="bi bi-people fs-1 mb-3"></i>
          <h5>No groups yet</h5>
          <p>Create your first group to start splitting expenses!</p>
          <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createGroupModal">
            <i class="bi bi-plus-circle me-1"></i>Create Group
          </button>
        </div>
      `;
      return;
    }

    groups.forEach(g => {
      const initials = (g.title || "")
        .split(" ")
        .map(p => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "G";

      const participants = (g.members_usernames || []).join(", ") || "No members";
      const recent = g.expenses?.length
        ? `${g.expenses[0].payer_username ?? "Someone"} paid ${formatCurrency(g.expenses[0].amount, g.expenses[0].currency)}`
        : "No recent activity";

      const card = document.createElement("div");
      card.className = "group-card card shadow-sm border-0 mb-3";
      card.style.cursor = "pointer";

      // Add click handler
      card.addEventListener('click', () => openGroup(g.id));

      const gradientIndex = (g.id % 6) + 1;

      card.innerHTML = `
  <div class="card-body d-flex align-items-center">
    <div class="group-avatar rounded-circle d-flex align-items-center justify-content-center me-3"
         style="width:55px; height:55px;" data-color="${gradientIndex}">
      ${initials}
    </div>
    <div class="flex-grow-1">
      <h6 class="mb-1 fw-bold">${safe(g.title)}</h6>
      <small class="text-muted">👑 ${g.owner_username || "Unknown"}</small><br>
      <small class="text-muted">👥 ${participants}</small><br>
      <small class="text-muted">💰 ${recent}</small>
    </div>
    <div class="text-end">
      <div class="text-muted fw-bold mb-2">${g.currency || ""}</div>
            <div class="btn-group-vertical" role="group">
            <button class="btn btn-sm btn-outline-primary mb-1" onclick="event.stopPropagation(); openGroup('${g.id}')" title="Open">
                <i class="bi bi-box-arrow-up-right"></i>
              </button>
            <button class="btn btn-sm btn-outline-warning mb-1"
                      onclick="event.stopPropagation(); openEditGroupModal('${g.id}')" title="Edit">
                <i class="bi bi-pencil"></i>
              </button>
              ${((g.type === "Personal" || g.type === "Personal Expenses") && g.title === "Personal Expenses")
          ? `<button class="btn btn-sm btn-outline-secondary" disabled title="Cannot delete default group"><i class="bi bi-lock"></i></button>`
          : `<button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteGroup('${g.id}')" title="Delete"><i class="bi bi-trash"></i></button>`
        }
            </div>
    </div>
  </div>
`;

      container.appendChild(card);
    });

    // Update mobile stats
    const stats = await fetchGroupStats();
    updateSummaryStats(stats);

  } catch (err) {
    console.error("❌ Error rendering mobile cards:", err);
    container.innerHTML = `
      <div class="text-center text-danger py-4">
        <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
        <h5>Error loading groups</h5>
        <p>${err.message}</p>
        <button class="btn btn-outline-primary" onclick="renderGroupsMobileCards()">
          <i class="bi bi-arrow-clockwise me-1"></i>Retry
        </button>
      </div>
    `;
  }
}

// -----------------------------
// Search and Filter Functions
// -----------------------------
function filterGroups() {
  const searchTerm = document.getElementById('groupSearch')?.value.toLowerCase() ||
    document.getElementById('mobileGroupSearch')?.value.toLowerCase() || '';
  const filterType = document.getElementById('groupFilter')?.value || '';

  filteredGroups = allGroups.filter(group => {
    const matchesSearch = group.title.toLowerCase().includes(searchTerm) ||
      group.owner_username?.toLowerCase().includes(searchTerm) ||
      group.members_usernames?.some(member => member.toLowerCase().includes(searchTerm));

    const matchesFilter = !filterType || group.type === filterType;

    return matchesSearch && matchesFilter;
  });

  // Re-render based on screen size
  if (window.innerWidth >= 768) {
    renderFilteredGroupsTable();
  } else {
    renderFilteredGroupsMobile();
  }
}

function renderFilteredGroupsTable() {
  const table = document.getElementById("groupsTable");
  if (!table) return;

  table.innerHTML = "";

  if (!filteredGroups.length) {
    table.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="bi bi-search fs-1 mb-3"></i>
          <h5>No groups found</h5>
          <p>Try adjusting your search or filter criteria</p>
        </td>
      </tr>
    `;
    return;
  }

  filteredGroups.forEach(g => {
    const participants = (g.members_usernames || []).join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge bg-secondary">${g.id}</span></td>
      <td>
        <div class="d-flex align-items-center">
          <div class="group-avatar rounded-circle d-flex align-items-center justify-content-center me-2" 
               style="width: 32px; height: 32px;" data-color="${(g.id % 6) + 1}">
            ${(g.title || "").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() || "G"}
          </div>
          <span class="fw-semibold">${safe(g.title)}</span>
        </div>
      </td>
      <td><span class="badge bg-info">${g.currency}</span></td>
      <td>
        <div class="d-flex align-items-center">
          <div class="rounded-circle bg-warning text-white d-flex align-items-center justify-content-center me-2" 
               style="width: 24px; height: 24px;">
            <i class="bi bi-person" style="font-size: 0.75rem;"></i>
          </div>
          <span>${g.owner_username || "Unknown"}</span>
        </div>
      </td>
      <td>
        <span class="badge bg-success">${g.members_usernames?.length || 0} members</span>
      </td>
      <td><small class="text-muted">${getRelativeTime(g.created_at)}</small></td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-primary" onclick="openGroup('${g.id}')" title="Open Group">
            <i class="bi bi-box-arrow-up-right"></i>
          </button>
          <button class="btn btn-sm btn-outline-warning" 
                  onclick="openEditGroupModal('${g.id}')" title="Edit Group">
            <i class="bi bi-pencil"></i>
          </button>
          ${g.type !== 'Personal' ? `
          <button class="btn btn-sm btn-outline-danger" onclick="deleteGroup('${g.id}')" title="Delete Group">
            <i class="bi bi-trash"></i>
          </button>
          ` : ''}
        </div>
      </td>
    `;
    table.appendChild(tr);
  });
}

function renderFilteredGroupsMobile() {
  const container = document.getElementById("groupsMobileCards");
  if (!container) return;

  container.innerHTML = "";

  if (!filteredGroups.length) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="bi bi-search fs-1 mb-3"></i>
        <h5>No groups found</h5>
        <p>Try adjusting your search criteria</p>
      </div>
    `;
    return;
  }

  filteredGroups.forEach(g => {
    const initials = (g.title || "")
      .split(" ")
      .map(p => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "G";

    const participants = (g.members_usernames || []).join(", ") || "No members";
    const recent = g.expenses?.length
      ? `${g.expenses[0].payer_username ?? "Someone"} paid ${formatCurrency(g.expenses[0].amount, g.expenses[0].currency)}`
      : "No recent activity";

    const card = document.createElement("div");
    card.className = "group-card card shadow-sm border-0 mb-3";
    card.style.cursor = "pointer";

    card.addEventListener('click', () => openGroup(g.id));

    const gradientIndex = (g.id % 6) + 1;

    card.innerHTML = `
      <div class="card-body d-flex align-items-center">
        <div class="group-avatar rounded-circle d-flex align-items-center justify-content-center me-3"
             style="width:55px; height:55px;" data-color="${gradientIndex}">
          ${initials}
        </div>
        <div class="flex-grow-1">
          <h6 class="mb-1 fw-bold">${safe(g.title)}</h6>
          <small class="text-muted">👑 ${g.owner_username || "Unknown"}</small><br>
          <small class="text-muted">👥 ${participants}</small><br>
          <small class="text-muted">💰 ${recent}</small>
        </div>
        <div class="text-end">
          <div class="text-muted fw-bold mb-2">${g.currency || ""}</div>
          <div class="btn-group-vertical" role="group">
            <button class="btn btn-sm btn-outline-primary mb-1" onclick="event.stopPropagation(); openGroup('${g.id}')" title="Open">
              <i class="bi bi-box-arrow-up-right"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning mb-1"
                    onclick="event.stopPropagation(); openEditGroupModal('${g.id}')" title="Edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteGroup('${g.id}')" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// -----------------------------
// Group Management Functions
// -----------------------------
async function createGroup() {
  try {
    const title = document.getElementById("groupTitle")?.value?.trim();
    const currency = document.getElementById("groupCurrency")?.value || "MAD";
    const type = document.getElementById("groupType")?.value || "Other";
    const selectedCards = document.querySelectorAll(".friend-card.selected");
    const member_ids = Array.from(selectedCards).map(card => card.dataset.friendId);

    const isPersonal = document.getElementById("isPersonalGroup")?.checked;

    // If personal, force type to Personal and ignore members
    const finalType = isPersonal ? "Personal" : type;
    const finalMembers = isPersonal ? [] : member_ids;

    if (!isPersonal && !selectedCards.length) return alert("Please select a friend!");

    if (!title) {
      showError("Group title is required");
      return;
    }

    console.log("🔄 Creating group:", { title, currency, type: finalType, member_ids: finalMembers });

    const res = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ title, currency, type: finalType, member_ids: finalMembers })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to create group");
    }

    const response = await res.json();
    const newGroup = response.data?.group;
    console.log("✅ Group created:", newGroup);

    showSuccess("Group created successfully!");

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById("createGroupModal"));
    if (modal) modal.hide();

    // Redirect to expenses page
    window.location.href = `expenses.html?id=${newGroup._id}`;

  } catch (err) {
    console.error("❌ Error creating group:", err);
    showError(err.message || "Failed to create group");
  }
}

function toggleFriendSelection() {
  const isPersonal = document.getElementById("isPersonalGroup")?.checked;
  const friendsSection = document.getElementById("friendsListtoCreateGroup")?.closest('.row');

  if (friendsSection) {
    friendsSection.style.display = isPersonal ? 'none' : 'block';
  }
}

// Make globally available
window.toggleFriendSelection = toggleFriendSelection;
window.openGroup = openGroup;
window.createGroup = createGroup;
window.selectAllFriends = selectAllFriends;
window.deselectAllFriends = deselectAllFriends;
window.selectAllMembers = selectAllMembers;
window.deselectAllMembers = deselectAllMembers;
window.addExpenseModalSubmit = addExpenseModalSubmit;
window.deleteGroup = deleteGroup;
window.renderGroupsList = renderGroupsList;
window.renderGroupsMobileCards = renderGroupsMobileCards;

// Debug: Log that functions are exposed
console.log("🔧 DEBUG: Functions exposed to window:", {
  openGroup: typeof window.openGroup,
  deleteGroup: typeof window.deleteGroup,
  createGroup: typeof window.createGroup
});

function openGroup(id) {
  console.log("🔧 DEBUG: openGroup called with id:", id);
  window.location.href = `expenses.html?id=${id}`;
}

async function deleteGroup(groupId) {
  if (!groupId) return;

  if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;

  try {
    console.log("🔄 Deleting group:", groupId);

    const res = await fetch(`${API_URL}/groups/${groupId}`, {
      method: "DELETE",
      headers: getHeaders()
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to delete group");
    }

    console.log("✅ Group deleted successfully");
    showSuccess("Group deleted successfully!");

    // Refresh the groups list
    await Promise.all([
      renderGroupsList(),
      renderGroupsMobileCards(),
      loadGroupsForExpense()
    ]);

  } catch (err) {
    console.error("❌ Error deleting group:", err);
    showError(err.message || "Failed to delete group");
  }
}

// -----------------------------
// Edit Group Modal Functions
// -----------------------------
let editGroupModal;

async function openEditGroupModal(groupId) {
  console.log("🔄 Opening edit modal for group:", groupId);
  console.log("📊 Modal instance:", editGroupModal);

  try {
    // Fetch complete group data
    const res = await fetch(`${API_URL}/groups/${groupId}`, { headers: getHeaders() });
    if (!res.ok) {
      throw new Error("Failed to fetch group data");
    }

    const group = await res.json();
    console.log("📊 Group data loaded:", group);

    // Populate all fields
    document.getElementById("editGroupId").value = groupId;
    document.getElementById("editGroupTitle").value = group.title || "";
    document.getElementById("editGroupCategory").value = group.category || "Other";
    document.getElementById("editGroupOriginalType").value = group.type || "Other";
    document.getElementById("editGroupCurrency").value = group.currency || "MAD";
    document.getElementById("editGroupPhoto").value = group.photo || "";
    console.log("📊 Group descreption :", group.description);
    document.getElementById("editGroupDescription").value = group.description || "";

    // ✅ Hide/show and disable fields based on group type
    const titleInput = document.getElementById('editGroupTitle');
    const categoryDiv = document.getElementById('editGroupCategoryDiv');
    const categorySelect = document.getElementById('editGroupCategory');

    // Check if it's the default Personal Expenses group
    const isDefaultPersonalGroup = (group.type === 'Personal' || group.type === 'Personal Expenses') && group.title === 'Personal Expenses';

    if (group.type === 'Personal' || group.type === 'Personal Expenses') {
      // For ALL Personal groups: HIDE category field completely
      if (categoryDiv) {
        categoryDiv.style.display = 'none';
      }

      // For DEFAULT Personal Expenses group ONLY: also disable title
      if (isDefaultPersonalGroup && titleInput) {
        titleInput.disabled = true;
        titleInput.style.backgroundColor = '#e9ecef';
        titleInput.title = 'Cannot edit title of default Personal Expenses group';
      } else if (titleInput) {
        // Other Personal groups can edit title
        titleInput.disabled = false;
        titleInput.style.backgroundColor = '';
        titleInput.title = '';
      }
    } else {
      // Non-Personal groups: show and enable both
      if (categoryDiv) {
        categoryDiv.style.display = 'block';
      }
      if (titleInput) {
        titleInput.disabled = false;
        titleInput.style.backgroundColor = '';
        titleInput.title = '';
      }
      if (categorySelect) {
        categorySelect.disabled = false;
        categorySelect.style.backgroundColor = '';
        categorySelect.title = '';
      }
    }

    console.log("📝 Fields populated, showing modal...");

    setTimeout(() => {
      try {
        if (editGroupModal) {
          editGroupModal.show();
          console.log("✅ Modal shown successfully");
        } else {
          console.error("❌ Edit group modal not initialized");
          // Try to create a new instance as fallback
          const modalEl = document.getElementById('editGroupModal');
          if (modalEl && typeof bootstrap !== 'undefined') {
            const fallbackModal = new bootstrap.Modal(modalEl);
            fallbackModal.show();
            console.log("✅ Fallback modal created and shown");
          }
        }
      } catch (err) {
        console.error("❌ Error showing modal:", err);
      }
    }, 100);

  } catch (err) {
    console.error("❌ Error loading group data:", err);
    showError("Failed to load group information");
  }
}

// Make function globally accessible
window.openEditGroupModal = openEditGroupModal;

async function saveGroupChanges(event) {
  event.preventDefault();

  const groupId = document.getElementById("editGroupId").value;
  const newTitle = document.getElementById("editGroupTitle").value.trim();
  let newType = document.getElementById("editGroupCategory").value;
  const originalType = document.getElementById("editGroupOriginalType").value;

  // Preserve Personal/Personal Expenses type if it was originally set
  if (originalType === 'Personal' || originalType === 'Personal Expenses') {
    newType = originalType;
  }
  const newCurrency = document.getElementById("editGroupCurrency").value;
  const newPhoto = document.getElementById("editGroupPhoto").value.trim();
  const newDescription = document.getElementById("editGroupDescription").value.trim();

  console.log("🔄 Saving group changes:", { groupId, newTitle, newType, newCurrency, newPhoto, newDescription });

  if (!newTitle) {
    showError("Group name is required");
    return;
  }

  const payload = {
    title: newTitle,
    type: newType,
    currency: newCurrency,
    photo: newPhoto || null,
    description: newDescription || ""
  };

  try {
    const res = await fetch(`${API_URL}/groups/${groupId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to update group");
    }

    const updatedGroup = await res.json();
    console.log("✅ Group updated:", updatedGroup);

    showSuccess(`Group "${updatedGroup.title}" updated successfully!`);

    // Close modal
    const editGroupModal = bootstrap.Modal.getInstance(document.getElementById('editGroupModal'));
    if (editGroupModal) editGroupModal.hide();

    // Refresh the groups list
    await Promise.all([
      renderGroupsList(),
      renderGroupsMobileCards()
    ]);

  } catch (err) {
    console.error("❌ Error updating group:", err);
    showError(err.message || "Failed to update group");
  }
}

// -----------------------------
// Expense Creation Functions
// -----------------------------
async function loadWalletsForGroups() {
  try {
    const res = await fetch(`${API_URL}/wallets`, { headers: getHeaders() });
    if (!res.ok) return [];
    const response = await res.json();
    const wallets = response.data?.wallets || [];

    const walletSelect = document.getElementById('expenseWallet');
    if (walletSelect) {
      walletSelect.innerHTML = '<option value="">No wallet selected</option>';
      wallets.forEach(wallet => {
        const option = document.createElement('option');
        option.value = wallet._id;
        option.textContent = `${wallet.name} (${wallet.balance.toFixed(2)} ${wallet.category})`;
        walletSelect.appendChild(option);
      });
    }

    return wallets;
  } catch (err) {
    console.error('Error loading wallets:', err);
    return [];
  }
}

async function loadGroupsForExpense() {
  try {
    const res = await fetch(`${API_URL}/groups`, {
      headers: getHeaders()
    });
    const response = await res.json();
    const groups = response.data?.groups || [];

    const groupSelect = document.getElementById('groupsListForExpenses');
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">-- Choose a group --</option>';

      let personalGroupId = null;

      groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group._id;
        option.textContent = group.title;
        groupSelect.appendChild(option);

        // Check if this is the default Personal Expenses group
        if (group.type === 'Personal' && group.title === 'Personal Expenses') {
          personalGroupId = group._id;
        }
      });

      // Listen for selection change
      groupSelect.addEventListener("change", async (e) => {
        const groupId = e.target.value;
        if (groupId) {
          await loadMembersForGroup(groupId);
          await loadPayersForGroup(groupId);
        } else {
          const membersContainer = document.getElementById("membersListForGroups");
          if (membersContainer) membersContainer.innerHTML = "";

          // Clear payer select
          const payerSelect = document.getElementById('expensePayer');
          if (payerSelect) {
            payerSelect.innerHTML = '<option value="">Select who paid...</option>';
          }
        }
      });

      // Auto-select Personal Expenses if found
      if (personalGroupId) {
        groupSelect.value = personalGroupId;
        // Trigger change event to load members (which is just the user)
        groupSelect.dispatchEvent(new Event('change'));
      }
    }


  } catch (err) {
    console.error("Failed to load groups:", err);
  }
}

async function loadMembersForGroup(groupId) {
  try {
    const res = await fetch(`${API_URL}/groups/${groupId}/members`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch members");
    const members = await res.json();

    const membersContainer = document.getElementById("membersListForGroups");
    if (membersContainer) {
      // Check if we're on home page or groups page
      if (window.location.pathname.includes('home.html')) {
        renderMembersCardsForHome(membersContainer, members);
      } else {
        renderMembersCardsForGroup(membersContainer, members);
      }
    }
  } catch (err) {
    console.error("Error loading members:", err);
    const membersContainer = document.getElementById("membersListForGroups");
    if (membersContainer) {
      membersContainer.innerHTML = `
        <div class="text-center text-danger py-3">
          <i class="bi bi-exclamation-triangle fs-1 mb-2"></i>
          <p>Failed to load members</p>
        </div>
      `;
    }
  }
}

async function loadPayersForGroup(groupId) {
  try {
    console.log("🔄 Loading payers for group:", groupId);

    const res = await fetch(`${API_URL}/groups/${groupId}/members`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch members");
    const members = await res.json();

    const payerSelect = document.getElementById('addPayer') || document.getElementById('expensePayer');
    if (!payerSelect) {
      console.warn("Payer select not found (tried both 'addPayer' and 'expensePayer')");
      return;
    }

    // Get current user for comparison
    const currentUser = await fetchCurrentUser();

    // Clear existing options except the first one
    payerSelect.innerHTML = '<option value="">Select who paid...</option>';

    // Add member options
    members.forEach(member => {
      const option = document.createElement('option');
      option.value = member.user_id;
      option.textContent = `${member.username || `User ${member.user_id}`}${member.user_id === currentUser?.id ? ' (You)' : ''}`;
      payerSelect.appendChild(option);
    });

    // Set current user as default
    if (currentUser) {
      payerSelect.value = currentUser.id;
      // Trigger wallet update
      updateWalletsForPayer(currentUser.id);
    }

    // Add event listener for payer changes
    payerSelect.addEventListener('change', function () {
      updateWalletsForPayer(this.value);
    });

    console.log("✅ Payers loaded successfully");
  } catch (err) {
    console.error("❌ Error loading payers:", err);
    const payerSelect = document.getElementById('addPayer') || document.getElementById('expensePayer');
    if (payerSelect) {
      payerSelect.innerHTML = '<option value="">Error loading payers</option>';
    }
  }
}

// Make functions globally accessible
window.loadMembersForGroup = loadMembersForGroup;
window.loadPayersForGroup = loadPayersForGroup;

function renderMembersCardsForGroup(container, members) {
  if (!container || !Array.isArray(members)) return;

  container.innerHTML = "";
  container.className = "row g-2 justify-content-center"; // responsive grid spacing

  members.forEach(m => {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3"; // auto-fit grid

    const card = document.createElement("div");
    card.className = "member-card card text-center border-0 shadow-sm";
    card.style.cursor = "pointer";
    card.style.transition = "all 0.25s ease";
    card.style.userSelect = "none";
    card.style.padding = "0.75rem";

    // ✅ Avatar or initials
    const initials = (m.username || "U")
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase();

    card.innerHTML = `
      <input class="form-check-input d-none" type="checkbox" value="${m.user_id}" id="member_${m.user_id}" onchange="updateExpensePreview()" ${m.user_id === currentUser?.id ? 'checked' : ''}>
      <div class="avatar mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle">
        ${initials}
      </div>
      <h6 class="mb-0 text-truncate" style="font-size: 0.8rem;">${m.username || m.user_id}</h6>
      <small class="text-muted" style="font-size: 0.7rem;">${m.is_admin ? "👑 Admin" : "👤 Member"}</small>
      ${m.user_id === currentUser?.id ? '<span class="badge bg-primary mt-1" style="font-size: 0.6rem;">You</span>' : ''}
    `;

    // ✅ Click to toggle checkbox
    card.addEventListener("click", (e) => {
      if (e.target.type === "checkbox") return;
      const checkbox = card.querySelector("input[type=checkbox]");
      checkbox.checked = !checkbox.checked;

      // Add/remove selected class for visual feedback
      if (checkbox.checked) {
        card.classList.add('member-selected');
      } else {
        card.classList.remove('member-selected');
      }

      updateExpensePreview();
    });

    // ✅ Visual feedback
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-2px)";
      card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    });

    col.appendChild(card);
    container.appendChild(col);
  });
}

// Function to render members for home page (same styling as groups)
function renderMembersCardsForHome(container, members) {
  if (!container || !Array.isArray(members)) return;

  container.innerHTML = "";
  container.className = "row g-2 justify-content-center"; // responsive grid spacing

  // Get current user for comparison
  fetchCurrentUser().then(currentUser => {
    members.forEach(m => {
      const col = document.createElement("div");
      col.className = "col-6 col-md-4 col-lg-3"; // auto-fit grid

      const card = document.createElement("div");
      card.className = "member-card card text-center border-0 shadow-sm";
      card.style.cursor = "pointer";
      card.style.transition = "all 0.25s ease";
      card.style.userSelect = "none";
      card.style.padding = "0.75rem";

      // ✅ Avatar or initials
      const initials = (m.username || "U")
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase();

      card.innerHTML = `
        <input class="form-check-input d-none" type="checkbox" value="${m.user_id}" id="member_${m.user_id}" onchange="updateExpensePreview()" ${m.user_id === currentUser?.id ? 'checked' : ''}>
        <div class="avatar mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle">
          ${initials}
        </div>
        <h6 class="mb-0 text-truncate" style="font-size: 0.8rem;">${m.username || m.user_id}</h6>
        <small class="text-muted" style="font-size: 0.7rem;">${m.is_admin ? "👑 Admin" : "👤 Member"}</small>
        ${m.user_id === currentUser?.id ? '<span class="badge bg-primary mt-1" style="font-size: 0.6rem;">You</span>' : ''}
      `;

      // Add selected class if current user is checked by default
      if (m.user_id === currentUser?.id) {
        card.classList.add('member-selected');
      }

      // ✅ Click to toggle checkbox
      card.addEventListener("click", (e) => {
        if (e.target.type === "checkbox") return;
        const checkbox = card.querySelector("input[type=checkbox]");
        checkbox.checked = !checkbox.checked;

        // Add/remove selected class for visual feedback
        if (checkbox.checked) {
          card.classList.add('member-selected');
        } else {
          card.classList.remove('member-selected');
        }

        updateExpensePreview();
      });

      // ✅ Visual feedback
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-2px)";
        card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)";
        card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
      });

      col.appendChild(card);
      container.appendChild(col);
    });
  });
}

// Add missing functions for home page
function selectAllMembers() {
  const checkboxes = document.querySelectorAll("#membersListForGroups input[type=checkbox]");
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
    // Add visual feedback
    const card = checkbox.closest('.member-card');
    if (card) {
      card.classList.add('member-selected');
    }
  });
  updateExpensePreview();
}

function deselectAllMembers() {
  const checkboxes = document.querySelectorAll("#membersListForGroups input[type=checkbox]");
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
    // Remove visual feedback
    const card = checkbox.closest('.member-card');
    if (card) {
      card.classList.remove('member-selected');
    }
  });
  updateExpensePreview();
}

// Add wallet update function for group.js
function updateWalletsForPayer(payerId = null) {
  const payerSelect = document.getElementById('expensePayer');
  const walletSelect = document.getElementById('expenseWallet');
  const walletSection = document.getElementById('walletSection');

  if (!payerSelect || !walletSelect || !walletSection) return;

  const selectedPayerId = payerId || payerSelect.value;

  if (!selectedPayerId) {
    // Hide wallet section if no payer selected
    walletSection.style.display = 'none';
    walletSelect.innerHTML = '<option value="">No wallet selected</option>';
    return;
  }

  // Get current user
  fetchCurrentUser().then(currentUser => {
    if (currentUser && selectedPayerId === currentUser.id.toString()) {
      // Show wallet section only for current user
      walletSection.style.display = 'block';

      // Load wallets for current user
      loadWalletsForGroups().then(wallets => {
        const currentUserWallets = wallets.filter(wallet => wallet.user_id === currentUser.id);

        // Update wallet options
        walletSelect.innerHTML = '<option value="">No wallet selected</option>';

        currentUserWallets.forEach(wallet => {
          const option = document.createElement('option');
          option.value = wallet.id;
          option.textContent = `${wallet.name} (${wallet.balance.toFixed(2)} ${wallet.category})`;
          walletSelect.appendChild(option);
        });
      });
    } else {
      // Hide wallet section for other users
      walletSection.style.display = 'none';
      walletSelect.innerHTML = '<option value="">No wallet selected</option>';
    }
  });
}



// -----------------------------
// Add Expense from modal (works on both pages)
// -----------------------------
async function addExpenseModalSubmit() {
  try {
    const date = document.getElementById("expenseDate").value;
    const time = document.getElementById("expenseTime").value;
    const amount = parseFloat(document.getElementById("expenseAmount").value);
    const description = document.getElementById("expenseDesc").value.trim();
    const note = document.getElementById("expenseNote").value;
    const category = document.getElementById("expenseCategory").value;
    const walletId = document.getElementById("expenseWallet").value;
    const payerId = document.getElementById("expensePayer").value;
    let groupId = document.getElementById("groupsListForExpenses")?.value;

    // If no group selected from dropdown, try to get from URL (for expenses.html)
    if (!groupId) {
      const urlParams = new URLSearchParams(window.location.search);
      groupId = urlParams.get('id');
    }

    // Validation
    if (!groupId) {
      showError("Please select a group");
      return;
    }
    if (!amount || amount <= 0) {
      showError("Please enter a valid amount");
      return;
    }
    if (!description) {
      showError("Please enter a description");
      return;
    }
    if (!date || !time) {
      showError("Please select both date and time");
      return;
    }
    if (!payerId) {
      showError("Please select who paid for this expense");
      return;
    }

    // Get selected members
    const checked = document.querySelectorAll("#membersListForGroups input[type=checkbox]:checked");
    const selectedMembers = Array.from(checked).map(c => parseInt(c.value));
    if (selectedMembers.length === 0) {
      showError("Please select at least one member");
      return;
    }

    // Build splits equally
    const share = amount / selectedMembers.length;
    const splits = selectedMembers.map(id => ({ user_id: id, share_amount: share }));

    // Combine date and time
    const expenseDate = new Date(`${date}T${time}`);

    const expenseData = {
      group_id: groupId,
      payer_id: payerId,
      description: description,
      note: note,
      amount: amount,
      currency: "MAD",
      category: category,
      wallet_id: walletId || null,
      split_type: "equal",
      created_at: expenseDate.toISOString(),
      splits
    };

    console.log("🔄 Creating expense:", expenseData);
    console.log("👥 Selected members:", selectedMembers);

    const res = await fetch(`${API_URL}/expenses`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(expenseData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to create expense");
    }

    const newExpense = await res.json();
    console.log("✅ Expense created:", newExpense);

    showSuccess(`Expense "${description}" added successfully!`);


    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById("addExpenseModal"));
    if (modal) modal.hide();

    // Clear form
    document.getElementById("addExpenseModal").querySelector("form").reset();

    // Load initial data
    await Promise.all([
      initializeExpenseModal(),
      loadGroupsForExpense(),
      loadWalletsForGroups()
    ]);
  } catch (err) {
    console.error("❌ Error creating expense:", err);
    showError(err.message || "Failed to create expense");
  }
}




// --------------------------------------
// Initialize expense modal (clean version)
// --------------------------------------
async function initializeExpenseModal() {
  try {
    // ✅ Run only on expenses page
    const path = window.location.pathname.toLowerCase();

    if (!(path.includes('groups.html') || path.includes('home.html'))) {
      console.log("⚠️ Not on target page, skipping initializeExpenseModal");
      return;
    }

    // ✅ Set current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const dateInput = document.getElementById('expenseDate');
    const timeInput = document.getElementById('expenseTime');

    if (dateInput) dateInput.value = today;
    if (timeInput) timeInput.value = currentTime;

    // ✅ Add preview listeners
    const amountInput = document.getElementById('expenseAmount');
    const categorySelect = document.getElementById('expenseCategory');

    if (amountInput) {
      amountInput.addEventListener('input', updateExpensePreview);
    }

    if (categorySelect) {
      categorySelect.addEventListener('change', updateExpensePreview);
    }

    // ✅ Fetch current user and set default payer
    const currentUser = await fetchCurrentUser();
    const payerSelect = document.getElementById('expensePayer');

    if (payerSelect && currentUser) {
      payerSelect.value = currentUser.id;
      console.log(`✅ Default payer set to current user: ${currentUser.id}`);

      // Trigger wallet update
      updateWalletsForPayer();
    }

    console.log("✅ Expense modal initialized successfully");
  } catch (err) {
    console.error("❌ Error initializing expense modal:", err);
  }
}

friendsListtoCreateGroup()
// -----------------------------
// Friends list for add-member modal (improved design)
// -----------------------------
async function friendsListtoCreateGroup() {
  const t = localStorage.getItem("token");
  if (!t) return;
  console.log("✅ Loadfing friend startt +✅✅++ successfully");
  // My friends
  let res = await fetch(`${API_URL}/friends/my`, { headers: getHeaders() });
  const myFriends = res.ok ? await res.json() : [];

  const ul1 = document.getElementById("friendsListtoCreateGroup");
  if (!ul1) return;

  if (myFriends.length === 0) {
    ul1.innerHTML = `
  <div class="text-center text-muted py-4" 
       style="cursor: pointer;" 
       onclick="window.location.href='/friends.html'">
    <i class="bi bi-person-plus" style="font-size: 2rem;"></i>
    <p class="mt-2 mb-0">No friends available to add</p>
    <small>Click here to add friends</small>
  </div>`;
    return;
  }




  ul1.innerHTML = "";
  ul1.className = "friends-grid";

  myFriends.forEach(f => {
    const card = document.createElement("div");
    card.className = "friend-card";
    card.dataset.friendId = f.user_id;

    const initials = (f.username || "U")
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase();

    card.innerHTML = `
      <div class="friend-avatar">${initials}</div>
      <div class="friend-name" title="${f.username || f.email || f.phone || `User ${f.user_id}`}">
        ${f.username || f.email || f.phone || `User ${f.user_id}`}
      </div>
    `;

    // Click handler for selection
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
    });

    ul1.appendChild(card);
  });
}



// -----------------------------
// Modal Helper Functions
// -----------------------------
function selectAllFriends() {
  const checkboxes = document.querySelectorAll("#friendsTable input[type=checkbox]");
  checkboxes.forEach(cb => cb.checked = true);
  updateGroupPreview();
}

function deselectAllFriends() {
  const checkboxes = document.querySelectorAll("#friendsTable input[type=checkbox]");
  checkboxes.forEach(cb => cb.checked = false);
  updateGroupPreview();
}

function selectAllMembers() {
  const checkboxes = document.querySelectorAll("#membersListForGroups input[type=checkbox]");
  checkboxes.forEach(cb => cb.checked = true);
  updateExpensePreview();
}

function deselectAllMembers() {
  const checkboxes = document.querySelectorAll("#membersListForGroups input[type=checkbox]");
  checkboxes.forEach(cb => cb.checked = false);
  updateExpensePreview();
}

function updateGroupPreview() {
  const name = document.getElementById("groupTitle")?.value || "";
  const checked = document.querySelectorAll("#friendsTable input[type=checkbox]:checked");
  const memberCount = checked.length;

  const preview = document.getElementById("groupPreview");
  if (preview) {
    if (name && memberCount > 0) {
      preview.style.display = "block";
      document.getElementById("previewName").textContent = name;
      document.getElementById("previewMembers").textContent = memberCount;
    } else {
      preview.style.display = "none";
    }
  }
}

function updateExpensePreview() {
  const amount = parseFloat(document.getElementById("expenseAmount")?.value) || 0;
  const groupSelect = document.getElementById("groupsListForExpenses");
  const groupName = groupSelect?.selectedOptions[0]?.textContent || "";
  const categorySelect = document.getElementById("expenseCategory");
  const category = categorySelect?.selectedOptions[0]?.textContent || "";
  const checked = document.querySelectorAll("#membersListForGroups input[type=checkbox]:checked");
  const memberCount = checked.length;

  const preview = document.getElementById("expensePreview");
  if (preview) {
    if (amount > 0 && memberCount > 0 && groupName) {
      preview.style.display = "block";
      document.getElementById("previewAmount").textContent = `${amount.toFixed(2)} MAD`;
      document.getElementById("previewPerPerson").textContent = `${(amount / memberCount).toFixed(2)} MAD`;
      document.getElementById("previewMemberCount").textContent = memberCount;
      document.getElementById("previewCategory").textContent = category;
    } else {
      preview.style.display = "none";
    }
  }
}

// -----------------------------
// Friends Management
// -----------------------------
async function loadFriendsCheckboxes(targetId) {
  try {
    const res = await fetch(`${API_URL}/friends/my`, { headers: getHeaders() });
    const friends = res.ok ? await res.json() : [];
    const container = document.getElementById(targetId);

    if (!container) return;

    container.innerHTML = "";

    if (!friends.length) {
      container.innerHTML = `
        <div class="text-center text-muted py-3">
          <i class="bi bi-person-plus fs-1 mb-2"></i>
          <p>No friends yet</p>
          <small>Add friends to invite them to groups</small>
        </div>
      `;
      return;
    }

    friends.forEach(f => {
      const div = document.createElement("div");
      div.className = "form-check";
      div.innerHTML = `
        <input class="form-check-input" type="checkbox" value="${f.user_id}" id="friend_${f.user_id}" onchange="updateGroupPreview()">
        <label class="form-check-label ms-2" for="friend_${f.user_id}">${f.username || f.user_id}</label>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading friends:", err);
  }
}

// -----------------------------
// Event Listeners
// -----------------------------
function setupEventListeners() {
  // Search functionality
  const searchInputs = ['groupSearch', 'mobileGroupSearch'];
  searchInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', filterGroups);
    }
  });

  // Filter functionality
  const filterSelect = document.getElementById('groupFilter');
  if (filterSelect) {
    filterSelect.addEventListener('change', filterGroups);
  }

  // Window resize handler
  window.addEventListener('resize', () => {
    // Re-render based on screen size
    if (filteredGroups.length > 0) {
      if (window.innerWidth >= 768) {
        renderFilteredGroupsTable();
      } else {
        renderFilteredGroupsMobile();
      }
    }
  });
}

// -----------------------------
// Initialize Page
// -----------------------------
// Initialize date/time inputs
function initializeDateTimeInputs() {
  const now = new Date();

  // Format date as YYYY-MM-DD
  const today = now.toISOString().split('T')[0];

  // Format time as HH:MM (24-hour format)
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  // Set default values
  const dateInput = document.getElementById('expenseDate');
  const timeInput = document.getElementById('expenseTime');
  const createdDateInput = document.getElementById('groupCreatedDate');

  if (dateInput) dateInput.value = today;
  if (timeInput) timeInput.value = currentTime;
  if (createdDateInput) createdDateInput.value = today;

  console.log("✅ Date/time inputs initialized");
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("🚀 Initializing groups page...");

    // Setup event listeners
    setupEventListeners();

    // Initialize date/time inputs
    initializeDateTimeInputs();

    // Initialize edit group modal (only on groups.html)
    setTimeout(() => {
      try {
        const modalEl = document.getElementById("editGroupModal");
        if (modalEl && typeof bootstrap !== 'undefined') {
          editGroupModal = new bootstrap.Modal(modalEl);
          console.log("✅ Edit group modal initialized");
        } else if (modalEl && typeof bootstrap === 'undefined') {
          console.warn("⚠️ Bootstrap not loaded yet");
        }
        // No error if modal element doesn't exist (e.g., on home.html)
      } catch (err) {
        console.error("❌ Modal initialization error:", err);
      }
    }, 200);

    // Setup edit form
    const editForm = document.getElementById("editGroupForm");
    if (editForm) {
      editForm.addEventListener("submit", saveGroupChanges);
    }

    // Setup form event listeners for previews
    const groupTitle = document.getElementById("groupTitle");
    if (groupTitle) {
      groupTitle.addEventListener("input", updateGroupPreview);
    }

    const expenseAmount = document.getElementById("expenseAmount");
    if (expenseAmount) {
      expenseAmount.addEventListener("input", updateExpensePreview);
    }

    const groupsSelect = document.getElementById("groupsListForExpenses");
    if (groupsSelect) {
      groupsSelect.addEventListener("change", updateExpensePreview);
    }

    const categorySelect = document.getElementById("expenseCategory");
    if (categorySelect) {
      categorySelect.addEventListener("change", updateExpensePreview);
    }

    // Load initial data
    await Promise.all([
      loadFriendsCheckboxes("friendsTable"),
      loadGroupsForExpense(),
      loadWalletsForGroups()
    ]);

    // Render groups based on screen size
    if (window.innerWidth >= 768) {
      await renderGroupsList();
    } else {
      await renderGroupsMobileCards();
    }

    console.log("✅ Groups page initialized successfully");

    // Test if function is accessible
    console.log("🔍 Testing openEditGroupModal function:", typeof window.openEditGroupModal);

  } catch (err) {
    console.error("❌ Error initializing groups page:", err);
    showError("Failed to load groups page");
  }
});

// Modal initialization is now handled in groups.html
