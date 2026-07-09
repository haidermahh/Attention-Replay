// Attention Replay - Dashboard JavaScript

// Palette for top sites
const PALETTE = ['#a855f7', '#3b82f6', '#ec4899', '#10b981', '#f59e0b'];
const OTHER_COLOR = '#64748b';

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


// View states
let currentView = 'today'; // 'today', 'week', 'month', 'year'
let trackingMode = 'active'; // 'active' (Active Focus Only) or 'open' (All Open Tabs)
let activeData = null; // Holds the processed data for the active view

// Storage caches
let allHistoryData = {}; 
let settings = { excludedDomains: [], isPaused: false };
let customProductivity = {}; // custom overrides for Focus Score calculation
let liveUpdateInterval = null;

// Hitboxes for canvas interactivity
let donutSlices = [];
let weekBarSegments = [];
let yearBarSegments = [];

// Mouse position cache to maintain tooltips during live ticking
let lastMouseX = null;
let lastMouseY = null;
let lastWeekMouseX = null;
let lastWeekMouseY = null;
let lastYearMouseX = null;
let lastYearMouseY = null;

// Slideshow Controller State
let slideshowActive = false;
let slideshowTimer = null;
let currentSlideIndex = 0;
const SLIDE_DURATION = 5000;
let slideStartTime = 0;
let slideElapsedPaused = 0;
let slideshowIsPaused = false;

// UI interaction state
let topSitesExpanded = false;    // whether "Show All" is expanded in the top sites list
let selectedFilterDomain = null; // domain cross-filter for heatmap & donut

