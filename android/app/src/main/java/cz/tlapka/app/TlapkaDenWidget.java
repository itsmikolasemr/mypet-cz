package cz.tlapka.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * „Tlapka Den“ – Android App Widget (2×2 small, 4×2 medium via resize).
 * Data: SharedPreferences "tlapka_widget" → "json" = lib/widget.ts widgetPayload() (today.tasks[], done, total).
 * Tick button → broadcast ACTION_TICK → task marked done in the cached JSON (instant feedback) and queued in "ticks";
 * the app applies the queue on next resume (TlapkaWidget.consumeTicks → lib/today.ts applyTick, idempotent).
 */
public class TlapkaDenWidget extends AppWidgetProvider {
    public static final String PREFS = "tlapka_widget", KEY_JSON = "json", KEY_TICKS = "ticks";
    public static final String ACTION_TICK = "cz.tlapka.app.WIDGET_TICK", EXTRA_ID = "taskId";
    private static final int[] ROWS = { R.id.row0, R.id.row1, R.id.row2 };
    private static final int[] TITLES = { R.id.title0, R.id.title1, R.id.title2 };
    private static final int[] SUBS = { R.id.sub0, R.id.sub1, R.id.sub2 };
    private static final int[] TICKS = { R.id.tick0, R.id.tick1, R.id.tick2 };

    static SharedPreferences store(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, TlapkaDenWidget.class));
        for (int id : ids) render(c, m, id);
    }

    static synchronized JSONArray takeTicks(Context c) {
        SharedPreferences p = store(c);
        JSONArray q;
        try { q = new JSONArray(p.getString(KEY_TICKS, "[]")); } catch (Exception e) { q = new JSONArray(); }
        p.edit().putString(KEY_TICKS, "[]").apply();
        return q;
    }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) render(c, m, id); }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) { render(c, m, id); }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        if (!ACTION_TICK.equals(i.getAction())) return;
        String taskId = i.getStringExtra(EXTRA_ID);
        if (taskId == null) return;
        synchronized (TlapkaDenWidget.class) {
            SharedPreferences p = store(c);
            try {
                JSONArray q = new JSONArray(p.getString(KEY_TICKS, "[]"));
                JSONObject t = new JSONObject();
                t.put("id", taskId);
                t.put("at", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(new Date()));
                q.put(t);
                JSONObject root = new JSONObject(p.getString(KEY_JSON, "{}"));
                JSONObject today = root.optJSONObject("today");
                if (today != null) {
                    JSONArray tasks = today.optJSONArray("tasks");
                    if (tasks != null) for (int k = 0; k < tasks.length(); k++) {
                        JSONObject x = tasks.getJSONObject(k);
                        if (taskId.equals(x.optString("id")) && !x.optBoolean("done")) { x.put("done", true); today.put("done", today.optInt("done") + 1); }
                    }
                }
                p.edit().putString(KEY_TICKS, q.toString()).putString(KEY_JSON, root.toString()).apply();
            } catch (Exception ignored) { }
        }
        refreshAll(c);
    }

    static void render(Context c, AppWidgetManager m, int widgetId) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_tlapka_den);
        int done = 0, total = 0;
        JSONArray open = new JSONArray();
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        try {
            JSONObject t = new JSONObject(store(c).getString(KEY_JSON, "{}")).optJSONObject("today");
            if (t != null && today.equals(t.optString("day"))) {
                done = t.optInt("done"); total = t.optInt("total");
                JSONArray tasks = t.optJSONArray("tasks");
                if (tasks != null) for (int k = 0; k < tasks.length(); k++) if (!tasks.getJSONObject(k).optBoolean("done")) open.put(tasks.getJSONObject(k));
            }
        } catch (Exception ignored) { }
        v.setTextViewText(R.id.progress, total == 0 ? "–" : done + "/" + total);
        v.setProgressBar(R.id.bar, Math.max(total, 1), done, false);
        v.setTextViewText(R.id.headline, total == 0 ? c.getString(R.string.widget_empty) : open.length() == 0 ? c.getString(R.string.widget_all_done) : c.getString(R.string.widget_left, open.length()));

        Bundle o = m.getAppWidgetOptions(widgetId);
        int minH = o == null ? 110 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);
        int rows = minH >= 180 ? 3 : minH >= 110 ? 2 : 1;
        for (int k = 0; k < ROWS.length; k++) {
            JSONObject x = k < rows ? open.optJSONObject(k) : null;
            if (x == null) { v.setViewVisibility(ROWS[k], View.GONE); continue; }
            v.setViewVisibility(ROWS[k], View.VISIBLE);
            String kind = x.optString("kind");
            String title = "walk".equals(kind) ? c.getString(R.string.widget_walk, x.optString("pet")) : x.optString("title");
            v.setTextViewText(TITLES[k], title);
            String sub = x.optString("time");
            if (!"walk".equals(kind)) sub = (sub.isEmpty() ? "" : sub + " · ") + x.optString("pet");
            v.setTextViewText(SUBS[k], sub);
            Intent tick = new Intent(c, TlapkaDenWidget.class).setAction(ACTION_TICK).putExtra(EXTRA_ID, x.optString("id"));
            PendingIntent pi = PendingIntent.getBroadcast(c, (widgetId * 31 + x.optString("id").hashCode()), tick, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(TICKS[k], pi);
            v.setContentDescription(TICKS[k], c.getString(R.string.widget_tick_a11y, title));
        }
        Intent open1 = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.header, PendingIntent.getActivity(c, widgetId, open1, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        m.updateAppWidget(widgetId, v);
    }
}
