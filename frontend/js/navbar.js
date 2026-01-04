// Enhanced Navbar JavaScript
loadAuth();

// -----------------------------
// Utility Functions
// -----------------------------
function getCurrentPage() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';
  return page.toLowerCase();
}

function isActivePage(pageName) {
  const currentPage = getCurrentPage();
  return currentPage === pageName.toLowerCase();
}

function getUserDisplayName() {
  try {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (user) {
      // Try to get full name first, then username
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      }
      return user.username || user.email || 'User';
    }
  } catch (err) {
    console.warn("Could not parse user data:", err);
  }
  return 'User';
}

// -----------------------------
// Desktop Navbar
// -----------------------------
function buildNavHTML() {
  const currentPage = getCurrentPage();
  const userDisplayName = getUserDisplayName();

  return `
<!-- Enhanced Responsive Navbar -->
<nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
  <div class="container-fluid px-3">
    <!-- Brand -->
    <a class="navbar-brand fw-bold d-flex align-items-center" href="home.html">
      <div class="brand-icon me-2">
        <i class="bi bi-cash-stack text-primary"></i>
      </div>
      <span class="brand-text">SplitEasy</span>
    </a>

    <!-- Toggler button -->
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
      aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

    <!-- Collapsible content -->
    <div class="collapse navbar-collapse" id="navbarNav">
      <!-- Left links -->
      <ul class="navbar-nav me-auto">
        <li class="nav-item">
          <a class="nav-link ${isActivePage('home.html') ? 'active' : ''}" href="home.html">
            <i class="bi bi-house-door me-1"></i>Home
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${isActivePage('groups.html') ? 'active' : ''}" href="groups.html">
            <i class="bi bi-people me-1"></i>Groups
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link position-relative ${isActivePage('friends.html') ? 'active' : ''}" href="friends.html">
            <i class="bi bi-person-plus me-1"></i>Friends
            <span class="notification-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.6rem; padding: 0.25em 0.4em; min-width: 1.2em; display: none;">0</span>
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${isActivePage('global-settle.html') ? 'active' : ''}" href="global-settle.html">
            <i class="bi bi-globe me-1"></i>Global Settlements
          </a>
        </li>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-bar-chart me-1"></i>Analytics
          </a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item ${isActivePage('dashboard.html') ? 'active' : ''}" href="dashboard.html">
              <i class="bi bi-speedometer2 me-2"></i>Dashboard
            </a></li>
            <li><a class="dropdown-item ${isActivePage('stats.html') ? 'active' : ''}" href="stats.html">
              <i class="bi bi-bar-chart-line me-2"></i>Statistics
            </a></li>
            <li><a class="dropdown-item ${isActivePage('overview.html') ? 'active' : ''}" href="overview.html">
              <i class="bi bi-pie-chart me-2"></i>Overview
            </a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item ${isActivePage('global-settle.html') ? 'active' : ''}" href="global-settle.html">
              <i class="bi bi-globe me-2"></i>Global Settlements
            </a></li>
          </ul>
        </li>
      </ul>
      
      <!-- Notifications Dropdown -->
      <ul class="navbar-nav ms-auto">
        <li class="nav-item dropdown me-3">
          <a class="nav-link dropdown-toggle position-relative" href="#" id="notificationDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-bell fs-5"></i>
            <span id="nav-notification-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display: none; font-size: 0.6rem;">0</span>
          </a>
          <ul class="dropdown-menu dropdown-menu-end p-0 shadow-lg border-0" aria-labelledby="notificationDropdown" style="width: 320px; max-height: 400px; overflow-y: auto;">
             <li class="d-flex justify-content-between align-items-center p-3 border-bottom">
                <h6 class="mb-0 fw-bold">Notifications</h6>
                <button class="btn btn-link btn-sm text-decoration-none p-0" onclick="globalNotifications.markAllRead()">Mark all read</button>
             </li>
             <div id="notification-list">
                <!-- Notifications will be loaded here -->
                <li class="text-center p-4 text-muted">
                   <p class="mb-0 small">No new notifications</p>
                </li>
             </div>
          </ul>
        </li>
      </ul>

      <!-- User Profile (Right side) -->
      <ul class="navbar-nav">
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            <div class="user-avatar me-2">
              <i class="bi bi-person-circle"></i>
            </div>
            <span class="user-name">${userDisplayName}</span>
          </a>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item" href="account.html">
              <i class="bi bi-person-gear me-2"></i>Account Settings
            </a></li>
            <li><a class="dropdown-item" href="finance.html">
              <i class="bi bi-wallet2 me-2"></i>Income & Wallets
            </a></li>
            <li><a class="dropdown-item ${isActivePage('finance.html') ? 'active' : ''}" href="finance.html#debts">
              <i class="bi bi-bank me-2"></i>Debts & Loans
            </a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" id="logoutBtnHeader">
              <i class="bi bi-box-arrow-right me-2"></i>Logout
            </a></li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</nav>`;
}

