export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  date: string;
}

export interface Balance {
  person: string;
  balance: number;
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}

export interface ExpenseData {
  expenses: Expense[];
  friends: string[];
}
