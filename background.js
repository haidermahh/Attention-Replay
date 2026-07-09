// Attention Replay - Background Service Worker

// Helper to get local date string YYYY-MM-DD
function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Extract domain from URL
function getDomain(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    let hostname = parsed.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (e) {
    return null;
  }
}

// Check if domain is in exclusion list
function isDomainExcluded(domain, settings) {
  if (!domain) return true;
  if (!settings || !settings.excludedDomains) return false;
  return settings.excludedDomains.some(excluded => {
    const cleanExcluded = excluded.trim().toLowerCase();
    if (!cleanExcluded) return false;
    return domain === cleanExcluded || domain.endsWith('.' + cleanExcluded);
  });
}

// ─── AUTO-PRODUCTIVITY CLASSIFIER ────────────────────────────────────────────
// Automatically assigns a productivity classification ('productive', 'neutral',
// or 'distracting') to any domain the user visits.  No user action required.
// Results are stored in customProductivity so the dashboard Focus Score is
// always accurate — even for sites never seen before.

/** Tier-1: exact domain → classification */
const KNOWN_DOMAINS_PRODUCTIVITY = {
  // Productive – Dev / Code
  'github.com': 'productive', 'gitlab.com': 'productive', 'bitbucket.org': 'productive',
  'stackoverflow.com': 'productive', 'developer.mozilla.org': 'productive',
  'npmjs.com': 'productive', 'pypi.org': 'productive', 'docker.com': 'productive',
  'vercel.com': 'productive', 'netlify.com': 'productive', 'heroku.com': 'productive',
  'aws.amazon.com': 'productive', 'console.cloud.google.com': 'productive',
  'portal.azure.com': 'productive', 'digitalocean.com': 'productive',

  // Productive – Work / Productivity
  'notion.so': 'productive', 'trello.com': 'productive', 'asana.com': 'productive',
  'monday.com': 'productive', 'clickup.com': 'productive', 'basecamp.com': 'productive',
  'jira.atlassian.com': 'productive', 'confluence.atlassian.com': 'productive',
  'linear.app': 'productive', 'airtable.com': 'productive',
  'slack.com': 'productive', 'teams.microsoft.com': 'productive',
  'zoom.us': 'productive', 'meet.google.com': 'productive',
  'calendar.google.com': 'productive', 'docs.google.com': 'productive',
  'sheets.google.com': 'productive', 'slides.google.com': 'productive',
  'drive.google.com': 'productive', 'mail.google.com': 'productive',
  'gmail.com': 'productive', 'outlook.live.com': 'productive',
  'outlook.office.com': 'productive', 'office.com': 'productive',
  'word.office.com': 'productive', 'excel.office.com': 'productive',
  'powerpoint.office.com': 'productive',
  'figma.com': 'productive', 'sketch.com': 'productive',
  'canva.com': 'productive', 'adobe.com': 'productive',
  'notion.so': 'productive', 'evernote.com': 'productive',
  'obsidian.md': 'productive', 'roamresearch.com': 'productive',

  // Productive – AI / Research
  'claude.ai': 'productive', 'chatgpt.com': 'productive', 'chat.openai.com': 'productive',
  'openai.com': 'productive', 'gemini.google.com': 'productive',
  'perplexity.ai': 'productive', 'you.com': 'productive',
  'copilot.microsoft.com': 'productive', 'bing.com': 'productive',
  'google.com': 'productive', 'search.google.com': 'productive',

  // Productive – Learning
  'udemy.com': 'productive', 'coursera.org': 'productive',
  'khanacademy.org': 'productive', 'edx.org': 'productive',
  'pluralsight.com': 'productive', 'skillshare.com': 'productive',
  'freecodecamp.org': 'productive', 'codecademy.com': 'productive',
  'leetcode.com': 'productive', 'hackerrank.com': 'productive',
  'codewars.com': 'productive', 'theodinproject.com': 'productive',
  'w3schools.com': 'productive', 'css-tricks.com': 'productive',
  'smashingmagazine.com': 'productive', 'dev.to': 'productive',
  'medium.com': 'neutral', 'hashnode.com': 'productive',
  'wikipedia.org': 'productive', 'en.wikipedia.org': 'productive',
  'britannica.com': 'productive', 'arxiv.org': 'productive',
  'scholar.google.com': 'productive', 'researchgate.net': 'productive',
  'docs.microsoft.com': 'productive', 'learn.microsoft.com': 'productive',
  'developer.apple.com': 'productive',

  // Neutral – Utilities
  'translate.google.com': 'neutral', 'maps.google.com': 'neutral',
  'weather.com': 'neutral', 'timeanddate.com': 'neutral',
  'wolframalpha.com': 'neutral', 'pastebin.com': 'neutral',
  'replit.com': 'productive', 'codepen.io': 'productive',
  'codesandbox.io': 'productive', 'jsfiddle.net': 'productive',
  'regex101.com': 'productive', 'jsonformatter.org': 'productive',
  'convertcase.net': 'neutral', 'toolsoverflow.com': 'neutral',
  'iloveimg.com': 'neutral', 'imagepine.com': 'neutral',
  'svgrepo.com': 'neutral', 'flaticon.com': 'neutral',
  'icons8.com': 'neutral', 'iconscout.com': 'neutral',
  'vectorlogo.zone': 'neutral', 'upload.wikimedia.org': 'neutral',

  // Distracting – Social
  'facebook.com': 'distracting', 'instagram.com': 'distracting',
  'twitter.com': 'distracting', 'x.com': 'distracting',
  'tiktok.com': 'distracting', 'snapchat.com': 'distracting',
  'pinterest.com': 'distracting', 'tumblr.com': 'distracting',
  'reddit.com': 'distracting', 'quora.com': 'neutral',
  'linkedin.com': 'neutral',

  // Distracting – Entertainment
  'youtube.com': 'distracting', 'netflix.com': 'distracting',
  'twitch.tv': 'distracting', 'hulu.com': 'distracting',
  'disneyplus.com': 'distracting', 'primevideo.com': 'distracting',
  'hbomax.com': 'distracting', 'peacocktv.com': 'distracting',
  'spotify.com': 'neutral', 'soundcloud.com': 'neutral',
  'pandora.com': 'distracting', 'dailymotion.com': 'distracting',
  'vimeo.com': 'neutral', 'studio.youtube.com': 'productive',
  'creator.youtube.com': 'productive',
  'roblox.com': 'distracting', 'robloxobby.games': 'distracting',
  'store.steampowered.com': 'distracting', 'epicgames.com': 'distracting',

  // Distracting – Shopping / Entertainment hybrid
  'amazon.com': 'distracting', 'ebay.com': 'distracting',
  'etsy.com': 'distracting', 'aliexpress.com': 'distracting',
  'daraz.pk': 'distracting', 'topup.pk': 'distracting',
  'mediatoolz.xyz': 'neutral',

  // Productive – Microsoft / Apple sign-in (needed for work tools)
  'login.microsoftonline.com': 'productive', 'login.live.com': 'productive',
  'accounts.google.com': 'productive', 'partner.microsoft.com': 'productive',

  // University / Education portals → productive
  'aiou.edu.pk': 'productive', 'online.aiou.edu.pk': 'productive',
  'enrollment.aiou.edu.pk': 'productive'
};

