# Tlapka Den – widgety na plochu (v1.2)

## Data (společné pro obě platformy)
`lib/widget.ts` → `pushWidget(data)` po každé změně léků, krmení, venčení nebo připomínek zapíše `widgetPayload()`:
- web: `localStorage['tlapka:widget']`. Kompatibilní s 1.1, týdenní souhrn zůstává nahoře. Nově přibyl klíč `today`, např. `{ v: 2, day, done, total, next, tasks[≤8] }`.
- nativně: Capacitor plugin `TlapkaWidget.setData({ json })`.
Odškrtnutí na widgetu: úkol se hned označí v uloženém JSON a zařadí do fronty `ticks`. Appka frontu při dalším otevření převezme přes `consumeTicks()` a zapíše ji funkcí `applyTick()`, která je idempotentní, takže dvojí odškrtnutí nic nezdvojí. Léky se zapisují do `Medication.given`, krmení a venčení do `AppData.daily`.

## Android (zkompilováno: `./gradlew assembleDebug`, JDK 17, SDK 34)
- `TlapkaDenWidget.java` (AppWidgetProvider + RemoteViews). Při velikosti 2×2 ukazuje 1–2 úkoly, při 4×2 a větší 3. Tlačítko ✓ posílá broadcast `cz.tlapka.app.WIDGET_TICK`.
- `TlapkaWidgetPlugin.java` (SharedPreferences `tlapka_widget`), registrace v `MainActivity`.
- `res/layout/widget_*.xml`, `res/xml/tlapka_den_widget_info.xml`, barvy pro světlý i tmavý režim (`values-night`).

## iOS (napsáno, nekompilováno – na tomhle počítači není Xcode)
App target (už je v `project.pbxproj`): `MainViewController.swift` (registruje plugin), `TlapkaWidgetPlugin.swift`, `../Shared/TlapkaShared.swift`, `App.entitlements` (App Group `group.cz.tlapka.app`). Storyboard používá `MainViewController`.

Widget extension je potřeba jednou přidat v Xcode:
1. File › New › Target › **Widget Extension**, název `TlapkaWidget`, bez Live Activity a bez Configuration Intent.
2. Smaž vygenerované soubory a přidej `ios/App/TlapkaWidget/TlapkaWidget.swift`, `Info.plist`, `Assets.xcassets` a `../Shared/TlapkaShared.swift` (zaškrtnout cíl TlapkaWidget).
3. Signing & Capabilities › **App Groups** › `group.cz.tlapka.app` pro App i TlapkaWidget (entitlements jsou připravené).
4. Deployment target extension iOS 16 (interaktivní ✓ funguje od iOS 17, na iOS 16 je widget jen pro čtení).
Velikosti: systemSmall, systemMedium, zamčená obrazovka (accessoryRectangular a accessoryCircular).

## Co ověřit na zařízení
- Odškrtnutí z widgetu při zavřené appce, pak otevření appky: úkol musí být hotový jen jednou.
- Přechod přes půlnoc: widget po půlnoci ukáže prázdný stav, dokud se appka znovu neotevře. Úkoly na další den se počítají v appce.
- Tmavý režim a tónovaný režim ikon na iOS 18.
