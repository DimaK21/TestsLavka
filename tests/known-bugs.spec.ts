import { expect, test } from '@playwright/test';
import { brazil, openCartWith, productCard } from './support/shop';

test('BUG-01 · оформление отклоняет номер почти без цифр', async ({ page }) => {
  await openCartWith(page, 'Шоколад тёмный 72 %, 90 г');
  await page.getByRole('link', { name: 'Оформить заказ' }).click();
  await page.getByLabel('Имя получателя').fill('Тестовый Гость');
  await page.getByLabel('Телефон').fill('+7--- --- -- --');
  await page.getByRole('radio', { name: 'Самовывоз' }).check();
  const submitted = page.waitForResponse((r) => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Подтвердить заказ' }).click();
  const status = (await submitted).status();

  expect([201, 400]).toContain(status);
  if (status === 201) {
    await expect(page.getByTestId('order-success')).toBeVisible();
  }
  test.fail(true, 'BUG-01: пробелы и дефисы засчитываются как часть длины телефона');
  expect(status).toBe(400);
});

test('BUG-02 · в карточке нельзя увеличить количество выше остатка', async ({ page, request }) => {
  const product = await request.get('/api/products/11');
  expect(product.ok()).toBe(true);
  const { name, stock } = await product.json();
  expect(stock).toBeGreaterThan(0);

  await page.goto('/');
  await productCard(page, name).getByRole('link', { name, exact: true }).click();
  const qty = page.getByRole('spinbutton', { name: 'Количество' });
  await qty.fill(String(stock));
  const plus = page.getByRole('button', { name: 'Увеличить количество' });
  if (await plus.isEnabled()) await plus.click();
  const selected = await qty.inputValue();

  test.fail(true, 'BUG-02: кнопка «+» не учитывает остаток товара');
  expect(Number(selected)).toBe(stock);
});

test('BUG-03 · кнопка выхода скрыта у гостя', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Каталог', exact: true })).toBeVisible();
  expect(await (await page.request.get('/api/auth/me')).json()).toEqual({ user: null });
  const logoutVisible = await page.getByRole('button', { name: 'Выйти' }).isVisible();

  test.fail(true, 'BUG-03: CSS оставляет кнопку «Выйти» видимой при hidden');
  expect(logoutVisible).toBe(false);
});

test('BUG-04 · при самовывозе поле адреса скрыто', async ({ page }) => {
  await openCartWith(page, brazil);
  await page.getByRole('link', { name: 'Оформить заказ' }).click();
  const address = page.getByLabel('Адрес доставки');
  await expect(address).toBeVisible();
  await page.getByRole('radio', { name: 'Самовывоз' }).check();
  await expect(page.getByTestId('shipping')).toHaveText('бесплатно');
  const addressVisible = await address.isVisible();

  test.fail(true, 'BUG-04: CSS оставляет поле адреса видимым при hidden');
  expect(addressVisible).toBe(false);
});
