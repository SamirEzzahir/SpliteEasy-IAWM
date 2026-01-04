// Enhanced Balance Page JavaScript
// Ensure config.js is loaded first
if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
  console.error("❌ config.js not loaded! Make sure config.js is loaded before balance.js");
}

// Call it once to initialize when script loads
if (typeof loadAuth === 'function') {
  loadAuth();
} else {
  console.warn("⚠️ loadAuth function not found");
}

const params = new URLSearchParams(window.location.search);
const groupId = params.get("id");

let balancesData = [];

// -----------------------------
// Group Information Loading
// -----------------------------
async function loadGroupInfo() {
  try {
    // Ensure auth is loaded
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
      throw new Error("API configuration not loaded. Please refresh the page.");
    }

    console.log("🔄 Loading group info for group:", groupId);
    const url = `${API_URL}/groups/${groupId}`;
    console.log("🌐 Fetching from:", url);

    const res = await fetch(url, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error response:", errorText);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const group = await res.json();
    console.log("📊 Group info loaded:", group);

    // Update currency display
    const currencyElement = document.getElementById("groupCurrency");
    if (currencyElement) {
      currencyElement.textContent = group.currency || 'USD';
    }

    return group;
  } catch (err) {
    console.error("❌ Error loading group info:", err);
    return null;
  }
}

// -----------------------------
// Utility Functions
// -----------------------------
function showError(message) {
  // Create toast notification
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

  // Add to page
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  toastContainer.appendChild(toast);

  // Show toast
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  // Remove after hide
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

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function getRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge bg-warning"><i class="bi bi-clock me-1"></i>Pending</span>',
    'accepted': '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Accepted</span>',
    'rejected': '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Rejected</span>'
  };
  return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

// -----------------------------
// Load Current User
// -----------------------------
async function loadCurrentUser() {
  try {
    // Ensure loadAuth is available
    if (typeof loadAuth === 'function') {
      loadAuth();
    } else {
      console.error("❌ loadAuth function not found");
      showError("Authentication system not loaded");
      return false;
    }

    // Use the global currentUser from config.js
    if (!currentUser) {
      if (typeof fetchCurrentUser === 'function') {
        currentUser = await fetchCurrentUser();
      } else {
        console.error("❌ fetchCurrentUser function not found");
        showError("User fetch function not available");
        return false;
      }
    }

    if (!currentUser || !currentUser.id) {
      showError("User not authenticated. Please log in.");
      // Redirect to login after a delay
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return false;
    }

    console.log("✅ Current user loaded:", currentUser);
    return true;
  } catch (err) {
    console.error("❌ Error loading current user:", err);
    showError("Failed to load user data: " + err.message);
    return false;
  }
}

// -----------------------------
// Load Summary Statistics
// -----------------------------
function updateSummaryStats(balances) {
  console.log("📊 Updating summary stats with balances:", balances);

  // Use proper rounding to avoid floating-point errors
  const round = (num) => Math.round(num * 100) / 100;

  // Find current user's balance
  const currentUserBalance = balances.find(b => currentUser && b.user_id === currentUser.id);
  const otherUsersBalances = balances.filter(b => !currentUser || b.user_id !== currentUser.id);

  // Balance interpretation:
  // - Positive balance = others owe you
  // - Negative balance = you owe others

  // Total Lent: What others owe YOU
  // = Current user's positive balance (if any) OR sum of other users' negative balances (they owe you)
  // Actually, if current user has +4,480.90, that means others owe them 4,480.90
  // So Total Lent = current user's positive balance
  const totalLent = currentUserBalance && currentUserBalance.net > 0
    ? round(currentUserBalance.net)
    : 0;

  // Total Owed: What YOU owe others
  // = Current user's negative balance (if any)
  // Other users' negative balances mean THEY owe YOU, not that you owe them
  const totalOwed = currentUserBalance && currentUserBalance.net < 0
    ? round(Math.abs(currentUserBalance.net))
    : 0;

  // Net Balance: Current user's balance (positive = others owe you, negative = you owe others)
  const netBalance = currentUserBalance ? round(currentUserBalance.net) : 0;

  console.log("📊 Calculated stats:", {
    totalLent,
    totalOwed,
    netBalance,
    currentUserBalance: currentUserBalance?.net,
    currentUserId: currentUser?.id
  });

  document.getElementById('totalLent').textContent = `${formatCurrency(totalLent)} MAD`;
  document.getElementById('totalOwed').textContent = `${formatCurrency(totalOwed)} MAD`;
  document.getElementById('netBalance').textContent = `${formatCurrency(Math.abs(netBalance) < 0.01 ? 0 : netBalance)} MAD`;
}

