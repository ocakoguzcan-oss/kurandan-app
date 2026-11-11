// Ana ekran "manzara" widget'ı (orta ve büyük): sıradaki vakte geri sayım, günün altı vakti ve
// vakte göre değişen gökyüzü önünde bir mübarek mekân çizimi (Kâbe, Mescid-i Nebevi, Mescid-i Aksa, Kuba). Gece (akşamdan imsak sonuna kadar) camide ışıklar yanar.
// Mekân, widget düzenlenirken seçilir (AppIntent). Çizimler scripts/widget-cami.py ile üretilir.
import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Ayar (widget'a basılı tut → Widget'ı Düzenle → Mekân)

enum CamiSecimi: String, AppEnum {
  case kabe, nebevi, aksa, kuba

  static let typeDisplayRepresentation: TypeDisplayRepresentation = "Mekân"
  static let caseDisplayRepresentations: [CamiSecimi: DisplayRepresentation] = [
    .kabe: "Kâbe",
    .nebevi: "Mescid-i Nebevi",
    .aksa: "Mescid-i Aksa",
    .kuba: "Kuba Mescidi",
  ]
}

struct ManzaraAyar: WidgetConfigurationIntent {
  static let title: LocalizedStringResource = "Mekân"
  static let description = IntentDescription("Widget'ta görünecek mübarek mekân")

  @Parameter(title: "Mekân", default: .kabe)
  var cami: CamiSecimi
}

// MARK: - Zaman çizelgesi

struct ManzaraEntry: TimelineEntry {
  let date: Date
  let next: Vakit?
  /// Şu an içinde bulunulan vaktin kimliği (gökyüzü rengi için)
  let donem: String
  /// Sıradaki vaktin bulunduğu günün altı vakti
  let gun: [Vakit]
  let place: String
  let kalan: String
  let tarih: String
  let cami: CamiSecimi
  let empty: String
}

struct ManzaraProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> ManzaraEntry {
    ornek(.kabe)
  }

  func snapshot(for configuration: ManzaraAyar, in context: Context) async -> ManzaraEntry {
    let list = entries(from: Date(), cami: configuration.cami)
    return list.first?.next != nil ? list[0] : ornek(configuration.cami)
  }

  func timeline(for configuration: ManzaraAyar, in context: Context) async -> Timeline<ManzaraEntry> {
    Timeline(entries: entries(from: Date(), cami: configuration.cami), policy: .atEnd)
  }

  private func ornek(_ cami: CamiSecimi) -> ManzaraEntry {
    let now = Date()
    let adlar = ["İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"]
    let saat = ["05:58", "07:31", "12:22", "14:51", "17:07", "18:35"]
    let kim = ["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"]
    let gun = (0..<6).map { Vakit(n: adlar[$0], t: now.addingTimeInterval(Double($0 - 3) * 7200).timeIntervalSince1970, h: saat[$0], k: kim[$0]) }
    return ManzaraEntry(date: now, next: gun[3], donem: "ogle", gun: gun, place: "İstanbul", kalan: "İkindi vaktine kalan", tarih: "", cami: cami, empty: "")
  }

  private func entries(from now: Date, cami: CamiSecimi) -> [ManzaraEntry] {
    guard let v = vakitVerisi() else {
      return [ManzaraEntry(date: now, next: nil, donem: "ogle", gun: [], place: "", kalan: "", tarih: "", cami: cami, empty: "Kurandan.ai")]
    }
    let items = v.items.sorted { $0.t < $1.t }
    let kalip = v.kalan ?? "{vakit}"
    var out: [ManzaraEntry] = []
    var start = now
    for (i, it) in items.enumerated() {
      let d = Date(timeIntervalSince1970: it.t)
      if d <= now { continue }
      let onceki = i > 0 ? (items[i - 1].k ?? "ogle") : "yatsi"
      // Sıradaki vaktin günü: veriler günde altı vakit sırasıyla yazılır
      let bas = (i / 6) * 6
      let gun = Array(items[bas..<min(bas + 6, items.count)])
      out.append(ManzaraEntry(
        date: start,
        next: it,
        donem: onceki,
        gun: gun,
        place: v.place,
        kalan: kalip.replacingOccurrences(of: "{vakit}", with: it.n),
        tarih: tarihYaz(start, lang: v.lang, tz: v.tz),
        cami: cami,
        empty: v.empty ?? ""
      ))
      start = d
      if out.count >= 30 { break }
    }
    if out.isEmpty {
      out.append(ManzaraEntry(date: now, next: nil, donem: "ogle", gun: [], place: v.place, kalan: "", tarih: "", cami: cami, empty: v.empty ?? "Kurandan.ai"))
    }
    return out
  }

  private func tarihYaz(_ d: Date, lang: String?, tz: String?) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: lang ?? "tr")
    if let tz, let zone = TimeZone(identifier: tz) { f.timeZone = zone }
    f.setLocalizedDateFormatFromTemplate("dMMMMEEEE")
    return f.string(from: d)
  }
}

