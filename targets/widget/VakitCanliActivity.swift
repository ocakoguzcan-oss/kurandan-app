// Canlı Etkinlik: kilit ekranı ve Dinamik Ada'da sıradaki vakte geri sayım.
// VakitAktiviteAttributes, uygulamadaki (modules/ezan-native) tanımla birebir aynı olmalı.
import WidgetKit
import SwiftUI
import ActivityKit

struct VakitAktiviteAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var vakit: String
    var saat: String
    /// Unix saniye
    var baslangic: Double
    var bitis: Double
  }
  var sehir: String
}

private extension VakitAktiviteAttributes.ContentState {
  var aralik: ClosedRange<Date> {
    let b = Date(timeIntervalSince1970: baslangic)
    let e = Date(timeIntervalSince1970: max(bitis, baslangic + 1))
    return b...e
  }
}

struct VakitCanliActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: VakitAktiviteAttributes.self) { context in
      VStack(alignment: .leading, spacing: 8) {
        HStack(alignment: .firstTextBaseline) {
          VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.sehir)
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)
            Text("\(context.state.vakit) \(context.state.saat)")
              .font(.headline)
              .lineLimit(1)
          }
          Spacer(minLength: 8)
          Text(timerInterval: context.state.aralik, countsDown: true)
            .font(.system(size: 30, weight: .semibold).monospacedDigit())
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 150, alignment: .trailing)
            .foregroundStyle(Color("yesil"))
        }
        ProgressView(timerInterval: context.state.aralik, countsDown: false) {
          EmptyView()
        } currentValueLabel: {
          EmptyView()
        }
        .tint(Color("yesil"))
      }
      .padding(16)
      .activitySystemActionForegroundColor(Color("yesil"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.sehir).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            Text("\(context.state.vakit) \(context.state.saat)").font(.headline).lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(timerInterval: context.state.aralik, countsDown: true)
            .font(.title2.monospacedDigit())
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 110, alignment: .trailing)
            .foregroundStyle(Color("yesil"))
        }
      } compactLeading: {
        Text(context.state.vakit)
          .font(.caption)
          .lineLimit(1)
          .foregroundStyle(Color("yesil"))
      } compactTrailing: {
        Text(timerInterval: context.state.aralik, countsDown: true)
          .monospacedDigit()
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 56)
      } minimal: {
        Image(systemName: "moon.stars.fill")
          .foregroundStyle(Color("yesil"))
      }
    }
  }
}
