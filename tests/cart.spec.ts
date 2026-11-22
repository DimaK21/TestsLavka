import { expect, test } from '@playwright/test';
import { applyPromo, brazil, openCartWith, productCard } from './support/shop';

test('количество, сумма и удаление товара после перезагрузки', async ({ page }) => {
  await page.goto('/');
  await productCard(page, brazil).getByRole('link', { name: brazil }).click();
  await page.getByRole('button', { name: 'Увеличить количество' }).click();
  await page.getByRole('button', { name: 'Добавить в корзину' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('2');
  await page.getByTestId('cart-link').click();

  const row = page.getByTestId('cart-row');
  const qty = row.getByRole('spinbutton', { name: 'Количество' });
  await expect(row.getByRole('link', { name: brazil })).toBeVisible();
  await expect(page.getByTestId('subtotal')).toHaveText('4 300 ₽');
  await row.getByRole('button', { name: 'Увеличить количество' }).click();
  await expect(qty).toHaveValue('3');
  await expect(page.getByTestId('subtotal')).toHaveText('6 450 ₽');
  await row.getByRole('button', { name: 'Уменьшить количество' }).click();
  await expect(qty).toHaveValue('2');
  await expect(page.getByTestId('cart-count')).toHaveText('2');

  await page.reload();
  await expect(qty).toHaveValue('2');
  await expect(page.getByTestId('subtotal')).toHaveText('4 300 ₽');
  await row.getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveText('0');
});

test('корзина сохраняет количество при превышении остатка', async ({ page, request }) => {
  const product = await request.get('/api/products/11');
  expect(product.ok()).toBe(true);
  const { name, stock } = await product.json();
  await openCartWith(page, name);

  const qty = page.getByTestId('cart-row').getByRole('spinbutton', { name: 'Количество' });
  const rejected = page.waitForResponse((r) => r.url().endsWith('/api/cart/items/11') && r.request().method() === 'PATCH');
  await qty.fill(String(stock + 1));
  await qty.press('Tab');
  expect((await rejected).status()).toBe(409);
  await expect(page.getByRole('status')).toHaveText(`В наличии только ${stock} шт.`);
  await expect(qty).toHaveValue('1');
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.getByRole('button', { name: 'Очистить корзину' }).click();
  await expect(page.getByTestId('cart-empty')).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveText('0');
});

test('SALE10 нормализует код, ошибочный код сохраняет скидку, пустой сбрасывает', async ({ page }) => {
  await openCartWith(page, brazil);
  await applyPromo(page, ' sale10 ');
  await expect(page.getByTestId('discount')).toHaveText('−215 ₽');
  await expect(page.getByTestId('total')).toHaveText('1 935 ₽');

  await applyPromo(page, 'NO-SUCH-PROMO');
  await expect(page.getByRole('status')).toHaveText('Промокод не найден');
  await expect(page.getByRole('textbox', { name: 'Промокод' })).toHaveValue('SALE10');
  await expect(page.getByTestId('total')).toHaveText('1 935 ₽');

  await applyPromo(page, '');
  await expect(page.getByTestId('discount')).toHaveCount(0);
  await expect(page.getByTestId('total')).toHaveText('2 150 ₽');
});

test('WELCOME500 отклоняется ниже 2 000 ₽ и действует на границе', async ({ page }) => {
  await openCartWith(page, 'Кофе Эфиопия Иргачефф, 250 г');
  await applyPromo(page, 'WELCOME500');
  await expect(page.getByRole('status')).toHaveText('Промокод действует при заказе от 2000 ₽');
  await expect(page.getByTestId('discount')).toHaveCount(0);
  await expect(page.getByTestId('total')).toHaveText('890 ₽');
  await page.getByRole('button', { name: 'Очистить корзину' }).click();
  await expect(page.getByTestId('cart-empty')).toBeVisible();

  await openCartWith(page, 'Подарочный сертификат на 2000 ₽');
  await expect(page.getByTestId('subtotal')).toHaveText('2 000 ₽');
  await applyPromo(page, 'WELCOME500');
  await expect(page.getByTestId('discount')).toHaveText('−500 ₽');
  await expect(page.getByTestId('total')).toHaveText('1 500 ₽');
});
