document.addEventListener('DOMContentLoaded', () => {
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const countText = document.getElementById('count-text');
  const progressFill = document.getElementById('progress-fill');
  const logsContainer = document.getElementById('logs-container');
  const btnTest = document.getElementById('btn-test');
  const btnClear = document.getElementById('btn-clear');

  function renderState(state) {
    if (!state) return;

    if (state.isRunning) {
      if (statusPill) {
        statusPill.textContent = 'Running';
        statusPill.style.background = 'rgba(245, 158, 11, 0.2)';
        statusPill.style.color = '#fcd34d';
        statusPill.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      }
      if (statusText) statusText.textContent = `Adding to ${state.platform || 'Cart'}...`;
    } else {
      if (statusPill) {
        statusPill.textContent = 'Idle';
        statusPill.style.background = 'rgba(0, 168, 150, 0.2)';
        statusPill.style.color = '#4ade80';
        statusPill.style.borderColor = 'rgba(0, 168, 150, 0.4)';
      }
      if (statusText) statusText.textContent = state.total > 0 ? 'Execution Completed' : 'Ready for execution';
    }

    if (countText) countText.textContent = `${state.completed}/${state.total}`;

    const percent = state.total > 0 ? Math.round((state.completed / state.total) * 100) : 0;
    if (progressFill) progressFill.style.width = `${percent}%`;

    if (logsContainer && state.logs) {
      logsContainer.innerHTML = '';
      state.logs.forEach((log) => {
        const item = document.createElement('div');
        item.className = `log-item ${log.type || 'info'}`;

        const textSpan = document.createElement('span');
        textSpan.textContent = log.text;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = log.timestamp || '';

        item.appendChild(textSpan);
        item.appendChild(timeSpan);
        logsContainer.appendChild(item);
      });
    }
  }

  function fetchStatus() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError) return;
      renderState(response);
    });
  }

  // Poll for updates every second
  fetchStatus();
  const pollTimer = setInterval(fetchStatus, 1000);

  // Button Listeners
  if (btnTest) {
    btnTest.addEventListener('click', () => {
      chrome.runtime.sendMessage(
        {
          type: 'START_EXECUTION',
          payload: {
            items: [
              { name: 'Amul Taaza Milk 1L', platform: 'Zepto' },
              { name: 'Tata Salt 1kg', platform: 'Blinkit' },
              { name: 'Brown Bread 400g', platform: 'Swiggy Instamart' },
            ],
          },
        },
        () => fetchStatus()
      );
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }, () => fetchStatus());
    });
  }
});
