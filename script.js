const SUPABASE_URL = "https://qocramaysblhgfrmwryd.supabase.co";
const SUPABASE_KEY = "sb_publishable_qHyopzrP8MVN1bBUAc294A_b55PSHnQ";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORY_ICONS = [
  { keywords: ["식비", "식사", "음식", "밥", "카페", "커피"], icon: "🍔" },
  { keywords: ["교통", "버스", "지하철", "택시", "기름", "주유"], icon: "🚌" },
  { keywords: ["쇼핑", "옷", "패션"], icon: "🛍️" },
  { keywords: ["주거", "월세", "관리비", "공과금"], icon: "🏠" },
  { keywords: ["문화", "영화", "취미", "여가"], icon: "🎬" },
  { keywords: ["의료", "병원", "약", "건강"], icon: "💊" },
  { keywords: ["월급", "급여", "보너스"], icon: "💼" },
  { keywords: ["용돈"], icon: "👛" },
  { keywords: ["여행"], icon: "✈️" },
  { keywords: ["통신", "휴대폰", "인터넷"], icon: "📱" },
  { keywords: ["저축", "투자"], icon: "🏦" },
];

const QUICK_CATEGORIES = {
  expense: ["식비", "교통", "쇼핑", "주거", "문화", "의료", "통신"],
  income: ["월급", "용돈", "저축", "기타"],
};

const CHART_COLORS = ["#a855f7", "#22d3ee", "#f43f5e", "#fbbf24", "#34d399", "#818cf8", "#f472b6", "#2dd4bf"];

// App elements
const form = document.getElementById("entryForm");
const submitBtn = document.getElementById("submitBtn");
const typeToggle = document.getElementById("typeToggle");
const typeInput = document.getElementById("type");
const dateInput = document.getElementById("date");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const quickChips = document.getElementById("quickChips");
const entryList = document.getElementById("entryList");
const emptyMsg = document.getElementById("emptyMsg");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const totalBalanceEl = document.getElementById("totalBalance");
const filterTabs = document.getElementById("filterTabs");
const donutChart = document.getElementById("donutChart");
const donutTotal = document.getElementById("donutTotal");
const legendList = document.getElementById("legendList");
const chartWrap = document.getElementById("chartWrap");
const emptyChart = document.getElementById("emptyChart");
const todayDateEl = document.getElementById("todayDate");

let currentFilter = "all";
const prevTotals = { income: 0, expense: 0, balance: 0 };

dateInput.valueAsDate = new Date();
todayDateEl.textContent = new Date().toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

async function loadEntries() {
  const { data, error } = await sb.from("entries").select("*").order("date", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return data.map((row) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    memo: row.memo || "",
  }));
}

function formatWon(n) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function iconFor(category) {
  const lower = category.toLowerCase();
  for (const entry of CATEGORY_ICONS) {
    if (entry.keywords.some((k) => lower.includes(k.toLowerCase()))) return entry.icon;
  }
  return "📌";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function animateValue(el, from, to, duration = 400) {
  if (el._animateTimer) clearInterval(el._animateTimer);

  const start = Date.now();
  const step = 16;

  el._animateTimer = setInterval(() => {
    const progress = Math.min((Date.now() - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatWon(from + (to - from) * eased);
    if (progress >= 1) clearInterval(el._animateTimer);
  }, step);
}

function renderQuickChips() {
  const type = typeInput.value;
  quickChips.innerHTML = QUICK_CATEGORIES[type]
    .map((cat) => `<button type="button" class="chip">${iconFor(cat)} ${cat}</button>`)
    .join("");
}

function renderChart(entries) {
  const expenseEntries = entries.filter((e) => e.type === "expense");
  const totalExpense = expenseEntries.reduce((sum, e) => sum + e.amount, 0);

  if (totalExpense === 0) {
    chartWrap.style.display = "none";
    emptyChart.style.display = "block";
    return;
  }

  chartWrap.style.display = "flex";
  emptyChart.style.display = "none";

  const byCategory = {};
  for (const e of expenseEntries) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  let cursor = 0;
  const stops = [];
  const legendItems = [];

  sorted.forEach(([category, amount], i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const pct = (amount / totalExpense) * 100;
    const start = cursor;
    const end = cursor + pct;
    stops.push(`${color} ${start}% ${end}%`);
    cursor = end;

    legendItems.push(`
      <li>
        <span class="legend-dot" style="background:${color}"></span>
        <span class="legend-name">${iconFor(category)} ${escapeHtml(category)}</span>
        <span class="legend-pct">${pct.toFixed(0)}%</span>
      </li>
    `);
  });

  donutChart.style.background = `conic-gradient(${stops.join(",")})`;
  legendList.innerHTML = legendItems.join("");
  animateValue(donutTotal, 0, totalExpense, 500);
}

async function render() {
  const entries = await loadEntries();

  const filtered = currentFilter === "all" ? entries : entries.filter((e) => e.type === currentFilter);

  entryList.innerHTML = "";
  emptyMsg.style.display = entries.length === 0 ? "block" : "none";

  let income = 0;
  let expense = 0;

  for (const entry of entries) {
    if (entry.type === "income") income += entry.amount;
    else expense += entry.amount;
  }

  for (const entry of filtered) {
    const li = document.createElement("li");
    li.className = `entry-row ${entry.type}`;
    li.dataset.id = entry.id;
    li.innerHTML = `
      <div class="entry-icon">${iconFor(entry.category)}</div>
      <div class="entry-info">
        <span class="entry-category">${escapeHtml(entry.category)}</span>
        <span class="entry-meta">${entry.date}${entry.memo ? " · " + escapeHtml(entry.memo) : ""}</span>
      </div>
      <span class="entry-amount ${entry.type}">${entry.type === "income" ? "+" : "-"}${formatWon(entry.amount)}</span>
      <button class="del-btn" data-id="${entry.id}" aria-label="삭제">✕</button>
    `;
    entryList.appendChild(li);
  }

  animateValue(totalIncomeEl, prevTotals.income, income);
  animateValue(totalExpenseEl, prevTotals.expense, expense);
  animateValue(totalBalanceEl, prevTotals.balance, income - expense);
  prevTotals.income = income;
  prevTotals.expense = expense;
  prevTotals.balance = income - expense;

  renderChart(entries);
}

typeToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".type-btn");
  if (!btn) return;

  typeToggle.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  typeInput.value = btn.dataset.type;
  renderQuickChips();
});

quickChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  categoryInput.value = chip.textContent.trim().replace(/^\S+\s/, "");
  categoryInput.focus();
});

filterTabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;

  filterTabs.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  currentFilter = btn.dataset.filter;
  render();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  submitBtn.disabled = true;
  const { error } = await sb.from("entries").insert({
    date: dateInput.value,
    type: typeInput.value,
    category: categoryInput.value.trim(),
    amount: Number(amountInput.value),
    memo: memoInput.value.trim(),
  });
  submitBtn.disabled = false;

  if (error) {
    alert("저장에 실패했어요: " + error.message);
    return;
  }

  categoryInput.value = "";
  amountInput.value = "";
  memoInput.value = "";
  categoryInput.focus();

  render();
});

entryList.addEventListener("click", (e) => {
  const btn = e.target.closest(".del-btn");
  if (!btn) return;

  const row = btn.closest(".entry-row");
  row.classList.add("removing");
  setTimeout(async () => {
    const { error } = await sb.from("entries").delete().eq("id", btn.dataset.id);
    if (error) console.error(error);
    render();
  }, 180);
});

renderQuickChips();
render();