/** Tier-2: keyword patterns checked against all dot-separated parts of a domain */
const PRODUCTIVE_KEYWORDS = [
  'docs', 'developer', 'dev', 'code', 'api', 'learn', 'learn',
  'course', 'training', 'tutorial', 'edu', 'university', 'school',
  'college', 'academy', 'wiki', 'research', 'science', 'math',
  'study', 'library', 'ebook', 'journal', 'academic',
  'ai', 'llm', 'gpt', 'copilot', 'gemini', 'claude',
  'workplace', 'work', 'office', 'mail', 'email', 'calendar',
  'project', 'task', 'board', 'sprint', 'issue', 'ticket',
  'studio', 'creator', 'dashboard', 'console', 'portal', 'admin',
  'analytics', 'monitor', 'report', 'insight', 'data',
  'deploy', 'hosting', 'cloud', 'server', 'build', 'ci', 'cd',
  'health', 'clinic', 'hospital', 'medical', 'pharmacy', 'news', 'blog'
];

const DISTRACTING_KEYWORDS = [
  'game', 'games', 'gaming', 'play', 'casino', 'bet', 'betting',
  'gamble', 'poker', 'slot', 'lottery',
  'video', 'watch', 'stream', 'live', 'tv', 'movie', 'film', 'anime',
  'meme', 'funny', 'humor', 'joke', 'lol', 'viral', 'trending',
  'chat', 'social', 'feed', 'reel', 'shorts', 'story', 'post',
  'celeb', 'gossip', 'tabloid', 'buzz',
  'shop', 'store', 'buy', 'sale', 'deal', 'coupon', 'discount',
  'cart', 'checkout', 'order', 'price', 'fashion', 'clothing',
  'music', 'song', 'playlist', 'album', 'radio', 'podcast',
  'obby', 'roblox', 'minecraft', 'fortnite'
];

