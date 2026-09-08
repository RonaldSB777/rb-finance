import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { addTransaction } from '../database/db';

interface MarketItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface MarketCalculatorProps {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
  theme?: any;
  showValues?: boolean;
  hourlyRate?: number;
}

const DEFAULT_THEME = {
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

export function MarketCalculator({
  visible,
  onClose,
  onRefresh,
  theme,
  showValues = true,
  hourlyRate = 0,
}: MarketCalculatorProps) {
  const activeTheme = theme?.bg ? theme : DEFAULT_THEME;

  const [items, setItems] = useState<MarketItem[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [budgetInput, setBudgetInput] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItemsCount = items.reduce((sum, item) => sum + item.qty, 0);
  const marketBudget = parseFloat(budgetInput.replace(',', '.')) || 0;
  const budgetPercent = marketBudget > 0 ? (totalAmount / marketBudget) * 100 : 0;
  const workHours = hourlyRate > 0 ? totalAmount / hourlyRate : 0;

  let statusColor = activeTheme.success;
  if (budgetPercent >= 80) statusColor = activeTheme.warning;
  if (budgetPercent >= 100) statusColor = activeTheme.danger;

  const handleAddItem = () => {
    const price = parseFloat(priceInput.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      Alert.alert('Valor inválido', 'Digite o preço do produto.');
      return;
    }

    const qty = parseInt(qtyInput || '1', 10) || 1;
    const name = nameInput.trim() || `Item ${items.length + 1}`;

    const newItem: MarketItem = {
      id: Date.now().toString(),
      name,
      price,
      qty,
    };

    setItems([newItem, ...items]);
    setNameInput('');
    setPriceInput('');
    setQtyInput('1');
  };

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as MarketItem[]
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    Alert.alert('Limpar Carrinho?', 'Deseja remover todos os itens da lista?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim, Limpar', style: 'destructive', onPress: () => setItems([]) },
    ]);
  };

  const handleFinishShopping = () => {
    if (totalAmount <= 0) {
      Alert.alert('Carrinho Vazio', 'Adicione itens antes de finalizar.');
      return;
    }

    Alert.alert(
      'Finalizar Compra? 🛒',
      `Total: R$ ${totalAmount.toFixed(2)} (${totalItemsCount} itens)\n\nDeseja registrar essa compra no seu extrato de Despesas?`,
      [
        { text: 'Apenas Fechar', style: 'cancel', onPress: onClose },
        {
          text: 'Salvar no Extrato',
          onPress: () => {
            addTransaction(
              {
                description: `Mercado/Feira (${totalItemsCount} itens)`,
                amount: totalAmount,
                type: 'expense',
                category: 'Alimentação',
                date: new Date().toLocaleDateString('pt-BR'),
              },
              () => {
                setItems([]);
                onRefresh();
                onClose();
                Alert.alert('Sucesso 🎉', 'Compra salva no seu extrato com sucesso!');
              }
            );
          },
        },
      ]
    );
  };

  const formatMoney = (val: number) => (showValues ? `R$ ${val.toFixed(2)}` : 'R$ •••••');

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: activeTheme.bg }]}>
        <View style={[styles.header, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 24 }}>🛒</Text>
            <View>
              <Text style={[styles.headerTitle, { color: activeTheme.text }]}>Calculadora de Feira</Text>
              <Text style={{ color: activeTheme.muted, fontSize: 12 }}>Evite surpresas na hora do caixa</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: activeTheme.border }]}>
            <Feather name="x" size={22} color={activeTheme.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.totalPanel, { backgroundColor: activeTheme.card, borderColor: statusColor }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={[styles.panelLabel, { color: activeTheme.primarySoft }]}>TOTAL DO CARRINHO</Text>
              <Text style={[styles.totalText, { color: activeTheme.text }]}>{formatMoney(totalAmount)}</Text>
              <Text style={{ color: activeTheme.muted, fontSize: 13 }}>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'} no carrinho</Text>
            </View>

            <TouchableOpacity onPress={() => setIsEditingBudget(!isEditingBudget)} style={[styles.budgetChip, { borderColor: activeTheme.border }]}>
              <Feather name="target" size={14} color={activeTheme.primaryLight} />
              <Text style={{ color: activeTheme.primaryLight, fontSize: 12, fontWeight: 'bold' }}>
                {marketBudget > 0 ? `Limite: R$ ${marketBudget.toFixed(0)}` : '+ Definir Limite'}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingBudget && (
            <View style={styles.budgetInputRow}>
              <Text style={{ color: activeTheme.text, fontWeight: 'bold' }}>Limite R$: </Text>
              <TextInput
                style={[styles.budgetInput, { color: activeTheme.text, borderColor: activeTheme.primary }]}
                keyboardType="numeric"
                placeholder="Ex: 250"
                placeholderTextColor={activeTheme.muted2}
                value={budgetInput}
                onChangeText={setBudgetInput}
                autoFocus
              />
              <TouchableOpacity onPress={() => setIsEditingBudget(false)} style={[styles.saveBudgetBtn, { backgroundColor: activeTheme.primary }]}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>OK</Text>
              </TouchableOpacity>
            </View>
          )}

          {marketBudget > 0 && (
            <View style={{ marginTop: 12 }}>
              <View style={[styles.progressBg, { backgroundColor: activeTheme.border }]}>
                <View style={[styles.progressFill, { width: `${Math.min(budgetPercent, 100)}%`, backgroundColor: statusColor }]} />
              </View>

              {budgetPercent >= 100 ? (
                <Text style={{ color: activeTheme.danger, fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
                  ❌ Limite da feira estourado em R$ {(totalAmount - marketBudget).toFixed(2)}!
                </Text>
              ) : budgetPercent >= 80 ? (
                <Text style={{ color: activeTheme.warning, fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
                  ⚠️ Faltam apenas R$ {(marketBudget - totalAmount).toFixed(2)} para seu limite!
                </Text>
              ) : null}
            </View>
          )}

          {hourlyRate > 0 && showValues && totalAmount > 0 && (
            <View style={[styles.workBadge, { backgroundColor: activeTheme.border }]}>
              <Feather name="clock" size={14} color={activeTheme.primaryLight} />
              <Text style={{ color: activeTheme.text, fontSize: 12 }}>
                Carrinho = <Text style={{ color: activeTheme.primaryLight, fontWeight: 'bold' }}>{workHours < 1 ? `${Math.round(workHours * 60)} min` : `${workHours.toFixed(1)} horas`} de trabalho</Text>
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.addCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border }]}
            placeholder="Nome do produto (Opcional)"
            placeholderTextColor={activeTheme.muted2}
            value={nameInput}
            onChangeText={setNameInput}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border }]}
              placeholder="Preço R$ (Ex: 12.90)"
              placeholderTextColor={activeTheme.muted2}
              keyboardType="numeric"
              value={priceInput}
              onChangeText={setPriceInput}
            />

            <TextInput
              style={[styles.input, { width: 70, backgroundColor: activeTheme.inputBg, color: activeTheme.text, borderColor: activeTheme.border, textAlign: 'center' }]}
              placeholder="Qtd"
              placeholderTextColor={activeTheme.muted2}
              keyboardType="numeric"
              value={qtyInput}
              onChangeText={setQtyInput}
            />

            <TouchableOpacity style={[styles.addBtn, { backgroundColor: activeTheme.primary }]} onPress={handleAddItem}>
              <Feather name="plus" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: activeTheme.primarySoft, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>ITENS NO CARRINHO</Text>
            {items.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={{ color: activeTheme.danger, fontSize: 12, fontWeight: 'bold' }}>Limpar Carrinho</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.itemRow, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: activeTheme.text }]}>{item.name}</Text>
                  <Text style={{ color: activeTheme.muted, fontSize: 12 }}>
                    R$ {item.price.toFixed(2)} x {item.qty} = <Text style={{ color: activeTheme.text, fontWeight: 'bold' }}>R$ {(item.price * item.qty).toFixed(2)}</Text>
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity onPress={() => updateQty(item.id, -1)} style={[styles.qtyBtn, { backgroundColor: activeTheme.border }]}>
                    <Text style={{ color: activeTheme.text, fontWeight: 'bold' }}>-</Text>
                  </TouchableOpacity>

                  <Text style={{ color: activeTheme.text, fontWeight: 'bold', minWidth: 20, textAlign: 'center' }}>{item.qty}</Text>

                  <TouchableOpacity onPress={() => updateQty(item.id, 1)} style={[styles.qtyBtn, { backgroundColor: activeTheme.border }]}>
                    <Text style={{ color: activeTheme.text, fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => removeItem(item.id)} style={{ padding: 4, marginLeft: 6 }}>
                    <Feather name="trash-2" size={18} color={activeTheme.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Feather name="shopping-bag" size={40} color={activeTheme.muted2} />
                <Text style={{ color: activeTheme.muted, marginTop: 10, textAlign: 'center' }}>
                  Carrinho vazio! Digite o valor do produto acima e toque no botão (+) para somar.
                </Text>
              </View>
            }
          />
        </View>

        <TouchableOpacity style={[styles.finishBtn, { backgroundColor: activeTheme.primary }]} onPress={handleFinishShopping}>
          <Feather name="check-circle" size={20} color="#ffffff" />
          <Text style={styles.finishBtnText}>Finalizar Compras ({formatMoney(totalAmount)})</Text>
        </TouchableOpacity>

      </View>
    </Modal>
  );
}

export default MarketCalculator;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 15 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  totalPanel: { padding: 16, borderRadius: 16, borderWidth: 2, marginBottom: 12 },
  panelLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  totalText: { fontSize: 32, fontWeight: '800', marginTop: 2 },
  budgetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  budgetInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  budgetInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  saveBudgetBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  workBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, marginTop: 10 },
  addCard: { padding: 14, borderRadius: 14, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  addBtn: { width: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  itemName: { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  finishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 14, marginTop: 10 },
  finishBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});