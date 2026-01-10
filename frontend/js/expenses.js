// frontend/js/expenses.js
// Enhanced expense management with better UX and responsive design
console.log("✅ Expenses.js loaded successfully");
loadAuth();

// Global variables
let currentGroup = null;
let userWallets = []; // Store all wallets for filtering by payer
let allExpenses = [];

// Pagination state
let expensesPagination = {
  currentOffset: 0,
  pageSize: 20,
  hasMore: true,
  isLoading: false,
  totalExpenses: 0
};

// ----------------------------
// Helper Functions
// ----------------------------
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_URL}/users/user/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch current user");
    return await res.json();
  } catch (err) {
    console.error("Error fetching current user:", err);
    return null;
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

// ----------------------------
// Edit Group Modal Functions
// ----------------------------
async function openEditGroupModalFromExpenses() {
  if (!currentGroup) {
    showError("Group information not loaded");
    return;
  }

  // Populate modal fields
  document.getElementById('editGroupTitle').value = currentGroup.title || '';
  document.getElementById('editGroupType').value = currentGroup.category || 'Other';
  document.getElementById('editGroupOriginalType').value = currentGroup.type || 'Other';
  document.getElementById('editGroupCurrency').value = currentGroup.currency || 'MAD';
  document.getElementById('editGroupPhoto').value = currentGroup.photo || '';
  document.getElementById('editGroupDescription').value = currentGroup.description || '';

  // ✅ Hide/show and disable fields based on group type
  const titleInput = document.getElementById('editGroupTitle');
  const categoryContainer = document.getElementById('editGroupCategoryContainer');
  const categorySelect = document.getElementById('editGroupType');

  // Check if it's the default Personal Expenses group
  const isDefaultPersonalGroup = (currentGroup.type === 'Personal' || currentGroup.type === 'Personal Expenses') && currentGroup.title === 'Personal Expenses';

  if (currentGroup.type === 'Personal' || currentGroup.type === 'Personal Expenses') {
    // For ALL Personal groups: HIDE category field completely
    if (categoryContainer) {
      categoryContainer.style.display = 'none';
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
    if (categoryContainer) {
      categoryContainer.style.display = 'block';
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
  const modalEl = document.getElementById('editGroupModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

async function saveGroupChanges(e) {
  e.preventDefault();

  const url = new URL(window.location.href);
  const groupId = url.searchParams.get("id");
  if (!groupId) {
    showError("No group selected");
    return;
  }

  const title = document.getElementById('editGroupTitle').value.trim();
  const category = document.getElementById('editGroupType').value;
  const currency = document.getElementById('editGroupCurrency').value;
  const photo = document.getElementById('editGroupPhoto').value.trim();
  const description = document.getElementById('editGroupDescription').value.trim();

  if (!title) {
    showError("Group title is required");
    return;
  }

  const payload = {
    title,
    category,
    currency,
    photo: photo || null,
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

    // Reload group info
    await loadGroupInfo();

  } catch (err) {
    console.error('Error updating group:', err);
    showError(err.message || 'Failed to update group');
  }
}

// ----------------------------
// Group Info
// ----------------------------
async function loadGroupInfo() {
  try {
    const url = new URL(window.location.href);
    const groupId = url.searchParams.get("id");

    if (!groupId) {
      showError("No group selected");
      return;
    }

    const res = await fetch(`${API_URL}/groups/${groupId}`, { headers: getHeaders() });
    if (!res.ok) {
      throw new Error("Failed to load group information");
    }

    currentGroup = await res.json();

    // Update group header
    document.getElementById("groupTitle").innerHTML = `
      <i class="bi bi-people-fill text-primary me-2"></i>
      ${currentGroup.title}
    `;

    document.getElementById("groupDescription").textContent =
      currentGroup.description || "No description available";

    document.getElementById("memberCount").innerHTML = `
      <i class="bi bi-person me-1"></i>${currentGroup.members_count || 0} members
    `;

    document.getElementById("groupCurrency").innerHTML = `
      <i class="bi bi-currency-exchange me-1"></i>${currentGroup.currency || 'USD'}
    `;

    // Update currency in expense modal
    const currencyDisplay = document.getElementById('currencyDisplay');
    if (currencyDisplay) {
      currencyDisplay.textContent = currentGroup.currency || 'USD';
    }




    // Update page title
    document.title = `${currentGroup.title} - Expenses`;

    // ✅ Hide/Show buttons based on group type
    const manageMembersBtn = document.getElementById("friendsAddMemberbtn");
    const balancesBtn = document.getElementById("balanceId");
    const leaveGroupBtn = document.getElementById("leaveGroupBtn");
    const editGroupBtn = document.getElementById("editGroupBtn");

    console.log("🔍 Debug: Group Type =", currentGroup.type);
    console.log("🔍 Debug: Buttons found?", { manageMembersBtn, balancesBtn, leaveGroupBtn });

    if (currentGroup.type === "Personal" || currentGroup.type === "Personal Expenses") {
      if (manageMembersBtn) manageMembersBtn.style.setProperty('display', 'none', 'important');
      if (balancesBtn) balancesBtn.style.setProperty('display', 'none', 'important');
      if (leaveGroupBtn) leaveGroupBtn.style.setProperty('display', 'none', 'important');

      // If it's the default Personal Expenses group, maybe hide edit too or restrict it?
      // For now, let's just hide the delete button in the edit modal (handled in group.js)
      // But we can also hide the edit button here if we want to be strict.
      // Let's keep edit open but maybe we should disable title edit?
      // For now, just hiding the main action buttons is enough.
    } else {
      if (manageMembersBtn) manageMembersBtn.style.display = "flex"; // Restore display
      if (balancesBtn) balancesBtn.style.display = "flex";
      if (leaveGroupBtn) leaveGroupBtn.style.display = "flex";
    }

    // ✅ Load dependent data after group info is ready
    // loadPayersForExpense(); // Removed - handled by initializeExpenseModal
    // loadMembersForExpense(); // Removed - handled by initializeExpenseModal

  } catch (err) {
    console.error("Error loading group info:", err);
    showError("Failed to load group information");
  }
}

// loadPayersForExpense removed - redundant

// Update wallets when payer changes
function updateWalletsForPayer() {
  const payerSelect = document.getElementById('addPayer') || document.getElementById('expensePayer');
  const walletSelect = document.getElementById('addWallet') || document.getElementById('expenseWallet');
  const walletSection = document.getElementById('walletSection') || document.getElementById('addWalletContainer');

  if (!payerSelect || !walletSelect) return;

  const selectedPayerId = payerSelect.value;

  if (!selectedPayerId) {
    // Hide wallet section if no payer selected (only if walletSection exists)
    if (walletSection) {
      walletSection.style.display = 'none';
    }
    walletSelect.innerHTML = '<option value="">No wallet selected</option>';
    return;
  }

  // Get current user
  fetchCurrentUser().then(currentUser => {
    if (currentUser && selectedPayerId === currentUser.id.toString()) {
      // Show wallet section only for current user (only if walletSection exists)
      if (walletSection) {
        walletSection.style.display = 'block';
      }

      // Filter wallets for the current user
      const currentUserWallets = userWallets.filter(wallet => wallet.user_id === currentUser.id);

      // Update wallet options
      walletSelect.innerHTML = '<option value="">No wallet selected</option>';

      currentUserWallets.forEach(wallet => {
        const option = document.createElement('option');
        option.value = wallet.id;
        option.textContent = `${wallet.name} (${wallet.balance.toFixed(2)} ${wallet.currency || 'MAD'})`;
        walletSelect.appendChild(option);
      });

      console.log(`✅ Updated wallets for current user:`, currentUserWallets.length);
    } else {
      // Hide wallet section for other users (only if walletSection exists)
      if (walletSection) {
        walletSection.style.display = 'none';
      }
      walletSelect.innerHTML = '<option value="">No wallet selected</option>';
      console.log(`✅ Hidden wallet section for other user: ${selectedPayerId}`);
    }
  }).catch(err => {
    console.error("❌ Error getting current user:", err);
    // Hide wallet section on error (only if walletSection exists)
    if (walletSection) {
      walletSection.style.display = 'none';
    }
  });
}

// loadMembersForExpense removed - redundant and caused infinite loop

// renderMembersForExpense removed - redundant

function selectAllMembers() {
  const checkboxes = document.querySelectorAll('#membersListForExpense input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
  updateExpensePreview();
}

function deselectAllMembers() {
  const checkboxes = document.querySelectorAll('#membersListForExpense input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  updateExpensePreview();
}

// updateExpensePreview removed - redundant

// -----------------------------
// Edit Group Functions
// -----------------------------
async function openEditGroupModalFromExpenses() {
  try {
    const url = new URL(window.location.href);
    const groupId = url.searchParams.get("id");

    if (!groupId) {
      showError("No group selected");
      return;
    }

    console.log("🔄 Opening edit modal for group:", groupId);

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
    document.getElementById("editGroupType").value = group.category || "Other";
    document.getElementById("editGroupOriginalType").value = group.type || "Other";
    document.getElementById("editGroupCurrency").value = group.currency || "MAD";
    document.getElementById("editGroupPhoto").value = group.photo || "";
    document.getElementById("editGroupDescription").value = group.description || "";

    // ✅ Hide/show and disable fields based on group type
    const titleInput = document.getElementById('editGroupTitle');
    const categoryContainer = document.getElementById('editGroupCategoryContainer');
    const categorySelect = document.getElementById('editGroupType');

    // Check if it's the default Personal Expenses group
    const isDefaultPersonalGroup = (group.type === 'Personal' || group.type === 'Personal Expenses') && group.title === 'Personal Expenses';

    if (group.type === 'Personal' || group.type === 'Personal Expenses') {
      // For ALL Personal groups: HIDE category field completely
      if (categoryContainer) {
        categoryContainer.style.display = 'none';
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
      if (categoryContainer) {
        categoryContainer.style.display = 'block';
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

    setTimeout(() => {
      try {
        const editGroupModal = new bootstrap.Modal(document.getElementById('editGroupModal'));
        editGroupModal.show();
      } catch (err) {
        console.error("Error showing modal:", err);
      }
    }, 100);

  } catch (err) {
    console.error("❌ Error loading group data:", err);
    showError("Failed to load group information");
  }
}

async function saveGroupChanges(event) {
  event.preventDefault();

  const groupId = document.getElementById("editGroupId").value;
  const newTitle = document.getElementById("editGroupTitle").value.trim();
  let newType = document.getElementById("editGroupType").value;
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

    // Refresh the group info and expenses
    await Promise.all([
      loadGroupInfo(),
      loadExpenses(true) // Reset pagination
    ]);

  } catch (err) {
    console.error("❌ Error updating group:", err);
    showError(err.message || "Failed to update group");
  }
}

// -----------------------------
// Settlement Functions
// -----------------------------

async function fetchSettlementsForGroup(groupId) {
  try {
    console.log("🔄 Fetching settlements for group:", groupId);
    const res = await fetch(`${API_URL}/settle/${groupId}/history`, {
      headers: getHeaders()
    });

    if (!res.ok) {
      console.warn("⚠️ Failed to fetch settlements:", res.status);
      return [];
    }

    const settlements = await res.json();
    // Filter out rejected settlements - only show accepted and pending in expenses page
    // (Rejected settlements still appear in settlement history on balance page)
    const filtered = settlements.filter(s => s.status !== 'rejected');
    console.log("✅ Settlements fetched:", filtered.length, "(rejected filtered out)");
    return filtered;
  } catch (err) {
    console.error("❌ Error fetching settlements:", err);
    return [];
  }
}

function renderSettlementDesktopTable(settlement, user, index) {
  const isFromUser = settlement.from_user_id === user.id;
  const isToUser = settlement.to_user_id === user.id;

  const tr = document.createElement("tr");
  tr.className = "fade-in settlement-row";
  tr.style.animationDelay = `${index * 0.1}s`;
  tr.style.backgroundColor = '#f8f9fa';
  tr.style.borderLeft = '4px solid #28a745';

  const settlementDate = new Date(settlement.created_at);
  const formattedDate = settlementDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  tr.innerHTML = `
  <td>
      <div class="d-flex align-items-center">
        <div class="me-3">
           
        </div>
        <div>
          <div class="fw-semibold text-success"> </div>
         
        </div>
      </div>
    </td>
    <td>
      <div class="d-flex align-items-center">
        <div class="me-3">
          <i class="bi bi-cash-coin text-success fs-5"></i>
        </div>
        <div>
          <div class="fw-semibold text-success">Settlement</div>
          <small class="text-muted">${formattedDate}</small>
        </div>
      </div>
    </td>
    <td>
      <span class="fw-bold text-success">${formatCurrency(settlement.amount, currentGroup?.currency || 'MAD')}</span>
    </td>
    <td>
      <div class="d-flex align-items-center">
        <div class="avatar rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-2" style="width:32px;height:32px;font-size:0.8rem;font-weight:bold;">
          ${(settlement.from_username || "U").split(" ").map(w => w[0]).join("").toUpperCase()}
        </div>
        <span class="fw-semibold">${escapeHtml(settlement.from_username || "Unknown")}</span>
      </div>
    </td>
    <td>
      ${getSettlementStatusBadge(settlement.status)}
    </td>
    <td>
      <span class="text-muted small">
        ${isFromUser ? `You paid ${escapeHtml(settlement.to_username || 'Unknown')}` :
      isToUser ? `${escapeHtml(settlement.from_username || 'Unknown')} paid you` :
        `${escapeHtml(settlement.from_username || 'Unknown')} paid ${escapeHtml(settlement.to_username || 'Unknown')}`}
      </span>
    </td>
    <td>
      <div class="d-flex gap-1">
        <button class="btn btn-sm btn-outline-success view-settlement-btn" data-settlement-id="${settlement.id}" title="View Details">
          <i class="bi bi-eye"></i>
        </button>
      </div>
    </td>
  `;

  return tr;
}

function renderSettlementMobileCard(settlement, user, index) {
  const isFromUser = settlement.from_user_id === user.id;
  const isToUser = settlement.to_user_id === user.id;

  const settlementDate = new Date(settlement.created_at);
  const month = settlementDate.toLocaleDateString('en-US', { month: 'short' });
  const day = settlementDate.getDate();

  const card = document.createElement("div");
  card.className = "settlement-item";
  card.style.cssText = `
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
    min-height: 50px;
    cursor: pointer;
    border-left: 4px solid #28a745;
  `;

  const description = isFromUser ?
    `You paid ${escapeHtml(settlement.to_username || 'Unknown')} ${formatCurrency(settlement.amount, currentGroup?.currency || 'MAD')}` :
    isToUser ?
      `${escapeHtml(settlement.from_username || 'Unknown')} paid you ${formatCurrency(settlement.amount, currentGroup?.currency || 'MAD')}` :
      `${escapeHtml(settlement.from_username || 'Unknown')} paid ${escapeHtml(settlement.to_username || 'Unknown')} ${formatCurrency(settlement.amount, currentGroup?.currency || 'MAD')}`;

  card.innerHTML = `
    <div style="display: flex; align-items: center; width: 100%;">
      <!-- Date Section -->
      <div style="display: flex; align-items: center; margin-right: 12px;">
        <div style="text-align: center; margin-right: 8px;">
          <div style="font-size: 11px; color: #666; line-height: 1;">${month}</div>
          <div style="font-size: 16px; color: #333; font-weight: 500; line-height: 1;">${day}</div>
        </div>
        <div style="width: 24px; height: 24px; background: #d4edda; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2">
            <rect x="2" y="6" width="20" height="12" rx="2"></rect>
            <circle cx="12" cy="12" r="2"></circle>
          </svg>
        </div>
      </div>
      
      <!-- Content Section -->
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 14px; color: #333; font-weight: 500; margin-bottom: 2px;">
          Settlement
        </div>
        <div style="font-size: 12px; color: #666;">
          ${description}
        </div>
      </div>
      
      <!-- Amount Section -->
      <div style="text-align: right;">
        <div style="font-size: 14px; color: #28a745; font-weight: 600;">
          ${formatCurrency(settlement.amount, currentGroup?.currency || 'MAD')}
        </div>
        <div style="font-size: 11px; color: #28a745;">
          ${getSettlementStatusBadge(settlement.status, true)}
        </div>
      </div>
    </div>
  `;

  card.addEventListener('click', () => showSettlementDetail(settlement.id));

  return card;
}

function showSettlementDetail(settlementId) {
  // Find settlement in current data
  const settlement = window.currentSettlements?.find(s => s.id === settlementId);
  if (!settlement) return;

  // Don't show rejected settlements
  if (settlement.status === 'rejected') {
    showError("This settlement was rejected and is no longer active.");
    return;
  }

  // Determine header color based on status
  const statusColors = {
    'accepted': 'bg-success',
    'pending': 'bg-warning',
    'rejected': 'bg-danger'
  };
  const headerColor = statusColors[settlement.status?.toLowerCase()] || 'bg-success';
  const headerTextColor = settlement.status?.toLowerCase() === 'pending' ? 'text-dark' : 'text-white';

  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header ${headerColor} ${headerTextColor}">
          <h5 class="modal-title">
            <i class="bi bi-cash-coin me-2"></i>Settlement Details
          </h5>
          <button type="button" class="btn-close ${settlement.status?.toLowerCase() === 'pending' ? '' : 'btn-close-white'}" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="row mb-3">
            <div class="col-6">
              <strong>From:</strong>
              <div class="d-flex align-items-center mt-1">
                <div class="avatar rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-2" style="width:32px;height:32px;font-size:0.8rem;font-weight:bold;">
                  ${(settlement.from_username || "U").split(" ").map(w => w[0]).join("").toUpperCase()}
                </div>
                <span>${escapeHtml(settlement.from_username || "Unknown")}</span>
              </div>
            </div>
            <div class="col-6">
              <strong>To:</strong>
              <div class="d-flex align-items-center mt-1">
                <div class="avatar rounded-circle bg-info text-white d-flex align-items-center justify-content-center me-2" style="width:32px;height:32px;font-size:0.8rem;font-weight:bold;">
                  ${(settlement.to_username || "U").split(" ").map(w => w[0]).join("").toUpperCase()}
                </div>
                <span>${escapeHtml(settlement.to_username || "Unknown")}</span>
              </div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col-6">
              <strong>Amount:</strong>
              <div class="h5 text-success mt-1">${formatCurrency(settlement.amount, currentGroup?.currency || 'MAD')}</div>
            </div>
            <div class="col-6">
              <strong>Status:</strong>
              <div class="mt-1">${getSettlementStatusBadge(settlement.status)}</div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col-12">
              <strong>Date:</strong>
              <div class="mt-1">${new Date(settlement.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}</div>
            </div>
          </div>
          ${settlement.message ? `
          <div class="row mb-3">
            <div class="col-12">
              <strong>Message:</strong>
              <div class="mt-1 text-muted">${settlement.message}</div>
            </div>
          </div>
          ` : ''}
          ${settlement.rejected_reason ? `
          <div class="row mb-3">
            <div class="col-12">
              <strong>Rejection Reason:</strong>
              <div class="mt-1 text-danger">${settlement.rejected_reason}</div>
            </div>
          </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          ${getSettlementActionButtons(settlement)}
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();

  // Store modal reference for closing after actions
  modal.bsModal = bsModal;

  modal.addEventListener('hidden.bs.modal', () => {
    modal.remove();
  });
}

// -----------------------------
// Accept/Reject Settlement from Expenses Page
// -----------------------------
async function acceptSettlementFromExpenses(settlementId, fromUsername) {
  if (!confirm(`Are you sure you want to accept this settlement from ${fromUsername}?`)) {
    return;
  }

  try {
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
      throw new Error("API configuration not loaded. Please refresh the page.");
    }

    const url = `${API_URL}/settle/${settlementId}/accept`;
    console.log("🌐 POST to:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to accept settlement");
    }

    showSuccess("Settlement accepted successfully!");

    // Close all modals
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(m => {
      const bsModal = bootstrap.Modal.getInstance(m);
      if (bsModal) bsModal.hide();
    });

    // Reload expenses to refresh the list (reset pagination)
    await loadExpenses(true);
  } catch (err) {
    console.error("Error accepting settlement:", err);
    showError(err.message || "Failed to accept settlement");
  }
}

async function rejectSettlementFromExpenses(settlementId, fromUsername) {
  const reason = prompt(`Please provide a reason for rejecting this settlement from ${fromUsername} (optional):`);

  if (reason === null) {
    return; // User cancelled
  }

  try {
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
      throw new Error("API configuration not loaded. Please refresh the page.");
    }

    const url = `${API_URL}/settle/${settlementId}/reject`;
    console.log("🌐 POST to:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        reason: reason || null
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to reject settlement");
    }

    showSuccess("Settlement rejected.");

    // Close all modals
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(m => {
      const bsModal = bootstrap.Modal.getInstance(m);
      if (bsModal) bsModal.hide();
    });

    // Reload expenses to refresh the list (rejected will be filtered out, reset pagination)
    await loadExpenses(true);
  } catch (err) {
    console.error("Error rejecting settlement:", err);
    showError(err.message || "Failed to reject settlement");
  }
}

// -----------------------------
// Utility Functions
// -----------------------------
function showError(message) {
  // Create a toast notification
  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-white bg-danger border-0 position-fixed top-0 end-0 m-3';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-exclamation-triangle me-2"></i>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  document.body.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  // Remove toast element after it's hidden
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-white bg-success border-0 position-fixed top-0 end-0 m-3';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-check-circle me-2"></i>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  document.body.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

function getSettlementActionButtons(settlement) {
  if (!settlement || !currentUser) return '';

  const isToCurrentUser = settlement.to_user_id === currentUser.id;
  const isPending = settlement.status === 'pending';

  // Only show accept/reject buttons if user is recipient and settlement is pending
  if (isToCurrentUser && isPending) {
    const escapedUsername = escapeHtml(settlement.from_username || 'Unknown');
    return `
      <button type="button" class="btn btn-success me-2 accept-settlement-expense-btn" data-settlement-id="${settlement.id}" data-from-username="${escapedUsername}">
        <i class="bi bi-check-circle me-1"></i>Accept
      </button>
      <button type="button" class="btn btn-danger me-2 reject-settlement-expense-btn" data-settlement-id="${settlement.id}" data-from-username="${escapedUsername}">
        <i class="bi bi-x-circle me-1"></i>Reject
      </button>
    `;
  }

  return '';
}

function getSettlementStatusBadge(status, textOnly = false) {
  if (!status) return textOnly ? 'Unknown' : '<span class="badge bg-secondary">Unknown</span>';

  const statusLower = status.toLowerCase();

  if (statusLower === 'accepted') {
    return textOnly
      ? 'Accepted'
      : '<span class="badge bg-success fs-6"><i class="bi bi-check-circle me-1"></i>Accepted</span>';
  } else if (statusLower === 'pending') {
    return textOnly
      ? 'Pending'
      : '<span class="badge bg-warning text-dark fs-6"><i class="bi bi-clock me-1"></i>Pending</span>';
  } else if (statusLower === 'rejected') {
    return textOnly
      ? 'Rejected'
      : '<span class="badge bg-danger fs-6"><i class="bi bi-x-circle me-1"></i>Rejected</span>';
  }

  return textOnly ? status : `<span class="badge bg-secondary">${status}</span>`;
}

function formatCurrency(amount, currency = 'MAD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getRelativeTime(dateString) {
  // Parse the date string - JavaScript handles ISO strings with timezone correctly
  const date = new Date(dateString);
  const now = new Date();

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error("Invalid date string:", dateString);
    return formatDate(dateString);
  }

  // Calculate difference in milliseconds
  // Both Date objects are in the same timezone context (JavaScript Date is timezone-aware)
  // getTime() returns milliseconds since epoch (UTC), so comparison is correct
  const diffMs = now.getTime() - date.getTime();

  // Debug logging for recent expenses (within 2 hours)
  if (Math.abs(diffMs) < 7200000) {
    const dateLocal = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const nowLocal = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));

    console.log("🕐 Time calculation:", {
      dateString: dateString,
      dateParsed: date.toString(),
      dateLocalTime: date.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      dateUTC: date.toISOString(),
      nowLocalTime: now.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      nowUTC: now.toISOString(),
      diffMs: diffMs,
      diffSeconds: Math.floor(diffMs / 1000),
      diffMinutes: Math.floor(diffMs / (1000 * 60)),
      diffHours: Math.floor(diffMs / (1000 * 60 * 60)),
      timezoneOffset: date.getTimezoneOffset()
    });
  }

  // Handle negative differences (future dates) - shouldn't happen but just in case
  if (diffMs < 0) {
    console.warn("⚠️ Future date detected:", dateString);
    return 'Just now';
  }

  const diffInSeconds = Math.floor(diffMs / 1000);
  const diffInMinutes = Math.floor(diffMs / (1000 * 60));
  const diffInHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Show "Just now" for expenses less than 1 minute old
  if (diffInSeconds < 60) return 'Just now';

  // Show minutes for expenses less than 1 hour old
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  // Show hours for expenses less than 24 hours old
  if (diffInHours < 24) return `${diffInHours}h ago`;

  // Show days for expenses less than 7 days old
  if (diffInDays < 7) return `${diffInDays}d ago`;

  // Otherwise show formatted date
  return formatDate(dateString);
}
async function loadWallets() {
  try {
    const res = await fetch(`${API_URL}/wallets`, { headers: getHeaders() });
    if (!res.ok) return [];
    const wallets = await res.json();

    // Store wallets globally for filtering by payer
    userWallets = wallets;

    // Populate wallet dropdown
    const addWalletSelectNew = document.getElementById('addWallet');

    if (addWalletSelectNew) {
      addWalletSelectNew.innerHTML = '<option value="">-- Select Wallet --</option>';
      userWallets.forEach(wallet => {
        const option = document.createElement('option');
        option.value = wallet.id;
        option.textContent = `${wallet.name} (${wallet.balance.toFixed(2)} ${wallet.currency || 'MAD'})`;
        addWalletSelectNew.appendChild(option);
      });
    }

    // Populate edit wallet select
    const editWalletSelect = document.getElementById('editWallet');
    if (editWalletSelect) {
      editWalletSelect.innerHTML = '<option value="">No wallet selected</option>';
      wallets.forEach(wallet => {
        const option = document.createElement('option');
        option.value = wallet.id;
        option.textContent = `${wallet.name} (${wallet.balance.toFixed(2)} ${wallet.currency || 'MAD'})`;
        editWalletSelect.appendChild(option);
      });
    }

    console.log("✅ Wallets loaded:", wallets.length);
    return wallets;
  } catch (err) {
    console.error("❌ Error loading wallets:", err);
    showError("Failed to load wallets");
    return [];
  }
}


// -----------------------------
// Fetch expenses for group (with pagination)
// -----------------------------
async function fetchExpensesForGroup(groupId, limit = 20, offset = 0) {
  if (!groupId) return { expenses: [], total: 0, has_more: false };

  // Convert offset to page number (backend expects page-based pagination)
  const page = Math.floor(offset / limit) + 1;
  // Add cache-busting parameter to avoid 304 responses
  const timestamp = Date.now();
  const url = `${API_URL}/expenses/${groupId}?limit=${limit}&page=${page}&_t=${timestamp}`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    console.error("Failed to fetch expenses:", res.status);
    return { expenses: [], total: 0, has_more: false };
  }

  const response = await res.json();
  console.log("🔍 Raw API response:", response);

  // Handle backend response format: {success: true, data: {expenses, totalPages, currentPage, totalExpenses}}
  if (response.success && response.data) {
    const { expenses, totalPages, currentPage, totalExpenses } = response.data;
    console.log("📊 Parsed data:", { expenses: expenses?.length, totalPages, currentPage, totalExpenses });
    return {
      expenses: expenses || [],
      total: totalExpenses || 0,
      has_more: currentPage < totalPages
    };
  }

  console.warn("⚠️ Unexpected response format:", response);
  // Fallback for unexpected format
  return { expenses: [], total: 0, has_more: false };
}

// -----------------------------
// Load and render expenses (initial load or reset)
// -----------------------------
async function loadExpenses(reset = false) {
  try {
    console.log("🔄 Loading expenses...", reset ? "(reset)" : "");
    const url = new URL(window.location.href);
    const groupId = url.searchParams.get("id");
    console.log("📁 Group ID:", groupId);

    if (!groupId) {
      showError("No group selected");
      return;
    }

    // Get current user
    const user = await fetchCurrentUser();
    console.log("👤 Current user:", user);

    if (!user) {
      showError("User not authenticated");
      return;
    }

    // Reset pagination if needed
    if (reset) {
      expensesPagination.currentOffset = 0;
      expensesPagination.hasMore = true;
      expensesPagination.isLoading = false;
      allExpenses = [];
    }

    // Prevent duplicate requests
    if (expensesPagination.isLoading) {
      console.log("⏳ Already loading, skipping...");
      return;
    }

    // Check if there are more expenses to load
    if (!expensesPagination.hasMore && !reset) {
      console.log("✅ All expenses loaded");
      return;
    }

    expensesPagination.isLoading = true;

    // Show loading state only on initial load
    if (expensesPagination.currentOffset === 0) {
      showLoadingState();
    } else {
      showLoadMoreIndicator();
    }

    // Fetch expenses with pagination
    const expensesData = await fetchExpensesForGroup(
      groupId,
      expensesPagination.pageSize,
      expensesPagination.currentOffset
    );

    console.log("💰 Expenses loaded:", expensesData.expenses.length, "items");
    console.log("📊 Total expenses:", expensesData.total);
    console.log("📄 Has more:", expensesData.has_more);

    // Fetch settlements (only once, at initial load)
    let settlements = [];
    const isInitialLoad = expensesPagination.currentOffset === 0;
    if (isInitialLoad) {
      settlements = await fetchSettlementsForGroup(groupId);
      console.log("💰 Settlements loaded:", settlements.length, "items");
      window.currentSettlements = settlements;
    } else {
      settlements = window.currentSettlements || [];
    }

    // Add new expenses with type marker
    const newExpenses = expensesData.expenses.map(expense => ({
      ...expense,
      itemType: 'expense'
    }));

    // Merge with existing expenses
    allExpenses = [...allExpenses, ...newExpenses];

    // Add settlements with type marker (only on initial load)
    if (isInitialLoad) {
      settlements.forEach(settlement => {
        allExpenses.push({ ...settlement, itemType: 'settlement' });
      });
    }

    // Update pagination state after merging
    expensesPagination.totalExpenses = expensesData.total;
    expensesPagination.hasMore = expensesData.has_more;
    // Update offset based on number of expenses loaded (not including settlements)
    expensesPagination.currentOffset += expensesData.expenses.length;

    // Sort by date (newest first)
    allExpenses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log("📋 Total items to render:", allExpenses.length);

    // Render all expenses
    if (window.innerWidth >= 992) {
      renderDesktopTable(allExpenses, user, currentGroup);
    } else {
      renderMobileCards(allExpenses, user, currentGroup);
    }

    // Hide loading indicators
    hideLoadMoreIndicator();

    if (isInitialLoad) {
      await checkIfAllSettled();
    }
    attachViewButtonEvents();

    expensesPagination.isLoading = false;

  } catch (err) {
    console.error("Error loading expenses:", err);
    showError("Failed to load expenses");
    expensesPagination.isLoading = false;
    hideLoadMoreIndicator();

    if (expensesPagination.currentOffset === 0) {
      showEmptyState();
    }
  }
}

// -----------------------------
// Load more expenses (for infinite scroll)
// -----------------------------
async function loadMoreExpenses() {
  if (expensesPagination.isLoading || !expensesPagination.hasMore) {
    return;
  }
  await loadExpenses(false);
}

// -----------------------------
// Handle scroll for infinite loading
// -----------------------------
function handleScroll() {
  // Don't load if already loading or no more items
  if (expensesPagination.isLoading || !expensesPagination.hasMore) {
    return;
  }

  // Calculate scroll position
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  // Load more when user is 200px from bottom
  const threshold = 200;
  const distanceFromBottom = documentHeight - (scrollTop + windowHeight);

  if (distanceFromBottom < threshold) {
    console.log("📜 Near bottom, loading more expenses...");
    loadMoreExpenses();
  }
}

function showLoadingState() {
  const table = document.getElementById("expensesTable");
  const mobileList = document.getElementById("expensesList");

  if (table) {
    table.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <div class="d-flex align-items-center justify-content-center">
            <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
            Loading expenses...
          </div>
        </td>
      </tr>
    `;
  }

  if (mobileList) {
    mobileList.innerHTML = `
      <div class="text-center text-muted py-4">
        <div class="d-flex align-items-center justify-content-center">
          <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
          Loading expenses...
        </div>
      </div>
    `;
  }
}

function showEmptyState() {
  const table = document.getElementById("expensesTable");
  const mobileList = document.getElementById("expensesList");

  if (table) {
    table.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-5">
          <div class="py-4">
            <i class="bi bi-receipt" style="font-size: 3rem; opacity: 0.3;"></i>
            <h5 class="mt-3 mb-2">No expenses yet</h5>
            <p class="text-muted mb-0">Start by adding your first expense!</p>
          </div>
        </td>
      </tr>
    `;
  }

  if (mobileList) {
    mobileList.innerHTML = `
      <div class="text-center text-muted py-5">
        <div class="py-4">
          <i class="bi bi-receipt" style="font-size: 3rem; opacity: 0.3;"></i>
          <h5 class="mt-3 mb-2">No expenses yet</h5>
          <p class="text-muted mb-0">Start by adding your first expense!</p>
        </div>
      </div>
    `;
  }
}

// -----------------------------
// Loading indicators for pagination
// -----------------------------
function showLoadMoreIndicator() {
  // Remove existing indicator if any
  hideLoadMoreIndicator();

  const table = document.getElementById("expensesTable");
  const mobileList = document.getElementById("expensesList");

  // Add loading row to table
  if (table) {
    const loadingRow = document.createElement("tr");
    loadingRow.id = "loadMoreIndicator";
    loadingRow.innerHTML = `
      <td colspan="7" class="text-center py-3">
        <div class="d-flex align-items-center justify-content-center">
          <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
          <span class="text-muted">Loading more expenses...</span>
        </div>
      </td>
    `;
    table.appendChild(loadingRow);
  }

  // Add loading card to mobile list
  if (mobileList) {
    const loadingCard = document.createElement("div");
    loadingCard.id = "loadMoreIndicator";
    loadingCard.className = "text-center py-3";
    loadingCard.innerHTML = `
      <div class="d-flex align-items-center justify-content-center">
        <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
        <span class="text-muted">Loading more expenses...</span>
      </div>
    `;
    mobileList.appendChild(loadingCard);
  }
}

function hideLoadMoreIndicator() {
  const indicator = document.getElementById("loadMoreIndicator");
  if (indicator) {
    indicator.remove();
  }
}

function renderDesktopTable(items, user, currentGroup = null) {
  const table = document.getElementById("expensesTable");
  if (!table) return;

  table.innerHTML = "";

  if (!items.length) {
    showEmptyState();
    return;
  }

  items.forEach((item, index) => {
    let tr;

    if (item.itemType === 'settlement') {
      tr = renderSettlementDesktopTable(item, user, index);
    } else {
      // Original expense rendering logic
      const expense = item;
      // Check if user is payer OR group owner
      const isPayer = expense.payer_id === user.id;
      const isGroupOwner = currentGroup && currentGroup.owner_id === user.id;
      const isOwner = isPayer || isGroupOwner;
      const userSplit = expense.splits?.find(s => (s.userId?._id || s.userId || s.user_id) === user.id);
      const userShare = userSplit ? (userSplit.shareAmount || userSplit.share_amount) : 0;

      // Calculate if user lent money (paid more than share) or owes money (paid less than share)
      // Note: userPaid should only be based on isPayer, not isOwner (group owner didn't pay)
      const userPaid = isPayer ? expense.amount : 0;
      const userOwes = userShare;
      const netAmount = userPaid - userOwes;

      // Determine color and text based on netAmount (same logic as mobile view)
      let shareColor, shareText, shareLabel;
      if (netAmount > 0) {
        shareColor = "#28a745"; // Green for "you lent"
        shareText = "you lent";
        shareLabel = Number(netAmount).toFixed(2);
      } else if (netAmount < 0) {
        shareColor = "#dc3545"; // Red for "you owe"
        shareText = "you owe";
        shareLabel = Number(Math.abs(netAmount)).toFixed(2);
      } else {
        shareColor = "#6c757d"; // Gray for "even"
        shareText = "even";
        shareLabel = Number(userShare).toFixed(2);
      }

      tr = document.createElement("tr");
      tr.className = "fade-in";
      tr.style.animationDelay = `${index * 0.1}s`;

      tr.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <div class="me-3">
              <i class="bi bi-receipt text-primary fs-5"></i>
            </div>
            <div>
              <div class="fw-semibold">${expense.description}</div>
              ${expense.category ? `<small class="text-muted">${expense.category}</small>` : ''}
            </div>
          </div>
        </td>
        <td>
          <span class="fw-bold text-primary">${formatCurrency(expense.amount, expense.currency)}</span>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar rounded-circle bg-info text-white d-flex align-items-center justify-content-center me-2" style="width:32px;height:32px;font-size:0.8rem;font-weight:bold;">
              ${(expense.payer_username || "U").split(" ").map(w => w[0]).join("").toUpperCase()}
            </div>
            <span class="fw-semibold">${expense.payer_username || "Unknown"}</span>
          </div>
        </td>
        <td>
          <div style="text-align: center;">
            <div style="font-size: 11px; color: ${shareColor}; margin-bottom: 2px;">${shareText}</div>
            <div style="font-size: 14px; color: ${shareColor}; font-weight: 500;">${shareLabel} ${expense.currency}</div>
          </div>
        </td>
        <td>
          <span class="text-muted small">
            ${expense.wallet_name ? `<i class="bi bi-wallet me-1"></i>${expense.wallet_name}` : '<span class="text-muted">—</span>'}
          </span>
        </td>
        <td>
          <div>
            <div class="fw-semibold">${getRelativeTime(expense.created_at)}</div>
            <small class="text-muted">${formatDate(expense.created_at)}</small>
          </div>
        </td>
        <td>
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-info view-btn" data-id="${expense.id}" title="View details">
              <i class="bi bi-eye"></i>
                </button>
            <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${expense.id}" ${!isOwner ? "disabled" : ""} title="Edit expense">
              <i class="bi bi-pencil"></i>
                </button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${expense.id}" ${!isOwner ? "disabled" : ""} title="Delete expense">
              <i class="bi bi-trash"></i>
                </button>
          </div>
        </td>
      `;
    }

    table.appendChild(tr);
  });
}

function renderMobileCards(items, user, currentGroup = null) {
  const container = document.getElementById("expensesList");
  if (!container) return;

  container.innerHTML = "";

  if (!items.length) {
    showEmptyState();
    return;
  }

  items.forEach((item, index) => {
    let card;

    if (item.itemType === 'settlement') {
      card = renderSettlementMobileCard(item, user, index);
    } else {
      // Original expense rendering logic
      const expense = item;
      // Check if user is payer OR group owner
      const isPayer = expense.payer_id === user.id;
      const isGroupOwner = currentGroup && currentGroup.owner_id === user.id;
      const isOwner = isPayer || isGroupOwner;
      const userSplit = expense.splits?.find(s => (s.userId?._id || s.userId || s.user_id) === user.id);
      const userShare = userSplit ? (userSplit.shareAmount || userSplit.share_amount) : 0;

      // Calculate if user lent money (paid more than share) or owes money (paid less than share)
      // Note: userPaid should only be based on isPayer, not isOwner (group owner didn't pay)
      const userPaid = isPayer ? expense.amount : 0;
      const userOwes = userShare;
      const netAmount = userPaid - userOwes;

      // Format date like the image
      const expenseDate = new Date(expense.created_at);
      const month = expenseDate.toLocaleDateString('en-US', { month: 'short' });
      const day = expenseDate.getDate();

      card = document.createElement("div");
      card.className = "expense-item";
      card.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
        background: white;
        min-height: 50px;
        cursor: pointer;
      `;

      card.innerHTML = `
        <div style="display: flex; align-items: center; width: 100%;">
          <!-- Date Section -->
          <div style="display: flex; align-items: center; margin-right: 12px;">
            <div style="text-align: center; margin-right: 8px;">
              <div style="font-size: 11px; color: #666; line-height: 1;">${month}</div>
              <div style="font-size: 16px; color: #333; font-weight: 500; line-height: 1;">${day}</div>
                </div>
            <div style="width: 24px; height: 24px; background: #f5f5f5; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
              </svg>
                </div>
                </div>
          
          <!-- Description and Amount -->
          <div style="flex: 1; margin-right: 12px;">
            <div style="font-size: 14px; color: #333; font-weight: 500; margin-bottom: 2px;">${expense.description}</div>
            <div style="font-size: 12px; color: #666;">${isPayer ? `You paid` : `${expense.payer_username || 'Someone'} paid`} ${Number(expense.amount).toFixed(2)} ${expense.currency}</div>
              </div>
          
          <!-- Lent/Owed Amount -->
          <div style="text-align: right;">
            ${netAmount > 0 ?
          `<div style="font-size: 11px; color: #28a745; margin-bottom: 2px;">you lent</div>
               <div style="font-size: 14px; color: #28a745; font-weight: 500;">${Number(netAmount).toFixed(2)} ${expense.currency}</div>` :
          netAmount < 0 ?
            `<div style="font-size: 11px; color: #dc3545; margin-bottom: 2px;">you owe</div>
               <div style="font-size: 14px; color: #dc3545; font-weight: 500;">${Number(Math.abs(netAmount)).toFixed(2)} ${expense.currency}</div>` :
            `<div style="font-size: 11px; color: #6c757d; margin-bottom: 2px;">even</div>
               <div style="font-size: 14px; color: #6c757d; font-weight: 500;">${Number(userShare).toFixed(2)} ${expense.currency}</div>`
        }
          </div>
              </div>
            `;

      // Add click handler for viewing details
      card.addEventListener('click', () => {
        viewExpenseDetails(expense.id);
      });
    }

    container.appendChild(card);
  });
}

// -----------------------------
// Expense Detail View
// -----------------------------
async function viewExpenseDetails(expenseId) {
  try {
    console.log("🔍 Viewing expense details for ID:", expenseId);

    // Find the expense in our loaded data
    const expense = allExpenses.find(e => e.id === expenseId);
    if (!expense) {
      showError("Expense not found");
      return;
    }

    // Get current user
    const user = await fetchCurrentUser();
    if (!user) {
      showError("User not authenticated");
      return;
    }

    // Create and show the detail modal
    showExpenseDetailModal(expense, user);

  } catch (err) {
    console.error("❌ Error viewing expense details:", err);
    showError("Failed to load expense details");
  }
}

function showExpenseDetailModal(expense, user) {
  // Remove existing modal if any
  const existingModal = document.getElementById('expenseDetailModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Calculate splits and amounts
  // Check if user is payer OR group owner
  const isPayer = expense.payer_id === user.id;
  const isGroupOwner = currentGroup && currentGroup.owner_id === user.id;
  const isOwner = isPayer || isGroupOwner; // Can edit/delete if payer OR group owner
  const userSplit = expense.splits?.find(s => s.user_id === user.id);
  const userShare = userSplit ? userSplit.share_amount : 0;
  const userPaid = isPayer ? expense.amount : 0; // Only payer actually paid
  const userOwes = userShare;
  const netAmount = userPaid - userOwes;

  // Format dates
  const createdDate = new Date(expense.created_at);
  const updatedDate = new Date(expense.updated_at);

  // Create modal HTML
  const modalHTML = `
    <div class="modal fade" id="expenseDetailModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <!-- Top Action Bar -->
          <div class="modal-header bg-light border-bottom">
            <div class="d-flex justify-content-between align-items-center w-100">
              <button type="button" class="btn btn-link p-0" data-bs-dismiss="modal">
                <i class="bi bi-arrow-left fs-4"></i>
              </button>
              <div class="d-flex align-items-center">
                <button class="btn btn-link p-1 me-2" title="More options">
                  <i class="bi bi-file-earmark-down fs-5"></i>
                </button>
                <button class="btn btn-link p-1 me-2" title="Add photo">
                  <i class="bi bi-camera fs-5"></i>
                </button>
                <button class="btn btn-link p-1 me-2 delete-expense-btn" data-id="${expense.id}" ${!isOwner ? "disabled" : ""} title="Delete">
                  <i class="bi bi-trash fs-5 text-danger"></i>
                </button>
                <button class="btn btn-link p-1 edit-expense-btn" data-id="${expense.id}" ${!isOwner ? "disabled" : ""} title="Edit">
                  <i class="bi bi-pencil fs-5 text-primary"></i>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Expense Details -->
          <div class="modal-body p-0">
            <!-- Main Info -->
            <div class="p-4 border-bottom">
              <h4 class="mb-2">${expense.description}</h4>
              <div class="display-6 fw-bold text-primary mb-3">${Number(expense.amount).toFixed(2)} ${expense.currency}</div>
              
              <div class="text-muted small mb-2">
                <div>Added by ${escapeHtml(expense.added_by_username || "Unknown")} on ${createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div>Updated by ${escapeHtml(expense.added_by_username || "Unknown")} on ${updatedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
            
            <!-- Split Breakdown -->
            <div class="p-4 border-bottom">
              <div class="d-flex align-items-start mb-3">
                <div class="me-3">
                  <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                    <i class="bi bi-person-fill"></i>
                  </div>
                </div>
                <div class="flex-grow-1">
                  <div class="fw-bold">${isOwner ? `You paid ${Number(expense.amount).toFixed(2)} ${expense.currency}` : `${expense.payer_username || 'Someone'} paid ${Number(expense.amount).toFixed(2)} ${expense.currency}`}</div>
                  ${userOwes > 0 ? `<div class="text-danger">You owe ${Number(userOwes).toFixed(2)} ${expense.currency}</div>` : ''}
                </div>
              </div>
              
              <!-- Other participants -->
              ${expense.splits?.filter(s => s.user_id !== user.id).map(split => `
                <div class="d-flex align-items-center mb-2">
                  <div class="me-3">
                    <div class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                      <i class="bi bi-person"></i>
                    </div>
                  </div>
                  <div class="flex-grow-1">
                    <div class="fw-bold">${split.username} owes ${Number(split.share_amount).toFixed(2)} ${expense.currency}</div>
                  </div>
                </div>
              `).join('') || ''}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Show modal
  setTimeout(() => {
    try {
      const modal = new bootstrap.Modal(document.getElementById('expenseDetailModal'));
      modal.show();

      // Clean up modal when hidden
      document.getElementById('expenseDetailModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
      });
    } catch (err) {
      console.error("Error showing expense detail modal:", err);
    }
  }, 100);
}

// -----------------------------
// Handle Edit Expense
// -----------------------------
async function handleEditExpense(expenseId) {
  try {
    if (!expenseId) {
      console.error("No expense ID provided");
      showError("Invalid expense ID");
      return;
    }
    
    console.log("📝 Editing expense:", expenseId);

    // Find expense locally first
    let expense = allExpenses.find(e => e.id === expenseId || e.id === String(expenseId) || String(e.id) === String(expenseId));

    if (!expense) {
      // Try to fetch it if not found in local list
      try {
        const res = await fetch(`${API_URL}/expenses/exp/${expenseId}`, { headers: getHeaders() });
        if (res.ok) {
          expense = await res.json();
        } else {
          const error = await res.json().catch(() => ({ detail: "Failed to fetch expense" }));
          showError(error?.detail || "Expense not found");
          return;
        }
      } catch (e) {
        console.error("Error fetching expense:", e);
        showError("Failed to load expense details");
        return;
      }
    }

    if (!expense) {
      showError("Expense not found");
      return;
    }

    openEditExpenseModalWithData(expense);
  } catch (err) {
    console.error("Error handling edit expense:", err);
    showError("Failed to open edit modal: " + err.message);
  }
}

// Make handleEditExpense globally accessible
window.handleEditExpense = handleEditExpense;

async function openEditExpenseModalWithData(expense) {
  try {
    const modal = document.getElementById('editExpenseModal');
    if (!modal) return;

    // Set simple fields
    const idField = document.getElementById('editExpenseId');
    if (idField) idField.value = expense.id;

    const descField = document.getElementById('editDescription');
    if (descField) descField.value = expense.description;

    const amountField = document.getElementById('editAmount');
    if (amountField) amountField.value = parseFloat(expense.amount);

    // Date
    const dateField = document.getElementById('editDate');
    if (dateField && expense.created_at) {
      const dateObj = new Date(expense.created_at);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      dateField.value = `${year}-${month}-${day}`;
    }

    const catField = document.getElementById('editCategory');
    if (catField) catField.value = expense.category || '';

    const noteField = document.getElementById('editNote');
    if (noteField) noteField.value = expense.note || '';

    // Load wallets for dropdown
    const wallets = await loadWallets();
    const walletSelect = document.getElementById('editWallet');
    if (walletSelect) {
      walletSelect.innerHTML = '<option value="">No wallet selected</option>';
      wallets.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w._id || w.id;
        opt.textContent = w.name;
        walletSelect.appendChild(opt);
      });
      if (expense.wallet_id) {
        walletSelect.value = expense.wallet_id;
      } else if (expense.walletId) {
        walletSelect.value = expense.walletId._id || expense.walletId;
      }
    }

    // Populate split section logic
    const members = await fetchMembers();
    const currentSplits = expense.splits || [];
    const splitType = expense.splitType || 'equal';

    // Set split type radio
    const radio = document.querySelector(`input[name="splitType"][value="${splitType}"]`);
    if (radio) radio.checked = true;

    // Populate Equal Split Section
    const equalContainer = document.getElementById('equalSplitMembers');
    if (equalContainer) {
      equalContainer.innerHTML = '';
      members.forEach(m => {
        // Check if this member is in current splits
        const isSelected = currentSplits.some(s => (s.userId?._id || s.userId || s.user_id) === m.user_id);

        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
          <input class="form-check-input" type="checkbox" value="${m.user_id}" id="edit_split_equal_${m.user_id}" ${isSelected ? 'checked' : ''}>
          <label class="form-check-label" for="edit_split_equal_${m.user_id}">
            ${m.username}
          </label>
        `;
        equalContainer.appendChild(div);
      });
    }

    // Toggle views
    ['equal', 'percentage', 'custom'].forEach(type => {
      const view = document.getElementById(`${type}SplitView`);
      if (view) {
        view.classList.toggle('d-none', type !== splitType);
        view.classList.toggle('d-flex', type === splitType);
      }
    });

    // Handle Delete Button
    const deleteBtn = document.getElementById('deleteExpenseBtn');
    if (deleteBtn) {
      deleteBtn.onclick = () => deleteExpense(expense.id);
    }

    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

  } catch (err) {
    console.error("Error opening edit modal with data:", err);
    showError("Failed to populate edit form");
  }
}

async function submitEditExpense() {
  try {
    const expenseId = document.getElementById('editExpenseId').value;
    const description = document.getElementById('editDescription').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const date = document.getElementById('editDate').value;
    const category = document.getElementById('editCategory').value;
    const walletId = document.getElementById('editWallet').value;
    const note = document.getElementById('editNote').value;
    const splitType = document.querySelector('input[name="splitType"]:checked').value;

    if (!description || !amount || !date) {
      return showError("Please fill in required fields");
    }

    let splits = [];
    if (splitType === 'equal') {
      const checked = document.querySelectorAll('#equalSplitMembers input:checked');
      const ids = Array.from(checked).map(c => c.value);
      if (ids.length === 0) return showError("Select at least one member");
      const share = amount / ids.length;
      // Backend expects userId and shareAmount (camelCase)
      splits = ids.map(id => ({ userId: id, shareAmount: share }));
    } else if (splitType === 'percentage') {
      const percentageInputs = document.querySelectorAll('#percentageSplitMembers input[type="number"]');
      percentageInputs.forEach(input => {
        const userId = input.dataset.userId || input.closest('[data-user-id]')?.dataset.userId;
        const percentage = parseFloat(input.value) || 0;
        if (userId && percentage > 0) {
          const shareAmount = (amount * percentage) / 100;
          splits.push({ userId, shareAmount });
        }
      });
    } else if (splitType === 'custom') {
      const customInputs = document.querySelectorAll('#customSplitMembers input[type="number"]');
      customInputs.forEach(input => {
        const userId = input.dataset.userId || input.closest('[data-user-id]')?.dataset.userId;
        const shareAmount = parseFloat(input.value) || 0;
        if (userId && shareAmount > 0) {
          splits.push({ userId, shareAmount });
        }
      });
    }

    // Validate splits total matches amount (allow small rounding differences)
    if (splits.length > 0) {
      const totalSplit = splits.reduce((sum, s) => sum + (s.shareAmount || 0), 0);
      const difference = Math.abs(amount - totalSplit);
      if (difference > 0.01) {
        return showError(`Split amounts (${totalSplit.toFixed(2)}) must equal expense amount (${amount.toFixed(2)})`);
      }
    }

    // Backend expects walletId (camelCase), not wallet_id
    const payload = {
      description,
      amount,
      category,
      walletId: walletId || null,
      note: note || null,
      splitType,
      splits: splits.length > 0 ? splits : undefined
    };

    console.log("📤 Sending update payload:", payload);
    
    const res = await fetch(`${API_URL}/expenses/${expenseId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = "Failed to update expense";
      
      try {
        const err = JSON.parse(errorText);
        console.error("❌ Full error response:", err);
        
        // Handle validation errors from Joi
        if (err.errors && Array.isArray(err.errors)) {
          errorMessage = err.errors.map(e => `${e.field || ''}: ${e.message || ''}`).join('; ');
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.detail) {
          // Handle FastAPI-style errors
          if (Array.isArray(err.detail)) {
            errorMessage = err.detail.map(e => `${e.loc?.join('.') || ''}: ${e.msg}`).join('; ');
          } else {
            errorMessage = err.detail;
          }
        }
      } catch (e) {
        // If not JSON, use the text
        if (errorText) errorMessage = errorText;
      }
      
      console.error("❌ Update error:", errorMessage);
      throw new Error(errorMessage);
    }

    showSuccess("Expense updated!");

    const modalEl = document.getElementById('editExpenseModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    loadExpenses(true);

  } catch (err) {
    console.error(err);
    showError(err.message);
  }
}

// -----------------------------
// Attach event listeners
// -----------------------------
function attachViewButtonEvents() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const expenseId = this.getAttribute('data-id');
      openExpenseModal(expenseId);
    });
  });
}



async function openExpenseModal(expenseId) {
  try {
    const curentuser = await fetchCurrentUser();
    const res = await fetch(`${API_URL}/expenses/exp/${expenseId}`, { headers: getHeaders() });
    if (!res.ok) return;

    const e = await res.json();
    const modalTitle = document.getElementById("expenseModalTitle");
    const modalBody = document.getElementById("expenseModalBody");
    const modalFooter = document.getElementById("expenseModalFooter");

    modalTitle.textContent = e.description;

    const participants = (e.splits || []).map(s => `${s.username}: ${Number(s.share_amount).toFixed(2)} ${e.currency}`).join("<br>");

    modalBody.innerHTML = `
      <p><b>Amount:</b> ${Number(e.amount).toFixed(2)} ${e.currency}</p>
      <p><b>Payer:</b> ${e.payer_username || "Unknown"}</p>
      <p><b>Split between:</b><br>${participants || "No splits"}</p>
      <div class="alert alert-info">
            <i class="bi bi-info-circle"></i> 
            <strong>Note:</strong> ${e.note || " "}
      </div>

      <p class="text-muted"><small>Added by ${escapeHtml(e.added_by_username || "Unknown")} on ${new Date(e.created_at).toLocaleString()}</small></p>
    `;

    // Buttons - Check if user is payer OR group owner
    const isPayer = e.payer_id === curentuser.id || e.payer_username === curentuser.username;
    const isGroupOwner = currentGroup && currentGroup.owner_id === curentuser.id;
    const isOwner = isPayer || isGroupOwner;
    modalFooter.innerHTML = `
      <button class="btn btn-primary edit-expense-btn" data-id="${e.id}" ${!isOwner ? "disabled" : ""}>Edit</button>
      <button class="btn btn-danger delete-expense-btn" data-id="${e.id}" ${!isOwner ? "disabled" : ""}>Delete</button>
    `;

    // Wait for DOM to be ready before showing modal
    setTimeout(() => {
      try {
        const modalEl = document.getElementById("expenseDetailModal");
        if (modalEl) {
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        }
      } catch (err) {
        console.error("Modal error:", err);
      }
    }, 100);

  } catch (err) {
    console.error(err);
  }
}



// -----------------------------
// Wrapper for modal save button
// -----------------------------
async function submitAddExpense() {
  try {
    const url = new URL(window.location.href);
    const groupId = url.searchParams.get("id");

    const description = document.getElementById("addDescription").value.trim();
    const category = document.getElementById("addCategory").value;
    const amount = parseFloat(document.getElementById("addAmount").value);
    const dateStr = document.getElementById("addDate").value;
    const timeStr = document.getElementById("addTime").value;
    const payerId = document.getElementById("addPayer").value;
    const walletId = document.getElementById("addWallet").value || null;
    const note = document.getElementById("addNote").value;
    const splitType = document.querySelector('input[name="addSplitType"]:checked').value;

    if (!groupId) return showError("No group selected");
    if (!description) return showError("Please enter a description");
    if (isNaN(amount) || amount <= 0) return showError("Amount must be a positive number");
    if (!dateStr || !timeStr) return showError("Please select date and time");
    if (!payerId) return showError("Please select who paid");

    // Reconstruct Date
    let createdAtISO;
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      const newDate = new Date(year, month - 1, day, hours, minutes, 0);
      createdAtISO = newDate.toISOString();
    } catch (e) {
      console.error("Date parsing error", e);
      return showError("Invalid date or time");
    }

    // Collect Splits
    let splits = [];
    if (splitType === 'equal') {
      const checked = document.querySelectorAll("#addEqualSplitMembers input[type=checkbox]:checked");
      const userIds = Array.from(checked).map(c => c.value); // Keep as strings
      if (userIds.length === 0) return showError("Please select at least one member");
      const share = amount / userIds.length;
      splits = userIds.map(id => ({ user_id: id, share_amount: share }));
    }
    else if (splitType === 'percentage') {
      const inputs = document.querySelectorAll('.add-percentage-input');
      let totalPercent = 0;
      inputs.forEach(input => {
        const val = parseFloat(input.value) || 0;
        if (val > 0) {
          totalPercent += val;
          const share = (amount * val) / 100;
          splits.push({ user_id: input.dataset.userId, share_amount: share });
        }
      });
      if (Math.abs(totalPercent - 100) > 0.1) return showError(`Total percentage must be 100% (currently ${totalPercent.toFixed(1)}%)`);
    }
    else if (splitType === 'custom') {
      const inputs = document.querySelectorAll('.add-custom-amount-input');
      let totalSplit = 0;
      inputs.forEach(input => {
        const val = parseFloat(input.value) || 0;
        if (val > 0) {
          totalSplit += val;
          splits.push({ user_id: input.dataset.userId, share_amount: val });
        }
      });
      if (Math.abs(totalSplit - amount) > 0.01) return showError(`Total split amount (${totalSplit.toFixed(2)}) must match expense amount (${amount.toFixed(2)})`);
    }

    if (splits.length === 0) return showError("Please assign splits to at least one member");

    const payload = {
      group_id: groupId,
      payer_id: payerId,
      description,
      amount,
      currency: currentGroup?.currency || "MAD",
      category,
      wallet_id: walletId && walletId !== 'undefined' ? walletId : null,
      note,
      splits,
      created_at: createdAtISO
    };

    const res = await fetch(`${API_URL}/expenses`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to create expense");
    }

    showSuccess(`Expense "${description}" added successfully!`);

    // Close modal
    const modalEl = document.getElementById('addExpenseModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    // Reset form
    document.getElementById("addExpenseForm").reset();
    initializeExpenseModal(); // Re-init to reset defaults

    // Refresh data
    await Promise.all([
      loadExpenses(true),
      loadWallets()
    ]);

  } catch (err) {
    console.error("❌ Error creating expense:", err);
    showError(err.message || "Failed to create expense");
  }
}



// --------------------------------------
// Initialize expense modal (clean version)
// --------------------------------------
// --------------------------------------
// Initialize expense modal (clean version)
// --------------------------------------
function toggleAddWalletVisibility(payerId) {
  const walletContainer = document.getElementById('addWalletContainer');
  if (!walletContainer) return;

  // Assuming currentUser is globally available
  fetchCurrentUser().then(user => {
    if (user && payerId === user.id) {
      walletContainer.style.display = 'block';
    } else {
      walletContainer.style.display = 'none';
      document.getElementById('addWallet').value = ""; // Reset wallet selection
    }
  });
}

async function initializeExpenseModal() {
  try {
    // ✅ Run only on expenses page
    if (!window.location.pathname.includes('expenses.html')) {
      return;
    }

    // ✅ Set current date and time (using LOCAL timezone)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    const dateInput = document.getElementById('addDate');
    const timeInput = document.getElementById('addTime');

    if (dateInput) dateInput.value = today;
    if (timeInput) timeInput.value = currentTime;

    // ✅ Fetch Data
    // Use loadWallets() which returns the array of wallets
    const [currentUser, members, wallets] = await Promise.all([
      fetchCurrentUser(),
      fetchMembers(),
      loadWallets()
    ]);

    // Populate Payer Dropdown
    const addPayerSelect = document.getElementById('addPayer');
    if (addPayerSelect) {
      addPayerSelect.innerHTML = '';
      members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id;
        option.textContent = `${member.username}${member.user_id === currentUser?.id ? ' (You)' : ''}`;
        addPayerSelect.appendChild(option);
      });

      // Default to current user
      if (currentUser) {
        addPayerSelect.value = currentUser.id;
        toggleAddWalletVisibility(currentUser.id);
      }

      // Listener for Payer Change
      addPayerSelect.addEventListener('change', (e) => {
        toggleAddWalletVisibility(parseInt(e.target.value));
      });
    }

    // ✅ Initialize Split Logic
    if (members.length > 0) {
      initializeAddSplitLogic(members);
    }

    console.log("✅ Add Expense modal initialized successfully");
  } catch (err) {
    console.error("❌ Error initializing expense modal:", err);
  }
}





// -----------------------------
// Delete expense
// -----------------------------
async function deleteExpense(expenseId) {
  if (!expenseId) {
    console.error("No expense ID provided");
    showError("Invalid expense ID");
    return;
  }
  
  if (!confirm("Are you sure you want to delete this expense?")) return;
  
  try {
    console.log("🗑️ Deleting expense:", expenseId);
    const res = await fetch(`${API_URL}/expenses/${expenseId}`, { 
      method: "DELETE", 
      headers: getHeaders() 
    });
    
    if (res.ok) {
      showSuccess("Expense deleted successfully");
      await loadExpenses(true); // Reset pagination and reload
      
      // Close any open modals
      const modals = document.querySelectorAll('.modal.show');
      modals.forEach(modal => {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      });
    } else {
      const e = await res.json().catch(() => ({ detail: "Delete failed" }));
      showError(e?.detail || e?.message || "Failed to delete expense");
    }
  } catch (err) {
    console.error("Error deleting expense:", err);
    showError("Failed to delete expense: " + err.message);
  }
}

// Make deleteExpense globally accessible
window.deleteExpense = deleteExpense;

// -----------------------------
// Friends list for add-member modal (improved design)
// -----------------------------
async function friendsListtoAddMember() {
  const t = localStorage.getItem("token");
  if (!t) return;

  // My friends
  let res = await fetch(`${API_URL}/friends/my`, { headers: getHeaders() });
  const myFriends = res.ok ? await res.json() : [];

  const ul1 = document.getElementById("friendsListtoAddMember");
  if (!ul1) return;

  if (myFriends.length === 0) {
    ul1.innerHTML = `
  <div class="text-center text-muted py-4" 
       style="cursor: pointer;" 
       onclick="window.location.href='http://pcrox.ddns.net:5500/frontend/friends.html'">
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
// Members helpers (unchanged)
// -----------------------------
async function fetchMembers() {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("id");
  if (!groupId) return [];

  const res = await fetch(`${API_URL}/groups/${groupId}/members`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch members: " + res.status);

  const data = await res.json();
  console.log("✅ Members API response:", data);

  // If backend returns { members: [...] }, unwrap it
  const members = Array.isArray(data) ? data : data.members;
  if (!Array.isArray(members)) {
    console.error("⚠️ Invalid members format:", data);
    return [];
  }

  // Now safely render
  renderMembers(members);
  return members;
}

function renderMembersCheckboxList(container, members) {
  container.innerHTML = "";
  container.className = "row g-3 justify-content-center"; // responsive grid spacing

  members.forEach(m => {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3 col-xl-2"; // auto-fit grid

    const card = document.createElement("div");
    card.className = "member-card card text-center border-0 shadow-sm";
    card.style.cursor = "pointer";
    card.style.transition = "all 0.25s ease";
    card.style.userSelect = "none";
    card.style.padding = "1rem";

    // ✅ Avatar or initials
    const initials = (m.username || "U")
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase();

    card.innerHTML = `
      <input class="form-check-input d-none" type="checkbox" value="${m.user_id}" id="member_${m.user_id}">
      <div class="avatar mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle">
        ${initials}
      </div>
      <h6 class="mb-0 text-truncate">${m.username || m.user_id}</h6>
      <small class="text-muted">${m.is_admin ? "👑 Admin" : "👤 Member"}</small>
    `;

    // ✅ Clickable / tappable behavior
    card.addEventListener("click", (e) => {
      const checkbox = card.querySelector("input[type='checkbox']");
      if (e.target.tagName !== "INPUT") checkbox.checked = !checkbox.checked;
      const checked = checkbox.checked;
      card.classList.toggle("selected", checked);
    });

    col.appendChild(card);
    container.appendChild(col);
  });
}

function renderMembersTable(container, members) {
  container.innerHTML = "";

  if (members.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="4" class="text-center text-muted py-4">
        <i class="bi bi-people"></i> No members found
      </td>`;
    container.appendChild(tr);
    return;
  }

  members.forEach(m => {
    const tr = document.createElement("tr");
    tr.className = "align-middle";
    tr.innerHTML = `
      <td><span class="badge bg-secondary">${m.user_id}</span></td>
      <td>
        <div class="d-flex align-items-center">
          <div class="avatar rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style="width:32px;height:32px;font-size:0.8rem;font-weight:bold;">
            ${(m.username || "U").split(" ").map(w => w[0]).join("").toUpperCase()}
          </div>
          <span class="fw-semibold">${m.username || `User ${m.user_id}`}</span>
        </div>
      </td>
      <td>
        <span class="badge ${m.is_admin ? 'bg-warning' : 'bg-info'}">
          <i class="bi ${m.is_admin ? 'bi-shield-check' : 'bi-person'}"></i>
          ${m.is_admin ? 'Admin' : 'Member'}
        </span>
      </td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-warning toggle-admin-btn" data-member-id="${m.user_id}" data-new-status="${!m.is_admin}" title="Toggle Admin">
            <i class="bi bi-shield-check"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-member-btn" data-member-id="${m.user_id}" title="Remove Member">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>`;
    container.appendChild(tr);
  });
}

function renderMembersMobileCards(container, members) {
  container.innerHTML = "";
  container.className = "row g-3 p-3"; // responsive spacing with padding

  if (members.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "col-12 text-center text-muted py-4";
    emptyDiv.innerHTML = `
      <i class="bi bi-people" style="font-size: 2rem;"></i>
      <p class="mt-2 mb-0">No members found</p>`;
    container.appendChild(emptyDiv);
    return;
  }

  members.forEach(m => {
    const col = document.createElement("div");
    col.className = "col-12 col-sm-6 col-lg-4"; // responsive grid

    const card = document.createElement("div");
    card.className = "card shadow-sm member-card h-100";
    card.style.transition = "transform 0.2s, box-shadow 0.2s";
    card.innerHTML = `
      <div class="card-body d-flex flex-column">
        <div class="d-flex align-items-center mb-3">
          <div class="avatar rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" style="width:50px;height:50px;font-weight:bold;font-size:1.2rem;">
            ${(m.username || "U").split(" ").map(w => w[0]).join("").toUpperCase()}
          </div>
          <div class="flex-grow-1">
            <h6 class="mb-0 fw-bold">${m.username || `User ${m.user_id}`}</h6>
            <small class="text-muted">ID: ${m.user_id}</small>
          </div>
        </div>
        
        <div class="mb-3">
          <span class="badge ${m.is_admin ? 'bg-warning text-dark' : 'bg-info'} fs-6">
            <i class="bi ${m.is_admin ? 'bi-shield-check' : 'bi-person'}"></i>
            ${m.is_admin ? 'Admin' : 'Member'}
          </span>
        </div>
        
        <div class="mt-auto">
          <div class="btn-group w-100" role="group">
            <button class="btn btn-outline-warning btn-sm toggle-admin-btn" data-member-id="${m.user_id}" data-new-status="${!m.is_admin}" title="Toggle Admin">
              <i class="bi bi-shield-check"></i> ${m.is_admin ? 'Remove Admin' : 'Make Admin'}
            </button>
            <button class="btn btn-outline-danger btn-sm delete-member-btn" data-member-id="${m.user_id}" title="Remove Member">
              <i class="bi bi-trash"></i> Remove
            </button>
          </div>
        </div>
      </div>
    `;

    // Hover effects
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

function renderMembers(members) {
  const desktopContainer = document.getElementById("membersTable");
  const mobileContainer = document.getElementById("membersMobileCards");

  // Check screen size and render accordingly
  if (window.innerWidth >= 768) {
    // Desktop: show table, hide mobile cards
    if (desktopContainer) {
      desktopContainer.parentElement.classList.remove("d-none");
      renderMembersTable(desktopContainer, members);
    }
    if (mobileContainer) {
      mobileContainer.classList.add("d-none");
    }
  } else {
    // Mobile: show cards, hide table
    if (mobileContainer) {
      mobileContainer.classList.remove("d-none");
      renderMembersMobileCards(mobileContainer, members);
    }
    if (desktopContainer) {
      desktopContainer.parentElement.classList.add("d-none");
    }
  }
}

async function loadMembers() {
  try {
    const members = await fetchMembers();

    // Render desktop table
    const tableContainer = document.querySelector("#membersTableContainer");
    const tableBody = document.querySelector("#membersTable");
    if (tableContainer && tableBody) {
      renderMembersTable(tableBody, members);
    }

    // Render mobile cards
    const mobileCards = document.querySelector("#membersMobileCards");
    if (mobileCards) {
      renderMembersMobileCards(mobileCards, members);
    }
  } catch (err) {
    console.error("Error loading members:", err);
  }
}

// Render beautiful member cards for mobile
function renderMembersMobileCards(container, members) {
  container.innerHTML = "";

  if (members.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="bi bi-people"></i>
        <div class="mt-2">No members found</div>
        <small>Add friends to get started</small>
      </div>`;
    return;
  }

  members.forEach(member => {
    const card = document.createElement("div");
    card.className = `member-card ${member.is_admin ? 'admin' : ''}`;

    const initials = (member.username || "U")
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase();

    card.innerHTML = `
      <div class="member-header">
        <div class="member-avatar">${initials}</div>
        <div class="member-info">
          <div class="member-name">${member.username || `User ${member.user_id}`}</div>
          <div class="member-role">${member.is_admin ? '👑 Admin' : '👤 Member'}</div>
        </div>
      </div>
      <div class="member-actions">
        <button class="btn btn-outline-warning btn-sm toggle-admin-btn" data-member-id="${member.user_id}" data-new-status="${!member.is_admin}">
          <i class="bi bi-shield-${member.is_admin ? 'minus' : 'plus'}"></i>
          ${member.is_admin ? 'Remove Admin' : 'Make Admin'}
        </button>
        <button class="btn btn-outline-danger btn-sm delete-member-btn" data-member-id="${member.user_id}">
          <i class="bi bi-trash"></i> Remove
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

// Add Members
async function addMemberFromModal(modal) {
  const selectedCards = modal.querySelectorAll(".friend-card.selected");
  if (!selectedCards.length) return alert("Please select a friend!");
  const userIds = Array.from(selectedCards).map(card => card.dataset.friendId);
  const isAdmin = modal.querySelector("#is_admin")?.checked || false;
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("id");
  if (!groupId) return alert("No group selected");

  const payload = { user_ids: userIds, is_admin: isAdmin };

  const res = await fetch(`${API_URL}/groups/${groupId}/add_members`, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" }, getHeaders()),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const e = await res.json().catch(() => null);
    return alert(e?.detail || "Failed to add member");
  }

  alert("Member(s) added!");
  loadMembers();

  // Clear selections
  selectedCards.forEach(card => card.classList.remove('selected'));
}

// Redesigned Manage Members Modal Logic

// Initialize modal when opened
document.getElementById('manageMembersModal')?.addEventListener('show.bs.modal', async () => {
  const groupTitle = document.getElementById('groupTitle')?.textContent.trim() || 'Group';
  const modalTitle = document.getElementById('manageMembersGroupTitle');
  if (modalTitle) modalTitle.textContent = groupTitle;

  // Load data
  await Promise.all([
    renderFriendsForInvite(),
    renderGroupMembersForManage()
  ]);
});

// Render Friends List for Invite (Left Panel)
async function renderFriendsForInvite() {
  const container = document.getElementById('friendsListContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center text-muted py-4">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      <span class="ms-2">Loading friends...</span>
    </div>
  `;

  try {
    const friends = await fetchFriends(); // Assuming this exists and returns list of friends
    // Filter out friends who are already members
    // We need current members first
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("id");
    const membersRes = await fetch(`${API_URL}/groups/${groupId}/members`, { headers: getHeaders() });
    const members = await membersRes.json();
    // Ensure IDs are numbers for comparison
    const memberIds = new Set(members.map(m => Number(m.user_id)));

    const availableFriends = friends.filter(f => !memberIds.has(Number(f.user_id)));

    if (availableFriends.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-emoji-frown fs-1 mb-2"></i>
          <p class="mb-0">No friends to add.</p>
          <small>Invite friends to SplitEasy first!</small>
        </div>
      `;
      updateAddButtonState();
      return;
    }

    container.innerHTML = '';
    console.log("Friends loaded:", availableFriends); // Debugging
    availableFriends.forEach(friend => {
      const friendId = friend.user_id;
      const friendName = friend.friend_username || friend.username || 'Unknown';
      const friendAvatar = friend.profile_photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(friendName) + '&background=random';

      if (!friendId) console.error("Friend ID missing for:", friend);

      const item = document.createElement('label');
      item.className = 'd-flex align-items-center gap-3 p-3 rounded-3 hover-bg-light cursor-pointer border-bottom border-light';
      item.innerHTML = `
        <img src="${friendAvatar}" class="rounded-circle object-fit-cover" width="40" height="40" alt="${friendName}">
        <div class="flex-grow-1">
          <p class="mb-0 fw-semibold text-dark">${friendName}</p>
        </div>
        <input class="form-check-input fs-5 friend-checkbox" type="checkbox" value="${friendId}">
      `;

      // Add click event to toggle checkbox logic
      const checkbox = item.querySelector('input');
      checkbox.addEventListener('change', updateAddButtonState);

      container.appendChild(item);
    });

  } catch (err) {
    console.error("Error loading friends for invite:", err);
    container.innerHTML = `
      <div class="text-center text-danger py-4">
        <i class="bi bi-exclamation-triangle fs-1 mb-2"></i>
        <p>Failed to load friends.</p>
    `;
  }
}

// Initialize Search Listener robustly
function initFriendSearch() {
  const searchInput = document.getElementById('searchFriendsInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const container = document.getElementById('friendsListContainer');
      if (!container) return;

      const items = container.querySelectorAll('label');
      items.forEach(item => {
        const name = item.querySelector('p').textContent.toLowerCase();
        item.style.display = name.includes(term) ? 'flex' : 'none';
      });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFriendSearch);
} else {
  initFriendSearch();
}

// Render Current Members (Right Panel)
async function renderGroupMembersForManage() {
  const container = document.getElementById('currentMembersList');
  const countBadge = document.getElementById('currentMembersTitle'); // Using title to append count
  if (!container) return;

  container.innerHTML = `
    <div class="text-center text-muted py-4">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      <span class="ms-2">Loading members...</span>
    </div>
  `;

  try {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("id");

    // Fetch members and current user in parallel
    const [membersRes, currentUser] = await Promise.all([
      fetch(`${API_URL}/groups/${groupId}/members`, { headers: getHeaders() }),
      fetchCurrentUser()
    ]);

    if (!membersRes.ok) throw new Error("Failed to fetch members");
    const members = await membersRes.json();

    // Update count
    if (countBadge) countBadge.textContent = `Current Members (${members.length})`;

    // Find current user's membership to check admin status
    const myMembership = members.find(m => m.user_id === currentUser?.id);
    const iAmAdmin = myMembership?.is_admin;

    container.innerHTML = '';
    members.forEach(member => {
      const isMe = member.user_id === currentUser?.id;
      const isAdmin = member.is_admin;
      const memberName = member.username || 'Unknown';
      const memberAvatar = member.profile_photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(memberName) + '&background=random';
      const memberEmail = member.email || 'No email';

      const item = document.createElement('div');
      item.className = 'd-flex align-items-center gap-3 p-3 rounded-3 hover-bg-light group mb-2 border-bottom border-light';

      let actionBtns = '';

      // Only show actions if I am admin
      if (iAmAdmin) {
        // Cannot remove myself or change my own admin status here (usually)
        // But for other members:
        if (!isMe) {
          // Toggle Admin Button
          const adminIcon = isAdmin ? 'bi-shield-check text-success' : 'bi-shield text-muted';
          const adminTitle = isAdmin ? 'Remove Admin' : 'Make Admin';
          const adminAction = isAdmin ? 'false' : 'true';

          actionBtns += `
              <button class="btn btn-icon btn-sm me-1 toggle-member-admin-btn" 
                      data-membership-id="${member.user_id}" 
                      data-make-admin="${adminAction}"
                      title="${adminTitle}">
                <i class="bi ${adminIcon} fs-5"></i>
              </button>
            `;

          // Remove Member Button
          actionBtns += `
              <button class="btn btn-icon btn-sm text-danger remove-member-btn" 
                      data-membership-id="${member.user_id}" 
                      title="Remove Member">
                <i class="bi bi-trash fs-5"></i>
              </button>
            `;
        }
      }

      let roleBadge = isAdmin
        ? `<span class="badge bg-primary-subtle text-primary rounded-pill px-2 py-1 text-uppercase" style="font-size: 0.7rem;">Admin</span>`
        : `<span class="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1 text-uppercase" style="font-size: 0.7rem;">Member</span>`;

      item.innerHTML = `
        <img src="${memberAvatar}" class="rounded-circle object-fit-cover" width="40" height="40" alt="${memberName}">
        <div class="flex-grow-1">
          <p class="mb-0 fw-medium text-dark">${memberName} ${isMe ? '(You)' : ''}</p>
          <p class="mb-0 small text-muted">${memberEmail}</p>
        </div>
        <div class="d-flex align-items-center gap-2">
            ${roleBadge}
            ${actionBtns}
        </div>
      `;
      container.appendChild(item);
    });

  } catch (err) {
    console.error("Error loading group members:", err);
    container.innerHTML = `
      <div class="text-center text-danger py-4">
        <i class="bi bi-exclamation-triangle fs-1 mb-2"></i>
        <p>Failed to load members.</p>
      </div>
    `;
  }
}

// Toggle Member Admin Status
async function toggleMemberAdmin(membershipId, makeAdmin) {
  const action = makeAdmin ? "promote to admin" : "remove admin rights from";
  if (!confirm(`Are you sure you want to ${action} this member?`)) return;

  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("id");

  try {
    const res = await fetch(`${API_URL}/groups/${groupId}/members/${membershipId}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, getHeaders()),
      body: JSON.stringify({ is_admin: makeAdmin })
    });

    if (!res.ok) {
      const e = await res.json().catch(() => null);
      throw new Error(e?.detail || "Failed to update member status");
    }

    showSuccess(`Member status updated successfully`);
    renderGroupMembersForManage(); // Refresh list
  } catch (err) {
    showError(err.message);
  }
}

function updateAddButtonState() {
  const checkboxes = document.querySelectorAll('.friend-checkbox:checked');
  const btn = document.getElementById('addMembersBtn');
  if (btn) {
    btn.disabled = checkboxes.length === 0;
    btn.textContent = checkboxes.length > 0 ? `Add ${checkboxes.length} Member${checkboxes.length > 1 ? 's' : ''}` : 'Add Members';
  }
}

// Add Member Submit Handler
document.getElementById('addMembersBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('addMembersBtn');
  const checkboxes = document.querySelectorAll('.friend-checkbox:checked');
  const makeAdmin = document.getElementById('makeAdminToggle')?.checked || false;

  if (checkboxes.length === 0) return;

  const selectedUserIds = Array.from(checkboxes)
    .map(cb => parseInt(cb.value))
    .filter(id => !isNaN(id)); // Filter out invalid IDs

  if (selectedUserIds.length === 0) {
    showError("Invalid selection. Please try again.");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("id");

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> Adding...';

  try {
    // Add members one by one or batch if API supports it. 
    // Existing API seems to support batch: POST /groups/{id}/add_members with { user_ids: [], is_admin: bool }
    // Let's verify existing addMemberFromModal logic or rewrite it.
    // The previous code used `addMemberFromModal` which called POST /groups/{id}/add_members

    const payload = {
      user_ids: selectedUserIds,
      is_admin: makeAdmin
    };

    const res = await fetch(`${API_URL}/groups/${groupId}/add_members`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, getHeaders()),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const e = await res.json().catch(() => null);
      throw new Error(e?.detail || "Failed to add members");
    }

    showSuccess(`Successfully added ${selectedUserIds.length} member(s)!`);

    // Refresh lists
    await Promise.all([
      renderFriendsForInvite(),
      renderGroupMembersForManage()
    ]);

    // Reset button
    btn.disabled = true;
    btn.textContent = 'Add Members';
    document.getElementById('makeAdminToggle').checked = false;

  } catch (err) {
    console.error(err);
    showError(err.message);
    btn.disabled = false;
    btn.textContent = `Add ${checkboxes.length} Member${checkboxes.length > 1 ? 's' : ''}`;
  }
});

// Remove Member (Moved from inline onclick)
async function removeMember(membershipId) {
  if (!confirm("Are you sure you want to remove this member?")) return;

  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("id");

  try {
    const res = await fetch(`${API_URL}/groups/${groupId}/members/${membershipId}`, {
      method: "DELETE",
      headers: getHeaders()
    });

    if (!res.ok) {
      const e = await res.json().catch(() => null);
      throw new Error(e?.detail || "Failed to remove member");
    }

    showSuccess("Member removed successfully");
    renderGroupMembersForManage(); // Refresh list
    renderFriendsForInvite(); // Friend becomes available again
  } catch (err) {
    showError(err.message);
  }
}

// Legacy function stub if needed by other parts, but we replaced the logic
async function addMemberModalSubmit() {
  console.warn("addMemberModalSubmit is deprecated. Use the new event listener.");
}

// Update Member (toggle admin)
async function toggleAdmin(memberId, newStatus) {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("id");
  if (!groupId) return;
  const res = await fetch(`${API_URL}/groups/${groupId}/members/${memberId}`, {
    method: "PUT",
    headers: Object.assign({ "Content-Type": "application/json" }, getHeaders()),
    body: JSON.stringify({ is_admin: newStatus })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => null);
    return alert(e?.detail || "Failed to update member");
  }
  loadMembers();
}

// Delete Member
async function deleteMember(memberId) {
  if (!confirm("Remove this member?")) return;
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("id");
  if (!groupId) return;
  const res = await fetch(`${API_URL}/groups/${groupId}/members/${memberId}`, {
    method: "DELETE",
    headers: getHeaders()
  });

  if (!res.ok) {
    const e = await res.json().catch(() => null);
    return alert(e?.detail || "Failed to delete member");
  }
  loadMembers();
}

// ----------------------------
// 🧮 Check if group is fully settled
// ----------------------------
async function checkIfAllSettled() {
  const url = new URL(window.location.href);
  const groupId = url.searchParams.get("id");
  if (!groupId) return;

  try {
    const res = await fetch(`${API_URL}/settle/${groupId}/balances`, { headers: getHeaders() });
    if (!res.ok) return;

    const balances = await res.json();
    const allZero = balances.every(b => Math.abs(Number(b.net)) < 0.01);

    const desktopTable = document.getElementById("desktopTable");
    const mobileCards = document.getElementById("expensesList");
    const allSettledCard = document.getElementById("allSettledMessage");

    if (allZero) {
      // Hide data views for both
      if (desktopTable) desktopTable.classList.add("d-none");
      if (mobileCards) mobileCards.classList.add("d-none");
      if (allSettledCard) allSettledCard.classList.remove("d-none");
    } else {
      // Normal mode
      if (window.innerWidth >= 768) {
        // Desktop: show table, hide mobile cards
        if (desktopTable) desktopTable.classList.remove("d-none");
        if (mobileCards) mobileCards.classList.add("d-none");
      } else {
        // Mobile: show cards, hide table
        if (mobileCards) mobileCards.classList.remove("d-none");
        if (desktopTable) desktopTable.classList.add("d-none");
      }
      if (allSettledCard) allSettledCard.classList.add("d-none");
    }
  } catch (err) {
    console.error("Error checking balances:", err);
  }
}

// -----------------------------
// Fetch one expense by ID
// -----------------------------
async function fetchExpenseById(expenseId) {
  const res = await fetch(`${API_URL}/expenses/exp/${expenseId}`, { method: "GET", headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to load expense");
  return await res.json();
}

// Duplicate edit logic removed


// -----------------------------
// Add Expense Split Logic
// -----------------------------
function initializeAddSplitLogic(members) {
  const splitRadios = document.querySelectorAll('input[name="addSplitType"]');
  const amountInput = document.getElementById('addAmount');

  const equalView = document.getElementById('addEqualSplitView');
  const percentageView = document.getElementById('addPercentageSplitView');
  const customView = document.getElementById('addCustomSplitView');

  const labels = {
    equal: document.getElementById('labelAddSplitEqual'),
    percentage: document.getElementById('labelAddSplitPercentage'),
    custom: document.getElementById('labelAddSplitCustom')
  };

  function updateTabStyles(selectedType) {
    Object.keys(labels).forEach(type => {
      const label = labels[type];
      if (!label) return;
      if (type === selectedType) {
        label.classList.remove('text-muted');
        label.classList.add('bg-white', 'shadow-sm', 'text-dark');
      } else {
        label.classList.add('text-muted');
        label.classList.remove('bg-white', 'shadow-sm', 'text-dark');
      }
    });
  }

  renderAddEqualSplitView(members);
  renderAddPercentageSplitView(members);
  renderAddCustomSplitView(members);

  splitRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const type = e.target.value;

      [equalView, percentageView, customView].forEach(view => {
        if (view) {
          view.classList.add('d-none');
          view.classList.remove('d-flex');
        }
      });

      const selectedView = type === 'equal' ? equalView
        : type === 'percentage' ? percentageView
          : customView;

      if (selectedView) {
        selectedView.classList.remove('d-none');
        selectedView.classList.add('d-flex');
      }

      updateTabStyles(type);
      updateAddSplitCalculations(type);
    });
  });

  amountInput.addEventListener('input', () => {
    const type = document.querySelector('input[name="addSplitType"]:checked').value;
    updateAddSplitCalculations(type);
  });

  // Default to Equal
  const defaultRadio = document.getElementById('addSplitEqual');
  if (defaultRadio) defaultRadio.checked = true;

  if (equalView) {
    equalView.classList.remove('d-none');
    equalView.classList.add('d-flex');
  }
  if (percentageView) percentageView.classList.add('d-none');
  if (customView) customView.classList.add('d-none');

  updateTabStyles('equal');
  updateAddSplitCalculations('equal');
}

function renderAddEqualSplitView(members) {
  const container = document.getElementById('addEqualSplitMembers');
  if (!container) return;
  container.innerHTML = '';

  members.forEach(member => {
    const initials = (member.username || "U").substring(0, 2).toUpperCase();
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center justify-content-between p-2 rounded hover-bg-light';
    div.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <input class="form-check-input fs-5 m-0 border-primary" type="checkbox" value="${member.user_id}" checked style="cursor: pointer;">
        <div class="avatar rounded-circle bg-light text-dark d-flex align-items-center justify-content-center fw-bold border" style="width: 40px; height: 40px;">
          <img src="https://ui-avatars.com/api/?name=${member.username}&background=random" class="rounded-circle" width="40" height="40" alt="${initials}">
        </div>
        <div class="d-flex flex-column">
          <span class="fw-semibold text-dark">${member.username}</span>
          <small class="text-muted">Equal share</small>
        </div>
      </div>
      <div class="fw-bold text-dark equal-amount-display">$0.00</div>
    `;

    div.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        const checkbox = div.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        updateAddSplitCalculations('equal');
      }
    });

    div.querySelector('input[type="checkbox"]').addEventListener('change', () => updateAddSplitCalculations('equal'));
    container.appendChild(div);
  });
}

function renderAddPercentageSplitView(members) {
  const container = document.getElementById('addPercentageSplitMembers');
  if (!container) return;
  container.innerHTML = '';

  members.forEach(member => {
    const initials = (member.username || "U").substring(0, 2).toUpperCase();
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center justify-content-between p-2';
    div.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <div class="avatar rounded-circle bg-light text-dark d-flex align-items-center justify-content-center fw-bold border" style="width: 40px; height: 40px;">
          <img src="https://ui-avatars.com/api/?name=${member.username}&background=random" class="rounded-circle" width="40" height="40" alt="${initials}">
        </div>
        <span class="fw-semibold text-dark">${member.username}</span>
      </div>
      <div class="input-group input-group-sm" style="width: 140px;">
        <input type="number" class="form-control text-end add-percentage-input" data-user-id="${member.user_id}" value="0" min="0" max="100" step="0.1" placeholder="0">
        <span class="input-group-text bg-white text-muted">%</span>
      </div>
    `;

    div.querySelector('input').addEventListener('input', () => updateAddSplitCalculations('percentage'));
    container.appendChild(div);
  });
}

function renderAddCustomSplitView(members) {
  const container = document.getElementById('addCustomSplitMembers');
  if (!container) return;
  container.innerHTML = '';

  members.forEach(member => {
    const initials = (member.username || "U").substring(0, 2).toUpperCase();
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center justify-content-between p-2';
    div.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <div class="avatar rounded-circle bg-light text-dark d-flex align-items-center justify-content-center fw-bold border" style="width: 40px; height: 40px;">
          <img src="https://ui-avatars.com/api/?name=${member.username}&background=random" class="rounded-circle" width="40" height="40" alt="${initials}">
        </div>
        <span class="fw-semibold text-dark">${member.username}</span>
      </div>
      <div class="input-group input-group-sm" style="width: 140px;">
        <span class="input-group-text bg-white border-end-0 text-muted">$</span>
        <input type="number" class="form-control border-start-0 text-end add-custom-amount-input" data-user-id="${member.user_id}" value="0" min="0" step="0.01" placeholder="0.00">
      </div>
    `;

    div.querySelector('input').addEventListener('input', () => updateAddSplitCalculations('custom'));
    container.appendChild(div);
  });
}

function updateAddSplitCalculations(type) {
  const totalAmount = parseFloat(document.getElementById('addAmount').value) || 0;
  const alertBox = document.getElementById('addSplitValidationAlert');
  const currency = currentGroup?.currency || 'MAD';

  if (alertBox) alertBox.style.display = 'none';

  if (type === 'equal') {
    const checkedBoxes = document.querySelectorAll('#addEqualSplitMembers input[type="checkbox"]:checked');
    const count = checkedBoxes.length;
    const share = count > 0 ? (totalAmount / count).toFixed(2) : '0.00';

    document.querySelectorAll('#addEqualSplitMembers .equal-amount-display').forEach(div => {
      const row = div.closest('.d-flex.justify-content-between');
      const checkbox = row.querySelector('input[type="checkbox"]');

      if (checkbox.checked) {
        div.textContent = `${share} ${currency}`;
        div.classList.remove('text-muted');
        div.classList.add('text-dark');
      } else {
        div.textContent = `0.00 ${currency}`;
        div.classList.add('text-muted');
        div.classList.remove('text-dark');
      }
    });
  }
  else if (type === 'percentage') {
    const inputs = document.querySelectorAll('.add-percentage-input');
    let totalPercent = 0;
    inputs.forEach(i => totalPercent += parseFloat(i.value) || 0);

    const remaining = 100 - totalPercent;

    if (Math.abs(remaining) > 0.1) {
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.textContent = remaining > 0
          ? `Remaining: ${remaining.toFixed(1)}%`
          : `Over-assigned by ${Math.abs(remaining).toFixed(1)}%`;
      }
    }
  }
  else if (type === 'custom') {
    const inputs = document.querySelectorAll('.add-custom-amount-input');
    let totalSplit = 0;
    inputs.forEach(i => totalSplit += parseFloat(i.value) || 0);

    const remaining = totalAmount - totalSplit;

    if (Math.abs(remaining) > 0.01) {
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.textContent = remaining > 0
          ? `Remaining: ${remaining.toFixed(2)} ${currency}`
          : `Over-assigned by ${Math.abs(remaining).toFixed(2)} ${currency}`;
      }
    }
  }
}

// -----------------------------
// Helper functions for Add Expense Split
// -----------------------------
function selectAllAddMembers() {
  const checkboxes = document.querySelectorAll('#addEqualSplitMembers input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
  updateAddSplitCalculations('equal');
}

function deselectAllAddMembers() {
  const checkboxes = document.querySelectorAll('#addEqualSplitMembers input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateAddSplitCalculations('equal');
}

// -----------------------------
// Advanced Split Logic (Edit Modal)
// -----------------------------
// Duplicate edit split logic removed


// -----------------------------
// Attach edit and delete button events
// -----------------------------
document.addEventListener("click", async (e) => {
  // Handle edit buttons (both .edit-btn and .edit-expense-btn)
  const editBtn = e.target.closest(".edit-btn, .edit-expense-btn");
  if (editBtn && !editBtn.disabled) {
    const id = editBtn.dataset.id;
    if (id) {
      e.preventDefault();
      e.stopPropagation();
      handleEditExpense(id);
    }
    return;
  }

  // Handle delete buttons (both inline onclick and .delete-expense-btn)
  const deleteBtn = e.target.closest(".delete-expense-btn, .delete-btn");
  if (deleteBtn && !deleteBtn.disabled) {
    const id = deleteBtn.dataset.id;
    if (id) {
      e.preventDefault();
      e.stopPropagation();
      deleteExpense(id);
    }
    return;
  }

  // Handle view settlement detail button
  const viewSettlementBtn = e.target.closest(".view-settlement-btn");
  if (viewSettlementBtn) {
    const settlementId = viewSettlementBtn.dataset.settlementId;
    if (settlementId) {
      e.preventDefault();
      e.stopPropagation();
      showSettlementDetail(settlementId);
    }
    return;
  }

  // Handle accept settlement from expenses button
  const acceptSettlementBtn = e.target.closest(".accept-settlement-expense-btn");
  if (acceptSettlementBtn) {
    const settlementId = acceptSettlementBtn.dataset.settlementId;
    const fromUsername = acceptSettlementBtn.dataset.fromUsername;
    if (settlementId) {
      e.preventDefault();
      e.stopPropagation();
      acceptSettlementFromExpenses(settlementId, fromUsername);
    }
    return;
  }

  // Handle reject settlement from expenses button
  const rejectSettlementBtn = e.target.closest(".reject-settlement-expense-btn");
  if (rejectSettlementBtn) {
    const settlementId = rejectSettlementBtn.dataset.settlementId;
    const fromUsername = rejectSettlementBtn.dataset.fromUsername;
    if (settlementId) {
      e.preventDefault();
      e.stopPropagation();
      rejectSettlementFromExpenses(settlementId, fromUsername);
    }
    return;
  }

  // Handle toggle admin button
  const toggleAdminBtn = e.target.closest(".toggle-admin-btn");
  if (toggleAdminBtn) {
    const memberId = toggleAdminBtn.dataset.memberId;
    const newStatus = toggleAdminBtn.dataset.newStatus === 'true';
    if (memberId) {
      e.preventDefault();
      e.stopPropagation();
      toggleAdmin(memberId, newStatus);
    }
    return;
  }

  // Handle delete member button
  const deleteMemberBtn = e.target.closest(".delete-member-btn");
  if (deleteMemberBtn) {
    const memberId = deleteMemberBtn.dataset.memberId;
    if (memberId) {
      e.preventDefault();
      e.stopPropagation();
      deleteMember(memberId);
    }
    return;
  }

  // Handle toggle member admin button
  const toggleMemberAdminBtn = e.target.closest(".toggle-member-admin-btn");
  if (toggleMemberAdminBtn) {
    const membershipId = toggleMemberAdminBtn.dataset.membershipId;
    const makeAdmin = toggleMemberAdminBtn.dataset.makeAdmin === 'true';
    if (membershipId) {
      e.preventDefault();
      e.stopPropagation();
      toggleMemberAdmin(membershipId, makeAdmin);
    }
    return;
  }

  // Handle remove member button
  const removeMemberBtn = e.target.closest(".remove-member-btn");
  if (removeMemberBtn) {
    const membershipId = removeMemberBtn.dataset.membershipId;
    if (membershipId) {
      e.preventDefault();
      e.stopPropagation();
      removeMember(membershipId);
    }
    return;
  }
});

// -----------------------------
// Leaving Groups 
// -----------------------------

async function checkCanLeave(groupId) {
  // Skip if not on expense page
  if (!window.location.pathname.includes("/expenses")) return;

  if (!groupId) {
    console.warn("Skipping checkCanLeave — no groupId found");
    return;
  }
  try {

    const res = await fetch(`${API_URL}/groups/${groupId}/can_leave`, { headers: getHeaders() });
    const data = await res.json();
    data.can_leave;
    document.getElementById("leaveGroupBtn").disabled = !data.can_leave;
  } catch (err) {
    console.error(err);
    document.getElementById("leaveGroupBtn").disabled = true;
  }
}

document.getElementById("leaveGroupBtn")?.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to leave this group?")) return;

  const url = new URL(window.location.href);
  const groupId = url.searchParams.get("id");
  try {
    const res = await fetch(`${API_URL}/groups/${groupId}/leave`, {
      method: "POST",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to leave group");
    alert("You left the group successfully");
    window.location.href = "groups.html"; // redirect to groups list
  } catch (err) {
    alert(err.message);
  }
});

const url = new URL(window.location.href);
const groupId = url.searchParams.get("id");
console.log("check groupid", groupId);
// ✅ Call on page load
checkCanLeave(groupId);

// ----------------------------
// Init
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Load initial data
  loadGroupInfo();
  loadExpenses();
  friendsListtoAddMember();
  loadMembers();
  loadWallets();
  // loadPayersForExpense(); // Moved to loadGroupInfo
  // loadMembersForExpense(); // Moved to loadGroupInfo
  initializeExpenseModal();

  // Refresh modal data when opened
  const addExpenseModalEl = document.getElementById('addExpenseModal');
  if (addExpenseModalEl) {
    addExpenseModalEl.addEventListener('show.bs.modal', async () => {
      console.log("🚀 Add Expense Modal Opening...");
      await initializeExpenseModal();

      if (currentGroup) {
        console.log("📊 Current Group:", currentGroup);
        // Load members and payers for the current group
        await loadMembersForGroup(currentGroup.id);
        await loadPayersForGroup(currentGroup.id);
      } else {
        console.warn("⚠️ currentGroup is null!");
      }

      // ✅ Simplify for Personal Groups
      if (currentGroup && (currentGroup.type === 'Personal' || currentGroup.type === 'Personal Expenses')) {
        console.log("✅ Personal Group detected, hiding fields...");
        // Hide Payer and Split sections
        const payerContainer = document.getElementById('addPayerContainer');
        const splitSection = document.getElementById('addSplitSection');

        if (payerContainer) payerContainer.style.display = 'none';
        else console.error("❌ addPayerContainer not found");

        if (splitSection) splitSection.style.display = 'none';
        else console.error("❌ addSplitSection not found");

        // Ensure Wallet is visible
        document.getElementById('addWalletContainer').style.display = 'block';

        // Set default payer to current user
        const currentUser = await fetchCurrentUser();
        if (currentUser) {
          const payerSelect = document.getElementById('addPayer');
          if (payerSelect) payerSelect.value = currentUser.id;
        }
      } else {
        console.log("ℹ️ Normal group, showing fields...");
        // Show fields for normal groups
        document.getElementById('addPayerContainer').style.display = 'block';
        document.getElementById('addSplitSection').style.display = 'block';
      }
    });
  }

  // Add refresh functionality
  const refreshBtn = document.getElementById('refreshExpenses');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadExpenses(true); // Reset pagination
      loadWallets();
    });
  }

  // Add edit group button functionality
  const editGroupBtn = document.getElementById('editGroupBtn');
  if (editGroupBtn) {
    editGroupBtn.addEventListener('click', openEditGroupModalFromExpenses);
  }

  // Add edit group form submission
  const editGroupForm = document.getElementById('editGroupForm');
  if (editGroupForm) {
    editGroupForm.addEventListener('submit', saveGroupChanges);
  }

  // Add filter functionality
  const filterItems = document.querySelectorAll('[data-filter]');
  filterItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = e.target.dataset.filter;
      applyFilter(filter);
    });
  });

  // Handle window resize for responsive behavior
  window.addEventListener('resize', async () => {
    if (allExpenses.length > 0) {
      const user = await fetchCurrentUser();
      if (user) {
        if (window.innerWidth >= 992) {
          renderDesktopTable(allExpenses, user, currentGroup);
        } else {
          renderMobileCards(allExpenses, user, currentGroup);
        }
      }
    }
  });

  // Infinite scroll detection
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    // Debounce scroll events
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      handleScroll();
    }, 100);
  }, { passive: true });

  // "Show Expenses" button inside All Settled card
  const btn = document.getElementById("showExpensesBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      const desktopTable = document.getElementById("desktopTable");
      const mobileCards = document.getElementById("expensesList");
      const allSettledCard = document.getElementById("allSettledMessage");

      // Hide Congrats
      if (allSettledCard) allSettledCard.classList.add("d-none");

      // Show appropriate view
      if (window.innerWidth >= 992) {
        if (desktopTable) desktopTable.classList.remove("d-none");
        if (mobileCards) mobileCards.classList.add("d-none");
      } else {
        if (mobileCards) mobileCards.classList.remove("d-none");
        if (desktopTable) desktopTable.classList.add("d-none");
      }
    });
  }

  // Balances page redirect
  const balanceBtn = document.getElementById("balanceId");
  if (balanceBtn) {
    balanceBtn.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      const groupId = params.get("id");
      if (!groupId) return;
      window.location.href = `balances.html?id=${groupId}`;
    });
  }
});

