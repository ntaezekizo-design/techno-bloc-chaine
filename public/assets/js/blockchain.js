/**
 * CryptoMine — Blockchain Visualizer
 * Renders animated chain of blocks and manages block explorer
 */

/**
 * Render the chain visualization
 * @param {Array} blocks - Array of block objects
 * @param {string} containerId - DOM container ID
 * @param {Function} onBlockClick - Callback when a block is clicked
 */
window.renderChain = function (blocks, containerId, onBlockClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!blocks || !blocks.length) {
        container.innerHTML = '<div class="text-center text-muted" style="padding:40px">No blocks in chain</div>';
        return;
    }

    let html = '';
    blocks.forEach((b, i) => {
        const isGenesis = b.block_index === 0;
        html += `
      <div class="chain-block${isGenesis ? ' genesis' : ''}"
           data-block-index="${b.block_index}"
           onclick="onChainBlockClick(this, ${b.block_index})">
        <div class="block-index">BLOCK #${b.block_index}</div>
        <div class="block-hash-short">${shortHash(b.hash, 12)}</div>
        <div class="block-meta">
          <div>⛏ ${b.tx_count} tx | ${parseFloat(b.reward || 0).toFixed(2)} EZK</div>
        </div>
        <div class="block-nonce">Nonce: ${b.nonce}</div>
      </div>
    `;
        if (i < blocks.length - 1) {
            html += `<div class="chain-connector">⛓</div>`;
        }
    });

    container.innerHTML = html;

    // Animate blocks in
    setTimeout(() => {
        container.querySelectorAll('.chain-block').forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            setTimeout(() => {
                el.style.transition = 'all 0.4s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, i * 80);
        });
    }, 50);

    window._onChainBlockClickCb = onBlockClick;
};

window.onChainBlockClick = function (el, blockIndex) {
    // Highlight
    document.querySelectorAll('.chain-block').forEach(b => b.style.borderColor = '');
    el.style.borderColor = 'var(--accent-cyan)';
    el.style.boxShadow = '0 0 20px rgba(0,229,255,0.3)';

    if (window._onChainBlockClickCb) {
        window._onChainBlockClickCb(blockIndex);
    }
};

/**
 * Fetch block details and display in detail panel
 */
window.showBlockDetail = async function (blockQuery, panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    panel.innerHTML = '<div class="text-center text-muted" style="padding:20px">Loading...</div>';
    panel.classList.add('visible');

    try {
        const res = await fetch(`/api/chain?block=${encodeURIComponent(blockQuery)}`);
        const data = await res.json();

        if (!data.success) {
            panel.innerHTML = `<div class="alert alert-danger">Block not found</div>`;
            return;
        }

        const b = data.block;
        const txs = b.transactions || [];

        panel.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 style="font-size:16px;font-weight:700;">
          <span class="text-cyan">Block #${b.block_index}</span>
        </h3>
        <span class="badge ${b.block_index === 0 ? 'badge-purple' : 'badge-success'}">
          ${b.block_index === 0 ? '🌐 GENESIS' : '✅ CONFIRMED'}
        </span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Hash</span>
        <span class="detail-value text-cyan">${b.hash}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Previous Hash</span>
        <span class="detail-value text-muted">${b.previous_hash}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Merkle Root</span>
        <span class="detail-value text-muted">${b.merkle_root}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Nonce</span>
        <span class="detail-value text-yellow">${b.nonce.toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Difficulty</span>
        <span class="detail-value">${b.difficulty} (${'0'.repeat(b.difficulty)}...)</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Miner</span>
        <span class="detail-value text-green">${b.miner_address}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Reward</span>
        <span class="detail-value text-green">${parseFloat(b.reward).toFixed(8)} EZK</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Transactions</span>
        <span class="detail-value">${b.tx_count} transaction${b.tx_count !== 1 ? 's' : ''}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timestamp</span>
        <span class="detail-value">${formatTime(b.created_at)}</span>
      </div>

      ${txs.length ? `
        <div style="margin-top:16px">
          <div class="card-title mb-4">Transactions in this block</div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>TXID</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${txs.map(tx => `
                  <tr>
                    <td class="font-mono text-sm text-cyan">${shortHash(tx.txid, 8)}</td>
                    <td class="font-mono text-sm">${tx.from_address === 'COINBASE' ? '<span class="badge badge-purple">COINBASE</span>' : shortHash(tx.from_address, 8)}</td>
                    <td class="font-mono text-sm">${shortHash(tx.to_address, 8)}</td>
                    <td class="text-green font-bold">${parseFloat(tx.amount).toFixed(8)} EZK</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;

    } catch (e) {
        panel.innerHTML = `<div class="alert alert-danger">Error loading block: ${e.message}</div>`;
    }
};

/**
 * Supply distribution doughnut chart
 */
window.renderSupplyChart = function (canvasId, mined, remaining) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Mined', 'Remaining'],
            datasets: [{
                data: [mined, remaining],
                backgroundColor: ['rgba(0,229,255,0.8)', 'rgba(124,58,237,0.3)'],
                borderColor: ['#00e5ff', '#7c3aed'],
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(10,13,26,0.95)',
                    titleColor: '#00e5ff',
                    bodyColor: '#94a3b8',
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.toLocaleString()} EZK`
                    }
                }
            }
        }
    });
};

/**
 * Difficulty history bar chart
 */
window.renderDifficultyChart = function (canvasId, history) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: history.map(h => '#' + h.block_index),
            datasets: [{
                label: 'Difficulty',
                data: history.map(h => h.difficulty),
                backgroundColor: 'rgba(168,85,247,0.6)',
                borderColor: '#a855f7',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(0,229,255,0.05)' }, ticks: { color: '#475569', font: { size: 10 } } },
                y: {
                    grid: { color: 'rgba(0,229,255,0.05)' },
                    ticks: { color: '#475569', font: { size: 10 }, stepSize: 1 },
                    min: 0,
                }
            }
        }
    });
};
