// Uzun ömürlü Instagram anahtarı 60 gün geçerlidir. Bu uç nokta anahtarı yeniler ve
// yeni anahtarı döner; dönen değeri Vercel'deki IG_ACCESS_TOKEN'a yapıştırın.
// Yetkisiz kullanımı önlemek için ADMIN_SECRET gerekir:
//   GET /api/refresh-token?secret=<ADMIN_SECRET>
export default async function handler(req, res) {
  if (!process.env.ADMIN_SECRET || req.query.secret !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: 'Yetkisiz' });
    return;
  }
  const r = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(process.env.IG_ACCESS_TOKEN || '')}`
  );
  const json = await r.json();
  res.status(r.ok ? 200 : 502).json(json);
}
