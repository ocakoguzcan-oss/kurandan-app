// Bildirim alanında sıradaki vakte geri sayım (iOS Canlı Etkinlik karşılığı).
// - Uygulama kapalıyken de kendi kendine sonraki vakte geçer (widget verisindeki 3 günlük vakitlerle).
// - Kullanıcı kaydırıp silse bile ekran bir sonraki açılışında (kilit açılınca) geri gelir.
// - Vakte 1 saatten az kalınca durum çubuğundaki simge kalan dakikayı gösterir (dakikada bir yenilenir).
// Alarmlar uyandırmayan türdendir: ekran kapalıyken pil harcamaz, ekran açılınca hemen çalışır.
package ai.kurandan.ezannative

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.IconCompat

/** Dakika yenilemesi, vakit geçişi, silinme ve açılış (yeniden başlatma / güncelleme) olayları */
class CanliAlici : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    when (intent.action) {
      CanliBildirim.SILINDI -> CanliBildirim.silindi(ctx.applicationContext)
      else -> CanliBildirim.yenile(ctx.applicationContext)
    }
  }
}

object CanliBildirim {
  private const val KANAL = "kurandan-canli"
  private const val NO = 7001
  private const val PREFS = "kurandan_canli"
  private const val SON_SAAT = 60 * 60 * 1000L
  const val SILINDI = "ai.kurandan.canli.SILINDI"
  private const val YENILE = "ai.kurandan.canli.YENILE"

  private var ekranAlici: BroadcastReceiver? = null

  fun destek(ctx: Context): Boolean = NotificationManagerCompat.from(ctx).areNotificationsEnabled()

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Uygulamadan açılır; bundan sonra bildirim kendi kendine sürer */
  fun goster(ctx: Context, sehir: String, vakit: String, saat: String, baslangicMs: Long, bitisMs: Long): Boolean {
    if (!destek(ctx)) return false
    prefs(ctx).edit()
      .putBoolean("acik", true)
      .putString("sehir", sehir).putString("vakit", vakit).putString("saat", saat)
      .putLong("bitis", bitisMs)
      .apply()
    return yenile(ctx)
  }

  fun kaldir(ctx: Context) {
    prefs(ctx).edit().putBoolean("acik", false).apply()
    alarmIptal(ctx)
    ekranDinlemeBirak(ctx)
    NotificationManagerCompat.from(ctx).cancel(NO)
  }

  /** Bildirimi şu anki duruma göre yeniden çizer ve bir sonraki yenilemeyi kurar */
  fun yenile(ctx: Context): Boolean {
    val p = prefs(ctx)
    if (!p.getBoolean("acik", false) || !destek(ctx)) return false
    val simdi = System.currentTimeMillis()

    // Sıradaki vakit: önce widget verisi (uygulama kapalıyken de sonraki günlere geçer), yoksa son gönderilen
    var vakit = p.getString("vakit", "") ?: ""
    var saat = p.getString("saat", "") ?: ""
    var sehir = p.getString("sehir", "") ?: ""
    var bitis = p.getLong("bitis", 0)
    val veri = Veri.vakitler(ctx)
    val sonraki = veri?.vakitler?.firstOrNull { it.zamanMs > simdi + 1000 }
    if (veri != null && sonraki != null) {
      vakit = sonraki.ad
      saat = sonraki.saat
      bitis = sonraki.zamanMs
      if (veri.yer.isNotEmpty()) sehir = veri.yer
    }
    if (bitis <= simdi) {
      NotificationManagerCompat.from(ctx).cancel(NO)
      return false
    }

    kanal(ctx)
    val kalan = bitis - simdi
    val ac = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
    val pi = ac?.let { PendingIntent.getActivity(ctx, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT) }
    val sil = PendingIntent.getBroadcast(
      ctx, 7002, Intent(ctx, CanliAlici::class.java).setAction(SILINDI),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    // Ezan uygulamalarındaki alışılmış düzen: başlıkta yer (ilçe), yanında "Akşam: 17:01", altında "1 saat 41 dk kaldı."
    val yer = sehir.substringAfterLast(",").trim().ifEmpty { sehir }
    val dkToplam = ((kalan + 59_999) / 60_000).toInt()
    val kalip = Veri.kalanKaliplari(ctx)
    val kalanYazi = if (dkToplam >= 60) {
      kalip.first.replace("{s}", (dkToplam / 60).toString()).replace("{d}", (dkToplam % 60).toString())
    } else {
      kalip.second.replace("{d}", dkToplam.toString())
    }
    val b = NotificationCompat.Builder(ctx, KANAL)
      .setContentTitle(yer.ifEmpty { "$vakit $saat" })
      .setContentText(kalanYazi)
      .setSubText("$vakit: $saat")
      .setWhen(bitis)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setDeleteIntent(sil)
      .setColor(0xFF18583C.toInt())
    // Son bir saatte durum çubuğunda kalan dakika
    val dk = ((kalan + 59_999) / 60_000).toInt()
    if (kalan <= SON_SAAT && Build.VERSION.SDK_INT >= 23) {
      b.setSmallIcon(IconCompat.createWithBitmap(sayiSimgesi(ctx, dk.coerceIn(1, 59))))
    } else {
      b.setSmallIcon(R.drawable.kw_bildirim)
    }
    if (pi != null) b.setContentIntent(pi)

    val oldu = try {
      NotificationManagerCompat.from(ctx).notify(NO, b.build())
      true
    } catch (e: Exception) {
      false
    }

    // Sonraki yenileme: kalan dakika değişince (yazı ve simge güncellensin); en geç vakit girişi.
    // Uyandırmayan alarm: ekran kapalıyken çalışmaz, pil harcamaz.
    val hedef = minOf(bitis + 1500, simdi + (kalan % 60_000).let { if (it < 1000) 60_000 else it } + 300)
    alarmKur(ctx, hedef)
    return oldu
  }

  /** Kullanıcı bildirimi kaydırıp sildi: ekran bir dahaki açılışında geri gelir */
  fun silindi(ctx: Context) {
    if (!prefs(ctx).getBoolean("acik", false)) return
    ekranDinle(ctx)
    // Uygulama süreci kapanmışsa dinleyici de gider: uyandırmayan alarm ekran açılınca çalışır
    alarmKur(ctx, System.currentTimeMillis() + 2 * 60_000)
  }

  private fun ekranDinle(ctx: Context) {
    if (ekranAlici != null) return
    val r = object : BroadcastReceiver() {
      override fun onReceive(c: Context, i: Intent) {
        ekranDinlemeBirak(c.applicationContext)
        yenile(c.applicationContext)
      }
    }
    val f = IntentFilter().apply {
      addAction(Intent.ACTION_USER_PRESENT)
      addAction(Intent.ACTION_SCREEN_ON)
    }
    try {
      ContextCompat.registerReceiver(ctx.applicationContext, r, f, ContextCompat.RECEIVER_NOT_EXPORTED)
      ekranAlici = r
    } catch (e: Exception) {
      // kayıt olmazsa alarm yedeği yeter
    }
  }

  private fun ekranDinlemeBirak(ctx: Context) {
    val r = ekranAlici ?: return
    ekranAlici = null
    try {
      ctx.applicationContext.unregisterReceiver(r)
    } catch (e: Exception) {
    }
  }

  private fun alarmPi(ctx: Context) = PendingIntent.getBroadcast(
    ctx, 7003, Intent(ctx, CanliAlici::class.java).setAction(YENILE),
    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
  )

  private fun alarmKur(ctx: Context, zaman: Long) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = alarmPi(ctx)
    try {
      // RTC (uyandırmayan): ekran kapalıyken bekler, açılınca hemen çalışır
      if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExact(AlarmManager.RTC, zaman, pi)
      else am.setWindow(AlarmManager.RTC, zaman, 30_000, pi)
    } catch (e: Exception) {
      am.set(AlarmManager.RTC, zaman, pi)
    }
  }

