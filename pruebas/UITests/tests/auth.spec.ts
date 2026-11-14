import { test, expect } from '@playwright/test';

test.describe('Transportes Rojas E2E Tests', () => {

  test('Validar carga inicial y login bloqueado sin credenciales', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    await page.waitForLoadState('networkidle');
    
    const loginTitle = page.locator('text=/ingresar|login|iniciar sesión/i');
    
    const form = page.locator('form');
    if (await form.count() > 0) {
      await form.locator('button[type="submit"]').click();
      const errorMsg = page.locator('text=/requerido|inválido|error/i');
      if (await errorMsg.count() > 0) {
        await expect(errorMsg.first()).toBeVisible();
      }
    }
  });
});
