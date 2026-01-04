// Global variables (using currentUser from config.js)
let currentUserId = null;
let allExpenses = [];
let filteredExpenses = [];

// Pagination state
let paginationState = {
  currentPage: 1,
  itemsPerPage: 10,
  totalItems: 0,
  totalPages: 0
};

// Participant filter state
let selectedParticipants = [];
let availableParticipants = [];
let allFriends = []; // Store friends list for autocomplete

document.addEventListener("DOMContentLoaded", async () => {
  loadAuth(); // Loads currentUser from config.js
  currentUserId = currentUser ? currentUser.id : null;
  await loadDashboard();
  await loadAllExpenses();
});

async function loadDashboard() {
  try {
    const res = await fetch(`${API_URL}/dashboard/summary`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to load dashboard");
    const data = await res.json();

    document.getElementById("totalIncome").textContent = `${data.total_income.toFixed(2)} MAD`;
    document.getElementById("totalExpense").textContent = `${data.total_expense.toFixed(2)} MAD`;
    document.getElementById("netBalance").textContent = `${data.net_balance.toFixed(2)} MAD`;

    // Render list
    const list = document.getElementById("recentExpensesList");
    list.innerHTML = "";
    data.recent_expenses.forEach(e => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between";
      li.innerHTML = `
        <span>${e.description}</span>
        <span>${e.amount.toFixed(2)} ${e.currency}</span>
      `;
      list.appendChild(li);
    });

  } catch (err) {
    console.error(err);
    alert("Error loading dashboard!");
  }
}


// ----------------------------
// Load all expenses
// ----------------------------
async function loadAllExpenses() {
  try {
    console.log("🔄 Loading all expenses...");
    
    // Use currentUser from config.js (already loaded via loadAuth())
    // Ensure it's loaded
    loadAuth();
    currentUserId = currentUser ? currentUser.id : null;
    
    if (!currentUserId) {
      console.error("❌ No current user ID found");
      showError("Please log in to view expenses");
      const tableBody = document.getElementById("allExpensesTableBody");
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center text-muted py-4">
              <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
              Please log in to view expenses.
            </td>
          </tr>
        `;
      }
      return;
    }
    
    console.log("👤 Current user ID:", currentUserId);
    
    const url = `${API_URL}/expenses/all`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const allExpensesData = await res.json();
    console.log("✅ All expenses loaded:", allExpensesData.length, "expenses");
    
    // Enrich splits with usernames if they're missing
    // The backend might load user objects but not populate username field
    allExpensesData.forEach(expense => {
      if (expense.splits && Array.isArray(expense.splits)) {
        expense.splits.forEach(split => {
          // If username is missing but user object exists, extract it
          if (!split.username && split.user && split.user.username) {
            split.username = split.user.username;
          }
        });
      }
    });
    
    // Debug: Check structure of first expense splits
    if (allExpensesData.length > 0 && allExpensesData[0].splits) {
      console.log("📦 First expense splits structure:", {
        expense_id: allExpensesData[0].id,
        description: allExpensesData[0].description,
        splits_count: allExpensesData[0].splits.length,
        first_split: allExpensesData[0].splits[0],
        all_split_usernames: allExpensesData[0].splits.map(s => ({
          username: s.username,
          user_id: s.user_id,
          has_user_obj: !!s.user,
          user_username: s.user?.username
        }))
      });
    }
    
    // The API already filters by membership, so we can use all expenses
    // Optionally filter by splits if you only want expenses where user has a split
    const userExpenses = allExpensesData.filter(expense => {
      // Check if the current user has a split in this expense
      // If splits array is missing or empty, still show the expense (user is member of group)
      if (!expense.splits || expense.splits.length === 0) {
        return true; // Show expense if user is member of group, even without splits
      }
      const hasSplit = expense.splits.some(split => split.user_id === currentUserId);
      return hasSplit;
    });
    
    console.log("✅ User's expenses after filtering:", userExpenses.length, "expenses");

    allExpenses = userExpenses;
    console.log("📊 Stored expenses in allExpenses:", allExpenses.length);
    
    // Load friends for participant filter
    await loadFriends();
    
    // Extract all unique participants from expenses (for reference)
    extractParticipants(userExpenses);
    
    setupFilters(userExpenses);
    console.log("🔍 Calling applyFilters()...");
    applyFilters();
    console.log("✅ applyFilters() completed");

  } catch (err) {
    console.error("❌ Error loading expenses:", err);
    showError("Failed to load expenses: " + err.message);
    
    // Show error in table
    const tableBody = document.getElementById("allExpensesTableBody");
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-danger py-4">
            <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
            Error loading expenses: ${err.message}
          </td>
        </tr>
      `;
    }
  }
}

