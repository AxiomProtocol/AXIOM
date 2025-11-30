// YieldDashboardEngine.js
// Full staking yield system with chart integration, filtering, and export

import { soloPlanWallets } from './SoloPlanWallets.js';

const simulatedYieldLedger = [];

function creditYield({ date, walletLabel, amountSWF, notes }) {
  const wallet = soloPlanWallets.find(w => w.name === walletLabel);
  if (!wallet) throw new Error(`Wallet not found: ${walletLabel}`);
  simulatedYieldLedger.push({
    date,
    walletLabel,
    walletAddress: wallet.address,
    amountSWF: parseFloat(amountSWF),
    notes
  });
}

function getWalletYield(walletLabel) {
  return simulatedYieldLedger.filter(entry => entry.walletLabel === walletLabel);
}

function getTotalYieldedSWF(data = simulatedYieldLedger) {
  return data.reduce((sum, entry) => sum + entry.amountSWF, 0);
}

function getYieldReport(filteredWallet = '', fromDate = '', toDate = '') {
  return soloPlanWallets.map(w => {
    const walletData = simulatedYieldLedger.filter(e => {
      const dateOK = (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate);
      const walletOK = !filteredWallet || e.walletLabel === filteredWallet;
      return walletOK && dateOK;
    });
    const total = walletData.reduce((acc, e) => acc + e.amountSWF, 0);
    return {
      wallet: w.name,
      address: w.address,
      totalSWF: total
    };
  });
}

function exportToCSV(data) {
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
  const csvContent = `${headers}\n${rows}`;
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SWF_Yield_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SWF_Yield_Ledger_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderYieldChart(report) {
  const ctx = document.getElementById('yield-chart');
  if (!ctx) return;
  
  const labels = report.map(r => r.wallet);
  const data = report.map(r => r.totalSWF);
  
  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'SWF Earned',
        data,
        backgroundColor: 'rgba(54, 162, 235, 0.7)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };
  
  if (window._yieldChart) window._yieldChart.destroy();
  window._yieldChart = new Chart(ctx, chartConfig);
}

function renderYieldUI(containerId = 'yield-dashboard') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const selectedWallet = document.getElementById('wallet-filter')?.value || '';
  const selectedFrom = document.getElementById('from-date')?.value || '';
  const selectedTo = document.getElementById('to-date')?.value || '';

  const report = getYieldReport(selectedWallet, selectedFrom, selectedTo);

  const form = `
    <h4>Add Yield Entry</h4>
    <form id="yield-entry-form">
      <label>Date: <input type="date" name="date" required /></label><br>
      <label>Wallet: 
        <select name="walletLabel">
          ${soloPlanWallets.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}
        </select>
      </label><br>
      <label>Amount SWF: <input type="number" name="amountSWF" step="0.01" required /></label><br>
      <label>Notes: <input type="text" name="notes" /></label><br>
      <button type="submit">Credit Yield</button>
    </form>
  `;

  const filters = `
    <h4>Simulated Yield Report</h4>
    <label>Filter by Wallet:</label>
    <select id="wallet-filter">
      <option value="">All Wallets</option>
      ${soloPlanWallets.map(w => `<option value="${w.name}" ${w.name === selectedWallet ? 'selected' : ''}>${w.name}</option>`).join('')}
    </select>
    <label>From: <input type="date" id="from-date" value="${selectedFrom}" /></label>
    <label>To: <input type="date" id="to-date" value="${selectedTo}" /></label>
    <button id="apply-filters">Apply Filters</button>
  `;

  const table = `
    <table style="width:100%;border-collapse:collapse;margin-top:10px;">
      <tr><th>Wallet</th><th>Address</th><th>SWF Earned</th></tr>
      ${report.map(r => `
        <tr>
          <td>${r.wallet}</td>
          <td style="font-size:0.8em">${r.address}</td>
          <td><strong>${r.totalSWF.toFixed(2)}</strong></td>
        </tr>
      `).join('')}
    </table>
    <p style="margin-top:10px;font-size:0.9em;">Total Distributed: <strong>${getTotalYieldedSWF(report).toFixed(2)} SWF</strong></p>
    <button id="export-csv" style="margin-right:10px;margin-top:8px">Export CSV</button>
    <button id="export-json">Export JSON</button>
    <canvas id="yield-chart" height="200" style="margin-top:20px;"></canvas>
  `;

  container.innerHTML = form + filters + table;

  document.getElementById('yield-entry-form').onsubmit = function (e) {
    e.preventDefault();
    const data = new FormData(e.target);
    creditYield({
      date: data.get('date'),
      walletLabel: data.get('walletLabel'),
      amountSWF: parseFloat(data.get('amountSWF')),
      notes: data.get('notes') || ''
    });
    renderYieldUI(containerId);
  };

  document.getElementById('apply-filters').onclick = () => renderYieldUI(containerId);
  document.getElementById('export-csv').onclick = () => exportToCSV(simulatedYieldLedger);
  document.getElementById('export-json').onclick = () => exportToJSON(simulatedYieldLedger);

  renderYieldChart(report);
}

export { creditYield, getWalletYield, getTotalYieldedSWF, getYieldReport, renderYieldUI };