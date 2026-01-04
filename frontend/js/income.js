// =================== Global Variables ===================
let editIncomeModal, typeModal, addWalletModal, editWalletModal, transferModal;
let wallets = [];
let types = [];

// =================== DOMContentLoaded ===================
document.addEventListener("DOMContentLoaded", async () => {
    // Check if config.js is loaded
    if (typeof API_URL === 'undefined' || typeof getHeaders === 'undefined' || typeof fetchWithAuth === 'undefined') {
        console.error("❌ Config.js not loaded! Make sure config.js is loaded before income.js");
        alert("Configuration error. Please refresh the page.");
        return;
    }

    // Simple auth check - just check if token exists
    const tokenExists = localStorage.getItem("token");

    if (!tokenExists) {
        console.log("No token found, redirecting to login");
        window.location.href = "login.html";
        return;
    }

    // Load auth
    if (typeof loadAuth === 'function') {
        loadAuth();
    } else {
        console.error("loadAuth function not found");
        return;
    }

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const incomeDateInput = document.getElementById("incomeDate");
    if (incomeDateInput) {
        incomeDateInput.value = today;
    }

    // Initialize modals
    editIncomeModal = new bootstrap.Modal(document.getElementById("editIncomeModal"));
    typeModal = new bootstrap.Modal(document.getElementById("typeModal"));
    addWalletModal = new bootstrap.Modal(document.getElementById("addWalletModal"));
    editWalletModal = new bootstrap.Modal(document.getElementById("editWalletModal"));
    transferModal = new bootstrap.Modal(document.getElementById("transferModal"));

    // Load data sequentially to avoid race conditions
    try {
        await loadWallets();
        await loadTypes();
        await loadIncomes();
        await loadTransactions();
    } catch (error) {
        console.error("Failed to load initial data:", error);
    }

    // Button events
    document.getElementById("addIncomeForm").addEventListener("submit", (e) => {
        e.preventDefault();
        addIncome();
    });
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

});

// =================== LOAD DATA ===================

async function loadTypes() {
    console.log("Loading income types...");
    const typesContainer = document.getElementById("incomeTypesList");
    if (!typesContainer) {
        console.error("Income types container not found");
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}/incometype/`);
        if (response === null) {
            // User was redirected to login
            return;
        }
        types = response || [];
        console.log("✅ Loaded income types:", types.length);
    } catch (err) {
        console.error("❌ Failed to load income types:", err);
        types = [];
        typesContainer.innerHTML = `
            <div class="col-12 text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
                <h5>Error Loading Income Types</h5>
                <p class="mb-0">${err.message || "Failed to load income types"}</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadTypes()">Retry</button>
            </div>
        `;
        return;
    }

    const selects = [document.getElementById("incomeCategory"), document.getElementById("editIncomeCategory")];

    selects.forEach(sel => {
        sel.innerHTML = "";
        sel.append(new Option("-- Select Type --", ""));
        types.forEach(t => sel.append(new Option(t.name, t.id)));
        sel.append(new Option("➕ Add New Type", "add_new_type"));
        sel.value = "";
    });

    // Display income types with edit/delete buttons
    if (!typesContainer) return;
    typesContainer.innerHTML = "";

    if (types.length === 0) {
        typesContainer.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="bi bi-tags fs-1 mb-3"></i>
                <h5>No Income Types Yet</h5>
                <p class="mb-0">Add income types to categorize your income!</p>
            </div>
        `;
    } else {
        types.forEach(type => {
            const div = document.createElement("div");
            div.className = "col-md-3 mb-3";
            div.innerHTML = `
                <div class="income-type-card">
                    <h6 class="mb-3">${type.name}</h6>
                    <div class="d-flex justify-content-center gap-2">
                        <button class="btn btn-sm btn-warning" onclick="editIncomeType(${type.id})" title="Edit type">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteIncomeType(${type.id})" title="Delete type">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </div>
                </div>
            `;
            typesContainer.appendChild(div);
        });
    }
}

