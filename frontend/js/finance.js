// =================== Global Variables ===================
let editIncomeModal, typeModal, addWalletModal, editWalletModal, transferModal;
let addDebtModal, addLoanModal, repayDebtModal, receiveLoanRepaymentModal;
let wallets = [];
let types = [];
let incomes = [];
let debts = [];
let loans = [];
let summary = null;

// =================== DOMContentLoaded ===================
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Finance Dashboard initialized");

    // Check if config.js is loaded
    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined' || typeof fetchWithAuth === 'undefined') {
        console.error("❌ Config.js not loaded! Make sure config.js is loaded before finance.js");
        alert("Configuration error. Please refresh the page.");
        return;
    }

    // Auth check
    const tokenExists = localStorage.getItem("token");
    if (!tokenExists) {
        console.log("No token found, redirecting to login");
        window.location.href = "login.html";
        return;
    }

    // Load auth
    if (typeof loadAuth === 'function') loadAuth();

    // Set default date
    const today = new Date().toISOString().split('T')[0];
    const incomeDateInput = document.getElementById("incomeDate");
    if (incomeDateInput) incomeDateInput.value = today;

    // Initialize Modals
    editIncomeModal = new bootstrap.Modal(document.getElementById("editIncomeModal"));
    typeModal = new bootstrap.Modal(document.getElementById("typeModal"));
    addWalletModal = new bootstrap.Modal(document.getElementById("addWalletModal"));
    editWalletModal = new bootstrap.Modal(document.getElementById("editWalletModal"));
    transferModal = new bootstrap.Modal(document.getElementById("transferModal"));

    addDebtModal = new bootstrap.Modal(document.getElementById("addDebtModal"));
    addLoanModal = new bootstrap.Modal(document.getElementById("addLoanModal"));
    repayDebtModal = new bootstrap.Modal(document.getElementById("repayDebtModal"));
    receiveLoanRepaymentModal = new bootstrap.Modal(document.getElementById("receiveLoanRepaymentModal"));

    // Load Initial Data
    try {
        await Promise.all([
            loadWallets(),
            loadTypes(),
            loadIncomes(),
            loadTransactions(),
            loadDebtLoanSummary(),
            loadDebts(),
            loadLoans()
        ]);
    } catch (error) {
        console.error("Failed to load initial data:", error);
    }

    // Setup Event Listeners
    setupEventListeners();

    // Handle Hash Routing (e.g. finance.html#debts)
    handleHashRouting();
    window.addEventListener('hashchange', handleHashRouting);
});

function handleHashRouting() {
    const hash = window.location.hash;
    if (hash === '#debts' || hash === '#loans') {
        const tab = document.getElementById('debts-tab');
        if (tab) {
            const bsTab = new bootstrap.Tab(tab);
            bsTab.show();
        }
    } else {
        const tab = document.getElementById('personal-tab');
        if (tab) {
            const bsTab = new bootstrap.Tab(tab);
            bsTab.show();
        }
    }
}

// =================== EVENT LISTENERS ===================
function setupEventListeners() {
    // Income Forms
    document.getElementById("addIncomeForm").addEventListener("submit", (e) => { e.preventDefault(); addIncome(); });
    document.getElementById("saveIncomeChangesBtn").addEventListener("click", saveIncomeChanges);
    document.getElementById("saveTypeBtn").addEventListener("click", saveType);
    document.getElementById("saveWalletBtn").addEventListener("click", addWallet);
    document.getElementById("saveWalletChangesBtn").addEventListener("click", saveWalletChanges);
    document.getElementById("executeTransferBtn").addEventListener("click", executeTransfer);

    // Select change events for "Add New"
    document.getElementById("incomeCategory").addEventListener("change", checkAddNewType);
    document.getElementById("editIncomeCategory").addEventListener("change", checkAddNewType);
    document.getElementById("incomeWallet").addEventListener("change", checkAddNewWallet);
    document.getElementById("editIncomeWallet").addEventListener("change", checkAddNewWallet);

    // Debt/Loan Forms
    document.getElementById("addDebtForm").addEventListener("submit", async (e) => { e.preventDefault(); await createDebt(); });
    document.getElementById("addLoanForm").addEventListener("submit", async (e) => { e.preventDefault(); await createLoan(); });
    document.getElementById("repayDebtForm").addEventListener("submit", async (e) => { e.preventDefault(); await repayDebt(); });
    document.getElementById("receiveLoanRepaymentForm").addEventListener("submit", async (e) => { e.preventDefault(); await receiveLoanRepayment(); });

    // Filters
    document.querySelectorAll('input[name="debtFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => loadDebts(e.target.value === 'all' ? null : e.target.value));
    });
    document.querySelectorAll('input[name="loanFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => loadLoans(e.target.value === 'all' ? null : e.target.value));
    });
}