// DOM Elements
const toggleTodayBtn = document.getElementById('toggle-today');
const toggleWeekBtn = document.getElementById('toggle-week');
const toggleMonthBtn = document.getElementById('toggle-month');
const toggleYearBtn = document.getElementById('toggle-year');
const toggleActiveBtn = document.getElementById('toggle-active');
const toggleOpenBtn = document.getElementById('toggle-open');
const settingsBtn = document.getElementById('settings-btn');
const exportBtn = document.getElementById('export-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const exportModal = document.getElementById('export-modal');
const exportInstagramBtn = document.getElementById('export-instagram-btn');
const exportTwitterBtn = document.getElementById('export-twitter-btn');
const exportCloseBtn = document.getElementById('export-close-btn');

const wrappedDateEl = document.getElementById('wrapped-date');
const wrappedTotalTimeEl = document.getElementById('wrapped-total-time');
const wrappedSitesListEl = document.getElementById('wrapped-sites-list');

const donutCanvas = document.getElementById('donut-canvas');
const donutCtx = donutCanvas.getContext('2d');
const donutCenterTitleEl = document.getElementById('donut-center-title');
const donutCenterValueEl = document.getElementById('donut-center-value');
const donutLegendEl = document.getElementById('donut-legend');

const productivityProgressRing = document.getElementById('prod-progress-ring');
const productivityCenterScore = document.getElementById('prod-center-score');
const productivityCenterLabel = document.getElementById('prod-center-label');
const productivityBreakdownEl = document.getElementById('prod-breakdown');



const trendTitleEl = document.getElementById('trend-card-title');
const trendSubtitleEl = document.getElementById('trend-card-subtitle');
const todayHeatmapView = document.getElementById('today-heatmap-view');
const weekChartView = document.getElementById('week-chart-view');
const monthCalendarView = document.getElementById('month-calendar-view');
const yearChartView = document.getElementById('year-chart-view');
const heatmapGrid = document.getElementById('heatmap-grid');
const heatmapLegendItems = document.getElementById('heatmap-legend-items');
const calendarGrid = document.getElementById('calendar-grid');

const weekCanvas = document.getElementById('week-canvas');
const weekCtx = weekCanvas.getContext('2d');
const yearCanvas = document.getElementById('year-canvas');
const yearCtx = yearCanvas.getContext('2d');
const tooltipEl = document.getElementById('tooltip');

// --- Helper Functions ---

// Get local date string YYYY-MM-DD
function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays > 0) {
    d.setDate(d.getDate() - offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Long formatted date
function getFormattedLongDate(d = new Date()) {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getFormattedDateLabel(dateStr) {
  const parts = dateStr.split('-');
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDayOfWeekLabel(dateStr) {
  const parts = dateStr.split('-');
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function getDatesForCurrentMonth() {
  const dates = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month + 1).padStart(2, '0');
    dates.push(`${year}-${monthStr}-${dayStr}`);
  }
  return dates;
}

// Deterministic HSL fallback colors
function getDomainColor(domain, index) {
  if (index !== undefined && index < PALETTE.length) {
    return PALETTE[index];
  }
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 65%, 60%)`;
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const s = seconds % 60;
    return s > 0 ? `${minutes}m ${s}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${hours}h ${m}m` : `${hours}h`;
}

function formatHourRange(hourStr) {
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return 'None';
  const startHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const startAmPm = hour >= 12 ? 'PM' : 'AM';
  const endHour = (hour + 1) === 24 ? 12 : (hour + 1) > 12 ? (hour + 1) - 12 : (hour + 1);
  const endAmPm = (hour + 1) >= 12 && (hour + 1) < 24 ? 'PM' : 'AM';
  return `${startHour} ${startAmPm} - ${endHour} ${endAmPm}`;
}

function isExcluded(domain, excludedList) {
  if (!domain) return true;
  return excludedList.some(excluded => {
    const clean = excluded.trim().toLowerCase();
    if (!clean) return false;
    return domain === clean || domain.endsWith('.' + clean);
  });
}

// Reusable toast helper
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
  
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
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

function showSkeleton() {
  const toHide = ['wrapped-card', 'donut-content', 'productivity-content', 'trend-content-area'];
  const toShow = ['summary-skeleton', 'donut-skeleton', 'productivity-skeleton', 'trend-skeleton'];

  toHide.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  toShow.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  });
}

function hideSkeleton() {
  const toHide = ['summary-skeleton', 'donut-skeleton', 'productivity-skeleton', 'trend-skeleton'];
  const toShow = ['wrapped-card', 'donut-content', 'productivity-content', 'trend-content-area'];

  toHide.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  toShow.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  });
}

// --- Data Fetching and Pipeline Aggregations ---

async function fetchAllHistoryFromStorage() {
  const data = await chrome.storage.local.get(null);
  allHistoryData = {};
  settings = data.settings || { excludedDomains: [], isPaused: false };
  customProductivity = data.customProductivity || {};
  
  for (const [key, val] of Object.entries(data)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      allHistoryData[key] = val;
    }
  }
}

// Injects current in-memory ticking time into a clone of local data
function injectLiveTicks(localHistory, liveState) {
  if (!liveState || liveState.isPaused) return;

  const todayStr = getLocalDateString();
  if (!localHistory[todayStr]) {
    localHistory[todayStr] = {
      totals: {},
      activeTotals: {},
      hourly: {},
      activeHourly: {},
      longestSession: { domain: '', duration: 0 }
    };
  }

  const dayData = localHistory[todayStr];
  const currentHour = new Date().getHours().toString();

  // 1. Inject active focus delta tick
  if (liveState.activeDomain) {
    const dom = liveState.activeDomain;
    const elapsed = liveState.activeElapsed;
    if (elapsed > 0 && !isExcluded(dom, settings.excludedDomains)) {
      if (!dayData.activeTotals) dayData.activeTotals = {};
      dayData.activeTotals[dom] = (dayData.activeTotals[dom] || 0) + elapsed;

      if (!dayData.activeHourly) dayData.activeHourly = {};
      if (!dayData.activeHourly[currentHour]) dayData.activeHourly[currentHour] = {};
      dayData.activeHourly[currentHour][dom] = (dayData.activeHourly[currentHour][dom] || 0) + elapsed;

      if (elapsed > (dayData.longestSession?.duration || 0)) {
        dayData.longestSession = { domain: dom, duration: elapsed };
      }
    }
  }

  // 2. Inject open tabs delta ticks
  if (liveState.openDomains && liveState.openElapsed > 0) {
    const elapsed = liveState.openElapsed;
    if (!dayData.totals) dayData.totals = {};
    if (!dayData.hourly) dayData.hourly = {};
    if (!dayData.hourly[currentHour]) dayData.hourly[currentHour] = {};

    for (const [dom, count] of Object.entries(liveState.openDomains)) {
      const added = count * elapsed;
      dayData.totals[dom] = (dayData.totals[dom] || 0) + added;
      dayData.hourly[currentHour][dom] = (dayData.hourly[currentHour][dom] || 0) + added;
    }
  }
}

// Processes aggregated buckets for the current tab views
function aggregateData(localHistory) {
  const useActive = (trackingMode === 'active');
  const todayStr = getLocalDateString();

  if (currentView === 'today') {
    const dayData = localHistory[todayStr] || { totals: {}, activeTotals: {}, hourly: {}, activeHourly: {}, longestSession: { domain: '', duration: 0 } };
    const rawTotals = useActive ? (dayData.activeTotals || {}) : (dayData.totals || {});
    const rawHourly = useActive ? (dayData.activeHourly || {}) : (dayData.hourly || {});

    const totals = {};
    let totalSeconds = 0;
    for (const [dom, sec] of Object.entries(rawTotals)) {
      if (!isExcluded(dom, settings.excludedDomains)) {
        totals[dom] = sec;
        totalSeconds += sec;
      }
    }

    const hourly = {};
    for (const [hour, doms] of Object.entries(rawHourly)) {
      hourly[hour] = {};
      for (const [dom, sec] of Object.entries(doms)) {
        if (!isExcluded(dom, settings.excludedDomains)) {
          hourly[hour][dom] = sec;
        }
      }
    }

    let longestSession = { domain: '', duration: 0 };
    if (dayData.longestSession && !isExcluded(dayData.longestSession.domain, settings.excludedDomains)) {
      longestSession = dayData.longestSession;
    }

    activeData = {
      label: getFormattedDateLabel(todayStr),
      totals,
      hourly,
      totalSeconds,
      longestSession
    };

  } else if (currentView === 'week') {
    const dates = [];
    for (let i = 6; i >= 0; i--) dates.push(getLocalDateString(i));

    const weekTotals = {};
    const weekHourly = {};
    let weekTotalSeconds = 0;
    let weekLongestSession = { domain: '', duration: 0 };
    const dailyBreakdowns = {};

    dates.forEach(date => {
      const dayData = localHistory[date] || { totals: {}, activeTotals: {}, hourly: {}, activeHourly: {}, longestSession: { domain: '', duration: 0 } };
      dailyBreakdowns[date] = { totals: {}, totalSeconds: 0 };

      const rawTotals = useActive ? (dayData.activeTotals || {}) : (dayData.totals || {});
      const rawHourly = useActive ? (dayData.activeHourly || {}) : (dayData.hourly || {});

      for (const [dom, sec] of Object.entries(rawTotals)) {
        if (!isExcluded(dom, settings.excludedDomains)) {
          weekTotals[dom] = (weekTotals[dom] || 0) + sec;
          weekTotalSeconds += sec;
          dailyBreakdowns[date].totals[dom] = sec;
          dailyBreakdowns[date].totalSeconds += sec;
        }
      }

      for (const [hour, doms] of Object.entries(rawHourly)) {
        if (!weekHourly[hour]) weekHourly[hour] = {};
        for (const [dom, sec] of Object.entries(doms)) {
          if (!isExcluded(dom, settings.excludedDomains)) {
            weekHourly[hour][dom] = (weekHourly[hour][dom] || 0) + sec;
          }
        }
      }

      if (dayData.longestSession && dayData.longestSession.duration > weekLongestSession.duration) {
        if (!isExcluded(dayData.longestSession.domain, settings.excludedDomains)) {
          weekLongestSession = dayData.longestSession;
        }
      }
    });

    activeData = {
      label: `${getFormattedDateLabel(dates[0])} - ${getFormattedDateLabel(dates[6])}`,
      totals: weekTotals,
      hourly: weekHourly,
      totalSeconds: weekTotalSeconds,
      longestSession: weekLongestSession,
      dailyBreakdowns,
      dates
    };

  } else if (currentView === 'month') {
    const dates = getDatesForCurrentMonth();
    const monthTotals = {};
    const monthHourly = {};
    let monthTotalSeconds = 0;
    let monthLongestSession = { domain: '', duration: 0 };

    dates.forEach(date => {
      const dayData = localHistory[date] || { totals: {}, activeTotals: {}, hourly: {}, activeHourly: {}, longestSession: { domain: '', duration: 0 } };
      const rawTotals = useActive ? (dayData.activeTotals || {}) : (dayData.totals || {});
      const rawHourly = useActive ? (dayData.activeHourly || {}) : (dayData.hourly || {});

      for (const [dom, sec] of Object.entries(rawTotals)) {
        if (!isExcluded(dom, settings.excludedDomains)) {
          monthTotals[dom] = (monthTotals[dom] || 0) + sec;
          monthTotalSeconds += sec;
        }
      }

      for (const [hour, doms] of Object.entries(rawHourly)) {
        if (!monthHourly[hour]) monthHourly[hour] = {};
        for (const [dom, sec] of Object.entries(doms)) {
          if (!isExcluded(dom, settings.excludedDomains)) {
            monthHourly[hour][dom] = (monthHourly[hour][dom] || 0) + sec;
          }
        }
      }

      if (dayData.longestSession && dayData.longestSession.duration > monthLongestSession.duration) {
        if (!isExcluded(dayData.longestSession.domain, settings.excludedDomains)) {
          monthLongestSession = dayData.longestSession;
        }
      }
    });

    const now = new Date();
    activeData = {
      label: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      totals: monthTotals,
      hourly: monthHourly,
      totalSeconds: monthTotalSeconds,
      longestSession: monthLongestSession,
      dates
    };

  } else if (currentView === 'year') {
    const currentYear = new Date().getFullYear();
    const yearTotals = {};
    const yearHourly = {};
    let yearTotalSeconds = 0;
    let yearLongestSession = { domain: '', duration: 0 };

    for (const [dateStr, dayData] of Object.entries(localHistory)) {
      if (dateStr.startsWith(currentYear + '-')) {
        const rawTotals = useActive ? (dayData.activeTotals || {}) : (dayData.totals || {});
        const rawHourly = useActive ? (dayData.activeHourly || {}) : (dayData.hourly || {});

        for (const [dom, sec] of Object.entries(rawTotals)) {
          if (!isExcluded(dom, settings.excludedDomains)) {
            yearTotals[dom] = (yearTotals[dom] || 0) + sec;
            yearTotalSeconds += sec;
          }
        }

        for (const [hour, doms] of Object.entries(rawHourly)) {
          if (!yearHourly[hour]) yearHourly[hour] = {};
          for (const [dom, sec] of Object.entries(doms)) {
            if (!isExcluded(dom, settings.excludedDomains)) {
              yearHourly[hour][dom] = (yearHourly[hour][dom] || 0) + sec;
            }
          }
        }

        if (dayData.longestSession && dayData.longestSession.duration > yearLongestSession.duration) {
          if (!isExcluded(dayData.longestSession.domain, settings.excludedDomains)) {
            yearLongestSession = dayData.longestSession;
          }
        }
      }
    }

    activeData = {
      label: currentYear.toString(),
      totals: yearTotals,
      hourly: yearHourly,
      totalSeconds: yearTotalSeconds,
      longestSession: yearLongestSession
    };
  }
}

// --- DOM Rendering UI Updates ---

function updateUI() {
  const useActive = (trackingMode === 'active');

  // Set card and metric labels dynamically
  document.querySelector('.summary-card-container h2').innerText = useActive ? 'Focus Wrapped' : 'Open Tabs Wrapped';
  document.querySelector('.wrapped-stat-main .stat-label').innerText = useActive ? 'TOTAL ACTIVE FOCUS TIME' : 'TOTAL OPEN TAB TIME';
  document.querySelector('.wrapped-top-sites .stat-label').innerText = useActive ? 'YOUR TOP ACTIVE PLACES' : 'YOUR TOP OPEN PLACES';

  // Set date ranges label header
  const dateRangeEl = document.getElementById('dashboard-date-range');
  if (dateRangeEl) {
    if (currentView === 'today') {
      dateRangeEl.innerText = getFormattedLongDate();
    } else if (currentView === 'week') {
      dateRangeEl.innerText = activeData.label;
    } else if (currentView === 'month') {
      dateRangeEl.innerText = activeData.label;
    } else if (currentView === 'year') {
      dateRangeEl.innerText = activeData.label;
    }
  }

  // Update date header inside the Wrapped card
  wrappedDateEl.innerText = activeData.label;

  // 1. Total time
  wrappedTotalTimeEl.innerText = formatDuration(activeData.totalSeconds);

  // Sort domains
  const sortedDomains = Object.entries(activeData.totals).sort((a, b) => b[1] - a[1]);
  
  // 2. Top sites list — strictly show top 3 to fit card dimensions perfectly
  const displayedDomains = sortedDomains.slice(0, 3);
  const yesterdayStr = getLocalDateString(1);
  const yesterdayRaw = allHistoryData[yesterdayStr] || {};
  const yesterdayTotals = ((trackingMode === 'active') ? yesterdayRaw.activeTotals : yesterdayRaw.totals) || {};

  if (displayedDomains.length === 0) {
    wrappedSitesListEl.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center; margin-top: 10px;">No browsing history found.</div>';
  } else {
    if (wrappedSitesListEl.children.length === 1 && !wrappedSitesListEl.children[0].dataset.key) {
      wrappedSitesListEl.innerHTML = '';
    }

    updateListInPlace(
      wrappedSitesListEl,
      displayedDomains,
      item => item[0],
      (item) => {
        const domain = item[0];
        const seconds = item[1];
        const globalIdx = sortedDomains.findIndex(([d]) => d === domain);
        const percentage = activeData.totalSeconds > 0 ? Math.round((seconds / activeData.totalSeconds) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'wrapped-site-row';
        row.style.opacity = '0';
        row.style.transition = 'opacity 0.4s ease-in-out';
        row.dataset.key = domain;

        const rank = document.createElement('span');
        rank.className = 'wrapped-rank';
        rank.innerText = globalIdx + 1;

        const fallback = document.createElement('div');
        fallback.className = 'wrapped-icon-fallback';
        fallback.style.backgroundColor = getDomainColor(domain, globalIdx);
        fallback.innerText = domain.charAt(0);

        const icon = document.createElement('img');
        icon.className = 'wrapped-icon';
        icon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        icon.onerror = () => { icon.classList.add('hidden'); fallback.classList.remove('hidden'); };
        fallback.classList.add('hidden');

        const meta = document.createElement('div');
        meta.className = 'wrapped-site-meta';

        const name = document.createElement('span');
        name.className = 'wrapped-site-name';
        name.innerText = getDisplayName(domain);
        name.title = domain;

        const timeStr = document.createElement('span');
        timeStr.className = 'wrapped-site-time';
        timeStr.innerText = `${formatDuration(seconds)} • ${percentage}%`;

        meta.appendChild(name);
        meta.appendChild(timeStr);
        row.appendChild(rank);
        row.appendChild(icon);
        row.appendChild(fallback);
        row.appendChild(meta);

        // Trend vs yesterday
        const yestSec = yesterdayTotals[domain] || 0;
        if (yestSec > 0) {
          const diff = seconds - yestSec;
          const trendEl = document.createElement('span');
          trendEl.className = 'trend-indicator';
          if (diff > 60) {
            trendEl.classList.add('trend-up');
            trendEl.innerText = `▲ ${formatDuration(diff)}`;
            trendEl.title = `+${formatDuration(diff)} vs yesterday`;
          } else if (diff < -60) {
            trendEl.classList.add('trend-down');
            trendEl.innerText = `▼ ${formatDuration(Math.abs(diff))}`;
            trendEl.title = `-${formatDuration(Math.abs(diff))} vs yesterday`;
          } else {
            trendEl.classList.add('trend-same');
            trendEl.innerText = '≈';
            trendEl.title = 'About the same as yesterday';
          }
          row.appendChild(trendEl);
        }

        // Click to cross-filter heatmap and donut
        row.addEventListener('click', () => {
          const newFilter = (selectedFilterDomain === domain) ? null : domain;
          applyDomainFilter(newFilter);
        });

        requestAnimationFrame(() => { row.style.opacity = '1'; });
        return row;
      },
      (element, item) => {
        const domain = item[0];
        const seconds = item[1];
        const globalIdx = sortedDomains.findIndex(([d]) => d === domain);
        const percentage = activeData.totalSeconds > 0 ? Math.round((seconds / activeData.totalSeconds) * 100) : 0;

        const rankEl = element.querySelector('.wrapped-rank');
        if (rankEl) rankEl.innerText = globalIdx + 1;

        const timeStrEl = element.querySelector('.wrapped-site-time');
        if (timeStrEl) timeStrEl.innerText = `${formatDuration(seconds)} • ${percentage}%`;

        const fallbackEl = element.querySelector('.wrapped-icon-fallback');
        if (fallbackEl) fallbackEl.style.backgroundColor = getDomainColor(domain, globalIdx);

        // Update trend indicator
        const yestSec = yesterdayTotals[domain] || 0;
        let trendEl = element.querySelector('.trend-indicator');
        if (yestSec > 0) {
          if (!trendEl) {
            trendEl = document.createElement('span');
            trendEl.className = 'trend-indicator';
            element.appendChild(trendEl);
          }
          const diff = seconds - yestSec;
          trendEl.className = 'trend-indicator';
          if (diff > 60) {
            trendEl.classList.add('trend-up');
            trendEl.innerText = `▲ ${formatDuration(diff)}`;
          } else if (diff < -60) {
            trendEl.classList.add('trend-down');
            trendEl.innerText = `▼ ${formatDuration(Math.abs(diff))}`;
          } else {
            trendEl.classList.add('trend-same');
            trendEl.innerText = '≈';
          }
        } else if (trendEl) {
          trendEl.remove();
        }
      }
    );
  }

  // Remove any stale showMoreBtn if it exists
  let showMoreBtn = document.getElementById('top-sites-show-more');
  if (showMoreBtn) {
    showMoreBtn.remove();
  }



  // 5. Draw Donut Chart and Productivity Pulse
  renderDonutChart(sortedDomains);
  renderProductivityPulse(sortedDomains);

  // 6. Draw Trend Visuals
  if (currentView === 'today') {
    trendTitleEl.innerText = useActive ? 'Focus Activity Timeline' : 'Open Tabs Timeline';
    trendSubtitleEl.innerText = useActive 
      ? 'Hour-by-hour breakdown of active vs idle browsing time today.' 
      : 'Hour-by-hour cumulative time spent across all open tabs today.';
    
    todayHeatmapView.classList.remove('hidden');
    weekChartView.classList.add('hidden');
    monthCalendarView.classList.add('hidden');
    yearChartView.classList.add('hidden');
    
    renderTodayHeatmap(sortedDomains);
  } else if (currentView === 'week') {
    trendTitleEl.innerText = useActive ? 'Weekly Focus Trend' : 'Weekly Open Tabs Trend';
    trendSubtitleEl.innerText = useActive 
      ? 'Stacked bar chart showing your daily focus distribution over the last 7 days.'
      : 'Stacked bar chart showing daily cumulative open tab times over the last 7 days.';
    
    todayHeatmapView.classList.add('hidden');
    weekChartView.classList.remove('hidden');
    monthCalendarView.classList.add('hidden');
    yearChartView.classList.add('hidden');
    
    renderWeekStackedChart(sortedDomains);
  } else if (currentView === 'month') {
    trendTitleEl.innerText = useActive ? 'Monthly Focus Grid' : 'Monthly Open Tabs Grid';
    trendSubtitleEl.innerText = useActive 
      ? 'Calendar heatmap showing day-by-day active focus time this month.'
      : 'Calendar heatmap showing day-by-day cumulative open tab times this month.';
    
    todayHeatmapView.classList.add('hidden');
    weekChartView.classList.add('hidden');
    monthCalendarView.classList.remove('hidden');
    yearChartView.classList.add('hidden');
    
    renderMonthCalendar(sortedDomains);
  } else if (currentView === 'year') {
    trendTitleEl.innerText = useActive ? 'Yearly Focus Distribution' : 'Yearly Open Tabs Distribution';
    trendSubtitleEl.innerText = useActive 
      ? '12-month bar chart displaying your total active focus hours for the current calendar year.'
      : '12-month bar chart displaying cumulative open tab hours for the current calendar year.';
    
    todayHeatmapView.classList.add('hidden');
    weekChartView.classList.add('hidden');
    monthCalendarView.classList.add('hidden');
    yearChartView.classList.remove('hidden');
    
    renderYearChart(sortedDomains);
  }
}

// --- Donut Chart Rendering ---

function renderDonutChart(sortedDomains) {
  donutSlices = [];
  donutCtx.clearRect(0, 0, donutCanvas.width, donutCanvas.height);

  if (sortedDomains.length === 0) {
    donutCtx.beginPath();
    donutCtx.arc(120, 120, 90, 0, 2 * Math.PI);
    donutCtx.fillStyle = 'rgba(255,255,255,0.03)';
    donutCtx.fill();
    donutCtx.strokeStyle = 'rgba(255,255,255,0.05)';
    donutCtx.lineWidth = 2;
    donutCtx.stroke();
    donutCenterTitleEl.innerText = 'No Data';
    donutCenterValueEl.innerText = '0m';
    donutLegendEl.innerHTML = '';
    return;
  }

  // Show all websites individually in both the donut segments and legend
  const chartData = sortedDomains.map(([domain, seconds], idx) => {
    return { domain, seconds, color: getDomainColor(domain, idx) };
  });

  const cx = 120, cy = 120, radius = 90, innerRadius = 58;
  let startAngle = -Math.PI / 2;

  chartData.forEach(slice => {
    const angleRatio = slice.seconds / activeData.totalSeconds;
    const sliceAngle = angleRatio * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    donutCtx.beginPath();
    donutCtx.arc(cx, cy, radius, startAngle, endAngle);
    donutCtx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
    donutCtx.closePath();
    donutCtx.fillStyle = slice.color;
    donutCtx.fill();
    donutCtx.strokeStyle = '#0f0717';
    donutCtx.lineWidth = 2;
    donutCtx.stroke();

    donutSlices.push({
      domain: slice.domain,
      seconds: slice.seconds,
      percentage: Math.round(angleRatio * 100),
      color: slice.color,
      startAngle,
      endAngle,
      radius,
      innerRadius
    });

    startAngle = endAngle;
  });

  donutCenterTitleEl.innerText = 'Total Time';
  donutCenterValueEl.innerText = formatDuration(activeData.totalSeconds);

  // Remove stale Others expand-detail rows
  Array.from(donutLegendEl.querySelectorAll('.legend-row-others-detail')).forEach(el => el.remove());

  if (chartData.length === 0) {
    donutLegendEl.innerHTML = '';
  } else {
    updateListInPlace(
      donutLegendEl,
      chartData,
      item => item.domain,
      (slice) => {
        const pct = Math.round((slice.seconds / activeData.totalSeconds) * 100);

        const row = document.createElement('div');
        row.className = 'legend-row';
        row.style.opacity = '0';
        row.style.transition = 'opacity 0.4s ease-in-out';

        const key = document.createElement('div');
        key.className = 'legend-key';

        const dot = document.createElement('div');
        dot.className = 'legend-dot';
        dot.style.backgroundColor = slice.color;

        const fallback = document.createElement('div');
        fallback.className = 'legend-icon-fallback';
        fallback.style.backgroundColor = slice.color;
        fallback.innerText = slice.domain.charAt(0).toUpperCase();

        const icon = document.createElement('img');
        icon.className = 'legend-icon';
        icon.src = `https://www.google.com/s2/favicons?domain=${slice.domain}&sz=32`;
        icon.onerror = () => { icon.classList.add('hidden'); fallback.classList.remove('hidden'); };
        fallback.classList.add('hidden');

        const name = document.createElement('span');
        name.className = 'legend-name';
        name.title = slice.domain;
        name.innerText = getDisplayName(slice.domain);

        key.appendChild(dot);
        key.appendChild(icon);
        key.appendChild(fallback);
        key.appendChild(name);

        const val = document.createElement('span');
        val.className = 'legend-val';
        val.innerText = `${formatDuration(slice.seconds)} (${pct}%)`;

        row.appendChild(key);
        row.appendChild(val);

        // Bidirectional hover: highlight this row, dim others
        row.addEventListener('mouseenter', () => highlightLegendRow(slice.domain));
        row.addEventListener('mouseleave', () => {
          if (!selectedFilterDomain) clearLegendHighlight();
        });

        // Click to cross-filter heatmap
        row.addEventListener('click', () => {
          applyDomainFilter(selectedFilterDomain === slice.domain ? null : slice.domain);
        });

        requestAnimationFrame(() => { row.style.opacity = '1'; });
        return row;
      },
      (element, slice) => {
        const pct = Math.round((slice.seconds / activeData.totalSeconds) * 100);
        const valEl = element.querySelector('.legend-val');
        if (valEl) valEl.innerText = `${formatDuration(slice.seconds)} (${pct}%)`;
        const dotEl = element.querySelector('.legend-dot');
        if (dotEl) dotEl.style.backgroundColor = slice.color;
        const fallbackEl = element.querySelector('.legend-icon-fallback');
        if (fallbackEl) fallbackEl.style.backgroundColor = slice.color;
      }
    );
  }
}

