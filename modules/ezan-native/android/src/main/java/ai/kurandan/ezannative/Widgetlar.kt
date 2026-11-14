// Android ana ekran widget'ları (iOS'takilerin karşılığı):
// - Vakit: şehir, sıradaki vakit ve geri sayım (küçük)
// - Vakit Manzarası: vakte göre değişen gökyüzü, mübarek mekân çizimi, geri sayım ve günün altı vakti
// - Günün Ayeti: mealiyle bir ayet, yarım saatte bir değişir
// Geri sayımı Android'in kronometresi işletir; vakit girince ve yarım saatte bir AlarmManager widget'ları yeniler.
package ai.kurandan.ezannative

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews

class VakitWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) = Widgetlar.hepsiniGuncelle(ctx)
}

class ManzaraWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) = Widgetlar.hepsiniGuncelle(ctx)
}

class AyetWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) = Widgetlar.hepsiniGuncelle(ctx)
}

/** AlarmManager'ın tetiklediği yenileme */
class WidgetGuncelleyici : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) = Widgetlar.hepsiniGuncelle(ctx)
}

object Widgetlar {
  private const val AYET_ARALIK = 30 * 60 * 1000L
  private val TIMES = intArrayOf(R.id.kw_t0, R.id.kw_t1, R.id.kw_t2, R.id.kw_t3, R.id.kw_t4, R.id.kw_t5)
  private val NAMES = intArrayOf(R.id.kw_n0, R.id.kw_n1, R.id.kw_n2, R.id.kw_n3, R.id.kw_n4, R.id.kw_n5)
  private val CELLS = intArrayOf(R.id.kw_c0, R.id.kw_c1, R.id.kw_c2, R.id.kw_c3, R.id.kw_c4, R.id.kw_c5)

  fun hepsiniGuncelle(ctx: Context) {
    val mgr = AppWidgetManager.getInstance(ctx)
    val vakitIds = mgr.getAppWidgetIds(ComponentName(ctx, VakitWidgetProvider::class.java))
    val manzaraIds = mgr.getAppWidgetIds(ComponentName(ctx, ManzaraWidgetProvider::class.java))
    val ayetIds = mgr.getAppWidgetIds(ComponentName(ctx, AyetWidgetProvider::class.java))
    val veri = Veri.vakitler(ctx)
    val simdi = System.currentTimeMillis()
    val idx = veri?.vakitler?.indexOfFirst { it.zamanMs > simdi + 1000 } ?: -1

    for (id in vakitIds) mgr.updateAppWidget(id, vakitGorunumu(ctx, veri, idx))
    for (id in manzaraIds) mgr.updateAppWidget(id, manzaraGorunumu(ctx, veri, idx))
    if (ayetIds.isNotEmpty()) {
      val v = ayetGorunumu(ctx, simdi)
      for (id in ayetIds) mgr.updateAppWidget(id, v)
    }

    // Sıradaki yenileme: vakit girişi (tam zamanında) ya da ayet için yarım saat sonra
    val sonrakiVakit = if (veri != null && idx >= 0) veri.vakitler[idx].zamanMs + 2000 else Long.MAX_VALUE
    val sonrakiAyet = if (ayetIds.isNotEmpty()) simdi + AYET_ARALIK else Long.MAX_VALUE
    val hedef = minOf(sonrakiVakit, sonrakiAyet)
    if (hedef != Long.MAX_VALUE && (vakitIds.isNotEmpty() || manzaraIds.isNotEmpty() || ayetIds.isNotEmpty())) {
      zamanla(ctx, hedef, hedef == sonrakiVakit && (vakitIds.isNotEmpty() || manzaraIds.isNotEmpty()))
    }
  }

  private fun zamanla(ctx: Context, zaman: Long, tam: Boolean) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = PendingIntent.getBroadcast(
      ctx, 9001, Intent(ctx, WidgetGuncelleyici::class.java),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    try {
      val tamIzin = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
      if (tam && tamIzin) am.setExactAndAllowWhileIdle(AlarmManager.RTC, zaman, pi)
      else am.setAndAllowWhileIdle(AlarmManager.RTC, zaman, pi)
    } catch (e: SecurityException) {
      am.set(AlarmManager.RTC, zaman, pi)
    }
  }

