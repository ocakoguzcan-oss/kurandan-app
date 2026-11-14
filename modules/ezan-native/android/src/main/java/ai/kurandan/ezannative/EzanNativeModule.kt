// Kurandan yerel modülü (Android). iOS'taki EzanNativeModule.swift ile aynı adlar:
// - setWidgetData: widget verisini SharedPreferences'a yazar ve widget'ları yeniler
// - liveStart / liveStop: bildirim alanında sıradaki vakte geri sayım (iOS'taki Canlı Etkinlik karşılığı)
// - AlarmKit yalnız iOS'ta: Android'de sabah alarmı, alarm ses akışındaki bildirim kanalıyla yapılır (JS tarafı)
package ai.kurandan.ezannative

import android.app.AlarmManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EzanNativeModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext?.applicationContext ?: throw IllegalStateException("context yok")

  override fun definition() = ModuleDefinition {
    Name("EzanNative")

    Function("setWidgetData") { _: String, key: String, json: String ->
      Veri.yaz(ctx, key, json)
      Widgetlar.hepsiniGuncelle(ctx)
    }

    Function("diagnose") { _: String, key: String ->
      mapOf("group" to true, "dataLength" to (Veri.oku(ctx, key)?.length ?: 0), "ios" to "Android ${Build.VERSION.RELEASE}")
    }

    Function("alarmSupported") { false }
    AsyncFunction("alarmPermission") { _: Boolean -> "unsupported" }
    AsyncFunction("scheduleAlarms") { _: List<Map<String, Any>>, _: String, _: String -> 0 }
    AsyncFunction("testAlarm") { _: Double, _: String, _: String, _: String -> false }
    AsyncFunction("cancelAlarms") { }

    Function("liveSupported") { CanliBildirim.destek(ctx) }

    AsyncFunction("liveStart") { city: String, vakit: String, saat: String, startMs: Double, endMs: Double ->
      CanliBildirim.goster(ctx, city, vakit, saat, startMs.toLong(), endMs.toLong())
    }

    AsyncFunction("liveStop") {
      CanliBildirim.kaldir(ctx)
    }

    // Tam vaktinde alarm izni (Android 12+): kapalıysa bildirimler birkaç dakika gecikebilir
    Function("exactAlarmOk") {
      if (Build.VERSION.SDK_INT < 31) true
      else (ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
    }

    Function("openExactAlarm") {
      if (Build.VERSION.SDK_INT >= 31) ac(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${ctx.packageName}")))
      else ac(uygulamaAyari())
    }

    // Pil kısıtlaması: açıksa bazı telefonlar (Xiaomi, Samsung, Huawei) bildirimleri geciktirir ya da hiç göstermez
    Function("batteryOk") {
      (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(ctx.packageName)
    }

    Function("openAppSettings") { ac(uygulamaAyari()) }

    // Ana ekrana widget ekleme penceresi (Android 8+, başlatıcı destekliyorsa)
    Function("pinSupported") {
      Build.VERSION.SDK_INT >= 26 && AppWidgetManager.getInstance(ctx).isRequestPinAppWidgetSupported
    }

    Function("pinWidget") { tur: String ->
      if (Build.VERSION.SDK_INT < 26) return@Function false
      val sinif = when (tur) {
        "manzara" -> ManzaraWidgetProvider::class.java
        "ayet" -> AyetWidgetProvider::class.java
        else -> VakitWidgetProvider::class.java
      }
      val awm = AppWidgetManager.getInstance(ctx)
      if (!awm.isRequestPinAppWidgetSupported) return@Function false
      awm.requestPinAppWidget(ComponentName(ctx, sinif), null, null)
    }
  }

  private fun uygulamaAyari() = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${ctx.packageName}"))

  private fun ac(i: Intent): Boolean = try {
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    ctx.startActivity(i)
    true
  } catch (e: Exception) {
    try {
      ctx.startActivity(uygulamaAyari().addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    } catch (e2: Exception) {
      false
    }
  }
}
