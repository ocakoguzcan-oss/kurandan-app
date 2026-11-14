// Kurandan yerel modülü (Android). iOS'taki EzanNativeModule.swift ile aynı adlar:
// - setWidgetData: widget verisini SharedPreferences'a yazar ve widget'ları yeniler
// - liveStart / liveStop: bildirim alanında sıradaki vakte geri sayım (iOS'taki Canlı Etkinlik karşılığı)
// - AlarmKit yalnız iOS'ta: Android'de sabah alarmı, alarm ses akışındaki bildirim kanalıyla yapılır (JS tarafı)
package ai.kurandan.ezannative

import android.content.Context
import android.os.Build
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
  }
}
