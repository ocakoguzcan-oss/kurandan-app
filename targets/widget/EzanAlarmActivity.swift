// Sabah ezanı alarmının (AlarmKit) Canlı Etkinlik / Dynamic Island görünümü.
// Alarm çalarken tam ekran arayüzü sistem çizer; bu görünüm yalnızca kilit ekranındaki
// etkinlik kartı ve Dynamic Island içindir. EzanAlarmMeta, uygulamadaki tanımla aynı adı taşır.
import WidgetKit
import SwiftUI
import ActivityKit
import AlarmKit

@available(iOS 26.0, *)
struct EzanAlarmMeta: AlarmMetadata {}

@available(iOS 26.0, *)
struct EzanAlarmActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: AlarmAttributes<EzanAlarmMeta>.self) { context in
      HStack(spacing: 12) {
        Image(systemName: "alarm.fill")
          .font(.title2)
          .foregroundStyle(Color("yesil"))
        Text(context.attributes.presentation.alert.title)
          .font(.headline)
        Spacer()
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.presentation.alert.title)
            .font(.headline)
        }
      } compactLeading: {
        Image(systemName: "alarm.fill")
      } compactTrailing: {
        EmptyView()
      } minimal: {
        Image(systemName: "alarm.fill")
      }
    }
  }
}
