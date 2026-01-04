// Global variables
let dailyChart = null;
let categoryChart = null;

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
    // Check authentication first
    loadAuth();
    
    if (!localStorage.getItem("token")) {
        console.log("No token found, redirecting to login");
        window.location.href = "login.html";
        return;
    }
    
    console.log("User authenticated, loading stats");
    
    // Get DOM elements
    const groupTableBody = document.querySelector("#groupTable tbody");
    const fromDate = document.getElementById("fromDate");
    const toDate = document.getElementById("toDate");
    const quickFilter = document.getElementById("quickFilter");
    const applyFilterBtn = document.getElementById("applyFilter");
    const filterText = document.getElementById("filterText");
    const filterSpinner = document.getElementById("filterSpinner");
    const totalExpenses = document.getElementById("totalExpenses");
    
    // Filter by date
    function filterByDate(data, from, to) {
        if (!from && !to) return data;
        const fromDateObj = from ? new Date(from) : null;
        const toDateObj = to ? new Date(to) : null;
        return data.filter((item) => {
            const date = new Date(item.date);
            if (fromDateObj && date < fromDateObj) return false;
            if (toDateObj && date > toDateObj) return false;
            return true;
        });
    }

    // Render group stats
    function renderGroupStats(groups) {
        groupTableBody.innerHTML = "";
        if (!groups.length) {
            groupTableBody.innerHTML = `<tr><td colspan="2" class="text-center text-muted">No data</td></tr>`;
            return;
        }
        groups.forEach((g) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${g.group_name}</td>
                <td>${g.amount.toFixed(2)} ${g.group_currency}</td>
            `;
            groupTableBody.appendChild(tr);
        });
    }

    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'MAD'
        }).format(amount);
    }

    // Set quick filter dates
    function setQuickFilter(days) {
        if (!days) return;
        
        const today = new Date();
        const fromDateObj = new Date(today);
        fromDateObj.setDate(today.getDate() - days);
        
        fromDate.value = fromDateObj.toISOString().split('T')[0];
        toDate.value = today.toISOString().split('T')[0];
    }

   // Show loading state
    function showLoading() {
        filterText.textContent = "Loading...";
        filterSpinner.classList.remove("d-none");
        applyFilterBtn.disabled = true;
    }

    // Hide loading state
    function hideLoading() {
        filterText.textContent = "Apply Filter";
        filterSpinner.classList.add("d-none");
        applyFilterBtn.disabled = false;
    } 

    // Render daily chart
    function renderDailyChart(data) {
        const ctx = document.getElementById("dailyChart").getContext("2d");
        const labels = data.map((d) => new Date(d.date).toLocaleDateString());
        const values = data.map((d) => d.amount);

        // Only destroy if dailyChart is a Chart instance
        if (dailyChart instanceof Chart) {
            dailyChart.destroy();
        }

        dailyChart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Daily Expenses",
                    data: values,
                    borderColor: "#007bff",
                    backgroundColor: "rgba(0,123,255,0.2)",
                    fill: true,
                    tension: 0.3,
                }],
            },
            options: {
                responsive: true,
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    },
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatCurrency(context.parsed.y);
                            }
                        }
                    }
                }
            },
        });
    }

    // Render category chart
    function renderCategoryChart(data) {
        const ctx = document.getElementById("categoryChart").getContext("2d");
        
        // Only destroy if categoryChart is a Chart instance
        if (categoryChart instanceof Chart) {
            categoryChart.destroy();
        }

        if (!data || data.length === 0) {
            categoryChart = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: ["No Data"],
                    datasets: [{
                        data: [1],
                        backgroundColor: ["#e9ecef"],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
            return;
        }

        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
        ];

        categoryChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: data.map(d => d.category || 'Uncategorized'),
                datasets: [{
                    data: data.map(d => d.amount),
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Load stats
    async function loadStats() {
        try {
            showLoading();
            
            const from = fromDate.value;
            const to = toDate.value;

            // Build URL with query parameters if dates are set
            let groupUrl = `${API_URL}/stats/user/groups`;
            let categoryUrl = `${API_URL}/stats/user/categories`;
            const params = new URLSearchParams();
            if (from) params.append("from_date", from);
            if (to) params.append("to_date", to);
            if (params.toString()) {
                groupUrl += `?${params.toString()}`;
                categoryUrl += `?${params.toString()}`;
            }

            const [userStats, groupStats, dailyStats, categoryStats] = await Promise.all([
                fetchWithAuth(`${API_URL}/stats/user`),
                fetchWithAuth(groupUrl),
                fetchWithAuth(`${API_URL}/stats/user/daily`),
                fetchWithAuth(categoryUrl).catch(() => []) // Fallback to empty array if endpoint doesn't exist
            ]);

            // Update total, average, max, and min expenses
            const filteredDaily = filterByDate(dailyStats, fromDate.value, toDate.value);

            if (filteredDaily.length > 0) {
                const amounts = filteredDaily.map(d => d.amount);
                const total = amounts.reduce((sum, v) => sum + v, 0);
                const avg = total / amounts.length;
                const max = Math.max(...amounts);
                const min = Math.min(...amounts);

                totalExpenses.innerText = formatCurrency(total);
                document.getElementById("avgExpenses").innerText = formatCurrency(avg);
                document.getElementById("maxExpenses").innerText = formatCurrency(max);
                document.getElementById("minExpenses").innerText = formatCurrency(min);
            } else {
                totalExpenses.innerText = formatCurrency(0);
                document.getElementById("avgExpenses").innerText = formatCurrency(0);
                document.getElementById("maxExpenses").innerText = formatCurrency(0);
                document.getElementById("minExpenses").innerText = formatCurrency(0);
            }

            // Render group totals
            renderGroupStats(groupStats);

            // Render charts
            renderDailyChart(filteredDaily);
            renderCategoryChart(categoryStats);

            console.log("✅ Stats loaded", { userStats, groupStats, dailyStats, categoryStats });
        } catch (err) {
            console.error("❌ Error loading stats:", err);
            alert("Failed to load statistics. See console for details.");
        } finally {
            hideLoading();
        }
    }

    // Export functions
    function exportToCSV() {
        const table = document.getElementById("groupTable");
        const rows = Array.from(table.querySelectorAll("tr"));
        const csvContent = rows.map(row => 
            Array.from(row.querySelectorAll("th, td")).map(cell => 
                cell.textContent.replace(/,/g, ";")
            ).join(",")
        ).join("\n");
        
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `expense-stats-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function printStats() {
        window.print();
    }

    function exportToPDF() {
        alert("PDF export feature coming soon! For now, you can use your browser's print function to save as PDF.");
    }

    // Initialize stats page
    function initializeStats() {
        // Quick filter change
        if (quickFilter) {
            quickFilter.addEventListener("change", (e) => {
                setQuickFilter(parseInt(e.target.value));
            });
        }
          // Date filter change is handled outside DOMContentLoaded to set dates first
          // Then loadStats will be called automatically via the apply button or the external handler

        // Apply filter button
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener("click", loadStats);
        }

        // Export buttons
        const exportCSV = document.getElementById("exportCSV");
        const exportPDF = document.getElementById("exportPDF");
        const printStats = document.getElementById("printStats");
        
        if (exportCSV) exportCSV.addEventListener("click", exportToCSV);
        if (exportPDF) exportPDF.addEventListener("click", exportToPDF);
        if (printStats) printStats.addEventListener("click", printStats);

        // Initial load
        loadStats();
    }
    
    // Initialize the page
    initializeStats();
});

