import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jusalamo.buizly',
  appName: 'Buizly',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    // Deep link handling
    App: {
      // Handle buizly:// deep links
      // URL scheme: buizly://profile/{userId}
    },
  },
  server: {
    // Development only: uncomment for live reload
    // url: 'http://192.168.1.100:5173',
    // cleartext: true
  },
  // Deep link configuration for iOS
  ios: {
    scheme: 'buizly',
  },
  // Deep link configuration for Android
  android: {
    // Android uses intent filters configured in AndroidManifest.xml
    // Add the following to your AndroidManifest.xml:
    // <intent-filter android:autoVerify="true">
    //   <action android:name="android.intent.action.VIEW" />
    //   <category android:name="android.intent.category.DEFAULT" />
    //   <category android:name="android.intent.category.BROWSABLE" />
    //   <data android:scheme="buizly" />
    // </intent-filter>
  },
};

export default config;
