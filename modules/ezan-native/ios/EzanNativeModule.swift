// Kurandan yerel modülü:
// 1. Kilit ekranı / ana ekran widget'ı için vakit listesini App Group'a yazar.
// 2. iOS 26+ AlarmKit ile sabah ezanını gerçek alarm olarak kurar (sessiz modu ve Odak'ı deler,
//    kilit ekranında tam ekran çıkar, kaydırarak ya da "Kapat" ile susturulur).
import ExpoModulesCore
import Foundation
import UIKit
import SwiftUI
import WidgetKit
import ActivityKit
import AlarmKit
import MapKit

struct EzanAlarmItem: Record {
  /// Alarm zamanı (Unix ms)
  @Field var at: Double = 0
  @Field var title: String = ""
}

public class EzanNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EzanNative")

    Function("setWidgetData") { (group: String, key: String, json: String) in
      UserDefaults(suiteName: group)?.set(json, forKey: key)
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    // Tanılama: App Group kapsayıcısı erişilebilir mi, kayıtlı veri ne kadar
    Function("diagnose") { (group: String, key: String) -> [String: Any] in
      let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
      let data = UserDefaults(suiteName: group)?.string(forKey: key)
      return [
        "group": url != nil,
        "dataLength": data?.count ?? 0,
        "ios": UIDevice.current.systemVersion,
      ]
    }

    Function("alarmSupported") { () -> Bool in
      if #available(iOS 26.0, *) {
        return true
      }
      return false
    }

    AsyncFunction("alarmPermission") { (ask: Bool) async -> String in
      if #available(iOS 26.0, *) {
        return await EzanAlarms.permission(ask: ask)
      }
      return "unsupported"
    }

    AsyncFunction("scheduleAlarms") { (items: [EzanAlarmItem], sound: String, stopText: String) async throws -> Int in
      if #available(iOS 26.0, *) {
        return try await EzanAlarms.schedule(items, sound: sound, stopText: stopText)
      }
      return 0
    }

    // GEÇİCİ TEST: birkaç saniye sonra tek alarm (kurulu sabah alarmlarına dokunmaz)
    AsyncFunction("testAlarm") { (seconds: Double, title: String, sound: String, stopText: String) async throws -> Bool in
      if #available(iOS 26.0, *) {
        return try await EzanAlarms.test(seconds: seconds, title: title, sound: sound, stopText: stopText)
      }
      return false
    }

    AsyncFunction("cancelAlarms") { () async -> Void in
      if #available(iOS 26.0, *) {
        EzanAlarms.cancelAll()
      }
    }

    // Yakın camiler: Apple Haritalar'da arama (her sorgu ayrı yapılır, sonuçlar birleştirilir)
    AsyncFunction("searchPlaces") { (lat: Double, lng: Double, radius: Double, queries: [String]) async -> [[String: Any]] in
      var out: [[String: Any]] = []
      var seen = Set<String>()
      let center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
      for q in queries {
        let req = MKLocalSearch.Request()
        req.naturalLanguageQuery = q
        req.region = MKCoordinateRegion(center: center, latitudinalMeters: radius * 2, longitudinalMeters: radius * 2)
        req.resultTypes = .pointOfInterest
        guard let res = try? await MKLocalSearch(request: req).start() else { continue }
        for item in res.mapItems {
          let c = item.placemark.coordinate
          let key = String(format: "%.4f,%.4f", c.latitude, c.longitude)
          if seen.contains(key) { continue }
          seen.insert(key)
          out.append(["name": item.name ?? "", "lat": c.latitude, "lng": c.longitude])
        }
      }
      return out
    }

    // Canlı Etkinlik: kilit ekranı ve Dinamik Ada'da sıradaki vakte geri sayım
    Function("liveSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("liveStart") { (city: String, vakit: String, saat: String, startMs: Double, endMs: Double) async -> Bool in
      if #available(iOS 16.2, *) {
        return await VakitCanli.start(city: city, vakit: vakit, saat: saat, startMs: startMs, endMs: endMs)
      }
      return false
    }

    AsyncFunction("liveStop") { () async -> Void in
      if #available(iOS 16.2, *) {
        await VakitCanli.stopAll()
      }
    }
  }
}

