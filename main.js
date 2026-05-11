// ====== 設定 ======
// ここにGASでデプロイしたWebアプリのURLを貼り付けてください
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwJJf-AdBF2_YDN-ZRWszY8J2BYRJyOuNkIdCOkByP0OFc1Yp5eoClsuo_0iiOeuvuEyA/exec';

// ====== DOM要素 ======
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const listEl = document.getElementById('list');
const form = document.getElementById('transaction-form');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const titleInput = document.getElementById('title');
const memoInput = document.getElementById('memo');
const emptyStateEl = document.getElementById('empty-state');
const filterBtns = document.querySelectorAll('.filter-btn');

const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const monthSelector = document.getElementById('month-selector');

const btnCalendarBalance = document.getElementById('btn-calendar-balance');
const btnCalendarHistory = document.getElementById('btn-calendar-history');

const calendarModal = document.getElementById('calendar-modal');
const closeCalendarBtn = document.getElementById('close-calendar');
const calPrevBtn = document.getElementById('cal-prev');
const calNextBtn = document.getElementById('cal-next');
const calMonthDisplay = document.getElementById('cal-month-display');
const calendarGrid = document.getElementById('calendar-grid');

const detailsModal = document.getElementById('date-details-modal');
const closeDetailsBtn = document.getElementById('close-details');
const detailsDateTitle = document.getElementById('details-date-title');
const detailsIncome = document.getElementById('details-income');
const detailsExpense = document.getElementById('details-expense');
const detailsTransactionList = document.getElementById('details-transaction-list');

// ====== 状態管理 ======
let transactions = [];
let currentFilter = 'all'; // 'all', 'income', 'expense'
let displayedMonth = new Date();
displayedMonth.setDate(1); // 月の計算がずれないように1日に固定

let incomeChartInstance = null;
let expenseChartInstance = null;

// ====== 初期化 ======
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    updateMonthDisplay();
    fetchTransactions();
});

// ====== API通信 ======
async function fetchTransactions() {
    if (GAS_URL === 'YOUR_GAS_WEB_APP_URL_HERE') {
        alert('GAS_URLが設定されていません。main.jsの1行目にスプレッドシートのURLを貼り付けてください。');
        return;
    }

    // ロード中表示
    listEl.innerHTML = '<p style="text-align:center;">読み込み中...</p>';

    try {
        const response = await fetch(GAS_URL);
        const data = await response.json();
        transactions = data;
        // 追加された順（スプレッドシートの下から）の完全な逆順にする
        transactions.reverse();
        render();
    } catch (error) {
        console.error('Error fetching data:', error);
        listEl.innerHTML = '<p style="text-align:center;color:#f43f5e;">データの読み込みに失敗しました。</p>';
    }
}

async function saveTransaction(transaction) {
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(transaction),
            // GASの場合、CORSを避けるために 'text/plain' として送ることが多いです。
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });
        const result = await response.json();
        return result.status === 'success';
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

async function deleteTransactionApi(id) {
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', id: id }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });
        const result = await response.json();
        return result.status === 'success';
    } catch (error) {
        console.error('Error deleting data:', error);
        return false;
    }
}

// ====== 月のナビゲーション ======
prevMonthBtn.addEventListener('click', () => {
    displayedMonth.setMonth(displayedMonth.getMonth() - 1);
    updateMonthDisplay();
    render();
});

nextMonthBtn.addEventListener('click', () => {
    displayedMonth.setMonth(displayedMonth.getMonth() + 1);
    updateMonthDisplay();
    render();
});

monthSelector.addEventListener('change', (e) => {
    const [year, month] = e.target.value.split('-');
    if (year && month) {
        displayedMonth.setFullYear(parseInt(year), parseInt(month) - 1, 1);
        render();
    }
});

function updateMonthDisplay() {
    const year = displayedMonth.getFullYear();
    const month = String(displayedMonth.getMonth() + 1).padStart(2, '0');
    monthSelector.value = `${year}-${month}`;
}

// ====== スワイプ処理 (ダッシュボード) ======
let touchStartX = 0;
let touchEndX = 0;

