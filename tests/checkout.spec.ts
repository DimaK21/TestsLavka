import { expect, test, type Page } from '@playwright/test';
import { applyPromo, brazil, fillRegistration, gift, openCartWith, openRegistration, sampleUser } from './support/shop';

function checkout(page: Page) {
  return page.getByRole('link', { name: 'Оформить заказ' }).click();
}

const phone = '+7 900 000-00-00';
const address = 'Тестовая улица, 10';

test('гостевой заказ с доставкой, валидация формы и списание остатка', async ({ page, request }) => {
  const before = await request.get('/api/products/2');
  expect(before.ok()).toBe(true);
  const { stock } = await before.json();

  await openCartWith(page, brazil);
  await applyPromo(page, 'SALE10');
  await expect(page.getByTestId('total')).toHaveText('1 935 ₽');
  await checkout(page);
  await expect(page.getByTestId('shipping')).toHaveText('300 ₽');
  await expect(page.getByTestId('total')).toHaveText('2 235 ₽');

  const submit = page.getByRole('button', { name: 'Подтвердить заказ' });
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText('Проверьте поля формы');
  await expect(page.getByText('Укажите имя получателя')).toBeVisible();
  await expect(page.getByText('Укажите телефон в формате +7 900 000-00-00')).toBeVisible();
  await expect(page.getByText('Укажите адрес доставки')).toBeVisible();

  await page.getByLabel(/^Имя получателя/).fill('Тестовый Гость');
  await page.getByLabel(/^Телефон/).fill(phone);
  await page.getByLabel(/^Адрес доставки/).fill(address);
  await submit.click();

  await expect(page.getByTestId('order-success')).toBeVisible();
  await expect(page.getByTestId('order-id')).toHaveText(/^\d+$/);
  await expect(page.getByRole('cell', { name: brazil })).toBeVisible();
  await expect(page.getByText('Доставка курьером: ' + address, { exact: false })).toBeVisible();
  await expect(page.getByTestId('total')).toHaveText('2 235 ₽');
  await expect(page.getByTestId('cart-count')).toHaveText('0');

  const after = await request.get('/api/products/2');
  expect(after.ok()).toBe(true);
  expect((await after.json()).stock).toBe(stock - 1);
});

test('порог бесплатной доставки считается после применения скидки', async ({ page }) => {
  await openCartWith(page, gift);
  await checkout(page);
  await expect(page.getByTestId('shipping')).toHaveText('бесплатно');
  await expect(page.getByTestId('total')).toHaveText('3 490 ₽');

  await page.getByTestId('cart-link').click();
  await applyPromo(page, 'WELCOME500');
  await expect(page.getByTestId('total')).toHaveText('2 990 ₽');
  await checkout(page);
  await expect(page.getByTestId('shipping')).toHaveText('300 ₽');
  await expect(page.getByTestId('total')).toHaveText('3 290 ₽');
});

test('заказ с самовывозом отображается в истории аккаунта', async ({ page }) => {
  await page.goto('/');
  await openRegistration(page);
  const user = sampleUser();
  await fillRegistration(page, user);
  await expect(page.getByRole('banner').getByText(user.name, { exact: true })).toBeVisible();

  await openCartWith(page, brazil);
  await checkout(page);
  await expect(page.getByLabel('Имя получателя')).toHaveValue(user.name);
  await page.getByLabel('Телефон').fill(phone);
  await page.getByRole('radio', { name: 'Самовывоз' }).check();
  await expect(page.getByTestId('shipping')).toHaveText('бесплатно');
  await page.getByRole('radio', { name: 'Наличными' }).check();
  await page.getByRole('button', { name: 'Подтвердить заказ' }).click();

  const id = page.getByTestId('order-id');
  await expect(id).toHaveText(/^\d+$/);
  const orderNumber = await id.innerText();
  await expect(page.getByText('Оплата: наличными.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Мои заказы' }).click();
  const order = page.getByTestId('order-row');
  await expect(order).toHaveCount(1);
  await expect(order.getByRole('cell', { name: '2 150 ₽' })).toBeVisible();
  await order.getByRole('link', { name: `№${orderNumber}` }).click();
  await expect(page.getByTestId('order-id')).toHaveText(orderNumber);
});
