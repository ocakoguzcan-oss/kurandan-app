// Bildirim alanında sıradaki vakte geri sayım (iOS Canlı Etkinlik karşılığı).
// Sessiz, kaydırılamayan bir bildirim; sayaç Android'in kendi kronometresiyle işler, vakit girince kalkar.
package ai.kurandan.ezannative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object CanliBildirim {
  private const val KANAL = "kurandan-canli"
  private const val NO = 7001

  fun destek(ctx: Context): Boolean = NotificationManagerCompat.from(ctx).areNotificationsEnabled()

  fun goster(ctx: Context, sehir: String, vakit: String, saat: String, baslangicMs: Long, bitisMs: Long): Boolean {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (!destek(ctx)) return false
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(KANAL) == null) {
      val k = NotificationChannel(KANAL, ctx.getString(R.string.kw_canli_kanal), NotificationManager.IMPORTANCE_LOW)
      k.setShowBadge(false)
      k.setSound(null, null)
      k.enableVibration(false)
      nm.createNotificationChannel(k)
    }
    val simdi = System.currentTimeMillis()
    if (bitisMs <= simdi) return false
    val ac = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
    val pi = ac?.let { PendingIntent.getActivity(ctx, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT) }
    val b = NotificationCompat.Builder(ctx, KANAL)
      .setSmallIcon(R.drawable.kw_bildirim)
      .setContentTitle("$vakit $saat")
      .setContentText(sehir)
      .setSubText(ctx.getString(R.string.kw_kalan))
      .setWhen(bitisMs)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setTimeoutAfter(bitisMs - simdi + 30_000)
      .setColor(0xFF18583C.toInt())
    if (pi != null) b.setContentIntent(pi)
    return try {
      NotificationManagerCompat.from(ctx).notify(NO, b.build())
      true
    } catch (e: SecurityException) {
      false
    }
  }

  fun kaldir(ctx: Context) {
    NotificationManagerCompat.from(ctx).cancel(NO)
  }
}
