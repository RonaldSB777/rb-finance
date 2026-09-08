import { addTransaction } from '../database/db';

// Categorização automática por palavras-chave na notificação
const detectCategory = (title: string, text: string, type: 'income' | 'expense'): string => {
  if (type === 'income') return 'Receita';

  const content = `${title} ${text}`.toLowerCase();

  // Transporte
  if (
    content.includes('uber') || content.includes('99') || content.includes('gasolina') ||
    content.includes('posto') || content.includes('estacionamento') || content.includes('pedágio') ||
    content.includes('pedagio') || content.includes('sem parar') || content.includes('veloe')
  ) return 'Transporte';

  // Alimentação
  if (
    content.includes('ifood') || content.includes('rappi') || content.includes('restaurante') ||
    content.includes('mercado') || content.includes('padaria') || content.includes('supermercado') ||
    content.includes('burger') || content.includes('pizza') || content.includes('mcdonald') ||
    content.includes('outback') || content.includes('carrefour') || content.includes('atacadao') ||
    content.includes('assai') || content.includes('pao de acucar')
  ) return 'Alimentação';

  // Lazer
  if (
    content.includes('netflix') || content.includes('spotify') || content.includes('steam') ||
    content.includes('cinema') || content.includes('disney') || content.includes('prime video') ||
    content.includes('jogo') || content.includes('playstation') || content.includes('xbox') ||
    content.includes('ingressos') || content.includes('sympla')
  ) return 'Lazer';

  // Saúde
  if (
    content.includes('farmácia') || content.includes('farmacia') || content.includes('drogaria') ||
    content.includes('hospital') || content.includes('clínica') || content.includes('clinica') ||
    content.includes('dentista') || content.includes('pague menos') || content.includes('drogasil') ||
    content.includes('raia')
  ) return 'Saúde';

  return 'Outros';
};

export const handleIncomingNotification = (rawTitle?: string, rawText?: string) => {
  const title = String(rawTitle || '').trim();
  const text = String(rawText || '').trim();

  if (!title && !text) return;

  const content = `${title} ${text}`.toLowerCase();

  // 1. Filtro: Verifica se é uma notificação financeira (Bancos, Cartões, Pix)
  const isFinancial =
    content.includes('r$') ||
    content.includes('pix') ||
    content.includes('compra') ||
    content.includes('pagamento') ||
    content.includes('aprovad') ||
    content.includes('transferencia') ||
    content.includes('transferência') ||
    content.includes('debito') ||
    content.includes('débito') ||
    content.includes('credito') ||
    content.includes('crédito') ||
    content.includes('cartao') ||
    content.includes('cartão') ||
    content.includes('recebeu') ||
    content.includes('enviado') ||
    content.includes('estorno') ||
    content.includes('reembolso');

  if (!isFinancial) return;

  try {
    // 2. Extrai o Valor (Ex: R$ 45,90 ou R$150,00)
    const valueMatch = text.match(/R\$\s*([\d.,]+)/i) || title.match(/R\$\s*([\d.,]+)/i);
    if (!valueMatch) return;

    let cleanValue = valueMatch[1].replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(cleanValue);
    if (isNaN(amount) || amount <= 0) return;

    // 3. Determina se é Entrada (Receita) ou Saída (Despesa)
    const isIncome =
      content.includes('recebeu') ||
      content.includes('pix recebido') ||
      content.includes('transferência recebida') ||
      content.includes('transferencia recebida') ||
      content.includes('depósito') ||
      content.includes('deposito') ||
      content.includes('reembolso') ||
      content.includes('estorno') ||
      content.includes('cashback');

    const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';

    // 4. Extrai o nome da loja, pessoa do Pix ou estabelecimento
    let description = isIncome ? 'Pix Recebido' : 'Compra Cartão';

    const locationMatch = text.match(/(?:em|no|na)\s+([^.,\n]+)/i);
    const fromMatch = text.match(/(?:de)\s+([^.,\n]+)/i);
    const toMatch = text.match(/(?:para)\s+([^.,\n]+)/i);

    if (isIncome && fromMatch && fromMatch[1]) {
      description = `Pix de ${fromMatch[1].trim()}`;
    } else if (!isIncome && toMatch && toMatch[1]) {
      description = `Pix para ${toMatch[1].trim()}`;
    } else if (locationMatch && locationMatch[1]) {
      description = locationMatch[1].trim();
    } else if (title) {
      description = title.length > 25 ? title.substring(0, 25) + '...' : title;
    }

    // 5. Categoria automática
    const category = detectCategory(title, text, type);

    // 6. Salva no banco de dados local do celular
    addTransaction({
      description: description,
      amount: amount,
      type: type,
      category: category,
      date: new Date().toLocaleDateString('pt-BR'),
      installment_total: 1,
      installment_current: 1,
      recurring: 0,
    });

    console.log(`[RB Finance Auto] Capturado: ${type.toUpperCase()} - R$ ${amount} (${description})`);

  } catch (error) {
    console.log('Erro ao processar notificação bancária:', error);
  }
};