// -----------------------------
// Mobile Navbar
// -----------------------------
function buildMobileNavHTML() {
  const currentPage = getCurrentPage();

  return `
<!-- Enhanced Bottom Navigation (Mobile) -->
<nav class="navbar fixed-bottom navbar-light bg-white border-top d-md-none mobile-nav">
  <div class="container-fluid">
    <div class="row w-100">
      <div class="col">
        <a class="nav-link text-center ${isActivePage('home.html') ? 'active' : ''}" href="home.html">
          <i class="bi bi-house-door fs-5"></i>
          <div class="nav-label">Home</div>
        </a>
      </div>
      <div class="col">
        <a class="nav-link text-center ${isActivePage('groups.html') ? 'active' : ''}" href="groups.html">
          <i class="bi bi-people fs-5"></i>
          <div class="nav-label">Groups</div>
        </a>
      </div>
      <div class="col">
        <a class="nav-link text-center position-relative ${isActivePage('friends.html') ? 'active' : ''}" href="friends.html">
          <i class="bi bi-person-plus fs-5"></i>
          <div class="nav-label">Friends</div>
          <span class="notification-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.5rem; padding: 0.2em 0.3em; min-width: 1em; display: none;">0</span>
        </a>
      </div>

      <div class="col">
        <a class="nav-link text-center ${isActivePage('stats.html') ? 'active' : ''}" href="stats.html">
          <i class="bi bi-bar-chart fs-5"></i>
          <div class="nav-label">Stats</div>
        </a>
      </div>
      <div class="col">
        <a class="nav-link text-center ${isActivePage('account.html') ? 'active' : ''}" href="account.html">
          <i class="bi bi-person-circle fs-5"></i>
          <div class="nav-label">Account</div>
        </a>
      </div>
      
    </div>
      </div>
    </nav>`;
}

