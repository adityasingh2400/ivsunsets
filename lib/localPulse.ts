import type { LocalPulseItem, LocalPulseKind, LocalPulsePayload } from "@/lib/types";

/**
 * The "IV pulse" feed the messenger gull carries.
 *
 * Ranking philosophy: relevance decides how interesting a story is, but
 * recency decays it multiplicatively (half-life per feed). A two-month-old
 * Isla Vista story can never outrank this week's news no matter how many
 * keywords it hits — that was the bug that froze the feed.
 */

const FEED_REVALIDATE_SECONDS = 600;
const MAX_PULSE_ITEMS = 8;
const MAX_ITEMS_PER_SOURCE = 3;

const DAILY_NEXUS_IV_FEED = "https://dailynexus.com/category/news/isla_vista/feed/";
const DAILY_NEXUS_BLOTTER_FEED = "https://dailynexus.com/category/news/police-blotter-news/feed/";
const DAILY_NEXUS_MAIN_FEED = "https://dailynexus.com/feed/";
const UCSB_CALENDAR_API = "https://www.campuscalendar.ucsb.edu/api/2/events?days=7";
const NOOZHAWK_FEED = "https://www.noozhawk.com/feed/";
const SB_INDEPENDENT_FEED = "https://www.independent.com/feed/";
const KEYT_FEED = "https://keyt.com/feed/";
const GOOGLE_NEWS_IV_FEED =
  "https://news.google.com/rss/search?q=%22Isla+Vista%22+OR+%22UC+Santa+Barbara%22+OR+UCSB+OR+Goleta&hl=en-US&gl=US&ceid=US:en";
const AL_JAZEERA_ALL_FEED = "https://www.aljazeera.com/xml/rss/all.xml";
const BBC_US_CANADA_FEED = "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml";

const IV_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bisla vista\b/i, weight: 40 },
  { pattern: /\bi\.v\.\b/i, weight: 26 },
  { pattern: /\bivcsd\b/i, weight: 22 },
  { pattern: /\bivrpd\b/i, weight: 18 },
  { pattern: /\bdeltopia\b/i, weight: 40 },
  { pattern: /\bfloatopia\b/i, weight: 36 },
  { pattern: /\bdel playa\b/i, weight: 30 },
  { pattern: /\bpardall\b/i, weight: 20 },
  { pattern: /\bembarcadero\b/i, weight: 16 },
  { pattern: /\bsands beach\b|\bcampus point\b|\bdevereux\b/i, weight: 16 },
  { pattern: /\bucen\b/i, weight: 12 },
  { pattern: /\bstorke\b/i, weight: 10 },
  { pattern: /\bucsb\b|\buc santa barbara\b/i, weight: 12 },
  { pattern: /\bgaucho\b/i, weight: 8 },
  { pattern: /\bgoleta\b/i, weight: 10 },
  { pattern: /\bsanta barbara\b/i, weight: 8 },
];

const STUDENT_HEAT_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bparty|parties|afterparty|kickback|nightlife\b/i, weight: 24 },
  { pattern: /\bfestival|block party|street fair|spring festival|lineup\b/i, weight: 26 },
  { pattern: /\bprotest|rally|march|walkout\b/i, weight: 20 },
  { pattern: /\bpolice|arrest|raid|crime|warning|emergency|fire|evacuation\b/i, weight: 20 },
  { pattern: /\bnoise ordinance|ordinance|ban|shutdown|closure|suspended\b/i, weight: 20 },
  { pattern: /\bhousing|rent|parking|bike|tuition|tickets?\b/i, weight: 14 },
  { pattern: /\bfree food|food|tacos|boba|ramen|pizza|cookout\b/i, weight: 12 },
  { pattern: /\bmusic|dj|dance|show|set|concert|comedy|karaoke\b/i, weight: 14 },
  { pattern: /\bsurf|waves|swell|beach|bluff|coastal\b/i, weight: 12 },
  { pattern: /\bsunset|golden hour\b/i, weight: 14 },
];