// MARK: - Gökyüzü

private struct Gok {
  let renkler: [Color]
  let gece: Bool
  /// Yazı rengi açık mı (koyu gökyüzü)
  let acikYazi: Bool
  let gunes: Bool

  static func of(_ donem: String) -> Gok {
    func c(_ hex: UInt32) -> Color {
      Color(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
    switch donem {
    case "imsak": return Gok(renkler: [c(0x26335F), c(0xB4728C), c(0xF0B27F)], gece: true, acikYazi: true, gunes: false)
    case "gunes": return Gok(renkler: [c(0x6FA9DD), c(0xA9D0EE), c(0xE2F0F8)], gece: false, acikYazi: false, gunes: true)
    case "ogle": return Gok(renkler: [c(0x3E8BD6), c(0x7DB8EA), c(0xC6E4F8)], gece: false, acikYazi: false, gunes: true)
    case "ikindi": return Gok(renkler: [c(0x5E95C8), c(0xA8C4D8), c(0xF1D79C)], gece: false, acikYazi: false, gunes: true)
    case "aksam": return Gok(renkler: [c(0x2E336E), c(0xB35574), c(0xF2954F)], gece: true, acikYazi: true, gunes: false)
    default: return Gok(renkler: [c(0x070D26), c(0x111C42), c(0x22305E)], gece: true, acikYazi: true, gunes: false)
    }
  }
}

private struct Yildizlar: View {
  var body: some View {
    GeometryReader { g in
      let noktalar: [(CGFloat, CGFloat)] = [(0.52, 0.10), (0.63, 0.24), (0.78, 0.08), (0.88, 0.22), (0.70, 0.15), (0.95, 0.10), (0.58, 0.05), (0.45, 0.18)]
      ForEach(0..<noktalar.count, id: \.self) { i in
        Circle()
          .fill(Color.white.opacity(i % 2 == 0 ? 0.9 : 0.55))
          .frame(width: 2, height: 2)
          .position(x: g.size.width * noktalar[i].0, y: g.size.height * noktalar[i].1)
      }
    }
  }
}

private struct Hilal: View {
  var body: some View {
    ZStack {
      Circle().fill(Color(red: 0.96, green: 0.91, blue: 0.72))
      Circle().fill(Color.black).offset(x: 6, y: -4).blendMode(.destinationOut)
    }
    .compositingGroup()
    .frame(width: 22, height: 22)
  }
}

// MARK: - Görünüm

struct ManzaraView: View {
  @Environment(\.widgetFamily) var family
  let entry: ManzaraEntry

  var body: some View {
    let gok = Gok.of(entry.donem)
    let yazi: Color = gok.acikYazi ? .white : Color(red: 0.08, green: 0.14, blue: 0.23)
    let soluk: Color = yazi.opacity(0.75)
    let buyuk = family == .systemLarge

    ZStack(alignment: .topLeading) {
      // Güneş ya da ay ve yıldızlar
      if gok.gunes {
        Circle()
          .fill(entry.donem == "ikindi" ? Color(red: 1, green: 0.82, blue: 0.48) : Color(red: 1, green: 0.9, blue: 0.54))
          .frame(width: buyuk ? 34 : 24, height: buyuk ? 34 : 24)
          .shadow(color: Color(red: 1, green: 0.9, blue: 0.54).opacity(0.8), radius: 10)
          .frame(maxWidth: .infinity, alignment: .topTrailing)
          .padding(.top, 14)
          .padding(.trailing, 22)
      } else {
        if entry.donem != "aksam" { Yildizlar() }
        Hilal()
          .frame(maxWidth: .infinity, alignment: .topTrailing)
          .padding(.top, 14)
          .padding(.trailing, 26)
      }

      // Cami
      Image("cami_\(entry.cami.rawValue)_\(gok.gece ? "gece" : "gunduz")")
        .resizable()
        .scaledToFit()
        .frame(width: buyuk ? 300 : 205)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: buyuk ? .bottom : .bottomTrailing)
        .padding(.bottom, buyuk ? 64 : 38)
        .padding(.trailing, buyuk ? 0 : -22)

      if let n = entry.next {
        // Sol üst: tarih · şehir, "x vaktine kalan", geri sayım
        VStack(alignment: .leading, spacing: 2) {
          Text(entry.tarih.isEmpty ? entry.place : "\(entry.tarih) · \(entry.place)")
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(soluk)
            .lineLimit(1)
          Text(entry.kalan)
            .font(.system(size: buyuk ? 14 : 12, weight: .semibold))
            .foregroundStyle(soluk)
            .lineLimit(1)
            .padding(.top, 4)
          Text(Date(timeIntervalSince1970: n.t), style: .timer)
            .font(.system(size: buyuk ? 46 : 34, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(yazi)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: buyuk ? .infinity : 190, alignment: .leading)
        .padding(.leading, 16)
        .padding(.top, 13)

        // Alt: günün altı vakti, sıradaki vurgulu
        VStack {
          Spacer(minLength: 0)
          HStack(spacing: 0) {
            ForEach(Array(entry.gun.enumerated()), id: \.offset) { _, v in
              let on = v.t == n.t
              VStack(spacing: 1) {
                Text(v.n)
                  .font(.system(size: buyuk ? 11 : 9))
                  .opacity(on ? 1 : 0.8)
                  .lineLimit(1)
                  .minimumScaleFactor(0.7)
                Text(v.h)
                  .font(.system(size: buyuk ? 14 : 11, weight: .bold))
                  .monospacedDigit()
                  .lineLimit(1)
                  .minimumScaleFactor(0.7)
              }
              .foregroundStyle(on ? Color(red: 0.094, green: 0.345, blue: 0.235) : yazi)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
              .background(on ? Color.white.opacity(0.88) : Color.clear, in: RoundedRectangle(cornerRadius: 10))
            }
          }
          .frame(height: buyuk ? 46 : 32)
          .background(Color.white.opacity(0.18), in: RoundedRectangle(cornerRadius: 12))
          .padding(.horizontal, 8)
          .padding(.bottom, 7)
        }
      } else {
        Text(entry.empty.isEmpty ? "Kurandan.ai" : entry.empty)
          .font(.caption)
          .foregroundStyle(yazi)
          .padding(16)
      }
    }
    .containerBackground(for: .widget) {
      LinearGradient(colors: gok.renkler, startPoint: .top, endPoint: .bottom)
    }
    .widgetURL(URL(string: "kurandan://"))
  }
}

struct ManzaraWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "ManzaraWidget", intent: ManzaraAyar.self, provider: ManzaraProvider()) { entry in
      ManzaraView(entry: entry)
    }
    .configurationDisplayName(WidgetMetin.manzaraAd)
    .description(WidgetMetin.manzaraAciklama)
    .supportedFamilies([.systemMedium, .systemLarge])
    .contentMarginsDisabled()
  }
}