async function loadWallets() {
    console.log("Loading wallets...");
    const walletContainer = document.getElementById("walletList");
    if (!walletContainer) {
        console.error("Wallet container not found");
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}/wallets`);
        if (response === null) {
            // User was redirected to login
            return;
        }
        wallets = response || [];
        console.log("✅ Loaded wallets:", wallets.length);
    } catch (err) {
        console.error("❌ Failed to load wallets:", err);
        wallets = [];
        walletContainer.innerHTML = `
            <div class="col-12 text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
                <h5>Error Loading Wallets</h5>
                <p class="mb-0">${err.message || "Failed to load wallets"}</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadWallets()">Retry</button>
            </div>
        `;
        return;
    }

    walletContainer.innerHTML = "";

    const selects = [document.getElementById("incomeWallet"), document.getElementById("editIncomeWallet")];

    selects.forEach(sel => {
        sel.innerHTML = "";
        const placeholder = new Option("-- Select Wallet --", "");
        placeholder.selected = true;
        placeholder.disabled = true;
        sel.appendChild(placeholder);
        wallets.forEach(w => sel.append(new Option(`${w.name} (${w.category || ""})`, w.id)));
        sel.append(new Option("➕ Add New Wallet", "add_new_wallet"));
    });

    // Wallet cards
    if (wallets.length === 0) {
        walletContainer.innerHTML = `
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
            walletContainer.appendChild(div);
        });
    }
}

// =================== ADD / EDIT INCOME ===================
let incomes = []; // Store globally for caching