document.querySelector('.dashboard').addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.querySelector('.dashboard').addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe(touchStartX, touchEndX, () => prevMonthBtn.click(), () => nextMonthBtn.click());
});

function handleSwipe(start, end, onRightSwipe, onLeftSwipe) {
    const threshold = 50; // スワイプと判定する最低距離(px)
    if (end < start - threshold) onLeftSwipe(); // 左へスワイプ (翌月)
    if (end > start + threshold) onRightSwipe(); // 右へスワイプ (先月)
}

// ====== 描画処理 ======
function render() {
    listEl.innerHTML = '';

    // 表示月のデータを抽出
    const targetYear = displayedMonth.getFullYear();
    const targetMonth = displayedMonth.getMonth() + 1;

    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getFullYear() === targetYear && (date.getMonth() + 1) === targetMonth;
    });

    // 収支計算
    let totalIncome = 0;
    let totalExpense = 0;

    monthTransactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        if (t.type === 'expense') totalExpense += t.amount;
    });

    const balance = totalIncome - totalExpense;

    balanceEl.innerText = formatMoney(balance);
    incomeEl.innerText = formatMoney(totalIncome);
    expenseEl.innerText = formatMoney(totalExpense);

    // 取引履歴の描画 (全体で最新30件)
    let displayCount = 0;
    const filteredForList = transactions.filter(t => currentFilter === 'all' || t.type === currentFilter);

    for (const t of filteredForList) {
        if (displayCount >= 30) break;
        addTransactionDOM(t);
        displayCount++;
    }

    checkEmptyState(filteredForList.length);

    // グラフの描画
    drawCharts(monthTransactions);
}

// ====== 取引の追加 ======
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (GAS_URL === 'YOUR_GAS_WEB_APP_URL_HERE') {
        alert('先にGAS_URLを設定してください。');
        return;
    }

    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = +amountInput.value;
    const title = titleInput.value.trim();
    const category = categoryInput.value;
    const date = dateInput.value;
    const memo = memoInput.value.trim();

    if (amount <= 0 || !date) {
        alert('正しい金額と日付を入力してください');
        return;
    }

    const transaction = {
        id: generateID(),
        type,
        amount,
        title,
        category,
        date,
        memo
    };

    // 一時的にローカルに追加して表示 (一番上に追加)
    transactions.unshift(transaction);
    render();

    // GASへ送信
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = '送信中...';
    submitBtn.disabled = true;

    const success = await saveTransaction(transaction);

    submitBtn.innerText = originalText;
    submitBtn.disabled = false;

    if (success) {
        amountInput.value = '';
        titleInput.value = '';
        memoInput.value = '';
        categoryInput.value = 'カテゴリーなし';
        amountInput.focus();
    } else {
        alert('保存に失敗しました。');
    }
});

// ====== 取引の削除 ======
async function deleteTransaction(id) {
    if (!confirm('この記録を削除してもよろしいですか？')) return;

    // UI上でローディングっぽくする（全消去して再フェッチするか、対象を消すか）
    const originalTransactions = [...transactions];
    transactions = transactions.filter(t => String(t.id) !== String(id));
    render();

    const success = await deleteTransactionApi(id);
    if (!success) {
        alert('削除に失敗しました。');
        transactions = originalTransactions;
        render();
    }
}

// ====== ユーティリティ ======
function formatMoney(number) {
    return '¥ ' + number.toLocaleString('ja-JP');
}

function generateID() {
    return Math.floor(Math.random() * 100000000);
}

function addTransactionDOM(transaction) {
    const sign = transaction.type === 'income' ? '+' : '-';
    const item = document.createElement('li');

    item.classList.add(transaction.type);

    const memoHtml = transaction.memo ? ` <span class="memo">(${transaction.memo})</span>` : '';
    const displayTitle = transaction.title ? transaction.title : '名称なし';

    // 日付と曜日の取得
    const dateObj = new Date(transaction.date);
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
    const displayDate = typeof transaction.date === 'string' ? transaction.date.split('T')[0] : transaction.date;
    const dateWithDay = `${displayDate} (${dayOfWeek})`;

    item.innerHTML = `
        <div class="item-info">
            <span class="item-category">${displayTitle}</span>
            <span class="item-date-memo">${dateWithDay} | ${transaction.category}${memoHtml}</span>
        </div>
        <div class="item-amount ${transaction.type}">
            ${sign}${formatMoney(transaction.amount)}
            <button class="delete-btn" onclick="deleteTransaction('${transaction.id}')">×</button>
        </div>
    `;

    listEl.appendChild(item);
}

