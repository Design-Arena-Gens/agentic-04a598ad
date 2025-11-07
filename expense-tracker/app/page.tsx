"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

const CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Health",
  "Leisure",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];

type Expense = {
  id: string;
  label: string;
  category: Category;
  amount: number;
  date: string;
};

const storageKey = "minimal-expense-tracker";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function toLocalDateInput(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState<{
    label: string;
    amount: string;
    category: Category;
    date: string;
  }>({
    label: "",
    amount: "",
    category: CATEGORIES[0],
    date: toLocalDateInput(new Date()),
  });
  const [activeMonthKey, setActiveMonthKey] = useState(() =>
    getMonthKey(new Date()),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed: Expense[] = JSON.parse(stored);
        const latest = [...parsed].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0];
        startTransition(() => {
          setExpenses(parsed);
          if (latest) {
            setActiveMonthKey(getMonthKey(new Date(latest.date)));
          }
        });
      } catch (error) {
        console.error("Failed to parse expenses from storage", error);
      }
    } else {
      const seed = createSeedExpenses();
      startTransition(() => {
        setExpenses(seed);
      });
      localStorage.setItem(storageKey, JSON.stringify(seed));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify(expenses));
  }, [expenses]);

  const months = useMemo(() => {
    const unique = new Set<string>();
    expenses.forEach((expense) => unique.add(getMonthKey(new Date(expense.date))));
    return Array.from(unique)
      .sort((a, b) => {
        const [aYear, aMonth] = a.split("-").map(Number);
        const [bYear, bMonth] = b.split("-").map(Number);
        return new Date(bYear, bMonth - 1).getTime() - new Date(aYear, aMonth - 1).getTime();
      })
      .map((key) => {
        const [year, month] = key.split("-").map(Number);
        return {
          key,
          label: monthFormatter.format(new Date(year, month - 1)),
        };
      });
  }, [expenses]);

  const monthExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const key = getMonthKey(new Date(expense.date));
      return key === activeMonthKey;
    });
  }, [expenses, activeMonthKey]);

  const monthTotal = useMemo(() => {
    return monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [monthExpenses]);

  const weeklyAverage = useMemo(() => {
    const [year, month] = activeMonthKey.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate() - firstDay.getDate() + 1;
    const weeks = totalDays / 7;
    return weeks > 0 ? monthTotal / weeks : monthTotal;
  }, [activeMonthKey, monthTotal]);

  const topCategories = useMemo(() => {
    const tally = monthExpenses.reduce<Partial<Record<Category, number>>>(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
        return acc;
      },
      {},
    );
    return (Object.entries(tally) as [Category, number][])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [monthExpenses]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.label.trim() || !amount || Number.isNaN(amount)) {
      return;
    }

    const newExpense: Expense = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`,
      label: form.label.trim(),
      amount: Number(amount.toFixed(2)),
      category: form.category,
      date: form.date,
    };

    const nextExpenses = [newExpense, ...expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    setExpenses(nextExpenses);
    setForm((prev) => ({
      ...prev,
      label: "",
      amount: "",
    }));
    setActiveMonthKey(getMonthKey(new Date(newExpense.date)));
  }

  function handleDelete(id: string) {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  }

  return (
    <div className="min-h-screen bg-stone-100 pb-16 text-stone-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-16 px-6 py-16">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
            minimal ledger
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-4xl font-semibold tracking-tight">
              Expense Tracker
            </h1>
            <select
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 outline-none transition hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
              value={activeMonthKey}
              onChange={(event) => setActiveMonthKey(event.target.value)}
            >
              {months.map((month) => (
                <option key={month.key} value={month.key}>
                  {month.label}
                </option>
              ))}
              {!months.length && (
                <option value={getMonthKey(new Date())}>
                  {monthFormatter.format(new Date())}
                </option>
              )}
            </select>
          </div>
          <p className="max-w-xl text-sm text-stone-600">
            Track spending across categories with a clean, minimalist dashboard.
            Your data stays in your browser&apos;s local storage.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <StatCard
            label="This month"
            value={currencyFormatter.format(monthTotal)}
            hint="Total expenses"
          />
          <StatCard
            label="Weekly pace"
            value={currencyFormatter.format(weeklyAverage)}
            hint="Average spend per week"
          />
          <StatCard
            label="Entries"
            value={monthExpenses.length.toString().padStart(2, "0")}
            hint="Logged expenses"
          />
        </section>

        <section className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            <form
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              onSubmit={handleSubmit}
            >
              <h2 className="text-lg font-medium text-stone-800">
                Add a new expense
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-600">
                  Description
                  <input
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-base font-normal text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
                    value={form.label}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, label: event.target.value }))
                    }
                    placeholder="Groceries, rent, coffee..."
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-600">
                  Amount
                  <input
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-base font-normal text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    inputMode="decimal"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-600">
                  Category
                  <select
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-base font-normal text-stone-900 outline-none transition hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        category: event.target.value as Category,
                      }))
                    }
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-600">
                  Date
                  <input
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-base font-normal text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
                    value={form.date}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, date: event.target.value }))
                    }
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    required
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium tracking-wide text-white shadow-sm transition hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 focus:ring-offset-white"
                >
                  Log expense
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center justify-between px-6 py-5">
                <h2 className="text-lg font-medium text-stone-800">
                  Activity
                </h2>
                <span className="text-sm text-stone-500">
                  {monthFormatter.format(
                    new Date(
                      Number(activeMonthKey.split("-")[0]),
                      Number(activeMonthKey.split("-")[1]) - 1,
                    ),
                  )}
                </span>
              </div>
              <div className="divide-y divide-stone-100">
                {monthExpenses.length === 0 && (
                  <p className="px-6 py-12 text-center text-sm text-stone-500">
                    No expenses recorded for this month yet.
                  </p>
                )}
                {monthExpenses.map((expense) => (
                  <article
                    key={expense.id}
                    className="flex items-center gap-4 px-6 py-4 transition hover:bg-stone-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs uppercase tracking-wide text-white">
                      {expense.category.slice(0, 2)}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="text-sm font-semibold text-stone-800">
                          {expense.label}
                        </h3>
                        <div className="text-sm font-semibold text-stone-900">
                          {currencyFormatter.format(expense.amount)}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
                        <span className="uppercase tracking-[0.2em]">
                          {expense.category}
                        </span>
                        <span>{dateFormatter.format(new Date(expense.date))}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500 transition hover:border-stone-400 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
                Top categories
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {topCategories.length === 0 && (
                  <p className="text-sm text-stone-500">
                    Add expenses to see category insights.
                  </p>
                )}
                {topCategories.map(([category, total]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {category}
                      </p>
                      <p className="text-xs text-stone-500">This month</p>
                    </div>
                    <p className="text-sm font-semibold text-stone-900">
                      {currencyFormatter.format(total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
                Quick note
              </h2>
              <p className="mt-4 leading-6">
                This tracker stores everything locally. Export your data by
                copying the JSON from your browser storage. Clear your cache to
                reset.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
        {label}
      </p>
      <p className="mt-5 text-3xl font-semibold text-stone-900">{value}</p>
      <p className="mt-2 text-xs text-stone-500">{hint}</p>
    </div>
  );
}

function createSeedExpenses(): Expense[] {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const sample: Omit<Expense, "id">[] = [
    {
      label: "Morning coffee",
      category: "Food",
      amount: 4.5,
      date: toLocalDateInput(new Date(year, month, 2)),
    },
    {
      label: "Weekly groceries",
      category: "Food",
      amount: 86.2,
      date: toLocalDateInput(new Date(year, month, 3)),
    },
    {
      label: "Metro pass",
      category: "Transport",
      amount: 28,
      date: toLocalDateInput(new Date(year, month, 5)),
    },
    {
      label: "Electric bill",
      category: "Utilities",
      amount: 64.75,
      date: toLocalDateInput(new Date(year, month, 7)),
    },
    {
      label: "Yoga class",
      category: "Health",
      amount: 22,
      date: toLocalDateInput(new Date(year, month, 10)),
    },
  ];

  return sample.map((item) => ({
    ...item,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${item.label}-${item.date}`,
  }));
}