// =================== UTILITY FUNCTIONS ===================
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

    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}

// =================== WALLETS & TYPES ===================
async function loadWallets() {
    console.log("Loading wallets...");
    const walletContainer = document.getElementById("walletList");
    if (!walletContainer) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/wallets`);
        if (response === null) return;
        wallets = response || [];

        // Update UI
        renderWallets(walletContainer);
        updateWalletSelects();
    } catch (err) {
        console.error("❌ Failed to load wallets:", err);
        walletContainer.innerHTML = `<div class="col-12 text-center text-danger py-4"><p>Error loading wallets: ${err.message}</p></div>`;
    }
}

function renderWallets(container) {
    container.innerHTML = "";
    if (wallets.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="bi bi-wallet2 fs-1 mb-3"></i>
                <h5>No Wallets Yet</h5>
                <p class="mb-0">Start by adding your first wallet!</p>
            </div>
        `;
    } else {
        wallets.forEach(w => {
            const div = document.createElement("div");
            div.className = "col-md-3 col-10 mb-3";

            // Determine icon and color based on category
            let iconClass = "bi-wallet2";
            let bgClass = "bg-info";
            let textClass = "text-info";
            const cat = (w.category || "").toLowerCase();

            if (cat.includes("bank")) { iconClass = "bi-bank"; bgClass = "bg-primary"; textClass = "text-primary"; }
            else if (cat.includes("cash")) { iconClass = "bi-cash-stack"; bgClass = "bg-success"; textClass = "text-success"; }
            else if (cat.includes("credit")) { iconClass = "bi-credit-card"; bgClass = "bg-danger"; textClass = "text-danger"; }

            div.innerHTML = `
                <div class="wallet-card" data-type="${w.category || 'Other'}">
                    <div class="stat-icon ${bgClass} mx-auto mb-3">
                        <i class="bi ${iconClass}"></i>
                    </div>
                    <h6 class="text-muted mb-1 text-uppercase small ls-1">${w.category || 'Wallet'}</h6>
                    <h5 class="fw-bold mb-1 text-dark">${w.name}</h5>
                    <h3 class="fw-bold mb-3 ${textClass}">${w.balance.toFixed(2)} MAD</h3>
                    
                    <div class="d-flex justify-content-center gap-2">
                        <button class="btn btn-sm btn-light border" onclick="transferFromWallet(${w.id})" title="Transfer">
                            <i class="bi bi-arrow-right"></i>
                        </button>
                        <button class="btn btn-sm btn-light border" onclick="editWallet(${w.id})" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-light border" onclick="deleteWallet(${w.id})" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }
}

function updateWalletSelects() {
    // Income selects
    const incomeSelects = [document.getElementById("incomeWallet"), document.getElementById("editIncomeWallet")];
    incomeSelects.forEach(sel => {
        if (!sel) return;
        sel.innerHTML = "";
        const placeholder = new Option("-- Select Wallet --", "");
        placeholder.selected = true;
        placeholder.disabled = true;
        sel.appendChild(placeholder);
        wallets.forEach(w => sel.append(new Option(`${w.name} (${w.category || ""})`, w.id)));
        sel.append(new Option("➕ Add New Wallet", "add_new_wallet"));
    });

    // Debt/Loan selects
    const debtSelects = [
        document.getElementById("debtWallet"),
        document.getElementById("loanWallet"),
        document.getElementById("repayDebtWallet"),
        document.getElementById("receiveLoanRepaymentWallet")
    ];
    debtSelects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">-- No Wallet (Just Track) --</option>';
        wallets.forEach(w => {
            select.append(new Option(`${w.name} (${w.category || ""}) - Balance: ${w.balance.toFixed(2)} MAD`, w.id));
        });
    });
}


async function loadTypes() {
    const typesContainer = document.getElementById("incomeTypesList");
    if (!typesContainer) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/incometype/`);
        types = response || [];

        // Update Selects
        const selects = [document.getElementById("incomeCategory"), document.getElementById("editIncomeCategory")];
        selects.forEach(sel => {
            sel.innerHTML = "";
            sel.append(new Option("-- Select Type --", ""));
            types.forEach(t => sel.append(new Option(t.name, t.id)));
            sel.append(new Option("➕ Add New Type", "add_new_type"));
            sel.value = "";
        });

        // Render Types List
        typesContainer.innerHTML = "";
        if (types.length === 0) {
            typesContainer.innerHTML = `<div class="col-12 text-center text-muted py-5"><p>No income types yet.</p></div>`;
        } else {
            types.forEach(type => {
                const div = document.createElement("div");
                div.className = "col-md-3 mb-3";
                div.innerHTML = `
                    <div class="income-type-card">
                        <h6 class="mb-3">${type.name}</h6>
                        <div class="d-flex justify-content-center gap-2">
                            <button class="btn btn-sm btn-warning" onclick="editIncomeType(${type.id})"><i class="bi bi-pencil-fill"></i></button>
                            <button class="btn btn-sm btn-danger" onclick="deleteIncomeType(${type.id})"><i class="bi bi-trash-fill"></i></button>
                        </div>
                    </div>
                `;
                typesContainer.appendChild(div);
            });
        }
    } catch (err) {
        console.error("Failed to load types:", err);
    }
}

