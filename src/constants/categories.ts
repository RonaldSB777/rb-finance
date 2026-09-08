export const CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros'] as const;

export const CATEGORY_EMOJIS: Record<string, string> = {
  'Alimentação': '🍔',
  'Transporte': '🚗',
  'Lazer': '🎮',
  'Saúde': '🏥',
  'Receita': '💰',
  'Outros': '📦',
  'Automático': '🤖',
};

export const getCategoryEmoji = (category: string): string => {
  return CATEGORY_EMOJIS[category] || '📦';
};