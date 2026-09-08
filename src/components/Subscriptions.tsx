import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Transaction, deleteTransaction } from '../database/db';
import { getCategoryEmoji } from '../constants/categories';

interface SubscriptionsProps {
  transactions: Transaction[];
  onRefresh: () => void;
  showValues: boolean;
  theme?: any;
  salary?: number;
  hourlyRate?: number;
}

export default function Subscriptions({
  transactions = [],
  onRefresh,
  showValues = true,
  theme,
  salary = 0,
  hourlyRate = 0,
}: SubscriptionsProps) {
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
  };

  const recurringTxs = (transactions || []).filter(
    (t) => t && t.category !== 'META_SISTEMA' && (t.recurring === 1 || t.type === 'expense')
  );

  const uniqueSubsMap: Record<string, Transaction> = {};
  recurringTxs.forEach((tx) => {
    if (tx) {
      const descLower = (tx.description || '').toLowerCase();
      if (
        tx.recurring === 1 ||
        tx.category === 'Lazer' ||
        tx.category === 'Saúde' ||
        descLower.includes('netflix') ||
        descLower.includes('spotify') ||
        descLower.includes('internet')
      ) {
        if (!uniqueSubsMap[descLower]) {
          uniqueSubsMap[descLower] = tx;
        }
      }
    }
  });

  const subsList = Object.values(uniqueSubsMap);
  const totalMonthlyCost = subsList.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalAnnualCost = totalMonthlyCost * 12;

  const salaryPercent = salary > 0 ? (totalMonthlyCost / salary) * 100 : 0;
  const annualWorkHours = hourlyRate > 0 ? totalAnnualCost / hourlyRate : 0;

  const formatMoney = (val: number) => (showValues ? `R$ ${Number(val || 0).toFixed(2)}` : 'R$ •••••');

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.bg }]} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: activeTheme.text }]}>Assinaturas & Fixos</Text>
      <Text style={[styles.subtitle, { color: activeTheme.muted }]}>Seus compromissos mensais recorrentes</Text>

      <View style={[styles.summaryCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.primary }]}>
        <Text style={[styles.cardTitle, { color: activeTheme.primarySoft }]}>CUSTO TOTAL EM ASSINATURAS</Text>
        
        <View style={styles.priceRow}>
          <View>
            <Text style={[styles.monthlyValue, { color: activeTheme.text }]}>{formatMoney(totalMonthlyCost)}</Text>
            <Text style={{ color: activeTheme.muted, fontSize: 12 }}>por mês</Text>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.annualValue, { color: activeTheme.danger }]}>{formatMoney(totalAnnualCost)}</Text>
            <Text style={{ color: activeTheme.muted, fontSize: 12 }}>impacto por ano 📅</Text>
          </View>
        </View>

        {hourlyRate > 0 && showValues && (
          <View style={[styles.hoursNotice, { backgroundColor: activeTheme.border }]}>
            <Feather name="clock" size={16} color={activeTheme.primaryLight} />
            <Text style={[styles.hoursNoticeText, { color: activeTheme.text }]}>
              Você trabalha <Text style={{ color: activeTheme.primaryLight, fontWeight: 'bold' }}>{annualWorkHours.toFixed(1)} horas por ano</Text> só para pagar esses gastos fixos.
            </Text>
          </View>
        )}

        {salary > 0 && showValues && (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: activeTheme.muted, fontSize: 12 }}>Comprometimento da Renda</Text>
              <Text style={{ color: activeTheme.primaryLight, fontSize: 12, fontWeight: 'bold' }}>{salaryPercent.toFixed(1)}% do seu salário</Text>
            </View>
            <View style={{ height: 6, backgroundColor: activeTheme.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.min(salaryPercent, 100)}%`, backgroundColor: activeTheme.primary }} />
            </View>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: activeTheme.primarySoft }]}>SUAS ASSINATURAS ATIVAS ({subsList.length})</Text>

      {subsList.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
          <Feather name="repeat" size={32} color={activeTheme.muted2} />
          <Text style={{ color: activeTheme.muted, marginTop: 10, textAlign: 'center' }}>
            Nenhuma assinatura ou gasto recorrente identificado ainda. Ao adicionar uma despesa, marque a opção "Recorrente Mensal".
          </Text>
        </View>
      ) : (
        subsList.map((item, idx) => {
          const itemHours = hourlyRate > 0 ? (item.amount || 0) / hourlyRate : 0;
          return (
            <View key={idx} style={[styles.itemCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
              <View style={[styles.emojiBg, { backgroundColor: activeTheme.border }]}>
                <Text style={{ fontSize: 20 }}>{getCategoryEmoji(item.category)}</Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemDesc, { color: activeTheme.text }]}>{item.description}</Text>
                <Text style={{ color: activeTheme.muted, fontSize: 12 }}>{item.category} • Recorrente Mensal</Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.itemAmount, { color: activeTheme.text }]}>{formatMoney(item.amount)}</Text>
                {hourlyRate > 0 && showValues && (
                  <Text style={{ color: activeTheme.primaryLight, fontSize: 11, fontWeight: 'bold' }}>
                    ⏱️ {itemHours < 1 ? `${Math.round(itemHours * 60)} min` : `${itemHours.toFixed(1)}h`}/mês
                  </Text>
                )}
                <TouchableOpacity onPress={() => item.id && deleteTransaction(item.id, onRefresh)} style={{ marginTop: 4 }}>
                  <Feather name="trash-2" size={14} color={activeTheme.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 25 },
  subtitle: { fontSize: 13, marginBottom: 18 },
  summaryCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  monthlyValue: { fontSize: 28, fontWeight: '800' },
  annualValue: { fontSize: 20, fontWeight: '800' },
  hoursNotice: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginTop: 10, gap: 8 },
  hoursNoticeText: { fontSize: 12, flex: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  emptyCard: { padding: 30, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  emojiBg: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemDesc: { fontWeight: '700', fontSize: 15 },
  itemAmount: { fontWeight: '800', fontSize: 15 },
});