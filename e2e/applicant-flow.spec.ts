import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000/api";

const MINIMAL_PDF = Buffer.from(
  "%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
  "utf8",
);

function uniqueApplicant() {
  const stamp = Date.now().toString().slice(-8);
  return {
    applicantName: `E2E Applicant ${stamp}`,
    fatherName: `E2E Father ${stamp}`,
    cnicBform: `42101-${stamp.slice(0, 7)}-1`,
    email: `e2e.${stamp}@example.com`,
  };
}

async function createApplicant(request: APIRequestContext) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const body = uniqueApplicant();
    const response = await request.post(`${API_URL}/v1/applications/public/submit`, { data: body });
    if (response.status() === 429) {
      await new Promise((resolve) => setTimeout(resolve, 12_000));
      continue;
    }
    expect(response.ok(), await response.text()).toBeTruthy();
    const json = (await response.json()) as {
      data: { applicationNo: string; temporaryPassword?: string };
    };
    expect(json.data.temporaryPassword, "temporaryPassword required when SMTP is unset").toBeTruthy();
    return { ...body, applicationNo: json.data.applicationNo, password: json.data.temporaryPassword! };
  }
  throw new Error("Could not create applicant after rate-limit retries");
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel(/Temporary password/i).fill(password);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL(/\/(dashboard|application)/);
}

async function goNext(page: Page) {
  await page.getByRole("button", { name: /Next:/i }).click();
}

function tinyPdfPath(name: string) {
  const dir = mkdtempSync(join(tmpdir(), "usms-e2e-"));
  const path = join(dir, name);
  writeFileSync(path, MINIMAL_PDF);
  return path;
}

async function fillLabeled(scope: ReturnType<Page["locator"]>, label: RegExp, value: string) {
  const control = scope.locator("label").filter({ hasText: label }).locator("input, select, textarea");
  const tag = await control.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    await control.selectOption({ label: value }).catch(async () => {
      await control.selectOption(value);
    });
    return;
  }
  await control.fill(value);
}

test("applicant can draft, upload documents, and submit", async ({ page, request }) => {
  const applicant = await createApplicant(request);

  await login(page, applicant.email, applicant.password);
  await page.goto("/application");
  await expect(page.getByText("Step 1: Personal profile")).toBeVisible();
  await expect(page.getByLabel(/Full applicant name/i)).toHaveValue(applicant.applicantName, { timeout: 20_000 });

  await page.getByLabel(/Date of birth/i).fill("2006-03-14");
  await page.getByLabel(/Gender/i).selectOption("Male");
  await page.getByLabel(/Mobile phone/i).fill("03001234567");
  await page.getByLabel(/Domicile district/i).fill("Karachi Central");
  await page.getByLabel(/Postal \/ mailing address/i).fill("House 1, Gulshan, Karachi");
  await goNext(page);

  await expect(page.getByText("Step 2: Program choices")).toBeVisible();
  const programSelect = page.locator(".admit-choice select").first();
  await expect(programSelect.locator("option").nth(1)).toBeAttached({ timeout: 30_000 });
  const firstProgramValue = await programSelect.locator("option").nth(1).getAttribute("value");
  expect(firstProgramValue).toBeTruthy();
  await programSelect.selectOption(firstProgramValue!);
  await goNext(page);

  await expect(page.getByText("Step 3: Academic qualifications")).toBeVisible();
  const ssc = page.locator("article.admit-record").filter({ hasText: /Secondary School Certificate/i });
  await fillLabeled(ssc, /Group \/ stream/i, "Science");
  await fillLabeled(ssc, /^Board$/i, "BISE Karachi");
  await fillLabeled(ssc, /Passing year/i, "2022");
  await fillLabeled(ssc, /Roll number/i, "418902");
  await fillLabeled(ssc, /Marks obtained/i, "920");
  await fillLabeled(ssc, /Total marks/i, "1100");

  const hsc = page.locator("article.admit-record").filter({ hasText: /Higher Secondary Certificate/i });
  await hsc.locator("label").filter({ hasText: /Academic group/i }).locator("select").selectOption("Pre-Engineering");
  await fillLabeled(hsc, /^Board/i, "BISE Karachi");
  await fillLabeled(hsc, /Passing year/i, "2024");
  await fillLabeled(hsc, /Total marks/i, "1100");
  await fillLabeled(hsc, /Marks obtained/i, "820");
  await fillLabeled(hsc, /Roll \/ registration number/i, "HSC-789012");
  await fillLabeled(hsc, /Institution type/i, "Government college");
  await goNext(page);

  await expect(page.getByText("Step 4: Parents and guardian")).toBeVisible();
  await page.getByLabel(/Father \/ guardian occupation/i).fill("Engineer");
  await page.getByLabel(/Annual household income/i).selectOption("PKR 500,000 to PKR 1,000,000");
  await page.getByLabel(/Emergency contact/i).fill("Father");
  await page.getByLabel(/Emergency phone/i).fill("03219876543");
  await page.getByRole("button", { name: /Save draft/i }).click();
  await expect(page.getByText(/Draft saved/i)).toBeVisible({ timeout: 20_000 });
  await goNext(page);

  await expect(page.getByText("Step 5:")).toBeVisible();
  const uploads = [
    { title: /Matriculation/i, file: "ssc.pdf" },
    { title: /HSC \/ Intermediate/i, file: "hsc.pdf" },
    { title: /CNIC \/ B-Form/i, file: "cnic.pdf" },
    { title: /Domicile/i, file: "domicile.pdf" },
    { title: /Passport photograph/i, file: "photo.pdf" },
  ];
  for (const item of uploads) {
    const row = page.locator(".admit-doc").filter({ hasText: item.title });
    await row.locator('input[type="file"]').setInputFiles(tinyPdfPath(item.file));
    await expect(row.getByText(/·/)).toBeVisible({ timeout: 30_000 });
  }
  await goNext(page);

  await expect(page.getByText("Step 6:")).toBeVisible();
  await goNext(page);

  await expect(page.getByText("Step 7: Review")).toBeVisible();
  await goNext(page);

  await expect(page.getByText("Step 8: Declaration")).toBeVisible();
  const checks = page.locator(".admit-oath input[type=checkbox]");
  await checks.nth(0).check();
  await checks.nth(1).check();
  await checks.nth(2).check();
  await page.getByLabel(/Type your full legal name/i).fill(applicant.applicantName);
  const submitResponse = page.waitForResponse(
    (res) => res.url().includes("/applications/me/submit") && res.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: /Submit application/i }).click();
  const submitRes = await submitResponse;
  if (!submitRes.ok()) {
    throw new Error(`Submit failed ${submitRes.status()}: ${await submitRes.text()}`);
  }
  await expect(page.locator(".admit-saved").getByText(/Submitted/i)).toBeVisible({ timeout: 10_000 });

  const loginRes = await request.post(`${API_URL}/v1/auth/login`, {
    data: { email: applicant.email, password: applicant.password },
  });
  expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
  const me = await request.get(`${API_URL}/v1/applications/me`);
  expect(me.ok(), await me.text()).toBeTruthy();
  const payload = (await me.json()) as { data: { status: string; documents: unknown[] } };
  expect(payload.data.status).toBe("SUBMITTED");
  expect(payload.data.documents.length).toBeGreaterThanOrEqual(5);
});
