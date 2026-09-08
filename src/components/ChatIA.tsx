import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Transaction } from '../database/db';

interface ChatIAProps {
  transactions: Transaction[];
  theme?: any;
  showValues: boolean;
  salary: number;
  hourlyRate: number;
  monthName: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
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
  inputBg: '#000000',
};

export default function ChatIA({
  transactions = [],
  theme,
  showValues = true,
  salary = 0,
  hourlyRate = 0,
  monthName = '',
}: ChatIAProps) {
  const activeTheme = theme?.bg ? theme : DEFAULT_THEME;

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Olá! Sou a IA do RB Finance 🤖. Posso analisar seus gastos, dizer se você pode fazer uma compra ou dar dicas para economizar. O que gostaria de saber hoje?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const processAIResponse = (userQuestion: string): string => {
    const query = userQuestion.toLowerCase().trim();
    const regularTxs = (transactions || []).filter((t) => t && t.category !== 'META_SISTEMA');
    const metaTx = (transactions || []).find((t) => t && t.category === 'META_SISTEMA');

    const totalIncome = regularTxs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = regularTxs.filter((t) => t.type === 'expense');
    const totalExpense = expenses.reduce((s, t) => s + (t.amount || 0), 0);
    const balance = totalIncome - totalExpense;
    const metaValue = metaTx ? metaTx.amount : 0;

    if (query.includes('posso comprar') || query.includes('comprar') || query.includes('gastar')) {
      const matchValue = query.match(/(\d+[\d.,]*)/);
      if (matchValue) {
        const val = parseFloat(matchValue[1].replace(',', '.'));
        if (!isNaN(val)) {
          const workHoursNeeded = hourlyRate > 0 ? val / hourlyRate : 0;
          const remainingMeta = metaValue > 0 ? metaValue - totalExpense : balance;

          let advice = `🛒 **Análise da compra de R$ ${val.toFixed(2)}:**\n\n`;
          
          if (hourlyRate > 0) {
            advice += `⏱️ **Tempo de vida:** Essa compra vai te custar **${workHoursNeeded < 1 ? Math.round(workHoursNeeded * 60) + ' minutos' : workHoursNeeded.toFixed(1) + ' horas'} de trabalho**.\n\n`;
          }

          if (val > remainingMeta && remainingMeta > 0) {
            advice += `⚠️ **Aviso:** Se você comprar isso agora, vai **ultrapassar seu orçamento disponível** em R$ ${(val - remainingMeta).toFixed(2)}. Recomendo esperar o próximo mês!`;
          } else {
            advice += `✅ **Veredito:** O valor cabe no seu saldo atual! Se for algo necessário, pode comprar. Caso seja por impulso, espere 24h antes de decidir.`;
          }
          return advice;
        }
      }
      return 'Para eu analisar uma compra, me diga o valor! Exemplo: "Posso comprar um tênis de R$ 250?"';
    }

    if (query.includes('alimenta') || query.includes('comida') || query.includes('mercado') || query.includes('lanche')) {
      const foodSpent = expenses.filter((t) => t.category === 'Alimentação').reduce((s, t) => s + t.amount, 0);
      const pct = totalExpense > 0 ? (foodSpent / totalExpense) * 100 : 0;
      return `🍔 **Alimentação em ${monthName}:**\n\nVocê já gastou **R$ ${foodSpent.toFixed(2)}** com comida. Isso representa **${pct.toFixed(1)}% de todas as suas despesas** do mês.`;
    }

    if (query.includes('transporte') || query.includes('uber') || query.includes('gasolina')) {
      const transSpent = expenses.filter((t) => t.category === 'Transporte').reduce((s, t) => s + t.amount, 0);
      return `🚗 **Transporte em ${monthName}:**\n\nSeus gastos com locomoção/combustível somam **R$ ${transSpent.toFixed(2)}** este mês.`;
    }

    if (query.includes('lazer') || query.includes('cinema') || query.includes('jogo')) {
      const lazerSpent = expenses.filter((t) => t.category === 'Lazer').reduce((s, t) => s + t.amount, 0);
      return `🎮 **Lazer e Entretenimento:**\n\nVocê gastou **R$ ${lazerSpent.toFixed(2)}** com lazer no mês de ${monthName}.`;
    }

    if (query.includes('maior') || query.includes('mais caro') || query.includes('pico')) {
      if (expenses.length === 0) return 'Você ainda não registrou nenhuma despesa este mês.';
      const biggest = expenses.reduce((p, c) => (p.amount > c.amount ? p : c));
      const hours = hourlyRate > 0 ? biggest.amount / hourlyRate : 0;
      return `🔝 **Sua maior despesa em ${monthName}:**\n\nItem: **${biggest.description}**\nValor: **R$ ${biggest.amount.toFixed(2)}**\nCategoria: ${biggest.category}\nData: ${biggest.date}${hourlyRate > 0 ? `\n⏱️ Te custou **${hours.toFixed(1)}h de trabalho**.` : ''}`;
    }

    if (query.includes('resumo') || query.includes('balan') || query.includes('como estou') || query.includes('saúde') || query.includes('saude')) {
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
      let diagnosis = `📊 **Diagnóstico Financeiro - ${monthName}:**\n\n`;
      diagnosis += `• Entradas: R$ ${totalIncome.toFixed(2)}\n`;
      diagnosis += `• Saídas: R$ ${totalExpense.toFixed(2)}\n`;
      diagnosis += `• Saldo Atual: R$ ${balance.toFixed(2)}\n\n`;

      if (savingsRate >= 20) {
        diagnosis += `🏆 **Excelente!** Você está economizando ${savingsRate.toFixed(0)}% da sua renda. Continue assim!`;
      } else if (balance >= 0) {
        diagnosis += `🟡 **Atenção:** Suas contas estão em dia, mas você está guardando menos de 20% do que ganha. Tente cortar pequenos gastos dispensáveis.`;
      } else {
        diagnosis += `🚨 **Alerta Vermelho:** Suas despesas superaram suas receitas em R$ ${Math.abs(balance).toFixed(2)}. Evite novas compras este mês!`;
      }
      return diagnosis;
    }

    if (query.includes('dica') || query.includes('economizar') || query.includes('conselho') || query.includes('ajuda')) {
      return `💡 **3 Dicas de Ouro para o seu mês:**\n\n1. **Regra das 24 Horas:** Quando quiser comprar algo não essencial, espere 24h. Na maioria das vezes a vontade passa.\n2. **Acompanhe as Pequenas Compras:** Gastos de R$ 10 a R$ 20 por dia somam R$ 300 a R$ 600 no fim do mês sem você perceber.\n3. **Analise pelo Custo em Horas:** Antes de comprar, pense em quantas horas de trabalho aquele produto custa!`;
    }

    if (
      query.includes('futebol') || query.includes('receita') || query.includes('jogo') ||
      query.includes('tempo') || query.includes('clima') || query.includes('piada')
    ) {
      return `🤖 Sou o assistente exclusivo do **RB Finance**. Meu foco é cuidar do seu dinheiro, orçamentos e compras. Como posso te ajudar com suas finanças hoje?`;
    }

    return `🤖 Posso te ajudar a analisar suas finanças! Experimente me perguntar:\n\n• *"Resumo do meu mês"* \n• *"Quanto gastei com alimentação?"*\n• *"Qual foi meu maior gasto?"*\n• *"Posso comprar algo de R$ 200?"*\n• *"Dicas para economizar"*`;
  };

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiText = processAIResponse(query);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: aiText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [aiMsg, userMsg, ...prev]);
    setInput('');
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: activeTheme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <View style={[styles.aiAvatar, { backgroundColor: activeTheme.primary }]}>
          <Text style={{ fontSize: 20 }}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.aiTitle, { color: activeTheme.text }]}>IA Consultor Financeiro</Text>
          <Text style={{ color: activeTheme.success, fontSize: 12, fontWeight: 'bold' }}>● Módulo Inteligente Ativo (Local)</Text>
        </View>
      </View>

      <View style={{ height: 42, marginVertical: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <TouchableOpacity style={[styles.chip, { backgroundColor: activeTheme.card, borderColor: activeTheme.primary }]} onPress={() => handleSend('Resumo do meu mês')}>
            <Text style={{ color: activeTheme.text, fontSize: 12, fontWeight: 'bold' }}>📊 Resumo do Mês</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]} onPress={() => handleSend('Quanto gastei com alimentação?')}>
            <Text style={{ color: activeTheme.text, fontSize: 12 }}>🍔 Comida / Mercado</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]} onPress={() => handleSend('Qual foi meu maior gasto?')}>
            <Text style={{ color: activeTheme.text, fontSize: 12 }}>🔝 Maior Gasto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]} onPress={() => handleSend('Dicas para economizar')}>
            <Text style={{ color: activeTheme.text, fontSize: 12 }}>💡 Dicas de Economia</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
          return (
            <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
              <View
                style={[
                  styles.bubble,
                  isUser
                    ? { backgroundColor: activeTheme.primary }
                    : { backgroundColor: activeTheme.card, borderColor: activeTheme.border, borderWidth: 1 },
                ]}
              >
                <Text style={{ color: '#ffffff', fontSize: 14, lineHeight: 20 }}>{item.text}</Text>
                <Text style={[styles.timeText, { color: isUser ? '#e9d5ff' : activeTheme.muted }]}>{item.time}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.inputRow, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <TextInput
          style={[styles.input, { color: activeTheme.text }]}
          placeholder="Pergunte algo sobre suas finanças..."
          placeholderTextColor={activeTheme.muted2}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: activeTheme.primary }]} onPress={() => handleSend()}>
          <Feather name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, marginTop: 10, gap: 12 },
  aiAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  aiTitle: { fontSize: 16, fontWeight: '800' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8, justifyContent: 'center' },
  bubbleWrapper: { marginVertical: 6, maxWidth: '85%' },
  userWrapper: { alignSelf: 'flex-end' },
  aiWrapper: { alignSelf: 'flex-start' },
  bubble: { padding: 14, borderRadius: 16 },
  timeText: { fontSize: 10, marginTop: 6, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, height: 44, paddingHorizontal: 12, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});