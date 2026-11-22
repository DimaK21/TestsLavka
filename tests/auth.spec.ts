import { expect, test } from '@playwright/test';
import { fillRegistration, openRegistration, sampleUser } from './support/shop';

test('регистрация, выход, ошибочный пароль и повторный вход', async ({ page }) => {
  await page.goto('/');
  await openRegistration(page);
  const user = sampleUser();
  await fillRegistration(page, user);
  const header = page.getByRole('banner');
  await expect(header.getByText(user.name, { exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Мои заказы' })).toBeVisible();

  await header.getByRole('button', { name: 'Выйти' }).click();
  await expect(header.getByRole('link', { name: 'Мои заказы' })).toBeHidden();
  await header.getByRole('link', { name: 'Войти' }).click();
  await page.getByLabel('E-mail', { exact: true }).fill(user.email.toUpperCase());
  const password = page.getByLabel('Пароль', { exact: true });
  await password.fill('IncorrectPassword');
  const login = page.getByRole('button', { name: 'Войти', exact: true });
  await login.click();
  await expect(page.getByRole('alert')).toHaveText('Неверный e-mail или пароль');
  await expect(header.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
  expect(await (await page.request.get('/api/auth/me')).json()).toEqual({ user: null });

  await password.fill(user.password);
  await login.click();
  await expect(header.getByText(user.name, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Каталог', exact: true })).toBeVisible();
  await page.reload();
  await expect(header.getByText(user.name, { exact: true })).toBeVisible();
});

test('регистрация сообщает об ошибках полей и занятом e-mail', async ({ page, request }) => {
  const user = sampleUser();
  const created = await request.post('/api/auth/register', { data: user });
  expect(created.status()).toBe(201);

  await page.goto('/');
  await openRegistration(page);
  await fillRegistration(page, { name: 'А', email: 'bad-email', password: '123' });
  await expect(page.getByRole('alert')).toHaveText('Проверьте поля формы');
  await expect(page.getByText('Укажите имя', { exact: true })).toBeVisible();
  await expect(page.getByText('Укажите корректный e-mail')).toBeVisible();
  await expect(page.getByText('Пароль должен быть не короче 6 символов')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Регистрация' })).toBeVisible();
  await fillRegistration(page, { ...user, email: user.email.toUpperCase() });
  await expect(page.getByRole('alert')).toHaveText('Пользователь с таким e-mail уже зарегистрирован');
  await expect(page.getByText('E-mail уже занят')).toBeVisible();
  expect(await (await page.request.get('/api/auth/me')).json()).toEqual({ user: null });
});
