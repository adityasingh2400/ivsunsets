import { chromium, devices } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

function parseLiveSimulatorScore() {
  const simulator = document.querySelector("#simulator");

  if (!simulator) {
    return null;
  }

  const labels = Array.from(simulator.querySelectorAll("p"));
  const liveScoreLabel = labels.find(
    (node) => node.textContent?.trim().toLowerCase() === "live score",
  );

  const scoreNode = liveScoreLabel?.parentElement?.querySelector("p:nth-of-type(2)");

  if (!scoreNode?.textContent) {
    return null;
  }

  const numeric = Number.parseInt(scoreNode.textContent.trim(), 10);
  return Number.isNaN(numeric) ? null : numeric;
}

async function runDesktopFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const issues = [];
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("text=IV Sunsets", { timeout: 15_000 });

  const forecastCardCount = await page.locator("#forecast article").count();
  if (forecastCardCount < 6) {
    issues.push(`Expected at least 6 forecast cards, found ${forecastCardCount}.`);
  }

  const bestBadgeCount = await page.getByText("Best chance").count();
  if (bestBadgeCount !== 1) {
    issues.push(`Expected 1 \"Best chance\" card, found ${bestBadgeCount}.`);
  }

  await page.locator("#simulator").scrollIntoViewIfNeeded();
  await page.waitForSelector("#sim-highCloud", { timeout: 10_000 });

  const scoreBefore = await page.evaluate(parseLiveSimulatorScore);

  const highCloudSlider = page.locator("#sim-highCloud");
  await highCloudSlider.focus();
  for (let index = 0; index < 28; index += 1) {
    await highCloudSlider.press("ArrowRight");
  }

  const lowCloudSlider = page.locator("#sim-lowCloud");
  await lowCloudSlider.focus();
  for (let index = 0; index < 10; index += 1) {
    await lowCloudSlider.press("ArrowLeft");
  }

  await page.waitForTimeout(250);
  const scoreAfter = await page.evaluate(parseLiveSimulatorScore);

  if (scoreBefore === null || scoreAfter === null) {
    issues.push("Simulator live score was not readable.");
  } else if (scoreBefore === scoreAfter) {
    issues.push("Simulator score did not change after slider updates.");
  }

  const reasonChipCount = await page
    .locator("#simulator div")
    .filter({ hasText: "Live score" })
    .first()
    .locator("span")
    .count();

  if (reasonChipCount < 1) {
    issues.push("Simulator reason chips did not render.");
  }

  await page.locator("#how").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const chapterVisible = await page
    .locator("#how")
    .getByText("Chapter")
    .first()
    .isVisible();

  if (!chapterVisible) {
    issues.push("Scrollytelling chapter content was not visible.");
  }

  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 4,
  );

  if (!noOverflow) {
    issues.push("Desktop horizontal overflow detected.");
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
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("text=IV Sunsets", { timeout: 15_000 });

  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 4,
  );

  if (!noOverflow) {
    issues.push("Mobile horizontal overflow detected.");
  }

  const forecastCardCount = await page.locator("#forecast article").count();
  if (forecastCardCount < 6) {
    issues.push(`Expected at least 6 forecast cards on mobile, found ${forecastCardCount}.`);
  }

  await page.locator("#how").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const mobileExplainerCards = await page.locator("#how article").count();

  if (mobileExplainerCards < 6) {
    issues.push(`Expected 6 mobile explainer cards, found ${mobileExplainerCards}.`);
  }

  await page.locator("#simulator").scrollIntoViewIfNeeded();
  const sliderVisible = await page.locator("#sim-highCloud").isVisible();

  if (!sliderVisible) {
    issues.push("Simulator slider is not visible on mobile.");
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
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("text=IV Sunsets", { timeout: 15_000 });

  const prefersReduce = await page.evaluate(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  if (!prefersReduce) {
    issues.push("Reduced motion media query is not active in test context.");
  }

  const heroHeadingVisible = await page
    .getByRole("heading", { level: 1 })
    .first()
    .isVisible();

  if (!heroHeadingVisible) {
    issues.push("Hero heading is not visible with reduced motion enabled.");
  }

  await browser.close();

  return { issues, consoleErrors };
}

async function run() {
  const desktop = await runDesktopFlow();
  const mobile = await runMobileFlow();
  const reducedMotion = await runReducedMotionFlow();

  const report = {
    desktop,
    mobile,
    reducedMotion,
  };

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