// ----------------------------
// Load friends list for autocomplete
// ----------------------------
async function loadFriends() {
  try {
    console.log("🔄 Loading friends list...");
    const res = await fetch(`${API_URL}/friends/my`, {
      headers: getHeaders()
    });
    
    if (!res.ok) {
      console.warn("⚠️ Failed to load friends:", res.status);
      allFriends = [];
      return;
    }
    
    const friends = await res.json();
    allFriends = friends.map(f => f.username).filter(Boolean).sort();
    console.log("✅ Friends loaded:", allFriends.length, "friends");
    
    // Setup participant filter after friends are loaded
    setupParticipantFilter();
  } catch (err) {
    console.error("❌ Error loading friends:", err);
    allFriends = [];
    setupParticipantFilter();
  }
}

// ----------------------------
// Extract participants from expenses (for reference)
// ----------------------------
function extractParticipants(expenses) {
  const participantSet = new Set();
  
  expenses.forEach(expense => {
    if (expense.splits && Array.isArray(expense.splits)) {
      expense.splits.forEach(split => {
        if (split.username) {
          participantSet.add(split.username);
        }
      });
    }
  });
  
  // Combine with friends list
  const expenseParticipants = Array.from(participantSet);
  availableParticipants = [...new Set([...allFriends, ...expenseParticipants])].sort();
}

// ----------------------------
// Setup participant filter UI with autocomplete
// ----------------------------
function setupParticipantFilter() {
  const participantInput = document.getElementById("participantInput");
  const participantTags = document.getElementById("participantTags");
  const participantDropdown = document.getElementById("participantDropdown");
  const participantFilter = document.getElementById("participantFilter");
  
  if (!participantInput || !participantTags || !participantDropdown || !participantFilter) {
    console.warn("⚠️ Participant filter elements not found");
    return;
  }
  
  // Render selected tags
  renderParticipantTags();
  
  // Clear any existing event listeners by cloning the input
  const newInput = participantInput.cloneNode(true);
  participantInput.parentNode.replaceChild(newInput, participantInput);
  const input = document.getElementById("participantInput");
  
  // Handle input for autocomplete search
  input.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim();
    
    if (searchTerm.length === 0) {
      participantDropdown.classList.remove("show");
      return;
    }
    
    // Filter friends that match (starts with or contains, prioritize starts with)
    const searchLower = searchTerm.toLowerCase();
    const filtered = allFriends
      .filter(friend => {
        const friendLower = friend.toLowerCase();
        return friendLower.includes(searchLower) && !selectedParticipants.includes(friend);
      })
      .sort((a, b) => {
        // Prioritize names that start with the search term
        const aStarts = a.toLowerCase().startsWith(searchLower);
        const bStarts = b.toLowerCase().startsWith(searchLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 10); // Limit to 10 suggestions
    
    if (filtered.length === 0) {
      participantDropdown.classList.remove("show");
      return;
    }
    
    // Show dropdown with suggestions
    participantDropdown.innerHTML = filtered.map(friend => `
      <div class="participant-dropdown-item" data-username="${friend}">
        <i class="bi bi-person me-2"></i>${friend}
      </div>
    `).join("");
    
    participantDropdown.classList.add("show");
    
    // Add click handlers for suggestions
    participantDropdown.querySelectorAll(".participant-dropdown-item").forEach(item => {
      item.addEventListener("click", () => {
        const username = item.dataset.username;
        addParticipantTag(username);
      });
    });
  });
  
  // Handle Enter key or comma to add tag
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      // If dropdown is open and an item is selected, use that
      const selected = participantDropdown.querySelector(".participant-dropdown-item.selected");
      if (selected && participantDropdown.classList.contains("show")) {
        const username = selected.dataset.username;
        addParticipantTag(username);
        return;
      }
      
      // Otherwise, try to add the typed text
      const searchTerm = e.target.value.trim();
      if (searchTerm.length === 0) return;
      
      // Check if it's an exact match in friends
      const exactMatch = allFriends.find(f => f.toLowerCase() === searchTerm.toLowerCase());
      if (exactMatch && !selectedParticipants.includes(exactMatch)) {
        addParticipantTag(exactMatch);
      } else if (searchTerm && !selectedParticipants.includes(searchTerm)) {
        // Allow adding even if not in friends list
        addParticipantTag(searchTerm);
      }
    }
    
    // Handle comma to add tag
    if (e.key === ",") {
      e.preventDefault();
      const searchTerm = e.target.value.trim();
      if (searchTerm.length === 0) return;
      
      const exactMatch = allFriends.find(f => f.toLowerCase() === searchTerm.toLowerCase());
      if (exactMatch && !selectedParticipants.includes(exactMatch)) {
        addParticipantTag(exactMatch);
      } else if (searchTerm && !selectedParticipants.includes(searchTerm)) {
        addParticipantTag(searchTerm);
      }
    }
    
    // Handle Escape to close dropdown
    if (e.key === "Escape") {
      participantDropdown.classList.remove("show");
      input.blur();
    }
    
    // Handle Arrow keys for navigation (optional enhancement)
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = participantDropdown.querySelectorAll(".participant-dropdown-item");
      if (items.length === 0) return;
      
      const current = participantDropdown.querySelector(".participant-dropdown-item.selected");
      let next;
      
      if (e.key === "ArrowDown") {
        if (current) {
          next = current.nextElementSibling || items[0];
          current.classList.remove("selected");
        } else {
          next = items[0];
        }
      } else {
        if (current) {
          next = current.previousElementSibling || items[items.length - 1];
          current.classList.remove("selected");
        } else {
          next = items[items.length - 1];
        }
      }
      
      next.classList.add("selected");
      next.scrollIntoView({ block: "nearest" });
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!participantFilter.contains(e.target)) {
      participantDropdown.classList.remove("show");
    }
  });
  
  // Handle focus to show suggestions if there's text
  input.addEventListener("focus", () => {
    if (input.value.trim().length > 0) {
      input.dispatchEvent(new Event("input"));
    }
  });
}

