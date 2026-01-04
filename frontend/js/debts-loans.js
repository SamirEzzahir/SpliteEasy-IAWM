// Debts & Loans Management JavaScript
console.log("✅ Debts-Loans.js loaded successfully");

// Check if config.js is loaded
if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined' || typeof fetchWithAuth === 'undefined') {
    console.error("❌ Config.js not loaded! Make sure config.js is loaded before debts-loans.js");
    alert("Configuration error. Please refresh the page.");
}

// Initialize authentication
if (typeof loadAuth === 'function') {
    loadAuth();
} else {
    console.warn("⚠️ loadAuth function not found");
}

// Global variables
let wallets = [];
let debts = [];
let loans = [];
let summary = null;

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    const bgColor = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : 'bg-info';
    
    const toastHTML = `
        <div id="${toastId}" class="toast ${bgColor} text-white" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header ${bgColor} text-white">
                <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Load data on page load
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Debts & Loans page initialized");
    
    // Check if config is loaded
    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined' || typeof fetchWithAuth === 'undefined') {
        console.error("❌ Config.js not loaded! Make sure config.js is loaded before debts-loans.js");
        showToast("Configuration error. Please refresh the page.", "danger");
        return;
    }
    
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
        console.log("No token found, redirecting to login");
        window.location.href = "login.html";
        return;
    }
    
    try {
        await Promise.all([
            loadWallets(),
            loadSummary(),
            loadDebts(),
            loadLoans()
        ]);
        
        setupEventListeners();
        setupFilters();
    } catch (error) {
        console.error("Failed to load initial data:", error);
        showToast("Failed to load data: " + (error.message || "Unknown error"), "danger");
    }
});

// =================== LOAD WALLETS ===================
async function loadWallets() {
    try {
        const response = await fetchWithAuth(`${API_URL}/wallets`);
        wallets = response || [];
        console.log("✅ Loaded wallets:", wallets.length);
        
        // Populate wallet selects
        updateWalletSelects();
    } catch (err) {
        console.error("❌ Failed to load wallets:", err);
        wallets = [];
    }
}

function updateWalletSelects() {
    const selects = [
        document.getElementById("debtWallet"),
        document.getElementById("loanWallet"),
        document.getElementById("repayDebtWallet"),
        document.getElementById("receiveLoanRepaymentWallet")
    ];
    
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">-- No Wallet (Just Track) --</option>';
        wallets.forEach(w => {
            select.append(new Option(`${w.name} (${w.category || ""}) - Balance: ${w.balance.toFixed(2)} MAD`, w.id));
        });
    });
}

// =================== LOAD SUMMARY ===================
async function loadSummary() {
    try {
        const response = await fetchWithAuth(`${API_URL}/debts-loans/summary`);
        summary = response || { total_debt: 0, total_loans: 0, net: 0 };
        console.log("✅ Loaded summary:", summary);
        
        updateSummaryDisplay();
    } catch (err) {
        console.error("❌ Failed to load summary:", err);
        summary = { total_debt: 0, total_loans: 0, net: 0 };
        updateSummaryDisplay();
    }
}

function updateSummaryDisplay() {
    document.getElementById("totalDebt").textContent = `${formatCurrency(summary.total_debt)} MAD`;
    document.getElementById("totalLoans").textContent = `${formatCurrency(summary.total_loans)} MAD`;
    document.getElementById("netAmount").textContent = `${formatCurrency(summary.net)} MAD`;
    
    // Update badges
    document.getElementById("debtsCountBadge").textContent = summary.total_debts_count || 0;
    document.getElementById("loansCountBadge").textContent = summary.total_loans_count || 0;
}

// =================== LOAD DEBTS ===================
async function loadDebts(status = null) {
    const container = document.getElementById("debtsList");
    container.innerHTML = '<div class="text-center text-muted py-4"><div class="spinner-border text-danger" role="status"></div><p class="mt-2 mb-0">Loading debts...</p></div>';
    
    try {
        const url = status && status !== 'all' ? `${API_URL}/debts-loans/debts?status=${status}` : `${API_URL}/debts-loans/debts`;
        const response = await fetchWithAuth(url);
        debts = response || [];
        console.log("✅ Loaded debts:", debts.length);
        
        renderDebts(debts);
    } catch (err) {
        console.error("❌ Failed to load debts:", err);
        container.innerHTML = `<div class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle fs-1 mb-3"></i><h5>Error Loading Debts</h5><p class="mb-0">${err.message || "Failed to load debts"}</p></div>`;
    }
}

