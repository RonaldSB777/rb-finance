import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const setupNotifications = async (): Promise<boolean> => {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rb-finance', {
        name: 'RB Finance',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
};

export const checkGoalAndNotify = async (totalExpense: number, metaValue: number) => {
  try {
    if (!metaValue || metaValue <= 0) return;

    const percent = (totalExpense / metaValue) * 100;
    const monthKey = new Date().toLocaleDateString('pt-BR').slice(3);

    const key80 = `goal_notified_80_${monthKey}`;
    const key100 = `goal_notified_100_${monthKey}`;

    const already80 = await AsyncStorage.getItem(key80);
    const already100 = await AsyncStorage.getItem(key100);

    if (percent >= 100 && !already100) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❌ Meta ultrapassada',
          body: `Você já gastou R$ ${totalExpense.toFixed(2)} e passou da meta de R$ ${metaValue.toFixed(2)}.`,
        },
        trigger: null,
      });
      await AsyncStorage.setItem(key100, '1');
      await AsyncStorage.setItem(key80, '1');
      return;
    }

    if (percent >= 80 && percent < 100 && !already80) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Atenção à meta',
          body: `Você já usou ${percent.toFixed(0)}% da sua meta mensal.`,
        },
        trigger: null,
      });
      await AsyncStorage.setItem(key80, '1');
    }
  } catch (e) {
    console.log('Erro notificação de meta:', e);
  }
};