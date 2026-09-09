const STORAGE_KEY = "house-account-entries";

const form = document.getElementById("entryForm");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const entryList = document.getElementById("entryList");
const emptyMsg = document.getElementById("emptyMsg");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const totalBalanceEl = document.getElementById("totalBalance");

dateInput.valueAsDate = new Date();

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatWon(n) {
  return n.toLocaleString("ko-KR") + "원";
}

function render() {
  const entries = loadEntries().sort((a, b) => b.date.localeCompare(a.date));

  entryList.innerHTML = "";
  emptyMsg.style.display = entries.length === 0 ? "block" : "none";

  let income = 0;
  let expense = 0;

  for (const entry of entries) {
    if (entry.type === "income") income += entry.amount;
    else expense += entry.amount;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.type === "income" ? "수입" : "지출"}</td>
      <td>${escapeHtml(entry.category)}</td>
      <td>${escapeHtml(entry.memo || "")}</td>
      <td class="amount-${entry.type}">${entry.type === "income" ? "+" : "-"}${formatWon(entry.amount)}</td>
      <td><button class="del-btn" data-id="${entry.id}">삭제</button></td>
    `;
    entryList.appendChild(tr);
  }

  totalIncomeEl.textContent = formatWon(income);
  totalExpenseEl.textContent = formatWon(expense);
  totalBalanceEl.textContent = formatWon(income - expense);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const entries = loadEntries();
  entries.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    date: dateInput.value,
    type: typeInput.value,
    category: categoryInput.value.trim(),
    amount: Number(amountInput.value),
    memo: memoInput.value.trim(),
  });
  saveEntries(entries);

  categoryInput.value = "";
  amountInput.value = "";
  memoInput.value = "";
  categoryInput.focus();

  render();
});

entryList.addEventListener("click", (e) => {
  const btn = e.target.closest(".del-btn");
  if (!btn) return;

  const entries = loadEntries().filter((entry) => entry.id !== btn.dataset.id);
  saveEntries(entries);
  render();
});

render();
