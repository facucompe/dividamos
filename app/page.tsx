'use client';

import { useState, useEffect, useRef } from 'react';
import type { Expense, ExpenseData, GroupedExpenseData, Group, Debt } from '@/types';

export default function Home() {
  const [groupedData, setGroupedData] = useState<GroupedExpenseData>({
    version: 2,
    groups: [],
    activeGroupId: null,
  });
  const [loading, setLoading] = useState(true);
  const [newFriend, setNewFriend] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  // Expense form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Close group menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setShowGroupMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const migrateToGroupedFormat = (data: any): GroupedExpenseData => {
    // Check if already in new format
    if (data.version === 2 && data.groups) {
      return data as GroupedExpenseData;
    }

    // Migrate from legacy format
    const legacyData = data as ExpenseData;
    const defaultGroup: Group = {
      id: Date.now().toString(),
      name: 'My Group',
      friends: legacyData.friends || [],
      expenses: legacyData.expenses || [],
      createdAt: new Date().toISOString(),
    };

    return {
      version: 2,
      groups: [defaultGroup],
      activeGroupId: defaultGroup.id,
    };
  };

  const fetchData = async () => {
    try {
      const response = await fetch('/api/expenses');
      const data = await response.json();
      const migrated = migrateToGroupedFormat(data);

      setGroupedData(migrated);

      // Save migrated format if it was in legacy format
      if (!data.version) {
        await saveData(migrated);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentGroup = (): Group | null => {
    if (!groupedData.activeGroupId) return null;
    return groupedData.groups.find(g => g.id === groupedData.activeGroupId) || null;
  };

  const saveData = async (newData: GroupedExpenseData) => {
    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
      setGroupedData(newData);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data');
    }
  };

  const createGroup = () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) {
      alert('Please enter a group name');
      return;
    }

    // Check for duplicate names
    if (groupedData.groups.some(g => g.name === trimmedName)) {
      alert('A group with this name already exists');
      return;
    }

    const newGroup: Group = {
      id: Date.now().toString(),
      name: trimmedName,
      friends: [],
      expenses: [],
      createdAt: new Date().toISOString(),
    };

    const updatedData = {
      ...groupedData,
      groups: [...groupedData.groups, newGroup],
      activeGroupId: newGroup.id,
    };

    saveData(updatedData);
    setNewGroupName('');
    setShowCreateGroup(false);
  };

  const switchGroup = (groupId: string) => {
    const updatedData = {
      ...groupedData,
      activeGroupId: groupId,
    };
    saveData(updatedData);
    setShowGroupMenu(false);
  };

  const deleteGroup = (groupId: string) => {
    if (groupedData.groups.length <= 1) {
      alert('Cannot delete the last group');
      return;
    }

    const group = groupedData.groups.find(g => g.id === groupId);
    if (!group) return;

    if (!confirm(`Are you sure you want to delete "${group.name}"? All expenses and friends in this group will be lost.`)) {
      return;
    }

    const filteredGroups = groupedData.groups.filter(g => g.id !== groupId);
    const newActiveId = groupId === groupedData.activeGroupId
      ? filteredGroups[0].id
      : groupedData.activeGroupId;

    const updatedData = {
      ...groupedData,
      groups: filteredGroups,
      activeGroupId: newActiveId,
    };

    saveData(updatedData);
  };

  const addFriend = () => {
    const currentGroup = getCurrentGroup();
    if (!currentGroup) return;

    if (newFriend.trim() && !currentGroup.friends.includes(newFriend.trim())) {
      const updatedGroups = groupedData.groups.map(g =>
        g.id === currentGroup.id
          ? { ...g, friends: [...g.friends, newFriend.trim()] }
          : g
      );

      const updatedData = {
        ...groupedData,
        groups: updatedGroups,
      };

      saveData(updatedData);
      setNewFriend('');
    }
  };

  const addExpense = () => {
    const currentGroup = getCurrentGroup();
    if (!currentGroup) return;

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

    const updatedGroups = groupedData.groups.map(g =>
      g.id === currentGroup.id
        ? { ...g, expenses: [...g.expenses, expense] }
        : g
    );

    const updatedData = {
      ...groupedData,
      groups: updatedGroups,
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
    const currentGroup = getCurrentGroup();
    if (!currentGroup) return [];

    const balances: { [key: string]: number } = {};

    // Initialize balances
    currentGroup.friends.forEach(friend => {
      balances[friend] = 0;
    });

    // Calculate balances
    currentGroup.expenses.forEach(expense => {
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
    const currentGroup = getCurrentGroup();
    if (!currentGroup) return;

    if (confirm('Are you sure you want to delete this expense?')) {
      const updatedGroups = groupedData.groups.map(g =>
        g.id === currentGroup.id
          ? { ...g, expenses: g.expenses.filter(e => e.id !== id) }
          : g
      );

      const updatedData = {
        ...groupedData,
        groups: updatedGroups,
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

  const currentGroup = getCurrentGroup();
  const debts = calculateDebts();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Dividamos
          </h1>
          <p className="text-gray-600 text-sm md:text-base">Split expenses with friends, the easy way</p>
        </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform animate-slideUp">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Create New Group</h2>
            </div>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createGroup()}
              placeholder="Group name (e.g., Roommates, Work Lunch)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6 transition"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={createGroup}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Create Group
              </button>
              <button
                onClick={() => {
                  setShowCreateGroup(false);
                  setNewGroupName('');
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Selector */}
      {groupedData.groups.length > 0 && (
        <section className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100" ref={groupMenuRef}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <button
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition">{currentGroup?.name || 'Select Group'}</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${showGroupMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {currentGroup && (
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {currentGroup.friends.length}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {currentGroup.expenses.length}
                      </span>
                    </p>
                  )}
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Group
            </button>
          </div>

          {/* Group Menu Dropdown */}
          {showGroupMenu && (
            <div className="mt-6 pt-6 border-t border-gray-100 animate-slideDown">
              <div className="space-y-2">
                {groupedData.groups.map(group => (
                  <div
                    key={group.id}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                      group.id === currentGroup?.id
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => switchGroup(group.id)}
                      className="flex-1 text-left"
                    >
                      <div className="font-bold text-gray-800 mb-1">{group.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          {group.friends.length} friends
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {group.expenses.length} expenses
                        </span>
                      </div>
                    </button>
                    {groupedData.groups.length > 1 && (
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="ml-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all font-semibold hover:shadow-md flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Welcome Screen - No Groups */}
      {groupedData.groups.length === 0 && (
        <section className="bg-white rounded-2xl shadow-2xl p-12 text-center border border-gray-100">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-3 text-gray-800">Welcome to Dividamos!</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">Create your first group to start tracking and splitting expenses with friends, roommates, or colleagues.</p>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all text-lg font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Group
          </button>
        </section>
      )}

      {/* Main Content - Only show if currentGroup exists */}
      {currentGroup && (
        <>

        {/* Friends Section */}
        <section className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Friends</h2>
            {currentGroup.friends.length > 0 && (
              <span className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                {currentGroup.friends.length}
              </span>
            )}
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newFriend}
              onChange={(e) => setNewFriend(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addFriend()}
              placeholder="Add friend name"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
            <button
              onClick={addFriend}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Add
            </button>
          </div>
          {currentGroup.friends.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm">No friends yet. Add your first friend above!</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentGroup.friends.map((friend, index) => (
                <span
                  key={friend}
                  className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 cursor-default"
                  style={{animationDelay: `${index * 50}ms`}}
                >
                  {friend}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Debts Summary */}
        {debts.length > 0 && (
          <section className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-800">Who Owes Who</h2>
            </div>
            <div className="space-y-3">
              {debts.map((debt, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                  <span className="text-gray-700 flex items-center gap-2">
                    <span className="font-bold text-gray-800">{debt.from}</span>
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span className="font-bold text-gray-800">{debt.to}</span>
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    ${debt.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add Expense Button */}
        {currentGroup.friends.length >= 2 && !showAddExpense && (
          <button
            onClick={() => setShowAddExpense(true)}
            className="w-full mb-6 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all text-lg font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>
        )}

        {/* Add Expense Form */}
        {showAddExpense && (
          <section className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">New Expense</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Dinner at restaurant"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold text-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Who paid?</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-white"
                >
                  <option value="">Select a friend</option>
                  {currentGroup.friends.map(friend => (
                    <option key={friend} value={friend}>{friend}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Split between:</label>
                <div className="flex flex-wrap gap-2">
                  {currentGroup.friends.map(friend => (
                    <button
                      key={friend}
                      onClick={() => toggleParticipant(friend)}
                      className={`px-4 py-2 rounded-xl transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                        selectedParticipants.includes(friend)
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {friend}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={addExpense}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Expenses List */}
        <section className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Expenses</h2>
            {currentGroup.expenses.length > 0 && (
              <span className="ml-auto px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                {currentGroup.expenses.length}
              </span>
            )}
          </div>
          {currentGroup.expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="text-base mb-2 font-semibold text-gray-500">No expenses yet</p>
              <p className="text-sm">{currentGroup.friends.length >= 2 ? 'Add your first expense above!' : 'Add at least 2 friends to start.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...currentGroup.expenses].reverse().map((expense, index) => (
                <div
                  key={expense.id}
                  className="border-2 border-gray-100 rounded-xl p-4 hover:border-orange-200 hover:bg-orange-50/30 transition-all hover:shadow-md"
                  style={{animationDelay: `${index * 50}ms`}}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800 mb-1">{expense.description}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(expense.date).toLocaleDateString()} at {new Date(expense.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        ${expense.amount.toFixed(2)}
                      </p>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold mt-1 hover:underline flex items-center gap-1 ml-auto"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg p-3">
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-600 font-medium">Paid by:</span>
                      <span className="font-bold text-blue-600 px-2 py-0.5 bg-blue-100 rounded-md">{expense.paidBy}</span>
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-600 font-medium">Split:</span>
                      <span className="text-gray-700 font-semibold">{expense.participants.join(', ')}</span>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <div className="flex-1 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg px-3 py-2">
                      <span className="text-orange-800 font-bold">
                        ${(expense.amount / expense.participants.length).toFixed(2)} per person
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </>
      )}
      </div>
    </main>
  );
}
