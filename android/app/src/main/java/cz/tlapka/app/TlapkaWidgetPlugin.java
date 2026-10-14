package cz.tlapka.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

/** JS: registerPlugin('TlapkaWidget') – see lib/widget.ts */
@CapacitorPlugin(name = "TlapkaWidget")
public class TlapkaWidgetPlugin extends Plugin {
    @PluginMethod
    public void setData(PluginCall call) {
        String json = call.getString("json", "{}");
        TlapkaDenWidget.store(getContext()).edit().putString(TlapkaDenWidget.KEY_JSON, json).apply();
        TlapkaDenWidget.refreshAll(getContext());
        call.resolve();
    }

    /** Android 8+: system dialog „Přidat na plochu“ (launcher must support pinning). */
    @PluginMethod
    public void pinWidget(PluginCall call) {
        android.appwidget.AppWidgetManager m = android.appwidget.AppWidgetManager.getInstance(getContext());
        boolean ok = android.os.Build.VERSION.SDK_INT >= 26 && m.isRequestPinAppWidgetSupported()
            && m.requestPinAppWidget(new android.content.ComponentName(getContext(), TlapkaDenWidget.class), null, null);
        JSObject r = new JSObject(); r.put("pinned", ok); call.resolve(r);
    }

    @PluginMethod
    public void consumeTicks(PluginCall call) {
        JSONArray q = TlapkaDenWidget.takeTicks(getContext());
        JSObject ret = new JSObject();
        try { ret.put("ticks", JSArray.from(q)); } catch (Exception e) { ret.put("ticks", new JSArray()); }
        call.resolve(ret);
    }
}
