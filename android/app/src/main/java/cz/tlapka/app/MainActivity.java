package cz.tlapka.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // v1.2: local plugin bridging the web app ↔ „Tlapka Den“ home-screen widget
        registerPlugin(TlapkaWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
