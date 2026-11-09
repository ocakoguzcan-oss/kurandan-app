import WidgetKit
import SwiftUI

@main
struct KurandanWidgets: WidgetBundle {
  var body: some Widget {
    VakitWidget()
    if #available(iOS 26.0, *) {
      EzanAlarmActivity()
    }
  }
}