// --- Legend / Donut Cross-Highlight Helpers ---


// Highlight the legend row matching `domain` and dim all others
function highlightLegendRow(domain) {
  for (const row of donutLegendEl.children) {
    if (!row.classList.contains('legend-row')) continue;
    const nameEl = row.querySelector('.legend-name');
    const rowDomain = nameEl ? nameEl.title : '';
    const isMatch = rowDomain === domain;
    row.classList.toggle('legend-row--active', isMatch);
    row.classList.toggle('legend-row--dimmed', !isMatch);
  }
}

// Remove all highlight/dim classes from the legend
function clearLegendHighlight() {
  for (const row of donutLegendEl.children) {
    row.classList.remove('legend-row--active', 'legend-row--dimmed');
  }
}

// Cross-filter: dim heatmap blocks not matching `domain`, highlight matching ones.
// Pass null to clear the filter.
function applyDomainFilter(domain) {
  selectedFilterDomain = domain;
  const blocks = heatmapGrid.children;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    block.classList.remove('domain-dimmed', 'domain-highlighted');
    if (domain) {
      const blockDomain = block.dataset.dominantDomain;
      if (blockDomain === domain) {
        block.classList.add('domain-highlighted');
      } else if (parseInt(block.dataset.activeTime, 10) > 0) {
        block.classList.add('domain-dimmed');
      }
    }
  }
  // Sync legend rows with filter state
  if (domain) highlightLegendRow(domain);
  else clearLegendHighlight();
  // Sync wrapped-sites rows
  for (const row of wrappedSitesListEl.children) {
    if (!row.dataset.key) continue;
    row.classList.toggle('legend-row--active', row.dataset.key === domain);
  }
}

