package vn.tphcm.anphu.khupho3;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Super-App v2.0: Red Bronze-Drum status bar (#B91C1C) with crisp white icons
        // and crisp dark navigation bar icons on white 5-tab bottom bar
        getWindow().setStatusBarColor(Color.parseColor("#B91C1C"));
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(true);
        }
    }
}
