// "Sıradaki vakit" widget'ı: kilit ekranı (satır, yuvarlak, dikdörtgen) ve ana ekran (küçük).
// Vakitleri uygulama hesaplayıp App Group'a JSON olarak yazar; widget yalnızca okur ve
// her vakit girişinde kendiliğinden bir sonrakine geçer (timeline). Geri sayım sistemce işletilir.
import WidgetKit
import SwiftUI

private let appGroup = "group.ai.kurandan.app"
private let dataKey = "vakitler"

struct Vakit: Codable {
  /// Vakit adı (uygulamanın dilinde)
  let n: String
  /// Unix saniye
  let t: Double
  /// Şehrin saatiyle "05:42"
  let h: String
  /// Vakit kimliği (imsak, gunes, ogle, ikindi, aksam, yatsi); eski verilerde yok
  let k: String?
}

struct VakitVerisi: Codable {
  let place: String
  let items: [Vakit]
  /// Veri yokken gösterilecek yazı ("Uygulamayı açın")
  let empty: String?
  /// Uygulamanın dili (tarih biçimi için) ve "{vakit} vaktine kalan" kalıbı
  let lang: String?
  let kalan: String?
  /// Şehrin saat dilimi (tarih satırı için)
  let tz: String?
}

func vakitVerisi() -> VakitVerisi? {
  guard let s = UserDefaults(suiteName: appGroup)?.string(forKey: dataKey),
        let d = s.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(VakitVerisi.self, from: d)
}

struct VakitEntry: TimelineEntry {
  let date: Date
  let next: Vakit?
  let after: Vakit?
  let place: String
  let empty: String
}

struct VakitProvider: TimelineProvider {
  func placeholder(in context: Context) -> VakitEntry {
    VakitEntry(
      date: Date(),
      next: Vakit(n: "Öğle", t: Date().addingTimeInterval(4500).timeIntervalSince1970, h: "12:45", k: "ogle"),
      after: Vakit(n: "İkindi", t: Date().addingTimeInterval(16000).timeIntervalSince1970, h: "15:52", k: "ikindi"),
      place: "İstanbul",
      empty: ""
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (VakitEntry) -> Void) {
    let list = entries(from: Date())
    completion(list.first?.next != nil ? list[0] : placeholder(in: context))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<VakitEntry>) -> Void) {
    let list = entries(from: Date())
    completion(Timeline(entries: list, policy: .atEnd))
  }

  private func entries(from now: Date) -> [VakitEntry] {
    guard let v = vakitVerisi() else {
      return [VakitEntry(date: now, next: nil, after: nil, place: "", empty: "Kurandan.ai")]
    }
    let items = v.items.sorted { $0.t < $1.t }
    var out: [VakitEntry] = []
    var start = now
    for (i, it) in items.enumerated() {
      let d = Date(timeIntervalSince1970: it.t)
      if d <= now { continue }
      out.append(VakitEntry(date: start, next: it, after: i + 1 < items.count ? items[i + 1] : nil, place: v.place, empty: v.empty ?? ""))
      start = d
      if out.count >= 40 { break }
    }
    if out.isEmpty {
      out.append(VakitEntry(date: now, next: nil, after: nil, place: v.place, empty: v.empty ?? "Kurandan.ai"))
    }
    return out
  }
}

