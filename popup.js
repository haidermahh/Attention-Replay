// Attention Replay - Popup JavaScript

const WELL_KNOWN_DOMAINS = {
  'youtube.com': 'YouTube',
  'claude.ai': 'Claude',
  'github.com': 'GitHub',
  'twitter.com': 'Twitter/X',
  'x.com': 'Twitter/X',
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'reddit.com': 'Reddit',
  'linkedin.com': 'LinkedIn',
  'google.com': 'Google',
  'gmail.com': 'Gmail',
  'wikipedia.org': 'Wikipedia',
  'chatgpt.com': 'ChatGPT',
  'openai.com': 'OpenAI',
  'stackoverflow.com': 'Stack Overflow',
  'netflix.com': 'Netflix',
  'amazon.com': 'Amazon',
  'microsoft.com': 'Microsoft',
  'apple.com': 'Apple',
  'twitch.tv': 'Twitch',
  'discord.com': 'Discord',
  'spotify.com': 'Spotify',
  'zoom.us': 'Zoom',
  'slack.com': 'Slack',
  'pinterest.com': 'Pinterest',
  'tumblr.com': 'Tumblr',
  'quora.com': 'Quora',
  'medium.com': 'Medium',
  'vimeo.com': 'Vimeo',
  'dropbox.com': 'Dropbox',
  'figma.com': 'Figma',
  'canva.com': 'Canva',
  'notion.so': 'Notion',
  'trello.com': 'Trello',
  'github.io': 'GitHub Pages',
  'gitlab.com': 'GitLab',
  'bitbucket.org': 'BitBucket',
  'yahoo.com': 'Yahoo',
  'bing.com': 'Bing',
  'duckduckgo.com': 'DuckDuckGo',
  'ebay.com': 'eBay',
  'walmart.com': 'Walmart'
};

function getDisplayName(domain) {
  if (!domain) return '';
  const cleanDomain = domain.toLowerCase().trim();
  if (WELL_KNOWN_DOMAINS[cleanDomain]) {
    return WELL_KNOWN_DOMAINS[cleanDomain];
  }
  const parts = cleanDomain.split('.');
  const tldSuffixes = new Set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'biz', 'info', 'name', 
    'xyz', 'io', 'ai', 'co', 'app', 'dev', 'me', 'tv', 'so', 'pk', 'in', 
    'uk', 'us', 'ca', 'au', 'fr', 'de', 'jp', 'ru', 'br', 'it', 'es', 'cn'
  ]);
  const nameParts = parts.filter(part => !tldSuffixes.has(part));
  const finalParts = nameParts.length > 0 ? nameParts : [parts[0]];
  return finalParts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Helper to get local date string YYYY-MM-DD
