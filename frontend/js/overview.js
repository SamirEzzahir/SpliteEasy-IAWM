// Enhanced Overview Page JavaScript
console.log("✅ Overview.js loaded successfully");

// Global variables
let groupChart = null;
let dateChart = null;
let allUsers = [];
let allGroups = [];

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Initializing overview page...");
    
    // Check authentication first
    loadAuth();
    
    if (!localStorage.getItem("token")) {
        console.log("No token found, redirecting to login");
        window.location.href = "login.html";
        return;
    }
    
    console.log("User authenticated, loading overview data");
    
    // Initialize the page
    initializeOverview();
});

// Initialize overview page
async function initializeOverview() {
    try {
        // Load users and groups first
        await Promise.all([
            loadUsers(),
            loadGroups()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        await loadOverviewData();
        
        console.log("✅ Overview page initialized successfully");
        
    } catch (err) {
        console.error("❌ Error initializing overview page:", err);
        showError("Failed to load overview page");
    }
}

// Setup event listeners
function setupEventListeners() {
    // User select change
    const userSelect = document.getElementById("userSelect");
    if (userSelect) {
        userSelect.addEventListener("change", loadOverviewData);
    }
    
    // Time range change
    const timeRange = document.getElementById("timeRange");
    if (timeRange) {
        timeRange.addEventListener("change", loadOverviewData);
    }
    
    // Date range changes
    const fromDate = document.getElementById("fromDate");
    const toDate = document.getElementById("toDate");
    if (fromDate) {
        fromDate.addEventListener("change", loadOverviewData);
    }
    if (toDate) {
        toDate.addEventListener("change", loadOverviewData);
    }
}

// Load users for the dropdown
async function loadUsers() {
    try {
        console.log("🔄 Loading users...");
        
        const res = await fetch(`${API_URL}/users`, {
            headers: getHeaders()
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        allUsers = await res.json();
        console.log("👥 Users loaded:", allUsers.length);
        
        // Populate user select
        const userSelect = document.getElementById("userSelect");
        if (userSelect) {
            userSelect.innerHTML = '<option value="">All Users</option>';
            allUsers.forEach(user => {
                const option = document.createElement("option");
                option.value = user.id;
                option.textContent = user.username || user.email;
                userSelect.appendChild(option);
            });
        }
        
    } catch (err) {
        console.error("❌ Error loading users:", err);
        showError("Failed to load users");
    }
}

// Load groups
async function loadGroups() {
    try {
        console.log("🔄 Loading groups...");
        
        const res = await fetch(`${API_URL}/groups`, {
            headers: getHeaders()
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        allGroups = await res.json();
        console.log("📁 Groups loaded:", allGroups.length);
        
    } catch (err) {
        console.error("❌ Error loading groups:", err);
        showError("Failed to load groups");
    }
}

// Load overview data and render charts
async function loadOverviewData() {
    try {
        console.log("🔄 Loading overview data...");
        
        // Get filter values
        const userId = document.getElementById("userSelect")?.value || "";
        const timeRange = document.getElementById("timeRange")?.value || "monthly";
        const fromDate = document.getElementById("fromDate")?.value || "";
        const toDate = document.getElementById("toDate")?.value || "";
        
        console.log("📊 Filters:", { userId, timeRange, fromDate, toDate });
        
        // Show loading states
        showChartLoading();
        
        // Load data based on filters
        const [groupData, dateData] = await Promise.all([
            loadGroupExpenseData(userId, timeRange, fromDate, toDate),
            loadDateExpenseData(userId, timeRange, fromDate, toDate)
        ]);
        
        // Clear loading state and restore canvas elements
        clearChartLoading();
        
        // Render charts
        renderGroupChart(groupData);
        renderDateChart(dateData);
        
        // Update summary statistics
        updateSummaryStats(groupData, dateData);
        
        console.log("✅ Overview data loaded successfully");
        
    } catch (err) {
        console.error("❌ Error loading overview data:", err);
        showError("Failed to load overview data");
        showChartError();
    }
}

// Load group expense data
async function loadGroupExpenseData(userId, timeRange, fromDate, toDate) {
    try {
        // Use the existing /stats/user/groups endpoint instead
        let url = `${API_URL}/stats/user/groups`;
        
        // Add query parameters
        const params = new URLSearchParams();
        if (fromDate) params.append("from_date", fromDate);
        if (toDate) params.append("to_date", toDate);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const res = await fetch(url, {
            headers: getHeaders()
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log("📊 Group expense data:", data);
        return data;
        
    } catch (err) {
        console.error("❌ Error loading group expense data:", err);
        return [];
    }
}

// Load date expense data
async function loadDateExpenseData(userId, timeRange, fromDate, toDate) {
    try {
        let url = `${API_URL}/stats/user/daily`;
        
        // Add query parameters
        const params = new URLSearchParams();
        if (userId) params.append("user_id", userId);
        if (timeRange) params.append("time_range", timeRange);
        if (fromDate) params.append("from_date", fromDate);
        if (toDate) params.append("to_date", toDate);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const res = await fetch(url, {
            headers: getHeaders()
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log("📊 Date expense data:", data);
        return data;
        
    } catch (err) {
        console.error("❌ Error loading date expense data:", err);
        return [];
    }
}

// Render group chart
function renderGroupChart(data) {
    const ctx = document.getElementById("overviewGroupChart");
    const emptyState = document.getElementById("groupChartEmpty");
    
    console.log("🎨 Looking for group chart canvas...");
    console.log("📊 Canvas element:", ctx);
    console.log("📊 Empty state element:", emptyState);
    
    if (!ctx) {
        console.error("❌ Chart canvas not found - trying to find it...");
        // Try to find the canvas by looking in all chart containers
        const allCanvases = document.querySelectorAll('canvas');
        console.log("📊 All canvases found:", allCanvases.length);
        allCanvases.forEach((canvas, index) => {
            console.log(`📊 Canvas ${index}:`, canvas.id, canvas);
        });
        return;
    }
    
    console.log("🎨 Rendering group chart with data:", data);
    
    // Hide empty state
    if (emptyState) {
        emptyState.classList.add("d-none");
    }
    
    // Destroy existing chart
    if (groupChart instanceof Chart) {
        groupChart.destroy();
    }
    
    if (!data || data.length === 0) {
        console.log("📊 No data for group chart, showing empty state");
        // Show empty state
        if (emptyState) {
            emptyState.classList.remove("d-none");
        }
        return;
    }
    
    // Prepare chart data - handle different data structures
    let labels, values;
    
    if (data[0] && data[0].group_name) {
        // Data from /stats/user/groups endpoint
        labels = data.map(item => item.title || item.group_name || 'Unknown Group');
        values = data.map(item => parseFloat(item.amount) || 0);
    } else if (data[0] && data[0].title) {
        // Alternative data structure
        labels = data.map(item => item.title || 'Unknown Group');
        values = data.map(item => parseFloat(item.amount) || 0);
    } else {
        console.error("❌ Unknown data structure:", data);
        return;
    }
    
    console.log("📊 Chart labels:", labels);
    console.log("📊 Chart values:", values);
    
    // Generate colors
    const colors = generateColors(data.length);
    
    try {
        groupChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Expenses',
                    data: values,
                    backgroundColor: colors.backgrounds,
                    borderColor: colors.borders,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${formatCurrency(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                }
            }
        });
        
        console.log("✅ Group chart rendered successfully");
        
    } catch (err) {
        console.error("❌ Error rendering group chart:", err);
        showError("Failed to render group chart");
    }
}

// Render date chart
function renderDateChart(data) {
    const ctx = document.getElementById("overviewDateChart");
    const emptyState = document.getElementById("dateChartEmpty");
    
    console.log("🎨 Looking for date chart canvas...");
    console.log("📊 Canvas element:", ctx);
    console.log("📊 Empty state element:", emptyState);
    
    if (!ctx) {
        console.error("❌ Date chart canvas not found - trying to find it...");
        // Try to find the canvas by looking in all chart containers
        const allCanvases = document.querySelectorAll('canvas');
        console.log("📊 All canvases found:", allCanvases.length);
        allCanvases.forEach((canvas, index) => {
            console.log(`📊 Canvas ${index}:`, canvas.id, canvas);
        });
        return;
    }
    
    console.log("🎨 Rendering date chart with data:", data);
    
    // Hide empty state
    if (emptyState) {
        emptyState.classList.add("d-none");
    }
    
    // Destroy existing chart
    if (dateChart instanceof Chart) {
        dateChart.destroy();
    }
    
    if (!data || data.length === 0) {
        console.log("📊 No data for date chart, showing empty state");
        // Show empty state
        if (emptyState) {
            emptyState.classList.remove("d-none");
        }
        return;
    }
    
    // Sort data by date
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Prepare chart data
    const labels = data.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    });
    const values = data.map(item => parseFloat(item.amount) || 0);
    
    console.log("📊 Date chart labels:", labels);
    console.log("📊 Date chart values:", values);
    
    try {
        dateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Expenses',
                    data: values,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#0d6efd',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Expenses: ${formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                }
            }
        });
        
        console.log("✅ Date chart rendered successfully");
        
    } catch (err) {
        console.error("❌ Error rendering date chart:", err);
        showError("Failed to render date chart");
    }
}

// Generate colors for charts
function generateColors(count) {
    const baseColors = [
        '#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0',
        '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#6c757d'
    ];
    
    const backgrounds = [];
    const borders = [];
    
    for (let i = 0; i < count; i++) {
        const color = baseColors[i % baseColors.length];
        backgrounds.push(color + '80'); // Add transparency
        borders.push(color);
    }
    
    return { backgrounds, borders };
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Update summary statistics
function updateSummaryStats(groupData, dateData) {
    try {
        console.log("📊 Updating summary statistics...");
        
        // Calculate totals
        const totalGroups = groupData ? groupData.length : 0;
        const totalExpenses = dateData ? dateData.length : 0;
        const totalAmount = groupData ? groupData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) : 0;
        
        // Get total users from user select
        const userSelect = document.getElementById('userSelect');
        const totalUsers = userSelect ? userSelect.options.length - 1 : 0; // -1 for "All Users" option
        
        // Update DOM elements
        const totalGroupsEl = document.getElementById('totalGroups');
        const totalExpensesEl = document.getElementById('totalExpenses');
        const totalAmountEl = document.getElementById('totalAmount');
        const totalUsersEl = document.getElementById('totalUsers');
        
        if (totalGroupsEl) totalGroupsEl.textContent = totalGroups;
        if (totalExpensesEl) totalExpensesEl.textContent = totalExpenses;
        if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalAmount);
        if (totalUsersEl) totalUsersEl.textContent = totalUsers;
        
        console.log("📊 Summary stats updated:", { totalGroups, totalExpenses, totalAmount, totalUsers });
        
    } catch (err) {
        console.error("❌ Error updating summary stats:", err);
    }
}

// Show chart loading state
function showChartLoading() {
    console.log("🔄 Showing chart loading state");
    
    // Instead of replacing canvas, add loading overlay
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach((chart, index) => {
        const canvas = chart.querySelector('canvas');
        if (canvas) {
            // Hide canvas and show loading
            canvas.style.display = 'none';
            
            // Add loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10;
            `;
            loadingOverlay.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-muted">Loading chart data...</p>
                </div>
            `;
            
            chart.style.position = 'relative';
            chart.appendChild(loadingOverlay);
        }
    });
}

// Clear chart loading state and restore canvas
function clearChartLoading() {
    console.log("🔄 Clearing chart loading state");
    
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach((chart, index) => {
        const canvas = chart.querySelector('canvas');
        const loadingOverlay = chart.querySelector('.loading-overlay');
        
        if (canvas) {
            canvas.style.display = 'block';
            console.log(`✅ Restored canvas ${index}`);
        }
        
        if (loadingOverlay) {
            loadingOverlay.remove();
            console.log(`✅ Removed loading overlay ${index}`);
        }
    });
}

// Show chart error state
function showChartError() {
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach(chart => {
        chart.innerHTML = `
            <div class="d-flex justify-content-center align-items-center h-100">
                <div class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
                    <h5>Error Loading Chart</h5>
                    <p>Failed to load chart data. Please try again.</p>
                </div>
            </div>
        `;
    });
}

// Show error message
function showError(message) {
    // Create toast notification
    const toastContainer = document.getElementById("toastContainer") || createToastContainer();
    
    const toastEl = document.createElement("div");
    toastEl.className = "toast align-items-center text-bg-danger border-0";
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");
    
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi bi-exclamation-triangle me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
    
    // Remove toast element after it's hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// Create toast container if it doesn't exist
function createToastContainer() {
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 1055;
    `;
    document.body.appendChild(container);
    return container;
}

// Initialize overview page
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Initializing overview page...");
    
    try {
        // Check authentication
        loadAuth();
        if (!localStorage.getItem("token")) {
            window.location.href = "login.html";
            return;
        }
        
        console.log("User authenticated, loading overview data");
        
        // Load users for filter
        await loadUsers();
        
        // Event listeners
        const applyFilterBtn = document.getElementById('applyFilterBtn');
        const resetFilterBtn = document.getElementById('resetFilterBtn');
        
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', loadOverviewData);
        }
        
        if (resetFilterBtn) {
            resetFilterBtn.addEventListener('click', () => {
                document.getElementById('userSelect').value = '';
                document.getElementById('timeRange').value = 'monthly';
                document.getElementById('fromDate').value = '';
                document.getElementById('toDate').value = '';
                loadOverviewData();
            });
        }
        
        // Initial data load
        await loadOverviewData();
        
        console.log("✅ Overview page initialized successfully");
        
    } catch (err) {
        console.error("❌ Error initializing overview page:", err);
        showError("Failed to initialize overview page");
    }
});