// Re-evaluates hover on donut coordinates (used during live ticking intervals)
function checkDonutHover(x, y) {
  const dist = Math.sqrt(x * x + y * y);
  let hoveredSlice = null;

  if (dist >= 58 && dist <= 90) {
    let angle = Math.atan2(y, x);
    if (angle < -Math.PI / 2) angle += 2 * Math.PI;

    donutSlices.some(slice => {
      let normalizedAngle = angle;
      if (normalizedAngle < slice.startAngle) normalizedAngle += 2 * Math.PI;
      if (normalizedAngle >= slice.startAngle && normalizedAngle < slice.endAngle) {
        hoveredSlice = slice;
        return true;
      }
      return false;
    });
  }

  if (hoveredSlice) {
    donutCenterTitleEl.innerText = hoveredSlice.domain;
    donutCenterTitleEl.style.color = hoveredSlice.color;
    donutCenterValueEl.innerText = `${formatDuration(hoveredSlice.seconds)} (${hoveredSlice.percentage}%)`;
    donutCanvas.style.cursor = 'pointer';
    if (!selectedFilterDomain) highlightLegendRow(hoveredSlice.domain);
  } else {
    donutCenterTitleEl.innerText = 'Total Time';
    donutCenterTitleEl.style.color = 'var(--text-muted)';
    donutCenterValueEl.innerText = formatDuration(activeData ? activeData.totalSeconds : 0);
    donutCanvas.style.cursor = 'default';
    if (!selectedFilterDomain) clearLegendHighlight();
  }
}

donutCanvas.addEventListener('mousemove', (e) => {
  const rect = donutCanvas.getBoundingClientRect();
  lastMouseX = e.clientX - rect.left - 120;
  lastMouseY = e.clientY - rect.top - 120;
  checkDonutHover(lastMouseX, lastMouseY);
});

donutCanvas.addEventListener('mouseleave', () => {
  lastMouseX = null;
  lastMouseY = null;
  donutCenterTitleEl.innerText = 'Total Time';
  donutCenterTitleEl.style.color = 'var(--text-muted)';
  donutCenterValueEl.innerText = formatDuration(activeData ? activeData.totalSeconds : 0);
  if (!selectedFilterDomain) clearLegendHighlight();
});


// --- Productivity Pulse Gauge & Breakdown ---

function renderProductivityPulse(sortedDomains) {
  if (!productivityProgressRing) return;

  const score = calculateProductivityScore(sortedDomains, customProductivity);
  productivityCenterScore.innerText = `${score}%`;

  let label = 'Elite Focus';
  let color = '#10b981';
  if (score < 50) {
    label = 'Highly Distracted';
    color = '#ef4444';
  } else if (score < 65) {
    label = 'Moderate Focus';
    color = '#f59e0b';
  } else if (score < 80) {
    label = 'Good Focus';
    color = '#fbbf24';
  }
  
  productivityCenterLabel.innerText = label;
  productivityCenterLabel.style.color = color;
  
  const RING_CIRCUMFERENCE = 597; // 2π × 95
  const offset = RING_CIRCUMFERENCE - (score / 100) * RING_CIRCUMFERENCE;
  productivityProgressRing.style.strokeDashoffset = offset;
  productivityProgressRing.style.stroke = color;

  let productiveSecs = 0;
  let distractingSecs = 0;
  let neutralSecs = 0;
  let totalSecs = 0;

  sortedDomains.forEach(([domain, seconds]) => {
    const type = getDomainProductivity(domain, customProductivity);
    totalSecs += seconds;
    if (type === 'productive') productiveSecs += seconds;
    else if (type === 'distracting') distractingSecs += seconds;
    else neutralSecs += seconds;
  });

  const breakdownData = [
    { type: 'Productive', seconds: productiveSecs, color: '#10b981' },
    { type: 'Neutral', seconds: neutralSecs, color: '#6b7280' },
    { type: 'Distracting', seconds: distractingSecs, color: '#ef4444' }
  ];

  updateListInPlace(
    productivityBreakdownEl,
    breakdownData,
    item => item.type,
    (item) => {
      const pct = totalSecs > 0 ? Math.round((item.seconds / totalSecs) * 100) : 0;

      const row = document.createElement('div');
      row.className = 'legend-row';
      row.style.opacity = '0';
      row.style.transition = 'opacity 0.4s ease-in-out';

      const key = document.createElement('div');
      key.className = 'legend-key';

      const dot = document.createElement('div');
      dot.className = 'legend-dot';
      dot.style.backgroundColor = item.color;

      const name = document.createElement('span');
      name.className = 'legend-name';
      name.innerText = item.type;

      key.appendChild(dot);
      key.appendChild(name);

      const val = document.createElement('span');
      val.className = 'legend-val';
      val.innerText = `${formatDuration(item.seconds)} (${pct}%)`;

      row.appendChild(key);
      row.appendChild(val);

      requestAnimationFrame(() => { row.style.opacity = '1'; });
      return row;
    },
    (element, item) => {
      const pct = totalSecs > 0 ? Math.round((item.seconds / totalSecs) * 100) : 0;
      const valEl = element.querySelector('.legend-val');
      if (valEl) valEl.innerText = `${formatDuration(item.seconds)} (${pct}%)`;
      const dotEl = element.querySelector('.legend-dot');
      if (dotEl) dotEl.style.backgroundColor = item.color;
    }
  );
}

// --- Weekly Wrapped Story Slideshow Controller ---

function prepareSlideshowData() {
  const sortedDomains = Object.entries(activeData.totals).sort((a, b) => b[1] - a[1]);
  const totalSeconds = activeData.totalSeconds;
  
  const welcomeTitle = document.getElementById('slide-welcome-title');
  welcomeTitle.innerText = `Revisit your browsing journey for ${activeData.label}.`;

  const slideTimeVal = document.getElementById('slide-time-value');
  slideTimeVal.innerText = formatDuration(totalSeconds);

  const slideTopIcon = document.getElementById('slide-top-icon-container');
  const slideTopName = document.getElementById('slide-top-domain-name');
  const slideTopTime = document.getElementById('slide-top-domain-time');

  if (sortedDomains.length > 0) {
    const topDomain = sortedDomains[0][0];
    const topSeconds = sortedDomains[0][1];
    
    slideTopIcon.innerHTML = '';
    const img = document.createElement('img');
    img.src = `https://www.google.com/s2/favicons?domain=${topDomain}&sz=64`;
    img.style.cssText = 'width: 48px; height: 48px; object-fit: contain; border-radius: 8px;';
    img.onerror = () => {
      slideTopIcon.innerText = topDomain.charAt(0).toUpperCase();
    };
    slideTopIcon.appendChild(img);
    
    slideTopName.innerText = getDisplayName(topDomain);
    slideTopName.title = topDomain;
    const pct = totalSeconds > 0 ? Math.round((topSeconds / totalSeconds) * 100) : 0;
    slideTopTime.innerText = `${formatDuration(topSeconds)} tracked (${pct}%)`;
  } else {
    slideTopIcon.innerText = '❓';
    slideTopName.innerText = 'No Sites Tracked';
    slideTopTime.innerText = '0m tracked';
  }

  const prodScore = calculateProductivityScore(sortedDomains, customProductivity);
  document.getElementById('slide-productivity-value').innerText = `${prodScore}%`;

  let prodLabel = 'Elite Focus';
  let prodDesc = 'You stayed extremely focused on your goals!';
  if (prodScore < 50) {
    prodLabel = 'Highly Distracted';
    prodDesc = 'You spent a lot of time on social media or entertainment today.';
  } else if (prodScore < 65) {
    prodLabel = 'Moderate Focus';
    prodDesc = 'Balanced work and play, but could improve focus goals.';
  } else if (prodScore < 80) {
    prodLabel = 'Good Focus';
    prodDesc = 'Nicely done! You spent key time on productive work.';
  }
  document.getElementById('slide-productivity-label').innerText = prodLabel;
  document.getElementById('slide-productivity-desc').innerText = prodDesc;

  let peakHour = 0;
  let peakSeconds = 0;
  
  if (activeData.hourly) {
    for (const [hour, doms] of Object.entries(activeData.hourly)) {
      const hourlySum = Object.values(doms).reduce((a, b) => a + b, 0);
      if (hourlySum > peakSeconds) {
        peakSeconds = hourlySum;
        peakHour = parseInt(hour, 10);
      }
    }
  }

  const formattedPeak = formatHourRange(peakHour);
  document.getElementById('slide-peak-time').innerText = formattedPeak;
  if (peakSeconds > 0) {
    document.getElementById('slide-peak-desc').innerText = `You tracked ${formatDuration(peakSeconds)} in this hour alone. You were hitting your absolute stride!`;
  } else {
    document.getElementById('slide-peak-desc').innerText = 'No activity recorded yet to determine peak hours.';
  }

  document.getElementById('summary-total-time').innerText = formatDuration(totalSeconds);
  document.getElementById('summary-top-site').innerText = sortedDomains.length > 0 ? getDisplayName(sortedDomains[0][0]) : 'None';
  document.getElementById('summary-prod-score').innerText = `${prodScore}%`;
  document.getElementById('summary-peak-hour').innerText = peakSeconds > 0 ? formatHourRangeShort(peakHour) : 'None';
}

function formatHourRangeShort(hour) {
  const startHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const startAmPm = hour >= 12 ? 'PM' : 'AM';
  return `${startHour} ${startAmPm}`;
}

function startSlideshow() {
  prepareSlideshowData();
  slideshowActive = true;
  slideshowIsPaused = false;
  currentSlideIndex = 0;
  slideStartTime = Date.now();
  slideElapsedPaused = 0;
  
  const slides = document.querySelectorAll('.story-slide');
  slides.forEach((slide, idx) => {
    if (idx === 0) {
      slide.classList.remove('hidden');
      slide.classList.add('story-slide--active');
    } else {
      slide.classList.add('hidden');
      slide.classList.remove('story-slide--active');
    }
  });

  const progressContainer = document.getElementById('story-progress-container');
  progressContainer.innerHTML = '';
  const totalSlides = slides.length;
  for (let i = 0; i < totalSlides; i++) {
    const bar = document.createElement('div');
    bar.className = 'story-progress-bar';
    const fill = document.createElement('div');
    fill.className = 'story-progress-fill';
    bar.appendChild(fill);
    progressContainer.appendChild(bar);
  }

  document.getElementById('wrapped-slideshow-modal').classList.remove('hidden');
  document.getElementById('slideshow-pause-btn').innerText = '⏸️';
  
  tickSlideshow();
}