function renderDebts(debtsList) {
    const container = document.getElementById("debtsList");
    
    if (debtsList.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-bank fs-1 mb-3"></i>
                <h5>No Debts Found</h5>
                <p class="mb-0">You don't have any debts recorded yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = debtsList.map(debt => {
        const statusBadge = debt.status === 'active' 
            ? '<span class="badge bg-danger">Active</span>'
            : debt.status === 'partially_paid'
            ? '<span class="badge bg-warning">Partially Paid</span>'
            : '<span class="badge bg-success">Fully Paid</span>';
        
        const progressPercent = debt.original_amount > 0 
            ? ((debt.total_paid / debt.original_amount) * 100).toFixed(1)
            : 0;
        
        return `
            <div class="debt-loan-card card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="mb-1">${debt.lender_name}</h5>
                            <p class="text-muted mb-0 small">${formatDate(debt.created_at)}</p>
                        </div>
                        ${statusBadge}
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <small class="text-muted">Original Amount</small>
                            <p class="mb-0 fw-bold">${formatCurrency(debt.original_amount)} MAD</p>
                        </div>
                        <div class="col-md-4">
                            <small class="text-muted">Remaining</small>
                            <p class="mb-0 fw-bold text-danger">${formatCurrency(debt.remaining_amount)} MAD</p>
                        </div>
                        <div class="col-md-4">
                            <small class="text-muted">Paid</small>
                            <p class="mb-0 fw-bold text-success">${formatCurrency(debt.total_paid)} MAD</p>
                        </div>
                    </div>
                    
                    <div class="progress mb-3" style="height: 8px;">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${progressPercent}%"></div>
                    </div>
                    
                    ${debt.due_date ? `<p class="text-muted small mb-2"><i class="bi bi-calendar me-1"></i>Due: ${formatDate(debt.due_date)}</p>` : ''}
                    ${debt.note ? `<p class="text-muted small mb-2">${debt.note}</p>` : ''}
                    
                    <div class="d-flex gap-2">
                        ${debt.remaining_amount > 0 ? `<button class="btn btn-sm btn-primary" onclick="openRepayDebtModal(${debt.id}, ${debt.remaining_amount})"><i class="bi bi-cash-stack me-1"></i>Repay</button>` : ''}
                        <button class="btn btn-sm btn-outline-info" onclick="viewDebtRepayments(${debt.id})"><i class="bi bi-clock-history me-1"></i>History</button>
                        <button class="btn btn-sm btn-outline-warning" onclick="editDebt(${debt.id})"><i class="bi bi-pencil me-1"></i>Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteDebt(${debt.id})"><i class="bi bi-trash me-1"></i>Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =================== LOAD LOANS ===================
async function loadLoans(status = null) {
    const container = document.getElementById("loansList");
    container.innerHTML = '<div class="text-center text-muted py-4"><div class="spinner-border text-success" role="status"></div><p class="mt-2 mb-0">Loading loans...</p></div>';
    
    try {
        const url = status && status !== 'all' ? `${API_URL}/debts-loans/loans?status=${status}` : `${API_URL}/debts-loans/loans`;
        const response = await fetchWithAuth(url);
        loans = response || [];
        console.log("✅ Loaded loans:", loans.length);
        
        renderLoans(loans);
    } catch (err) {
        console.error("❌ Failed to load loans:", err);
        container.innerHTML = `<div class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle fs-1 mb-3"></i><h5>Error Loading Loans</h5><p class="mb-0">${err.message || "Failed to load loans"}</p></div>`;
    }
}