struct VakitWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: VakitEntry

  var body: some View {
    content
      .containerBackground(for: .widget) {
        if family == .systemSmall {
          Color("$widgetBackground")
        } else {
          Color.clear
        }
      }
      .widgetURL(URL(string: "kurandan://"))
  }

  @ViewBuilder
  private var content: some View {
    if let n = entry.next {
      let date = Date(timeIntervalSince1970: n.t)
      switch family {
      case .accessoryInline:
        Text("\(n.n) \(n.h)")
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          VStack(spacing: 0) {
            Text(n.n)
              .font(.system(size: 11, weight: .semibold))
              .lineLimit(1)
              .minimumScaleFactor(0.6)
            Text(n.h)
              .font(.system(size: 15, weight: .bold, design: .rounded))
              .minimumScaleFactor(0.6)
          }
          .padding(4)
        }
      case .accessoryRectangular:
        // Şehir üstte, "Yatsı 18:32" ortada, geri sayım altta (ortalı)
        VStack(spacing: 0) {
          if !entry.place.isEmpty {
            Text(entry.place)
              .font(.caption)
              .lineLimit(1)
              .opacity(0.8)
          }
          Text("\(n.n) \(n.h)")
            .font(.system(size: 17, weight: .semibold, design: .rounded))
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .allowsTightening(true)
          Text(date, style: .timer)
            .font(.system(size: 15, design: .rounded))
            .monospacedDigit()
            .multilineTextAlignment(.center)
            .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
      default:
        VStack(alignment: .leading, spacing: 2) {
          Text(entry.place)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
          Spacer(minLength: 0)
          Text(n.n)
            .font(.headline)
            .foregroundStyle(Color("yesil"))
          Text(n.h)
            .font(.system(size: 34, weight: .bold, design: .rounded))
            .minimumScaleFactor(0.7)
          Text(date, style: .timer)
            .font(.subheadline.weight(.medium))
            .monospacedDigit()
            .foregroundStyle(.secondary)
          if let a = entry.after {
            Text("\(a.n) \(a.h)")
              .font(.caption2)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    } else {
      Text(entry.empty.isEmpty ? "Kurandan.ai" : entry.empty)
        .font(.caption)
        .multilineTextAlignment(.center)
    }
  }
}

struct VakitWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "VakitWidget", provider: VakitProvider()) { entry in
      VakitWidgetView(entry: entry)
    }
    .configurationDisplayName(WidgetMetin.ad)
    .description(WidgetMetin.aciklama)
    .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular, .systemSmall])
  }
}

/// Widget galerisinde görünen ad ve açıklama (telefonun diline göre)
enum WidgetMetin {
  private static var dil: String {
    Locale.preferredLanguages.first.map { String($0.prefix(2)) } ?? "en"
  }

  static var ad: String {
    switch dil {
    case "tr": return "Namaz Vakti"
    case "de": return "Gebetszeit"
    case "ar": return "وقت الصلاة"
    case "fr": return "Heure de prière"
    case "ru": return "Время намаза"
    default: return "Prayer Time"
    }
  }

  static var manzaraAd: String {
    switch dil {
    case "tr": return "Vakit Manzarası"
    case "de": return "Gebetszeit-Panorama"
    case "ar": return "مشهد وقت الصلاة"
    case "fr": return "Panorama des prières"
    case "ru": return "Панорама намаза"
    default: return "Prayer Panorama"
    }
  }

  static var manzaraAciklama: String {
    switch dil {
    case "tr": return "Sıradaki vakte geri sayım ve günün vakitleri; gökyüzü vakte göre değişir"
    case "de": return "Countdown zum nächsten Gebet und alle Zeiten; der Himmel ändert sich mit der Tageszeit"
    case "ar": return "عدّ تنازلي للصلاة القادمة ومواقيت اليوم؛ تتغير السماء حسب الوقت"
    case "fr": return "Compte à rebours et horaires du jour ; le ciel change selon l'heure"
    case "ru": return "Отсчёт до следующего намаза и время на день; небо меняется по времени суток"
    default: return "Countdown to the next prayer and today's times; the sky changes with the time of day"
    }
  }

  static var aciklama: String {
    switch dil {
    case "tr": return "Sıradaki vakit ve kalan süre"
    case "de": return "Nächstes Gebet und verbleibende Zeit"
    case "ar": return "الصلاة القادمة والوقت المتبقي"
    case "fr": return "Prochaine prière et temps restant"
    case "ru": return "Следующий намаз и оставшееся время"
    default: return "Next prayer and time left"
    }
  }
}