/** Tier-3: TLD-based classification */
const PRODUCTIVE_TLDS = [
  'edu', 'ac', 'gov', 'mil', 'int', 'org', 'io', 'dev', 'app'
];

const DISTRACTING_TLDS = ['gg', 'fun', 'lol', 'tv', 'games', 'casino'];

/**
 * Automatically infers a productivity label for any domain.
 * Uses a 3-tier cascade: exact map → keyword matching → TLD heuristics.
 * Falls back to 'neutral'.
 */
function inferDomainProductivity(domain) {
  if (!domain) return 'neutral';
  const d = domain.toLowerCase();

  // Tier-1: Exact known-domain lookup
  if (KNOWN_DOMAINS_PRODUCTIVITY[d]) {
    return KNOWN_DOMAINS_PRODUCTIVITY[d];
  }

  // Tier-1b: Check if this is a subdomain of a known root domain
  const parts = d.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.');
    if (KNOWN_DOMAINS_PRODUCTIVITY[parent]) {
      return KNOWN_DOMAINS_PRODUCTIVITY[parent];
    }
  }

  // Tier-2: Keyword matching on each dot-separated segment
  for (const part of parts) {
    if (DISTRACTING_KEYWORDS.includes(part)) return 'distracting';
  }
  for (const part of parts) {
    if (PRODUCTIVE_KEYWORDS.includes(part)) return 'productive';
  }

  // Tier-2b: Substring keyword matching on the main domain name
  const mainPart = parts.length >= 2 ? parts[parts.length - 2] : d;
  for (const kw of DISTRACTING_KEYWORDS) {
    if (mainPart.includes(kw)) return 'distracting';
  }
  for (const kw of PRODUCTIVE_KEYWORDS) {
    if (mainPart.includes(kw)) return 'productive';
  }

  // Tier-3: TLD classification
  const tld = parts[parts.length - 1];
  if (DISTRACTING_TLDS.includes(tld)) return 'distracting';
  if (PRODUCTIVE_TLDS.includes(tld)) return 'productive';

  // Second-level TLD for country codes (e.g. .edu.pk, .ac.uk, .gov.uk)
  if (parts.length >= 3) {
    const sld = parts[parts.length - 2];
    if (['edu', 'ac', 'gov', 'sch', 'mil'].includes(sld)) return 'productive';
  }

  return 'neutral';
}

/**
 * Runs whenever a new domain is first seen.
 * Skips domains that already have an explicit customProductivity entry.
 * Writes the inferred result back to storage so the dashboard always
 * has an accurate productivity classification without any user effort.
 */
