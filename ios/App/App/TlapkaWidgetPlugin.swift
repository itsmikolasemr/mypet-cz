import Foundation
import Capacitor
import WidgetKit

/// JS: registerPlugin('TlapkaWidget') – see lib/widget.ts. Registered in MainViewController.capacitorDidLoad().
@objc(TlapkaWidgetPlugin)
public class TlapkaWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TlapkaWidgetPlugin"
    public let jsName = "TlapkaWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeTicks", returnType: CAPPluginReturnPromise),
    ]

    @objc func setData(_ call: CAPPluginCall) {
        TlapkaShared.defaults.set(call.getString("json") ?? "{}", forKey: TlapkaShared.keyJSON)
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadTimelines(ofKind: "TlapkaDen") }
        call.resolve()
    }

    @objc func consumeTicks(_ call: CAPPluginCall) {
        call.resolve(["ticks": TlapkaShared.takeTicks()])
    }
}