function checkEmptyState(listLength) {
    if (listLength === 0) {
        emptyStateEl.classList.remove('hidden');
    } else {
        emptyStateEl.classList.add('hidden');
    }
}

// フィルター
filterBtns.forEach(btn => btn.addEventListener('click', (e) => {
    const filter = e.target.getAttribute('data-filter');
    if (!filter) return;
    currentFilter = filter;
    filterBtns.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    render();
}));

// ====== グラフ描画 ======
function drawCharts(monthTransactions) {
    const incomeData = {};
    const expenseData = {};

    monthTransactions.forEach(t => {
        if (t.type === 'income') {
            incomeData[t.category] = (incomeData[t.category] || 0) + t.amount;
        } else {
            expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
        }
    });

    const incomeCtx = document.getElementById('income-chart').getContext('2d');
    const expenseCtx = document.getElementById('expense-chart').getContext('2d');

    // Chart.js Default Font
    Chart.defaults.color = '#f8fafc';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: { boxWidth: 12, font: { size: 10 }, color: '#f8fafc' }
            }
        }
    };

    const colorMap = {
        '食費': '#f43f5e',       // Rose
        '日用品': '#06b6d4',      // Cyan
        '交通費': '#84cc16',      // Lime
        '健康・医療': '#10b981',    // Emerald
        '趣味・娯楽': '#8b5cf6',    // Purple
        '衣服・美容': '#ec4899',    // Pink
        '交際費': '#f97316',      // Orange
        '水道・光熱費': '#eab308',   // Yellow
        '通信費': '#0ea5e9',      // Sky Blue
        '教育': '#6366f1',       // Indigo
        'カテゴリーなし': '#475569', // Slate
        'その他': '#94a3b8'       // Slate light
    };

    const getColors = (dataObj) => {
        return Object.keys(dataObj).map(category => colorMap[category] || '#d946ef');
    };

    if (incomeChartInstance) incomeChartInstance.destroy();
    incomeChartInstance = new Chart(incomeCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(incomeData).length > 0 ? Object.keys(incomeData) : ['データなし'],
            datasets: [{
                data: Object.keys(incomeData).length > 0 ? Object.values(incomeData) : [1],
                backgroundColor: Object.keys(incomeData).length > 0 ? getColors(incomeData) : ['rgba(255,255,255,0.1)'],
                borderWidth: 0
            }]
        },
        options: commonOptions
    });

    if (expenseChartInstance) expenseChartInstance.destroy();
    expenseChartInstance = new Chart(expenseCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(expenseData).length > 0 ? Object.keys(expenseData) : ['データなし'],
            datasets: [{
                data: Object.keys(expenseData).length > 0 ? Object.values(expenseData) : [1],
                backgroundColor: Object.keys(expenseData).length > 0 ? getColors(expenseData) : ['rgba(255,255,255,0.1)'],
                borderWidth: 0
            }]
        },
        options: commonOptions
    });
}

// ====== カレンダー＆詳細表示処理 ======
let calendarDisplayedMonth = new Date();
calendarDisplayedMonth.setDate(1);

// カレンダーを開く
btnCalendarBalance.addEventListener('click', () => {
    calendarDisplayedMonth = new Date(displayedMonth);
    renderCalendar();
    calendarModal.classList.remove('hidden');
});

btnCalendarHistory.addEventListener('click', () => {
    calendarDisplayedMonth = new Date();
    calendarDisplayedMonth.setDate(1);
    renderCalendar();
    calendarModal.classList.remove('hidden');
});

// カレンダーを閉じる
closeCalendarBtn.addEventListener('click', () => calendarModal.classList.add('hidden'));
calendarModal.addEventListener('click', (e) => {
    if (e.target === calendarModal) calendarModal.classList.add('hidden');
});

