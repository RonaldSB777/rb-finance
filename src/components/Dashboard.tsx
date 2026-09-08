import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { Feather } from '@expo/vector-icons';
import { Transaction, addTransaction, deleteTransaction } from '../database/db';
import { CATEGORY_EMOJIS, getCategoryEmoji } from '../constants/categories';
import MarketCalculatorRaw from './MarketCalculator';

// Validação estrita de componente para evitar o erro "got: object"
const MarketCalculatorComponent: any =
  typeof MarketCalculatorRaw === 'function'
    ? MarketCalculatorRaw
    : (MarketCalculatorRaw as any)?.default || (MarketCalculatorRaw as any)?.MarketCalculator;

const SafePieChart: any = (PieChart as any)?.default || PieChart;
const SafeLineChart: any = (LineChart as any)?.default || LineChart;

const screenWidth = Dimensions.get('window').width;

export default function Dashboard({
  transactions = [],
  onRefresh,
  showValues = true,
  toggleValues,
  monthName = '',
  onNextMonth,
  onPrevMonth,
  theme,
  hourlyRate = 0,
}: any) {
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
    warning: '#f59e0b',
  };

  const [marketModalVisible, setMarketModalVisible] = useState(false);

  const metaTx = (transactions || []).find((t: any) => t && t.category === 'META_SISTEMA');
  const metaValue = metaTx ? metaTx.amount : 0;
  const regularTxs = (transactions || []).filter((t: any) => t && t.category !== 'META_SISTEMA');

  const totalIncome = regularTxs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const expenses = regularTxs.filter((t: any) => t.type === 'expense');
  const totalExpense = expenses.reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  const biggestExpense = expenses.length > 0 ? expenses.reduce((p: any, c: any) => ((p.amount || 0) > (c.amount || 0) ? p : c)) : null;
  const dailyAverage = totalExpense / (new Date().getDate() || 1);

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [metaInput, setMetaInput] = useState(metaValue ? metaValue.toString() : '');

  const handleSaveMeta = () => {
    const newVal = parseFloat(String(metaInput).replace(',', '.'));
    if (isNaN(newVal)) return;
    if (metaTx && metaTx.id) deleteTransaction(metaTx.id);
    addTransaction({
      description: 'Meta de Gastos',
      amount: newVal,
      type: 'income',
      category: 'META_SISTEMA',
      date: new Date().toLocaleDateString('pt-BR'),
    }, onRefresh);
    setIsEditingMeta(false);
  };

  const expensePercent = metaValue > 0 ? (totalExpense / metaValue) * 100 : 0;
  let progressColor = activeTheme.primary;
  if (expensePercent >= 80) progressColor = activeTheme.warning;
  if (expensePercent >= 100) progressColor = activeTheme.danger;

  const expensesByCategory: Record<string, number> = {};
  (expenses || []).forEach((tx: any) => {
    if (tx) {
      const cat = tx.category || 'Outros';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (tx.amount || 0);
    }
  });

  const colorPalette = [activeTheme.primary, activeTheme.primaryLight, '#f472b6', '#38bdf8', '#818cf8', '#fbbf24'];
  const categoryKeys = Object.keys(expensesByCategory);
  const pieData = categoryKeys
    .sort((a, b) => (expensesByCategory[b] || 0) - (expensesByCategory[a] || 0))
    .map((key, index) => ({
      name: key || 'Outros',
      amount: expensesByCategory[key] || 0,
      color: colorPalette[index % colorPalette.length],
      legendFontColor: activeTheme.muted,
      legendFontSize: 12,
    }));

  const lineData = {
    labels: ['Mínimo', 'Atual'],
    datasets: [
      { data: [0, totalExpense === 0 ? 1 : totalExpense], color: () => activeTheme.danger, strokeWidth: 2 },
      { data: [0, totalIncome === 0 ? 1 : totalIncome], color: () => activeTheme.success, strokeWidth: 2 },
    ],
    legend: ['Despesas', 'Receitas'],
  };

  const formatMoney = (val: number) => (showValues ? `R$ ${Number(val || 0).toFixed(2)}` : 'R$ •••••');

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.bg }]} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.logoMark, { backgroundColor: activeTheme.primary }]}><Text style={styles.logoMarkText}>RB</Text></View>
          <View style={styles.brandTextWrap}>
            <Text style={[styles.brandTitle, { color: activeTheme.text }]}>RB <Text style={{ color: activeTheme.primaryLight }}>Finance</Text></Text>
            <Text style={{ color: activeTheme.muted, fontSize: 12 }}>Seu controle na palma da mão.</Text>
          </View>

          <TouchableOpacity onPress={() => setMarketModalVisible(true)} style={[styles.marketBtn, { backgroundColor: activeTheme.card, borderColor: activeTheme.primary }]}>
            <Text style={{ fontSize: 16 }}>🛒</Text>
            <Text style={{ color: activeTheme.text, fontSize: 12, fontWeight: 'bold' }}>Feira</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navegador de Mês */}
      <View style={[styles.monthNav, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.monthBtn}><Feather name="chevron-left" size={24} color={activeTheme.text} /></TouchableOpacity>
        <Text style={[styles.monthText, { color: activeTheme.text }]}>{monthName}</Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.monthBtn}><Feather name="chevron-right" size={24} color={activeTheme.text} /></TouchableOpacity>
      </View>

      {/* Insights */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
        <View style={[styles.insightCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
          <Text style={{ color: activeTheme.muted, fontSize: 11, fontWeight: '700' }}>MAIOR GASTO</Text>
          <Text style={{ color: activeTheme.text, fontWeight: '800', marginTop: 6 }} numberOfLines={1}>{biggestExpense ? biggestExpense.description : '---'}</Text>
          <Text style={{ color: activeTheme.muted, marginTop: 4 }}>{biggestExpense ? formatMoney(biggestExpense.amount) : ''}</Text>
        </View>
        <View style={[styles.insightCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
          <Text style={{ color: activeTheme.muted, fontSize: 11, fontWeight: '700' }}>MÉDIA DIÁRIA</Text>
          <Text style={{ color: activeTheme.text, fontWeight: '800', marginTop: 6 }}>{formatMoney(dailyAverage)}</Text>
          <Text style={{ color: activeTheme.muted, marginTop: 4 }}>/ dia neste mês</Text>
        </View>
        <View style={[styles.insightCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
          <Text style={{ color: activeTheme.muted, fontSize: 11, fontWeight: '700' }}>MOVIMENTAÇÕES</Text>
          <Text style={{ color: activeTheme.text, fontWeight: '800', marginTop: 6 }}>{regularTxs.length}</Text>
          <Text style={{ color: activeTheme.muted, marginTop: 4 }}>Registros</Text>
        </View>
      </ScrollView>

      {/* Meta de Gastos */}
      <View style={[styles.metaCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.primary }]}>
        <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>META DE GASTOS DO MÊS</Text>
        {isEditingMeta ? (
          <View style={styles.metaRow}>
            <Text style={{ color: activeTheme.text, fontSize: 20, fontWeight: '700' }}>R$ </Text>
            <TextInput style={[styles.metaInput, { color: activeTheme.text, borderColor: activeTheme.primary }]} keyboardType="numeric" value={metaInput} onChangeText={setMetaInput} autoFocus />
            <TouchableOpacity style={[styles.metaSaveBtn, { backgroundColor: activeTheme.primary }]} onPress={handleSaveMeta}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.metaRow}>
            <Text style={[styles.metaValue, { color: activeTheme.text }]}>{formatMoney(metaValue)}</Text>
            {showValues && (
              <TouchableOpacity onPress={() => { setMetaInput(metaValue.toString()); setIsEditingMeta(true); }}>
                <Text style={{ color: activeTheme.primaryLight, fontWeight: '700' }}>✏️ Ajustar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {metaValue > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={[styles.progressTrack, { backgroundColor: activeTheme.border }]}>
              <View style={{ height: '100%', width: `${Math.min(expensePercent, 100)}%`, backgroundColor: progressColor, borderRadius: 999 }} />
            </View>
            <Text style={{ color: activeTheme.muted, fontSize: 12, marginTop: 6, textAlign: 'right' }}>
              {showValues ? `${expensePercent.toFixed(1)}% do limite` : '•••• do limite'}
            </Text>
            {showValues && expensePercent >= 80 && expensePercent < 100 && <Text style={{ color: activeTheme.warning, fontWeight: '700', marginTop: 8 }}>⚠️ Perto de estourar a meta!</Text>}
            {showValues && expensePercent >= 100 && <Text style={{ color: activeTheme.danger, fontWeight: '700', marginTop: 8 }}>❌ Meta ultrapassada!</Text>}
          </View>
        )}
      </View>

      {/* Saldo Atual */}
      <View style={[styles.balanceCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>SALDO ATUAL</Text>
          <TouchableOpacity onPress={toggleValues} style={{ padding: 4 }}>
            <Feather name={showValues ? 'eye' : 'eye-off'} size={20} color={activeTheme.muted} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.balanceValue, { color: showValues ? (balance >= 0 ? activeTheme.success : activeTheme.danger) : activeTheme.text }]}>
          {formatMoney(balance)}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.miniCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border, borderLeftColor: activeTheme.success, borderLeftWidth: 4 }]}>
          <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>RECEITAS</Text>
          <Text style={{ color: showValues ? activeTheme.success : activeTheme.text, fontWeight: '700', marginTop: 8 }}>{showValues ? '+' : ''} {formatMoney(totalIncome)}</Text>
        </View>
        <View style={[styles.miniCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border, borderLeftColor: activeTheme.danger, borderLeftWidth: 4 }]}>
          <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>DESPESAS</Text>
          <Text style={{ color: showValues ? activeTheme.danger : activeTheme.text, fontWeight: '700', marginTop: 8 }}>{showValues ? '-' : ''} {formatMoney(totalExpense)}</Text>
        </View>
      </View>

      {/* Gráficos com validação de componente */}
      {showValues ? (
        <>
          {pieData.length > 0 && typeof SafePieChart === 'function' && (
            <View style={[styles.chartCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
              <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>GASTOS POR CATEGORIA</Text>
              <SafePieChart
                data={pieData}
                width={screenWidth - 80}
                height={180}
                chartConfig={{ color: () => activeTheme.text }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
              />
              {pieData.map((item: any, idx: number) => {
                const catName = (item?.name) ? String(item.name) : 'Outros';
                const catAmount = (item?.amount) ? Number(item.amount) : 0;
                const percent = totalExpense > 0 ? (catAmount / totalExpense) * 100 : 0;
                return (
                  <View key={idx} style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: activeTheme.text }}>{getCategoryEmoji(catName) || '📦'} {catName}</Text>
                      <Text style={{ color: activeTheme.text, fontWeight: '700' }}>{formatMoney(catAmount)}</Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: activeTheme.border }]}>
                      <View style={{ height: '100%', width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: (item?.color) || activeTheme.primary, borderRadius: 999 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {typeof SafeLineChart === 'function' && (
            <View style={[styles.chartCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
              <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>RECEITAS VS DESPESAS</Text>
              <SafeLineChart
                data={lineData}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  backgroundColor: activeTheme.card,
                  backgroundGradientFrom: activeTheme.card,
                  backgroundGradientTo: activeTheme.card,
                  decimalPlaces: 0,
                  color: () => activeTheme.primarySoft,
                  labelColor: () => activeTheme.muted,
                  propsForDots: { r: '5', strokeWidth: '2', stroke: activeTheme.bg },
                }}
                bezier
                style={{ marginTop: 15, borderRadius: 12 }}
              />
            </View>
          )}
        </>
      ) : (
        <View style={[styles.hiddenChartCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
          <Feather name="eye-off" size={40} color={activeTheme.muted2} />
          <Text style={{ color: activeTheme.muted, fontWeight: '700', marginTop: 10 }}>Gráficos e valores ocultos.</Text>
        </View>
      )}

      {/* MODAL DA CALCULADORA DE FEIRA */}
      {typeof MarketCalculatorComponent === 'function' && (
        <MarketCalculatorComponent
          visible={marketModalVisible}
          onClose={() => setMarketModalVisible(false)}
          onRefresh={onRefresh}
          theme={activeTheme}
          showValues={showValues}
          hourlyRate={hourlyRate}
        />
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 18, marginBottom: 15 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logoMarkText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  brandTextWrap: { flex: 1 },
  brandTitle: { fontSize: 24, fontWeight: '800' },
  marketBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 15 },
  monthText: { fontSize: 16, fontWeight: 'bold' },
  monthBtn: { paddingHorizontal: 10 },
  insightCard: { width: 140, marginRight: 12, padding: 15, borderRadius: 16, borderWidth: 1 },
  metaCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 15 },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' },
  metaValue: { fontSize: 24, fontWeight: '800' },
  metaInput: { flex: 1, fontSize: 20, fontWeight: '700', borderBottomWidth: 1, padding: 0 },
  metaSaveBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginLeft: 15 },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  balanceCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 15 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceValue: { fontSize: 34, fontWeight: '800', marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  miniCard: { flex: 0.48, padding: 16, borderRadius: 16, borderWidth: 1 },
  chartCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 15 },
  hiddenChartCard: { padding: 40, borderRadius: 16, borderWidth: 1, marginBottom: 15, alignItems: 'center' },
});