import { PersistentState, RunRecord } from '../player/PlayerState';

export class LogUI {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private getState: () => PersistentState;

  constructor(getState: () => PersistentState) {
    this.getState = getState;
    this.overlay = document.getElementById('log-overlay')!;
    this.panel = document.getElementById('log-panel')!;

    document.getElementById('log-btn')!.addEventListener('click', () => this.open());
    // log-close-btn is rendered dynamically inside render(), so its listener is attached there
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  private open(): void {
    this.render();
    this.overlay.style.display = 'flex';
  }

  private close(): void {
    this.overlay.style.display = 'none';
  }

  private render(): void {
    const state = this.getState();
    const history = state.runHistory;

    // --- Summary stats ---
    const totalRuns = state.totalRuns;
    const highestEver = Math.floor(state.highestEver);
    const avgHeight = history.length > 0
      ? Math.floor(history.reduce((s, r) => s + r.peakHeight, 0) / history.length)
      : 0;
    const totalSuccess = history.reduce((s, r) => s + r.pushSuccess, 0);
    const totalAttempts = history.reduce((s, r) => s + r.pushSuccess + r.pushFail, 0);
    const overallHitRate = totalAttempts > 0
      ? Math.round((totalSuccess / totalAttempts) * 100)
      : 0;
    const totalQteAttempted = history.reduce((s, r) => s + r.qteAttempted, 0);
    const totalQteSuccess = history.reduce((s, r) => s + r.qteSuccess, 0);
    const qteRate = totalQteAttempted > 0
      ? Math.round((totalQteSuccess / totalQteAttempted) * 100)
      : null;

    // --- Render rows (most recent first) ---
    const rows = [...history].reverse().map((r: RunRecord) => {
      const attempts = r.pushSuccess + r.pushFail;
      const hitRate = attempts > 0 ? Math.round((r.pushSuccess / attempts) * 100) : 0;
      const earningStr = [
        r.earnings.obolus > 0 ? `${r.earnings.obolus}C` : '',
        r.earnings.drachma > 0 ? `${r.earnings.drachma}S` : '',
        r.earnings.stater > 0 ? `${r.earnings.stater}G` : '',
        r.earnings.ingot > 0 ? `${r.earnings.ingot}I` : '',
      ].filter(Boolean).join(' ') || '—';
      const qteStr = r.qteAttempted > 0
        ? `${r.qteSuccess}/${r.qteAttempted}`
        : '—';
      return `
        <tr>
          <td>${r.runNumber}</td>
          <td>${Math.floor(r.peakHeight)}m</td>
          <td>${r.pushSuccess}</td>
          <td>${r.pushFail}</td>
          <td>${hitRate}%</td>
          <td>${earningStr}</td>
          <td>${qteStr}</td>
        </tr>`;
    }).join('');

    this.panel.innerHTML = `
      <div id="log-header">
        <span id="log-title">Run Log</span>
        <button id="log-close-btn">✕</button>
      </div>

      <div id="log-summary">
        <div class="log-stat"><span class="log-stat-label">Total Runs</span><span class="log-stat-value">${totalRuns}</span></div>
        <div class="log-stat"><span class="log-stat-label">Highest Ever</span><span class="log-stat-value">${highestEver}m</span></div>
        <div class="log-stat"><span class="log-stat-label">Avg Height</span><span class="log-stat-value">${avgHeight}m</span></div>
        <div class="log-stat"><span class="log-stat-label">Overall Hit Rate</span><span class="log-stat-value">${overallHitRate}%</span></div>
        <div class="log-stat"><span class="log-stat-label">QTE Success Rate</span><span class="log-stat-value">${qteRate !== null ? qteRate + '%' : 'N/A'}</span></div>
      </div>

      ${history.length === 0 ? '<p id="log-empty">No runs recorded yet.</p>' : `
      <div id="log-table-wrap">
        <table id="log-table">
          <thead>
            <tr>
              <th>Run</th>
              <th>Height</th>
              <th>✓</th>
              <th>✗</th>
              <th>Hit%</th>
              <th>Earnings</th>
              <th>QTE</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`}
    `;

    // Re-attach close button listener after innerHTML re-render
    document.getElementById('log-close-btn')!.addEventListener('click', () => this.close());
  }
}