// カレンダー内の月移動
calPrevBtn.addEventListener('click', () => {
    calendarDisplayedMonth.setMonth(calendarDisplayedMonth.getMonth() - 1);
    renderCalendar();
});

calNextBtn.addEventListener('click', () => {
    calendarDisplayedMonth.setMonth(calendarDisplayedMonth.getMonth() + 1);
    renderCalendar();
});

// カレンダーのスワイプ移動
let calTouchStartX = 0;
let calTouchEndX = 0;
calendarModal.querySelector('.modal-content').addEventListener('touchstart', e => {
    calTouchStartX = e.changedTouches[0].screenX;
});
calendarModal.querySelector('.modal-content').addEventListener('touchend', e => {
    calTouchEndX = e.changedTouches[0].screenX;
    handleSwipe(calTouchStartX, calTouchEndX, () => calPrevBtn.click(), () => calNextBtn.click());
});

// 詳細モーダルを閉じる
closeDetailsBtn.addEventListener('click', () => detailsModal.classList.add('hidden'));
detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) detailsModal.classList.add('hidden');
});

function renderCalendar() {
    const year = calendarDisplayedMonth.getFullYear();
    const month = calendarDisplayedMonth.getMonth() + 1;
    calMonthDisplay.innerText = `${year}年${month}月`;

    calendarGrid.innerHTML = '';

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    // 日付ごとの集計
    const dailyData = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === year && (d.getMonth() + 1) === month) {
            const day = d.getDate();
            if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0, count: 0 };
            if (t.type === 'income') dailyData[day].income += t.amount;
            if (t.type === 'expense') dailyData[day].expense += t.amount;
            dailyData[day].count++;
        }
    });

    // 空白セル
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cal-cell', 'empty');
        calendarGrid.appendChild(cell);
    }

    // 日付セル
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.classList.add('cal-cell');

        let summaryHtml = '';
        if (dailyData[day]) {
            if (dailyData[day].income > 0) summaryHtml += `<div class="cal-inc">+${dailyData[day].income.toLocaleString()}</div>`;
            if (dailyData[day].expense > 0) summaryHtml += `<div class="cal-exp">-${dailyData[day].expense.toLocaleString()}</div>`;
        }

        cell.innerHTML = `
            <div class="cal-date">${day}</div>
            <div class="cal-summary">${summaryHtml}</div>
        `;

        if (dailyData[day]) {
            cell.addEventListener('click', () => showDateDetails(year, month, day));
        } else {
            cell.style.cursor = 'default';
        }

        calendarGrid.appendChild(cell);
    }
}

function showDateDetails(year, month, day) {
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
    detailsDateTitle.innerText = `${year}年${month}月${day}日 (${dayOfWeek})`;

    // 対象日のデータを抽出（逆順なのでそのまま表示すれば最新が上）
    const targetTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === year && (d.getMonth() + 1) === month && d.getDate() === day;
    });

    let totalInc = 0;
    let totalExp = 0;
    detailsTransactionList.innerHTML = '';

    if (targetTransactions.length === 0) {
        detailsTransactionList.innerHTML = '<p style="text-align:center; padding:1rem;">記録がありません</p>';
    } else {
        targetTransactions.forEach(t => {
            if (t.type === 'income') totalInc += t.amount;
            if (t.type === 'expense') totalExp += t.amount;

            const sign = t.type === 'income' ? '+' : '-';
            const item = document.createElement('li');
            item.classList.add(t.type);
            const memoHtml = t.memo ? ` <span class="memo">(${t.memo})</span>` : '';
            const displayTitle = t.title ? t.title : '名称なし';

            item.innerHTML = `
                <div class="item-info">
                    <span class="item-category">${displayTitle}</span>
                    <span class="item-date-memo">${t.category}${memoHtml}</span>
                </div>
                <div class="item-amount ${t.type}">
                    ${sign}${formatMoney(t.amount)}
                </div>
            `;
            detailsTransactionList.appendChild(item);
        });
    }

    detailsIncome.innerText = formatMoney(totalInc);
    detailsExpense.innerText = formatMoney(totalExp);

    detailsModal.classList.remove('hidden');
}