function tickSlideshow() {
  if (!slideshowActive) return;
  
  if (slideshowTimer) cancelAnimationFrame(slideshowTimer);

  const slides = document.querySelectorAll('.story-slide');
  const fills = document.querySelectorAll('.story-progress-fill');

  const now = Date.now();
  let elapsed = now - slideStartTime + slideElapsedPaused;

  if (slideshowIsPaused) {
    elapsed = slideElapsedPaused;
  }

  if (fills[currentSlideIndex]) {
    const pct = Math.min(100, (elapsed / SLIDE_DURATION) * 100);
    fills[currentSlideIndex].style.width = `${pct}%`;
  }

  for (let i = 0; i < currentSlideIndex; i++) {
    if (fills[i]) fills[i].style.width = '100%';
  }
  for (let i = currentSlideIndex + 1; i < fills.length; i++) {
    if (fills[i]) fills[i].style.width = '0%';
  }

  if (elapsed >= SLIDE_DURATION) {
    nextSlide();
    return;
  }

  slideshowTimer = requestAnimationFrame(tickSlideshow);
}

function nextSlide() {
  const slides = document.querySelectorAll('.story-slide');
  if (currentSlideIndex < slides.length - 1) {
    currentSlideIndex++;
    slideStartTime = Date.now();
    slideElapsedPaused = 0;
    
    slides.forEach((slide, idx) => {
      if (idx === currentSlideIndex) {
        slide.classList.remove('hidden');
        slide.offsetHeight;
        slide.classList.add('story-slide--active');
      } else {
        slide.classList.add('hidden');
        slide.classList.remove('story-slide--active');
      }
    });

    tickSlideshow();
  } else {
    stopSlideshow();
  }
}

function prevSlide() {
  if (currentSlideIndex > 0) {
    const slides = document.querySelectorAll('.story-slide');
    currentSlideIndex--;
    slideStartTime = Date.now();
    slideElapsedPaused = 0;

    slides.forEach((slide, idx) => {
      if (idx === currentSlideIndex) {
        slide.classList.remove('hidden');
        slide.offsetHeight;
        slide.classList.add('story-slide--active');
      } else {
        slide.classList.add('hidden');
        slide.classList.remove('story-slide--active');
      }
    });

    tickSlideshow();
  }
}

function pauseSlideshow() {
  if (!slideshowActive) return;
  if (!slideshowIsPaused) {
    slideshowIsPaused = true;
    slideElapsedPaused += Date.now() - slideStartTime;
    document.getElementById('slideshow-pause-btn').innerText = '▶️';
  } else {
    slideshowIsPaused = false;
    slideStartTime = Date.now();
    document.getElementById('slideshow-pause-btn').innerText = '⏸️';
    tickSlideshow();
  }
}

function stopSlideshow() {
  slideshowActive = false;
  if (slideshowTimer) cancelAnimationFrame(slideshowTimer);
  document.getElementById('wrapped-slideshow-modal').classList.add('hidden');
}

// --- Hour-by-Hour Heatmap Rendering (Today) ---

function renderTodayHeatmap(sortedDomains) {
  const useActive = (trackingMode === 'active');
  const currentHour = new Date().getHours();

  const topDomainColors = {};
  sortedDomains.slice(0, 5).forEach(([dom], idx) => {
    topDomainColors[dom] = getDomainColor(dom, idx);
  });

  const blocks = heatmapGrid.children;
  const needsRebuild = (blocks.length !== 24);

  if (needsRebuild) {
    heatmapGrid.innerHTML = '';
  }

  for (let i = 0; i < 24; i++) {
    const hourStr = i.toString();
    const hourData = activeData.hourly[hourStr] || {};
    const activeTime = Object.values(hourData).reduce((sum, val) => sum + val, 0);

    let dominantDomain = '';
    let maxSeconds = 0;
    for (const [dom, sec] of Object.entries(hourData)) {
      if (sec > maxSeconds) { maxSeconds = sec; dominantDomain = dom; }
    }

    let block;
    if (needsRebuild) {
      block = document.createElement('div');
      block.className = 'heatmap-hour-block';
      block.style.animationDelay = `${i * 15}ms`;

      block.addEventListener('mousemove', (e) => {
        const time = parseInt(block.dataset.activeTime, 10) || 0;
        const modeLabel = useActive ? 'Active Focus' : 'Open Time';

        // Full domain breakdown for this hour
        const hourBreakdown = activeData.hourly[hourStr] || {};
        const sortedHourDoms = Object.entries(hourBreakdown).sort((a, b) => b[1] - a[1]);
        let breakdownHtml = '';
        if (sortedHourDoms.length > 0) {
          breakdownHtml = '<br>' + sortedHourDoms.slice(0, 5).map(([dom, sec]) => {
            const col = topDomainColors[dom] || getDomainColor(dom, 5);
            return `<span style="color:${col}">●</span> <strong>${dom}</strong>: ${formatDuration(sec)}`;
          }).join('<br>');
          if (sortedHourDoms.length > 5) {
            breakdownHtml += `<br><span style="color:#94a3b8">+ ${sortedHourDoms.length - 5} more</span>`;
          }
        }

        tooltipEl.innerHTML = `<strong>${formatHourRange(hourStr)}</strong><br>${modeLabel}: ${formatDuration(time)}${breakdownHtml}`;
        tooltipEl.style.left = `${e.pageX}px`;
        tooltipEl.style.top = `${e.pageY - 12}px`;
        tooltipEl.classList.add('show');
      });

      block.addEventListener('mouseleave', () => {
        tooltipEl.classList.remove('show');
      });

      heatmapGrid.appendChild(block);
    } else {
      block = blocks[i];
    }

    // Dataset props for tooltips and filters
    const color = topDomainColors[dominantDomain] || getDomainColor(dominantDomain, 5);
    block.dataset.dominantDomain = dominantDomain;
    block.dataset.activeTime = activeTime;
    block.dataset.maxSeconds = maxSeconds;
    block.dataset.dominantColor = color;

    // Update block background styles
    block.classList.remove('past-idle');
    if (activeTime > 0) {
      const capLimit = useActive ? 1800 : 7200;
      const opacity = Math.max(0.15, Math.min(1.0, activeTime / capLimit));
      block.style.backgroundColor = color;
      block.style.opacity = opacity;
      block.style.borderColor = 'rgba(255,255,255,0.15)';
      block.style.backgroundImage = '';
    } else if (i < currentHour) {
      // Past hour with zero activity — show subtle diagonal stripe to distinguish from future
      block.classList.add('past-idle');
      block.style.backgroundColor = '';
      block.style.opacity = '';
      block.style.borderColor = '';
      block.style.backgroundImage = '';
    } else {
      // Future hour — plain dark
      block.style.backgroundColor = '';
      block.style.opacity = '';
      block.style.borderColor = '';
      block.style.backgroundImage = '';
    }

    // Re-apply domain filter classes
    block.classList.remove('domain-dimmed', 'domain-highlighted');
    if (selectedFilterDomain) {
      if (dominantDomain === selectedFilterDomain) {
        block.classList.add('domain-highlighted');
      } else if (activeTime > 0) {
        block.classList.add('domain-dimmed');
      }
    }
  }

  // Draw colour legend (top 3 + Others)
  heatmapLegendItems.innerHTML = '';
  const legendDomains = sortedDomains.slice(0, 3);

  if (legendDomains.length === 0) {
    const span = document.createElement('span');
    span.innerText = 'No sites tracked';
    span.className = 'legend-text';
    heatmapLegendItems.appendChild(span);
  } else {
    legendDomains.forEach(([dom], idx) => {
      const item = document.createElement('div');
      item.className = 'heatmap-legend-item';
      const sq = document.createElement('div');
      sq.className = 'legend-square';
      sq.style.backgroundColor = getDomainColor(dom, idx);
      const label = document.createElement('span');
      label.className = 'legend-text';
      label.innerText = dom;
      item.appendChild(sq);
      item.appendChild(label);
      heatmapLegendItems.appendChild(item);
    });
    if (sortedDomains.length > 3) {
      const item = document.createElement('div');
      item.className = 'heatmap-legend-item';
      const sq = document.createElement('div');
      sq.className = 'legend-square';
      sq.style.backgroundColor = OTHER_COLOR;
      const label = document.createElement('span');
      label.className = 'legend-text';
      label.innerText = 'Others';
      item.appendChild(sq);
      item.appendChild(label);
      heatmapLegendItems.appendChild(item);
    }

    // Idle legend entry
    const idleItem = document.createElement('div');
    idleItem.className = 'heatmap-legend-item';
    const idleSq = document.createElement('div');
    idleSq.className = 'legend-square';
    idleSq.style.cssText = `background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, transparent 2px, transparent 7px); background-color: rgba(255,255,255,0.02);`;
    const idleLabel = document.createElement('span');
    idleLabel.className = 'legend-text';
    idleLabel.innerText = 'Past idle';
    idleItem.appendChild(idleSq);
    idleItem.appendChild(idleLabel);
    heatmapLegendItems.appendChild(idleItem);
  }
}

// --- Week stacked bar chart ---