// =================== INCOME FUNCTIONS ===================
async function loadIncomes() {
    const incomesList = document.getElementById("incomesList");
    if (!incomesList) return;

    incomesList.innerHTML = '<div class="text-center text-muted py-4"><div class="spinner-border text-success"></div><p>Loading incomes...</p></div>';

    try {
        const response = await fetchWithAuth(`${API_URL}/incomes`);
        incomes = response || [];

        // Load Summary
        let summary = { bank: 0, cash: 0, total: 0 };
        try {
            const summaryResponse = await fetchWithAuth(`${API_URL}/incomes/summary`);
            if (summaryResponse) summary = summaryResponse;
        } catch (e) { console.warn("Summary load failed", e); }

        document.getElementById("bankBalance").innerText = (summary.bank || 0).toFixed(2) + " MAD";
        document.getElementById("cashBalance").innerText = (summary.cash || 0).toFixed(2) + " MAD";
        document.getElementById("totalBalance").innerText = (summary.total || 0).toFixed(2) + " MAD";

        const badge = document.getElementById("incomesCountBadge");
        if (badge) badge.textContent = incomes.length;

        if (incomes.length === 0) {
            incomesList.innerHTML = `<div class="text-center text-muted py-5"><h5>No Income Records</h5></div>`;
            return;
        }

        incomesList.innerHTML = `
            <!-- Desktop Table -->
            <div class="table-responsive d-none d-md-block">
                <table class="table table-hover finance-table align-middle">
                    <thead class="bg-light">
                        <tr>
                            <th class="border-0 rounded-start">Date</th>
                            <th class="border-0">Category</th>
                            <th class="border-0">Wallet</th>
                            <th class="border-0">Note</th>
                            <th class="text-end border-0">Amount</th>
                            <th class="text-end border-0 rounded-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${incomes.map(i => `
                            <tr>
                                <td class="text-muted">${i.date ? new Date(i.date).toLocaleDateString() : (i.created_at ? new Date(i.created_at).toLocaleDateString() : "")}</td>
                                <td><span class="fw-semibold text-dark">${i.category_name || "Income"}</span></td>
                                <td><span class="badge bg-light text-dark border">${i.wallet_name || "N/A"}</span></td>
                                <td><small class="text-muted text-truncate d-inline-block" style="max-width: 150px;">${i.note || "-"}</small></td>
                                <td class="text-end fw-bold text-success">+${i.amount ? i.amount.toFixed(2) : "0.00"} MAD</td>
                                <td class="text-end">
                                    <button class="btn btn-sm btn-light text-warning" onclick="editIncome(${i.id})" title="Edit"><i class="bi bi-pencil-fill"></i></button>
                                    <button class="btn btn-sm btn-light text-danger" onclick="deleteIncome(${i.id})" title="Delete"><i class="bi bi-trash-fill"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Mobile Cards -->
            <div class="d-md-none">
                ${incomes.map(i => `
                    <div class="debt-loan-card card mb-3 shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="mb-1 fw-bold text-dark">${i.category_name || "Income"}</h6>
                                    <p class="text-muted mb-0 small"><i class="bi bi-calendar me-1"></i>${i.date ? new Date(i.date).toLocaleDateString() : ""}</p>
                                </div>
                                <span class="badge bg-success-subtle text-success fs-6">+${i.amount ? i.amount.toFixed(2) : "0.00"} MAD</span>
                            </div>
                            <div class="row mb-3 g-2">
                                <div class="col-6">
                                    <small class="text-muted d-block mb-1">Wallet</small>
                                    <span class="badge bg-light text-dark border">${i.wallet_name || "N/A"}</span>
                                </div>
                            </div>
                            ${i.note ? `<div class="bg-light p-2 rounded mb-3"><small class="text-muted"><i class="bi bi-sticky me-1"></i>${i.note}</small></div>` : ''}
                            <div class="d-flex gap-2 justify-content-end border-top pt-3">
                                <button class="btn btn-sm btn-outline-warning" onclick="editIncome(${i.id})"><i class="bi bi-pencil-fill me-1"></i>Edit</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteIncome(${i.id})"><i class="bi bi-trash-fill me-1"></i>Delete</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        console.error(err);
        incomesList.innerHTML = `<div class="text-center text-danger py-4"><p>Error loading incomes</p></div>`;
    }
}

async function addIncome() {
    const amount = parseFloat(document.getElementById("incomeAmount").value);
    const date = document.getElementById("incomeDate").value;
    const income_type_id = document.getElementById("incomeCategory").value;
    const wallet_id = document.getElementById("incomeWallet").value;
    const note = document.getElementById("incomeNote").value.trim();

    if (!amount || amount <= 0 || !income_type_id || !wallet_id) return alert("Please fill all required fields");

    const btn = document.getElementById("addIncomeBtn");
    const spinner = document.getElementById("addIncomeSpinner");
    btn.disabled = true; spinner.classList.remove("d-none");

    try {
        const res = await fetch(`${API_URL}/incomes`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                amount,
                income_type_id: parseInt(income_type_id),
                wallet_id: parseInt(wallet_id),
                note: note || null,
                date: date ? new Date(date).toISOString() : null
            })
        });
        if (!res.ok) throw new Error(await res.text());

        alert("✅ Income added!");
        bootstrap.Modal.getInstance(document.getElementById("addIncomeModal")).hide();
        document.getElementById("addIncomeForm").reset();
        loadIncomes();
        loadWallets();
    } catch (err) {
        alert("❌ Failed: " + err.message);
    } finally {
        btn.disabled = false; spinner.classList.add("d-none");
    }
}

async function editIncome(id) {
    let income = incomes.find(i => i.id === id);
    if (!income) return;

    document.getElementById("editIncomeId").value = income.id;
    document.getElementById("editIncomeAmount").value = income.amount;

    const dateVal = income.date || income.created_at;
    if (dateVal) document.getElementById("editIncomeDate").value = new Date(dateVal).toISOString().split('T')[0];

    document.getElementById("editIncomeCategory").value = income.income_type_id;
    document.getElementById("editIncomeWallet").value = income.wallet_id;
    document.getElementById("editIncomeNote").value = income.note || "";

    editIncomeModal.show();
}

async function saveIncomeChanges() {
    const id = document.getElementById("editIncomeId").value;
    const amount = parseFloat(document.getElementById("editIncomeAmount").value);

    try {
        const res = await fetch(`${API_URL}/incomes/${id}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify({
                amount,
                income_type_id: parseInt(document.getElementById("editIncomeCategory").value),
                wallet_id: parseInt(document.getElementById("editIncomeWallet").value),
                note: document.getElementById("editIncomeNote").value.trim() || null,
                date: new Date(document.getElementById("editIncomeDate").value).toISOString()
            })
        });
        if (!res.ok) throw new Error(await res.text());

        editIncomeModal.hide();
        loadIncomes();
        loadWallets();
    } catch (err) {
        alert("❌ Failed: " + err.message);
    }
}

