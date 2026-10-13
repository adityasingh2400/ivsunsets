import { chromium, devices } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

async function collectPageIssues(page) {
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  return consoleErrors;
}

async function verifyMessenger(page, issues) {
  const bird = page.locator('[data-testid="messenger-bird"]');
  const card = page.locator('[data-testid="messenger-card"]');

  const present = await Promise.all([
    bird.waitFor({ state: "attached", timeout: 10_000 }).then(() => true, () => false),
    card.waitFor({ state: "attached", timeout: 10_000 }).then(() => true, () => false),
  ]);

  if (!present.every(Boolean)) {
    issues.push("Messenger gull or its news card did not render.");
  }
}

async function carouselLabel(page) {
  return (await page.locator('[data-testid="carousel-label"]').textContent())?.toLowerCase() ?? "";
}

async function goToSection(page, label) {
  await page.getByRole("button", { name: `Go to ${label}` }).click();
  await page.waitForTimeout(2200);
  return carouselLabel(page);
}

async function swipeCarousel(page, direction) {
  const viewport = page.locator('[data-testid="carousel-viewport"]');
  const box = await viewport.boundingBox();

  if (!box) {
    throw new Error("Carousel viewport was not visible for swipe testing.");
  }

  const y = box.y + box.height * 0.58;
  const startX = direction === "left"
    ? box.x + box.width * 0.78
    : box.x + box.width * 0.22;
  const endX = direction === "left"
    ? box.x + box.width * 0.22
    : box.x + box.width * 0.78;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(700);
}

async function runDesktopFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const issues = [];
  const consoleErrors = await collectPageIssues(page);

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("text=IV Sunsets", { timeout: 15_000 });

  const scoreVisible = await page.locator("text=The sky might").first().isVisible().catch(() => false);
  if (!scoreVisible) {
    issues.push("Hero scene did not render the primary sunset message.");
  }

  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 4,
  );
  if (!noOverflow) {
    issues.push("Desktop horizontal overflow detected.");
  }

  await verifyMessenger(page, issues);

  /* Wheel-scroll like a user: the hero should hand off to the countdown */
  await page.mouse.move(720, 450);
  for (let i = 0; i < 20 && !(await carouselLabel(page)).includes("should i go"); i++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(120);
  }
  if (!(await carouselLabel(page)).includes("should i go")) {
    issues.push("Wheel scrolling did not rotate into the countdown section.");
  }

  if (!(await goToSection(page, "6-day outlook")).includes("6-day outlook")) {
    issues.push("Carousel did not rotate into the forecast section.");
  }

  if (!(await goToSection(page, "Sunset lab")).includes("sunset lab")) {
    issues.push("Carousel did not rotate into the simulator section.");
  }

  if (!(await goToSection(page, "Where to watch")).includes("where to watch")) {
    issues.push("Carousel did not rotate into the sunset spots section.");
  }

  /* Tall sections scroll their content before the carousel moves on */
  const dwell = await page.evaluate(async () => {
    const card = document.querySelector(".carousel-card.focused");
    const extra = card ? card.scrollHeight - card.clientHeight : 0;
    window.scrollBy({ top: extra, behavior: "instant" });
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { extra, scrolled: card?.scrollTop ?? 0 };
  });
  if (dwell.extra > 4 && Math.abs(dwell.scrolled - dwell.extra) > 4) {
    issues.push(`Spots section did not scroll through its content (${dwell.scrolled}/${dwell.extra}px).`);
  }

  const tiles = await page.locator(".leaflet-tile-loaded").count();
  if (tiles === 0) {
    issues.push("Map tiles did not load.");
  }

  await page.screenshot({ path: "./.tmp-desktop.png", fullPage: true });
  await browser.close();

  return { issues, consoleErrors };
}

async function runMobileFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const issues = [];
  const consoleErrors = await collectPageIssues(page);

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("text=IV Sunsets", { timeout: 15_000 });

  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 4,
  );
  if (!noOverflow) {
    issues.push("Mobile horizontal overflow detected.");
  }

  const dockVisible = await page.getByText("How was tonight?").isVisible().catch(() => false);
  if (!dockVisible) {
    issues.push("Main dock CTA was not visible on mobile.");
  }

  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.35, behavior: "instant" }));
  await page.waitForTimeout(700);
  const stillInitialLabel = await page.locator('[data-testid="carousel-label"]').textContent();
  if (!stillInitialLabel?.toLowerCase().includes("tonight")) {
    issues.push("Mobile carousel still rotates from vertical scrolling.");
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);

  await swipeCarousel(page, "left");
  const countdownLabel = await page.locator('[data-testid="carousel-label"]').textContent();
  if (!countdownLabel?.toLowerCase().includes("should i go")) {
    issues.push("Mobile left swipe did not rotate into the countdown section.");
  }

  await swipeCarousel(page, "left");
  const forecastLabel = await page.locator('[data-testid="carousel-label"]').textContent();
  if (!forecastLabel?.toLowerCase().includes("6-day outlook")) {
    issues.push("Mobile left swipe did not rotate into the forecast section.");
  }

  await swipeCarousel(page, "right");
  const backtrackLabel = await page.locator('[data-testid="carousel-label"]').textContent();
  if (!backtrackLabel?.toLowerCase().includes("should i go")) {
    issues.push("Mobile right swipe did not rotate back to the previous section.");
  }

  await page.screenshot({ path: "./.tmp-mobile.png", fullPage: true });
  await browser.close();

  return { issues, consoleErrors };
}

async function runReducedMotionFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const issues = [];
  const consoleErrors = await collectPageIssues(page);

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("text=IV Sunsets", { timeout: 15_000 });

  const prefersReduce = await page.evaluate(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  if (!prefersReduce) {
    issues.push("Reduced motion media query was not active.");
  }

  const titleVisible = await page.getByText("The sky").first().isVisible().catch(() => false);
  if (!titleVisible) {
    issues.push("Primary hero copy was not visible with reduced motion enabled.");
  }

  await browser.close();
  return { issues, consoleErrors };
}

async function run() {
  const desktop = await runDesktopFlow();
  const mobile = await runMobileFlow();
  const reducedMotion = await runReducedMotionFlow();

  const report = { desktop, mobile, reducedMotion };
  console.log(JSON.stringify(report, null, 2));

  const failures = [
    ...desktop.issues,
    ...mobile.issues,
    ...reducedMotion.issues,
    ...desktop.consoleErrors,
    ...mobile.consoleErrors,
    ...reducedMotion.consoleErrors,
  ];

  if (failures.length > 0) {
    process.exit(1);
  }
}

run();