// Full JS
const dateFilter = document.getElementById("dateFilter");
const yearsGroup = document.getElementById("yearsGroup");
const monthsGroup = document.getElementById("monthsGroup");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");

const today = new Date();
const currentYear = today.getFullYear();
const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Populate last 3 years dynamically
for (let i = 0; i < 3; i++) {
  const year = currentYear - i;
  const option = document.createElement("option");
  option.value = "year_" + year;
  option.textContent = year + (i === 0 ? " (Current Year)" : "");
  yearsGroup.appendChild(option);
}

// Populate last 3 months dynamically
for (let i = 0; i < 3; i++) {
  const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
  const monthName = monthNames[monthDate.getMonth()];
  const option = document.createElement("option");
  option.value = "month_" + monthDate.getMonth() + "_" + monthDate.getFullYear();
  option.textContent = monthName;
  monthsGroup.appendChild(option);
}

 

// Event listener for filter changes
dateFilter.addEventListener("change", function() {
  const val = this.value;
  let from, to;

  if (!val) return;
  
  // Helper function to format date in local time (YYYY-MM-DD)
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  switch(val) {
    // Quick Ranges
    case "today":
      from = new Date(today.getTime() );
      to = from;
      break;
    case "yesterday":
      from = new Date(today.getTime() - 1*24*60*60*1000);
      to = new Date(today.getTime() - 1*24*60*60*1000);
      break;  
    case "last_7_days":
      from = new Date(today.getTime() - 7*24*60*60*1000);
      to = today;
      break;
    case "last_28_days":
      from = new Date(today.getTime() - 28*24*60*60*1000);
      to = today;
      break;
    case "last_90_days":
      from = new Date(today.getTime() - 90*24*60*60*1000);
      to = today;
      break;
    case "last_365_days":
      from = new Date(today.getTime() - 365*24*60*60*1000);
      to = today;
      break;
    case "lifetime":
      from = new Date("2000-01-01"); // example start
      to = today;
      break;

    // Years
    default:
      if (val.startsWith("year_")) {
        const year = parseInt(val.split("_")[1]);
        // January 1st of the year at 00:00:00
        from = new Date(year, 0, 1);
        // December 31st of the year at 23:59:59 (or use year+1, 0, 0 which gives last day of December)
        to = new Date(year, 11, 31, 23, 59, 59);
      } else if (val.startsWith("month_")) {
        const parts = val.split("_");
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        // First day of the month
        from = new Date(year, month, 1);
        // Last day of the month (using next month, day 0 gives last day of current month)
        to = new Date(year, month + 1, 0, 23, 59, 59);
      } else if (val === "custom") {
        return; // user selects manually
      }
  }

  // Set the date inputs - format in local time to avoid timezone issues
  if (from && to) {
    fromDate.value = formatDateLocal(from);
    toDate.value = formatDateLocal(to);
    
    // Trigger the apply button to load stats with the new dates
    // This ensures loadStats is called after dates are set
    const applyBtn = document.getElementById("applyFilter");
    if (applyBtn) {
      // Small delay to ensure date inputs are updated
      setTimeout(() => {
        applyBtn.click();
      }, 10);
    }
  }

});



// Example placeholder function
function filterDataByDate(from, to) {
  console.log("Filtering data from", from.toDateString(), "to", to.toDateString());
  // Your filtering logic here
}