// -----------------------------
// Filter functionality
// -----------------------------
async function applyFilter(filter) {
  if (!allExpenses.length) return;

  let filteredExpenses = allExpenses;
  const user = await fetchCurrentUser();

  if (!user) return;

  switch (filter) {
    case 'my':
      filteredExpenses = allExpenses.filter(e => e.payer_username === user.username);
      break;
    case 'recent':
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredExpenses = allExpenses.filter(e => new Date(e.created_at) > weekAgo);
      break;
    case 'all':
    default:
      filteredExpenses = allExpenses;
      break;
  }

  // Re-render with filtered data
  if (window.innerWidth >= 992) {
    renderDesktopTable(filteredExpenses, user, currentGroup);
  } else {
    renderMobileCards(filteredExpenses, user, currentGroup);
  }
}





// Download Template
document.getElementById("downloadTemplateBtn")?.addEventListener("click", async () => {
  const url = new URL(window.location.href);
  const groupId = url.searchParams.get("id");

  if (!groupId) return alert("No group selected");

  const res = await fetch(`${API_URL}/expenses/${groupId}/download-template`, {
    headers: getHeaders()
  });
  if (!res.ok) return alert("Failed to download template");

  const blob = await res.blob();
  const url_obj = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url_obj;
  a.download = `group_${groupId}_template.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url_obj);
});

// Upload Expenses - auto-upload when file is selected
document.getElementById("uploadFile")?.addEventListener("change", async (e) => {
  const url = new URL(window.location.href);
  const groupId = url.searchParams.get("id");
  const fileInput = e.target;
  const statusDiv = document.getElementById("uploadStatus");

  if (!groupId) return alert("No group selected");
  if (!fileInput?.files.length) return;

  if (statusDiv) {
    statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div>Uploading...';
    statusDiv.className = "text-center mb-3 text-primary";
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    // Don't set Content-Type header for FormData - let the browser set it with boundary
    const headers = { ...getHeaders() };
    delete headers['Content-Type'];

    const res = await fetch(`${API_URL}/expenses/${groupId}/upload`, {
      method: "POST",
      headers: headers,
      body: formData
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { detail: "Server response error" };
    }

    if (res.ok) {
      // Check if there were errors in upload
      if (data.status === "error" && data.errors && data.errors.length > 0) {
        const errorList = data.errors.map(err => `<li>${err}</li>`).join('');
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="alert alert-warning alert-sm">
              <strong>Upload completed with errors:</strong>
              <ul class="mb-0 text-start">${errorList}</ul>
            </div>`;
          statusDiv.className = "text-center mb-3";
        }
        showError(`Upload completed with ${data.errors.length} errors. See details below.`);

        // Clear status after 10 seconds
        setTimeout(() => {
          if (statusDiv) statusDiv.innerHTML = "";
        }, 10000);
      } else {
        // Success
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert alert-success alert-sm mb-0">${data.message || "Expenses uploaded successfully!"}</div>`;
          statusDiv.className = "text-center mb-3";
        }
        showSuccess(data.message || "Expenses uploaded successfully!");
        fileInput.value = ""; // Clear file input
        await loadExpenses(true); // Reset pagination and reload expenses

        // Clear status after 3 seconds
        setTimeout(() => {
          if (statusDiv) statusDiv.innerHTML = "";
        }, 3000);
      }
    } else {
      // HTTP Error
      if (statusDiv) {
        const errorMsg = data.detail || data.message || "Failed to upload expenses";
        statusDiv.innerHTML = `<div class="alert alert-danger alert-sm mb-0">${errorMsg}</div>`;
        statusDiv.className = "text-center mb-3";
      }
      showError(data.detail || data.message || "Failed to upload expenses");
    }
  } catch (err) {
    if (statusDiv) {
      statusDiv.innerHTML = `<div class="alert alert-danger alert-sm mb-0">Error: ${err.message}</div>`;
      statusDiv.className = "text-center mb-3";
    }
    showError("Failed to upload expenses: " + err.message);
  }
});

// Download Current Expenses
document.getElementById("downloadExpensesBtn")?.addEventListener("click", async () => {
  const url = new URL(window.location.href);
  const groupId = url.searchParams.get("id");

  if (!groupId) return alert("No group selected");

  const res = await fetch(`${API_URL}/expenses/${groupId}/download`, {
    headers: getHeaders()
  });
  if (!res.ok) return alert("Failed to download expenses");

  const blob = await res.blob();
  const url_obj = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url_obj;
  a.download = `group_${groupId}_expenses.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url_obj);
});