const LOCAL_LOW_SIGNAL_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bexhibition|gallery|installation|archives?|collection\b/i, weight: 30 },
  { pattern: /\blecture|symposium|seminar|colloquium|panel discussion\b/i, weight: 26 },
  { pattern: /\blibrary hours|faculty senate|award ceremony\b/i, weight: 20 },
  { pattern: /\bchancellor|provost|dean\b/i, weight: 12 },
  { pattern: /\borchestra|symphony|classical\b/i, weight: 28 },
  { pattern: /\bobituar|in memoriam\b/i, weight: 40 },
  { pattern: /\breview \||\breview:|film review|book review|theater review|opinion\b/i, weight: 32 },
];

const CALENDAR_HYPE_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bparty|afterparty|mixer|social\b/i, weight: 30 },
  { pattern: /\bdj|dance|karaoke|comedy|battle\b/i, weight: 26 },
  { pattern: /\bfestival|market|showcase|showdown|tournament\b/i, weight: 24 },
  { pattern: /\bconcert|live music|band|rapper|set\b/i, weight: 22 },
  { pattern: /\bfree food|food|cookout|bbq|snacks\b/i, weight: 16 },
  { pattern: /\bfilm|screening\b/i, weight: 12 },
];

const CALENDAR_HARD_NO =
  /\b(exhibition|gallery|installation|archives?|library|lecture|seminar|symposium|colloquium|orchestra|symphony|classical)\b/i;

const GLOBAL_INTEREST_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bwar|strike|missile|attack|airstrike|ceasefire|hostage|conflict|crisis\b/i, weight: 26 },
  { pattern: /\bprotest|uprising|crackdown|coup\b/i, weight: 20 },
  { pattern: /\belection|court|ruling|ban|tariff|sanctions\b/i, weight: 18 },
  { pattern: /\bborder|deport|immigration|military\b/i, weight: 16 },
  { pattern: /\btrump|congress|supreme court|white house\b/i, weight: 16 },
  { pattern: /\bbreakthrough|discovery|first time|record\b/i, weight: 14 },
  { pattern: /\bai\b|\bartificial intelligence|spacex|nasa|launch\b/i, weight: 16 },
  { pattern: /\bwildfire|earthquake|storm|heat wave|atmospheric river\b/i, weight: 20 },
  { pattern: /\bcalifornia\b/i, weight: 14 },
];

const GLOBAL_LOW_SIGNAL =
  /\b(opinion|podcast|review|fashion|style|opera|royal family|celebrity|horoscope|recipe|cricket|rugby)\b/i;
const LOCAL_TRAGEDY_PENALTY = /\bfound dead|body|fatal|killed|funeral|memorial\b/i;
const LOCAL_EXPLICIT_FILTER = /\bchild sexual abuse|sexual abuse material\b/i;
const SB_REGION_REQUIRED =
  /\b(santa barbara|isla vista|goleta|ucsb|uc santa barbara|montecito|carpinteria|lompoc|santa ynez|gaviota|central coast|sb county)\b/i;

interface LocalistTopic {
  name?: string;
}

interface LocalistEventInstance {
  start?: string;
}

interface LocalistEvent {
  id?: number;
  title?: string;
  url?: string;
  localist_url?: string;
  description_text?: string;
  updated_at?: string;
  created_at?: string;
  recurring?: boolean;
  free?: boolean;
  location_name?: string;
  room_number?: string;
  geo?: {
    city?: string;
  };
  event_instances?: Array<{
    event_instance?: LocalistEventInstance;
  }>;
  filters?: {
    event_topic?: LocalistTopic[];
    event_types?: LocalistTopic[];
  };
}