  private fun acmaNiyeti(ctx: Context): PendingIntent? {
    val i = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: return null
    return PendingIntent.getActivity(ctx, 0, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  /** Kronometre tabanı: hedef zamana kalan süre (geri sayım) */
  private fun kronometre(v: RemoteViews, id: Int, hedefMs: Long) {
    val taban = SystemClock.elapsedRealtime() + (hedefMs - System.currentTimeMillis())
    v.setChronometer(id, taban, null, true)
    v.setChronometerCountDown(id, true)
  }

  // ----- Vakit (küçük) -----
  private fun vakitGorunumu(ctx: Context, veri: VakitVerisi?, idx: Int): RemoteViews {
    val v = RemoteViews(ctx.packageName, R.layout.kw_vakit)
    acmaNiyeti(ctx)?.let { v.setOnClickPendingIntent(R.id.kw_kok, it) }
    if (veri == null || idx < 0) {
      v.setTextViewText(R.id.kw_yer, "Kurandan.ai")
      v.setTextViewText(R.id.kw_ad, veri?.bos ?: "")
      v.setTextViewText(R.id.kw_saat, "")
      v.setViewVisibility(R.id.kw_sayac, View.GONE)
      return v
    }
    val n = veri.vakitler[idx]
    v.setTextViewText(R.id.kw_yer, veri.yer)
    v.setTextViewText(R.id.kw_ad, n.ad)
    v.setTextViewText(R.id.kw_saat, n.saat)
    v.setViewVisibility(R.id.kw_sayac, View.VISIBLE)
    kronometre(v, R.id.kw_sayac, n.zamanMs)
    return v
  }

  // ----- Vakit Manzarası (orta) -----
  private fun gokyuzu(donem: String): Int = when (donem) {
    "imsak" -> R.drawable.kw_gok_imsak
    "gunes" -> R.drawable.kw_gok_gunes
    "ogle" -> R.drawable.kw_gok_ogle
    "ikindi" -> R.drawable.kw_gok_ikindi
    "aksam" -> R.drawable.kw_gok_aksam
    else -> R.drawable.kw_gok_yatsi
  }

  private fun cami(mekan: String, gece: Boolean): Int = when (mekan) {
    "nebevi" -> if (gece) R.drawable.kw_cami_nebevi_gece else R.drawable.kw_cami_nebevi_gunduz
    "aksa" -> if (gece) R.drawable.kw_cami_aksa_gece else R.drawable.kw_cami_aksa_gunduz
    "kuba" -> if (gece) R.drawable.kw_cami_kuba_gece else R.drawable.kw_cami_kuba_gunduz
    else -> if (gece) R.drawable.kw_cami_kabe_gece else R.drawable.kw_cami_kabe_gunduz
  }

  private fun manzaraGorunumu(ctx: Context, veri: VakitVerisi?, idx: Int): RemoteViews {
    val v = RemoteViews(ctx.packageName, R.layout.kw_manzara)
    acmaNiyeti(ctx)?.let { v.setOnClickPendingIntent(R.id.kw_kok, it) }
    if (veri == null || idx < 0) {
      v.setInt(R.id.kw_kok, "setBackgroundResource", R.drawable.kw_gok_ogle)
      v.setImageViewResource(R.id.kw_cami, cami(Veri.mekan(ctx), false))
      v.setTextViewText(R.id.kw_kalan, veri?.bos ?: "Kurandan.ai")
      v.setViewVisibility(R.id.kw_sayac, View.GONE)
      v.setViewVisibility(R.id.kw_satir, View.GONE)
      return v
    }
    val n = veri.vakitler[idx]
    val donem = if (idx > 0) veri.vakitler[idx - 1].kimlik else "yatsi"
    val gece = donem == "yatsi" || donem == "aksam" || donem == "imsak"
    val yazi = if (gece) Color.WHITE else Color.rgb(20, 35, 58)
    val soluk = if (gece) Color.argb(200, 255, 255, 255) else Color.argb(185, 20, 35, 58)

    v.setInt(R.id.kw_kok, "setBackgroundResource", gokyuzu(donem))
    v.setImageViewResource(R.id.kw_cami, cami(Veri.mekan(ctx), gece))
    v.setImageViewResource(R.id.kw_gok_isik, if (gece) R.drawable.kw_ay else R.drawable.kw_gunes)
    v.setTextViewText(R.id.kw_yer, veri.yer)
    v.setTextColor(R.id.kw_yer, soluk)
    v.setTextViewText(R.id.kw_kalan, veri.kalanKalip.replace("{vakit}", n.ad))
    v.setTextColor(R.id.kw_kalan, soluk)
    v.setTextColor(R.id.kw_sayac, yazi)
    v.setViewVisibility(R.id.kw_sayac, View.VISIBLE)
    v.setViewVisibility(R.id.kw_satir, View.VISIBLE)
    kronometre(v, R.id.kw_sayac, n.zamanMs)

    // Sıradaki vaktin günündeki altı vakit (veri günde altı vakit sırasıyla yazılır)
    val bas = (idx / 6) * 6
    for (i in 0 until 6) {
      val g = veri.vakitler.getOrNull(bas + i)
      val on = bas + i == idx
      v.setTextViewText(NAMES[i], g?.ad ?: "")
      v.setTextViewText(TIMES[i], g?.saat ?: "")
      val renk = if (on) Color.rgb(24, 88, 60) else yazi
      v.setTextColor(NAMES[i], renk)
      v.setTextColor(TIMES[i], renk)
      v.setInt(CELLS[i], "setBackgroundResource", if (on) R.drawable.kw_vurgu else android.R.color.transparent)
    }
    return v
  }

  // ----- Günün Ayeti -----
  private fun ayetGorunumu(ctx: Context, simdi: Long): RemoteViews {
    val v = RemoteViews(ctx.packageName, R.layout.kw_ayet)
    acmaNiyeti(ctx)?.let { v.setOnClickPendingIntent(R.id.kw_kok, it) }
    val (list, baslik) = Veri.ayetler(ctx)
    v.setTextViewText(R.id.kw_baslik, (if (baslik.isEmpty()) ctx.getString(R.string.kw_ayet_ad) else baslik).uppercase())
    if (list.isEmpty()) {
      v.setTextViewText(R.id.kw_arapca, "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ")
      v.setTextViewText(R.id.kw_meal, ctx.getString(R.string.kw_ayet_bos))
      v.setTextViewText(R.id.kw_kaynak, "")
      return v
    }
    val dilim = (simdi / AYET_ARALIK).toInt()
    val a = list[Math.floorMod(dilim * 7, list.size)]
    v.setTextViewText(R.id.kw_arapca, a.arapca)
    v.setViewVisibility(R.id.kw_arapca, if (a.arapca.isEmpty() || a.meal.isEmpty()) View.GONE else View.VISIBLE)
    v.setTextViewText(R.id.kw_meal, "“${if (a.meal.isEmpty()) a.arapca else a.meal}”")
    v.setTextViewText(R.id.kw_kaynak, a.kaynak)
    return v
  }
}
