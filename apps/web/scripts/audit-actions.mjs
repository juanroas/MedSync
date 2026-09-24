// Inventories every visible link/button per page and flags duplicate destinations.
// Usage: node scripts/audit-actions.mjs [--out <dir>] [--as <email>] <url> [url...]
// With --as, the password is read from AUDIT_PASSWORD so it never appears in shell history.
// Rules it checks are defined in .agents/rules/ui-actions-and-flow.md.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
let outDir = null;
let email = null;
const urls = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") outDir = args[++i];
  else if (args[i] === "--as") email = args[++i];
  else urls.push(args[i]);
}
if (urls.length === 0) {
  console.error("Usage: node scripts/audit-actions.mjs [--out dir] [--as email] <url> [url...]");
  process.exit(1);
}
if (email && !process.env.AUDIT_PASSWORD) {
  console.error("--as requires the AUDIT_PASSWORD environment variable.");
  process.exit(1);
}
if (outDir) mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

if (email) {
  const password = process.env.AUDIT_PASSWORD;
  const origin = new URL(urls[0]).origin;
  await page.goto(`${origin}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  try {
    await page.waitForURL(/dashboard|alterar-senha/, { timeout: 20000 });
  } catch {
    console.error(`Login as ${email} failed: wrong AUDIT_PASSWORD, MFA enabled, or API unreachable.`);
    await browser.close();
    process.exit(1);
  }
}

let violations = 0;
for (const url of urls) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  if (outDir) {
    const name = new URL(url).pathname.replace(/\//g, "_") || "_root";
    await page.screenshot({ path: `${outDir}/${name === "_" ? "_root" : name}.png` });
  }
  const actions = await page.evaluate(() => {
    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const zone = (el) =>
      el.closest("aside, nav") ? "nav" : el.closest("footer") ? "footer" : el.closest("header") ? "header" : "content";
    // teal-600 / teal-700 from tailwind.config.ts: the only colors a primary CTA may use.
    const primaryBackgrounds = ["rgb(17, 135, 117)", "rgb(16, 108, 96)"];
    return [...document.querySelectorAll("a[href], button")]
      .filter(isVisible)
      .map((el) => ({
        primary: primaryBackgrounds.includes(getComputedStyle(el).backgroundColor),
        kind: el.tagName === "A" ? "link" : "button",
        label: (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 60),
        href: el.getAttribute("href") ?? "",
        zone: zone(el),
        aboveFold: el.getBoundingClientRect().top < window.innerHeight,
      }));
  });

  const content = actions.filter((a) => a.zone !== "nav" && a.zone !== "footer");
  const navActions = actions.filter((a) => a.zone === "nav" && /\/(nova|novo|new|criar|cadastrar)(\/|\?|$)/.test(a.href));
  const byHref = new Map();
  for (const a of content) {
    if (!a.href || a.href === "/" || a.href.startsWith("#")) continue;
    byHref.set(a.href, [...(byHref.get(a.href) ?? []), a.label]);
  }
  const dupes = [...byHref].filter(([, labels]) => labels.length > 1);
  const aboveFoldCtas = content.filter((a) => a.aboveFold && a.label).length;

  console.log(`\n=== ${url}`);
  console.log(`    ${actions.length} actions (${aboveFoldCtas} outside nav above the fold)`);
  const nav = actions.filter((a) => a.zone === "nav");
  if (nav.length) console.log(`    nav: ${nav.map((a) => a.label || a.href).join(" · ")}`);
  for (const a of actions.filter((x) => x.zone !== "nav")) {
    console.log(`    [${a.zone.padEnd(7)}${a.aboveFold ? "" : " ↓"}]${a.primary ? " ★" : ""} ${a.kind} "${a.label}"${a.href ? ` -> ${a.href}` : ""}`);
  }
  for (const [href, labels] of dupes) {
    violations++;
    console.log(`  ! R3 DUPLICATE destination ${href} reached by: ${labels.map((l) => `"${l}"`).join(", ")}`);
  }
  for (const a of navActions) {
    violations++;
    console.log(`  ! R1 ACTION IN MENU "${a.label}" -> ${a.href}`);
  }
  const primaries = content.filter((a) => a.primary && a.aboveFold);
  if (primaries.length > 1) {
    violations++;
    console.log(`  ! R2 ${primaries.length} PRIMARY buttons above the fold: ${primaries.map((a) => `"${a.label}"`).join(", ")}`);
  }
}

await browser.close();
console.log(`\n${violations} violation(s).`);
process.exit(violations > 0 ? 2 : 0);
