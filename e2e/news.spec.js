// @ts-check
const { test, expect } = require('@playwright/test');

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = 600;
    while (true) {
      const before = window.scrollY;
      window.scrollBy(0, step);
      await new Promise((r) => setTimeout(r, 80));
      if (window.scrollY === before && window.innerHeight + window.scrollY >= document.body.scrollHeight) break;
    }
  });
}

test.describe('News listing page', () => {
  test('loads with 52 article cards and 7 filter buttons', async ({ page }) => {
    await page.goto('/Niset-Stay/news');
    await expect(page).toHaveTitle(/Student Housing in Phnom Penh/);
    await expect(page.locator('.news-card')).toHaveCount(52);
    await expect(page.locator('.news-filter-btn')).toHaveCount(7);
  });

  test('filtering by Scholarships shows only scholarship articles', async ({ page }) => {
    await page.goto('/Niset-Stay/news');
    await page.locator('.news-filter-btn', { hasText: 'Scholarships' }).click();
    await expect(page.locator('.news-card')).toHaveCount(8);
    const cats = await page.locator('.news-category').allTextContents();
    for (const c of cats) expect(c.trim().toLowerCase()).toBe('scholarship');
  });

  test('filtering by Activities shows activity articles then reset shows all', async ({ page }) => {
    await page.goto('/Niset-Stay/news');
    await page.locator('.news-filter-btn', { hasText: 'Activities' }).click();
    await expect(page.locator('.news-card')).toHaveCount(3);
    await page.locator('.news-filter-btn', { hasText: 'All' }).click();
    await expect(page.locator('.news-card')).toHaveCount(52);
  });

  test('every card has an image, category badge, title, excerpt, date', async ({ page }) => {
    await page.goto('/Niset-Stay/news');
    const cards = page.locator('.news-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await expect(card.locator('img')).toHaveAttribute('src', /\S+/);
      await expect(card.locator('.news-category')).not.toBeEmpty();
      await expect(card.locator('.news-title')).not.toBeEmpty();
      await expect(card.locator('.news-excerpt')).not.toBeEmpty();
      await expect(card.locator('time')).not.toBeEmpty();
    }
  });

  test('no broken images on the page', async ({ page }) => {
    await page.goto('/Niset-Stay/news');
    await scrollThrough(page);
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('.news-card img'));
      return imgs.filter(img => img.complete !== true || img.naturalWidth === 0).map(img => img.src);
    });
    expect(brokenImages).toEqual([]);
  });
});

test.describe('News detail page', () => {
  test('detail page renders title, author, tags, hero image, and body', async ({ page }) => {
    await page.goto('/Niset-Stay/news/5');
    await expect(page.locator('.nd-title')).not.toBeEmpty();
    await expect(page.locator('.nd-author-name')).not.toBeEmpty();
    await expect(page.locator('.nd-read-time')).not.toBeEmpty();
    const hero = page.locator('.nd-hero-image img');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('src', /\S+/);
    await expect(page.locator('.nd-body-section').first()).toBeVisible();
    await expect(page.locator('.nd-tags-list .nd-tag')).not.toHaveCount(0);
  });

  test('scholarship article renders with scholarship category badge', async ({ page }) => {
    await page.goto('/Niset-Stay/news/5');
    await expect(page.locator('.nd-title')).not.toBeEmpty();
    await expect(page.locator('.nd-badge:not(.nd-badge-highlight)')).toHaveText(/Scholarship/i);
    await expect(page.locator('.nd-hero-image img')).toBeVisible();
    await expect(page.locator('.nd-body-section').first()).toBeVisible();
  });
});