  private fun alarmIptal(ctx: Context) {
    (ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(alarmPi(ctx))
  }

  private fun kanal(ctx: Context) {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(KANAL) == null) {
      val k = NotificationChannel(KANAL, ctx.getString(R.string.kw_canli_kanal), NotificationManager.IMPORTANCE_LOW)
      k.setShowBadge(false)
      k.setSound(null, null)
      k.enableVibration(false)
      nm.createNotificationChannel(k)
    }
  }

  /** Durum çubuğu simgesi: üstte kalan dakika, altta küçük cami (sistem beyaza boyar, yalnız şekil kullanılır) */
  private fun sayiSimgesi(ctx: Context, dk: Int): Bitmap {
    val boy = (24 * ctx.resources.displayMetrics.density).toInt().coerceAtLeast(24)
    val bmp = Bitmap.createBitmap(boy, boy, Bitmap.Config.ARGB_8888)
    val c = Canvas(bmp)
    val f = boy.toFloat()
    val boya = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }

    // Rakam: üst %58
    val yazi = dk.toString()
    boya.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    boya.textAlign = Paint.Align.CENTER
    boya.textSize = f * 0.60f
    val gen = boya.measureText(yazi)
    if (gen > f * 0.98f) boya.textSize *= (f * 0.98f) / gen
    val ustYukseklik = f * 0.58f
    c.drawText(yazi, f / 2f, ustYukseklik / 2f - (boya.descent() + boya.ascent()) / 2f, boya)

    // Cami: alt %40 — kubbe, gövde ve iki minare
    val taban = f * 0.99f
    val govdeUst = f * 0.82f
    c.drawRect(f * 0.30f, govdeUst, f * 0.70f, taban, boya)
    c.drawArc(android.graphics.RectF(f * 0.32f, f * 0.66f, f * 0.68f, f * 0.98f), 180f, 180f, true, boya)
    c.drawRect(f * 0.48f, f * 0.62f, f * 0.52f, f * 0.67f, boya)
    for (x in floatArrayOf(f * 0.16f, f * 0.78f)) {
      c.drawRect(x, f * 0.68f, x + f * 0.06f, taban, boya)
      val uc = android.graphics.Path().apply {
        moveTo(x - f * 0.005f, f * 0.68f)
        lineTo(x + f * 0.03f, f * 0.61f)
        lineTo(x + f * 0.065f, f * 0.68f)
        close()
      }
      c.drawPath(uc, boya)
    }
    return bmp
  }
}
