import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pscan.camscanner',
  appName: 'P-Scan',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#0b1324',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