async function loadIncomes() {
    const incomesList = document.getElementById("incomesList");

    if (!incomesList) {
        console.error("Incomes list container not found");
        return;
    }

    incomesList.innerHTML = '<div class="text-center text-muted py-4"><div class="spinner-border text-success"></div><p class="mt-2 mb-0">Loading incomes...</p></div>';

    try {
        const response = await fetchWithAuth(`${API_URL}/incomes`);
        if (response === null) {
            // User was redirected to login
            return;
        }
        incomes = response || [];
        console.log("✅ Loaded incomes:", incomes.length);
    } catch (err) {
        console.error("❌ GET /incomes failed:", err);
        incomes = [];
        incomesList.innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
                <h5>Error Loading Incomes</h5>
                <p class="mb-0">${err.message || "Failed to load incomes"}</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadIncomes()">Retry</button>
            </div>
        `;
        return;
    }

    let summary = { bank: 0, cash: 0, total: 0 };
    try {
        const summaryResponse = await fetchWithAuth(`${API_URL}/incomes/summary`);
        if (summaryResponse !== null) {
            summary = summaryResponse || summary;
        }
    } catch (err) {
        console.warn("⚠️ GET /incomes/summary failed:", err);
    }

    const bankBalanceEl = document.getElementById("bankBalance");
    const cashBalanceEl = document.getElementById("cashBalance");
    const totalBalanceEl = document.getElementById("totalBalance");

    if (bankBalanceEl) bankBalanceEl.innerText = (summary.bank || 0).toFixed(2) + " MAD";
    if (cashBalanceEl) cashBalanceEl.innerText = (summary.cash || 0).toFixed(2) + " MAD";
    if (totalBalanceEl) totalBalanceEl.innerText = (summary.total || 0).toFixed(2) + " MAD";

    // Update count badge
    const incomesCountBadge = document.getElementById("incomesCountBadge");
    if (incomesCountBadge) {
        incomesCountBadge.textContent = incomes.length;
    }

    if (incomes.length === 0) {
        incomesList.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-receipt fs-1 mb-3"></i>
                <h5>No Income Records</h5>
                <p class="mb-0">Start by adding your first income!</p>
            </div>
        `;
        return;
    }

    incomesList.innerHTML = incomes.map(i => {
        const date = i.date ? new Date(i.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) :
            (i.created_at ? new Date(i.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "");

        return `
            <div class="debt-loan-card card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="mb-1">${i.category_name || "Income"}</h5>
                            <p class="text-muted mb-0 small"><i class="bi bi-calendar me-1"></i>${date}</p>
                        </div>
                        <span class="badge bg-success fs-6">${i.amount ? i.amount.toFixed(2) : "0.00"} MAD</span>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6 col-12 mb-2 mb-md-0">
                            <small class="text-muted">Wallet</small>
                            <p class="mb-0 fw-bold">${i.wallet_name || "N/A"}</p>
                        </div>
                        <div class="col-md-6 col-12">
                            <small class="text-muted">Amount</small>
                            <p class="mb-0 fw-bold text-success">${i.amount ? i.amount.toFixed(2) : "0.00"} MAD</p>
                        </div>
                    </div>
                    
                    ${i.note ? `<p class="text-muted small mb-2"><i class="bi bi-sticky me-1"></i>${i.note}</p>` : ''}
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-warning" onclick="editIncome(${i.id})">
                            <i class="bi bi-pencil-fill me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteIncome(${i.id})">
                            <i class="bi bi-trash-fill me-1"></i>Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =================== LOAD TRANSACTIONS ===================
async function loadTransactions() {
    const transactionsList = document.getElementById("transactionsList");

    if (!transactionsList) {
        console.error("Transactions list container not found");
        return;
    }

    transactionsList.innerHTML = '<div class="text-center text-muted py-4"><div class="spinner-border text-info"></div><p class="mt-2 mb-0">Loading transactions...</p></div>';

    try {
        const response = await fetchWithAuth(`${API_URL}/transactions`);
        if (response === null) {
            // User was redirected to login
            return;
        }
        const transactions = response || [];
        console.log("✅ Loaded transactions:", transactions.length);

        // Update count badge
        const transactionsCountBadge = document.getElementById("transactionsCountBadge");
        if (transactionsCountBadge) {
            transactionsCountBadge.textContent = transactions.length;
        }

        if (transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-arrow-left-right fs-1 mb-3"></i>
                    <h5>No Transactions</h5>
                    <p class="mb-0">No wallet transfers yet!</p>
                </div>
            `;
            return;
        }

        transactionsList.innerHTML = transactions.map(t => {
            const date = t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "";

            // Determine transaction type and display
            const isDebt = t.transaction_type === 'debt';
            const isCredit = t.transaction_type === 'credit';
            const isTransfer = t.transaction_type === 'transfer';

            let typeBadge;
            let typeColor;
            let toWalletDisplay;

            if (isDebt) {
                typeBadge = 'Debt';
                typeColor = 'success';
                toWalletDisplay = 'External';
            } else if (isCredit) {
                typeBadge = 'Credit';
                typeColor = 'danger';
                toWalletDisplay = 'External';
            } else {
                typeBadge = 'Transfer';
                typeColor = 'info';
                toWalletDisplay = t.to_wallet_name || 'N/A';
            }

            return `
                <div class="debt-loan-card card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 class="mb-1">Transaction #${t.id}</h5>
                                <p class="text-muted mb-0 small"><i class="bi bi-calendar me-1"></i>${date}</p>
                            </div>
                            <span class="badge bg-${typeColor} fs-6">${typeBadge}</span>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-4 col-12 mb-2 mb-md-0">
                                <small class="text-muted">From Wallet</small>
                                <p class="mb-0 fw-bold"><span class="badge bg-danger">${t.from_wallet_name || "N/A"}</span></p>
                            </div>
                            <div class="col-md-4 col-12 mb-2 mb-md-0">
                                <small class="text-muted">To Wallet</small>
                                <p class="mb-0 fw-bold">
                                    ${isDebt || isCredit
                    ? '<span class="badge bg-secondary">External</span>'
                    : `<span class="badge bg-success">${toWalletDisplay}</span>`}
                                </p>
                            </div>
                            <div class="col-md-4 col-12">
                                <small class="text-muted">Amount</small>
                                <p class="mb-0 fw-bold text-primary">${t.amount ? t.amount.toFixed(2) : "0.00"} MAD</p>
                            </div>
                        </div>
                        
                        ${t.note ? `<p class="text-muted small mb-2"><i class="bi bi-sticky me-1"></i>${t.note}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Failed to load transactions:", err);
        transactionsList.innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
                <h5>Error Loading Transactions</h5>
                <p class="mb-0">${err.message || "Failed to load transactions"}</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadTransactions()">Retry</button>
            </div>
        `;
    }
}


async function addIncome() {
    const amountInput = document.getElementById("incomeAmount");
    const dateInput = document.getElementById("incomeDate");
    const categoryInput = document.getElementById("incomeCategory");
    const walletInput = document.getElementById("incomeWallet");
    const noteInput = document.getElementById("incomeNote");
    const addBtn = document.getElementById("addIncomeBtn");
    const spinner = document.getElementById("addIncomeSpinner");
    const btnText = document.getElementById("addIncomeText");

    const amount = parseFloat(amountInput.value);
    const date = dateInput.value || null;
    const income_type_id = categoryInput.value;
    const wallet_id = walletInput.value;
    const note = noteInput.value.trim();

    // Validation
    if (!amount || amount <= 0) {
        return alert("Please enter a valid amount greater than 0");
    }

    if (!income_type_id || income_type_id === "add_new_type") {
        return alert("Please select a valid income type");
    }

    if (!wallet_id || wallet_id === "add_new_wallet") {
        return alert("Please select a valid wallet");
    }

    // Show loading state
    addBtn.disabled = true;
    spinner.classList.remove("d-none");
    btnText.textContent = "";

    const data = {
        amount,
        income_type_id: parseInt(income_type_id),
        wallet_id: parseInt(wallet_id),
        note: note || null,
        date: date ? new Date(date).toISOString() : null
    };

    try {
        const res = await fetch(`${API_URL}/incomes`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `HTTP ${res.status}`);
        }

        // Clear form
        amountInput.value = "";
        noteInput.value = "";
        dateInput.value = new Date().toISOString().split('T')[0];
        categoryInput.value = "";
        walletInput.value = "";

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("addIncomeModal"));
        if (modal) modal.hide();

        // Show success
        alert("✅ Income added!");
        await loadIncomes();
        await loadWallets(); // Refresh wallet balances
    } catch (err) {
        console.error(err);
        alert("❌ Failed to add income: " + err.message);
    } finally {
        // Hide loading state
        addBtn.disabled = false;
        spinner.classList.add("d-none");
        btnText.textContent = "+";
    }
}

// =================== EDIT INCOME MODAL ===================
async function editIncome(id) {
    try {
        // Try to get from already loaded incomes first (cached)
        let income = incomes?.find(i => i.id === id);

        if (!income) {
            // If not found, fetch all incomes (fallback)
            const allIncomes = await fetchWithAuth(`${API_URL}/incomes`);
            income = allIncomes.find(i => i.id === id);
        }

        if (!income) throw new Error("Income not found");

        document.getElementById("editIncomeId").value = income.id;
        document.getElementById("editIncomeAmount").value = income.amount;

        // Set date (convert from date string or created_at)
        const incomeDate = document.getElementById("editIncomeDate");
        if (incomeDate && income.date) {
            const date = new Date(income.date);
            incomeDate.value = date.toISOString().split('T')[0];
        } else if (incomeDate && income.created_at) {
            const date = new Date(income.created_at);
            incomeDate.value = date.toISOString().split('T')[0];
        }

        document.getElementById("editIncomeCategory").value = income.income_type_id;
        document.getElementById("editIncomeWallet").value = income.wallet_id;
        document.getElementById("editIncomeNote").value = income.note || "";

        editIncomeModal.show();
    } catch (err) {
        console.error(err);
        alert("❌ Failed to load income: " + err.message);
    }
}

async function saveIncomeChanges() {
    const id = document.getElementById("editIncomeId").value;
    const amountInput = document.getElementById("editIncomeAmount");
    const dateInput = document.getElementById("editIncomeDate");
    const saveBtn = document.getElementById("saveIncomeChangesBtn");

    // Validation
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
        return alert("Please enter a valid amount greater than 0");
    }

    const data = {
        amount: amount,
        income_type_id: parseInt(document.getElementById("editIncomeCategory").value),
        wallet_id: parseInt(document.getElementById("editIncomeWallet").value),
        note: document.getElementById("editIncomeNote").value.trim() || null,
        date: dateInput.value ? new Date(dateInput.value).toISOString() : null
    };

    // Show loading
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
        const res = await fetch(`${API_URL}/incomes/${id}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (res.ok) {
            editIncomeModal.hide();
            await loadIncomes();
            await loadWallets(); // Refresh wallet balances
        } else {
            const errorText = await res.text();
            alert("❌ Failed: " + errorText);
            console.error("Update failed:", errorText);
        }
    } catch (err) {
        console.error(err);
        alert("❌ Failed to update income: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = "💾 Save Changes";
    }
}

async function deleteIncome(id) {
    if (!confirm("Are you sure?")) return;
    const res = await fetch(`${API_URL}/incomes/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) loadIncomes();
}

// =================== ADD / EDIT TYPES ===================
function checkAddNewType(e) {
    if (e.target.value === "add_new_type") {
        document.getElementById("editTypeId").value = "";
        document.getElementById("typeName").value = "";
        document.getElementById("typeModalTitle").textContent = "Add Income Type";
        typeModal.show();
        e.target.value = "";
    }
}

async function editIncomeType(id) {
    const type = types.find(t => t.id === id);
    if (!type) return alert("Income type not found");

    document.getElementById("editTypeId").value = type.id;
    document.getElementById("typeName").value = type.name;
    document.getElementById("typeModalTitle").textContent = "Edit Income Type";
    typeModal.show();
}

async function deleteIncomeType(id) {
    if (!confirm("Are you sure you want to delete this income type? This action cannot be undone.")) return;

    try {
        const res = await fetch(`${API_URL}/incometype/${id}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        if (res.ok) {
            alert("✅ Income type deleted!");
            loadTypes();
        } else {
            const error = await res.text();
            alert("❌ Failed to delete: " + error);
        }
    } catch (err) {
        console.error(err);
        alert("❌ Failed to delete income type: " + err.message);
    }
}

// =================== ADD / EDIT WALLETS ===================
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
    if (!name) return alert("Enter type name");

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/incometype/${id}` : `${API_URL}/incometype/`;

    try {
        const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify({ name }) });
        if (!res.ok) throw new Error(await res.text());

        const action = id ? "updated" : "added";
        alert(`✅ Income type ${action}!`);
        typeModal.hide();
        loadTypes();
    } catch (err) {
        console.error(err);
        alert("❌ Failed to save type: " + err.message);
    }
}

async function addWallet() {
    const data = {
        name: document.getElementById("walletName").value,
        category: document.getElementById("walletType").value,
        balance: parseFloat(document.getElementById("walletAmount").value) || 0
    };
    const res = await fetch(`${API_URL}/wallets`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
    if (res.ok) { alert("✅ Wallet added!"); addWalletModal.hide(); loadWallets(); }
    else alert("❌ Failed");
}

async function editWallet(id) {
    const wallet = wallets.find(w => w.id === id);
    if (!wallet) return alert("Wallet not found");

    document.getElementById("editWalletId").value = wallet.id;
    document.getElementById("editWalletName").value = wallet.name;
    document.getElementById("editWalletType").value = wallet.category || "Other";

    editWalletModal.show();
}

async function saveWalletChanges() {
    const id = document.getElementById("editWalletId").value;
    const data = {
        name: document.getElementById("editWalletName").value,
        category: document.getElementById("editWalletType").value
        // Note: balance is not included - it can only be changed through income transactions
    };
    const res = await fetch(`${API_URL}/wallets/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(data) });
    if (res.ok) { alert("✅ Wallet updated!"); editWalletModal.hide(); loadWallets(); }
    else alert("❌ Failed");
}

async function deleteWallet(id) {
    if (!confirm("Are you sure you want to delete this wallet?")) return;
    const res = await fetch(`${API_URL}/wallets/${id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) { alert("🗑️ Wallet deleted!"); loadWallets(); }
    else alert("❌ Failed");
}

// =================== WALLET TRANSFER ===================
async function transferFromWallet(fromWalletId) {
    const fromWallet = wallets.find(w => w.id === fromWalletId);
    if (!fromWallet) return alert("Wallet not found");

    // Populate transfer modal
    const fromSelect = document.getElementById("transferFromWallet");
    const toSelect = document.getElementById("transferToWallet");

    // Clear and populate from wallet (pre-selected)
    fromSelect.innerHTML = "";
    fromSelect.appendChild(new Option(`${fromWallet.name} (${fromWallet.category})`, fromWallet.id));
    fromSelect.value = fromWallet.id;
    fromSelect.disabled = true; // Can't change the source wallet

    // Populate to wallet options (excluding the source wallet)
    toSelect.innerHTML = "";
    toSelect.appendChild(new Option("-- Select Destination Wallet --", ""));
    wallets.filter(w => w.id !== fromWalletId).forEach(w => {
        toSelect.appendChild(new Option(`${w.name} (${w.category})`, w.id));
    });

    // Clear form
    document.getElementById("transferAmount").value = "";
    document.getElementById("transferNote").value = "";

    transferModal.show();
}

// Reset transfer modal when closed
document.addEventListener('DOMContentLoaded', function () {
    const transferModalElement = document.getElementById('transferModal');
    if (transferModalElement) {
        transferModalElement.addEventListener('hidden.bs.modal', function () {
            // Reset the form
            document.getElementById("transferFromWallet").disabled = false;
            document.getElementById("transferFromWallet").innerHTML = '<option value="">-- Select Source Wallet --</option>';
            document.getElementById("transferToWallet").innerHTML = '<option value="">-- Select Destination Wallet --</option>';
            document.getElementById("transferAmount").value = "";
            document.getElementById("transferNote").value = "";
        });
    }
});

async function executeTransfer() {
    const fromWalletId = document.getElementById("transferFromWallet").value;
    const toWalletId = document.getElementById("transferToWallet").value;
    const amountInput = document.getElementById("transferAmount");
    const noteInput = document.getElementById("transferNote");
    const executeBtn = document.getElementById("executeTransferBtn");

    const amount = parseFloat(amountInput.value);

    // Validation
    if (!fromWalletId || !toWalletId || !amount || amount <= 0) {
        return alert("Please fill all required fields with valid values");
    }

    if (fromWalletId === toWalletId) {
        return alert("Source and destination wallets cannot be the same");
    }

    const fromWallet = wallets.find(w => w.id == fromWalletId);
    if (!fromWallet) {
        return alert("Source wallet not found");
    }

    if (amount > fromWallet.balance) {
        return alert(`Insufficient balance! Available: ${fromWallet.balance.toFixed(2)}`);
    }

    // Show loading
    executeBtn.disabled = true;
    executeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Transferring...';

    const data = {
        from_wallet_id: parseInt(fromWalletId),
        to_wallet_id: parseInt(toWalletId),
        amount: amount,
        note: noteInput.value.trim() || `Transfer from ${fromWallet.name}`
    };

    try {
        const res = await fetch(`${API_URL}/wallets/transfer`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (res.ok) {
            const result = await res.json();
            alert("✅ Transfer completed successfully! Transaction ID: #" + result.transaction_id);
            transferModal.hide();
            await loadWallets(); // Refresh wallet balances
            await loadTransactions(); // Refresh transactions list
        } else {
            const error = await res.text();
            alert("❌ Transfer failed: " + error);
        }
    } catch (err) {
        console.error("Transfer error:", err);
        alert("❌ Transfer failed: " + err.message);
    } finally {
        executeBtn.disabled = false;
        executeBtn.innerHTML = "💸 Transfer";
    }
}




