// Shared between the app target and the TlapkaWidget extension (add this file to BOTH targets).
// Storage: App Group "group.cz.tlapka.app" UserDefaults – key "json" = lib/widget.ts widgetPayload(), key "ticks" = queued ticks.
import Foundation

public enum TlapkaShared {
    public static let group = "group.cz.tlapka.app"
    public static let keyJSON = "json", keyTicks = "ticks"
    public static var defaults: UserDefaults { UserDefaults(suiteName: group) ?? .standard }

    public struct Task: Codable, Hashable, Identifiable {
        public let id: String; public let pet: String; public let kind: String; public let title: String
        public let sub: String; public let time: String; public var done: Bool
        public var displayTitle: String { kind == "walk" ? "Venčení – \(pet)" : title }
        public var symbol: String { kind == "med" ? "pills.fill" : kind == "feed" ? "fork.knife" : "pawprint.fill" }
    }
    public struct Today: Codable { public let v: Int; public let day: String; public var done: Int; public let total: Int; public var tasks: [Task] }
    public struct Payload: Codable { public var today: Today?; public let week: Int?; public let overdue: Int?; public let line: String? }

    public static func load() -> Payload? {
        guard let s = defaults.string(forKey: keyJSON), let d = s.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Payload.self, from: d)
    }
    static var todayKey: String { let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"; return f.string(from: Date()) }
    /** today's block only when it belongs to today (stale data after midnight → empty state until the app refreshes). */
    public static func today() -> Today? { guard let t = load()?.today, t.day == todayKey else { return nil }; return t }

    /** Widget tick: mark done in the cached JSON (instant UI) + queue for the app (applyTick is idempotent). */
    public static func tick(_ id: String) {
        let d = defaults
        if let s = d.string(forKey: keyJSON), var obj = (try? JSONSerialization.jsonObject(with: Data(s.utf8))) as? [String: Any], var today = obj["today"] as? [String: Any], var tasks = today["tasks"] as? [[String: Any]] {
            for i in tasks.indices where (tasks[i]["id"] as? String) == id && (tasks[i]["done"] as? Bool) != true {
                tasks[i]["done"] = true; today["done"] = ((today["done"] as? Int) ?? 0) + 1
            }
            today["tasks"] = tasks; obj["today"] = today
            if let out = try? JSONSerialization.data(withJSONObject: obj), let str = String(data: out, encoding: .utf8) { d.set(str, forKey: keyJSON) }
        }
        var q = (d.array(forKey: keyTicks) as? [[String: String]]) ?? []
        q.append(["id": id, "at": ISO8601DateFormatter().string(from: Date())])
        d.set(q, forKey: keyTicks)
    }
    public static func takeTicks() -> [[String: String]] {
        let q = (defaults.array(forKey: keyTicks) as? [[String: String]]) ?? []
        defaults.set([], forKey: keyTicks); return q
    }
}
