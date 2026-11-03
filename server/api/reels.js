// Kurandan.ai Reels sunucusu (Vercel Serverless Function).
// Instagram erişim anahtarı yalnızca burada tutulur; uygulamanın içine asla konmaz.
//
// Ortam değişkenleri (Vercel → Project → Settings → Environment Variables):
//   IG_ACCESS_TOKEN   Instagram uzun ömürlü erişim anahtarı (Instagram API with Instagram Login)
//   IG_API_VERSION    isteğe bağlı, varsayılan v23.0
//
// Uygulama bu adresi çağırır:  GET https://<proje>.vercel.app/api/reels

const FIELDS = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp';

export default async function handler(req, res) {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'IG_ACCESS_TOKEN tanımlı değil' });
    return;
  }
  const version = process.env.IG_API_VERSION || 'v23.0';

  try {
    const reels = [];
    let url = `https://graph.instagram.com/${version}/me/media?fields=${FIELDS}&limit=50&access_token=${encodeURIComponent(token)}`;
    // En fazla 3 sayfa (≈150 gönderi) tara; yalnızca Reels'leri al.
    for (let page = 0; page < 3 && url && reels.length < 60; page++) {
      const r = await fetch(url);
      const json = await r.json();
      if (!r.ok) {
        res.status(502).json({ error: 'Instagram hatası', detail: json?.error?.message });
        return;
      }
      for (const m of json.data || []) {
        const isReel = m.media_product_type === 'REELS' || (m.media_type === 'VIDEO' && !m.media_product_type);
        if (!isReel || !m.media_url) continue;
        reels.push({
          id: m.id,
          caption: m.caption || '',
          thumbnailUrl: m.thumbnail_url || '',
          videoUrl: m.media_url,
          permalink: m.permalink,
          timestamp: m.timestamp,
        });
      }
      url = json.paging?.next;
    }

    // Instagram medya bağlantıları süreli olduğundan kısa önbellek: 15 dk taze, 1 saat bayat sunulabilir.
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ reels, updatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
}