function renderWeekStackedChart(sortedDomains) {
  weekBarSegments = [];

  // --- Dynamic canvas sizing: fill the container ---
  const wrapper = weekCanvas.parentElement;
  const W = Math.max(wrapper.clientWidth || wrapper.offsetWidth, 300);
  const H = 300;
  weekCanvas.width = W;
  weekCanvas.height = H;
  weekCtx.clearRect(0, 0, W, H);

  const dates = activeData.dates;
  const breakdowns = activeData.dailyBreakdowns;

  const topDomains = sortedDomains.slice(0, 4).map(d => d[0]);
  const domainColors = {};
  topDomains.forEach((dom, idx) => {
    domainColors[dom] = getDomainColor(dom, idx);
  });

  let maxDailyTime = 3600;
  for (const date of dates) {
    if (breakdowns[date].totalSeconds > maxDailyTime) {
      maxDailyTime = breakdowns[date].totalSeconds;
    }
  }

  const labelWidth = 44;     // left Y-axis space
  const bottomPad = 30;      // space for day labels below
  const topPad = 16;         // breathing room at top
  const chartWidth = W - labelWidth - 12; // 12px right padding
  const chartHeight = H - bottomPad - topPad;
  const startX = labelWidth;
  const startY = H - bottomPad;
  const barWidth = Math.floor(Math.min(54, (chartWidth / 7) * 0.55));
  const gap = (chartWidth - barWidth * 7) / 6;

  // Grid lines + Y-axis labels
  weekCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  weekCtx.lineWidth = 1;
  const linesCount = 4;
  for (let i = 0; i <= linesCount; i++) {
    const y = startY - (chartHeight / linesCount) * i;
    weekCtx.beginPath();
    weekCtx.moveTo(startX, y);
    weekCtx.lineTo(startX + chartWidth, y);
    weekCtx.stroke();

    weekCtx.fillStyle = '#64748b';
    weekCtx.font = '10px Inter, sans-serif';
    weekCtx.textAlign = 'right';
    const hrsVal = ((maxDailyTime / linesCount) * i) / 3600;
    weekCtx.fillText(`${hrsVal.toFixed(1)}h`, startX - 6, y + 3);
  }

  // Draw bars
  dates.forEach((date, index) => {
    const dayData = breakdowns[date];
    const x = startX + index * (barWidth + gap);

    const label = getDayOfWeekLabel(date);
    weekCtx.fillStyle = '#64748b';
    weekCtx.font = '11px Inter, sans-serif';
    weekCtx.textAlign = 'center';
    weekCtx.fillText(label, x + barWidth / 2, startY + 18);

    if (dayData.totalSeconds === 0) {
      weekCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      weekCtx.setLineDash([2, 2]);
      weekCtx.beginPath();
      weekCtx.moveTo(x + barWidth / 2, startY);
      weekCtx.lineTo(x + barWidth / 2, startY - 10);
      weekCtx.stroke();
      weekCtx.setLineDash([]);
      return;
    }

    const dailySlices = [];
    let otherSum = 0;

    for (const [dom, sec] of Object.entries(dayData.totals)) {
      if (topDomains.includes(dom)) {
        dailySlices.push({ domain: dom, seconds: sec, color: domainColors[dom] });
      } else {
        otherSum += sec;
      }
    }

    if (otherSum > 0) {
      dailySlices.push({ domain: 'Other Sites', seconds: otherSum, color: OTHER_COLOR });
    }

    let currentY = startY;

    dailySlices.forEach(slice => {
      const sliceHeight = (slice.seconds / maxDailyTime) * chartHeight;
      const nextY = currentY - sliceHeight;

      // Rounded top on tallest segment
      weekCtx.fillStyle = slice.color;
      weekCtx.fillRect(x, nextY, barWidth, sliceHeight);

      weekBarSegments.push({
        x1: x, y1: nextY, x2: x + barWidth, y2: currentY,
        domain: slice.domain, seconds: slice.seconds,
        color: slice.color, dateLabel: getFormattedDateLabel(date)
      });

      currentY = nextY;
    });
  });
}

function checkWeekHover(mouseX, mouseY) {
  let hoveredSeg = null;
  for (const seg of weekBarSegments) {
    if (mouseX >= seg.x1 && mouseX <= seg.x2 && mouseY >= seg.y1 && mouseY <= seg.y2) {
      hoveredSeg = seg;
      break;
    }
  }

  if (hoveredSeg) {
    const modeLabel = (trackingMode === 'active') ? 'Focus' : 'Open';
    tooltipEl.innerHTML = `
      <strong>${hoveredSeg.dateLabel}</strong><br>
      <span style="color: ${hoveredSeg.color}">●</span> <strong>${hoveredSeg.domain}</strong>: ${formatDuration(hoveredSeg.seconds)} (${modeLabel})
    `;
    tooltipEl.style.left = `${lastWeekMouseX + weekCanvas.getBoundingClientRect().left + window.scrollX}px`;
    tooltipEl.style.top = `${mouseY + weekCanvas.getBoundingClientRect().top + window.scrollY - 12}px`;
    tooltipEl.classList.add('show');
    weekCanvas.style.cursor = 'pointer';
  } else {
    tooltipEl.classList.remove('show');
    weekCanvas.style.cursor = 'default';
  }
}

weekCanvas.addEventListener('mousemove', (e) => {
  const rect = weekCanvas.getBoundingClientRect();
  lastWeekMouseX = e.clientX - rect.left;
  lastWeekMouseY = e.clientY - rect.top;
  checkWeekHover(lastWeekMouseX, lastWeekMouseY);
});

weekCanvas.addEventListener('mouseleave', () => {
  lastWeekMouseX = null;
  lastWeekMouseY = null;
  tooltipEl.classList.remove('show');
});

// --- Month View Calendar Heatmap Grid ---

function renderMonthCalendar(sortedDomains) {
  if (!calendarGrid) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const expectedChildren = firstDay + totalDays;

  const children = calendarGrid.children;
  const needsRebuild = (children.length !== expectedChildren);

  if (needsRebuild) {
    calendarGrid.innerHTML = '';
    
    // Draw empty cells for calendar alignment
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-cell empty-cell';
      calendarGrid.appendChild(empty);
    }
  }

  const useActive = (trackingMode === 'active');
  const monthDates = getDatesForCurrentMonth();

  monthDates.forEach((dateStr, idx) => {
    const day = idx + 1;
    const dayData = allHistoryData[dateStr];
    let dailyTime = 0;

    if (dayData) {
      const raw = useActive ? (dayData.activeTotals || {}) : (dayData.totals || {});
      for (const [dom, sec] of Object.entries(raw)) {
        if (!isExcluded(dom, settings.excludedDomains)) {
          dailyTime += sec;
        }
      }
    }

    let cell;
    if (needsRebuild) {
      cell = document.createElement('div');
      cell.className = 'calendar-cell';
      cell.innerText = day;

      const isToday = (day === now.getDate());
      if (isToday) {
        cell.classList.add('today-cell');
      }

      cell.addEventListener('mousemove', (e) => {
        const time = parseInt(cell.dataset.dailyTime, 10) || 0;
        const formattedDate = new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const modeLabel = useActive ? 'Active Focus' : 'Open Tabs';
        tooltipEl.innerHTML = `
          <strong>${formattedDate}</strong><br>
          ${modeLabel}: ${formatDuration(time)}
        `;
        tooltipEl.style.left = `${e.pageX}px`;
        tooltipEl.style.top = `${e.pageY - 12}px`;
        tooltipEl.classList.add('show');
      });

      cell.addEventListener('mouseleave', () => {
        tooltipEl.classList.remove('show');
      });

      calendarGrid.appendChild(cell);
    } else {
      cell = children[firstDay + idx];
    }

    // Update dataset for tooltips
    cell.dataset.dailyTime = dailyTime;

    // Update styling in-place
    if (dailyTime > 0) {
      cell.classList.add('active-day');
      const opacity = Math.max(0.15, Math.min(1.0, dailyTime / 14400));
      cell.style.backgroundColor = `rgba(168, 85, 247, ${opacity})`;
      cell.style.color = '#ffffff';
    } else {
      cell.classList.remove('active-day');
      cell.style.backgroundColor = '';
      cell.style.color = '';
    }
  });
}

// --- Year View 12-Month Bar Chart ---

function renderYearChart(sortedDomains) {
  yearBarSegments = [];

  // --- Dynamic canvas sizing: fill the container ---
  const wrapper = yearCanvas.parentElement;
  const W = Math.max(wrapper.clientWidth || wrapper.offsetWidth, 300);
  const H = 300;
  yearCanvas.width = W;
  yearCanvas.height = H;
  yearCtx.clearRect(0, 0, W, H);

  const now = new Date();
  const currentYear = now.getFullYear();
  const useActive = (trackingMode === 'active');

  const monthlyTotals = Array(12).fill(0);
  const monthlyBreakdowns = Array(12).fill(null).map(() => ({}));

  for (const [dateStr, dayData] of Object.entries(allHistoryData)) {
    if (dateStr.startsWith(currentYear + '-')) {
      const monthIdx = parseInt(dateStr.split('-')[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        const raw = useActive ? (dayData.activeTotals || {}) : (dayData.totals || {});
        for (const [dom, sec] of Object.entries(raw)) {
          if (!isExcluded(dom, settings.excludedDomains)) {
            monthlyTotals[monthIdx] += sec;
            monthlyBreakdowns[monthIdx][dom] = (monthlyBreakdowns[monthIdx][dom] || 0) + sec;
          }
        }
      }
    }
  }

  let maxMonthTime = 3600 * 5;
  for (let i = 0; i < 12; i++) {
    if (monthlyTotals[i] > maxMonthTime) maxMonthTime = monthlyTotals[i];
  }

  const labelWidth = 44;
  const bottomPad = 30;
  const topPad = 16;
  const chartWidth = W - labelWidth - 12;
  const chartHeight = H - bottomPad - topPad;
  const startX = labelWidth;
  const startY = H - bottomPad;
  const barWidth = Math.floor(Math.min(36, (chartWidth / 12) * 0.55));
  const gap = (chartWidth - barWidth * 12) / 11;

  // Grid lines + Y-axis labels
  yearCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  yearCtx.lineWidth = 1;
  const linesCount = 4;
  for (let i = 0; i <= linesCount; i++) {
    const y = startY - (chartHeight / linesCount) * i;
    yearCtx.beginPath();
    yearCtx.moveTo(startX, y);
    yearCtx.lineTo(startX + chartWidth, y);
    yearCtx.stroke();

    yearCtx.fillStyle = '#64748b';
    yearCtx.font = '10px Inter, sans-serif';
    yearCtx.textAlign = 'right';
    const hrsVal = ((maxMonthTime / linesCount) * i) / 3600;
    yearCtx.fillText(`${hrsVal.toFixed(1)}h`, startX - 6, y + 3);
  }

  const monthsLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let m = 0; m < 12; m++) {
    const totalTime = monthlyTotals[m];
    const x = startX + m * (barWidth + gap);

    // Month label
    const isCurrentMonth = (m === now.getMonth());
    yearCtx.fillStyle = isCurrentMonth ? '#c084fc' : '#64748b';
    yearCtx.font = `${isCurrentMonth ? 'bold ' : ''}11px Inter, sans-serif`;
    yearCtx.textAlign = 'center';
    yearCtx.fillText(monthsLabels[m], x + barWidth / 2, startY + 18);

    if (totalTime === 0) {
      yearCtx.fillStyle = 'rgba(255,255,255,0.06)';
      yearCtx.beginPath();
      yearCtx.arc(x + barWidth / 2, startY - 4, 3, 0, 2 * Math.PI);
      yearCtx.fill();
      continue;
    }

    const barHeight = (totalTime / maxMonthTime) * chartHeight;
    const y = startY - barHeight;

    const barGradient = yearCtx.createLinearGradient(x, startY, x, y);
    barGradient.addColorStop(0, '#3b82f6');
    barGradient.addColorStop(1, '#a855f7');
    yearCtx.fillStyle = barGradient;

    roundRect(yearCtx, x, y, barWidth, barHeight, 4);
    yearCtx.fill();

    let topDomain = '';
    let maxDomainTime = 0;
    for (const [dom, sec] of Object.entries(monthlyBreakdowns[m])) {
      if (sec > maxDomainTime) { maxDomainTime = sec; topDomain = dom; }
    }

    yearBarSegments.push({
      x1: x, y1: y, x2: x + barWidth, y2: startY,
      monthLabel: `${monthsLabels[m]} ${currentYear}`,
      totalSeconds: totalTime, topDomain, topDomainTime: maxDomainTime
    });
  }
}

