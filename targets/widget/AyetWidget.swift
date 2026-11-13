// "Günün Ayeti" widget'ı: kilit ekranı (dikdörtgen, satır) ve ana ekran (küçük, orta, büyük).
// Ayetler ve mealleri uygulama tarafından App Group'a yazılır (src/lib/ayetWidget.ts). iOS widget'ları
// kilit açılışında yenilenemez; bu yüzden zaman çizelgesi 40 saniyede bir sıradaki ayete geçer
// (telefona her bakışta büyük ihtimalle yeni bir ayet).
import WidgetKit
import SwiftUI

private let ayetGrup = "group.ai.kurandan.app"
private let ayetKey = "ayetler"
/// 40 saniyede bir yeni ayet: iOS kilit açılışında widget yenilemeye izin vermediği için en yakın çözüm
private let aralik: TimeInterval = 40

struct Ayet: Codable {
  /// Arapça metin
  let a: String
  /// Meal (Arapça arayüzde boş)
  let m: String
  /// "Bakara, 152"
  let s: String
}

struct AyetVerisi: Codable {
  let list: [Ayet]
  let baslik: String?
}

func ayetVerisi() -> AyetVerisi? {
  guard let s = UserDefaults(suiteName: ayetGrup)?.string(forKey: ayetKey),
        let d = s.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(AyetVerisi.self, from: d)
}

struct AyetEntry: TimelineEntry {
  let date: Date
  let ayet: Ayet?
  let baslik: String
}

struct AyetProvider: TimelineProvider {
  private let ornek = Ayet(a: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", m: "Bilesiniz ki kalpler ancak Allah’ı anmakla huzur bulur.", s: "Ra’d, 28")

  func placeholder(in context: Context) -> AyetEntry {
    AyetEntry(date: Date(), ayet: ornek, baslik: "Günün Ayeti")
  }

  func getSnapshot(in context: Context, completion: @escaping (AyetEntry) -> Void) {
    completion(entries(from: Date()).first ?? placeholder(in: context))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<AyetEntry>) -> Void) {
    completion(Timeline(entries: entries(from: Date()), policy: .atEnd))
  }

  private func entries(from now: Date) -> [AyetEntry] {
    guard let v = ayetVerisi(), !v.list.isEmpty else {
      return [AyetEntry(date: now, ayet: ornek, baslik: "Günün Ayeti")]
    }
    // 40 saniyelik dilimler: her dilimde başka bir ayet (aynı dilimde hep aynısı)
    let dilim = Int(now.timeIntervalSince1970 / aralik)
    let bas = Date(timeIntervalSince1970: Double(dilim) * aralik)
    // 3 saatlik çizelge (270 × 40 sn); bitince iOS yenisini ister
    return (0..<270).map { i in
      let idx = ((dilim + i) &* 7 ) % v.list.count
      return AyetEntry(date: i == 0 ? now : bas.addingTimeInterval(Double(i) * aralik), ayet: v.list[abs(idx)], baslik: v.baslik ?? "Günün Ayeti")
    }
  }
}

struct AyetWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: AyetEntry

  var body: some View {
    content
      .containerBackground(for: .widget) {
        if family == .systemSmall || family == .systemMedium || family == .systemLarge {
          Color("$widgetBackground")
        } else {
          Color.clear
        }
      }
      .widgetURL(URL(string: "kurandan://"))
  }

  @ViewBuilder
  private var content: some View {
    if let a = entry.ayet {
      let metin = a.m.isEmpty ? a.a : a.m
      switch family {
      case .accessoryInline:
        Text("\(metin)")
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          Text(metin)
            .font(.system(size: 13, weight: .medium))
            .lineLimit(3)
            .minimumScaleFactor(0.7)
          Text(a.s)
            .font(.system(size: 11))
            .opacity(0.75)
            .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default:
        let buyuk = family == .systemLarge
        VStack(alignment: .leading, spacing: buyuk ? 10 : 6) {
          HStack {
            Text(entry.baslik.uppercased())
              .font(.system(size: 10, weight: .bold))
              .tracking(0.8)
              .foregroundStyle(Color("altin"))
            Spacer(minLength: 4)
          }
          if family != .systemSmall && !a.a.isEmpty && !a.m.isEmpty {
            Text(a.a)
              .font(.system(size: buyuk ? 24 : 17))
              .foregroundStyle(Color("yesil"))
              .multilineTextAlignment(.trailing)
              .frame(maxWidth: .infinity, alignment: .trailing)
              .lineLimit(buyuk ? 4 : 2)
              .minimumScaleFactor(0.6)
              .environment(\.layoutDirection, .rightToLeft)
          }
          Text("“\(metin)”")
            .font(.system(size: buyuk ? 18 : family == .systemSmall ? 13 : 14, weight: .medium, design: .serif))
            .foregroundStyle(Color("murekkep"))
            .lineLimit(buyuk ? 8 : family == .systemSmall ? 6 : 4)
            .minimumScaleFactor(0.65)
          Spacer(minLength: 0)
          Text(a.s)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(Color("altin"))
            .lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    } else {
      Text("Kurandan.ai")
        .font(.caption)
    }
  }
}

struct AyetWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "AyetWidget", provider: AyetProvider()) { entry in
      AyetWidgetView(entry: entry)
    }
    .configurationDisplayName(WidgetMetin.ayetAd)
    .description(WidgetMetin.ayetAciklama)
    .supportedFamilies([.accessoryRectangular, .accessoryInline, .systemSmall, .systemMedium, .systemLarge])
  }
}
