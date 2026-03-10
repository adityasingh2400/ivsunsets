import type { LocalPulseItem, LocalPulseKind, LocalPulsePayload } from "@/lib/types";

const FEED_REVALIDATE_SECONDS = 900;
const MAX_PULSE_ITEMS = 8;

const DAILY_NEXUS_IV_FEED = "https://dailynexus.com/category/news/isla_vista/feed/";
const DAILY_NEXUS_BLOTTER_FEED = "https://dailynexus.com/category/news/police-blotter-news/feed/";
const DAILY_NEXUS_MAIN_FEED = "https://dailynexus.com/feed/";
const UCSB_CALENDAR_API = "https://www.campuscalendar.ucsb.edu/api/2/events?days=7";
const AL_JAZEERA_ALL_FEED = "https://www.aljazeera.com/xml/rss/all.xml";
const BBC_US_CANADA_FEED = "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml";

const IV_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bisla vista\b/i, weight: 52 },
  { pattern: /\bi\.v\.\b/i, weight: 30 },
  { pattern: /\bivcsd\b/i, weight: 24 },
  { pattern: /\bivrpd\b/i, weight: 20 },
  { pattern: /\bdeltopia\b/i, weight: 44 },
  { pattern: /\bflopatio\b/i, weight: 40 },
  { pattern: /\bdel playa\b|\bdp\b/i, weight: 32 },
  { pattern: /\bpardall\b/i, weight: 20 },
  { pattern: /\bembarcadero\b/i, weight: 18 },
  { pattern: /\bucen\b/i, weight: 12 },
  { pattern: /\bstorke\b/i, weight: 10 },
  { pattern: /\bucsb\b/i, weight: 8 },
  { pattern: /\bgaucho\b/i, weight: 8 },
];

const STUDENT_HEAT_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bparty|parties|afterparty|kickback|nightlife\b/i, weight: 30 },
  { pattern: /\bfestival|block party|street fair|spring festival|lineup\b/i, weight: 32 },
  { pattern: /\bprotest|rally|march|walkout\b/i, weight: 24 },
  { pattern: /\bpolice|arrest|raid|crime|warning|emergency|fire\b/i, weight: 24 },
  { pattern: /\bnoise ordinance|ordinance|ban|shutdown|closure|suspended\b/i, weight: 26 },
  { pattern: /\bhousing|rent|parking|bike|tuition|tickets?|ticketmaster\b/i, weight: 18 },
  { pattern: /\bfree food|food|tacos|boba|ramen|pizza|cookout\b/i, weight: 16 },
  { pattern: /\bmusic|dj|dance|show|set|concert|comedy|karaoke\b/i, weight: 18 },
  { pattern: /\bviral|chaos|wild|packed|crowd|blowup\b/i, weight: 12 },
];

const LOCAL_LOW_SIGNAL_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bexhibition|gallery|installation|archives?|collection\b/i, weight: 36 },
  { pattern: /\blecture|symposium|seminar|colloquium|panel discussion\b/i, weight: 30 },
  { pattern: /\blibrary|faculty|research|award ceremony\b/i, weight: 24 },
  { pattern: /\bchancellor|provost|dean\b/i, weight: 18 },
  { pattern: /\borchestra|symphony|classical\b/i, weight: 34 },
];

const CALENDAR_HYPE_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bparty|afterparty|mixer|social\b/i, weight: 34 },
  { pattern: /\bdj|dance|karaoke|comedy|battle\b/i, weight: 30 },
  { pattern: /\bfestival|market|showcase|showdown|tournament\b/i, weight: 26 },
  { pattern: /\bconcert|live music|band|rapper|set\b/i, weight: 24 },
  { pattern: /\bfree food|food|cookout|bbq|snacks\b/i, weight: 18 },
  { pattern: /\bfilm|screening\b/i, weight: 14 },
];

const CALENDAR_HARD_NO = /\b(exhibition|gallery|installation|archives?|library|lecture|seminar|symposium|colloquium|orchestra|symphony|classical)\b/i;

const GLOBAL_BREAKING_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bwar|strike|missile|bomb|attack|raid|airstrike\b/i, weight: 34 },
  { pattern: /\bprotest|uprising|crackdown|coup|rebellion\b/i, weight: 24 },
  { pattern: /\belection|court|ruling|ban|tariff|sanctions\b/i, weight: 22 },
  { pattern: /\bborder|deport|immigration|military\b/i, weight: 20 },
  { pattern: /\bceasefire|hostage|conflict|crisis\b/i, weight: 26 },
  { pattern: /\btrump|congress|supreme court|white house\b/i, weight: 18 },
];

