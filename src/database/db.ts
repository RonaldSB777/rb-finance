import * as SQLite from 'expo-sqlite';

export interface Transaction {
  id?: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  installment_total?: number;
  installment_current?: number;
  recurring?: number;
}

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) {
    db = SQLite.openDatabaseSync('rbfinance.db');
  }
  return db;
};

export const initDatabase = () => {
  try {
    const database = getDb();
    
    // Criação segura das tabelas
    database.execSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        installment_total INTEGER DEFAULT 1,
        installment_current INTEGER DEFAULT 1,
        recurring INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Migrações seguras
    try { database.execSync(`ALTER TABLE transactions ADD COLUMN installment_total INTEGER DEFAULT 1;`); } catch (e) {}
    try { database.execSync(`ALTER TABLE transactions ADD COLUMN installment_current INTEGER DEFAULT 1;`); } catch (e) {}
    try { database.execSync(`ALTER TABLE transactions ADD COLUMN recurring INTEGER DEFAULT 0;`); } catch (e) {}

  } catch (e) {
    console.log('Erro initDatabase:', e);
  }
};

export const addTransaction = (t: Transaction, callback?: () => void) => {
  try {
    const database = getDb();
    try {
      database.runSync(
        `INSERT INTO transactions 
        (description, amount, type, category, date, installment_total, installment_current, recurring) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          t.description || 'Sem descrição',
          t.amount || 0,
          t.type || 'expense',
          t.category || 'Outros',
          t.date || new Date().toLocaleDateString('pt-BR'),
          t.installment_total ?? 1,
          t.installment_current ?? 1,
          t.recurring ?? 0
        ]
      );
    } catch (err) {
      // Fallback de segurança se a estrutura antiga estiver na memória
      database.runSync(
        `INSERT INTO transactions (description, amount, type, category, date) VALUES (?, ?, ?, ?, ?);`,
        [
          t.description || 'Sem descrição',
          t.amount || 0,
          t.type || 'expense',
          t.category || 'Outros',
          t.date || new Date().toLocaleDateString('pt-BR')
        ]
      );
    }
    if (callback) callback();
  } catch (e) {
    console.log('Erro ao adicionar transação:', e);
  }
};

export const updateTransaction = (t: Transaction, callback?: () => void) => {
  try {
    if (!t.id) return;
    const database = getDb();
    try {
      database.runSync(
        `UPDATE transactions 
         SET description = ?, amount = ?, type = ?, category = ?, date = ?, 
             installment_total = ?, installment_current = ?, recurring = ?
         WHERE id = ?;`,
        [
          t.description,
          t.amount,
          t.type,
          t.category,
          t.date,
          t.installment_total ?? 1,
          t.installment_current ?? 1,
          t.recurring ?? 0,
          t.id
        ]
      );
    } catch (err) {
      database.runSync(
        `UPDATE transactions SET description = ?, amount = ?, type = ?, category = ?, date = ? WHERE id = ?;`,
        [t.description, t.amount, t.type, t.category, t.date, t.id]
      );
    }
    if (callback) callback();
  } catch (e) {
    console.log('Erro ao atualizar transação:', e);
  }
};

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const database = getDb();
    const results = database.getAllSync('SELECT * FROM transactions ORDER BY id DESC;') as Transaction[];
    return results || [];
  } catch (e) {
    console.log('Erro ao buscar transações:', e);
    return [];
  }
};

export const deleteTransaction = (id: number, callback?: () => void) => {
  try {
    const database = getDb();
    database.runSync('DELETE FROM transactions WHERE id = ?;', [id]);
    if (callback) callback();
  } catch (e) {
    console.log('Erro ao deletar transação:', e);
  }
};

export const clearAllData = (callback?: () => void) => {
  try {
    const database = getDb();
    database.runSync('DELETE FROM transactions;');
    database.runSync('DELETE FROM settings;');
    if (callback) callback();
  } catch (e) {
    console.log('Erro ao limpar dados:', e);
  }
};

export const getSetting = (key: string, defaultValue: string = ''): string => {
  try {
    const database = getDb();
    const rows = database.getAllSync('SELECT value FROM settings WHERE key = ?;', [key]) as any[];
    if (rows && rows.length > 0 && rows[0] && rows[0].value !== undefined) {
      return String(rows[0].value);
    }
  } catch (e) {
    console.log('Erro getSetting:', e);
  }
  return defaultValue;
};

export const setSetting = (key: string, value: string) => {
  try {
    const database = getDb();
    database.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [key, String(value)]);
  } catch (e) {
    console.log('Erro setSetting:', e);
  }
};