interface LocalistApiResponse {
  events?: Array<{
    event?: LocalistEvent;
  }>;
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&rsquo;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, '"')
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&hellip;/gi, "...")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value: string) {
  return collapseWhitespace(
    decodeHtmlEntities(value)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function compactSnippet(value: string, maxLength = 132) {
  const stripped = stripHtml(value);
  if (stripped.length <= maxLength) return stripped;
  const shortened = stripped.slice(0, maxLength).replace(/\s+\S*$/, "");
  return `${shortened}...`;
}

function extractTagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? collapseWhitespace(decodeHtmlEntities(match[1])) : "";
}

function extractTagValues(xml: string, tag: string) {
  return Array.from(
    xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi")),
  )
    .map((match) => collapseWhitespace(decodeHtmlEntities(match[1])))
    .filter(Boolean);
}

function parseRssItems(xml: string) {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => match[0]);
}

function scoreMatches(text: string, patterns: Array<{ pattern: RegExp; weight: number }>) {
  return patterns.reduce((sum, entry) => sum + (entry.pattern.test(text) ? entry.weight : 0), 0);
}

function cleanUrl(value: string) {
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith("utm_")) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

/** Google News titles arrive as "Headline - Publication"; strip the suffix. */
function stripPublisherSuffix(title: string) {
  return title.replace(/\s+-\s+[^-]{2,40}$/, "").trim() || title;
}

function normalizeTitleKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function timeValue(input?: string) {
  if (!input) return 0;
  const millis = Date.parse(input);
  return Number.isFinite(millis) ? millis : 0;
}

function ageInHours(input?: string) {
  const millis = timeValue(input);
  if (!millis) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - millis) / (1000 * 60 * 60));
}

/**
 * Multiplicative recency decay. Relevance keywords decide how interesting a
 * story is; this decides whether it is still news. halfLifeHours controls
 * how fast each feed goes stale.
 */
function recencyMultiplier(publishedAt: string | undefined, halfLifeHours: number) {
  const age = ageInHours(publishedAt);
  if (!Number.isFinite(age)) return 0.1;
  return Math.pow(2, -age / halfLifeHours);
}

function classifyKind(text: string): LocalPulseKind {
  if (/\bpolice|arrest|crime|warning|fire|emergency|raid|evacuation\b/i.test(text)) return "safety";
  if (/\bparty|festival|concert|show|dj|dance|food|market|comedy|screening|mixer\b/i.test(text)) {
    return "event";
  }
  return "news";
}

