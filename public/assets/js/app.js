/**
 * CryptoMine — Main Application JS
 * Handles stats polling, toast notifications, and UI utilities
 */

// ─── Toast Notifications ───────────────────────────────
window.showToast = function(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// ─── Copy to clipboard ─────────────────────────────────
window.copyToClipboard = function(text, label = 'Address') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} copied!`, 'success', 2000);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast(`${label} copied!`, 'success', 2000);
  });
};

// ─── Format MINE amount ────────────────────────────────
window.formatMINE = function(amount) {
  return parseFloat(amount).toFixed(8) + ' EZK';
};

// ─── Short hash display ────────────────────────────────
window.shortHash = function(hash, len = 8) {
  if (!hash || hash.length < len * 2) return hash;
  return hash.slice(0, len) + '...' + hash.slice(-len);
};

// ─── Format timestamp ──────────────────────────────────
window.formatTime = function(ts) {
  const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
  return d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
};

// ─── Countdown / time ago ─────────────────────────────
window.timeAgo = function(ts) {
  const d   = new Date(typeof ts === 'number' ? ts * 1000 : ts);
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60)  return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec/3600)}h ago`;
  return `${Math.floor(sec/86400)}d ago`;
};

// ─── Number formatter ─────────────────────────────────
window.fmtNum = function(n) {
  if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return parseFloat(n).toFixed(2);
};

// ─── Dashboard Stats Live Update ──────────────────────
async function fetchStats() {
  try {
    const res  = await fetch('/api/stats');
    const data = await res.json();
    if (!data.success) return;
    const s = data.stats;

    // Update stat cards if present
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = val; el.classList.add('updated'); setTimeout(() => el.classList.remove('updated'), 500); }
    };

    set('stat-blocks',       s.total_blocks     || 0);
    set('stat-supply',       parseFloat(s.total_supply || 0).toFixed(2));
    set('stat-difficulty',   s.difficulty       || 4);
    set('stat-wallets',      s.total_wallets    || 0);
    set('stat-mempool',      s.mempool_count    || 0);
    set('stat-transactions', s.total_transactions || 0);
    set('stat-hashrate',     fmtNum(data.avg_hashrate || 0) + ' H/s');
    set('stat-circulation',  (s.circulation_pct || 0) + '%');

    // Progress bar
    const pb = document.getElementById('supply-progress');
    if (pb) pb.style.width = (s.circulation_pct || 0) + '%';

    // Network status
    const ns = document.getElementById('network-blocks');
    if (ns) ns.textContent = (s.total_blocks || 0) + ' blocks';

    // Hashrate chart
    if (data.hashrate_history && window.hashrateChart) {
      const labels = data.hashrate_history.map(h => '#' + h.block_index);
      const vals   = data.hashrate_history.map(h => parseFloat(h.hashrate) || 0);
      window.hashrateChart.data.labels = labels;
      window.hashrateChart.data.datasets[0].data = vals;
      window.hashrateChart.update('none');
    }

  } catch (e) {
    console.warn('Stats fetch failed:', e);
  }
}

// ─── Recent Blocks for Dashboard ──────────────────────
async function fetchRecentBlocks() {
  const container = document.getElementById('recent-blocks-list');
  if (!container) return;

  try {
    const res  = await fetch('/api/chain?per_page=5');
    const data = await res.json();
    if (!data.success || !data.blocks.length) {
      container.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:20px">No blocks mined yet</td></tr>';
      return;
    }

    container.innerHTML = data.blocks.map(b => `
      <tr>
        <td><span class="badge badge-cyan">#${b.block_index}</span></td>
        <td class="font-mono text-sm text-cyan">${shortHash(b.hash, 10)}</td>
        <td class="text-sm">${b.tx_count} tx</td>
        <td class="text-sm text-green">${parseFloat(b.reward).toFixed(2)} EZK</td>
        <td class="text-sm text-muted">${timeAgo(b.created_at)}</td>
      </tr>
    `).join('');

  } catch(e) { console.warn(e); }
}

// ─── Init Dashboard Charts with Chart.js ─────────────
function initHashrateChart() {
  const canvas = document.getElementById('hashrate-chart');
  if (!canvas || !window.Chart) return;

  window.hashrateChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Hashrate (H/s)',
        data: [],
        borderColor: '#00e5ff',
        backgroundColor: 'rgba(0, 229, 255, 0.07)',
        borderWidth: 2,
        pointBackgroundColor: '#7c3aed',
        pointBorderColor: '#00e5ff',
        pointRadius: 4,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10,13,26,0.95)',
          borderColor: 'rgba(0,229,255,0.3)',
          borderWidth: 1,
          titleColor: '#00e5ff',
          bodyColor: '#94a3b8',
          callbacks: {
            label: ctx => ` ${fmtNum(ctx.parsed.y)} H/s`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,229,255,0.05)' },
          ticks: { color: '#475569', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(0,229,255,0.05)' },
          ticks: { color: '#475569', font: { size: 11 }, callback: v => fmtNum(v) + ' H/s' }
        }
      }
    }
  });
}

// ─── Auto-init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Init chart
  initHashrateChart();

  // Initial fetch
  fetchStats();
  fetchRecentBlocks();

  // Poll every 8 seconds
  setInterval(() => {
    fetchStats();
    fetchRecentBlocks();
  }, 8000);

  // Highlight active nav item
  const currentPath = window.location.pathname.split('/').pop() || '';
  document.querySelectorAll('.nav-item').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes(currentPath) || (currentPath === '' && href.includes('index'))) {
      link.classList.add('active');
    }
  });
});
