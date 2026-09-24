/* Browser integration check for the built accounting app; exercises company creation
   in a real browser as a complement to the jsdom/IndexedDB unit tests. */
const path = require("path");
const { pathToFileURL } = require("url");
// The managed test filesystem rejects ownership changes. This makes tar-fs
// extract the bundled browser without attempting a root-only chown.
global.Bare = { platform: process.platform };
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium").default;

async function main() {
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: "shell",
    args: [...chromium.args, "--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    const targetPath = process.argv[2]
      ? path.resolve(process.argv[2])
      : path.resolve(__dirname, "..", "index.html");
    const target = pathToFileURL(targetPath).href;
    await page.goto(target, { waitUntil: "load" });
    await page.waitForSelector('[data-action="add-company"]', { timeout: 10000 });
    await page.click('[data-action="add-company"]');
    await page.waitForSelector("#company-form");
    await page.type(
      '#company-form [name="legalName"]',
      "COURSEMACCON BUSINESS SOLUTIONS (PTY) LTD",
    );
    await page.click('#company-form [name="registrationNumber"]');
    await page.keyboard.type("2023 / 134341 / 07");
    const typedRegistration = await page.$eval(
      '#company-form [name="registrationNumber"]',
      (input) => input.value,
    );
    if (typedRegistration !== "2023 / 134341 / 07")
      throw new Error(
        `Registration number was typed into the wrong field: ${typedRegistration || "blank"}.`,
      );
    const generatedCode = await page.$eval(
      '#company-form [name="companyCode"]',
      (input) => input.value,
    );
    if (generatedCode !== "COURSEMACC")
      throw new Error(`Expected generated code COURSEMACC, received ${generatedCode || "blank"}.`);
    await page.click("[data-company-submit]");
    try {
      await page.waitForFunction(() => !document.querySelector(".modal-layer"), { timeout: 15000 });
    } catch (error) {
      await page.screenshot({ path: "/tmp/iap-real-browser-failure.png", fullPage: true });
      throw error;
    }
    const companies = await page.evaluate(() => window.IAP.Companies.list());
    const created = companies.find(
      (company) => company.legalName === "COURSEMACCON BUSINESS SOLUTIONS (PTY) LTD",
    );
    if (!created)
      throw new Error(
        `The expected company was not created in the real browser database. Found: ${JSON.stringify(companies)}`,
      );
    const snapshot = await page.evaluate(
      (companyId) => window.IAP.Records.snapshot(companyId),
      created.id,
    );
    if (snapshot.data.accounts.length < 30 || snapshot.data.accounting_periods.length !== 12)
      throw new Error("The company accounting foundation was not prepared.");
    await page.click('[data-action="quick-add"]');
    await page.waitForSelector('[data-action="quick-choice:products"]');
    await page.click('[data-action="quick-choice:products"]');
    await page.waitForSelector('#record-form [name="code"]');
    const productCodeControl = await page.$eval('#record-form [name="code"]', (input) => ({
      value: input.value,
      readOnly: input.readOnly,
    }));
    if (productCodeControl.value !== "PROD-001" || !productCodeControl.readOnly)
      throw new Error(
        `Expected a read-only PROD-001 product code, received ${JSON.stringify(productCodeControl)}.`,
      );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.type('#record-form [name="name"]', "Browser Automatic Product");
    await page.type('#record-form [name="unit"]', "each");
    await page.evaluate(() => {
      document.addEventListener(
        "click",
        (event) => {
          window.__iapLastTestClick = {
            action: event.target.closest("[data-action]")?.dataset.action || "",
            text: event.target.textContent || "",
          };
        },
        { once: true },
      );
    });
    await page.click('[data-action="submit-form:record-form"]');
    try {
      await page.waitForFunction(() => !document.querySelector(".modal-layer"), { timeout: 10000 });
    } catch (error) {
      const state = await page.evaluate(() => ({
        title: document.querySelector("#modal-title")?.textContent,
        feedback: document.querySelector("#modal-feedback")?.textContent,
        lastClick: window.__iapLastTestClick,
        submit: (() => {
          const button = document.querySelector('[data-action="submit-form:record-form"]');
          return button
            ? {
                disabled: button.disabled,
                text: button.textContent,
                rect: button.getBoundingClientRect().toJSON(),
              }
            : null;
        })(),
        fields: Array.from(document.querySelectorAll("#record-form [name]")).map((field) => ({
          name: field.name,
          value: field.value,
          required: field.required,
          valid: field.checkValidity(),
        })),
      }));
      await page.screenshot({ path: "/tmp/iap-real-browser-product-failure.png", fullPage: true });
      throw new Error(`Product form did not close: ${JSON.stringify(state)}. ${error.message}`);
    }
    const productRows = await page.evaluate(
      (companyId) => window.IAP.Records.list(companyId, "products"),
      created.id,
    );
    const savedProduct = productRows.find((row) => row.data.name === "Browser Automatic Product");
    if (!savedProduct || savedProduct.data.code !== "PROD-001")
      throw new Error(
        `The automatic product code was not saved through the real interface. Found: ${JSON.stringify(productRows)}`,
      );
    const bankTransaction = await page.evaluate(
      (companyId) =>
        window.IAP.Records.save(
          companyId,
          "bank_transactions",
          {
            transactionId: "",
            date: window.IAP.Util.today(),
            bankAccountCode: "BANK-001",
            description: "Imported statement row without transaction ID",
            debit: 75,
            credit: 0,
            counterAccount: "",
            reference: "",
            reconciled: "",
            status: "",
          },
          null,
          "Excel import browser test",
        ),
      created.id,
    );
    if (bankTransaction.data.transactionId !== "TRAN-001")
      throw new Error(
        `Expected generated Transaction ID TRAN-001, received ${bankTransaction.data.transactionId || "blank"}.`,
      );
    if (bankTransaction.data.status !== "Unclassified")
      throw new Error("A blank bank posting status did not default to Unclassified in Chromium.");
    await page.$eval('[data-route="register:products"]', (button) => {
      button.scrollIntoView({ block: "center" });
      button.click();
    });
    await page.waitForSelector(`[data-action="edit:products:${savedProduct.id}"]`);
    await page.click(`[data-action="edit:products:${savedProduct.id}"]`);
    await page.waitForSelector('#record-form [name="name"]');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.$eval('#record-form [name="name"]', (input) => {
      input.value = "Browser Edited Product";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.click('[data-action="submit-form:record-form"]');
    await page.waitForFunction(() => !document.querySelector(".modal-layer"), { timeout: 10000 });
    const editedProduct = await page.evaluate((id) => window.IAP.Records.get(id), savedProduct.id);
    if (!editedProduct || editedProduct.data.name !== "Browser Edited Product")
      throw new Error("A saved record could not be edited through its register action.");
    await page.waitForSelector(`[data-action="delete:products:${savedProduct.id}"]`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.click(`[data-action="delete:products:${savedProduct.id}"]`);
    await page.waitForFunction(
      (id) => window.IAP.Records.get(id).then((row) => !row),
      { timeout: 10000 },
      savedProduct.id,
    );
    await page.evaluate(
      (companyId) =>
        window.IAP.Records.save(companyId, "products", {
          name: "Clear Data Product",
          type: "Product",
          unit: "each",
          status: "Active",
        }),
      created.id,
    );
    await page.$eval('[data-route="companies"]', (button) => {
      button.scrollIntoView({ block: "center" });
      button.click();
    });
    await page.waitForSelector(`[data-action="clear-company:${created.id}"]`);
    await page.click(`[data-action="clear-company:${created.id}"]`);
    await page.waitForSelector('[data-confirm-phrase="CLEAR"]');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.type('[data-confirm-phrase="CLEAR"]', "CLEAR");
    await page.click(`[data-action="execute-clear-company:${created.id}"]`);
    await page.waitForFunction(() => !document.querySelector(".modal-layer"), { timeout: 15000 });
    const clearedSnapshot = await page.evaluate(
      (companyId) => window.IAP.Records.snapshot(companyId),
      created.id,
    );
    if (clearedSnapshot.data.products.length || clearedSnapshot.data.bank_transactions.length)
      throw new Error("Clear company data did not remove user-entered records.");
    if (
      clearedSnapshot.data.accounts.length < 30 ||
      clearedSnapshot.data.accounting_periods.length !== 12
    )
      throw new Error("Clear company data did not restore the clean accounting foundation.");
    await page.waitForSelector(`[data-action="delete-company:${created.id}"]`);
    const clearedCompanyCard = await page.$eval(
      `[data-action="delete-company:${created.id}"]`,
      (button) => button.closest(".company-card").textContent.replace(/\s+/g, " "),
    );
    if (!/Business records\s*0/.test(clearedCompanyCard))
      throw new Error(
        `The cleared company card did not show zero business records: ${clearedCompanyCard}`,
      );
    await page.click(`[data-action="delete-company:${created.id}"]`);
    await page.waitForSelector('[data-confirm-phrase="DELETE"]');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.type('[data-confirm-phrase="DELETE"]', "DELETE");
    await page.click(`[data-action="execute-delete-company:${created.id}"]`);
    await page.waitForFunction(
      (id) => window.IAP.Companies.get(id).then((company) => !company),
      { timeout: 15000 },
      created.id,
    );
    if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(" | ")}`);
    console.log(
      `PASS: real Chromium created ${created.companyCode}, saved/edited/deleted ${savedProduct.data.code}, generated ${bankTransaction.data.transactionId}, cleared company data, and deleted the company.`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
