// Ham ekran görüntülerini mağaza görseline çevirir: üstte başlık, altta yuvarlak köşeli ekran. 1320x2868.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const Y = require('../store/ekran-yazi.json');
const LOCALE = { tr: 'tr', en: 'en-US', de: 'de-DE', ar: 'ar-SA', fr: 'fr-FR', ru: 'ru' };
function bul(kok, ad) {
  for (const f of fs.readdirSync(kok, { withFileTypes: true })) {
    const y = path.join(kok, f.name);
    if (f.isDirectory()) { const r = bul(y, ad); if (r) return r; } else if (f.name === ad) return y;
  }
  return null;
}
const font = (paket, ad) => 'data:font/ttf;base64,' + fs.readFileSync(bul(path.join('node_modules', paket), ad)).toString('base64');
const LORA = font('@expo-google-fonts/lora', 'Lora_700Bold.ttf');
const JAK = font('@expo-google-fonts/plus-jakarta-sans', 'PlusJakartaSans_500Medium.ttf');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
  for (const dil of Object.keys(LOCALE)) {
    const out = `magaza/${LOCALE[dil]}`;
    fs.mkdirSync(out, { recursive: true });
    for (let i = 0; i < Y.sira.length; i++) {
      const ad = Y.sira[i];
      const [bas, alt] = Y.yazi[ad][dil];
      const img = 'data:image/png;base64,' + fs.readFileSync(`ekran/${dil}/${ad}.png`).toString('base64');
      const rtl = dil === 'ar';
      await p.setContent(`<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><style>
        @font-face{font-family:L;src:url(${LORA})} @font-face{font-family:J;src:url(${JAK})}
        html,body{margin:0;width:440px;height:956px;overflow:hidden}
        body{background:radial-gradient(120% 70% at 50% 0%,#22704C 0%,#18583C 45%,#0F3D29 100%);display:flex;flex-direction:column;align-items:center}
        .y{padding:58px 30px 0;text-align:center}
        h1{margin:0;font:700 34px/1.15 L,'Noto Naskh Arabic','Noto Sans Arabic',serif;color:#FBF7EE;text-wrap:balance}
        p{margin:12px 0 0;font:500 17px/1.35 J,'Noto Sans Arabic','Noto Sans',sans-serif;color:#E2C27A;text-wrap:balance}
        .t{margin-top:34px;width:340px;height:739px;border-radius:38px;overflow:hidden;border:3px solid #E2C27A;box-shadow:0 24px 60px rgba(0,0,0,.35);background:#F3ECDC}
        .t img{width:100%;display:block}
      </style></head><body><div class="y"><h1>${bas}</h1><p>${alt}</p></div><div class="t"><img src="${img}"></div></body></html>`);
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(out, `${i + 1}.png`) });
      console.log('CERCEVE', dil, ad);
    }
  }
  await b.close();
})();
