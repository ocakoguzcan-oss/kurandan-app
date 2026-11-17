// Android kıble pusulası. Expo'nun yön bilgisi yalnız manyetometreye bakar, geç ve titrek gelir.
// Burada iPhone'daki gibi jiroskop + ivmeölçer + manyetometre birleşik "dönme vektörü" algılayıcısı kullanılır,
// ekran yönüne göre düzeltilir, manyetik sapma eklenerek gerçek kuzeye çevrilir ve yumuşatılır.
package ai.kurandan.ezannative

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.view.Surface
import android.view.WindowManager
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

class Pusula(private val ctx: Context, private val gonder: (Double, Int) -> Unit) : SensorEventListener {
  private val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  private val donme = sm.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
  private val ivme = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
  private val manyetik = sm.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
  private val g = FloatArray(3)
  private val m = FloatArray(3)
  private var gVar = false
  private var mVar = false
  private val r = FloatArray(9)
  private val r2 = FloatArray(9)
  private val o = FloatArray(3)
  private var sapma = 0f
  private var hassasiyet = 3
  // Yumuşatma: açıyı birim çember üzerinde ortalarız (359° → 1° geçişinde zıplamasın)
  private var sx = Double.NaN
  private var sy = 0.0
  private var sonGonderim = 0L
  private var sonDeger = Double.NaN

  fun basla(lat: Double, lng: Double): Boolean {
    sapma = GeomagneticField(lat.toFloat(), lng.toFloat(), 0f, System.currentTimeMillis()).declination
    var oldu = false
    if (donme != null) oldu = sm.registerListener(this, donme, SensorManager.SENSOR_DELAY_GAME)
    if (!oldu && ivme != null && manyetik != null) {
      oldu = sm.registerListener(this, ivme, SensorManager.SENSOR_DELAY_GAME) &&
        sm.registerListener(this, manyetik, SensorManager.SENSOR_DELAY_GAME)
    } else if (oldu && manyetik != null) {
      // Yalnız hassasiyet (kalibrasyon) bilgisi için
      sm.registerListener(this, manyetik, SensorManager.SENSOR_DELAY_UI)
    }
    return oldu
  }

  fun dur() {
    sm.unregisterListener(this)
    sx = Double.NaN
    gVar = false
    mVar = false
  }

  override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {
    if (sensor.type == Sensor.TYPE_MAGNETIC_FIELD) hassasiyet = accuracy
  }

  override fun onSensorChanged(e: SensorEvent) {
    when (e.sensor.type) {
      Sensor.TYPE_ROTATION_VECTOR -> {
        SensorManager.getRotationMatrixFromVector(r, e.values)
        hesapla()
      }
      Sensor.TYPE_ACCELEROMETER -> {
        for (i in 0..2) g[i] = if (gVar) g[i] + 0.2f * (e.values[i] - g[i]) else e.values[i]
        gVar = true
        if (mVar && SensorManager.getRotationMatrix(r, null, g, m)) hesapla()
      }
      Sensor.TYPE_MAGNETIC_FIELD -> {
        hassasiyet = e.accuracy
        for (i in 0..2) m[i] = if (mVar) m[i] + 0.2f * (e.values[i] - m[i]) else e.values[i]
        mVar = true
      }
    }
  }

  @Suppress("DEPRECATION")
  private fun ekranDonusu(): Int = try {
    if (Build.VERSION.SDK_INT >= 30) ctx.display?.rotation ?: Surface.ROTATION_0
    else (ctx.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay.rotation
  } catch (e: Exception) {
    Surface.ROTATION_0
  }

  private fun hesapla() {
    // Ekran yan çevrilmişse eksenleri ona göre değiştir
    val (x, y) = when (ekranDonusu()) {
      Surface.ROTATION_90 -> SensorManager.AXIS_Y to SensorManager.AXIS_MINUS_X
      Surface.ROTATION_180 -> SensorManager.AXIS_MINUS_X to SensorManager.AXIS_MINUS_Y
      Surface.ROTATION_270 -> SensorManager.AXIS_MINUS_Y to SensorManager.AXIS_X
      else -> SensorManager.AXIS_X to SensorManager.AXIS_Y
    }
    SensorManager.remapCoordinateSystem(r, x, y, r2)
    SensorManager.getOrientation(r2, o)
    val ham = Math.toRadians(((Math.toDegrees(o[0].toDouble()) + sapma) + 360) % 360)

    if (sx != sx) {
      sx = cos(ham)
      sy = sin(ham)
    } else {
      val k = 0.18
      sx += k * (cos(ham) - sx)
      sy += k * (sin(ham) - sy)
    }
    val derece = (Math.toDegrees(atan2(sy, sx)) + 360) % 360

    // Saniyede en çok ~30 kez ve yarım dereceden büyük değişimde gönder
    val simdi = System.currentTimeMillis()
    if (simdi - sonGonderim < 33) return
    if (sonDeger == sonDeger) {
      val fark = abs(((derece - sonDeger + 540) % 360) - 180)
      if (fark < 0.5) return
    }
    sonGonderim = simdi
    sonDeger = derece
    gonder(derece, hassasiyet)
  }
}
