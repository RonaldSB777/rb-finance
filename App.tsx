import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar, AppRegistry, Alert } from 'react-native';
import RNNotificationListener from 'react-native-notification-listener';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { initDatabase, getTransactions, Transaction, getSetting } from './src/database/db';
import { handleIncomingNotification } from './src/services/notificationParser';
import { setupNotifications } from './src/services/goalNotifications';

import Dashboard from './src/components/Dashboard';
import TransactionsList from './src/components/TransactionsList';
import Subscriptions from './src/components/Subscriptions';
import Settings from './src/components/Settings';
import ChatIA from './src/components/ChatIA'; // Importação atualizada e limpa

const ListenerModule = RNNotificationListener as any;

const DARK_THEME = {
  mode: 'dark' as const,
  bg: '#000000',
  card: '#111111',
  border: '#222222',
  text: '#ffffff',
  muted: '#a1a1aa',
  muted2: '#71717a',
  primary: '#9333ea',
  primarySoft: '#a855f7',
  primaryLight: '#c084fc',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  inputBg: '#000000',
};

const LIGHT_THEME = {
  mode: 'light' as const,
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#0f172a',
  muted: '#64748b',
  muted2: '#94a3b8',
  primary: '#7c3aed',
  primarySoft: '#8b5cf6',
  primaryLight: '#a78bfa',
  danger: '#ef4444',
  success: '#059669',
  warning: '#d97706',
  inputBg: '#f1f5f9',
};

const headlessNotificationListener = async (notificationTask: any) => {
  if (!notificationTask) return;
  try {
    let notification = notificationTask.notification;
    if (typeof notification === 'string') {
      try { notification = JSON.parse(notification); } catch { notification = {}; }
    }
    if (notification) {
      const title = notification.title || notification.androidTitle || '';
      const text = notification.text || notification.androidText || notification.message || '';
      if (title || text) {
        initDatabase();
        handleIncomingNotification(title, text);
      }
    }
  } catch {}
};

