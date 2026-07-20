import { chromium } from "playwright";

const outDir =
  "C:/Users/FRANCE~1/AppData/Local/Temp/claude/C--ricordi-website-ricordi-archive/cad88ebf-41db-4d90-b696-a01d588332e2/scratchpad/screenshots";

const browser = await chromium.launch();
const errors = [];

async function check(width) {
  const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${width}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${width}] pageerror: ${e.message}`));

  await page.goto("http://localhost:3000/admin/prodotti", { waitUntil: "networkidle" });
  console.log(`[${width}] /admin/prodotti (unauth) -> ${page.url()}`);

  await page.goto("http://localhost:3000/admin/prodotti/00000000-0000-0000-0000-000000000000/modifica", {
    waitUntil: "networkidle",
  });
  console.log(`[${width}] /admin/prodotti/.../modifica (unauth) -> ${page.url()}`);

  if (width === 390) {
    await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle" });
    await page.screenshot({ path: `${outDir}/admin-login-390.png`, fullPage: true });
  }

  await page.close();
}

await check(1280);
await check(390);

await browser.close();
console.log("ERRORS:", errors.length ? JSON.stringify(errors, null, 2) : "none");
