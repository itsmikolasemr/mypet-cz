import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cz.tlapka.app',
  appName: 'Tlapka',
  webDir: 'out',
  backgroundColor: '#ECEFF3',
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_tlapka', iconColor: '#7FB3E8' },
  },
};

export default config;
