import { expect, test } from "@playwright/test";

test("fresh property presents secure owner setup", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Create the owner." })).toBeVisible();
  await expect(page.getByLabel("Owner name")).toBeVisible();
  await expect(page.getByRole("button", { name: /Create private workspace/ })).toBeVisible();
});

test("health endpoint reports database readiness", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({ status: "ready", database: "connected" });
});
