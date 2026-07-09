// Attention Replay - Shared Productivity Configuration

const DEFAULT_PRODUCTIVITY = {
  // Productive
  'github.com': 'productive',
  'notion.so': 'productive',
  'slack.com': 'productive',
  'docs.google.com': 'productive',
  'figma.com': 'productive',
  'gitlab.com': 'productive',
  'trello.com': 'productive',
  'atlassian.com': 'productive',
  'udemy.com': 'productive',
  'coursera.org': 'productive',
  'khanacademy.org': 'productive',
  'claude.ai': 'productive',
  'chatgpt.com': 'productive',
  'openai.com': 'productive',
  'wikipedia.org': 'productive',
  'stackoverflow.com': 'productive',
  'medium.com': 'productive',
  'github.io': 'productive',
  'gitlab.io': 'productive',
  'bitbucket.org': 'productive',
  
  // Distracting
  'facebook.com': 'distracting',
  'twitter.com': 'distracting',
  'x.com': 'distracting',
  'instagram.com': 'distracting',
  'reddit.com': 'distracting',
  'tiktok.com': 'distracting',
  'discord.com': 'distracting',
  'youtube.com': 'distracting',
  'netflix.com': 'distracting',
  'twitch.tv': 'distracting',
  'spotify.com': 'distracting',
  'pinterest.com': 'distracting',
  'tumblr.com': 'distracting'
};

const PRODUCTIVITY_COLORS = {
  'productive': '#10b981',   // emerald green
  'neutral': '#6b7280',      // cool gray
  'distracting': '#ef4444'   // red
};

function getDomainProductivity(domain, overrides = {}) {
  if (!domain) return 'neutral';
  const clean = domain.toLowerCase().trim();
  if (overrides[clean]) return overrides[clean];
  if (DEFAULT_PRODUCTIVITY[clean]) return DEFAULT_PRODUCTIVITY[clean];
  return 'neutral';
}

function calculateProductivityScore(domainSecondsArray, overrides = {}) {
  let productiveTime = 0;
  let distractingTime = 0;
  let neutralTime = 0;
  let totalTime = 0;

  domainSecondsArray.forEach(([domain, seconds]) => {
    const type = getDomainProductivity(domain, overrides);
    totalTime += seconds;
    if (type === 'productive') productiveTime += seconds;
    else if (type === 'distracting') distractingTime += seconds;
    else neutralTime += seconds;
  });

  if (totalTime === 0) return 100; // default to perfect if no time tracked
  
  // Focus Score formula: (Productive + 0.5 * Neutral) / Total * 100
  return Math.round(((productiveTime + 0.5 * neutralTime) / totalTime) * 100);
}
