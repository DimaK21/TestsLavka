import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

export const brazil = 'Кофе Бразилия Сантос, 1 кг';
export const gift = 'Подарочный набор «Утро»';

export function productCard(page: Page, name: string) {
  return page.getByTestId('product-card').filter({ has: page.getByRole('link', { name, exact: true }) });
}

export async function openCartWith(page: Page, name: string) {
  await page.goto('/');
  await productCard(page, name).getByRole('button', { name: 'В корзину' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
  await page.getByTestId('cart-link').click();
  await expect(page.getByTestId('cart-row').getByRole('link', { name, exact: true })).toBeVisible();
}

export async function applyPromo(page: Page, code: string) {
  await page.getByRole('textbox', { name: 'Промокод' }).fill(code);
  await page.getByRole('button', { name: 'Применить' }).click();
}

export async function openRegistration(page: Page) {
  await page.getByRole('link', { name: 'Войти', exact: true }).click();
  await page.getByRole('link', { name: 'Зарегистрироваться', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Регистрация' })).toBeVisible();
}

export const sampleUser = () => ({
  email: `qa-${randomUUID()}@shop.example`,
  password: 'DemoPassword123!',
  name: 'Тестовый Покупатель',
});

export async function fillRegistration(page: Page, user: ReturnType<typeof sampleUser>) {
  await page.getByLabel('Имя', { exact: true }).fill(user.name);
  await page.getByLabel('E-mail', { exact: true }).fill(user.email);
  await page.getByLabel('Пароль', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
}
