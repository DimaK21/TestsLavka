import { expect, test } from '@playwright/test';
import { brazil, productCard } from './support/shop';

test('публичный магазин отвечает, отдаёт каталог и открывает карточку', async ({ page, request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ app: 'qa-shop', status: 'ok' });

  const catalog = await request.get('/api/products');
  expect(catalog.ok()).toBe(true);
  expect(await catalog.json()).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: brazil, price: 2150 }),
  ]));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Каталог', exact: true })).toBeVisible();
  await productCard(page, brazil).getByRole('link', { name: brazil }).click();
  await expect(page.getByRole('heading', { name: brazil })).toBeVisible();
  await expect(page.getByTestId('product-price')).toHaveText('2 150 ₽');
});
