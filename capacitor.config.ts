import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "vn.tphcm.anphu.khupho3",
  appName: "KP3 An Phú",
  webDir: "dist",
  server: {
    androidScheme: "https",
    allowNavigation: [
      "bdhkp3.vercel.app",
      "*.supabase.co",
      "*.zalo.me",
      "*.zadn.vn",
    ],
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#0f172a",
  },
};

export default config;
