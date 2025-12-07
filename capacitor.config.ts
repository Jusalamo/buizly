import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jusalamo.buizly', // CHANGE this to your reverse-domain id (e.g. com.yourcompany.app)
  appName: 'Buizly',            // CHANGE to your app name
  webDir: 'dist',               // Vite default build output
  bundledWebRuntime: false,
  server: {
    // Optional (development only): point to your Vite dev server for live reload.
    // url: 'http://192.168.1.100:5173',
    // cleartext: true
  },
};

export default config;
