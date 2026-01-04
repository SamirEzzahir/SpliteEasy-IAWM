// Modal initialization for home page
document.addEventListener('DOMContentLoaded', function () {
  // Wait for all scripts to load
  window.addEventListener('load', function () {
    console.log('✅ Page fully loaded, initializing modals...');

    // Load recent activity preview
    loadrecentActivity();
    // Test if Bootstrap is loaded
    if (typeof bootstrap === 'undefined') {
      console.error('❌ Bootstrap is not loaded!');
      return;
    } else {
      console.log('✅ Bootstrap is loaded');
    }

    // Set current date for modals
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);

    const expenseDate = document.getElementById('expenseDate');
    const expenseTime = document.getElementById('expenseTime');
    const groupCreatedDate = document.getElementById('groupCreatedDate');

    if (groupCreatedDate) groupCreatedDate.value = today;
    if (expenseDate) expenseDate.value = today;
    if (expenseTime) expenseTime.value = now;

    // Initialize modals when they open
    const addExpenseModal = document.getElementById('addExpenseModal');
    if (addExpenseModal) {
      console.log('✅ Found addExpenseModal, attaching event listener');
      console.log('🔍 Modal element:', addExpenseModal);
      console.log('🔍 Modal classes:', addExpenseModal.className);

      addExpenseModal.addEventListener('show.bs.modal', function () {
        console.log('📂 addExpenseModal is opening...');
        // Load groups and wallets when modal opens
        if (typeof loadGroupsForExpense === 'function') {
          loadGroupsForExpense();
        }
        if (typeof loadWalletsForGroups === 'function') {
          loadWalletsForGroups();
        }
      });

      addExpenseModal.addEventListener('shown.bs.modal', function () {
        console.log('✅ addExpenseModal is now visible!');
      });

      addExpenseModal.addEventListener('hide.bs.modal', function () {
        console.log('❌ addExpenseModal is closing...');
      });

      // Manual test function
      window.testModal = function () {
        console.log('🧪 Testing modal manually...');
        const modal = new bootstrap.Modal(addExpenseModal);
        modal.show();
      };

      // Test button click
      const addExpenseBtn = document.querySelector('button[data-bs-target="#addExpenseModal"]');
      if (addExpenseBtn) {
        console.log('✅ Found Add Expense button');
        addExpenseBtn.addEventListener('click', function (e) {
          console.log('🖱️ Add Expense button clicked!', e);
        });
      } else {
        console.error('❌ Add Expense button not found!');
      }
    } else {
      console.error('❌ addExpenseModal not found!');
    }

    const createGroupModal = document.getElementById('createGroupModal');
    if (createGroupModal) {
      createGroupModal.addEventListener('show.bs.modal', function () {
        // Load friends when modal opens
        if (typeof loadFriendsForGroup === 'function') {
          loadFriendsForGroup();
        }
      });
    }
  });
});





// Load activity preview (last 3 activities)
async function loadrecentActivity() {
  console.log("🔄 Loading activity preview...");

  try {
    const response = await fetch(`${API_URL}/activity`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activities: ${response.status}`);
    }

    const logs = await response.json();
    const previewContainer = document.getElementById("recentActivity");

    if (!Array.isArray(logs) || logs.length === 0) {
      previewContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-clock-history fs-1 mb-3"></i>
                    <p class="mb-0">No recent activity</p>
                </div>
            `;
      return;
    }

    // Show only last 3 activities
    const recentLogs = logs.slice(0, 3);

    previewContainer.innerHTML = recentLogs.map(log => {
      const date = new Date(log.created_at);
      const formattedDate = isNaN(date.getTime()) ? "Unknown date" : formatDate(log.created_at);
      const icon = getActivityIcon(log.action);
      const color = getActivityColor(log.action);

      return `
                <div class="activity-item d-flex align-items-center">
                    <div class="me-3">
                        <i class="bi ${icon} ${color} fs-5"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-semibold">${log.user ? log.user.username : 'Unknown'}</div>
                        <div class="text-muted small">${log.action}</div>
                    </div>
                    <div class="text-muted small">${formattedDate}</div>
                </div>
            `;
    }).join('');

  } catch (err) {
    console.error("❌ Error loading activity preview:", err);
    const previewContainer = document.getElementById("recentActivity");
    previewContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
                <p class="mb-0">Failed to load activity</p>
            </div>
        `;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

function getActivityIcon(action) {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('expense')) return 'bi-receipt';
  if (actionLower.includes('group')) return 'bi-people';
  if (actionLower.includes('friend')) return 'bi-person-plus';
  if (actionLower.includes('settlement')) return 'bi-check-circle';
  if (actionLower.includes('wallet')) return 'bi-wallet2';
  if (actionLower.includes('income')) return 'bi-cash-stack';
  return 'bi-activity';
}

function getActivityColor(action) {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('expense')) return 'text-warning';
  if (actionLower.includes('group')) return 'text-primary';
  if (actionLower.includes('friend')) return 'text-success';
  if (actionLower.includes('settlement')) return 'text-info';
  if (actionLower.includes('wallet')) return 'text-secondary';
  if (actionLower.includes('income')) return 'text-success';
  return 'text-muted';
}