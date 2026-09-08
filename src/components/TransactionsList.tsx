import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, TextInput, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Transaction, addTransaction, deleteTransaction, updateTransaction } from '../database/db';
import { CATEGORIES, getCategoryEmoji } from '../constants/categories';
import MarketCalculatorRaw from './MarketCalculator';

const MarketCalculatorComponent: any =
  typeof MarketCalculatorRaw === 'function'
    ? MarketCalculatorRaw
    : (MarketCalculatorRaw as any)?.default || (MarketCalculatorRaw as any)?.MarketCalculator;

interface ListProps {
  transactions: Transaction[];
  onRefresh: () => void;
  showValues: boolean;
  monthName: string;
  onNextMonth: () => void;
  onPrevMonth: () => void;
  onExport: () => void;
  theme?: any;
  hourlyRate?: number;
}

const addMonths = (dateStr: string, months: number) => {
  try {
    const parts = (dateStr || '').split('/');
    if (parts.length !== 3) {
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      return d.toLocaleDateString('pt-BR');
    }
    const d = Number(parts[0]);
    const m = Number(parts[1]);
    const y = Number(parts[2]);
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return new Date().toLocaleDateString('pt-BR');
  }
};

export default function TransactionsList({
  transactions = [],
  onRefresh,
  showValues = true,
  monthName = '',
  onNextMonth,
  onPrevMonth,
  onExport,
  theme,
  hourlyRate = 0,
}: ListProps) {
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

  const [marketModalVisible, setMarketModalVisible] = useState(false);

  const displayTxs = (transactions || []).filter((t) => t && t.category !== 'META_SISTEMA');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');

  const filteredTxs = displayTxs.filter((tx) => {
    const desc = (tx.description || '').toLowerCase();
    const matchesSearch = desc.includes((searchQuery || '').toLowerCase());
    const matchesCategory = filterCategory === 'Todas' || tx.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedData = filteredTxs.reduce((acc, tx) => {
    const key = tx.date || 'Sem data';
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const sections = Object.keys(groupedData || {}).map((date) => {
    const today = new Date().toLocaleDateString('pt-BR');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR');
    let title = date;
    if (date === today) title = 'Hoje';
    else if (date === yesterday) title = 'Ontem';
    return { title, data: groupedData[date] };
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Outros');
  const [date, setDate] = useState(new Date().toLocaleDateString('pt-BR'));
  const [installments, setInstallments] = useState('1');
  const [recurring, setRecurring] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setType('expense');
    setCategory('Outros');
    setDate(new Date().toLocaleDateString('pt-BR'));
    setInstallments('1');
    setRecurring(false);
    setModalVisible(true);
  };

  const openEdit = (item: Transaction) => {
    setEditingId(item.id || null);
    setDescription(item.description || '');
    setAmount(String(item.amount ?? ''));
    setType(item.type || 'expense');
    setCategory(item.category === 'Receita' ? 'Outros' : item.category || 'Outros');
    setDate(item.date || new Date().toLocaleDateString('pt-BR'));
    setInstallments(String(item.installment_total || 1));
    setRecurring(!!item.recurring);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!description || !amount) return;

    const parsedAmount = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(parsedAmount)) return;

    const totalInstallments = Math.max(1, parseInt(installments || '1', 10) || 1);
    const finalCategory = type === 'income' ? 'Receita' : category;
    const baseDate = date || new Date().toLocaleDateString('pt-BR');

    if (editingId) {
      updateTransaction(
        {
          id: editingId,
          description,
          amount: parsedAmount,
          type,
          category: finalCategory,
          date: baseDate,
          installment_total: totalInstallments,
          installment_current: 1,
          recurring: recurring ? 1 : 0,
        },
        () => onRefresh()
      );
      setModalVisible(false);
      return;
    }

    for (let i = 0; i < totalInstallments; i++) {
      const desc = totalInstallments > 1 ? `${description} (${i + 1}/${totalInstallments})` : description;
      addTransaction({
        description: desc,
        amount: parsedAmount,
        type,
        category: finalCategory,
        date: addMonths(baseDate, i),
        installment_total: totalInstallments,
        installment_current: i + 1,
        recurring: recurring ? 1 : 0,
      });
    }

    if (recurring && totalInstallments <= 1) {
      for (let i = 1; i <= 5; i++) {
        addTransaction({
          description,
          amount: parsedAmount,
          type,
          category: finalCategory,
          date: addMonths(baseDate, i),
          installment_total: 1,
          installment_current: 1,
          recurring: 1,
        });
      }
    }

    setModalVisible(false);
    onRefresh();
  };

  const handleDelete = (id: number) => {
    deleteTransaction(id, () => onRefresh());
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: activeTheme.text }]}>Transações</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          
          <TouchableOpacity onPress={() => setMarketModalVisible(true)} style={[styles.iconBtn, { backgroundColor: activeTheme.card, borderColor: activeTheme.primary }]}>
            <Text style={{ fontSize: 16 }}>🛒</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onExport} style={[styles.iconBtn, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
            <Feather name="download" size={20} color={activeTheme.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: activeTheme.primary }]} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ Nova</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.monthNav, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.monthBtn}>
          <Feather name="chevron-left" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: activeTheme.text }]}>{monthName}</Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.monthBtn}>
          <Feather name="chevron-right" size={24} color={activeTheme.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <Feather name="search" size={20} color={activeTheme.muted2} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: activeTheme.text }]}
          placeholder="Buscar transação..."
          placeholderTextColor={activeTheme.muted2}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ height: 40, marginBottom: 15 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Todas', 'Receita', ...CATEGORIES].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                { backgroundColor: activeTheme.card, borderColor: activeTheme.border },
                filterCategory === cat && { backgroundColor: activeTheme.primary, borderColor: activeTheme.primary },
              ]}
              onPress={() => setFilterCategory(cat)}
            >
              <Text style={{ color: filterCategory === cat ? '#fff' : activeTheme.muted, fontSize: 13, fontWeight: '600' }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `tx-${index}`)}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionHeader, { color: activeTheme.primarySoft }]}>{title}</Text>
        )}
        renderItem={({ item }) => {
          const itemVal = Number(item.amount || 0);
          const isExpense = item.type === 'expense';
          const itemHours = hourlyRate > 0 && isExpense ? itemVal / hourlyRate : 0;

          return (
            <TouchableOpacity
              onPress={() => openEdit(item)}
              style={[styles.itemCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}
            >
              <View style={[styles.emojiContainer, { backgroundColor: activeTheme.border }]}>
                <Text style={{ fontSize: 20 }}>{getCategoryEmoji(item.category)}</Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemDesc, { color: activeTheme.text }]}>{item.description}</Text>
                <Text style={{ color: activeTheme.muted2, fontSize: 12, marginTop: 4 }}>
                  {item.category}
                  {item.installment_total && item.installment_total > 1
                    ? ` • ${item.installment_current}/${item.installment_total}`
                    : ''}
                  {item.recurring ? ' • Recorrente' : ''}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontWeight: '800',
                      fontSize: 15,
                      color: showValues ? (item.type === 'income' ? activeTheme.success : activeTheme.danger) : activeTheme.text,
                    }}
                  >
                    {showValues ? (item.type === 'income' ? '+' : '-') : ''}{' '}
                    {showValues ? `R$ ${itemVal.toFixed(2)}` : 'R$ •••••'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => item.id && handleDelete(item.id)}
                    style={{ padding: 4, marginLeft: 8 }}
                  >
                    <Feather name="trash-2" size={16} color={activeTheme.danger} />
                  </TouchableOpacity>
                </View>

                {isExpense && hourlyRate > 0 && showValues && (
                  <Text style={{ color: activeTheme.primaryLight, fontSize: 11, fontWeight: '700', marginTop: 3 }}>
                    ⏱️ {itemHours < 1 ? `${Math.round(itemHours * 60)} min` : `${itemHours.toFixed(1)}h trabalho`}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={{ color: activeTheme.muted, textAlign: 'center', marginTop: 40 }}>
            Nenhum registro encontrado.
          </Text>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View style={[styles.modalBody, { backgroundColor: activeTheme.card, borderColor: activeTheme.primary }]}>
              <Text style={[styles.modalTitle, { color: activeTheme.text }]}>
                {editingId ? 'Editar Transação' : 'Nova Transação'}
              </Text>

              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { borderColor: activeTheme.border },
                    type === 'expense' && { backgroundColor: activeTheme.danger, borderColor: activeTheme.danger },
                  ]}
                  onPress={() => setType('expense')}
                >
                  <Text style={{ color: type === 'expense' ? '#fff' : activeTheme.muted, fontWeight: 'bold' }}>Despesa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { borderColor: activeTheme.border },
                    type === 'income' && { backgroundColor: activeTheme.success, borderColor: activeTheme.success },
                  ]}
                  onPress={() => setType('income')}
                >
                  <Text style={{ color: type === 'income' ? '#fff' : activeTheme.muted, fontWeight: 'bold' }}>Receita</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border }]}
                placeholder="Descrição"
                placeholderTextColor={activeTheme.muted2}
                value={description}
                onChangeText={setDescription}
              />
              <TextInput
                style={[styles.input, { backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border }]}
                placeholder="Valor"
                placeholderTextColor={activeTheme.muted2}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
              <TextInput
                style={[styles.input, { backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border }]}
                placeholder="Data (dd/mm/aaaa)"
                placeholderTextColor={activeTheme.muted2}
                value={date}
                onChangeText={setDate}
              />

              {type === 'expense' && (
                <View>
                  <Text style={{ color: activeTheme.muted, fontSize: 12, marginBottom: 5 }}>Categoria:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catBtn,
                          { borderColor: activeTheme.border },
                          category === cat && { backgroundColor: activeTheme.primary, borderColor: activeTheme.primary },
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={{ color: category === cat ? '#fff' : activeTheme.muted, fontSize: 12 }}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {!editingId && (
                <>
                  <Text style={{ color: activeTheme.muted, fontSize: 12, marginBottom: 5 }}>Parcelas (ex: 6)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border }]}
                    keyboardType="numeric"
                    value={installments}
                    onChangeText={setInstallments}
                    placeholder="1"
                    placeholderTextColor={activeTheme.muted2}
                  />

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ color: activeTheme.text, fontWeight: '700' }}>Recorrente mensal</Text>
                      <Text style={{ color: activeTheme.muted, fontSize: 12 }}>Cria nos próximos meses</Text>
                    </View>
                    <Switch
                      value={recurring}
                      onValueChange={setRecurring}
                      trackColor={{ false: '#333', true: activeTheme.primaryLight }}
                      thumbColor={recurring ? activeTheme.primary : '#f4f3f4'}
                    />
                  </View>
                </>
              )}

              <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: activeTheme.muted, fontWeight: 'bold' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: activeTheme.primary }]} onPress={handleSave}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

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

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold' },
  iconBtn: { padding: 8, borderRadius: 8, borderWidth: 1, marginRight: 10 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 15 },
  monthText: { fontSize: 16, fontWeight: 'bold' },
  monthBtn: { paddingHorizontal: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, height: 44, fontSize: 15 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8, height: 35, justifyContent: 'center' },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 10, marginBottom: 8, letterSpacing: 1 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  emojiContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemDesc: { fontWeight: 'bold', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', padding: 20 },
  modalBody: { padding: 20, borderRadius: 16, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  typeBtn: { flex: 0.48, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { padding: 12, marginRight: 15 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
});