async function deleteIncome(id) {
    if (!confirm("Are you sure?")) return;
    const res = await fetch(`${API_URL}/incomes/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) { loadIncomes(); loadWallets(); }
}

// =================== WALLET & TYPE MANAGEMENT ===================
function checkAddNewType(e) {
    if (e.target.value === "add_new_type") {
        document.getElementById("editTypeId").value = "";
        document.getElementById("typeName").value = "";
        document.getElementById("typeModalTitle").textContent = "Add Income Type";
        typeModal.show();
        e.target.value = "";
    }
}

function checkAddNewWallet(e) {
    if (e.target.value === "add_new_wallet") {
        document.getElementById("editWalletId").value = "";
        document.getElementById("walletName").value = "";
        document.getElementById("walletType").value = "";
        document.getElementById("walletAmount").value = "";
        addWalletModal.show();
        e.target.value = "";
    }
}

async function saveType() {
    const id = document.getElementById("editTypeId").value;
    const name = document.getElementById("typeName").value.trim();
    if (!name) return alert("Enter name");

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/incometype/${id}` : `${API_URL}/incometype/`;

    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify({ name }) });
    if (res.ok) { typeModal.hide(); loadTypes(); }
    else alert("Failed");
}

async function editIncomeType(id) {
    const type = types.find(t => t.id === id);
    if (!type) return;
    document.getElementById("editTypeId").value = type.id;
    document.getElementById("typeName").value = type.name;
    document.getElementById("typeModalTitle").textContent = "Edit Income Type";
    typeModal.show();
}

