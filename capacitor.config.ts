import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cz.tlapka.app',
  appName: 'Tlapka',
  webDir: 'out',
  backgroundColor: '#FFF8F0',
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_tlapka', iconColor: '#E8553A' },
  },
};

export default config;
