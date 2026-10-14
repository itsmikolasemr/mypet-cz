// „Tlapka Den“ – WidgetKit extension (iOS 17+: interactive tick buttons via App Intents; iOS 16: read-only).
// Families: systemSmall, systemMedium, accessoryRectangular, accessoryCircular (lock screen).
import WidgetKit
import SwiftUI
import AppIntents

private let blue = Color(red: 0x7F / 255, green: 0xB3 / 255, blue: 0xE8 / 255)
private let ink = Color(red: 0x2E / 255, green: 0x31 / 255, blue: 0x38 / 255)

struct DenEntry: TimelineEntry { let date: Date; let today: TlapkaShared.Today? }

struct DenProvider: TimelineProvider {
    func placeholder(in context: Context) -> DenEntry { DenEntry(date: .now, today: .sample) }
    func getSnapshot(in context: Context, completion: @escaping (DenEntry) -> Void) { completion(DenEntry(date: .now, today: context.isPreview ? .sample : TlapkaShared.today())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<DenEntry>) -> Void) {
        // refresh after midnight so yesterday's list never shows as today
        let midnight = Calendar.current.startOfDay(for: .now.addingTimeInterval(86_400)).addingTimeInterval(60)
        completion(Timeline(entries: [DenEntry(date: .now, today: TlapkaShared.today())], policy: .after(min(midnight, .now.addingTimeInterval(1800)))))
    }
}

@available(iOS 17.0, *)
struct TickTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Odškrtnout úkol"
    static var isDiscoverable = false
    @Parameter(title: "Úkol") var taskId: String
    init() {}
    init(taskId: String) { self.taskId = taskId }
    func perform() async throws -> some IntentResult { TlapkaShared.tick(taskId); return .result() }
}

struct Ring: View {
    let done: Int, total: Int
    var body: some View {
        ZStack {
            Circle().stroke(Color.primary.opacity(0.12), lineWidth: 5)
            Circle().trim(from: 0, to: total == 0 ? 0 : CGFloat(done) / CGFloat(total)).stroke(blue, style: StrokeStyle(lineWidth: 5, lineCap: .round)).rotationEffect(.degrees(-90))
            Text("\(done)/\(total)").font(.system(size: 12, weight: .heavy, design: .rounded))
        }
    }
}

struct TaskLine: View {
    let t: TlapkaShared.Task
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: t.symbol).font(.system(size: 13, weight: .semibold)).foregroundStyle(blue).frame(width: 22)
            VStack(alignment: .leading, spacing: 0) {
                Text(t.displayTitle).font(.system(size: 13, weight: .bold)).lineLimit(1)
                Text([t.time, t.kind == "walk" ? "" : t.pet].filter { !$0.isEmpty }.joined(separator: " · ")).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 4)
            if #available(iOS 17.0, *) {
                Button(intent: TickTaskIntent(taskId: t.id)) {
                    Image(systemName: "checkmark").font(.system(size: 12, weight: .heavy)).foregroundStyle(blue)
                        .frame(width: 30, height: 30).overlay(Circle().stroke(blue, lineWidth: 2))
                }.buttonStyle(.plain).accessibilityLabel("Odškrtnout: \(t.displayTitle)")
            }
        }
    }
}

struct DenView: View {
    @Environment(\.widgetFamily) var family
    let entry: DenEntry
    var open: [TlapkaShared.Task] { entry.today?.tasks.filter { !$0.done } ?? [] }
    var body: some View {
        let t = entry.today
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(t?.done ?? 0), in: 0...Double(max(t?.total ?? 1, 1))) { Image(systemName: "pawprint.fill") } currentValueLabel: { Text("\(t?.done ?? 0)") }
                .gaugeStyle(.accessoryCircularCapacity)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text("Tlapka Den · \(t?.done ?? 0)/\(t?.total ?? 0)").font(.headline).widgetAccentable()
                if let n = open.first { Text(n.displayTitle).lineLimit(1); Text(n.time).font(.caption).foregroundStyle(.secondary) } else { Text(t == nil ? "Otevři Tlapku" : "Všechno hotovo") }
            }
        case .systemSmall:
            VStack(alignment: .leading, spacing: 6) {
                HStack { Text("Dnes").font(.system(size: 15, weight: .heavy)); Spacer(); Ring(done: t?.done ?? 0, total: t?.total ?? 0).frame(width: 40, height: 40) }
                if let n = open.first { TaskLine(t: n) } else { Text(t == nil ? "Otevři Tlapku a nastav krmení a venčení." : "Všechno hotovo. Dobrá práce!").font(.system(size: 12, weight: .semibold)).foregroundStyle(.secondary) }
                Spacer(minLength: 0)
                if open.count > 1 { Text("+ \(open.count - 1) další").font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary) }
            }
        default:
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Tlapka Den").font(.system(size: 14, weight: .heavy))
                    Ring(done: t?.done ?? 0, total: t?.total ?? 0).frame(width: 54, height: 54)
                    Text(open.isEmpty ? "Hotovo" : "Zbývá \(open.count)").font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary)
                }
                VStack(alignment: .leading, spacing: 6) {
                    if open.isEmpty { Spacer(); Text(t == nil ? "Otevři Tlapku" : "Všechno hotovo. Dobrá práce!").font(.system(size: 13, weight: .semibold)); Spacer() }
                    ForEach(open.prefix(3)) { TaskLine(t: $0) }
                }
            }
        }
    }
}

struct TlapkaDen: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TlapkaDen", provider: DenProvider()) { e in
            if #available(iOS 17.0, *) {
                DenView(entry: e).containerBackground(for: .widget) { Color("WidgetBackground") }
            } else {
                DenView(entry: e).padding().background(Color("WidgetBackground"))
            }
        }
        .configurationDisplayName("Tlapka Den")
        .description("Dnešní léky, krmení a venčení – odškrtni jedním klepnutím.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}

@main
struct TlapkaWidgetBundle: WidgetBundle { var body: some Widget { TlapkaDen() } }

extension TlapkaShared.Today {
    static let sample = TlapkaShared.Today(v: 2, day: "", done: 2, total: 8, tasks: [
        .init(id: "a", pet: "Max", kind: "med", title: "Cosequin", sub: "1 tableta", time: "8:00", done: false),
        .init(id: "b", pet: "Max", kind: "walk", title: "Venčení", sub: "2/3", time: "12:30", done: false),
        .init(id: "c", pet: "Mia", kind: "feed", title: "Kapsička", sub: "85 g", time: "19:00", done: false),
    ])
}