async function deleteIncomeType(id) {
    if (!confirm("Delete this type?")) return;
    const res = await fetch(`${API_URL}/incometype/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) loadTypes();
}

async function addWallet() {
    const data = {
        name: document.getElementById("walletName").value,
        category: document.getElementById("walletType").value,
        balance: parseFloat(document.getElementById("walletAmount").value) || 0
    };
    const res = await fetch(`${API_URL}/wallets`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
    if (res.ok) { addWalletModal.hide(); loadWallets(); }
}

async function editWallet(id) {
    const wallet = wallets.find(w => w.id === id);
    if (!wallet) return;
    document.getElementById("editWalletId").value = wallet.id;
    document.getElementById("editWalletName").value = wallet.name;
    document.getElementById("editWalletType").value = wallet.category || "Other";
    editWalletModal.show();
}

async function saveWalletChanges() {
    const id = document.getElementById("editWalletId").value;
    const res = await fetch(`${API_URL}/wallets/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
            name: document.getElementById("editWalletName").value,
            category: document.getElementById("editWalletType").value
        })
    });
    if (res.ok) { editWalletModal.hide(); loadWallets(); }
}

async function deleteWallet(id) {
    if (!confirm("Delete wallet?")) return;
    const res = await fetch(`${API_URL}/wallets/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) loadWallets();
}

// =================== TRANSACTIONS ===================
async function loadTransactions() {
    const list = document.getElementById("transactionsList");
    if (!list) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/transactions`);
        const transactions = response || [];

        const badge = document.getElementById("transactionsCountBadge");
        if (badge) badge.textContent = transactions.length;

        if (transactions.length === 0) {
            list.innerHTML = `<div class="text-center text-muted py-5"><h5>No Transactions</h5></div>`;
            return;
        }

        list.innerHTML = `
            <!-- Desktop Table -->
            <div class="table-responsive d-none d-md-block">
                <table class="table table-hover finance-table align-middle">
                    <thead class="bg-light">
                        <tr>
                            <th class="border-0 rounded-start">ID</th>
                            <th class="border-0">Date</th>
                            <th class="border-0">Type</th>
                            <th class="border-0">From</th>
                            <th class="border-0">To</th>
                            <th class="text-end border-0 rounded-end">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(t => {
            const date = t.created_at ? new Date(t.created_at).toLocaleDateString() : "";
            const isDebt = t.transaction_type === 'debt';
            const isCredit = t.transaction_type === 'credit';
            const typeBadge = isDebt ? 'Debt' : isCredit ? 'Credit' : 'Transfer';
            const typeColor = isDebt ? 'danger' : isCredit ? 'success' : 'info';

            // Use nested wallet objects
            const fromWalletName = t.from_wallet ? t.from_wallet.name : 'N/A';
            const toWalletName = t.to_wallet ? t.to_wallet.name : 'N/A';
            const toWallet = isDebt || isCredit ? 'External' : toWalletName;

            return `
                            <tr>
                                <td class="text-muted">#${t.id}</td>
                                <td>${date}</td>
                                <td><span class="badge bg-${typeColor}-subtle text-${typeColor} border border-${typeColor}">${typeBadge}</span></td>
                                <td><span class="fw-medium">${fromWalletName}</span></td>
                                <td><span class="fw-medium">${toWallet}</span></td>
                                <td class="text-end fw-bold text-primary">${t.amount.toFixed(2)} MAD</td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Mobile Cards -->
            <div class="d-md-none">
                ${transactions.map(t => {
            const date = t.created_at ? new Date(t.created_at).toLocaleDateString() : "";
            const isDebt = t.transaction_type === 'debt';
            const isCredit = t.transaction_type === 'credit';
            const typeBadge = isDebt ? 'Debt' : isCredit ? 'Credit' : 'Transfer';
            const typeColor = isDebt ? 'danger' : isCredit ? 'success' : 'info';

            // Use nested wallet objects
            const fromWalletName = t.from_wallet ? t.from_wallet.name : 'N/A';
            const toWalletName = t.to_wallet ? t.to_wallet.name : 'N/A';
            const toWallet = isDebt || isCredit ? 'External' : toWalletName;

            return `
                        <div class="debt-loan-card card mb-3 shadow-sm border-0">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <div><span class="text-muted small">#${t.id}</span> <span class="text-muted small ms-2">${date}</span></div>
                                    <span class="badge bg-${typeColor}-subtle text-${typeColor}">${typeBadge}</span>
                                </div>
                                <div class="d-flex align-items-center justify-content-between mb-3">
                                    <div class="text-center">
                                        <small class="text-muted d-block">From</small>
                                        <span class="fw-medium">${fromWalletName}</span>
                                    </div>
                                    <i class="bi bi-arrow-right text-muted"></i>
                                    <div class="text-center">
                                        <small class="text-muted d-block">To</small>
                                        <span class="fw-medium">${toWallet}</span>
                                    </div>
                                </div>
                                <div class="text-center border-top pt-2">
                                    <h5 class="text-primary fw-bold mb-0">${t.amount.toFixed(2)} MAD</h5>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    } catch (e) { console.error(e); }
}

async function transferFromWallet(id) {
    const wallet = wallets.find(w => w.id === id);
    if (!wallet) return;

    const fromSelect = document.getElementById("transferFromWallet");
    fromSelect.innerHTML = "";
    fromSelect.appendChild(new Option(`${wallet.name} (${wallet.category})`, wallet.id));
    fromSelect.value = wallet.id;
    fromSelect.disabled = true;

    const toSelect = document.getElementById("transferToWallet");
    toSelect.innerHTML = '<option value="">-- Select Destination --</option>';
    wallets.filter(w => w.id !== id).forEach(w => toSelect.appendChild(new Option(`${w.name} (${w.category})`, w.id)));

    transferModal.show();
}

async function executeTransfer() {
    const from = document.getElementById("transferFromWallet").value;
    const to = document.getElementById("transferToWallet").value;
    const amount = parseFloat(document.getElementById("transferAmount").value);
    const note = document.getElementById("transferNote").value;

    if (!from || !to || !amount) return alert("Invalid transfer");

    const res = await fetch(`${API_URL}/wallets/transfer`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ from_wallet_id: parseInt(from), to_wallet_id: parseInt(to), amount, note })
    });

    if (res.ok) {
        alert("Transfer successful!");
        transferModal.hide();
        loadWallets();
        loadTransactions();
    } else {
        alert("Transfer failed");
    }
}

// =================== DEBTS & LOANS FUNCTIONS ===================
async function loadDebtLoanSummary() {
    try {
        const response = await fetchWithAuth(`${API_URL}/debts-loans/summary`);
        summary = response || { total_debt: 0, total_loans: 0, net: 0 };

        document.getElementById("totalDebt").textContent = `${formatCurrency(summary.total_debt)} MAD`;
        document.getElementById("totalLoans").textContent = `${formatCurrency(summary.total_loans)} MAD`;
        document.getElementById("netAmount").textContent = `${formatCurrency(summary.net)} MAD`;
        document.getElementById("debtsCountBadge").textContent = summary.total_debts_count || 0;
        document.getElementById("loansCountBadge").textContent = summary.total_loans_count || 0;
    } catch (e) { console.error(e); }
}

async function loadDebts(status = null) {
    const container = document.getElementById("debtsList");
    if (!container) return;
    container.innerHTML = '<div class="spinner-border text-danger"></div>';

    try {
        const url = status && status !== 'all' ? `${API_URL}/debts-loans/debts?status=${status}` : `${API_URL}/debts-loans/debts`;
        const response = await fetchWithAuth(url);
        debts = response || [];

        if (debts.length === 0) {
            container.innerHTML = `<div class="text-center py-5"><h5>No Debts Found</h5></div>`;
            return;
        }

        container.innerHTML = debts.map(d => {
            const badge = d.status === 'active' ? 'bg-danger' : d.status === 'partially_paid' ? 'bg-warning' : 'bg-success';
            const statusText = d.status.replace('_', ' ').toUpperCase();
            return `
                <div class="debt-loan-card card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div><h5 class="mb-1">${d.lender_name}</h5><p class="small text-muted">${formatDate(d.created_at)}</p></div>
                            <span class="badge ${badge}">${statusText}</span>
                        </div>
                        <div class="row mb-3">
                            <div class="col-4"><small>Original</small><p class="fw-bold">${formatCurrency(d.original_amount)}</p></div>
                            <div class="col-4"><small>Remaining</small><p class="fw-bold text-danger">${formatCurrency(d.remaining_amount)}</p></div>
                            <div class="col-4"><small>Paid</small><p class="fw-bold text-success">${formatCurrency(d.total_paid)}</p></div>
                        </div>
                        ${d.remaining_amount > 0 ? `<button class="btn btn-sm btn-primary" onclick="openRepayDebtModal(${d.id}, ${d.remaining_amount})">Repay</button>` : ''}
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteDebt(${d.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

async function loadLoans(status = null) {
    const container = document.getElementById("loansList");
    if (!container) return;
    container.innerHTML = '<div class="spinner-border text-success"></div>';

    try {
        const url = status && status !== 'all' ? `${API_URL}/debts-loans/loans?status=${status}` : `${API_URL}/debts-loans/loans`;
        const response = await fetchWithAuth(url);
        loans = response || [];

        if (loans.length === 0) {
            container.innerHTML = `<div class="text-center py-5"><h5>No Loans Found</h5></div>`;
            return;
        }

        container.innerHTML = loans.map(l => {
            const badge = l.status === 'active' ? 'bg-success' : l.status === 'partially_paid' ? 'bg-warning' : 'bg-secondary';
            const statusText = l.status.replace('_', ' ').toUpperCase();
            return `
                <div class="debt-loan-card card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div><h5 class="mb-1">${l.borrower_name}</h5><p class="small text-muted">${formatDate(l.created_at)}</p></div>
                            <span class="badge ${badge}">${statusText}</span>
                        </div>
                        <div class="row mb-3">
                            <div class="col-4"><small>Original</small><p class="fw-bold">${formatCurrency(l.original_amount)}</p></div>
                            <div class="col-4"><small>Remaining</small><p class="fw-bold text-danger">${formatCurrency(l.remaining_amount)}</p></div>
                            <div class="col-4"><small>Paid</small><p class="fw-bold text-success">${formatCurrency(l.total_paid)}</p></div>
                        </div>
                        ${l.remaining_amount > 0 ? `<button class="btn btn-sm btn-success" onclick="openReceiveLoanRepaymentModal(${l.id}, ${l.remaining_amount})">Receive</button>` : ''}
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteLoan(${l.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

async function createDebt() {
    const payload = {
        lender_name: document.getElementById("debtLenderName").value,
        original_amount: parseFloat(document.getElementById("debtAmount").value),
        wallet_id: document.getElementById("debtWallet").value ? parseInt(document.getElementById("debtWallet").value) : null,
        due_date: document.getElementById("debtDueDate").value || null,
        note: document.getElementById("debtNote").value || null
    };

    try {
        const res = await fetch(`${API_URL}/debts-loans/debts`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed");

        showToast("Debt created", "success");
        addDebtModal.hide();
        document.getElementById("addDebtForm").reset();
        loadDebtLoanSummary(); loadDebts(); loadWallets();
    } catch (e) { showToast(e.message, "danger"); }
}

async function createLoan() {
    const payload = {
        borrower_name: document.getElementById("loanBorrowerName").value,
        original_amount: parseFloat(document.getElementById("loanAmount").value),
        wallet_id: document.getElementById("loanWallet").value ? parseInt(document.getElementById("loanWallet").value) : null,
        due_date: document.getElementById("loanDueDate").value || null,
        note: document.getElementById("loanNote").value || null
    };

    try {
        const res = await fetch(`${API_URL}/debts-loans/loans`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed");

        showToast("Loan created", "success");
        addLoanModal.hide();
        document.getElementById("addLoanForm").reset();
        loadDebtLoanSummary(); loadLoans(); loadWallets();
    } catch (e) { showToast(e.message, "danger"); }
}

function openRepayDebtModal(id, remaining) {
    document.getElementById("repayDebtId").value = id;
    document.getElementById("repayDebtRemaining").value = formatCurrency(remaining);
    document.getElementById("repayDebtAmount").max = remaining;
    repayDebtModal.show();
}

async function repayDebt() {
    const id = document.getElementById("repayDebtId").value;
    const payload = {
        amount: parseFloat(document.getElementById("repayDebtAmount").value),
        wallet_id: document.getElementById("repayDebtWallet").value ? parseInt(document.getElementById("repayDebtWallet").value) : null,
        note: document.getElementById("repayDebtNote").value || null
    };

    try {
        const res = await fetch(`${API_URL}/debts-loans/debts/${id}/repay`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed");

        showToast("Repayment recorded", "success");
        repayDebtModal.hide();
        loadDebtLoanSummary(); loadDebts(); loadWallets();
    } catch (e) { showToast(e.message, "danger"); }
}

function openReceiveLoanRepaymentModal(id, remaining) {
    document.getElementById("receiveLoanRepaymentId").value = id;
    document.getElementById("receiveLoanRepaymentRemaining").value = formatCurrency(remaining);
    document.getElementById("receiveLoanRepaymentAmount").max = remaining;
    receiveLoanRepaymentModal.show();
}

async function receiveLoanRepayment() {
    const id = document.getElementById("receiveLoanRepaymentId").value;
    const payload = {
        amount: parseFloat(document.getElementById("receiveLoanRepaymentAmount").value),
        wallet_id: document.getElementById("receiveLoanRepaymentWallet").value ? parseInt(document.getElementById("receiveLoanRepaymentWallet").value) : null,
        note: document.getElementById("receiveLoanRepaymentNote").value || null
    };

    try {
        const res = await fetch(`${API_URL}/debts-loans/loans/${id}/repay`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed");

        showToast("Repayment received", "success");
        receiveLoanRepaymentModal.hide();
        loadDebtLoanSummary(); loadLoans(); loadWallets();
    } catch (e) { showToast(e.message, "danger"); }
}

async function deleteDebt(id) {
    if (!confirm("Delete debt?")) return;
    const res = await fetch(`${API_URL}/debts-loans/debts/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) { loadDebtLoanSummary(); loadDebts(); loadWallets(); }
}

async function deleteLoan(id) {
    if (!confirm("Delete loan?")) return;
    const res = await fetch(`${API_URL}/debts-loans/loans/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) { loadDebtLoanSummary(); loadLoans(); loadWallets(); }
}