// ----------------------------
// Add participant tag
// ----------------------------
function addParticipantTag(username) {
  if (!username || selectedParticipants.includes(username)) return;
  
  selectedParticipants.push(username);
  const participantInput = document.getElementById("participantInput");
  if (participantInput) {
    participantInput.value = "";
  }
  const participantDropdown = document.getElementById("participantDropdown");
  if (participantDropdown) {
    participantDropdown.classList.remove("show");
  }
  
  renderParticipantTags();
  applyFilters();
}

// ----------------------------
// Render participant tags
// ----------------------------
function renderParticipantTags() {
  const participantTags = document.getElementById("participantTags");
  if (!participantTags) return;
  
  participantTags.innerHTML = selectedParticipants.map(username => `
    <span class="participant-tag">
      ${username}
      <span class="tag-remove" data-username="${username}">×</span>
    </span>
  `).join("");
  
  // Add remove handlers
  participantTags.querySelectorAll(".tag-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const username = e.target.dataset.username;
      selectedParticipants = selectedParticipants.filter(p => p !== username);
      renderParticipantTags();
      applyFilters();
    });
  });
}

// ----------------------------
// Render table with pagination
// ----------------------------
async function renderExpensesTable(expenses) {
  try {
    console.log("🎨 renderExpensesTable() called with", expenses ? expenses.length : 0, "expenses");
    console.log("🎨 expenses type:", typeof expenses, "isArray:", Array.isArray(expenses));
    
    // Ensure expenses is an array
    if (!Array.isArray(expenses)) {
      console.error("❌ expenses is not an array:", expenses);
      expenses = [];
    }
    
    // Use currentUser from config.js (already loaded via loadAuth())
    // Ensure it's loaded
    loadAuth();
    currentUserId = currentUser ? currentUser.id : null;
    
    if (!currentUserId) {
      console.error("❌ No current user ID found");
      showError("Please log in to view expenses");
      return;
    }
    
    const tableBody = document.getElementById("allExpensesTableBody");
    
    if (!tableBody) {
      console.error("❌ Table body not found!");
      return;
    }

    console.log("🧹 Clearing table body...");
    tableBody.innerHTML = "";

    // Update pagination state
    paginationState.totalItems = expenses.length;
    paginationState.totalPages = Math.ceil(expenses.length / paginationState.itemsPerPage);
  
  if (paginationState.totalPages === 0) {
    paginationState.totalPages = 1;
  }
  
  // Get expenses for current page
  const startIndex = (paginationState.currentPage - 1) * paginationState.itemsPerPage;
  const endIndex = startIndex + paginationState.itemsPerPage;
  const paginatedExpenses = expenses.slice(startIndex, endIndex);
  
  if (!Array.isArray(paginatedExpenses) || paginatedExpenses.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          No expenses found.
        </td>
      </tr>
    `;
    renderPagination();
    return;
  }

  paginatedExpenses.forEach((expense, index) => {
    const row = document.createElement("tr");
    row.className = "fade-in";
    row.style.animationDelay = `${index * 0.05}s`;

    const date = expense.created_at
      ? new Date(expense.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

    // ✅ Find the current user's share_amount for this expense
    let shareAmount = "—";
    if (Array.isArray(expense.splits)) {
      const userSplit = expense.splits.find(
        (s) => s.user_id === currentUserId
      );
      if (userSplit) {
        shareAmount = userSplit.share_amount
          ? userSplit.share_amount.toFixed(2)
          : "0.00";
      }
    }
    const amount = expense.amount ? expense.amount.toFixed(2) : "0.00";
    const currency = expense.currency || "MAD";

    // ✅ Render row
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <i class="bi bi-calendar3 me-2 text-muted"></i>
          <span>${date}</span>
        </div>
      </td>
      <td>
        <div class="d-flex align-items-center">
          <div class="badge bg-primary me-2">${expense.group_name || "Unknown"}</div>
        </div>
      </td>
      <td>
        <div class="fw-semibold">${expense.description || "—"}</div>
        ${
          expense.category
            ? `<small class="text-muted">${expense.category}</small>`
            : ""
        }
      </td>
      <td>
        <div class="fw-bold text-success">${amount} ${currency}</div>
      </td>
      <td>
        <div class="fw-bold text-success">${shareAmount} ${currency}</div>
      </td>
      <td>
        <div class="d-flex align-items-center">
          <div
            class="avatar rounded-circle bg-info text-white d-flex align-items-center justify-content-center me-2"
            style="width:32px;height:32px;font-size:0.8rem;font-weight:bold;"
          >
            ${(expense.payer_name || "U").charAt(0).toUpperCase()}
          </div>
          <span>${expense.payer_name || "Unknown"}</span>
        </div>
      </td>
      <td>
        <div class="d-flex align-items-center">
          <div
            class="avatar rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2"
            style="width:32px;height:32px;font-size:0.8rem;font-weight:bold;"
          >
            ${(expense.added_by_username || "U").charAt(0).toUpperCase()}
          </div>
          <span>${expense.added_by_username || "Unknown"}</span>
        </div>
      </td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="viewExpense(${
            expense.id
          })" title="View Details">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-outline-secondary" onclick="editExpense(${
            expense.id
          })" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });
  
  renderPagination();
  } catch (err) {
    console.error("❌ Error rendering expenses table:", err);
    const tableBody = document.getElementById("allExpensesTableBody");
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-danger py-4">
            <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
            Error rendering expenses: ${err.message}
          </td>
        </tr>
      `;
    }
  }
}

