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
        // Super-App v3.0: Android 15/16 Edge-to-Edge fix — paint DecorView #B91C1C so
        // transparent status bar band renders crisp white icons over Vietnamese Civic Red
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#B91C1C"));
        getWindow().setStatusBarColor(Color.parseColor("#B91C1C"));
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(true);
        }
    }
}