// -----------------------------
// Load Balances
// -----------------------------
async function loadBalances() {
  console.log("🔄 Loading balances for group:", groupId);
  const container = document.querySelector("#balancesCards");
  container.innerHTML = `
    <div class="col-12 text-center text-muted py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="mt-2">Loading balances...</div>
    </div>
  `;

  try {
    // Ensure auth is loaded
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    // Check if API_URL is defined
    if (typeof API_URL === 'undefined') {
      throw new Error("API_URL is not defined. Make sure config.js is loaded.");
    }

    // Check if getHeaders is defined
    if (typeof getHeaders === 'undefined') {
      throw new Error("getHeaders function is not defined. Make sure config.js is loaded.");
    }

    const url = `${API_URL}/settle/${groupId}/balances`;
    console.log("🌐 Fetching balances from:", url);
    console.log("🔑 Headers:", getHeaders());

    const res = await fetch(url, {
      headers: getHeaders(),
    });

    console.log("📡 Response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error response:", errorText);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    console.log("📊 Received balances data:", data);
    console.log("📊 Current mode (from user):", currentUser?.global_settlement_mode);
    balancesData = data;

    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = `
        <div class="col-12 text-center text-muted py-5">
          <i class="bi bi-people fs-1 mb-3"></i>
          <h5>No balances found</h5>
          <p>No members have any balances in this group.</p>
        </div>
      `;
      return;
    }

    // Update member count
    document.getElementById('memberCount').textContent = `${data.length} members`;

    // Update summary stats
    updateSummaryStats(data);

    data.forEach((balance) => {
      const color = balance.net > 0 ? "success" : balance.net < 0 ? "danger" : "secondary";
      const icon = balance.net > 0 ? "arrow-up-circle" : balance.net < 0 ? "arrow-down-circle" : "dash-circle";
      const status = balance.net > 0 ? "Lent" : balance.net < 0 ? "Owes" : "Even";

      const isCurrentUser = currentUser && balance.user_id === currentUser.id;

      // Check if we're in hybrid mode and have original/adjustment data
      const isHybridMode = balance.original_net !== undefined && balance.original_net !== null;
      const hasAdjustment = balance.global_adjustment !== undefined && balance.global_adjustment !== null && Math.abs(balance.global_adjustment) >= 0.01;

      const card = document.createElement("div");
      card.className = "col-12 col-sm-6 col-md-4 col-lg-3";

      // Build balance display based on mode
      let balanceDisplay = `
        <p class="card-text fw-bold text-${color} mb-1">
          ${formatCurrency(Math.abs(balance.net))} MAD
        </p>
        <small class="text-muted">${status}</small>
      `;

      // If hybrid mode and has adjustment, show both
      if (isHybridMode && hasAdjustment) {
        const adjustmentColor = balance.global_adjustment > 0 ? "success" : "danger";
        const adjustmentIcon = balance.global_adjustment > 0 ? "arrow-down" : "arrow-up";
        balanceDisplay = `
          <div class="mb-2">
            <p class="card-text fw-bold text-${color} mb-0">
              ${formatCurrency(Math.abs(balance.net))} MAD
            </p>
            <small class="text-muted d-block">${status} (Adjusted)</small>
          </div>
          <div class="border-top pt-2 mt-2">
            <small class="text-muted d-block mb-1">
              <i class="bi bi-info-circle me-1"></i>Original: ${formatCurrency(Math.abs(balance.original_net))} MAD
            </small>
            <small class="text-${adjustmentColor} d-block">
              <i class="bi bi-${adjustmentIcon} me-1"></i>Global adjustment: ${formatCurrency(Math.abs(balance.global_adjustment))} MAD
            </small>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="card border-${color} balance-card shadow-sm h-100 ${isCurrentUser ? 'border-3' : ''}">
          <div class="card-body text-center p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="card-title mb-0 fw-bold">${balance.username}</h6>
              ${isCurrentUser ? '<span class="badge bg-primary">You</span>' : ''}
            </div>
            <div class="mb-2">
              <i class="bi bi-${icon} fs-2 text-${color}"></i>
            </div>
            ${balanceDisplay}
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("❌ Error loading balances:", err);
    let errorMessage = err.message;

    // Provide more helpful error messages
    if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
      errorMessage = "Cannot connect to server. Please check:\n1. Server is running\n2. API_URL is correct\n3. Network connection";
      console.error("🌐 Network error. API_URL:", typeof API_URL !== 'undefined' ? API_URL : 'NOT DEFINED');
    }

    container.innerHTML = `
      <div class="col-12 text-center text-danger py-4">
        <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
        <h5>Error loading balances</h5>
        <p style="white-space: pre-line;">${errorMessage}</p>
        <button class="btn btn-outline-primary" onclick="loadBalances()">
          <i class="bi bi-arrow-clockwise me-1"></i>Retry
        </button>
      </div>
    `;
  }
}

// -----------------------------
// Load Settlements
// -----------------------------
async function loadSettlements() {
  const tbody = document.querySelector("#settlementsTable tbody");
  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center text-muted py-4">
        <div class="spinner-border text-warning" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="mt-2">Loading settlements...</div>
      </td>
    </tr>
  `;

  try {
    // Ensure auth is loaded
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
      throw new Error("API configuration not loaded. Please refresh the page.");
    }

    const url = `${API_URL}/settle/${groupId}/settlements`;
    console.log("🌐 Fetching settlements from:", url);

    const res = await fetch(url, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error response:", errorText);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    tbody.innerHTML = "";

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-success py-4">
            <i class="bi bi-check-circle fs-1 mb-3"></i>
            <h5>All settled up! 🎉</h5>
            <p class="mb-0">No settlements needed</p>
          </td>
        </tr>
      `;
      document.getElementById('settlementCount').textContent = '0 suggestions';
      return;
    }

    // Update settlement count
    document.getElementById('settlementCount').textContent = `${data.length} suggestions`;

    data.forEach((settlement) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <div class="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
              <i class="bi bi-person"></i>
            </div>
            <span class="fw-semibold">${settlement.from_username}</span>
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div class="rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
              <i class="bi bi-person-check"></i>
            </div>
            <span class="fw-semibold">${settlement.to_username}</span>
          </div>
        </td>
        <td>
          <span class="badge bg-warning text-dark fs-6">
            ${formatCurrency(settlement.amount)} MAD
          </span>
        </td>
        <td>
          <button class="btn btn-outline-primary btn-sm" onclick="quickSettle('${settlement.from_username}', '${settlement.to_username}', ${settlement.amount})">
            <i class="bi bi-lightning me-1"></i>Quick Settle
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Error loading settlements:", err);
    let errorMessage = err.message;

    if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
      errorMessage = "Cannot connect to server. Please check your connection and try again.";
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-danger py-4">
          <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
          <h5>Error loading settlements</h5>
          <p>${errorMessage}</p>
          <button class="btn btn-outline-primary" onclick="loadSettlements()">
            <i class="bi bi-arrow-clockwise me-1"></i>Retry
          </button>
        </td>
      </tr>
    `;
  }
}

// -----------------------------
// Load History
// -----------------------------
async function loadHistory() {
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted py-4">
        <div class="spinner-border text-info" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="mt-2">Loading history...</div>
      </td>
    </tr>
  `;

  try {
    // Ensure auth is loaded
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
      throw new Error("API configuration not loaded. Please refresh the page.");
    }

    const url = `${API_URL}/settle/${groupId}/history`;
    console.log("🌐 Fetching history from:", url);

    const res = await fetch(url, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error response:", errorText);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    tbody.innerHTML = "";

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">
            <i class="bi bi-clock-history fs-1 mb-3"></i>
            <h5>No settlement history</h5>
            <p class="mb-0">No settlements have been recorded yet</p>
          </td>
        </tr>
      `;
      document.getElementById('historyCount').textContent = '0 records';
      return;
    }

    // Update history count
    document.getElementById('historyCount').textContent = `${data.length} records`;

    data.forEach((settlement) => {
      const statusBadge = getStatusBadge(settlement.status);
      const isFromCurrentUser = settlement.from_user_id === currentUser.id;
      const isToCurrentUser = settlement.to_user_id === currentUser.id;

      // Show action buttons based on status and user role
      let actionButtons = '';
      if (settlement.status === 'pending' && isToCurrentUser) {
        // User is recipient and can accept/reject
        actionButtons = `
          <button class="btn btn-sm btn-success me-1" onclick="acceptSettlement(${settlement.id})">
            <i class="bi bi-check-circle me-1"></i>Accept
          </button>
          <button class="btn btn-sm btn-danger" onclick="rejectSettlement(${settlement.id})">
            <i class="bi bi-x-circle me-1"></i>Reject
          </button>
        `;
      } else if (settlement.status === 'rejected' && isFromCurrentUser) {
        // User is sender and can resend rejected settlement
        actionButtons = `
          <button class="btn btn-sm btn-outline-primary" onclick="resendSettlement(${settlement.id}, ${settlement.to_user_id}, ${settlement.amount})">
            <i class="bi bi-arrow-repeat me-1"></i>Resend
          </button>
        `;
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <div class="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center me-2" style="width: 28px; height: 28px;">
              <i class="bi bi-person" style="font-size: 0.75rem;"></i>
            </div>
            <span>${settlement.from_username}</span>
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div class="rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-2" style="width: 28px; height: 28px;">
              <i class="bi bi-person-check" style="font-size: 0.75rem;"></i>
            </div>
            <span>${settlement.to_username}</span>
          </div>
        </td>
        <td>
          <span class="fw-semibold text-success">
            ${formatCurrency(settlement.amount)} MAD
          </span>
        </td>
        <td>
          ${statusBadge}
          ${settlement.rejected_reason ? `<br><small class="text-muted">Reason: ${settlement.rejected_reason}</small>` : ''}
        </td>
        <td>
          <small class="text-muted">${getRelativeTime(settlement.created_at)}</small>
        </td>
        <td>
          ${actionButtons}
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Error loading history:", err);
    let errorMessage = err.message;

    if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
      errorMessage = "Cannot connect to server. Please check your connection and try again.";
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger py-4">
          <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
          <h5>Error loading history</h5>
          <p>${errorMessage}</p>
          <button class="btn btn-outline-primary" onclick="loadHistory()">
            <i class="bi bi-arrow-clockwise me-1"></i>Retry
          </button>
        </td>
      </tr>
    `;
  }
}

// -----------------------------
// Settlement Modal Functions
// -----------------------------
function openSettlementModal() {
  if (!balancesData || !currentUser) {
    showError("User data missing — please refresh the page");
    return;
  }

  const select = document.getElementById("toUserSelect");
  const amountInput = document.getElementById("settleAmount");
  const messageInput = document.getElementById("settlementMessage");
  const currentBalanceEl = document.getElementById("currentBalance");

  // Reset form
  select.innerHTML = '<option value="">Select a member...</option>';
  amountInput.value = "";
  messageInput.value = "";

  // Reset preview
  updateNewSettlementPreview(0, null);

  // Get current user's balance
  const myBalance = balancesData.find(b => b.user_id === currentUser.id);
  if (!myBalance) {
    showError("Your balance info is missing");
    return;
  }

  // Update current balance display
  const balanceColor = myBalance.net > 0 ? "text-success" : myBalance.net < 0 ? "text-danger" : "text-muted";
  const balanceIcon = myBalance.net > 0 ? "arrow-up-circle" : myBalance.net < 0 ? "arrow-down-circle" : "dash-circle";

  if (currentBalanceEl) {
    currentBalanceEl.innerHTML = `
      <span class="${balanceColor}">
        <i class="bi bi-${balanceIcon} me-1"></i>
        ${formatCurrency(Math.abs(myBalance.net))} MAD
        ${myBalance.net > 0 ? '(You lent)' : myBalance.net < 0 ? '(You owe)' : '(Even)'}
      </span>
    `;
  }

  // User owes money (negative balance)
  if (myBalance.net < 0) {
    // Show users who are owed money (net > 0)
    const creditors = balancesData.filter(b => b.net > 0 && b.user_id !== currentUser.id);

    if (creditors.length === 0) {
      const option = document.createElement("option");
      option.textContent = "No users to settle with";
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
    } else {
      creditors.forEach(b => {
        const myDebt = Math.min(Math.abs(myBalance.net), b.net);
        const option = document.createElement("option");
        option.value = b.user_id;
        option.textContent = `${b.username} (You owe ${formatCurrency(myDebt)} MAD)`;
        option.dataset.amount = myDebt.toFixed(2);
        option.dataset.username = b.username;
        select.appendChild(option);
      });
    }
  } else {
    const option = document.createElement("option");
    option.textContent = "You have no debts to settle ✅";
    option.disabled = true;
    option.selected = true;
    select.appendChild(option);
  }

  // Auto-fill amount and show preview on selection change
  select.addEventListener("change", () => {
    const selected = select.options[select.selectedIndex];
    if (selected.dataset.amount) {
      amountInput.value = selected.dataset.amount;
      updateNewSettlementPreview(selected.dataset.amount, selected.dataset.username);
    } else {
      updateNewSettlementPreview(amountInput.value || 0, null);
    }
  });

  // Update preview when amount changes
  amountInput.addEventListener("input", () => {
    const selected = select.options[select.selectedIndex];
    const username = selected.value ? (selected.dataset.username || selected.textContent.split(' (')[0]) : null;
    updateNewSettlementPreview(amountInput.value || 0, username);
  });

  // Open modal
  const modal = new bootstrap.Modal(document.getElementById("recordSettlementModal"));
  modal.show();
}

function updateNewSettlementPreview(amount, recipientName) {
  const displayAmount = parseFloat(amount) || 0;
  const name = recipientName || "Recipient";

  // Update Amount Display
  const amountDisplay = document.getElementById("previewAmountDisplay");
  if (amountDisplay) amountDisplay.textContent = `${formatCurrency(displayAmount)} MAD`;

  // Update Recipient Name
  const nameDisplay = document.getElementById("previewRecipientName");
  if (nameDisplay) nameDisplay.textContent = name;

  // Update Recipient Avatar
  const avatarDisplay = document.getElementById("previewRecipientAvatar");
  if (avatarDisplay) {
    if (recipientName) {
      const initials = recipientName.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
      avatarDisplay.textContent = initials;
      avatarDisplay.classList.remove("bg-secondary");
      avatarDisplay.classList.add("bg-success");
    } else {
      avatarDisplay.textContent = "?";
      avatarDisplay.classList.remove("bg-success");
      avatarDisplay.classList.add("bg-secondary");
    }
  }

  // Update Text Description
  const amountText = document.getElementById("previewAmountText");
  if (amountText) amountText.textContent = `${formatCurrency(displayAmount)} MAD`;

  const recipientText = document.getElementById("previewRecipientText");
  if (recipientText) recipientText.textContent = name === "Recipient" ? "..." : name;
}

function updateSettlementPreview(userName, amount) {
  const preview = document.getElementById("settlementPreview");
  const previewAmount = document.getElementById("previewAmount");
  const previewUser = document.getElementById("previewUser");

  previewAmount.textContent = `${formatCurrency(parseFloat(amount))} MAD`;
  previewUser.textContent = userName;
  preview.style.display = "block";
}

// Quick settle function
function quickSettle(fromUser, toUser, amount) {
  if (!currentUser) {
    showError("User not authenticated");
    return;
  }

  // Check if current user is involved in this settlement
  const fromUserData = balancesData.find(b => b.username === fromUser);
  const toUserData = balancesData.find(b => b.username === toUser);

  if (!fromUserData || !toUserData) {
    showError("User data not found");
    return;
  }

  // Only allow if current user is the one who owes money
  if (fromUserData.user_id !== currentUser.id) {
    showError("You can only settle your own debts");
    return;
  }

  // Pre-fill the settlement modal
  const select = document.getElementById("toUserSelect");
  const amountInput = document.getElementById("settleAmount");

  // Open modal first
  openSettlementModal();

  // Wait for modal to be ready, then pre-fill
  setTimeout(() => {
    select.value = toUserData.user_id;
    amountInput.value = amount.toFixed(2);
    updateSettlementPreview(toUser, amount.toFixed(2));
  }, 300);
}

// -----------------------------
// Form Submission
// -----------------------------
function setupSettlementForm() {
  const form = document.getElementById("settlementForm");
  form.onsubmit = async (e) => {
    e.preventDefault();

    const select = document.getElementById("toUserSelect");
    const amountInput = document.getElementById("settleAmount");
    const submitBtn = form.querySelector('button[type="submit"]');

    // Validation
    if (!select.value) {
      showError("Please select a member to settle with");
      return;
    }

    if (!amountInput.value || parseFloat(amountInput.value) <= 0) {
      showError("Please enter a valid amount");
      return;
    }

    const messageInput = document.getElementById("settlementMessage");
    const payload = {
      to_user_id: parseInt(select.value),
      amount: parseFloat(amountInput.value),
      message: messageInput ? messageInput.value.trim() || null : null,
    };

    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Recording...';
    submitBtn.disabled = true;

    try {
      // Ensure auth is loaded
      if (typeof loadAuth === 'function') {
        loadAuth();
      }

      if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
        throw new Error("API configuration not loaded. Please refresh the page.");
      }

      console.log("🔄 Recording settlement with payload:", payload);
      const url = `${API_URL}/settle/${groupId}/record`;
      console.log("🌐 POST to:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      console.log("📡 Settlement response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Settlement error:", errorData);
        throw new Error(errorData.detail || "Failed to record settlement");
      }

      const result = await res.json();
      console.log("✅ Settlement recorded successfully:", result);
      showSuccess("Settlement request sent! Waiting for confirmation.");

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById("recordSettlementModal"));
      if (modal) modal.hide();

      // Refresh all data
      await Promise.all([loadBalances(), loadSettlements(), loadHistory()]);

    } catch (err) {
      console.error("❌ Error recording settlement:", err);
      showError(err.message || "Failed to record settlement");
    } finally {
      // Restore button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  };
}

// -----------------------------
// Initialize Page
// -----------------------------
// -----------------------------
// Global Settlement Mode Management
// -----------------------------
async function loadSettlementMode() {
  try {
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
      return;
    }

    // Get current user to check their mode preference
    if (currentUser && currentUser.global_settlement_mode) {
      const mode = currentUser.global_settlement_mode;
      const radio = document.querySelector(`input[name="settlementMode"][value="${mode}"]`);
      if (radio) {
        radio.checked = true;
      }
    }
  } catch (err) {
    console.error("Error loading settlement mode:", err);
  }
}

async function updateSettlementMode(mode) {
  try {
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
      throw new Error("API configuration not loaded");
    }

    const url = `${API_URL}/users/user/me/global-settlement-mode`;
    const res = await fetch(url, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ mode: mode })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to update mode");
    }

    const updatedUser = await res.json();
    console.log("✅ Mode updated. Updated user:", updatedUser);
    console.log("✅ New mode:", updatedUser.global_settlement_mode);

    if (currentUser) {
      currentUser.global_settlement_mode = updatedUser.global_settlement_mode;
      console.log("✅ Current user mode updated to:", currentUser.global_settlement_mode);
    }

    showSuccess("Settlement mode updated! Reloading balances...");

    // Small delay to ensure backend has the updated mode
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reload balances with new mode
    await Promise.all([loadBalances(), loadSettlements()]);
  } catch (err) {
    console.error("Error updating settlement mode:", err);
    showError(err.message || "Failed to update settlement mode");
  }
}

function setupSettlementModeSelector() {
  const radios = document.querySelectorAll('input[name="settlementMode"]');
  radios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await updateSettlementMode(e.target.value);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("🚀 Initializing balance page...");

    // Check if config.js is loaded
    if (typeof API_URL === 'undefined') {
      console.error("❌ API_URL is not defined. config.js may not be loaded.");
      showError("Configuration not loaded. Please refresh the page.");
      return;
    }

    if (typeof getHeaders === 'undefined') {
      console.error("❌ getHeaders is not defined. config.js may not be loaded.");
      showError("Authentication functions not loaded. Please refresh the page.");
      return;
    }

    console.log("✅ Config loaded. API_URL:", API_URL);
    console.log("📍 Group ID from URL:", groupId);

    if (!groupId) {
      showError("No group ID found in URL. Please access this page from a group.");
      return;
    }

    // Load auth first
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    // Load current user first
    const userLoaded = await loadCurrentUser();
    if (!userLoaded) {
      console.error("❌ Failed to load current user");
      return;
    }

    console.log("👤 Current user loaded:", currentUser);

    // Load all data
    await Promise.all([
      loadGroupInfo(),
      loadBalances(),
      loadSettlements(),
      loadHistory()
    ]);

    // Setup event listeners
    document.getElementById("routerToExpenses").addEventListener("click", () => {
      window.location.href = `expenses.html?id=${groupId}`;
    });

    document.getElementById("recordBtn").addEventListener("click", openSettlementModal);

    // Setup settlement form
    setupSettlementForm();

    // Setup settlement mode selector
    setupSettlementModeSelector();
    await loadSettlementMode();

    console.log("✅ Balance page initialized successfully");

  } catch (err) {
    console.error("❌ Error initializing balance page:", err);
    showError("Failed to load balance page");
  }
});

// -----------------------------
// Accept Settlement
// -----------------------------
async function acceptSettlement(settlementId) {
  if (!confirm("Are you sure you want to accept this settlement?")) {
    return;
  }

  try {
    // Ensure auth is loaded
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
    await Promise.all([loadBalances(), loadSettlements(), loadHistory()]);
  } catch (err) {
    console.error("Error accepting settlement:", err);
    showError(err.message || "Failed to accept settlement");
  }
}

// -----------------------------
// Reject Settlement
// -----------------------------
async function rejectSettlement(settlementId) {
  const reason = prompt("Please provide a reason for rejecting this settlement (optional):");

  if (reason === null) {
    return; // User cancelled
  }

  try {
    // Ensure auth is loaded
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
    await Promise.all([loadBalances(), loadSettlements(), loadHistory()]);
  } catch (err) {
    console.error("Error rejecting settlement:", err);
    showError(err.message || "Failed to reject settlement");
  }
}

// -----------------------------
// Resend Settlement
// -----------------------------
async function resendSettlement(settlementId, toUserId, currentAmount) {
  const newAmount = prompt("Enter the amount (or leave empty to keep current):", currentAmount);
  if (newAmount === null) {
    return; // User cancelled
  }

  const amount = newAmount ? parseFloat(newAmount) : currentAmount;
  if (isNaN(amount) || amount <= 0) {
    showError("Invalid amount");
    return;
  }

  const message = prompt("Add a message (optional):");

  try {
    // Ensure auth is loaded
    if (typeof loadAuth === 'function') {
      loadAuth();
    }

    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined') {
      throw new Error("API configuration not loaded. Please refresh the page.");
    }

    const url = `${API_URL}/settle/${settlementId}/resend`;
    console.log("🌐 POST to:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        to_user_id: toUserId,
        amount: amount,
        message: message || null
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to resend settlement");
    }

    showSuccess("Settlement resent successfully!");
    await Promise.all([loadBalances(), loadSettlements(), loadHistory()]);
  } catch (err) {
    console.error("Error resending settlement:", err);
    showError(err.message || "Failed to resend settlement");
  }
}
