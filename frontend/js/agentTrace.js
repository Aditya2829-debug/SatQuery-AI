/**
 * Agentic Orchestration Timeline Controller
 */
window.AgentTrace = {
  reset() {
    for (let i = 1; i <= 5; i++) {
      const step = document.getElementById(`step-${i}`);
      if (!step) continue;
      const ind = step.querySelector('.step-indicator');
      ind.className = 'step-indicator';
      ind.innerText = i;
      document.getElementById(`s${i}-desc`).innerText = 'Waiting...';
    }
    const badge = document.getElementById('traceBadge');
    if (badge) badge.innerText = 'Running Pipeline...';
  },

  updateStep(stepNum, status, desc) {
    const step = document.getElementById(`step-${stepNum}`);
    if (!step) return;
    const ind = step.querySelector('.step-indicator');
    const descEl = document.getElementById(`s${stepNum}-desc`);
    if (descEl) descEl.innerText = desc;

    if (status === 'active') {
      ind.className = 'step-indicator active';
      ind.innerText = '⏳';
    } else if (status === 'completed') {
      ind.className = 'step-indicator completed';
      ind.innerText = '✓';
    } else if (status === 'error') {
      ind.className = 'step-indicator error';
      ind.innerText = '✕';
    }
  }
};