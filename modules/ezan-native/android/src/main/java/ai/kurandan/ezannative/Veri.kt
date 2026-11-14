// Uygulamanın widget'lar için yazdığı veriler (JSON) ve okunması.
// "vakitler": { place, items: [{ n, t (unix sn), h, k }], empty, lang, kalan, tz }
// "ayetler": { list: [{ a, m, s }], baslik }
// "mekan": Vakit Manzarası'nda görünecek yer (kabe, nebevi, aksa, kuba)
package ai.kurandan.ezannative

import android.content.Context
import org.json.JSONObject

data class Vakit(val ad: String, val zamanMs: Long, val saat: String, val kimlik: String)
data class VakitVerisi(val yer: String, val vakitler: List<Vakit>, val bos: String, val kalanKalip: String)
data class Ayet(val arapca: String, val meal: String, val kaynak: String)

object Veri {
  private const val PREFS = "kurandan_widget"

  fun yaz(ctx: Context, key: String, json: String) {
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(key, json).apply()
  }

  fun oku(ctx: Context, key: String): String? =
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(key, null)

  fun vakitler(ctx: Context): VakitVerisi? {
    val s = oku(ctx, "vakitler") ?: return null
    return try {
      val o = JSONObject(s)
      val arr = o.getJSONArray("items")
      val list = (0 until arr.length()).map {
        val v = arr.getJSONObject(it)
        Vakit(v.getString("n"), (v.getDouble("t") * 1000).toLong(), v.getString("h"), v.optString("k", ""))
      }.sortedBy { it.zamanMs }
      VakitVerisi(o.optString("place", ""), list, o.optString("empty", "Kurandan.ai"), o.optString("kalan", "{vakit}"))
    } catch (e: Exception) {
      null
    }
  }

  fun ayetler(ctx: Context): Pair<List<Ayet>, String> {
    val s = oku(ctx, "ayetler") ?: return Pair(emptyList(), "")
    return try {
      val o = JSONObject(s)
      val arr = o.getJSONArray("list")
      Pair((0 until arr.length()).map {
        val a = arr.getJSONObject(it)
        Ayet(a.optString("a"), a.optString("m"), a.optString("s"))
      }, o.optString("baslik", ""))
    } catch (e: Exception) {
      Pair(emptyList(), "")
    }
  }

  fun mekan(ctx: Context): String = oku(ctx, "mekan") ?: "kabe"
}
