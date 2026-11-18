// Web derlemesinden mağaza ekran görüntüleri: her dil için birkaç ekran, 440x956 @3x = 1320x2868.
const { chromium } = require('playwright');
const fs = require('fs');
const DILLER = ['tr', 'en', 'de', 'ar', 'fr', 'ru'];
const EKRANLAR = [
  ['1-vakitler', '/'],
  ['2-kuran', '/kuran'],
  ['3-kible', '/kible'],
  ['4-zikir', '/zikir'],
  ['5-imsakiye', '/imsakiye'],
  ['6-namaz-takip', '/namaz-takip'],
  ['7-dini-gunler', '/dini-gunler'],
  ['8-hatim', '/hatim'],
];
(async () => {
  const b = await chromium.launch();
  for (const dil of DILLER) {
    fs.mkdirSync(`ekran/${dil}`, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, locale: dil, timezoneId: 'Europe/Istanbul' });
    await ctx.addInitScript((d) => {
      localStorage.setItem('kurandan.prefs.v1', JSON.stringify({ largeText: false, permissionIntroShown: true, mushafSize: 1, onboarding: 'done', mushafTap: 'line', mushafMeal: true, lang: d, tema: 'light' }));
    }, dil);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('SAYFA HATASI', dil, String(e).slice(0, 200)));
    for (const [ad, yol] of EKRANLAR) {
      try {
        await p.goto('http://localhost:8081' + yol, { waitUntil: 'networkidle', timeout: 45000 });
      } catch (e) {
        console.log('YAVAS', dil, ad);
      }
      await p.waitForTimeout(3500);
      await p.screenshot({ path: `ekran/${dil}/${ad}.png` });
      console.log('CEKILDI', dil, ad);
    }
    await ctx.close();
  }
  await b.close();
})();