const GLOBAL_LOW_SIGNAL = /\b(opinion|podcast|review|fashion|style|opera|royal family|celebrity)\b/i;
const LOCAL_TRAGEDY_PENALTY = /\bfound dead|body|fatal|killed|funeral|memorial\b/i;
const LOCAL_EXPLICIT_FILTER = /\bchild sexual abuse|sexual abuse material\b/i;

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

function scoreIvSpecificity(text: string) {
  return scoreMatches(text, IV_KEYWORDS);
}

function scoreStudentHeat(text: string) {
  return scoreMatches(text, STUDENT_HEAT_KEYWORDS);
}

function scoreLocalLowSignal(text: string) {
  return scoreMatches(text, LOCAL_LOW_SIGNAL_KEYWORDS);
}

function scoreCalendarHype(text: string) {
  return scoreMatches(text, CALENDAR_HYPE_KEYWORDS);
}

function scoreGlobalBreaking(text: string) {
  return scoreMatches(text, GLOBAL_BREAKING_KEYWORDS);
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

function normalizeTitleKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function timeValue(input?: string) {
  if (!input) return 0;
  const millis = Date.parse(input);
  return Number.isFinite(millis) ? millis : 0;
}

function ageInDays(input?: string) {
  const millis = timeValue(input);
  if (!millis) return Number.POSITIVE_INFINITY;
  return (Date.now() - millis) / (1000 * 60 * 60 * 24);
}

function freshnessScore(input?: string) {
  const ageDays = ageInDays(input);
  if (!Number.isFinite(ageDays)) return -18;
  if (ageDays <= 1) return 40;
  if (ageDays <= 3) return 32;
  if (ageDays <= 7) return 24;
  if (ageDays <= 30) return 12;
  if (ageDays <= 90) return -4;
  if (ageDays <= 180) return -18;
  return -80;
}

function classifyKind(text: string): LocalPulseKind {
  if (/\bpolice|arrest|crime|warning|fire|emergency|raid\b/i.test(text)) return "safety";
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
      "User-Agent": "IVSunsets/1.0 (+https://ivs.example)",
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
      "User-Agent": "IVSunsets/1.0 (+https://ivs.example)",
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

async function fetchDailyNexusFeed(
  feedUrl: string,
  source: string,
  baseBoost: number,
  maxAgeDays: number,
  requireStudentHeat: boolean,
) {
  const xml = await fetchText(feedUrl);
  const items = parseRssItems(xml);

  return items
    .map((itemXml, index) => {
      const title = extractTagValue(itemXml, "title");
      const description = extractTagValue(itemXml, "description");
      const url = extractTagValue(itemXml, "link");
      const publishedAt = extractTagValue(itemXml, "pubDate");
      const categories = extractTagValues(itemXml, "category");
      const ageDays = ageInDays(publishedAt);
      const textBlob = `${title} ${description} ${categories.join(" ")}`;
      const localScore = scoreIvSpecificity(textBlob);
      const studentScore = scoreStudentHeat(textBlob);
      const lowSignalPenalty = scoreLocalLowSignal(textBlob);
      const kind = classifyKind(textBlob);
      const ivScore =
        baseBoost +
        localScore +
        studentScore +
        freshnessScore(publishedAt) -
        lowSignalPenalty +
        (kind === "event" ? 10 : 0) +
        (LOCAL_TRAGEDY_PENALTY.test(textBlob) ? -18 : 0) +
        (categories.some((value) => /\bfeatured\b/i.test(value)) ? 8 : 0) +
        (categories.some((value) => /\bnews\b/i.test(value)) ? 6 : 0);

      if (!title || !url) return null;
      if (ageDays > maxAgeDays) return null;
      if (LOCAL_EXPLICIT_FILTER.test(textBlob)) return null;
      if (categories.some((value) => /\bnexustentialism|opinion\b/i.test(value))) return null;
      if (requireStudentHeat && studentScore < 16 && localScore < 42) return null;
      if (ivScore < 36) return null;

      return buildBaseItem({
        id: `nexus-${index}-${normalizeTitleKey(title)}-${source.toLowerCase().replace(/[^a-z]+/g, "-")}`,
        title,
        snippet: compactSnippet(description || title, 118),
        url,
        source,
        kind,
        publishedAt: new Date(publishedAt || Date.now()).toISOString(),
        tags: categories,
        ivScore,
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

      const startTime = timeValue(startsAt);
      const soonBonus = startTime > 0 && Math.abs(startTime - now) <= 1000 * 60 * 60 * 36 ? 22 : 0;
      const hypeScore = scoreCalendarHype(textBlob);
      const localScore = scoreIvSpecificity(textBlob);
      const ivScore =
        12 +
        localScore +
        hypeScore +
        soonBonus +
        (event.free ? 10 : 0) +
        (event.recurring ? -20 : 0) +
        (CALENDAR_HARD_NO.test(textBlob) ? -70 : 0);

      if (!title || !url) return null;
      if (hypeScore < 20) return null;
      if (ivScore < 42) return null;

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
        tags: [...topics, ...eventTypes],
        ivScore,
      });
    })
    .filter((item): item is LocalPulseItem => Boolean(item));
}

async function fetchBreakingFeed(
  feedUrl: string,
  source: string,
  baseBoost: number,
  maxAgeDays: number,
) {
  const xml = await fetchText(feedUrl);
  const items = parseRssItems(xml);

  return items
    .map((itemXml, index) => {
      const title = extractTagValue(itemXml, "title");
      const description = extractTagValue(itemXml, "description");
      const url = extractTagValue(itemXml, "link");
      const publishedAt = extractTagValue(itemXml, "pubDate");
      const ageDays = ageInDays(publishedAt);
      const textBlob = `${title} ${description}`;
      const breakingScore = scoreGlobalBreaking(textBlob);
      const ivScore =
        baseBoost +
        breakingScore +
        freshnessScore(publishedAt) -
        (GLOBAL_LOW_SIGNAL.test(textBlob) ? 40 : 0);

      if (!title || !url) return null;
      if (ageDays > maxAgeDays) return null;
      if (breakingScore < 18) return null;
      if (ivScore < 40) return null;

      return buildBaseItem({
        id: `global-${index}-${normalizeTitleKey(title)}-${source.toLowerCase().replace(/[^a-z]+/g, "-")}`,
        title,
        snippet: compactSnippet(description || title, 112),
        url,
        source,
        kind: "news",
        publishedAt: new Date(publishedAt || Date.now()).toISOString(),
        tags: ["breaking", "world"],
        ivScore,
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

    return timeValue(right.startsAt || right.publishedAt) - timeValue(left.startsAt || left.publishedAt);
  });
}

function buildLineup(localItems: LocalPulseItem[], globalItems: LocalPulseItem[]) {
  const local = [...localItems];
  const global = [...globalItems];
  const lineup: LocalPulseItem[] = [];

  while (lineup.length < MAX_PULSE_ITEMS && (local.length > 0 || global.length > 0)) {
    if (local.length > 0) lineup.push(local.shift()!);
    if (lineup.length >= MAX_PULSE_ITEMS) break;
    if (local.length > 0) lineup.push(local.shift()!);
    if (lineup.length >= MAX_PULSE_ITEMS) break;
    if (global.length > 0) lineup.push(global.shift()!);
  }

  while (lineup.length < MAX_PULSE_ITEMS && local.length > 0) {
    lineup.push(local.shift()!);
  }

  while (lineup.length < MAX_PULSE_ITEMS && global.length > 0) {
    lineup.push(global.shift()!);
  }

  return lineup.slice(0, MAX_PULSE_ITEMS);
}

export async function fetchLocalPulse(): Promise<LocalPulsePayload> {
  const settled = await Promise.allSettled([
    fetchDailyNexusFeed(DAILY_NEXUS_IV_FEED, "Daily Nexus | IV", 24, 120, false),
    fetchDailyNexusFeed(DAILY_NEXUS_BLOTTER_FEED, "Daily Nexus | Blotter", 18, 120, false),
    fetchDailyNexusFeed(DAILY_NEXUS_MAIN_FEED, "Daily Nexus | Campus", 10, 45, true),
    fetchCampusCalendarHotEvents(),
    fetchBreakingFeed(AL_JAZEERA_ALL_FEED, "Al Jazeera | World", 12, 4),
    fetchBreakingFeed(BBC_US_CANADA_FEED, "BBC | US", 10, 4),
  ]);

  const allItems = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const ranked = dedupeAndRank(allItems);
  const localItems = ranked.filter((item) =>
    /Daily Nexus|Campus heat|fallback|IV/i.test(item.source),
  );
  const globalItems = ranked.filter((item) => !localItems.includes(item));
  const lineup = buildLineup(localItems, globalItems);

  return {
    generatedAt: new Date().toISOString(),
    items: lineup.length > 0 ? lineup : buildFallbackPulse(),
  };
}