// -----------------------------
// Navbar Styling
// -----------------------------
function addNavbarStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Enhanced Navbar Styles */
    .navbar-brand {
      font-size: 1.5rem;
      color: var(--bs-primary) !important;
      text-decoration: none;
      transition: all 0.3s ease;
    }
    
    .navbar-brand:hover {
      transform: scale(1.05);
    }
    
    .brand-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #0d6efd, #66a6ff);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white !important;
    }
    
    .nav-link {
      font-weight: 500;
      color: #6c757d !important;
      transition: all 0.3s ease;
      position: relative;
      padding: 0.75rem 1rem !important;
      border-radius: 8px;
      margin: 0 0.25rem;
    }
    
    .nav-link:hover {
      color: var(--bs-primary) !important;
      background-color: rgba(13, 110, 253, 0.1);
      transform: translateY(-1px);
    }
    
    .nav-link.active {
      color: var(--bs-primary) !important;
      background-color: rgba(13, 110, 253, 0.15);
      font-weight: 600;
    }
    
    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 2px;
      background: var(--bs-primary);
      border-radius: 1px;
    }
    
    .user-avatar {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #0d6efd, #66a6ff);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.2rem;
    }
    
    .user-name {
      font-weight: 500;
      color: #495057;
    }
    
    .dropdown-menu {
      border: none;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 0.5rem;
    }
    
    .dropdown-item {
      border-radius: 8px;
      padding: 0.75rem 1rem;
      transition: all 0.2s ease;
    }
    
    .dropdown-item:hover {
      background-color: rgba(13, 110, 253, 0.1);
      transform: translateX(4px);
    }
    
    .dropdown-item.active {
      background-color: rgba(13, 110, 253, 0.15);
      color: var(--bs-primary);
      font-weight: 600;
    }
    
    /* Mobile Navbar Styles */
    .mobile-nav {
      padding: 0.5rem 0;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    }
    
    .mobile-nav .nav-link {
      padding: 0.5rem 0.25rem !important;
      color: #6c757d !important;
      text-decoration: none;
      transition: all 0.3s ease;
      border-radius: 8px;
    }
    
    .mobile-nav .nav-link:hover {
      color: var(--bs-primary) !important;
      background-color: rgba(13, 110, 253, 0.1);
    }
    
    .mobile-nav .nav-link.active {
      color: var(--bs-primary) !important;
      background-color: rgba(13, 110, 253, 0.15);
    }
    
    .mobile-nav .nav-link.active i {
      transform: scale(1.1);
    }
    
    .nav-label {
      font-size: 0.75rem;
      font-weight: 500;
      margin-top: 0.25rem;
    }
    
    /* Responsive adjustments */
    @media (max-width: 991px) {
      .navbar-collapse {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        margin-top: 1rem;
        padding: 1rem;
      }
      
      .navbar-nav {
        margin: 0 !important;
      }
      
      .nav-item {
        margin-bottom: 0.5rem;
      }
      
      .nav-link {
        margin: 0 !important;
        padding: 0.75rem 1rem !important;
      }
    }
    
    /* Animation for navbar toggle */
    .navbar-toggler:focus {
      box-shadow: none;
    }
    
    .navbar-toggler-icon {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%2833, 37, 41, 0.75%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
    }
  `;

  document.head.appendChild(style);
}

// -----------------------------
// Event Handlers
// -----------------------------
function setupEventHandlers() {
  // Logout functionality
  const logoutBtn = document.getElementById("logoutBtnHeader");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // Show confirmation
      if (confirm("Are you sure you want to logout?")) {
        // Clear all auth data
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("user");

        // Redirect to login
        window.location.href = "index.html";
      }
    });
  }

  // Add click handlers for mobile nav
  const mobileNavLinks = document.querySelectorAll('.mobile-nav .nav-link');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Add a small delay for visual feedback
      link.style.transform = 'scale(0.95)';
      setTimeout(() => {
        link.style.transform = '';
      }, 150);
    });
  });
}

// -----------------------------
// Main Functions
// -----------------------------
function attachNavbar() {
  try {
    // Add styles first
    addNavbarStyles();

    // Attach desktop navbar
    const nav = document.getElementById("navbar");
    if (nav) {
      nav.innerHTML = buildNavHTML();
    }

    // Attach mobile navbar
    const navMobile = document.getElementById("navbarMobile");
    if (navMobile) {
      navMobile.innerHTML = buildMobileNavHTML();
    }

    // Setup event handlers
    setupEventHandlers();

    // Update user display name
    updateUserDisplay();

    console.log("✅ Navbar attached successfully");

  } catch (err) {
    console.error("❌ Error attaching navbar:", err);
  }
}

function updateUserDisplay() {
  try {
    const userDisplayName = getUserDisplayName();

    // Update desktop navbar
    const desktopUserElement = document.querySelector('.user-name');
    if (desktopUserElement) {
      desktopUserElement.textContent = userDisplayName;
    }

    // Update home page welcome message
    const homeWelcomeElement = document.getElementById("currentUserHome");
    if (homeWelcomeElement) {
      homeWelcomeElement.textContent = userDisplayName;
    }

  } catch (err) {
    console.error("❌ Error updating user display:", err);
  }
}

// -----------------------------
// Initialize
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Wait a bit for other scripts to load
  setTimeout(() => {
    attachNavbar();
  }, 100);
});

// Export functions for external use
window.updateNavbarUser = updateUserDisplay;