function buildFallbackPulse(): LocalPulseItem[] {
  return [
    {
      id: "fallback-iv",
      title: "Pardall and Del Playa still decide whether IV feels alive tonight.",
      snippet: "The live feeds are reloading, so the messenger bird is falling back to house rules for a minute.",
      url: "https://dailynexus.com/category/news/isla_vista/",
      source: "IV fallback",
      kind: "news",
      publishedAt: new Date().toISOString(),
      tags: ["fallback", "iv"],
      ivScore: 10,
    },
    {
      id: "fallback-world",
      title: "When the local feeds are quiet, watch for the next thing everybody is about to talk about.",
      snippet: "The bird will repopulate as soon as the public sources answer again.",
      url: "https://www.aljazeera.com/",
      source: "World fallback",
      kind: "news",
      publishedAt: new Date().toISOString(),
      tags: ["fallback", "world"],
      ivScore: 9,
    },
  ];
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; IVSunsets/1.0; +https://iv-sunsets.vercel.app)",
    },
    next: { revalidate: FEED_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`${url} failed with status ${response.status}`);
  }

  return response.text();
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; IVSunsets/1.0; +https://iv-sunsets.vercel.app)",
    },
    next: { revalidate: FEED_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`${url} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function buildBaseItem(item: LocalPulseItem): LocalPulseItem {
  return {
    ...item,
    url: cleanUrl(item.url),
  };
}

interface RssFeedConfig {
  feedUrl: string;
  source: string;
  /** Starting relevance before keyword scoring. */
  baseRelevance: number;
  /** Items older than this are dropped outright. */
  maxAgeDays: number;
  /** Recency half-life: how fast this feed's stories stop being news. */
  halfLifeHours: number;
  /** Drop items that never mention the Santa Barbara region. */
  requireRegion?: boolean;
  /** Drop items unless they carry student-relevant heat or strong IV signal. */
  requireStudentHeat?: boolean;
  /** Use global-interest keywords instead of local ones. */
  globalInterest?: boolean;
  /** Google News style "Headline - Publication" titles. */
  stripSuffix?: boolean;
  /** Skip the RSS description when it is link-soup (Google News). */
  ignoreDescription?: boolean;
  /** Minimum composite score to make the candidate pool at all. */
  minScore: number;
}

async function fetchRssFeed(config: RssFeedConfig): Promise<LocalPulseItem[]> {
  const xml = await fetchText(config.feedUrl);
  const items = parseRssItems(xml);
  const sourceSlug = config.source.toLowerCase().replace(/[^a-z]+/g, "-");

  return items
    .map((itemXml, index) => {
      const rawTitle = extractTagValue(itemXml, "title");
      const title = config.stripSuffix ? stripPublisherSuffix(rawTitle) : rawTitle;
      const description = config.ignoreDescription ? "" : extractTagValue(itemXml, "description");
      const url = extractTagValue(itemXml, "link");
      const publishedAt = extractTagValue(itemXml, "pubDate");
      const categories = extractTagValues(itemXml, "category");
      const textBlob = `${title} ${description} ${categories.join(" ")}`;

      if (!title || !url) return null;
      if (ageInHours(publishedAt) > config.maxAgeDays * 24) return null;
      if (LOCAL_EXPLICIT_FILTER.test(textBlob)) return null;
      if (categories.some((value) => /\bnexustentialism|opinion\b/i.test(value))) return null;
      if (config.requireRegion && !SB_REGION_REQUIRED.test(textBlob)) return null;

      let relevance = config.baseRelevance;

      if (config.globalInterest) {
        relevance += scoreMatches(textBlob, GLOBAL_INTEREST_KEYWORDS);
        if (GLOBAL_LOW_SIGNAL.test(textBlob)) relevance -= 35;
      } else {
        const localScore = scoreMatches(textBlob, IV_KEYWORDS);
        const heatScore = scoreMatches(textBlob, STUDENT_HEAT_KEYWORDS);
        relevance += localScore + heatScore;
        relevance -= scoreMatches(textBlob, LOCAL_LOW_SIGNAL_KEYWORDS);
        if (LOCAL_TRAGEDY_PENALTY.test(textBlob)) relevance -= 16;
        if (config.requireStudentHeat && heatScore < 12 && localScore < 30) return null;
      }

      const kind = classifyKind(textBlob);
      if (kind === "event") relevance += 8;

      const composite =
        Math.max(relevance, 1) * recencyMultiplier(publishedAt, config.halfLifeHours);

      if (composite < config.minScore) return null;

      return buildBaseItem({
        id: `${sourceSlug}-${index}-${normalizeTitleKey(title).slice(0, 60)}`,
        title,
        snippet: compactSnippet(description || title, 118),
        url,
        source: config.source,
        kind,
        publishedAt: new Date(timeValue(publishedAt) || Date.now()).toISOString(),
        tags: categories.slice(0, 6),
        ivScore: Math.round(composite),
      });
    })
    .filter((item): item is LocalPulseItem => Boolean(item));
}

function buildCalendarSnippet(event: LocalistEvent, startsAt: string, locationLabel: string) {
  const description = compactSnippet(event.description_text ?? "", 116);
  if (description) return description;

  const start = timeValue(startsAt);
  const timeLabel =
    start > 0
      ? new Date(start).toLocaleString("en-US", {
          weekday: "short",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Los_Angeles",
        })
      : "Soon";

  return locationLabel ? `${timeLabel} at ${locationLabel}.` : `${timeLabel} around campus.`;
}

async function fetchCampusCalendarHotEvents() {
  const payload = await fetchJson<LocalistApiResponse>(UCSB_CALENDAR_API);
  const now = Date.now();

  return (payload.events ?? [])
    .map((entry) => entry.event)
    .filter((event): event is LocalistEvent => Boolean(event))
    .map((event) => {
      const title = collapseWhitespace(event.title ?? "");
      const startsAt =
        event.event_instances?.[0]?.event_instance?.start ??
        event.updated_at ??
        event.created_at ??
        new Date().toISOString();
      const url = event.localist_url || event.url || "";
      const topics = (event.filters?.event_topic ?? [])
        .map((topic) => collapseWhitespace(topic.name ?? ""))
        .filter(Boolean);
      const eventTypes = (event.filters?.event_types ?? [])
        .map((topic) => collapseWhitespace(topic.name ?? ""))
        .filter(Boolean);
      const locationLabel = collapseWhitespace(
        [event.location_name, event.room_number].filter(Boolean).join(" · "),
      );
      const textBlob = [
        title,
        event.description_text ?? "",
        locationLabel,
        event.geo?.city ?? "",
        topics.join(" "),
        eventTypes.join(" "),
      ]
        .join(" ")
        .trim();

      if (!title || !url) return null;
      if (CALENDAR_HARD_NO.test(textBlob)) return null;

      const startTime = timeValue(startsAt);
      if (startTime > 0 && startTime < now - 1000 * 60 * 60 * 3) return null; // already over
      if (startTime > now + 1000 * 60 * 60 * 24 * 7) return null;

      const hypeScore = scoreMatches(textBlob, CALENDAR_HYPE_KEYWORDS);
      if (hypeScore < 14) return null;

      const hoursUntil = startTime > 0 ? Math.max(0, (startTime - now) / (1000 * 60 * 60)) : 72;
      /* Events get hotter as they approach instead of decaying like news. */
      const proximityMultiplier = Math.pow(2, -hoursUntil / 60);
      const relevance =
        14 +
        scoreMatches(textBlob, IV_KEYWORDS) +
        hypeScore +
        (event.free ? 8 : 0) +
        (event.recurring ? -16 : 0);
      const composite = Math.max(relevance, 1) * (0.45 + 0.55 * proximityMultiplier);

      if (composite < 18) return null;

      return buildBaseItem({
        id: `calendar-${event.id ?? normalizeTitleKey(title)}`,
        title,
        snippet: buildCalendarSnippet(event, startsAt, locationLabel),
        url,
        source: "Campus heat",
        kind: "event",
        publishedAt: new Date(event.updated_at || event.created_at || startsAt).toISOString(),
        startsAt,
        locationLabel: locationLabel || event.geo?.city || "UCSB",
        tags: [...topics, ...eventTypes].slice(0, 6),
        ivScore: Math.round(composite),
      });
    })
    .filter((item): item is LocalPulseItem => Boolean(item));
}

function dedupeAndRank(items: LocalPulseItem[]) {
  const seen = new Map<string, LocalPulseItem>();

  for (const item of items) {
    const key = normalizeTitleKey(item.title);
    const existing = seen.get(key);
    if (!existing || item.ivScore > existing.ivScore) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values()).sort((left, right) => {
    if (right.ivScore !== left.ivScore) {
      return right.ivScore - left.ivScore;
    }

    return (
      timeValue(right.startsAt || right.publishedAt) -
      timeValue(left.startsAt || left.publishedAt)
    );
  });
}

/**
 * Interleave two local items per global item, capping any single source so
 * one prolific feed cannot monopolize the bird.
 */
function buildLineup(localItems: LocalPulseItem[], globalItems: LocalPulseItem[]) {
  const sourceCounts = new Map<string, number>();
  const lineup: LocalPulseItem[] = [];

  const takeNext = (pool: LocalPulseItem[]) => {
    const index = pool.findIndex(
      (item) => (sourceCounts.get(item.source) ?? 0) < MAX_ITEMS_PER_SOURCE,
    );
    const pickIndex = index === -1 ? (pool.length > 0 ? 0 : -1) : index;
    if (pickIndex === -1) return false;
    const [item] = pool.splice(pickIndex, 1);
    sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
    lineup.push(item);
    return true;
  };

  const local = [...localItems];
  const global = [...globalItems];

  while (lineup.length < MAX_PULSE_ITEMS && (local.length > 0 || global.length > 0)) {
    let progressed = false;
    if (local.length > 0) progressed = takeNext(local) || progressed;
    if (lineup.length >= MAX_PULSE_ITEMS) break;
    if (local.length > 0) progressed = takeNext(local) || progressed;
    if (lineup.length >= MAX_PULSE_ITEMS) break;
    if (global.length > 0) progressed = takeNext(global) || progressed;
    if (!progressed) break;
  }

  return lineup.slice(0, MAX_PULSE_ITEMS);
}

export async function fetchLocalPulse(): Promise<LocalPulsePayload> {
  const settled = await Promise.allSettled([
    fetchRssFeed({
      feedUrl: DAILY_NEXUS_IV_FEED,
      source: "Daily Nexus | IV",
      baseRelevance: 30,
      maxAgeDays: 28,
      halfLifeHours: 96,
      minScore: 6,
    }),
    fetchRssFeed({
      feedUrl: DAILY_NEXUS_BLOTTER_FEED,
      source: "Daily Nexus | Blotter",
      baseRelevance: 22,
      maxAgeDays: 21,
      halfLifeHours: 72,
      minScore: 6,
    }),
    fetchRssFeed({
      feedUrl: DAILY_NEXUS_MAIN_FEED,
      source: "Daily Nexus | Campus",
      baseRelevance: 12,
      maxAgeDays: 14,
      halfLifeHours: 72,
      requireStudentHeat: true,
      minScore: 8,
    }),
    fetchCampusCalendarHotEvents(),
    fetchRssFeed({
      feedUrl: NOOZHAWK_FEED,
      source: "Noozhawk | SB",
      baseRelevance: 18,
      maxAgeDays: 4,
      halfLifeHours: 36,
      minScore: 8,
    }),
    fetchRssFeed({
      feedUrl: SB_INDEPENDENT_FEED,
      source: "SB Independent",
      baseRelevance: 18,
      maxAgeDays: 5,
      halfLifeHours: 48,
      minScore: 8,
    }),
    fetchRssFeed({
      feedUrl: KEYT_FEED,
      source: "KEYT | SB",
      baseRelevance: 12,
      maxAgeDays: 2,
      halfLifeHours: 24,
      requireRegion: true,
      minScore: 8,
    }),
    fetchRssFeed({
      feedUrl: GOOGLE_NEWS_IV_FEED,
      source: "Around IV",
      baseRelevance: 10,
      maxAgeDays: 6,
      halfLifeHours: 48,
      stripSuffix: true,
      ignoreDescription: true,
      minScore: 8,
    }),
    fetchRssFeed({
      feedUrl: AL_JAZEERA_ALL_FEED,
      source: "Al Jazeera | World",
      baseRelevance: 14,
      maxAgeDays: 2,
      halfLifeHours: 18,
      globalInterest: true,
      minScore: 8,
    }),
    fetchRssFeed({
      feedUrl: BBC_US_CANADA_FEED,
      source: "BBC | US",
      baseRelevance: 14,
      maxAgeDays: 2,
      halfLifeHours: 18,
      globalInterest: true,
      minScore: 8,
    }),
  ]);

  const allItems = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const ranked = dedupeAndRank(allItems);
  const globalSources = /Al Jazeera|BBC/i;
  const localItems = ranked.filter((item) => !globalSources.test(item.source));
  const globalItems = ranked.filter((item) => globalSources.test(item.source));
  const lineup = buildLineup(localItems, globalItems);

  return {
    generatedAt: new Date().toISOString(),
    items: lineup.length > 0 ? lineup : buildFallbackPulse(),
  };
}
