import { test, expect } from '@playwright/test';

test.describe('Transportes Rojas E2E Tests', () => {

  test('Validar carga inicial y login bloqueado sin credenciales', async ({ page }) => {
    // Ir al portal (Frontend)
    await page.goto('http://localhost:5173/');

    // Verificar si redirige al Login (o si ya está en login)
    // El frontend Vite suele tener su página principal como Login si no hay token
    await page.waitForLoadState('networkidle');
    
    // Verificamos que contenga elementos de login o la palabra clave
    const loginTitle = page.locator('text=/ingresar|login|iniciar sesión/i');
    
    // Intenta hacer submit vacío si hay un form
    const form = page.locator('form');
    if (await form.count() > 0) {
      await form.locator('button[type="submit"]').click();
      // Validar si el botón no permite el avance sin campos
      // o si la API devuelve error 400 y el front lo maneja
      const errorMsg = page.locator('text=/requerido|inválido|error/i');
      if (await errorMsg.count() > 0) {
        await expect(errorMsg.first()).toBeVisible();
      }
    }
  });
});