async function autoClassifyDomain(domain) {
  if (!domain) return;
  try {
    const data = await chrome.storage.local.get('customProductivity');
    const existing = data.customProductivity || {};

    // Only classify if we haven't seen this domain before
    if (existing[domain] !== undefined) return;

    const classification = inferDomainProductivity(domain);
    existing[domain] = classification;
    await chrome.storage.local.set({ customProductivity: existing });
    console.log(`[AutoClassify] ${domain} → ${classification}`);
  } catch (err) {
    console.warn('[AutoClassify] Error classifying domain:', err);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Initialize settings
async function initializeSettings() {
  const data = await chrome.storage.local.get('settings');
  if (!data.settings) {
    const defaultSettings = {
      excludedDomains: [],
      isPaused: false,
      autoCleanupDays: 30
    };
    await chrome.storage.local.set({ settings: defaultSettings });
  }
}

// Format seconds into a compact badge string — full detail format.
// Chrome renders up to 4 chars on the badge; we show full h+m detail.
// Examples: 45 → "45S", 125 → "2M", 3665 → "1H1M", 7200 → "2H"
function formatBadgeTime(totalSeconds) {
  if (totalSeconds < 60) {
    return `${totalSeconds}S`;          // "0S"–"59S"
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}M`;              // "1M"–"59M"
  }
  const hours = Math.floor(minutes / 60);
  const remainMins = minutes % 60;
  return remainMins > 0 ? `${hours}H${remainMins}M` : `${hours}H`; // "1H5M" or "2H"
}

// Update the live badge with today's accumulated active focus time for the current domain.
// This is the main badge updater — reads storage + live elapsed and renders a compact time.
async function updateLiveBadge() {
  try {
    const data = await chrome.storage.local.get(['currentState', 'settings']);
    const current = data.currentState || { activeDomain: null, startTime: Date.now() };
    const settings = data.settings || { isPaused: false, excludedDomains: [] };

    // Clear badge if paused or no active trackable domain
    if (settings.isPaused || !current.activeDomain || isDomainExcluded(current.activeDomain, settings)) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    const domain = current.activeDomain;
    const todayStr = getLocalDateString();
    const dateData = await chrome.storage.local.get(todayStr);
    const dayData = dateData[todayStr] || { activeTotals: {} };
    const storedSeconds = (dayData.activeTotals && dayData.activeTotals[domain]) || 0;

    // Add live un-flushed elapsed seconds from the current in-progress session
    const liveElapsed = Math.round((Date.now() - current.startTime) / 1000);
    const totalSeconds = storedSeconds + Math.max(0, liveElapsed);

    const badgeText = formatBadgeTime(totalSeconds);
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
  } catch (err) {
    // Silently swallow — badge update errors are non-critical
    console.warn('[Badge] updateLiveBadge error:', err);
  }
}

// Thin shim used on domain transitions:
//  - null domain  → clear badge
//  - real domain  → refresh the live time immediately
function updateBadge(domain) {
  if (!domain) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    // Refresh the full live badge now that the domain is confirmed active
    updateLiveBadge();
  }
}

// Transition Active Tab (Active Focus delta tracking)
// KEY FIX: If the new domain is the same as the current domain (same site, different page/path),
// we do NOT reset startTime — the session continues uninterrupted.
async function transitionActiveTab(newDomain) {
  try {
    const data = await chrome.storage.local.get(['currentState', 'settings']);
    const current = data.currentState || { activeDomain: null, startTime: Date.now() };
    const settings = data.settings || { excludedDomains: [], isPaused: false };

    // SAME-DOMAIN GUARD: If the domain hasn't changed, just update the badge and return.
    // This prevents site.com → site.com/page1 from resetting the session timer.
    if (newDomain === current.activeDomain) {
      updateBadge(newDomain);
      return;
    }

    const now = Date.now();
    const elapsed = Math.round((now - current.startTime) / 1000);

    // If we have a valid previous active domain and tracking is active, store the elapsed focus time
    if (current.activeDomain && elapsed > 0 && !settings.isPaused && !isDomainExcluded(current.activeDomain, settings)) {
      const todayStr = getLocalDateString(new Date(current.startTime));
      const dayData = (await chrome.storage.local.get(todayStr))[todayStr] || {
        totals: {},
        activeTotals: {},
        hourly: {},
        activeHourly: {},
        longestSession: { domain: '', duration: 0 }
      };

      // Ensure properties exist
      if (!dayData.activeTotals) dayData.activeTotals = {};
      if (!dayData.activeHourly) dayData.activeHourly = {};

      // Increment active focus totals
      dayData.activeTotals[current.activeDomain] = (dayData.activeTotals[current.activeDomain] || 0) + elapsed;

      // Increment active hourly totals
      const hour = new Date(current.startTime).getHours().toString();
      if (!dayData.activeHourly[hour]) dayData.activeHourly[hour] = {};
      dayData.activeHourly[hour][current.activeDomain] = (dayData.activeHourly[hour][current.activeDomain] || 0) + elapsed;

      // Update longest focus session
      if (elapsed > (dayData.longestSession?.duration || 0)) {
        dayData.longestSession = {
          domain: current.activeDomain,
          duration: elapsed
        };
      }

      await chrome.storage.local.set({ [todayStr]: dayData });
      console.log(`[Focus] Tracked ${elapsed}s on ${current.activeDomain}`);
    }

    // Save the new active tab state with a fresh startTime (domain actually changed)
    const newState = {
      activeDomain: newDomain,
      startTime: now
    };
    await chrome.storage.local.set({ currentState: newState });

    // Update badge to reflect new domain
    updateBadge(newDomain);

    // Auto-classify the newly visited domain (silently, no UI required)
    if (newDomain) autoClassifyDomain(newDomain);

    console.log(`[Focus] Domain changed: ${current.activeDomain || 'none'} → ${newDomain || 'none'}`);
  } catch (err) {
    console.error('Error in transitionActiveTab:', err);
  }
}

// Migrate legacy "www.*" storage keys to root domain equivalents.
// This runs once on startup to ensure old data (if any had www. prefix) is merged correctly.
async function migrateWwwDomains() {
  try {
    const allData = await chrome.storage.local.get(null);
    const dateKeys = Object.keys(allData).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
    let didMigrate = false;

    for (const dateKey of dateKeys) {
      const dayData = allData[dateKey];
      if (!dayData) continue;

      let changed = false;
      const sections = ['totals', 'activeTotals', 'hourly', 'activeHourly'];

      for (const section of sections) {
        if (!dayData[section]) continue;

        if (section === 'hourly' || section === 'activeHourly') {
          // Nested: { hour: { domain: secs } }
          for (const hour of Object.keys(dayData[section])) {
            const hourObj = dayData[section][hour];
            for (const domain of Object.keys(hourObj)) {
              if (domain.startsWith('www.')) {
                const rootDomain = domain.substring(4);
                hourObj[rootDomain] = (hourObj[rootDomain] || 0) + hourObj[domain];
                delete hourObj[domain];
                changed = true;
              }
            }
          }
        } else {
          // Flat: { domain: secs }
          for (const domain of Object.keys(dayData[section])) {
            if (domain.startsWith('www.')) {
              const rootDomain = domain.substring(4);
              dayData[section][rootDomain] = (dayData[section][rootDomain] || 0) + dayData[section][domain];
              delete dayData[section][domain];
              changed = true;
            }
          }
        }
      }

      if (changed) {
        await chrome.storage.local.set({ [dateKey]: dayData });
        didMigrate = true;
        console.log(`[Migration] Merged www.* domains in ${dateKey}`);
      }
    }

    if (didMigrate) {
      console.log('[Migration] www. domain migration complete.');
    }
  } catch (err) {
    console.error('Error during www domain migration:', err);
  }
}

// Track all open tabs cumulatively
async function trackOpenTabs() {
  try {
    const data = await chrome.storage.local.get(['lastRunTime', 'settings']);
    const settings = data.settings || { excludedDomains: [], isPaused: false };
    if (settings.isPaused) return;

    // Check if idle (exclude idle time from tracking)
    const idleState = await new Promise(resolve => chrome.idle.queryState(60, resolve));
    if (idleState !== 'active') {
      // Reset lastRunTime to prevent accumulating duration spent while idle
      await chrome.storage.local.set({ lastRunTime: Date.now() });
      return;
    }

    const now = Date.now();
    const lastRun = data.lastRunTime || now;
    const elapsed = Math.round((now - lastRun) / 1000);

    // Reset lastRunTime immediately to avoid double counting
    await chrome.storage.local.set({ lastRunTime: now });

    if (elapsed <= 0) return;

    // Query all open tabs across all windows
    chrome.tabs.query({}, async (tabs) => {
      if (chrome.runtime.lastError || !tabs) return;

      console.log(`[Open Tabs Poll] Fired at ${new Date().toLocaleTimeString()} - found ${tabs.length} open tabs.`);

      const domainsToIncrement = [];
      tabs.forEach(tab => {
        const urlToParse = tab.url || tab.pendingUrl;
        if (urlToParse) {
          const domain = getDomain(urlToParse);
          if (domain && !isDomainExcluded(domain, settings)) {
            domainsToIncrement.push(domain);
          }
        }
      });

      if (domainsToIncrement.length === 0) return;

      // Count duplicate domains (cumulative tab-time)
      const domainCounts = {};
      domainsToIncrement.forEach(dom => {
        domainCounts[dom] = (domainCounts[dom] || 0) + 1;
      });

      const todayStr = getLocalDateString(new Date(now));
      const dateData = await chrome.storage.local.get(todayStr);
      const dayData = dateData[todayStr] || {
        totals: {},
        activeTotals: {},
        hourly: {},
        activeHourly: {},
        longestSession: { domain: '', duration: 0 }
      };

      // Ensure properties exist
      if (!dayData.totals) dayData.totals = {};
      if (!dayData.hourly) dayData.hourly = {};

      const hour = new Date(now).getHours().toString();
      if (!dayData.hourly[hour]) dayData.hourly[hour] = {};

      for (const [dom, count] of Object.entries(domainCounts)) {
        const addedSeconds = count * elapsed;
        dayData.totals[dom] = (dayData.totals[dom] || 0) + addedSeconds;
        dayData.hourly[hour][dom] = (dayData.hourly[hour][dom] || 0) + addedSeconds;
      }

      await chrome.storage.local.set({ [todayStr]: dayData });
      console.log(`[Open Tabs] Added ${elapsed}s (x counts) to domains:`, domainCounts);
    });
  } catch (err) {
    console.error('Error in trackOpenTabs:', err);
  }
}

// Query active tab of last focused normal window and transition state
function updateActiveTab() {
  chrome.windows.getLastFocused((win) => {
    if (chrome.runtime.lastError || !win) {
      transitionActiveTab(null);
      return;
    }

    if (win.type === 'normal') {
      chrome.tabs.query({ active: true, windowId: win.id }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
          transitionActiveTab(null);
          return;
        }
        processTab(tabs[0]);
      });
    } else {
      // If the currently focused window is not a normal browser window (like our extension popup),
      // we ignore the focus change event so active session tracking continues on the previous browser tab.
    }
  });
}

function processTab(tab) {
  const urlToParse = tab ? (tab.url || tab.pendingUrl) : null;
  if (urlToParse) {
    const domain = getDomain(urlToParse);
    chrome.storage.local.get('settings').then(data => {
      const settings = data.settings || { excludedDomains: [], isPaused: false };
      if (domain && !isDomainExcluded(domain, settings)) {
        transitionActiveTab(domain);
      } else {
        transitionActiveTab(null);
      }
    });
  } else {
    transitionActiveTab(null);
  }
}

// Clean up old data to prevent storage bloat
async function performCleanup() {
  try {
    const data = await chrome.storage.local.get(null);
    const userSettings = data.settings || { autoCleanupDays: 30 };
    const cleanupDays = userSettings.autoCleanupDays;
    if (!cleanupDays) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cleanupDays);
    const cutoffStr = getLocalDateString(cutoffDate);

    const keysToRemove = [];
    for (const key of Object.keys(data)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        if (key < cutoffStr) {
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`Auto-cleanup: Removed data for dates: ${keysToRemove.join(', ')}`);
    }
  } catch (err) {
    console.error('Error during data cleanup:', err);
  }
}

// Setup alarms & state keys on init
async function handleInit() {
  await initializeSettings();
  await performCleanup();
  await migrateWwwDomains();
  
  // Set tracking markers to now
  await chrome.storage.local.set({ 
    lastRunTime: Date.now(),
    currentState: { activeDomain: null, startTime: Date.now() }
  });

  // Setup alarms
  ensureAlarms();

  updateActiveTab();
}

// Ensure alarms exist without clearing/resetting schedules on script load
function ensureAlarms() {
  chrome.alarms.get('track_open_tabs_alarm', (alarm) => {
    if (!alarm) {
      console.log('Creating track_open_tabs_alarm (5-second wake interval)');
      chrome.alarms.create('track_open_tabs_alarm', { periodInMinutes: 5 / 60 });
    }
  });
  chrome.alarms.get('flush_alarm', (alarm) => {
    if (!alarm) {
      console.log('Creating flush_alarm (1-minute cleanup interval)');
      chrome.alarms.create('flush_alarm', { periodInMinutes: 1 });
    }
  });
}

// --- Event Listeners ---

chrome.runtime.onInstalled.addListener(() => {
  console.log('Attention Replay installed.');
  handleInit();
  ensureAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Attention Replay started.');
  handleInit();
  ensureAlarms();
});

// React to tab/window changes
chrome.tabs.onActivated.addListener(() => {
  console.log('tabs.onActivated triggered');
  updateActiveTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // KEY FIX: Only fire when the URL actually changed on an active tab.
  // Without this guard, Chrome fires onUpdated for EVERY loading state change
  // (status: 'loading', status: 'complete', favIconUrl changes, etc.) even when
  // the user is on the same page — each one would call transitionActiveTab and
  // reset startTime, causing the timer to restart.
  // By checking changeInfo.url, we only react to genuine navigations.
  if (tab.active && changeInfo.url) {
    console.log('tabs.onUpdated: URL changed on active tab →', changeInfo.url);
    updateActiveTab();
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  console.log('windows.onFocusChanged triggered, windowId:', windowId);
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    transitionActiveTab(null);
  } else {
    chrome.windows.get(windowId, (win) => {
      if (chrome.runtime.lastError || !win) {
        updateActiveTab();
        return;
      }
      // If it is a normal browser window, update active tab tracking.
      if (win.type === 'normal') {
        updateActiveTab();
      }
      // If it's a popup (like the extension popup), we ignore the focus event 
      // and do not transition to null, so it keeps tracking the active tab!
    });
  }
});

// Idle State Monitoring
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener((state) => {
  console.log('chrome.idle.onStateChanged triggered, state:', state);
  if (state !== 'active') {
    transitionActiveTab(null);
  } else {
    updateActiveTab();
  }
});

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`[Alarm Fired Callback] Alarm "${alarm.name}" triggered at ${new Date().toLocaleTimeString()}`);
  if (alarm.name === 'track_open_tabs_alarm') {
    trackOpenTabs();
    // Piggyback badge refresh on the existing 5-second alarm so the icon stays
    // current even when the service worker was sleeping (setInterval pauses).
    updateLiveBadge();
  } else if (alarm.name === 'flush_alarm') {
    performCleanup();
  }
});

// Flush active tab time before deactivation and clear the badge
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending, flushing active time.');
  chrome.action.setBadgeText({ text: '' });
  transitionActiveTab(null);
});

// Active tracking loop (runs when SW is awake) — fires every 5 seconds.
setInterval(() => {
  trackOpenTabs();
}, 5000);

// Badge ticker — fires every 1 second so the icon time feels live and instant.
// Kept separate from trackOpenTabs to avoid storage writes every second.
setInterval(() => {
  updateLiveBadge();
}, 1000);

// Ensure alarms exist on script load
ensureAlarms();

// Initialize active tab tracking on script load, then immediately paint the badge
updateActiveTab();
updateLiveBadge();

// --- One-time startup backfill: classify all existing tracked domains ---
// Runs silently whenever the service worker starts.  Any domain that was
// already tracked before this feature existed gets a classification without
// requiring the user to visit it again.
(async () => {
  try {
    const allData = await chrome.storage.local.get(null);
    const existing = allData.customProductivity || {};
    let changed = false;

    for (const [key, val] of Object.entries(allData)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !val) continue;
      const allDomains = [
        ...Object.keys(val.totals || {}),
        ...Object.keys(val.activeTotals || {})
      ];
      for (const domain of allDomains) {
        if (existing[domain] === undefined) {
          existing[domain] = inferDomainProductivity(domain);
          changed = true;
          console.log(`[AutoClassify/Backfill] ${domain} → ${existing[domain]}`);
        }
      }
    }

    if (changed) {
      await chrome.storage.local.set({ customProductivity: existing });
      console.log('[AutoClassify/Backfill] Finished classifying historical domains.');
    }
  } catch (err) {
    console.warn('[AutoClassify/Backfill] Error:', err);
  }
})();

// Respond to live state queries
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_LIVE_STATE') {
    (async () => {
      const data = await chrome.storage.local.get(['currentState', 'lastRunTime', 'settings']);
      let current = data.currentState || { activeDomain: null, startTime: Date.now() };
      const lastRun = data.lastRunTime || Date.now();
      const settings = data.settings || { isPaused: false, excludedDomains: [] };

      // If activeDomain is null, query active tab immediately to recover state (e.g. after service worker suspension)
      if (!current.activeDomain && !settings.isPaused) {
        await new Promise(resolve => {
          chrome.windows.getLastFocused((win) => {
            if (chrome.runtime.lastError || !win || win.type !== 'normal') {
              resolve();
              return;
            }
            chrome.tabs.query({ active: true, windowId: win.id }, (tabs) => {
              if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
                resolve();
                return;
              }
              const tab = tabs[0];
              const urlToParse = tab.url || tab.pendingUrl;
              if (urlToParse) {
                const domain = getDomain(urlToParse);
                if (domain && !isDomainExcluded(domain, settings)) {
                  const now = Date.now();
                  const newState = { activeDomain: domain, startTime: now };
                  chrome.storage.local.set({ currentState: newState }).then(() => {
                    current = newState;
                    resolve();
                  });
                  return;
                }
              }
              resolve();
            });
          });
        });
      }

      // Calculate elapsed active focus time
      let activeElapsed = 0;
      if (current.activeDomain && !settings.isPaused && !isDomainExcluded(current.activeDomain, settings)) {
        activeElapsed = Math.round((Date.now() - current.startTime) / 1000);
      }

      // Calculate elapsed open tabs time
      let openElapsed = 0;
      if (!settings.isPaused) {
        openElapsed = Math.round((Date.now() - lastRun) / 1000);
      }

      // Query current open tab set
      chrome.tabs.query({}, (tabs) => {
        const openDomains = {};
        if (tabs && !settings.isPaused) {
          tabs.forEach(tab => {
            const urlToParse = tab.url || tab.pendingUrl;
            if (urlToParse) {
              const dom = getDomain(urlToParse);
              if (dom && !isDomainExcluded(dom, settings)) {
                openDomains[dom] = (openDomains[dom] || 0) + 1;
              }
            }
          });
        }

        sendResponse({
          activeDomain: current.activeDomain,
          activeElapsed: activeElapsed,
          openElapsed: openElapsed,
          openDomains: openDomains,
          isPaused: settings.isPaused
        });
      });
    })();
    return true; // Indicates asynchronous response
  }
});