// ----------------------------
// Render pagination buttons
// ----------------------------
function renderPagination() {
  const paginationContainer = document.getElementById("paginationContainer");
  if (!paginationContainer) return;
  
  if (paginationState.totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }
  
  let paginationHTML = "";
  
  // Previous button
  paginationHTML += `
    <button class="pagination-btn ${paginationState.currentPage === 1 ? 'disabled' : ''}" 
            ${paginationState.currentPage === 1 ? 'disabled' : ''} 
            onclick="goToPage(${paginationState.currentPage - 1})">
      <i class="bi bi-chevron-left"></i>
    </button>
  `;
  
  // Page number buttons
  const maxVisiblePages = 7;
  let startPage = Math.max(1, paginationState.currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(paginationState.totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="pagination-btn disabled">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="pagination-btn ${i === paginationState.currentPage ? 'active' : ''}" 
              onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }
  
  if (endPage < paginationState.totalPages) {
    if (endPage < paginationState.totalPages - 1) {
      paginationHTML += `<span class="pagination-btn disabled">...</span>`;
    }
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(${paginationState.totalPages})">${paginationState.totalPages}</button>`;
  }
  
  // Next button
  paginationHTML += `
    <button class="pagination-btn ${paginationState.currentPage === paginationState.totalPages ? 'disabled' : ''}" 
            ${paginationState.currentPage === paginationState.totalPages ? 'disabled' : ''} 
            onclick="goToPage(${paginationState.currentPage + 1})">
      <i class="bi bi-chevron-right"></i>
    </button>
  `;
  
  paginationContainer.innerHTML = paginationHTML;
}

// ----------------------------
// Go to specific page
// ----------------------------
function goToPage(page) {
  if (page < 1 || page > paginationState.totalPages) return;
  
  paginationState.currentPage = page;
  
  // Re-render table with current filtered expenses (don't re-apply filters)
  renderExpensesTable(filteredExpenses);
  
  // Scroll to top of table
  const table = document.getElementById("allExpensesTableBody");
  if (table) {
    table.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ----------------------------
// Setup filters (real time)
// ----------------------------
function setupFilters(expenses) {
  const fromInput = document.getElementById("filterFrom");
  const toInput = document.getElementById("filterTo");
  const groupSelect = document.getElementById("filterGroup");
  const titleInput = document.getElementById("filterTitle");
  const clearBtn = document.getElementById("clearFilters");

  // Populate group list
  const groups = [...new Set(expenses.map(e => e.group_name).filter(Boolean))];
  groupSelect.innerHTML = `<option value="">All Groups</option>`;
  groups.forEach(group => {
    groupSelect.insertAdjacentHTML("beforeend", `<option value="${group}">${group}</option>`);
  });

  // Add event listeners
  [fromInput, toInput, groupSelect, titleInput].forEach(el => {
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", clearAllFilters);
  }

  // Store original expenses for filtering
  window.originalExpenses = expenses;
}

// ----------------------------
// Apply all filters
// ----------------------------
function applyFilters() {
  try {
    console.log("🔍 applyFilters() called, allExpenses length:", allExpenses ? allExpenses.length : 0);
    
    const fromInput = document.getElementById("filterFrom");
    const toInput = document.getElementById("filterTo");
    const groupSelect = document.getElementById("filterGroup");
    const titleInput = document.getElementById("filterTitle");
    
    if (!fromInput || !toInput || !groupSelect || !titleInput) {
      console.warn("⚠️ Filter inputs not found", { fromInput: !!fromInput, toInput: !!toInput, groupSelect: !!groupSelect, titleInput: !!titleInput });
      return;
    }
    
    if (!allExpenses || allExpenses.length === 0) {
      console.warn("⚠️ No expenses to filter");
      const tableBody = document.getElementById("allExpensesTableBody");
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center text-muted py-4">
              <i class="bi bi-inbox fs-1 d-block mb-2"></i>
              No expenses found.
            </td>
          </tr>
        `;
        updateExpenseCount(0);
      }
      return;
    }
  
  const from = fromInput.value ? new Date(fromInput.value) : null;
  const to = toInput.value ? new Date(toInput.value) : null;
  const group = groupSelect.value;
  const title = titleInput.value.toLowerCase();

  filteredExpenses = allExpenses.filter(expense => {
    const expenseDate = expense.created_at ? new Date(expense.created_at) : null;
    
    // Date filtering: if both dates are set, expense must be between them
    // If only one is set, we don't filter by date
    let matchesDate = true;
    if (from && to && expenseDate) {
      matchesDate = expenseDate >= from && expenseDate <= to;
    } else if (from && expenseDate) {
      matchesDate = expenseDate >= from;
    } else if (to && expenseDate) {
      matchesDate = expenseDate <= to;
    }
    
    const matchesGroup = !group || expense.group_name === group;
    const matchesTitle = !title || (expense.description && expense.description.toLowerCase().includes(title));
    
    // Filter by participants
    let matchesParticipants = true;
    if (selectedParticipants.length > 0) {
      if (!expense.splits || !Array.isArray(expense.splits) || expense.splits.length === 0) {
        matchesParticipants = false;
      } else {
        // Extract usernames from splits
        // First, ensure username is populated (enrich if needed)
        const expenseUsernames = expense.splits
          .map(split => {
            // Try username field first
            if (split.username) return split.username;
            // Fallback to user object if available
            if (split.user && split.user.username) {
              // Enrich the split for future use
              split.username = split.user.username;
              return split.user.username;
            }
            return null;
          })
          .filter(Boolean)
          .map(u => u.toLowerCase().trim());
        
        const selectedLower = selectedParticipants.map(p => p.toLowerCase().trim());
        
        // Check if any expense username matches any selected participant
        matchesParticipants = expenseUsernames.length > 0 && 
          expenseUsernames.some(username => selectedLower.includes(username));
        
        // Debug logging
        if (selectedParticipants.length > 0) {
          console.log(`🔍 Expense "${expense.description?.substring(0, 30) || 'N/A'}...":`, {
            expenseUsernames,
            selectedLower,
            matches: matchesParticipants,
            splitsCount: expense.splits.length,
            splits: expense.splits.map(s => ({
              username: s.username || s.user?.username || 'N/A',
              user_id: s.user_id
            }))
          });
        }
      }
    }

    return matchesDate && matchesGroup && matchesTitle && matchesParticipants;
  });

    // Reset to first page when filters change (but not when just changing pages)
    paginationState.currentPage = 1;
    
    console.log("📋 Filtered expenses:", filteredExpenses.length);
    console.log("🎯 Selected participants:", selectedParticipants);
    console.log("🎯 Calling renderExpensesTable with", filteredExpenses.length, "expenses");
    
    // Debug: Log summary when filtering by participants
    if (selectedParticipants.length > 0) {
      console.log("🔍 === PARTICIPANT FILTER SUMMARY ===");
      console.log("🔍 Selected participants:", selectedParticipants);
      console.log("🔍 Total expenses before filter:", allExpenses.length);
      console.log("🔍 Total expenses after filter:", filteredExpenses.length);
      
      // Show which expenses matched
      const matchedExpenses = allExpenses.filter(expense => {
        if (!expense.splits || expense.splits.length === 0) return false;
        const usernames = expense.splits
          .map(s => s.username || s.user?.username)
          .filter(Boolean)
          .map(u => u.toLowerCase().trim());
        return usernames.some(u => 
          selectedParticipants.map(p => p.toLowerCase().trim()).includes(u)
        );
      });
      
      console.log("🔍 Matched expenses:", matchedExpenses.length);
      matchedExpenses.slice(0, 5).forEach((exp, idx) => {
        const usernames = exp.splits
          .map(s => s.username || s.user?.username)
          .filter(Boolean);
        console.log(`  ${idx + 1}. "${exp.description?.substring(0, 40)}" - Participants: ${usernames.join(', ')}`);
      });
      console.log("🔍 === END DEBUG ===");
    }
    
    renderExpensesTable(filteredExpenses);
    updateExpenseCount(filteredExpenses.length);
  } catch (err) {
    console.error("❌ Error applying filters:", err);
    showError("Error applying filters: " + err.message);
  }
}

// ----------------------------
// Clear all filters
// ----------------------------
function clearAllFilters() {
  const fromInput = document.getElementById("filterFrom");
  const toInput = document.getElementById("filterTo");
  const groupSelect = document.getElementById("filterGroup");
  const titleInput = document.getElementById("filterTitle");
  
  if (fromInput) fromInput.value = "";
  if (toInput) toInput.value = "";
  if (groupSelect) groupSelect.value = "";
  if (titleInput) titleInput.value = "";
  
  selectedParticipants = [];
  renderParticipantTags();
  applyFilters();
}

// ----------------------------
// Update expense count
// ----------------------------
function updateExpenseCount(count) {
  const countElement = document.getElementById("expenseCount");
  if (countElement) {
    countElement.textContent = count;
  }
}

// ----------------------------
// Action functions
// ----------------------------
function viewExpense(expenseId) {
  console.log("Viewing expense:", expenseId);
  // TODO: Implement expense detail modal
  alert(`View expense ${expenseId} - Feature coming soon!`);
}

function editExpense(expenseId) {
  console.log("Editing expense:", expenseId);
  // TODO: Implement expense edit functionality
  alert(`Edit expense ${expenseId} - Feature coming soon!`);
}

// ----------------------------
// Utility functions
// ----------------------------
function showError(message) {
  // Create a simple toast notification
  const toast = document.createElement("div");
  toast.className = "alert alert-danger alert-dismissible fade show position-fixed";
  toast.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;";
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 5000);
}

