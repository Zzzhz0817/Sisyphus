import { PersistentState, RunRecord } from '../player/PlayerState';
import { ui } from '../i18n';

export class LogUI {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private getState: () => PersistentState;

  constructor(getState: () => PersistentState) {
    this.getState = getState;
    this.overlay = document.getElementById('log-overlay')!;
    this.panel = document.getElementById('log-panel')!;

    document.getElementById('log-btn')!.addEventListener('click', () => this.open());
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
    const t = ui();

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

    const rows = [...history].reverse().map((r: RunRecord) => {
      const attempts = r.pushSuccess + r.pushFail;
      const hitRate = attempts > 0 ? Math.round((r.pushSuccess / attempts) * 100) : 0;
      const earningStr = [
        r.earnings.obol > 0 ? `${r.earnings.obol} Obol` : '',
        r.earnings.ingot > 0 ? `${r.earnings.ingot} Ingot` : '',
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
        <span id="log-title">${t.runLog}</span>
        <button id="log-close-btn">✕</button>
      </div>

      <div id="log-summary">
        <div class="log-stat"><span class="log-stat-label">${t.totalRuns}</span><span class="log-stat-value">${totalRuns}</span></div>
        <div class="log-stat"><span class="log-stat-label">${t.highestEver}</span><span class="log-stat-value">${highestEver}m</span></div>
        <div class="log-stat"><span class="log-stat-label">${t.avgHeight}</span><span class="log-stat-value">${avgHeight}m</span></div>
        <div class="log-stat"><span class="log-stat-label">${t.overallHitRate}</span><span class="log-stat-value">${overallHitRate}%</span></div>
        <div class="log-stat"><span class="log-stat-label">${t.qteSuccessRate}</span><span class="log-stat-value">${qteRate !== null ? qteRate + '%' : 'N/A'}</span></div>
      </div>

      ${history.length === 0 ? `<p id="log-empty">${t.noRuns}</p>` : `
      <div id="log-table-wrap">
        <table id="log-table">
          <thead>
            <tr>
              <th>${t.runCol}</th>
              <th>${t.heightCol}</th>
              <th>✓</th>
              <th>✗</th>
              <th>${t.hitPct}</th>
              <th>${t.earnings}</th>
              <th>QTE</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`}
    `;

    document.getElementById('log-close-btn')!.addEventListener('click', () => this.close());
  }
}