function renderLoans(loansList) {
    const container = document.getElementById("loansList");
    
    if (loansList.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-arrow-up-circle fs-1 mb-3"></i>
                <h5>No Loans Found</h5>
                <p class="mb-0">You don't have any loans recorded yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = loansList.map(loan => {
        const statusBadge = loan.status === 'active' 
            ? '<span class="badge bg-success">Active</span>'
            : loan.status === 'partially_paid'
            ? '<span class="badge bg-warning">Partially Paid</span>'
            : '<span class="badge bg-secondary">Fully Paid</span>';
        
        const progressPercent = loan.original_amount > 0 
            ? ((loan.total_paid / loan.original_amount) * 100).toFixed(1)
            : 0;
        
        return `
            <div class="debt-loan-card card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="mb-1">${loan.borrower_name}</h5>
                            <p class="text-muted mb-0 small">${formatDate(loan.created_at)}</p>
                        </div>
                        ${statusBadge}
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <small class="text-muted">Original Amount</small>
                            <p class="mb-0 fw-bold">${formatCurrency(loan.original_amount)} MAD</p>
                        </div>
                        <div class="col-md-4">
                            <small class="text-muted">Remaining</small>
                            <p class="mb-0 fw-bold text-danger">${formatCurrency(loan.remaining_amount)} MAD</p>
                        </div>
                        <div class="col-md-4">
                            <small class="text-muted">Paid</small>
                            <p class="mb-0 fw-bold text-success">${formatCurrency(loan.total_paid)} MAD</p>
                        </div>
                    </div>
                    
                    <div class="progress mb-3" style="height: 8px;">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${progressPercent}%"></div>
                    </div>
                    
                    ${loan.due_date ? `<p class="text-muted small mb-2"><i class="bi bi-calendar me-1"></i>Due: ${formatDate(loan.due_date)}</p>` : ''}
                    ${loan.note ? `<p class="text-muted small mb-2">${loan.note}</p>` : ''}
                    
                    <div class="d-flex gap-2">
                        ${loan.remaining_amount > 0 ? `<button class="btn btn-sm btn-success" onclick="openReceiveLoanRepaymentModal(${loan.id}, ${loan.remaining_amount})"><i class="bi bi-cash-coin me-1"></i>Receive Payment</button>` : ''}
                        <button class="btn btn-sm btn-outline-info" onclick="viewLoanRepayments(${loan.id})"><i class="bi bi-clock-history me-1"></i>History</button>
                        <button class="btn btn-sm btn-outline-warning" onclick="editLoan(${loan.id})"><i class="bi bi-pencil me-1"></i>Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteLoan(${loan.id})"><i class="bi bi-trash me-1"></i>Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =================== EVENT LISTENERS ===================
function setupEventListeners() {
    // Add Debt Form
    document.getElementById("addDebtForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await createDebt();
    });
    
    // Add Loan Form
    document.getElementById("addLoanForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await createLoan();
    });
    
    // Repay Debt Form
    document.getElementById("repayDebtForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await repayDebt();
    });
    
    // Receive Loan Repayment Form
    document.getElementById("receiveLoanRepaymentForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await receiveLoanRepayment();
    });
}

function setupFilters() {
    // Debt filters
    document.querySelectorAll('input[name="debtFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const status = e.target.value === 'all' ? null : e.target.value;
            loadDebts(status);
        });
    });
    
    // Loan filters
    document.querySelectorAll('input[name="loanFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const status = e.target.value === 'all' ? null : e.target.value;
            loadLoans(status);
        });
    });
}

// =================== CREATE DEBT ===================
async function createDebt() {
    const submitBtn = document.getElementById("saveDebtBtn");
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
        
        const payload = {
            lender_name: document.getElementById("debtLenderName").value.trim(),
            original_amount: parseFloat(document.getElementById("debtAmount").value),
            wallet_id: document.getElementById("debtWallet").value ? parseInt(document.getElementById("debtWallet").value) : null,
            due_date: document.getElementById("debtDueDate").value || null,
            note: document.getElementById("debtNote").value.trim() || null
        };
        
        if (!payload.lender_name || !payload.original_amount || payload.original_amount <= 0) {
            throw new Error("Please fill in all required fields");
        }
        
        const response = await fetch(`${API_URL}/debts-loans/debts`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to create debt: ${response.status}`);
        }
        
        showToast("Debt created successfully!", "success");
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById("addDebtModal"));
        modal.hide();
        document.getElementById("addDebtForm").reset();
        
        // Reload data
        await Promise.all([loadSummary(), loadDebts()]);
        await loadWallets(); // Reload wallets in case balance changed
        
    } catch (err) {
        console.error("❌ Error creating debt:", err);
        showToast(err.message || "Failed to create debt", "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// =================== CREATE LOAN ===================
async function createLoan() {
    const submitBtn = document.getElementById("saveLoanBtn");
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
        
        const payload = {
            borrower_name: document.getElementById("loanBorrowerName").value.trim(),
            original_amount: parseFloat(document.getElementById("loanAmount").value),
            wallet_id: document.getElementById("loanWallet").value ? parseInt(document.getElementById("loanWallet").value) : null,
            due_date: document.getElementById("loanDueDate").value || null,
            note: document.getElementById("loanNote").value.trim() || null
        };
        
        if (!payload.borrower_name || !payload.original_amount || payload.original_amount <= 0) {
            throw new Error("Please fill in all required fields");
        }
        
        const response = await fetch(`${API_URL}/debts-loans/loans`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to create loan: ${response.status}`);
        }
        
        showToast("Loan created successfully!", "success");
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById("addLoanModal"));
        modal.hide();
        document.getElementById("addLoanForm").reset();
        
        // Reload data
        await Promise.all([loadSummary(), loadLoans()]);
        await loadWallets(); // Reload wallets in case balance changed
        
    } catch (err) {
        console.error("❌ Error creating loan:", err);
        showToast(err.message || "Failed to create loan", "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// =================== REPAY DEBT ===================
function openRepayDebtModal(debtId, remainingAmount) {
    document.getElementById("repayDebtId").value = debtId;
    document.getElementById("repayDebtRemaining").value = `${formatCurrency(remainingAmount)} MAD`;
    document.getElementById("repayDebtAmount").value = "";
    document.getElementById("repayDebtAmount").max = remainingAmount;
    document.getElementById("repayDebtNote").value = "";
    updateWalletSelects(); // Refresh wallet options
    
    const modal = new bootstrap.Modal(document.getElementById("repayDebtModal"));
    modal.show();
}

async function repayDebt() {
    const submitBtn = document.getElementById("saveRepayDebtBtn");
    const originalText = submitBtn.innerHTML;
    const debtId = parseInt(document.getElementById("repayDebtId").value);
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Recording...';
        
        const payload = {
            amount: parseFloat(document.getElementById("repayDebtAmount").value),
            wallet_id: document.getElementById("repayDebtWallet").value ? parseInt(document.getElementById("repayDebtWallet").value) : null,
            note: document.getElementById("repayDebtNote").value.trim() || null
        };
        
        if (!payload.amount || payload.amount <= 0) {
            throw new Error("Please enter a valid repayment amount");
        }
        
        const response = await fetch(`${API_URL}/debts-loans/debts/${debtId}/repay`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            let errorMessage = `Failed to record repayment (${response.status})`;
            try {
                const errorData = await response.json();
                // Handle different error response formats
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(e => e.msg || e).join(', ');
                    } else {
                        errorMessage = errorData.detail;
                    }
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (typeof errorData === 'string') {
                    errorMessage = errorData;
                }
            } catch (e) {
                // If JSON parsing fails, use status text
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        showToast("Repayment recorded successfully!", "success");
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById("repayDebtModal"));
        modal.hide();
        document.getElementById("repayDebtForm").reset();
        
        // Reload data
        await Promise.all([loadSummary(), loadDebts()]);
        await loadWallets(); // Reload wallets in case balance changed
        
    } catch (err) {
        console.error("❌ Error recording repayment:", err);
        showToast(err.message || "Failed to record repayment", "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// =================== RECEIVE LOAN REPAYMENT ===================
function openReceiveLoanRepaymentModal(loanId, remainingAmount) {
    document.getElementById("receiveLoanRepaymentId").value = loanId;
    document.getElementById("receiveLoanRepaymentRemaining").value = `${formatCurrency(remainingAmount)} MAD`;
    document.getElementById("receiveLoanRepaymentAmount").value = "";
    document.getElementById("receiveLoanRepaymentAmount").max = remainingAmount;
    document.getElementById("receiveLoanRepaymentNote").value = "";
    updateWalletSelects(); // Refresh wallet options
    
    const modal = new bootstrap.Modal(document.getElementById("receiveLoanRepaymentModal"));
    modal.show();
}

async function receiveLoanRepayment() {
    const submitBtn = document.getElementById("saveReceiveLoanRepaymentBtn");
    const originalText = submitBtn.innerHTML;
    const loanId = parseInt(document.getElementById("receiveLoanRepaymentId").value);
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Recording...';
        
        const payload = {
            amount: parseFloat(document.getElementById("receiveLoanRepaymentAmount").value),
            wallet_id: document.getElementById("receiveLoanRepaymentWallet").value ? parseInt(document.getElementById("receiveLoanRepaymentWallet").value) : null,
            note: document.getElementById("receiveLoanRepaymentNote").value.trim() || null
        };
        
        if (!payload.amount || payload.amount <= 0) {
            throw new Error("Please enter a valid repayment amount");
        }
        
        const response = await fetch(`${API_URL}/debts-loans/loans/${loanId}/repay`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            let errorMessage = `Failed to record repayment (${response.status})`;
            try {
                const errorData = await response.json();
                // Handle different error response formats
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(e => e.msg || e).join(', ');
                    } else {
                        errorMessage = errorData.detail;
                    }
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (typeof errorData === 'string') {
                    errorMessage = errorData;
                }
            } catch (e) {
                // If JSON parsing fails, use status text
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        showToast("Repayment received successfully!", "success");
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById("receiveLoanRepaymentModal"));
        modal.hide();
        document.getElementById("receiveLoanRepaymentForm").reset();
        
        // Reload data
        await Promise.all([loadSummary(), loadLoans()]);
        await loadWallets(); // Reload wallets in case balance changed
        
    } catch (err) {
        console.error("❌ Error recording repayment:", err);
        showToast(err.message || "Failed to record repayment", "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// =================== VIEW REPAYMENTS ===================
async function viewDebtRepayments(debtId) {
    try {
        const response = await fetchWithAuth(`${API_URL}/debts-loans/debts/${debtId}/repayments`);
        const repayments = response || [];
        
        if (repayments.length === 0) {
            showToast("No repayments recorded yet", "info");
            return;
        }
        
        const repaymentsList = repayments.map(r => 
            `• ${formatCurrency(r.amount)} MAD on ${formatDate(r.created_at)}${r.note ? ` - ${r.note}` : ''}`
        ).join('\n');
        
        alert(`Repayment History:\n\n${repaymentsList}`);
    } catch (err) {
        console.error("❌ Error loading repayments:", err);
        showToast("Failed to load repayment history", "danger");
    }
}

async function viewLoanRepayments(loanId) {
    try {
        const response = await fetchWithAuth(`${API_URL}/debts-loans/loans/${loanId}/repayments`);
        const repayments = response || [];
        
        if (repayments.length === 0) {
            showToast("No repayments received yet", "info");
            return;
        }
        
        const repaymentsList = repayments.map(r => 
            `• ${formatCurrency(r.amount)} MAD on ${formatDate(r.created_at)}${r.note ? ` - ${r.note}` : ''}`
        ).join('\n');
        
        alert(`Repayment History:\n\n${repaymentsList}`);
    } catch (err) {
        console.error("❌ Error loading repayments:", err);
        showToast("Failed to load repayment history", "danger");
    }
}

// =================== EDIT & DELETE ===================
async function editDebt(debtId) {
    showToast("Edit functionality coming soon!", "info");
    // TODO: Implement edit functionality
}

async function deleteDebt(debtId) {
    if (!confirm("Are you sure you want to delete this debt? This action cannot be undone.")) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/debts-loans/debts/${debtId}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to delete debt: ${response.status}`);
        }
        
        showToast("Debt deleted successfully!", "success");
        await Promise.all([loadSummary(), loadDebts()]);
        await loadWallets();
    } catch (err) {
        console.error("❌ Error deleting debt:", err);
        showToast(err.message || "Failed to delete debt", "danger");
    }
}

async function editLoan(loanId) {
    showToast("Edit functionality coming soon!", "info");
    // TODO: Implement edit functionality
}

async function deleteLoan(loanId) {
    if (!confirm("Are you sure you want to delete this loan? This action cannot be undone.")) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/debts-loans/loans/${loanId}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to delete loan: ${response.status}`);
        }
        
        showToast("Loan deleted successfully!", "success");
        await Promise.all([loadSummary(), loadLoans()]);
        await loadWallets();
    } catch (err) {
        console.error("❌ Error deleting loan:", err);
        showToast(err.message || "Failed to delete loan", "danger");
    }
}

