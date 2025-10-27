import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.55199bfc17e34364ae686c4210fad884',
  appName: 'alfredo-groceries-delivers',
  webDir: 'dist',
  server: {
    url: 'https://55199bfc-17e3-4364-ae68-6c4210fad884.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
