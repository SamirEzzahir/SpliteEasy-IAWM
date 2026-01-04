document.addEventListener("DOMContentLoaded", async () => {
  const balancesContainer = document.getElementById("balancesContainer");
  const monthlyTableBody = document.getElementById("monthlyTableBody");
  const ledgerTableBody = document.getElementById("ledgerTableBody");
  const systemSelector = document.getElementById("systemSelector");

  // Modal Elements
  const strategyModal = new bootstrap.Modal(document.getElementById("strategyModal"));
  const distributeModal = new bootstrap.Modal(document.getElementById("distributeModal"));
  const spendModal = new bootstrap.Modal(document.getElementById("spendModal"));
  const sourcesModal = new bootstrap.Modal(document.getElementById("sourcesModal"));
  const editTransactionModal = new bootstrap.Modal(document.getElementById("editTransactionModal"));

  // Jar History Modal Elements
  const jarHistoryModal = new bootstrap.Modal(document.getElementById("jarHistoryModal"));
  const jarHistoryTitle = document.getElementById("jarHistoryTitle");
  const jarHistoryTableBody = document.getElementById("jarHistoryTableBody");

  // Forms
  const strategyForm = document.getElementById("strategyForm");
  const distributeForm = document.getElementById("distributeForm");
  const spendForm = document.getElementById("spendForm");
  const addSourceForm = document.getElementById("addSourceForm");
  const editTransactionForm = document.getElementById("editTransactionForm");

  // Strategy Inputs
  const strategyModalTitle = document.getElementById("strategyModalTitle");
  const strategyIdInput = document.getElementById("strategyId");
  const strategyNameInput = document.getElementById("strategyName");
  const saveStrategyBtn = document.getElementById("saveStrategyBtn");
  const totalPercentDisplay = document.getElementById("totalPercentDisplay");
  const percentInputs = document.querySelectorAll(".percent-input");

  // Income Source Inputs
  const incomeSourceSelect = document.getElementById("incomeSourceSelect");
  const sourcesList = document.getElementById("sourcesList");
  const newSourceName = document.getElementById("newSourceName");

  // Edit Transaction Inputs
  const editTransactionId = document.getElementById("editTransactionId");
  const editTransactionType = document.getElementById("editTransactionType");
  const editAmount = document.getElementById("editAmount");
  const editIncomeSource = document.getElementById("editIncomeSource");
  const editDescription = document.getElementById("editDescription");
  const editDate = document.getElementById("editDate");
  const editSourceWrapper = document.getElementById("editSourceWrapper");

  // --- Configuration ---
  /**
   * @typedef {Object} JarConfig
   * @property {string} name - Display name of the jar
   * @property {string} icon - Bootstrap icon class
   * @property {string} color - CSS color class
   * @property {string} desc - Description of the jar
   */

  /** @type {Object.<string, JarConfig>} */
  let JARS = {};

  /**
   * @typedef {Object} Strategy
   * @property {number} id
   * @property {string} name
   * @property {number} nec
   * @property {number} ffa
   * @property {number} edu
   * @property {number} ltss
   * @property {number} play
   * @property {number} give
   * @property {boolean} is_default
   * @property {number|null} user_id
   */

  /** @type {Strategy[]} */
  let strategies = [];
  let currentStrategyId = null;
  let incomeSources = [];
  let currentOpenJar = null;
  let allTransactions = []; // Store locally for edit lookup

  // --- API Functions ---

  /**
   * Fetches the Jar configuration from the backend.
   */
  async function fetchJarConfig() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/config`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        JARS = await res.json();
      } else {
        console.warn("Failed to fetch jar config, using fallback.");
        useFallbackConfig();
      }
    } catch (err) {
      console.error("Error fetching jar config", err);
      useFallbackConfig();
    }
  }

  function useFallbackConfig() {
    JARS = {
      NEC: { name: "Necessities", icon: "bi-house-door", color: "bg-orange", desc: "Rent, Food, Bills" },
      FFA: { name: "Financial Freedom", icon: "bi-graph-up-arrow", color: "bg-yellow", desc: "Investments, Passive Income" },
      EDU: { name: "Education", icon: "bi-book", color: "bg-grey", desc: "Books, Courses, Seminars" },
      LTSS: { name: "Long Term Savings", icon: "bi-piggy-bank", color: "bg-blue", desc: "Big purchases, Rainy day" },
      PLAY: { name: "Play", icon: "bi-controller", color: "bg-light-green", desc: "Fun, Hobbies, Dining out" },
      GIVE: { name: "Give", icon: "bi-heart", color: "bg-green", desc: "Charity, Gifts" }
    };
  }

  /**
   * Fetches all available strategies for the user.
   */
  async function fetchStrategies() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/econome/strategies`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        strategies = data.map(s => ({
          id: s.id,
          name: s.name,
          icon: s.user_id ? "bi-person-gear" : getIconForDefault(s.name),
          nec: s.nec, ffa: s.ffa, edu: s.edu,
          ltss: s.ltss, play: s.play, give: s.give,
          is_default: s.user_id === null,
          user_id: s.user_id
        }));

        if (!currentStrategyId && strategies.length > 0) {
          currentStrategyId = strategies[0].id;
        }

        renderSystemSelector();
        populateDistributeSelect();
      }
    } catch (err) {
      console.error("Failed to fetch strategies", err);
    }
  }

  /**
   * Fetches current jar balances.
   */
  async function fetchBalances() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/balances`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const balances = await res.json();
        renderBalances(balances);
      }
    } catch (err) {
      console.error("Failed to fetch balances", err);
    }
  }

  /**
   * Fetches monthly summary data.
   */
  async function fetchMonthlySummary() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/monthly-summary`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const summary = await res.json();
        renderMonthlySummary(summary);
      }
    } catch (err) {
      console.error("Failed to fetch monthly summary", err);
    }
  }

  /**
   * Fetches the full transaction ledger.
   */
  async function fetchLedger() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/ledger`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        allTransactions = await res.json();
        renderLedger(allTransactions);
      }
    } catch (err) {
      console.error("Failed to fetch ledger", err);
    }
  }

  /**
   * Fetches available income sources.
   */
  async function fetchIncomeSources() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/income-sources`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        incomeSources = await res.json();
        renderIncomeSources();
      }
    } catch (err) {
      console.error("Failed to fetch income sources", err);
    }
  }

  /**
   * Fetches transaction history for a specific jar.
   * @param {string} jarType - The type of jar (e.g., "NEC", "FFA")
   */
  async function fetchJarHistory(jarType) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/jar/${jarType}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const transactions = await res.json();
        renderJarHistory(transactions, jarType);
        jarHistoryTitle.textContent = `${JARS[jarType].name} (${jarType}) History`;
        jarHistoryModal.show();
      }
    } catch (err) {
      console.error("Failed to fetch jar history", err);
    }
  }

  /**
   * Deletes a transaction.
   * @param {string} type - "income" or "expense"
   * @param {number} id - Transaction ID
   */
  async function deleteTransaction(type, id) {
    if (!confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/transactions/${type}/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        await refreshAll();
        if (currentOpenJar) {
          await fetchJarHistory(currentOpenJar);
        }
      } else {
        alert("Failed to delete transaction");
      }
    } catch (err) {
      console.error("Failed to delete transaction", err);
    }
  }

  /**
   * Updates a transaction.
   * @param {string} type - "income" or "expense"
   * @param {number} id - Transaction ID
   * @param {Object} data - Updated data
   */
  async function updateTransaction(type, id, data) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/transactions/${type}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        await refreshAll();
        editTransactionModal.hide();
      } else {
        alert("Failed to update transaction");
      }
    } catch (err) {
      console.error("Failed to update transaction", err);
    }
  }

  // --- Action Functions ---

  /**
   * Distributes income according to a strategy.
   * @param {number} amount 
   * @param {number} strategyId 
   * @param {string} description 
   */
  async function distributeIncome(amount, strategyId, description) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/econome/distribute?amount=${amount}&strategy_id=${strategyId}&description=${description}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      await refreshAll();
      distributeModal.hide();
      distributeForm.reset();
    } else {
      alert("Failed to distribute income");
    }
  }

  /**
   * Logs an expense from a specific jar.
   * @param {number} amount 
   * @param {string} jarType 
   * @param {string} description 
   */
  async function logExpense(amount, jarType, description) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/econome/spend?amount=${amount}&jar_type=${jarType}&description=${description}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      await refreshAll();
      spendModal.hide();
      spendForm.reset();
    } else {
      alert("Failed to log expense");
    }
  }

  async function addIncomeSource(name) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/econome/income-sources`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    if (res.ok) {
      await fetchIncomeSources();
      newSourceName.value = "";
    } else {
      alert("Failed to add income source");
    }
  }

  async function deleteIncomeSource(id) {
    if (!confirm("Delete this income source?")) return;

    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/econome/income-sources/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      await fetchIncomeSources();
    } else {
      alert("Failed to delete income source");
    }
  }

  async function refreshAll() {
    await Promise.all([fetchBalances(), fetchMonthlySummary(), fetchLedger()]);
  }

  // --- UI Rendering ---

  function renderBalances(balances) {
    balancesContainer.innerHTML = "";
    const balMap = {};
    balances.forEach(b => balMap[b.jar_type] = b.balance);

    // Use keys from JARS config if available, otherwise fallback to default order
    const jarOrder = Object.keys(JARS).length > 0 ? Object.keys(JARS) : ["NEC", "FFA", "EDU", "LTSS", "PLAY", "GIVE"];

    jarOrder.forEach((jarKey, index) => {
      const config = JARS[jarKey];
      if (!config) return; // Skip if config not loaded yet

      const amount = balMap[jarKey] || 0;

      const cardHtml = `
                <div class="col-md-6 col-lg-4 animate-in" style="animation-delay: ${index * 0.1}s">
                    <div class="card jar-card ${config.color} shadow-sm h-100" onclick="openJarHistory('${jarKey}')" style="cursor: pointer;">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div class="jar-icon-wrapper bg-white bg-opacity-25 rounded-circle p-3">
                                    <i class="bi ${config.icon} fs-4 text-white"></i>
                                </div>
                                <span class="badge bg-white bg-opacity-25 text-white border-0">${jarKey}</span>
                            </div>
                            
                            <h5 class="card-title text-white mb-1 opacity-75">${config.name}</h5>
                            <div class="display-6 fw-bold text-white mb-2">${formatCurrency(amount)}</div>
                            <small class="text-white opacity-75">${config.desc}</small>
                        </div>
                    </div>
                </div>
            `;
      balancesContainer.insertAdjacentHTML("beforeend", cardHtml);
    });
  }

  window.openJarHistory = (jarType) => {
    currentOpenJar = jarType;
    fetchJarHistory(jarType);
  };

  function renderJarHistory(transactions, jarType) {
    jarHistoryTableBody.innerHTML = "";
    if (transactions.length === 0) {
      jarHistoryTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">No transactions yet</td></tr>`;
      return;
    }

    transactions.forEach(txn => {
      const isExpense = txn.amount < 0;
      const colorClass = isExpense ? "text-danger" : "text-success";
      const sign = isExpense ? "-" : "+";
      const amount = Math.abs(txn.amount);

      // Removed Edit/Delete buttons as requested for Jar History
      const row = `
                <tr>
                    <td class="ps-4 text-muted small">${new Date(txn.date).toLocaleDateString()}</td>
                    <td class="fw-medium">${txn.description}</td>
                    <td class="text-end pe-4 fw-bold ${colorClass}">${sign}${formatCurrency(amount)}</td>
                </tr>
            `;
      jarHistoryTableBody.insertAdjacentHTML("beforeend", row);
    });
  }

  function renderMonthlySummary(summary) {
    monthlyTableBody.innerHTML = "";
    if (summary.length === 0) {
      monthlyTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No data available</td></tr>`;
      return;
    }

    summary.forEach(row => {
      const tr = `
                <tr>
                    <td class="ps-4 text-start fw-bold text-muted">${row.month}</td>
                    <td class="fw-medium">${formatCurrency(row.NEC)}</td>
                    <td class="fw-medium">${formatCurrency(row.FFA)}</td>
                    <td class="fw-medium">${formatCurrency(row.EDU)}</td>
                    <td class="fw-medium">${formatCurrency(row.LTSS)}</td>
                    <td class="fw-medium">${formatCurrency(row.PLAY)}</td>
                    <td class="fw-medium">${formatCurrency(row.GIVE)}</td>
                    <td class="text-end pe-4 fw-bold">${formatCurrency(row.total)}</td>
                </tr>
            `;
      monthlyTableBody.insertAdjacentHTML("beforeend", tr);
    });
  }

  function renderLedger(transactions) {
    ledgerTableBody.innerHTML = "";
    if (transactions.length === 0) {
      ledgerTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No transactions yet</td></tr>`;
      return;
    }

    transactions.forEach(txn => {
      const isIncome = txn.type === "income";
      const colorClass = isIncome ? "text-success" : "text-danger";
      const sign = isIncome ? "+" : "-";

      let description = txn.description;
      let jarBadge = "";
      let editBtn = "";

      if (isIncome) {
        description = `Income: ${txn.income_source || 'Unknown Source'}`;
        jarBadge = `<span class="badge bg-success bg-opacity-10 text-success border border-success-subtle">Strategy: ${txn.strategy_name}</span>`;
        // Add Edit Button for Income
        editBtn = `
            <button class="btn btn-sm btn-outline-warning border-0 me-1" onclick="openEditTransaction('income', ${txn.id})">
                <i class="bi bi-pencil"></i>
            </button>
        `;
      } else {
        jarBadge = `<span class="badge bg-light text-dark border">${txn.jar_type}</span>`;
      }

      const row = `
                <tr>
                    <td class="ps-4 text-muted small">${new Date(txn.date).toLocaleDateString()}</td>
                    <td class="fw-medium">${description}</td>
                    <td>${jarBadge}</td>
                    <td class="text-end pe-4 fw-bold ${colorClass}">${sign}${formatCurrency(txn.amount)}</td>
                    <td class="text-end">
                        ${editBtn}
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteTransaction('${txn.type}', ${txn.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
      ledgerTableBody.insertAdjacentHTML("beforeend", row);
    });
  }

  function renderIncomeSources() {
    // Populate Dropdown
    incomeSourceSelect.innerHTML = `<option value="" disabled selected>Select source...</option>`;

    // Also populate Edit Modal Dropdown
    editIncomeSource.innerHTML = `<option value="" disabled selected>Select source...</option>`;

    incomeSources.forEach(s => {
      // Main Distribute Modal
      const option = document.createElement("option");
      option.value = s.name;
      option.textContent = s.name;
      incomeSourceSelect.appendChild(option);

      // Edit Modal
      const editOption = document.createElement("option");
      editOption.value = s.name;
      editOption.textContent = s.name;
      editIncomeSource.appendChild(editOption);
    });

    // Populate List in Manage Modal
    sourcesList.innerHTML = "";
    incomeSources.forEach(s => {
      const li = `
                <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                    ${s.name}
                    <button class="btn btn-xs btn-outline-danger border-0" onclick="deleteSource(${s.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </li>
            `;
      sourcesList.insertAdjacentHTML("beforeend", li);
    });

    // Attach delete handlers
    document.querySelectorAll("#sourcesList button").forEach((btn, idx) => {
      btn.onclick = () => deleteIncomeSource(incomeSources[idx].id);
    });
  }

  function renderSystemSelector() {
    systemSelector.innerHTML = "";
    strategies.forEach(s => {
      const cardHtml = `
                <div class="col-4 col-md-3 position-relative">
                    <div class="system-select-card" data-id="${s.id}" style="cursor: pointer;">
                        <i class="bi ${s.icon}"></i>
                        <div class="fw-bold small text-truncate w-100 px-1">${s.name}</div>
                    </div>
                </div>
            `;
      systemSelector.insertAdjacentHTML("beforeend", cardHtml);
    });

    document.querySelectorAll(".system-select-card").forEach(card => {
      card.addEventListener("click", () => {
        openStrategyDetails(card.dataset.id);
      });
    });
  }

  function openStrategyDetails(id) {
    const strategy = strategies.find(s => s.id == id);
    if (!strategy) return;

    // Populate fields
    strategyIdInput.value = strategy.id;
    strategyNameInput.value = strategy.name;

    // Use toFixed(1) to keep 1 decimal place, convert to float to remove trailing zeros if integer
    document.getElementById("necInput").value = parseFloat((strategy.nec * 100).toFixed(1));
    document.getElementById("ffaInput").value = parseFloat((strategy.ffa * 100).toFixed(1));
    document.getElementById("eduInput").value = parseFloat((strategy.edu * 100).toFixed(1));
    document.getElementById("ltssInput").value = parseFloat((strategy.ltss * 100).toFixed(1));
    document.getElementById("playInput").value = parseFloat((strategy.play * 100).toFixed(1));
    document.getElementById("giveInput").value = parseFloat((strategy.give * 100).toFixed(1));

    updateTotalPercent();

    // Handle Read-Only vs Edit
    if (strategy.is_default) {
      strategyModalTitle.textContent = "Strategy Details (Read-Only)";
      strategyNameInput.disabled = true;
      percentInputs.forEach(input => input.disabled = true);
      saveStrategyBtn.classList.add("d-none"); // Hide save button
    } else {
      strategyModalTitle.textContent = "Edit Strategy";
      strategyNameInput.disabled = false;
      percentInputs.forEach(input => input.disabled = false);
      saveStrategyBtn.classList.remove("d-none"); // Show save button
      saveStrategyBtn.disabled = false; // Enable if valid
    }

    strategyModal.show();
  }

  function populateDistributeSelect() {
    const select = document.getElementById("distributeStrategy");
    select.innerHTML = "";
    strategies.forEach(s => {
      const option = document.createElement("option");
      option.value = s.id;
      option.textContent = s.name;
      if (s.id == currentStrategyId) option.selected = true;
      select.appendChild(option);
    });
  }

  // --- Edit Transaction Logic ---

  window.openEditTransaction = (type, id) => {
    const txn = allTransactions.find(t => t.id === id && t.type === type);
    if (!txn) return;

    editTransactionId.value = id;
    editTransactionType.value = type;
    editAmount.value = txn.amount;
    editDate.value = new Date(txn.date).toISOString().slice(0, 16); // Format for datetime-local

    if (type === 'income') {
      editSourceWrapper.classList.remove('d-none');
      editIncomeSource.value = txn.income_source;
      editDescription.value = txn.description; // Or handle description separately if needed
      editIncomeSource.required = true;
    } else {
      editSourceWrapper.classList.add('d-none');
      editDescription.value = txn.description;
      editIncomeSource.required = false;
    }

    editTransactionModal.show();
  };

  editTransactionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = editTransactionId.value;
    const type = editTransactionType.value;

    const data = {
      amount: parseFloat(editAmount.value),
      date: new Date(editDate.value).toISOString(),
      description: editDescription.value
    };

    if (type === 'income') {
      data.income_source = editIncomeSource.value;
    }

    updateTransaction(type, id, data);
  });


  // --- Helper Functions ---

  function getIconForDefault(name) {
    if (name.includes("Eker")) return "bi-book";
    if (name.includes("Improved")) return "bi-graph-up-arrow";
    if (name.includes("Économé")) return "bi-gem";
    return "bi-pie-chart";
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2
    }).format(amount).replace('MAD', '').trim() + ' MAD';
  }

  // --- Event Listeners ---

  distributeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = document.getElementById("distributeAmount").value;
    const source = incomeSourceSelect.value;
    const stratId = document.getElementById("distributeStrategy").value;

    if (!source) {
      alert("Please select an income source");
      return;
    }

    distributeIncome(amount, stratId, source);
  });

  spendForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = document.getElementById("spendAmount").value;
    const jar = document.getElementById("spendJar").value;
    const desc = document.getElementById("spendDesc").value;
    logExpense(amount, jar, desc);
  });

  addSourceForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = newSourceName.value.trim();
    if (name) addIncomeSource(name);
  });

  // Strategy Management
  document.getElementById("addStrategyBtn").addEventListener("click", () => {
    strategyModalTitle.textContent = "Create New Strategy";
    strategyForm.reset();
    strategyIdInput.value = "";

    // Enable inputs
    strategyNameInput.disabled = false;
    percentInputs.forEach(input => input.disabled = false);
    saveStrategyBtn.classList.remove("d-none");

    updateTotalPercent();
  });

  function updateTotalPercent() {
    let total = 0;
    percentInputs.forEach(input => {
      // Use parseFloat instead of parseInt
      total += parseFloat(input.value) || 0;
    });

    // Handle float precision (e.g. 0.1 + 0.2 = 0.300000004)
    total = parseFloat(total.toFixed(1));

    totalPercentDisplay.textContent = total + "%";

    // Only validate if inputs are enabled (i.e., not read-only)
    if (strategyNameInput.disabled) return;

    if (total === 100) {
      totalPercentDisplay.classList.remove("text-danger");
      totalPercentDisplay.classList.add("text-success");
      saveStrategyBtn.disabled = false;
    } else {
      totalPercentDisplay.classList.add("text-danger");
      totalPercentDisplay.classList.remove("text-success");
      saveStrategyBtn.disabled = true;
    }
  }

  percentInputs.forEach(input => {
    input.addEventListener("input", updateTotalPercent);
  });

  // Strategy Form Submit (Save/Update)
  strategyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = strategyIdInput.value;
    const name = strategyNameInput.value;

    // Convert percentages back to decimals (e.g. 50 -> 0.5)
    const nec = (parseFloat(document.getElementById("necInput").value) || 0) / 100;
    const ffa = (parseFloat(document.getElementById("ffaInput").value) || 0) / 100;
    const edu = (parseFloat(document.getElementById("eduInput").value) || 0) / 100;
    const ltss = (parseFloat(document.getElementById("ltssInput").value) || 0) / 100;
    const play = (parseFloat(document.getElementById("playInput").value) || 0) / 100;
    const give = (parseFloat(document.getElementById("giveInput").value) || 0) / 100;

    const data = { name, nec, ffa, edu, ltss, play, give };

    if (id) {
      await updateStrategy(id, data);
    } else {
      await createStrategy(data);
    }
  });

  async function createStrategy(data) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/strategies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await fetchStrategies();
        strategyModal.hide();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to create strategy");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating strategy");
    }
  }

  async function updateStrategy(id, data) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/econome/strategies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await fetchStrategies();
        strategyModal.hide();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to update strategy");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating strategy");
    }
  }

  // Manage Strategy Button (in Distribute Modal)
  const manageStrategyBtn = document.getElementById("manageStrategyBtn");
  if (manageStrategyBtn) {
    manageStrategyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selectedId = document.getElementById("distributeStrategy").value;
      if (selectedId) {
        openStrategyDetails(selectedId);
      }
    });
  }

  // Expose deleteTransaction to window
  window.deleteTransaction = deleteTransaction;

  // Initial Load
  await fetchJarConfig(); // Fetch config first
  await fetchStrategies();
  await fetchIncomeSources();
  await refreshAll();
});