// Attention Replay - Settings JavaScript

let settings = {
  excludedDomains: [],
  isPaused: false,
  autoCleanupDays: 30
};

// Reusable toast notification helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  
  container.appendChild(toast);
  
  // Trigger slide-in animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Auto dismiss after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 3000);
}

// Reusable dynamic confirmation modal handler
function showConfirmModal(title, message, confirmText, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = modal.querySelector('h2');
  const descEl = modal.querySelector('p');
  
  titleEl.innerText = title;
  descEl.innerText = message;
  
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  
  confirmBtn.innerText = confirmText;
  
  // Clone buttons to clear existing listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  newCancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  
  newConfirmBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    onConfirm();
  });
  
  modal.classList.remove('hidden');
}

// Helper for date string formatting
function getLocalDateStringForDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Clean domains (remove http/https/www)
function cleanDomain(input) {
  let domain = input.trim().toLowerCase();
  if (!domain) return '';
  
  if (domain.startsWith('http://')) domain = domain.substring(7);
  if (domain.startsWith('https://')) domain = domain.substring(8);
  
  domain = domain.split('/')[0];
  domain = domain.split(':')[0];
  
  if (domain.startsWith('www.')) domain = domain.substring(4);
  
  return domain;
}

// Render the domains in the UI list
function renderExclusions() {
  const listEl = document.getElementById('exclusions-list');
  listEl.innerHTML = '';
  
  if (settings.excludedDomains.length === 0) {
    const li = document.createElement('li');
    li.style.color = '#94a3b8';
    li.style.justifyContent = 'center';
    li.innerText = 'No domains excluded yet.';
    listEl.appendChild(li);
    return;
  }
  
  const sorted = [...settings.excludedDomains].sort();
  
  sorted.forEach(domain => {
    const li = document.createElement('li');
    
    const domainText = document.createElement('span');
    domainText.innerText = domain;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = `Remove ${domain}`;
    removeBtn.dataset.domain = domain;
    
    li.appendChild(domainText);
    li.appendChild(removeBtn);
    listEl.appendChild(li);
  });
}

// Load and bind settings
async function loadSettings() {
  const data = await chrome.storage.local.get('settings');
  if (data.settings) {
    settings = data.settings;
  }
  
  // Update toggle state
  document.getElementById('pause-tracking-toggle').checked = settings.isPaused;
  
  // Update exclusions list
  renderExclusions();
  
  // Update retention days
  document.getElementById('retention-days').value = settings.autoCleanupDays ?? 30;
}

// Save settings to local storage
async function saveSettings() {
  await chrome.storage.local.set({ settings });
}


// --- Event Handlers ---

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  
  // Toggle Pause Tracking
  document.getElementById('pause-tracking-toggle').addEventListener('change', async (e) => {
    settings.isPaused = e.target.checked;
    await saveSettings();
    showToast(settings.isPaused ? 'Tracking paused.' : 'Tracking resumed.', 'info');
  });

  // Add Domain Exclusion
  document.getElementById('add-exclusion-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputEl = document.getElementById('domain-input');
    const domain = cleanDomain(inputEl.value);
    
    if (domain) {
      if (!settings.excludedDomains.includes(domain)) {
        settings.excludedDomains.push(domain);
        await saveSettings();
        renderExclusions();
        inputEl.value = '';
        showToast(`Excluded ${domain} successfully.`, 'success');
      } else {
        showToast('Domain is already in the exclusion list.', 'error');
      }
    }
  });
  
  // Remove Domain Exclusion
  document.getElementById('exclusions-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-remove')) {
      const domainToRemove = e.target.dataset.domain;
      settings.excludedDomains = settings.excludedDomains.filter(d => d !== domainToRemove);
      await saveSettings();
      renderExclusions();
      showToast(`Removed ${domainToRemove} from exclusions.`, 'info');
    }
  });
  
  // Save Retention Period
  document.getElementById('save-retention-btn').addEventListener('click', async () => {
    const daysEl = document.getElementById('retention-days');
    let days = parseInt(daysEl.value, 10);
    
    if (isNaN(days) || days < 0) {
      days = 30;
      daysEl.value = 30;
    }
    
    settings.autoCleanupDays = days;
    await saveSettings();
    showToast('Retention period saved successfully.', 'success');
  });
  
  // Manual Cleanup
  document.getElementById('run-cleanup-btn').addEventListener('click', async () => {
    const days = parseInt(document.getElementById('retention-days').value, 10);
    if (isNaN(days) || days <= 0) {
      showToast('Retention period must be greater than 0 to perform cleanup.', 'error');
      return;
    }
    
    showConfirmModal(
      'Clean Up Old Data',
      `Are you sure you want to clean up all storage data older than ${days} days? This cannot be undone.`,
      'Yes, Clean Up Now',
      async () => {
        const allData = await chrome.storage.local.get(null);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = getLocalDateStringForDate(cutoff);
        
        const keysToRemove = [];
        for (const key of Object.keys(allData)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
            if (key < cutoffStr) {
              keysToRemove.push(key);
            }
          }
        }
        
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
          showToast(`Cleanup complete: Removed data for ${keysToRemove.length} dates.`, 'success');
        } else {
          showToast('No data older than the retention period was found.', 'info');
        }
      }
    );
  });

  // Danger Zone - Clear All Data Modal Flow
  document.getElementById('clear-all-data-btn').addEventListener('click', () => {
    showConfirmModal(
      'Clear All Local Data',
      'This action will delete all your accumulated browsing activity history, settings, and exclusions forever. This cannot be undone.',
      'Yes, Delete All Data',
      async () => {
        await chrome.storage.local.clear();
        
        // Reset to default settings
        const defaultSettings = {
          excludedDomains: [],
          isPaused: false,
          autoCleanupDays: 30
        };
        await chrome.storage.local.set({ settings: defaultSettings });
        
        // Re-initialize background states
        await chrome.storage.local.set({ 
          lastRunTime: Date.now(),
          currentState: { activeDomain: null, startTime: Date.now() }
        });
        
        await loadSettings();
        showToast('All local tracking data has been cleared.', 'success');
      }
    );
  });
  
  // Navigation
  document.getElementById('back-to-dashboard').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });
});