function checkYearHover(mouseX, mouseY) {
  let hoveredSeg = null;
  for (const seg of yearBarSegments) {
    if (mouseX >= seg.x1 && mouseX <= seg.x2 && mouseY >= seg.y1 && mouseY <= seg.y2) {
      hoveredSeg = seg;
      break;
    }
  }

  if (hoveredSeg) {
    const topSiteLabel = hoveredSeg.topDomain ? `<br>Top: <strong style="color:#c084fc">${hoveredSeg.topDomain}</strong> (${formatDuration(hoveredSeg.topDomainTime)})` : '';
    const modeLabel = (trackingMode === 'active') ? 'Focus' : 'Open';
    tooltipEl.innerHTML = `
      <strong>${hoveredSeg.monthLabel}</strong><br>
      Total ${modeLabel}: ${formatDuration(hoveredSeg.totalSeconds)} ${topSiteLabel}
    `;
    tooltipEl.style.left = `${mouseX + yearCanvas.getBoundingClientRect().left + window.scrollX}px`;
    tooltipEl.style.top = `${mouseY + yearCanvas.getBoundingClientRect().top + window.scrollY - 12}px`;
    tooltipEl.classList.add('show');
    yearCanvas.style.cursor = 'pointer';
  } else {
    tooltipEl.classList.remove('show');
    yearCanvas.style.cursor = 'default';
  }
}

yearCanvas.addEventListener('mousemove', (e) => {
  const rect = yearCanvas.getBoundingClientRect();
  lastYearMouseX = e.clientX - rect.left;
  lastYearMouseY = e.clientY - rect.top;
  checkYearHover(lastYearMouseX, lastYearMouseY);
});

yearCanvas.addEventListener('mouseleave', () => {
  lastYearMouseX = null;
  lastYearMouseY = null;
  tooltipEl.classList.remove('show');
});

// --- Export Image Generator (Shareable Snapshot) ---

async function generateExportImage(format) {
  const useActive = (trackingMode === 'active');
  const width = format === 'instagram' ? 1080 : 1200;
  const height = format === 'instagram' ? 1920 : 675;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Background
  const gradient = ctx.createRadialGradient(
    width * 0.3, height * 0.3, 0,
    width * 0.5, height * 0.5, Math.max(width, height)
  );
  gradient.addColorStop(0, '#1d0f32');
  gradient.addColorStop(1, '#06020a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Neon Blobs glow
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
  const purpleGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.6);
  purpleGlow.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
  purpleGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');
  ctx.fillStyle = purpleGlow;
  ctx.beginPath();
  ctx.arc(0, 0, width * 0.6, 0, 2 * Math.PI);
  ctx.fill();

  const blueGlow = ctx.createRadialGradient(width, height, 0, width, height, width * 0.6);
  blueGlow.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
  blueGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = blueGlow;
  ctx.beginPath();
  ctx.arc(width, height, width * 0.6, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.restore();

  // Draw Logo & Brand
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${format === 'instagram' ? 44 : 32}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('⏱️ Attention Replay', 80, format === 'instagram' ? 120 : 80);

  ctx.fillStyle = '#c084fc';
  ctx.font = `${format === 'instagram' ? 28 : 22}px sans-serif`;
  ctx.fillText(useActive ? 'Your Active Focus, Wrapped' : 'Your Open Tabs, Wrapped', 80, format === 'instagram' ? 165 : 115);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${format === 'instagram' ? 24 : 18}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(activeData.label, width - 80, format === 'instagram' ? 120 : 80);

  const sorted = Object.entries(activeData.totals).sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3);

  // Helper to load image cleanly as a promise
  const loadFavicon = (domain) => {
    return new Promise((resolve) => {
      const img = new Image();
      // Google s2 favicon service sometimes supports anonymous requests, but has CORS blocks.
      // We set crossOrigin to anonymous so canvas doesn't get tainted.
      img.crossOrigin = 'anonymous';
      img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  // Load all favicons in parallel before drawing
  const favicons = {};
  await Promise.all(top3.map(async ([domain]) => {
    favicons[domain] = await loadFavicon(domain);
  }));

  if (format === 'instagram') {
    // Divider
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 220);
    ctx.lineTo(width - 80, 220);
    ctx.stroke();

    // TOTAL TIME STAT
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 24px sans-serif';
    ctx.fillText(useActive ? 'TOTAL ACTIVE FOCUS TIME' : 'TOTAL OPEN TAB TIME', width / 2, 330);

    const valGradient = ctx.createLinearGradient(0, 360, 0, 480);
    valGradient.addColorStop(0, '#ffffff');
    valGradient.addColorStop(1, '#c084fc');
    ctx.fillStyle = valGradient;
    ctx.font = '900 110px sans-serif';
    ctx.fillText(formatDuration(activeData.totalSeconds), width / 2, 450);

    // TOP SITES HEADER
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 24px sans-serif';
    ctx.fillText(useActive ? 'YOUR TOP ACTIVE PLACES' : 'YOUR TOP OPEN PLACES', 80, 560);
    
    let yOffset = 610;
    top3.forEach(([domain, seconds], idx) => {
      const pct = activeData.totalSeconds > 0 ? Math.round((seconds / activeData.totalSeconds) * 100) : 0;
      const cardColor = 'rgba(255,255,255,0.04)';
      const cardBorder = 'rgba(255,255,255,0.05)';
      
      ctx.fillStyle = cardColor;
      ctx.strokeStyle = cardBorder;
      ctx.lineWidth = 1;
      roundRect(ctx, 80, yOffset, width - 160, 140, 16);
      ctx.fill();
      ctx.stroke();

      // Rank container background
      ctx.fillStyle = getDomainColor(domain, idx);
      roundRect(ctx, 110, yOffset + 35, 70, 70, 12);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((idx + 1).toString(), 145, yOffset + 85);

      // Icon circle background
      ctx.fillStyle = getDomainColor(domain, idx);
      ctx.beginPath();
      ctx.arc(235, yOffset + 70, 24, 0, 2 * Math.PI);
      ctx.fill();

      // Draw real favicon or fallback text
      const iconImg = favicons[domain];
      if (iconImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(235, yOffset + 70, 20, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(iconImg, 215, yOffset + 50, 40, 40);
        ctx.restore();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(domain.charAt(0).toUpperCase(), 235, yOffset + 78);
      }

      // Domain Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'left';
      
      let printDomain = domain;
      if (ctx.measureText(printDomain).width > width - 580) {
        while (ctx.measureText(printDomain + '...').width > width - 580 && printDomain.length > 3) {
          printDomain = printDomain.slice(0, -1);
        }
        printDomain += '...';
      }
      ctx.fillText(printDomain, 290, yOffset + 80);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${formatDuration(seconds)} (${pct}%)`, width - 120, yOffset + 80);

      yOffset += 180;
    });

    // WATERMARK
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '600 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by Attention Replay', width / 2, height - 120);



  } else {
    // --- TWITTER LANDSCAPE (1200x675) HORIZONTAL LAYOUT ---

    // Divider Line
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 150);
    ctx.lineTo(width - 80, 150);
    ctx.stroke();

    // Column 1
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 18px sans-serif';
    ctx.fillText(useActive ? 'TOTAL ACTIVE FOCUS TIME' : 'TOTAL OPEN TAB TIME', 80, 220);

    const valGradient = ctx.createLinearGradient(0, 240, 0, 310);
    valGradient.addColorStop(0, '#ffffff');
    valGradient.addColorStop(1, '#c084fc');
    ctx.fillStyle = valGradient;
    ctx.font = '900 72px sans-serif';
    ctx.fillText(formatDuration(activeData.totalSeconds), 80, 300);

    // Column 2
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 18px sans-serif';
    ctx.fillText(useActive ? 'YOUR TOP ACTIVE PLACES' : 'YOUR TOP OPEN PLACES', 600, 220);
    
    let yOffset = 250;
    top3.forEach(([domain, seconds], idx) => {
      const pct = activeData.totalSeconds > 0 ? Math.round((seconds / activeData.totalSeconds) * 100) : 0;
      
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      roundRect(ctx, 600, yOffset, width - 680, 90, 12);
      ctx.fill();
      ctx.stroke();

      // Rank
      ctx.fillStyle = getDomainColor(domain, idx);
      ctx.beginPath();
      ctx.arc(640, yOffset + 45, 18, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((idx + 1).toString(), 640, yOffset + 51);

      // Icon circle fallback/Favicon container background
      ctx.fillStyle = getDomainColor(domain, idx);
      ctx.beginPath();
      ctx.arc(690, yOffset + 45, 16, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw real favicon or fallback letter
      const iconImg = favicons[domain];
      if (iconImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(690, yOffset + 45, 13, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(iconImg, 677, yOffset + 32, 26, 26);
        ctx.restore();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px sans-serif';
        ctx.fillText(domain.charAt(0).toUpperCase(), 690, yOffset + 50);
      }

      // Domain Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      
      let printDomain = domain;
      if (ctx.measureText(printDomain).width > 240) {
        while (ctx.measureText(printDomain + '...').width > 240 && printDomain.length > 3) {
          printDomain = printDomain.slice(0, -1);
        }
        printDomain += '...';
      }
      ctx.fillText(printDomain, 725, yOffset + 52);

      // Time Text
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${formatDuration(seconds)} (${pct}%)`, width - 110, yOffset + 52);
      yOffset += 115;
    });

    // WATERMARK
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '600 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Generated by Attention Replay', 80, height - 50);


  }

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `attention_replay_${currentView}_wrapped_${format === 'instagram' ? 'story' : 'landscape'}.png`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    showToast('Snapshot downloaded successfully!', 'success');
  }, 'image/png');
}

// Rounded rect draw
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height - radius);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}



// --- Init & Page Toggles ---

