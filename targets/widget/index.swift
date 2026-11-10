import WidgetKit
import SwiftUI

@main
struct KurandanWidgets: WidgetBundle {
  var body: some Widget {
    VakitWidget()
    VakitCanliActivity()
    if #available(iOS 26.0, *) {
      EzanAlarmActivity()
    }
  }
}
