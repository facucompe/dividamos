'use client';

import { useState, useEffect } from 'react';
import type { Expense, ExpenseData, Debt } from '@/types';

export default function Home() {
  const [data, setData] = useState<ExpenseData>({ expenses: [], friends: [] });
  const [loading, setLoading] = useState(true);
  const [newFriend, setNewFriend] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Expense form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/expenses');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newData: ExpenseData) => {
    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
      setData(newData);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data');
    }
  };

  const addFriend = () => {
    if (newFriend.trim() && !data.friends.includes(newFriend.trim())) {
      const updatedData = {
        ...data,
        friends: [...data.friends, newFriend.trim()],
      };
      saveData(updatedData);
      setNewFriend('');
    }
  };

  const addExpense = () => {
    if (!description || !amount || !paidBy || selectedParticipants.length === 0) {
      alert('Please fill all fields');
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      description,
      amount: parseFloat(amount),
      paidBy,
      participants: selectedParticipants,
      date: new Date().toISOString(),
    };

    const updatedData = {
      ...data,
      expenses: [...data.expenses, expense],
    };

    saveData(updatedData);

    // Reset form
    setDescription('');
    setAmount('');
    setPaidBy('');
    setSelectedParticipants([]);
    setShowAddExpense(false);
  };

  const toggleParticipant = (friend: string) => {
    setSelectedParticipants(prev =>
      prev.includes(friend)
        ? prev.filter(p => p !== friend)
        : [...prev, friend]
    );
  };

  const calculateDebts = (): Debt[] => {
    const balances: { [key: string]: number } = {};

    // Initialize balances
    data.friends.forEach(friend => {
      balances[friend] = 0;
    });

    // Calculate balances
    data.expenses.forEach(expense => {
      const sharePerPerson = expense.amount / expense.participants.length;

      // Person who paid gets credited
      balances[expense.paidBy] += expense.amount;

      // All participants get debited
      expense.participants.forEach(participant => {
        balances[participant] -= sharePerPerson;
      });
    });

    // Simplify debts
    const creditors: { person: string; amount: number }[] = [];
    const debtors: { person: string; amount: number }[] = [];

    Object.entries(balances).forEach(([person, balance]) => {
      if (balance > 0.01) {
        creditors.push({ person, amount: balance });
      } else if (balance < -0.01) {
        debtors.push({ person, amount: -balance });
      }
    });

    const debts: Debt[] = [];
    let i = 0, j = 0;

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];
      const amount = Math.min(creditor.amount, debtor.amount);

      debts.push({
        from: debtor.person,
        to: creditor.person,
        amount: Math.round(amount * 100) / 100,
      });

      creditor.amount -= amount;
      debtor.amount -= amount;

      if (creditor.amount < 0.01) i++;
      if (debtor.amount < 0.01) j++;
    }

    return debts;
  };

  const deleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      const updatedData = {
        ...data,
        expenses: data.expenses.filter(e => e.id !== id),
      };
      saveData(updatedData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const debts = calculateDebts();

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Dividamos</h1>

      {/* Friends Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Friends</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newFriend}
            onChange={(e) => setNewFriend(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addFriend()}
            placeholder="Add friend name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addFriend}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.friends.map(friend => (
            <span
              key={friend}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {friend}
            </span>
          ))}
        </div>
      </section>

      {/* Debts Summary */}
      {debts.length > 0 && (
        <section className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-green-800">Who Owes Who</h2>
          <div className="space-y-2">
            {debts.map((debt, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <span className="text-gray-700">
                  <span className="font-semibold">{debt.from}</span> owes{' '}
                  <span className="font-semibold">{debt.to}</span>
                </span>
                <span className="text-xl font-bold text-green-600">
                  ${debt.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add Expense Button */}
      {data.friends.length >= 2 && !showAddExpense && (
        <button
          onClick={() => setShowAddExpense(true)}
          className="w-full mb-6 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-lg font-semibold"
        >
          + Add Expense
        </button>
      )}

      {/* Add Expense Form */}
      {showAddExpense && (
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">New Expense</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (e.g., Dinner at restaurant)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Who paid?</option>
              {data.friends.map(friend => (
                <option key={friend} value={friend}>{friend}</option>
              ))}
            </select>
            <div>
              <p className="mb-2 font-semibold text-gray-700">Split between:</p>
              <div className="flex flex-wrap gap-2">
                {data.friends.map(friend => (
                  <button
                    key={friend}
                    onClick={() => toggleParticipant(friend)}
                    className={`px-4 py-2 rounded-lg transition ${
                      selectedParticipants.includes(friend)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {friend}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addExpense}
                className="flex-1 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                Add Expense
              </button>
              <button
                onClick={() => {
                  setShowAddExpense(false);
                  setDescription('');
                  setAmount('');
                  setPaidBy('');
                  setSelectedParticipants([]);
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Expenses List */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          Expenses ({data.expenses.length})
        </h2>
        {data.expenses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No expenses yet. {data.friends.length >= 2 ? 'Add your first expense above!' : 'Add at least 2 friends to start.'}
          </p>
        ) : (
          <div className="space-y-3">
            {[...data.expenses].reverse().map(expense => (
              <div
                key={expense.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800">{expense.description}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(expense.date).toLocaleDateString()} at{' '}
                      {new Date(expense.date).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-800">${expense.amount.toFixed(2)}</p>
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="text-xs text-red-600 hover:text-red-800 mt-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Paid by:</span>
                  <span className="font-semibold text-blue-600">{expense.paidBy}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">Split:</span>
                  <span className="text-gray-700">{expense.participants.join(', ')}</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  ${(expense.amount / expense.participants.length).toFixed(2)} per person
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
