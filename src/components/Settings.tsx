import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CATEGORIES } from '../constants/categories';
import { clearAllData, getSetting, setSetting } from '../database/db';
import { setupNotifications } from '../services/goalNotifications';

export default function Settings({ theme, themeMode = 'dark', onChangeTheme, onRefresh, onExport }: any) {
  const activeTheme = theme?.bg ? theme : {
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
    inputBg: '#000000',
  };

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [salary, setSalary] = useState('');
  const [workHours, setWorkHours] = useState('160');

  useEffect(() => {
    try {
      if (typeof getSetting === 'function') {
        const rawBudgets = getSetting('category_budgets', '{}');
        const parsed = JSON.parse(rawBudgets);
        if (parsed && typeof parsed === 'object') {
          const asString: Record<string, string> = {};
          Object.keys(parsed).forEach((k) => { asString[k] = String(parsed[k]); });
          setDraft(asString);
        }

        const savedSal = getSetting('monthly_salary', '');
        const savedHours = getSetting('monthly_hours', '160');
        if (savedSal) setSalary(savedSal);
        if (savedHours) setWorkHours(savedHours);
      }
    } catch (e) {
      console.log('Erro useEffect Settings:', e);
    }
  }, []);

  const saveWorkSalary = () => {
    try {
      if (typeof setSetting === 'function') {
        setSetting('monthly_salary', salary);
        setSetting('monthly_hours', workHours);
        Alert.alert('Sucesso 🎉', 'Salário e horas salvas! O valor da sua hora já está sendo calculado.');
        if (typeof onRefresh === 'function') onRefresh();
      } else {
        Alert.alert('Erro', 'Não foi possível acessar o banco de dados.');
      }
    } catch (e) {
      console.log('Erro ao salvar trabalho:', e);
    }
  };

  const saveBudgets = () => {
    try {
      const clean: Record<string, number> = {};
      CATEGORIES.forEach((cat) => {
        const val = parseFloat((draft[cat] || '').replace(',', '.'));
        if (!isNaN(val) && val > 0) clean[cat] = val;
      });
      if (typeof setSetting === 'function') {
        setSetting('category_budgets', JSON.stringify(clean));
      }
      Alert.alert('Sucesso', 'Orçamentos por categoria salvos!');
      if (typeof onRefresh === 'function') onRefresh();
    } catch (e) {
      console.log('Erro saveBudgets:', e);
    }
  };

  const toggleTheme = (value: boolean) => {
    try {
      const mode = value ? 'light' : 'dark';
      if (typeof setSetting === 'function') {
        setSetting('theme', mode);
      }
      if (typeof onChangeTheme === 'function') {
        onChangeTheme(mode);
      }
    } catch (e) {
      console.log('Erro toggleTheme:', e);
    }
  };

  const requestNotifPermission = async () => {
    try {
      let ok = false;
      if (typeof setupNotifications === 'function') {
        ok = await setupNotifications();
      }
      Alert.alert(
        ok ? 'Permissão concedida' : 'Permissão negada',
        ok ? 'O RB Finance poderá avisar quando você se aproximar da meta.' : 'Ative as notificações no Android.'
      );
    } catch (e) {
      console.log('Erro requestNotifPermission:', e);
    }
  };

  const handleClear = () => {
    Alert.alert('Limpar todos os dados?', 'Isso apagará todas as transações e metas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar tudo',
        style: 'destructive',
        onPress: () => {
          try {
            if (typeof clearAllData === 'function') {
              clearAllData(() => {
                if (typeof onRefresh === 'function') onRefresh();
                Alert.alert('Pronto', 'Dados limpos.');
              });
            }
          } catch (e) {
            console.log('Erro clearAllData:', e);
          }
        },
      },
    ]);
  };

  const numSalary = parseFloat(salary.replace(',', '.')) || 0;
  const numHours = parseFloat(workHours.replace(',', '.')) || 160;
  const hourlyRate = numSalary > 0 && numHours > 0 ? numSalary / numHours : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.bg }]} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: activeTheme.text }]}>Configurações</Text>
      <Text style={[styles.subtitle, { color: activeTheme.muted }]}>Personalize o RB Finance</Text>

      {/* CARD 1: SALÁRIO & HORAS DE TRABALHO */}
      <View style={[styles.card, { backgroundColor: activeTheme.card, borderColor: activeTheme.primary }]}>
        <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>⏱️ CUSTO EM HORAS DE TRABALHO</Text>
        <Text style={[styles.itemDesc, { color: activeTheme.muted, marginBottom: 12 }]}>
          Preencha para o app calcular quanto vale sua hora e mostrar o preço dos gastos em tempo de vida.
        </Text>

        <View style={styles.budgetRow}>
          <Text style={[styles.itemTitle, { color: activeTheme.text, width: 120 }]}>Salário (R$)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border }]}
            keyboardType="numeric"
            placeholder="Ex: 3000"
            placeholderTextColor={activeTheme.muted2}
            value={salary}
            onChangeText={setSalary}
          />
        </View>

        <View style={styles.budgetRow}>
          <Text style={[styles.itemTitle, { color: activeTheme.text, width: 120 }]}>Horas / Mês</Text>
          <TextInput
            style={[styles.input, { backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border }]}
            keyboardType="numeric"
            placeholder="Ex: 160"
            placeholderTextColor={activeTheme.muted2}
            value={workHours}
            onChangeText={setWorkHours}
          />
        </View>

        {hourlyRate > 0 && (
          <View style={[styles.rateBadge, { backgroundColor: activeTheme.border }]}>
            <Feather name="clock" size={16} color={activeTheme.primaryLight} />
            <Text style={{ color: activeTheme.text, fontSize: 13, fontWeight: 'bold' }}>
              Sua hora vale: <Text style={{ color: activeTheme.primaryLight }}>R$ {hourlyRate.toFixed(2)}/h</Text>
            </Text>
          </View>
        )}

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeTheme.primary, marginTop: 8 }]} onPress={saveWorkSalary}>
          <Feather name="save" size={18} color="#fff" />
          <Text style={styles.actionText}>Salvar Salário & Horas</Text>
        </TouchableOpacity>
      </View>

      {/* APARÊNCIA */}
      <View style={[styles.card, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>APARÊNCIA</Text>
        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.itemTitle, { color: activeTheme.text }]}>Tema claro</Text>
            <Text style={[styles.itemDesc, { color: activeTheme.muted }]}>{themeMode === 'light' ? 'Ativado' : 'Desativado'}</Text>
          </View>
          <Switch value={themeMode === 'light'} onValueChange={toggleTheme} trackColor={{ false: '#333', true: activeTheme.primaryLight }} thumbColor={themeMode === 'light' ? activeTheme.primary : '#f4f3f4'} />
        </View>
      </View>

      {/* NOTIFICAÇÕES */}
      <View style={[styles.card, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>NOTIFICAÇÕES</Text>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeTheme.primary }]} onPress={requestNotifPermission}>
          <Feather name="bell" size={18} color="#fff" />
          <Text style={styles.actionText}>Ativar alertas de meta</Text>
        </TouchableOpacity>
      </View>

      {/* ORÇAMENTO POR CATEGORIA */}
      <View style={[styles.card, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>ORÇAMENTO POR CATEGORIA</Text>
        {CATEGORIES.map((cat) => (
          <View key={cat} style={styles.budgetRow}>
            <Text style={[styles.itemTitle, { color: activeTheme.text, width: 110 }]}>{cat}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border }]}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={activeTheme.muted2}
              value={draft[cat] || ''}
              onChangeText={(v) => setDraft((prev) => ({ ...prev, [cat]: v }))}
            />
          </View>
        ))}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeTheme.primary, marginTop: 8 }]} onPress={saveBudgets}>
          <Feather name="save" size={18} color="#fff" />
          <Text style={styles.actionText}>Salvar Orçamentos</Text>
        </TouchableOpacity>
      </View>

      {/* DADOS */}
      <View style={[styles.card, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>DADOS</Text>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeTheme.primary }]} onPress={() => typeof onExport === 'function' && onExport()}>
          <Feather name="download" size={18} color="#fff" />
          <Text style={styles.actionText}>Exportar CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeTheme.danger, marginTop: 10 }]} onPress={handleClear}>
          <Feather name="trash-2" size={18} color="#fff" />
          <Text style={styles.actionText}>Limpar Todos os Dados</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 25 },
  subtitle: { fontSize: 13, marginBottom: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  itemDesc: { fontSize: 12, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  actionText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  rateBadge: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 8, marginVertical: 8 },
});