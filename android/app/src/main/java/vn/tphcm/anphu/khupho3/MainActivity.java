package vn.tphcm.anphu.khupho3;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15/16 (API 35/36) compliant Edge-to-Edge handling:
        // Paint DecorView in Vietnamese Civic Red (#B91C1C) and apply systemBars + displayCutout + IME insets
        // to the root content view so WebView never overlaps system bars or notch/cutout areas.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#B91C1C"));

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(true);
        }

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets barsAndCutout = windowInsets.getInsets(
                        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets imeInsets = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                int bottomPadding = Math.max(barsAndCutout.bottom, imeInsets.bottom);
                v.setPadding(barsAndCutout.left, barsAndCutout.top, barsAndCutout.right, bottomPadding);
                return WindowInsetsCompat.CONSUMED;
            });
            ViewCompat.requestApplyInsets(contentView);
        }
    }
}