function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get long formatted date
function getFormattedLongDate() {
  const d = new Date();
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Deterministic color based on domain name
function getDomainColor(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 65%, 60%)`;
}

// Format duration in seconds to human-readable string
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

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

// Reusable FLIP reordering in-place list updater
function updateListInPlace(container, items, keyExtractor, createFn, updateFn) {
  // 1. Record First positions of existing elements
  const firstPositions = new Map();
  for (const child of container.children) {
    const key = child.dataset.key;
    if (key) {
      firstPositions.set(key, child.getBoundingClientRect());
    }
  }

  // 2. Keep track of active keys in the new set
  const activeKeys = new Set(items.map(keyExtractor));

  // Remove keys that are no longer in items
  const childrenArray = Array.from(container.children);
  childrenArray.forEach(child => {
    const key = child.dataset.key;
    if (key && !activeKeys.has(key)) {
      child.remove();
    }
  });

  // Create or update and append in correct order
  items.forEach((item, index) => {
    const key = keyExtractor(item);
    
    // Find existing child by key
    let element = null;
    for (const child of container.children) {
      if (child.dataset.key === key) {
        element = child;
        break;
      }
    }

    if (!element) {
      element = createFn(item);
      element.dataset.key = key;
      if (index < container.children.length) {
        container.insertBefore(element, container.children[index]);
      } else {
        container.appendChild(element);
      }
    } else {
      updateFn(element, item);
      // Only reorder in the DOM if the item is not already at the target index
      if (container.children[index] !== element) {
        if (index < container.children.length) {
          container.insertBefore(element, container.children[index]);
        } else {
          container.appendChild(element);
        }
      }
    }
  });

  // 3. Record Last positions of all elements after reordering
  const lastPositions = new Map();
  for (const child of container.children) {
    const key = child.dataset.key;
    if (key) {
      lastPositions.set(key, child.getBoundingClientRect());
    }
  }

  // 4. Invert & Play (FLIP technique)
  for (const child of container.children) {
    const key = child.dataset.key;
    const firstRect = firstPositions.get(key);
    const lastRect = lastPositions.get(key);

    if (firstRect && lastRect) {
      const dy = firstRect.top - lastRect.top;
      const dx = firstRect.left - lastRect.left;

      if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) {
        child.style.transition = 'none';
        child.style.transform = `translate(${dx}px, ${dy}px)`;
        
        // Force reflow
        child.offsetHeight;

        child.style.transition = 'transform 0.4s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 0.4s';
        child.style.transform = 'translate(0, 0)';

        // Clear inline transition/transform after slide completes to preserve hover scaling
        setTimeout(() => {
          child.style.transition = '';
          child.style.transform = '';
        }, 400);
      }
    }
  }
}

// State variables
let basePopupData = null;
let liveUpdateInterval = null;

async function loadPopupStats() {
  const loadingEl = document.getElementById('loading');
  const emptyStateEl = document.getElementById('empty-state');
  const statsAreaEl = document.getElementById('stats-area');
  const popupDateEl = document.getElementById('popup-date');

  // Set long formatted date header
  if (popupDateEl) {
    popupDateEl.innerText = getFormattedLongDate();
  }

  try {
    const todayStr = getLocalDateString();
    
    // Retrieve data and settings
    const data = await chrome.storage.local.get([todayStr, 'settings']);
    
    basePopupData = {
      todayData: data[todayStr] || { activeTotals: {}, totals: {} },
      settings: data.settings || { isPaused: false, excludedDomains: [] }
    };

    loadingEl.classList.add('hidden');
    
    // Run initial render
    renderPopupUI();

    // Start live updates every 1 second
    if (liveUpdateInterval) clearInterval(liveUpdateInterval);
    liveUpdateInterval = setInterval(renderPopupUI, 1000);

  } catch (err) {
    console.error('Error loading popup stats:', err);
    loadingEl.innerText = 'Error loading focus data.';
  }
}

// Renders the popup UI, incorporating live ticks dynamically
function renderPopupUI() {
  if (!basePopupData) return;

  const emptyStateEl = document.getElementById('empty-state');
  const statsAreaEl = document.getElementById('stats-area');
  const totalValEl = document.getElementById('total-time-value');
  const sitesListEl = document.getElementById('sites-list');

  // Request in-progress tick time from background service worker
  chrome.runtime.sendMessage({ type: 'GET_LIVE_STATE' }, (liveState) => {
    if (chrome.runtime.lastError) {
      console.warn('Error connecting to background page:', chrome.runtime.lastError.message);
      return;
    }

    // Clone base totals to inject active ticks
    const todayData = JSON.parse(JSON.stringify(basePopupData.todayData));
    const settings = basePopupData.settings;

    if (!todayData.activeTotals) todayData.activeTotals = {};

    // If a tab is currently active and focus tracking is not paused, tick the seconds live
    if (liveState && !liveState.isPaused && liveState.activeDomain) {
      const activeDom = liveState.activeDomain;
      const elapsed = liveState.activeElapsed;

      const isExcluded = settings.excludedDomains.some(excluded => {
        const clean = excluded.trim().toLowerCase();
        if (!clean) return false;
        return activeDom === clean || activeDom.endsWith('.' + clean);
      });

      if (!isExcluded && elapsed > 0) {
        todayData.activeTotals[activeDom] = (todayData.activeTotals[activeDom] || 0) + elapsed;
      }
    }

    const rawTotals = todayData.activeTotals;
    const totals = {};
    let grandTotalSeconds = 0;

    for (const [domain, seconds] of Object.entries(rawTotals)) {
      const isExcluded = settings.excludedDomains.some(excluded => {
        const clean = excluded.trim().toLowerCase();
        if (!clean) return false;
        return domain === clean || domain.endsWith('.' + clean);
      });

      if (!isExcluded && seconds > 0) {
        totals[domain] = seconds;
        grandTotalSeconds += seconds;
      }
    }

    const activeDom = liveState ? liveState.activeDomain : null;
    const isPaused = liveState ? liveState.isPaused : false;

    if (grandTotalSeconds === 0 && !activeDom) {
      emptyStateEl.classList.remove('hidden');
      statsAreaEl.classList.add('hidden');
      return;
    }

    emptyStateEl.classList.add('hidden');
    statsAreaEl.classList.remove('hidden');

    // Update Current Active Site Card DOM values
    const currentDomainEl = document.getElementById('current-site-domain');
    const currentSiteTimeEl = document.getElementById('current-site-time');
    const currentSiteIconEl = document.getElementById('current-site-icon');
    const currentSiteFallbackEl = document.getElementById('current-site-fallback');

    let currentDomExcluded = false;
    if (activeDom) {
      currentDomExcluded = settings.excludedDomains.some(excluded => {
        const clean = excluded.trim().toLowerCase();
        if (!clean) return false;
        return activeDom === clean || activeDom.endsWith('.' + clean);
      });
    }

    if (isPaused) {
      currentDomainEl.innerText = 'Tracking Paused';
      currentSiteTimeEl.innerText = '--';
      currentSiteIconEl.classList.add('hidden');
      currentSiteFallbackEl.classList.remove('hidden');
      currentSiteFallbackEl.style.backgroundColor = '#374151';
      currentSiteFallbackEl.innerText = '';
    } else if (currentDomExcluded) {
      currentDomainEl.innerText = `${activeDom} (Excluded)`;
      currentSiteTimeEl.innerText = '--';
      currentSiteIconEl.classList.add('hidden');
      currentSiteFallbackEl.classList.remove('hidden');
      currentSiteFallbackEl.style.backgroundColor = '#ef4444';
      currentSiteFallbackEl.innerText = '';
    } else if (activeDom) {
      currentDomainEl.innerText = getDisplayName(activeDom);
      currentDomainEl.title = activeDom;
      currentSiteTimeEl.innerText = formatDuration(totals[activeDom] || 0);

      // Icon update
      currentSiteIconEl.src = `https://www.google.com/s2/favicons?domain=${activeDom}&sz=32`;
      currentSiteIconEl.classList.remove('hidden');
      currentSiteFallbackEl.classList.add('hidden');
      currentSiteIconEl.onerror = () => {
        currentSiteIconEl.classList.add('hidden');
        currentSiteFallbackEl.classList.remove('hidden');
        currentSiteFallbackEl.style.backgroundColor = getDomainColor(activeDom);
        currentSiteFallbackEl.innerText = activeDom.charAt(0).toUpperCase();
      };
    } else {
      currentDomainEl.innerText = 'No Active Tab';
      currentSiteTimeEl.innerText = '--';
      currentSiteIconEl.classList.add('hidden');
      currentSiteFallbackEl.classList.remove('hidden');
      currentSiteFallbackEl.className = 'favicon-fallback is-idle';
      currentSiteFallbackEl.style.backgroundColor = '';
      currentSiteFallbackEl.innerText = '';
    }

    // Sort domains by time spent descending
    const sortedDomains = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const topDomains = sortedDomains.slice(0, 3);
    const maxTime = topDomains.length > 0 ? topDomains[0][1] : 0;

    totalValEl.innerText = formatDuration(grandTotalSeconds);

    // Call re-usable in-place list updater with FLIP sliding transitions
    updateListInPlace(
      sitesListEl,
      topDomains,
      item => item[0], // key is domain name
      (item) => {
        // createFn
        const domain = item[0];
        const seconds = item[1];
        const percentage = maxTime > 0 ? (seconds / maxTime) * 100 : 0;

        const siteItem = document.createElement('div');
        siteItem.className = 'site-item';
        siteItem.dataset.domain = domain;
        siteItem.style.opacity = '0';
        siteItem.style.transition = 'opacity 0.4s ease-in-out';

        const siteInfo = document.createElement('div');
        siteInfo.className = 'site-info';

        const siteMeta = document.createElement('div');
        siteMeta.className = 'site-meta';

        // Fallback icon
        const fallbackIcon = document.createElement('div');
        fallbackIcon.className = 'favicon-fallback';
        fallbackIcon.style.backgroundColor = getDomainColor(domain);
        fallbackIcon.innerText = domain.charAt(0);

        // Favicon Image
        const faviconImg = document.createElement('img');
        faviconImg.className = 'favicon';
        faviconImg.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        faviconImg.onerror = () => {
          faviconImg.classList.add('hidden');
          fallbackIcon.classList.remove('hidden');
        };
        fallbackIcon.classList.add('hidden');

        const domainNameSpan = document.createElement('span');
        domainNameSpan.className = 'domain-name';
        domainNameSpan.innerText = getDisplayName(domain);
        domainNameSpan.title = domain;

        siteMeta.appendChild(faviconImg);
        siteMeta.appendChild(fallbackIcon);
        siteMeta.appendChild(domainNameSpan);

        const timeSpentSpan = document.createElement('span');
        timeSpentSpan.className = 'time-spent';
        timeSpentSpan.innerText = formatDuration(seconds);

        siteInfo.appendChild(siteMeta);
        siteInfo.appendChild(timeSpentSpan);

        const barTrack = document.createElement('div');
        barTrack.className = 'bar-track';

        const barFill = document.createElement('div');
        barFill.className = 'bar-fill';
        barFill.style.width = '0%'; // animated after appending
        
        barTrack.appendChild(barFill);

        siteItem.appendChild(siteInfo);
        siteItem.appendChild(barTrack);

        requestAnimationFrame(() => {
          siteItem.style.opacity = '1';
          barFill.style.width = `${percentage}%`;
        });

        return siteItem;
      },
      (element, item) => {
        // updateFn
        const domain = item[0];
        const seconds = item[1];
        const percentage = maxTime > 0 ? (seconds / maxTime) * 100 : 0;

        const timeEl = element.querySelector('.time-spent');
        if (timeEl) timeEl.innerText = formatDuration(seconds);

        const barFill = element.querySelector('.bar-fill');
        if (barFill) {
          barFill.style.width = `${percentage}%`;
        }
      }
    );

    emptyStateEl.className = 'state-message hidden';
    statsAreaEl.classList.remove('hidden');
  });
}

// Hook up dashboard button
document.getElementById('open-dashboard-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

// Load stats on open
document.addEventListener('DOMContentLoaded', loadPopupStats);

// Sync popup state dynamically on storage modifications (e.g. background SW flushes)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    const todayStr = getLocalDateString();
    chrome.storage.local.get([todayStr, 'settings']).then(data => {
      basePopupData = {
        todayData: data[todayStr] || { activeTotals: {}, totals: {} },
        settings: data.settings || { isPaused: false, excludedDomains: [] }
      };
      renderPopupUI();
    });
  }
});

// Prevent memory leaks
window.addEventListener('unload', () => {
  if (liveUpdateInterval) clearInterval(liveUpdateInterval);
});
