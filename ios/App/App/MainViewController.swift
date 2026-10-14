import UIKit
import Capacitor

/// Storyboard root (Main.storyboard → customClass MainViewController). Registers app-local Capacitor plugins.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(TlapkaWidgetPlugin())
    }
}
