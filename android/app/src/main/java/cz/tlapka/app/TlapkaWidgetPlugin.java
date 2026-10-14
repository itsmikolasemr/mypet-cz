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

    @PluginMethod
    public void consumeTicks(PluginCall call) {
        JSONArray q = TlapkaDenWidget.takeTicks(getContext());
        JSObject ret = new JSObject();
        try { ret.put("ticks", JSArray.from(q)); } catch (Exception e) { ret.put("ticks", new JSArray()); }
        call.resolve(ret);
    }
}