async function loadDashboard(useSkeleton = false) {
  if (useSkeleton) {
    showSkeleton();
  }

  await fetchAllHistoryFromStorage();
  renderDashboardUI();

  // Trigger entrance animation on content areas when switching views
  if (useSkeleton) {
    setTimeout(() => {
      [document.getElementById('wrapped-card'),
       document.getElementById('donut-content'),
       document.getElementById('trend-content-area')
      ].forEach(el => {
        if (!el) return;
        el.classList.remove('view-switch-animate');
        void el.offsetWidth; // force reflow to restart animation
        el.classList.add('view-switch-animate');
      });
    }, 230);
  }

  // Set up live updates every 1 second
  if (liveUpdateInterval) clearInterval(liveUpdateInterval);
  liveUpdateInterval = setInterval(renderDashboardUI, 1000);

  if (useSkeleton) {
    setTimeout(hideSkeleton, 220);
  }
}

function renderDashboardUI() {
  chrome.runtime.sendMessage({ type: 'GET_LIVE_STATE' }, (liveState) => {
    if (chrome.runtime.lastError) {
      console.warn('Error fetching live state:', chrome.runtime.lastError.message);
      // fallback
      const localHistory = JSON.parse(JSON.stringify(allHistoryData));
      processAndRender(localHistory);
      return;
    }

    // Clone history and inject delta ticks to render live increments
    const localHistory = JSON.parse(JSON.stringify(allHistoryData));
    injectLiveTicks(localHistory, liveState);
    
    processAndRender(localHistory);
  });
}

function processAndRender(localHistory) {
  aggregateData(localHistory);
  updateUI();
  triggerCachedHovers();
}

// Re-triggers hovers at the end of the render tick to maintain active tooltips
function triggerCachedHovers() {
  if (lastMouseX !== null && lastMouseY !== null) {
    checkDonutHover(lastMouseX, lastMouseY);
  }
  if (currentView === 'week' && lastWeekMouseX !== null && lastWeekMouseY !== null) {
    checkWeekHover(lastWeekMouseX, lastWeekMouseY);
  }
  if (currentView === 'year' && lastYearMouseX !== null && lastYearMouseY !== null) {
    checkYearHover(lastYearMouseX, lastYearMouseY);
  }
}

// --- Tab Setup Event Listeners ---

toggleTodayBtn.addEventListener('click', () => {
  if (currentView !== 'today') {
    currentView = 'today';
    clearTabActives();
    toggleTodayBtn.classList.add('active');
    loadDashboard(true);
  }
});

toggleWeekBtn.addEventListener('click', () => {
  if (currentView !== 'week') {
    currentView = 'week';
    clearTabActives();
    toggleWeekBtn.classList.add('active');
    loadDashboard(true);
  }
});

toggleMonthBtn.addEventListener('click', () => {
  if (currentView !== 'month') {
    currentView = 'month';
    clearTabActives();
    toggleMonthBtn.classList.add('active');
    loadDashboard(true);
  }
});

toggleYearBtn.addEventListener('click', () => {
  if (currentView !== 'year') {
    currentView = 'year';
    clearTabActives();
    toggleYearBtn.classList.add('active');
    loadDashboard(true);
  }
});

function clearTabActives() {
  toggleTodayBtn.classList.remove('active');
  toggleWeekBtn.classList.remove('active');
  toggleMonthBtn.classList.remove('active');
  toggleYearBtn.classList.remove('active');
  // Clear any cross-domain filter when switching views
  selectedFilterDomain = null;
  topSitesExpanded = false;
}

toggleActiveBtn.addEventListener('click', () => {
  if (trackingMode === 'open') {
    trackingMode = 'active';
    toggleActiveBtn.classList.add('active');
    toggleOpenBtn.classList.remove('active');
    showToast('Focus metrics view active.', 'info');
    loadDashboard(true);
  }
});

toggleOpenBtn.addEventListener('click', () => {
  if (trackingMode === 'active') {
    trackingMode = 'open';
    toggleOpenBtn.classList.add('active');
    toggleActiveBtn.classList.remove('active');
    showToast('Open tabs view active.', 'info');
    loadDashboard(true);
  }
});

settingsBtn.addEventListener('click', () => {
  window.location.href = 'settings.html';
});

// Modal export triggers
exportBtn.addEventListener('click', () => {
  exportModal.classList.remove('hidden');
});

exportCloseBtn.addEventListener('click', () => {
  exportModal.classList.add('hidden');
});

exportInstagramBtn.addEventListener('click', () => {
  generateExportImage('instagram');
  exportModal.classList.add('hidden');
});

exportTwitterBtn.addEventListener('click', () => {
  generateExportImage('twitter');
  exportModal.classList.add('hidden');
});

// PDF Export Event Trigger
exportPdfBtn.addEventListener('click', generatePdfReport);

function generatePdfReport() {
  const useActive = (trackingMode === 'active');
  const modeLabel = useActive ? 'Active Focus Time' : 'All Open Tabs Time';
  const timeFrameLabel = currentView.charAt(0).toUpperCase() + currentView.slice(1);

  // 1. Gather stats
  const totalSeconds = activeData.totalSeconds;
  const sortedDomains = Object.entries(activeData.totals).sort((a, b) => b[1] - a[1]);
  const uniqueDomainsCount = sortedDomains.length;
  const coverageRange = activeData.label;

  // 2. Format title & date
  const now = new Date();
  const timestampStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

  // 3. Cap table size to top 50 to avoid massive printing
  const MAX_DOMAINS = 50;
  const printDomains = sortedDomains.slice(0, MAX_DOMAINS);
  const remainingCount = uniqueDomainsCount - printDomains.length;

  // Build the print layout HTML
  let rowsHtml = '';
  printDomains.forEach(([domain, seconds], idx) => {
    const pct = totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0;
    rowsHtml += `
      <tr>
        <td>#${idx + 1}</td>
        <td class="domain-name-cell">${getDisplayName(domain)}</td>
        <td><a href="https://${domain}" target="_blank" style="color: #3b82f6; text-decoration: underline;">${domain}</a></td>
        <td>${formatDuration(seconds)}</td>
        <td>${pct}%</td>
        <td>${coverageRange}</td>
      </tr>
    `;
  });

  const printArea = document.getElementById('print-report-area');
  printArea.innerHTML = `
    <div class="print-header">
      <div class="print-brand">
        <img src="icons/icon-48.png" class="print-logo-icon" alt="">
        <h1 class="print-title">Attention Replay</h1>
      </div>
      <div class="print-meta-right">
        <div>Generated: ${timestampStr}</div>
        <div>Scope: ${timeFrameLabel} View (${modeLabel})</div>
      </div>
    </div>

    <h2 class="print-report-title">Browsing Activity Report</h2>
    
    <div class="print-summary-box">
      <div class="print-summary-item">
        <span class="print-summary-label">Report Period</span>
        <span class="print-summary-value" style="font-size: 14px;">${coverageRange}</span>
      </div>
      <div class="print-summary-item">
        <span class="print-summary-label">Total Time Tracked</span>
        <span class="print-summary-value">${formatDuration(totalSeconds)}</span>
      </div>
      <div class="print-summary-item">
        <span class="print-summary-label">Unique Sites Visited</span>
        <span class="print-summary-value">${uniqueDomainsCount}</span>
      </div>
    </div>

    <table class="print-table">
      <thead>
        <tr>
          <th style="width: 8%;">Rank</th>
          <th style="width: 25%;">Website Name</th>
          <th style="width: 25%;">URL/Domain</th>
          <th style="width: 17%;">Total Time Spent</th>
          <th style="width: 10%;">Share %</th>
          <th style="width: 15%;">Coverage Range</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="6" style="text-align: center; color: #555;">No browsing activity recorded during this period.</td></tr>'}
      </tbody>
    </table>

    ${remainingCount > 0 ? `<p class="print-caption">* showing top ${MAX_DOMAINS} domains. ${remainingCount} additional domains with less activity not shown.</p>` : ''}

    <div class="print-footer">
      <span>Attention Replay © ${now.getFullYear()}</span>
      <span>Generated by Attention Replay</span>
    </div>
  `;

  // Set page title temporarily so default print-to-PDF save filename matches template
  const origTitle = document.title;
  const fileDate = getLocalDateString(now);
  document.title = `attention-replay-report-${currentView}-${fileDate}`;

  // Trigger print dialog
  window.print();

  // Reset title
  document.title = origTitle;

  // Clear print area after window dialog is handled
  setTimeout(() => {
    printArea.innerHTML = '';
  }, 1000);
}



// Refresh data on storage updates (to keep dashboard in sync)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    fetchAllHistoryFromStorage().then(() => {
      renderDashboardUI();
    });
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard(true);

  const wrappedSlideshowBtn = document.getElementById('wrapped-slideshow-btn');
  if (wrappedSlideshowBtn) {
    wrappedSlideshowBtn.addEventListener('click', startSlideshow);
  }

  const slideshowPauseBtn = document.getElementById('slideshow-pause-btn');
  if (slideshowPauseBtn) {
    slideshowPauseBtn.addEventListener('click', pauseSlideshow);
  }

  const slideshowCloseBtn = document.getElementById('slideshow-close-btn');
  if (slideshowCloseBtn) {
    slideshowCloseBtn.addEventListener('click', stopSlideshow);
  }

  const slideshowCloseBtnBottom = document.getElementById('slideshow-close-btn-bottom');
  if (slideshowCloseBtnBottom) {
    slideshowCloseBtnBottom.addEventListener('click', stopSlideshow);
  }

  const slideshowReplayBtn = document.getElementById('slideshow-replay-btn');
  if (slideshowReplayBtn) {
    slideshowReplayBtn.addEventListener('click', startSlideshow);
  }

  const leftClickTarget = document.getElementById('slideshow-click-left');
  if (leftClickTarget) {
    leftClickTarget.addEventListener('click', (e) => {
      e.stopPropagation();
      prevSlide();
    });
  }

  const rightClickTarget = document.getElementById('slideshow-click-right');
  if (rightClickTarget) {
    rightClickTarget.addEventListener('click', (e) => {
      e.stopPropagation();
      nextSlide();
    });
  }
});

// Prevent memory leaks
window.addEventListener('unload', () => {
  if (liveUpdateInterval) clearInterval(liveUpdateInterval);
});

// Re-render canvas charts when window is resized so they always fill full width
let _resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (!activeData || !activeData.totals) return;
    const sortedDomains = Object.entries(activeData.totals).sort((a, b) => b[1] - a[1]);
    if (currentView === 'week' && !weekChartView.classList.contains('hidden')) {
      renderWeekStackedChart(sortedDomains);
    } else if (currentView === 'year' && !yearChartView.classList.contains('hidden')) {
      renderYearChart(sortedDomains);
    }
  }, 120);
});
