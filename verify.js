const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5500');

  await page.waitForTimeout(500);

  // Close tutorial modal
  await page.click('#closeTutorialBtn');

  // Hit hotkeys to place entities
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
  });

  // Click room
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(300, 300);
  await page.mouse.up();

  // Give enough time for the state to initialize.
  await page.waitForTimeout(500);

  // Take a screenshot of the entity settings panel
  await page.screenshot({ path: 'verify.png' });
  await browser.close();
})();
