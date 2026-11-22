import { expect, test } from '@playwright/test';
import { brazil, productCard } from './support/shop';

test('поиск по названию и описанию, пустая выдача и сброс', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: 'Поиск' });
  const cards = page.getByTestId('product-card');

  await search.fill('  БРАЗИЛИЯ  ');
  await expect(cards).toHaveCount(1);
  await expect(productCard(page, brazil)).toBeVisible();

  await search.fill('swiss water');
  const decaf = productCard(page, 'Кофе Колумбия без кофеина, 250 г');
  await expect(cards).toHaveCount(1);
  await expect(decaf).toBeVisible();
  await expect(decaf.getByText('Нет в наличии')).toBeVisible();
  await expect(decaf.getByRole('button', { name: 'В корзину' })).toBeDisabled();

  await search.fill('товар которого нет 123');
  await expect(page.getByTestId('empty-list')).toBeVisible();
  await expect(cards).toHaveCount(0);

  await search.clear();
  await expect(cards).toHaveCount(16);
});

test('фильтр по категории совместим с сортировкой по цене', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Категория' }).selectOption({ label: 'Чай' });
  const sort = page.getByRole('combobox', { name: 'Сортировка' });
  const titles = page.getByTestId('product-card').getByRole('link');
  const teas = ['Чай Ассам крупнолистовой, 200 г', 'Чай Те Гуань Инь, 100 г', 'Матча церемониальная, 30 г'];

  await sort.selectOption({ label: 'Сначала дешёвые' });
  await expect(titles).toHaveText(teas);
  await sort.selectOption({ label: 'Сначала дорогие' });
  await expect(titles).toHaveText([...teas].reverse());
});
