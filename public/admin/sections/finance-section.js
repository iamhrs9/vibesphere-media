(function () {
    let financeTrendChart = null;

    function renderFinanceSection() {
        return `
            <div class="premium-section finance-shell">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Finance</h2>
                        <p class="section-subtitle">A cleaner fintech-style view of revenue, salaries, dues, and transaction activity.</p>
                    </div>
                    <div class="section-actions">
                        <button class="section-refresh-btn" onclick="fetchFinanceData()"><i class="ri-refresh-line"></i> Refresh</button>
                    </div>
                </div>

                <div class="finance-metrics">
                    <div class="finance-card">
                        <span class="label">Total Revenue</span>
                        <div id="financeTotalRevenue" class="amount" style="color:#15803d;">₹0</div>
                    </div>
                    <div class="finance-card">
                        <span class="label">Total Salaries Paid</span>
                        <div id="financeTotalSalariesPaid" class="amount" style="color:#0f766e;">₹0</div>
                    </div>
                    <div class="finance-card">
                        <span class="label">Total Expenses</span>
                        <div id="financeTotalExpenses" class="amount" style="color:#b91c1c;">₹0</div>
                    </div>
                    <div class="finance-card">
                        <span class="label">Pending Salary</span>
                        <div id="financePendingStaffSalary" class="amount" style="color:#b45309;">₹0</div>
                    </div>
                </div>

                <div class="finance-grid">
                    <div class="chart-card">
                        <div class="section-header" style="margin-bottom:14px;">
                            <div>
                                <strong style="font-size:1rem;color:var(--text);">Revenue vs Expenses</strong>
                                <p class="section-subtitle" style="margin-top:4px;">Month-wise financial movement across the last six months.</p>
                            </div>
                            <div class="section-actions">
                                <select id="financeMonthFilter" class="approvals-filter" onchange="handleFinanceFilterChange()">
                                    <option value="all">All Months</option>
                                </select>
                                <select id="financeYearFilter" class="approvals-filter" onchange="handleFinanceFilterChange()"></select>
                            </div>
                        </div>
                        <div class="finance-chart-frame">
                            <canvas id="financeTrendChart"></canvas>
                        </div>
                    </div>

                    <div class="staff-card" style="padding:20px;margin:0;">
                        <h3 style="margin-bottom:14px;">Add Expense</h3>
                        <div style="display:flex;flex-direction:column;gap:12px;">
                            <div class="toolbar-field" style="margin:0;">
                                <label>Title</label>
                                <input type="text" id="expTitle" placeholder="e.g. Facebook Ads">
                            </div>
                            <div class="toolbar-field" style="margin:0;">
                                <label>Amount (₹)</label>
                                <input type="number" id="expAmount" placeholder="5000">
                            </div>
                            <div class="toolbar-field" style="margin:0;">
                                <label>Category</label>
                                <select id="expCategory">
                                    <option value="Ads">Ads</option>
                                    <option value="Server">Server</option>
                                    <option value="Salaries">Salaries</option>
                                    <option value="Tools">Tools</option>
                                    <option value="General">General</option>
                                </select>
                            </div>
                            <button onclick="addExpense()" class="btn-publish" style="width:100%;">Add Expense</button>
                        </div>
                    </div>
                </div>

                <div class="modern-table-shell">
                    <div class="table-head">
                        <div>
                            <h3 style="margin:0;font-size:1.02rem;color:var(--text);">Transactions</h3>
                            <p class="section-subtitle" style="margin-top:6px;">Filter finance activity by income, expense, or salary payouts.</p>
                        </div>
                        <div class="finance-filter-tabs">
                            <button type="button" class="finance-filter-btn active" data-finance-filter="all" onclick="setFinanceTransactionFilter('all')">All</button>
                            <button type="button" class="finance-filter-btn" data-finance-filter="income" onclick="setFinanceTransactionFilter('income')">Income</button>
                            <button type="button" class="finance-filter-btn" data-finance-filter="expense" onclick="setFinanceTransactionFilter('expense')">Expense</button>
                            <button type="button" class="finance-filter-btn" data-finance-filter="salaries" onclick="setFinanceTransactionFilter('salaries')">Salaries</button>
                        </div>
                    </div>
                    <div class="table-responsive transaction-list-table" style="overflow-x:auto;width:100%;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Transaction</th>
                                    <th>Type</th>
                                    <th>Meta</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="financeTransactionsTable">
                                <tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px;">Transactions will appear here.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function mountAdminFinanceSection(targetId) {
        const target = document.getElementById(targetId || 'finance-section');
        if (!target || target.dataset.moduleMounted === 'true') return;
        target.innerHTML = renderFinanceSection();
        target.dataset.moduleMounted = 'true';
    }

                function isSalaryFinanceTransaction(item) {
                    const haystack = [
                        item?.title,
                        item?.subtitle,
                        item?.meta
                    ].join(' ').toLowerCase();
                    return haystack.includes('salary') || haystack.includes('salaries');
                }

                function seedFinanceFilters(selectedYear, selectedMonth = 'all') {
                    const monthSelect = document.getElementById('financeMonthFilter');
                    const yearSelect = document.getElementById('financeYearFilter');
                    if (!monthSelect || !yearSelect) return;

                    if (!monthSelect.dataset.seeded) {
                        const monthOptions = ['<option value="all">All Months</option>'].concat(
                            Array.from({ length: 12 }).map((_, index) => {
                                const month = index + 1;
                                const label = adminMonthLabel(month, 2026).replace(/\s+\d+$/, '');
                                return `<option value="${month}">${label}</option>`;
                            })
                        );
                        monthSelect.innerHTML = monthOptions.join('');
                        monthSelect.dataset.seeded = 'true';
                    }

                    const baseYear = Number(selectedYear) || new Date().getFullYear();
                    const yearOptions = [baseYear + 1, baseYear, baseYear - 1, baseYear - 2]
                        .filter((year, index, arr) => arr.indexOf(year) === index)
                        .map((year) => `<option value="${year}">${year}</option>`)
                        .join('');
                    yearSelect.innerHTML = yearOptions;
                    yearSelect.value = String(baseYear);
                    monthSelect.value = String(selectedMonth || 'all');
                }

                function getFilteredFinanceTransactions() {
                    const transactions = Array.isArray(adminUiState.financeTransactions) ? adminUiState.financeTransactions : [];
                    const filter = adminUiState.financeTransactionFilter || 'all';
                    if (filter === 'income') return transactions.filter((item) => item.kind === 'credit');
                    if (filter === 'expense') return transactions.filter((item) => item.kind === 'debit' && !isSalaryFinanceTransaction(item));
                    if (filter === 'salaries') return transactions.filter((item) => isSalaryFinanceTransaction(item));
                    return transactions;
                }

                function renderFinanceTransactions() {
                    const tbody = document.getElementById('financeTransactionsTable');
                    if (!tbody) return;

                    const filteredTransactions = getFilteredFinanceTransactions();
                    document.querySelectorAll('[data-finance-filter]').forEach((button) => {
                        button.classList.toggle('active', button.dataset.financeFilter === adminUiState.financeTransactionFilter);
                    });

                    if (!filteredTransactions.length) {
                        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px;">No transactions match the selected filter.</td></tr>';
                        return;
                    }

                    tbody.innerHTML = filteredTransactions.map((item) => `
                        <tr>
                            <td><strong>${escapeHtml(item.title)}</strong><br><small style="color:#94a3b8;">${escapeHtml(item.subtitle || '')}</small></td>
                            <td><span style="padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700;background:${item.kind === 'credit' ? '#dcfce7' : '#f1f5f9'};color:${item.kind === 'credit' ? '#166534' : '#334155'};">${item.kind === 'credit' ? 'Credit' : 'Debit'}</span></td>
                            <td>${escapeHtml(item.meta || '—')}</td>
                            <td>${formatAdminDate(item.date)}</td>
                            <td class="${item.kind}">${item.kind === 'credit' ? '+' : '-'}${formatCurrency(item.amount)}</td>
                            <td style="text-align:right;">
                                ${item.expenseId
                                    ? `<button onclick="deleteExpense('${item.expenseId}')" class="delete-btn" style="padding:5px 10px;font-size:12px;" title="Delete Expense">🗑️</button>`
                                    : '<span style="color:#cbd5e1;">—</span>'}
                            </td>
                        </tr>
                    `).join('');
                }


                async function fetchFinanceData() {
                    await fetchFinanceOverview();
                }

                function handleFinanceFilterChange() {
                    fetchFinanceOverview();
                }

                async function fetchFinanceOverview() {
                    try {
                        const month = document.getElementById('financeMonthFilter')?.value || 'all';
                        const year = document.getElementById('financeYearFilter')?.value || new Date().getFullYear();
                        const params = new URLSearchParams({ year: String(year) });
                        if (month && month !== 'all') params.set('month', String(month));

                        const res = await fetch(`/api/finance/stats?${params.toString()}`, { credentials: 'include' });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.message || 'Failed to load finance overview.');

                        const summary = data.summary || {};
                        const filters = data.filters || {};
                        seedFinanceFilters(filters.year || year, filters.month || month);
                        const totalRevenue = Number(data.totalRevenue ?? summary.totalRevenue ?? 0);
                        const totalSalaryPaid = Number(data.totalSalaryPaid ?? summary.totalSalaryPaid ?? summary.totalSalariesPaid ?? 0);
                        const totalExpenses = Number(data.totalExpenses ?? summary.totalExpenses ?? 0);
                        const pendingSalary = Number(data.pendingSalary ?? summary.pendingSalary ?? summary.pendingStaffSalary ?? 0);
                        document.getElementById('financeTotalRevenue').innerText = formatCurrency(totalRevenue);
                        document.getElementById('financeTotalSalariesPaid').innerText = formatCurrency(totalSalaryPaid);
                        document.getElementById('financeTotalExpenses').innerText = formatCurrency(totalExpenses);
                        document.getElementById('financePendingStaffSalary').innerText = formatCurrency(pendingSalary);
                        adminUiState.financeTransactions = Array.isArray(data.transactions) ? data.transactions : [];
                        renderFinanceTransactions();

                        const canvas = document.getElementById('financeTrendChart');
                        if (canvas) {
                            if (financeTrendChart) financeTrendChart.destroy();
                            financeTrendChart = new Chart(canvas, {
                                type: 'line',
                                data: {
                                    labels: (data.chart || []).map((item) => item.label),
                                    datasets: [
                                        {
                                            label: 'Revenue',
                                            data: (data.chart || []).map((item) => item.revenue),
                                            borderColor: '#16a34a',
                                            backgroundColor: 'rgba(22, 163, 74, 0.12)',
                                            tension: 0.32,
                                            fill: false,
                                            borderWidth: 2.5
                                        },
                                        {
                                            label: 'Expenses',
                                            data: (data.chart || []).map((item) => item.expenses),
                                            borderColor: '#1d4ed8',
                                            backgroundColor: 'rgba(29, 78, 216, 0.1)',
                                            tension: 0.32,
                                            fill: false,
                                            borderWidth: 2.5
                                        },
                                        {
                                            label: 'Salary Payouts',
                                            data: (data.chart || []).map((item) => item.salaryPayouts || 0),
                                            borderColor: '#f97316',
                                            backgroundColor: 'rgba(249, 115, 22, 0.14)',
                                            tension: 0.32,
                                            fill: false,
                                            borderWidth: 2.5
                                        }
                                    ]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    resizeDelay: 120,
                                    plugins: {
                                        legend: {
                                            position: 'top',
                                            labels: { usePointStyle: true, boxWidth: 8, color: '#334155' }
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                                            }
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                color: '#64748b',
                                                callback: (value) => `₹${Number(value).toLocaleString('en-IN')}`
                                            },
                                            grid: { color: 'rgba(226, 232, 240, 0.8)' }
                                        },
                                        x: {
                                            ticks: { color: '#64748b' },
                                            grid: { display: false }
                                        }
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        console.error('Finance overview error:', e);
                        showToast(e.message || 'Failed to load finance overview.', 'error');
                    }
                }

                async function addExpense() {
                    const title = document.getElementById('expTitle').value.trim();
                    const amount = document.getElementById('expAmount').value;
                    const category = document.getElementById('expCategory').value;
                    if (!title || !amount) return alert('Title & Amount required!');

                    try {
                        const res = await fetch('/api/admin/add-expense', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title, amount, category }), credentials: 'include'
                        });
                        const data = await res.json();
                        alert(data.message);
                        document.getElementById('expTitle').value = '';
                        document.getElementById('expAmount').value = '';
                        await fetchFinanceData();
                    } catch (e) { alert('Failed to add expense'); }
                }

                async function deleteExpense(id) {
                    if (!confirm('Delete this expense?')) return;
                    try {
                        await fetch('/api/admin/delete-expense/' + id, { method: 'DELETE', credentials: 'include' });
                        await fetchFinanceData();
                    } catch (e) { alert('Failed to delete'); }
                }



    window.setFinanceTransactionFilter = function (filter) {
        adminUiState.financeTransactionFilter = filter || 'all';
        renderFinanceTransactions();
    };

    window.fetchFinanceData = fetchFinanceData;
    window.handleFinanceFilterChange = handleFinanceFilterChange;
    window.addExpense = addExpense;
    window.deleteExpense = deleteExpense;
    window.AdminFinanceSection = {
        render: renderFinanceSection,
        mount: mountAdminFinanceSection
    };
    window.mountAdminFinanceSection = mountAdminFinanceSection;
})();