/// Widget eklentisindeki tanımla birebir aynı olmalı (Canlı Etkinlik tür adıyla eşleşir).
@available(iOS 16.1, *)
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

@available(iOS 16.2, *)
enum VakitCanli {
  static func stopAll() async {
    for a in Activity<VakitAktiviteAttributes>.activities {
      await a.end(nil, dismissalPolicy: .immediate)
    }
  }

  static func start(city: String, vakit: String, saat: String, startMs: Double, endMs: Double) async -> Bool {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
    let state = VakitAktiviteAttributes.ContentState(vakit: vakit, saat: saat, baslangic: startMs / 1000, bitis: endMs / 1000)
    let end = Date(timeIntervalSince1970: endMs / 1000)
    // Aynı şehir ve vakit zaten gösteriliyorsa dokunma; başka bir şeyse güncelle
    let mevcut = Activity<VakitAktiviteAttributes>.activities
    if let a = mevcut.first, a.attributes.sehir == city, mevcut.count == 1 {
      if a.content.state != state {
        await a.update(ActivityContent(state: state, staleDate: end.addingTimeInterval(60)))
      }
      return true
    }
    await stopAll()
    do {
      _ = try Activity.request(
        attributes: VakitAktiviteAttributes(sehir: city),
        content: ActivityContent(state: state, staleDate: end.addingTimeInterval(60)),
        pushType: nil
      )
      return true
    } catch {
      return false
    }
  }
}

/// Widget eklentisindeki tanımla aynı adı taşımalı (Canlı Etkinlik eşleşmesi tür adıyla yapılır).
@available(iOS 26.0, *)
struct EzanAlarmMeta: AlarmMetadata {}

@available(iOS 26.0, *)
enum EzanAlarms {
  static func permission(ask: Bool) async -> String {
    let manager = AlarmManager.shared
    switch manager.authorizationState {
    case .authorized:
      return "granted"
    case .denied:
      return "denied"
    case .notDetermined:
      if !ask { return "undetermined" }
      do {
        let state = try await manager.requestAuthorization()
        return state == .authorized ? "granted" : "denied"
      } catch {
        return "denied"
      }
    @unknown default:
      return "denied"
    }
  }

  static func cancelAll() {
    let manager = AlarmManager.shared
    let list = (try? manager.alarms) ?? []
    for alarm in list {
      try? manager.cancel(id: alarm.id)
    }
  }

  static func configuration(at date: Date, title: String, sound: String, stopText: String) -> AlarmManager.AlarmConfiguration<EzanAlarmMeta> {
    let stop = AlarmButton(
      text: LocalizedStringResource(stringLiteral: stopText),
      textColor: .white,
      systemImageName: "stop.circle"
    )
    let alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: title), stopButton: stop)
    let attributes = AlarmAttributes<EzanAlarmMeta>(
      presentation: AlarmPresentation(alert: alert),
      metadata: EzanAlarmMeta(),
      tintColor: Color(red: 0.094, green: 0.345, blue: 0.235)
    )
    return AlarmManager.AlarmConfiguration<EzanAlarmMeta>.alarm(
      schedule: .fixed(date),
      attributes: attributes,
      stopIntent: nil,
      secondaryIntent: nil,
      sound: sound.isEmpty ? .default : .named(sound)
    )
  }

  static func test(seconds: Double, title: String, sound: String, stopText: String) async throws -> Bool {
    guard await Self.permission(ask: true) == "granted" else { return false }
    let date = Date().addingTimeInterval(max(seconds, 3))
    _ = try await AlarmManager.shared.schedule(id: UUID(), configuration: Self.configuration(at: date, title: title, sound: sound, stopText: stopText))
    return true
  }

  static func schedule(_ items: [EzanAlarmItem], sound: String, stopText: String) async throws -> Int {
    guard AlarmManager.shared.authorizationState == .authorized else { return 0 }
    cancelAll()
    var count = 0
    let now = Date()
    for item in items {
      let date = Date(timeIntervalSince1970: item.at / 1000)
      if date <= now.addingTimeInterval(30) { continue }
      let cfg = Self.configuration(at: date, title: item.title, sound: sound, stopText: stopText)
      _ = try await AlarmManager.shared.schedule(id: UUID(), configuration: cfg)
      count += 1
    }
    return count
  }
}
