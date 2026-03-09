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

async function verifyMessengerCycle(page, issues) {
  const perch = page.locator('[data-testid="messenger-perch"]');
  await perch.waitFor({ state: "visible", timeout: 10_000 });

  const activeBird = page.locator('[data-testid="messenger-bird"]');
  await activeBird.waitFor({ state: "visible", timeout: 8_000 });

  const diveStart = await activeBird.boundingBox();
  await page.waitForTimeout(500);
  const diveMid = await activeBird.boundingBox();

  if (!diveStart || !diveMid || diveMid.y <= diveStart.y + 10) {
    issues.push("Messenger bird dive arc was not visibly descending.");
  }

  await page.waitForTimeout(2100);
  const cardOpacity = await page
    .locator('[data-testid="messenger-card"]')
    .evaluate((node) => Number.parseFloat(getComputedStyle(node).opacity));

  if (!(cardOpacity > 0.45)) {
    issues.push("Messenger news card did not become clearly visible.");
  }

  await page.waitForTimeout(5000);
  const perchVisibleAgain = await perch.isVisible();
  const activeBirdVisible = await activeBird.isVisible().catch(() => false);

  if (!perchVisibleAgain || activeBirdVisible) {
    issues.push("Messenger bird did not return to its perch after the carry cycle.");
  }
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

  await verifyMessengerCycle(page, issues);

  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.95, behavior: "instant" }));
  await page.waitForTimeout(900);
  const labelOne = await page.locator('[data-testid="carousel-label"]').textContent();
  if (!labelOne?.toLowerCase().includes("should i go")) {
    issues.push("Carousel did not rotate into the countdown section.");
  }

  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.9, behavior: "instant" }));
  await page.waitForTimeout(900);
  const labelTwo = await page.locator('[data-testid="carousel-label"]').textContent();
  if (!labelTwo?.toLowerCase().includes("6-day forecast")) {
    issues.push("Carousel did not rotate into the forecast section.");
  }

  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 2.85, behavior: "instant" }));
  await page.waitForTimeout(900);
  const labelThree = await page.locator('[data-testid="carousel-label"]').textContent();
  if (!labelThree?.toLowerCase().includes("where to watch")) {
    issues.push("Carousel did not rotate into the sunset spots section.");
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

  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.9, behavior: "instant" }));
  await page.waitForTimeout(900);
  const forecastLabel = await page.locator('[data-testid="carousel-label"]').textContent();
  if (!forecastLabel?.toLowerCase().includes("6-day forecast")) {
    issues.push("Forecast section was not reachable on mobile.");
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
