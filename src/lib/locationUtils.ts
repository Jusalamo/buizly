// Smart location detection utilities for meeting links and physical addresses

export interface ParsedLocation {
  type: 'virtual' | 'physical';
  platform?: 'zoom' | 'google_meet' | 'teams' | 'webex' | 'other';
  url?: string;
  displayLabel: string;
  icon: 'video' | 'map';
}

const VIRTUAL_PATTERNS = {
  zoom: /https?:\/\/([\w.-]*\.)?zoom\.us\/(j|my)\/[\w-]+/i,
  google_meet: /https?:\/\/meet\.google\.com\/[\w-]+/i,
  teams: /https?:\/\/teams\.(microsoft|live)\.com\/[\w\/?=&-]+/i,
  webex: /https?:\/\/([\w.-]*\.)?webex\.com\/[\w\/?=&-]+/i,
};

export function parseLocation(location: string | null | undefined): ParsedLocation | null {
  if (!location || location.trim() === '') return null;

  const trimmed = location.trim();

  // Check for virtual meeting links
  for (const [platform, pattern] of Object.entries(VIRTUAL_PATTERNS)) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        type: 'virtual',
        platform: platform as ParsedLocation['platform'],
        url: match[0],
        displayLabel: getPlatformLabel(platform),
        icon: 'video',
      };
    }
  }

  // Check if it's a generic URL (other virtual meeting)
  const urlPattern = /^https?:\/\/.+/i;
  if (urlPattern.test(trimmed)) {
    return {
      type: 'virtual',
      platform: 'other',
      url: trimmed,
      displayLabel: 'Join Meeting',
      icon: 'video',
    };
  }

  // It's a physical location
  return {
    type: 'physical',
    displayLabel: trimmed,
    icon: 'map',
  };
}

function getPlatformLabel(platform: string): string {
  switch (platform) {
    case 'zoom':
      return 'Join Zoom';
    case 'google_meet':
      return 'Join Google Meet';
    case 'teams':
      return 'Join Teams';
    case 'webex':
      return 'Join Webex';
    default:
      return 'Join Meeting';
  }
}

export function getGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function openLocation(location: ParsedLocation): void {
  if (location.type === 'virtual' && location.url) {
    window.open(location.url, '_blank');
  } else if (location.type === 'physical') {
    window.open(getGoogleMapsUrl(location.displayLabel), '_blank');
  }
}