if (!(globalThis as any).__HEADLESS_TASK_REGISTERED__) {
  try {
    AppRegistry.registerHeadlessTask('RNAndroidNotificationListenerHeadlessJs', () => headlessNotificationListener);
    (globalThis as any).__HEADLESS_TASK_REGISTERED__ = true;
  } catch {}
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dash' | 'list' | 'chat' | 'subs' | 'settings'>('dash');
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [hasPermission, setHasPermission] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [themeMode, setThemeModeState] = useState<'dark' | 'light'>('dark');

  const [salary, setSalary] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(0);

  const activeTheme = themeMode === 'light' ? LIGHT_THEME : DARK_THEME;

  const loadData = async () => {
    try {
      const data = await getTransactions();
      setAllTransactions(data || []);

      const rawSalary = getSetting('monthly_salary', '0');
      const rawHours = getSetting('monthly_hours', '160');
      const numSal = parseFloat(rawSalary.replace(',', '.')) || 0;
      const numHor = parseFloat(rawHours.replace(',', '.')) || 160;
      setSalary(numSal);
      setHourlyRate(numSal > 0 && numHor > 0 ? numSal / numHor : 0);
    } catch {
      setAllTransactions([]);
    }
  };

  const checkPermission = async () => {
    try {
      if (ListenerModule?.getPermissionStatus) {
        const status = await ListenerModule.getPermissionStatus();
        setHasPermission(status === 'authorized');
      }
    } catch {}
  };

  useEffect(() => {
    initDatabase();
    loadData();
    checkPermission();
    setupNotifications();

    try {
      const savedTheme = getSetting('theme', 'dark');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeModeState(savedTheme as any);
      }
    } catch {}

    let subscription: any = null;
    try {
      if (ListenerModule?.addNotificationListener) {
        subscription = ListenerModule.addNotificationListener((notification: any) => {
          if (!notification) return;
          let parsedData = notification;
          if (typeof notification === 'string') {
            try { parsedData = JSON.parse(notification); } catch { parsedData = {}; }
          }
          const title = parsedData?.title || parsedData?.androidTitle || '';
          const text = parsedData?.text || parsedData?.androidText || parsedData?.message || '';
          if (title || text) {
            handleIncomingNotification(title, text);
            loadData();
          }
        });
      }
    } catch {}

    return () => {
      try { subscription?.remove?.(); } catch {}
    };
  }, []);

  const currentMonthString = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
  const monthName = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const filteredTransactions = (allTransactions || []).filter(
    (t) => t?.category === 'META_SISTEMA' || (t?.date && String(t.date).endsWith(currentMonthString))
  );

  const exportToCSV = async () => {
    try {
      let csv = 'Data,Descricao,Categoria,Tipo,Valor\n';
      (allTransactions || []).forEach((t) => {
        if (t?.category !== 'META_SISTEMA') {
          csv += `${t.date},"${t.description}",${t.category},${t.type === 'income' ? 'Receita' : 'Despesa'},${t.amount}\n`;
        }
      });

      const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
      const fileUri = `${cacheDir}RB_Finance_Backup.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar Backup do RB Finance' });
      } else {
        Alert.alert('Erro', 'Compartilhamento não disponível.');
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Não foi possível exportar os dados.');
    }
  };

  const bg = activeTheme.bg;
  const card = activeTheme.card;
  const border = activeTheme.border;
  const text = activeTheme.text;
  const primary = activeTheme.primary;

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 30 : 0 }]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={bg} />

      {!hasPermission && Platform.OS === 'android' && (
        <TouchableOpacity style={styles.warningBanner} onPress={() => ListenerModule?.requestPermission?.()}>
          <Text style={styles.warningText}>🔔 Toque para permitir leitura de notificações do Carteira</Text>
        </TouchableOpacity>
      )}

      <View style={{ flex: 1 }}>
        {currentTab === 'dash' && (
          <Dashboard
            transactions={filteredTransactions}
            onRefresh={loadData}
            showValues={showValues}
            toggleValues={() => setShowValues(!showValues)}
            monthName={monthName}
            onNextMonth={nextMonth}
            onPrevMonth={prevMonth}
            theme={activeTheme}
          />
        )}

        {currentTab === 'list' && (
          <TransactionsList
            transactions={filteredTransactions}
            onRefresh={loadData}
            showValues={showValues}
            monthName={monthName}
            onNextMonth={nextMonth}
            onPrevMonth={prevMonth}
            onExport={exportToCSV}
            theme={activeTheme}
            hourlyRate={hourlyRate}
          />
        )}

        {currentTab === 'chat' && (
          <ChatIA
            transactions={filteredTransactions}
            theme={activeTheme}
            showValues={showValues}
            salary={salary}
            hourlyRate={hourlyRate}
            monthName={monthName}
          />
        )}

        {currentTab === 'subs' && (
          <Subscriptions
            transactions={allTransactions}
            onRefresh={loadData}
            showValues={showValues}
            theme={activeTheme}
            salary={salary}
            hourlyRate={hourlyRate}
          />
        )}

        {currentTab === 'settings' && (
          <Settings
            theme={activeTheme}
            themeMode={themeMode}
            onChangeTheme={setThemeModeState}
            onRefresh={loadData}
            onExport={exportToCSV}
          />
        )}
      </View>

      <View style={[styles.tabBar, { backgroundColor: card, borderTopColor: border }]}>
        <TouchableOpacity style={[styles.tabButton, currentTab === 'dash' && { borderTopWidth: 2, borderTopColor: primary }]} onPress={() => { setCurrentTab('dash'); loadData(); }}>
          <Text style={[styles.tabText, { color: text }]}>📊 Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, currentTab === 'list' && { borderTopWidth: 2, borderTopColor: primary }]} onPress={() => { setCurrentTab('list'); loadData(); }}>
          <Text style={[styles.tabText, { color: text }]}>💸 Extrato</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, currentTab === 'chat' && { borderTopWidth: 2, borderTopColor: primary }]} onPress={() => { setCurrentTab('chat'); loadData(); }}>
          <Text style={[styles.tabText, { color: text }]}>🤖 IA Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, currentTab === 'subs' && { borderTopWidth: 2, borderTopColor: primary }]} onPress={() => { setCurrentTab('subs'); loadData(); }}>
          <Text style={[styles.tabText, { color: text }]}>🔄 Fixos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, currentTab === 'settings' && { borderTopWidth: 2, borderTopColor: primary }]} onPress={() => setCurrentTab('settings')}>
          <Text style={[styles.tabText, { color: text }]}>⚙️ Ajustes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  warningBanner: { backgroundColor: '#f59e0b', padding: 12, alignItems: 'center' },
  warningText: { color: '#000', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  tabBar: { flexDirection: 'row', height: 60, borderTopWidth: 1 },
  tabButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabText: { fontWeight: 'bold', fontSize: 10 },
});