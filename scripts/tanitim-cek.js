// Tanıtım videoları için uygulama durumları (web derlemesi): 390x844 @3x = 1170x2532 PNG.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'tanitim';
fs.mkdirSync(OUT, { recursive: true });
const PREFS = { largeText: false, permissionIntroShown: true, mushafSize: 1, onboarding: 'done', mushafTap: 'line', mushafMeal: true, lang: 'tr', tema: 'light' };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'tr-TR', timezoneId: 'Europe/Istanbul',
    geolocation: { latitude: 41.0165, longitude: 28.9497 }, permissions: ['geolocation'],
  });
  await ctx.addInitScript((p) => localStorage.setItem('kurandan.prefs.v1', JSON.stringify(p)), PREFS);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('SAYFA HATASI', String(e).slice(0, 200)));
  const git = async (yol, bekle = 4000) => {
    try { await p.goto('http://localhost:8081' + yol, { waitUntil: 'networkidle', timeout: 45000 }); } catch { console.log('YAVAS', yol); }
    await p.waitForTimeout(bekle);
  };
  const cek = async (ad) => { await p.screenshot({ path: `${OUT}/${ad}.png` }); console.log('CEKILDI', ad); };
  const kaydir = async (px) => { await p.mouse.move(195, 500); await p.mouse.wheel(0, px); await p.waitForTimeout(1200); };

  await git('/'); await cek('ana-1'); await kaydir(420); await cek('ana-2'); await kaydir(500); await cek('ana-3');
  await git('/kuran', 6000); await cek('kuran-1');
  try { await p.mouse.click(195, 330); await p.waitForTimeout(1500); await cek('kuran-2'); } catch (e) { console.log('kuran tik', e.message); }
  await git('/hatim'); await cek('hatim');
  await git('/kible'); await cek('kible');
  await git('/zikir');
  for (let i = 0; i < 12; i++) { await p.mouse.click(195, 520); await p.waitForTimeout(90); }
  await p.waitForTimeout(800); await cek('zikir');
  await git('/imsakiye'); await cek('imsakiye');
  await git('/namaz-takip');
  for (const y of [272, 302, 332]) { try { await p.mouse.click(357, y); await p.waitForTimeout(400); } catch {} }
  await p.waitForTimeout(800); await cek('namaz-takip');
  await git('/camiler', 12000); await cek('camiler');
  await git('/dini-gunler'); await cek('dini-gunler');
  await git('/ayarlar'); await cek('ayarlar');
  await git('/kabe-yolu'); await cek('kabe-yolu-1'); await kaydir(700); await cek('kabe-yolu-2');
  await git('/kart'); await cek('kart');
  await git('/dua'); await cek('dua');
  await git('/hicri-takvim'); await cek('hicri-takvim');
  await git('/kuran', 6000); await p.mouse.click(195, 330); await p.waitForTimeout(800); await p.mouse.click(258, 795); await p.waitForTimeout(2500); await cek('kuran-3');
  await git('/'); await kaydir(900); await cek('ana-4');
  await b.close();
})();
