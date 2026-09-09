const API_BASE = 'http://127.0.0.1:8000';
const WS_BASE = 'ws://127.0.0.1:8000';

const screens = {
    input: document.getElementById('input-section'),
    loading: document.getElementById('loading-section'),
    error: document.getElementById('error-section'),
    results: document.getElementById('results-section'),
    summary: document.getElementById('summary-section')
};

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

const inputEl = document.getElementById('grocery-input');
const compareBtn = document.getElementById('compare-btn');

inputEl.addEventListener('input', () => {
    compareBtn.disabled = inputEl.value.trim().length === 0;
});

let currentListId = null;
let currentResult = null;

compareBtn.addEventListener('click', async () => {
    const rawText = inputEl.value;
    showScreen('loading');
    
    try {
        // 1. Parse List
        const parseRes = await fetch(`${API_BASE}/parse-list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw_text: rawText })
        });
        
        if (!parseRes.ok) throw new Error('Failed to parse list');
        const listData = await parseRes.json();
        currentListId = listData.list_id;

        // 2. Open WebSocket for Progress
        const ws = new WebSocket(`${WS_BASE}/ws/compare/${currentListId}`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            document.getElementById('loading-submessage').innerText = 
                `Checking ${data.completed_items}/${data.total_items} items...`;
        };

        // 3. Trigger Comparison
        const compareRes = await fetch(`${API_BASE}/compare/${currentListId}`, {
            method: 'POST'
        });
        
        if (!compareRes.ok) throw new Error('Comparison failed');
        currentResult = await compareRes.json();
        
        ws.close();
        renderResults(currentResult);
        showScreen('results');

    } catch (err) {
        console.error(err);
        showScreen('error');
    }
});

document.getElementById('retry-btn').addEventListener('click', () => {
    showScreen('input');
});

document.getElementById('back-btn').addEventListener('click', () => {
    showScreen('input');
});

function getBadgeColor(platform) {
    switch(platform.toLowerCase()) {
        case 'zepto': return { bg: 'rgba(128,0,128,0.2)', color: 'purple' };
        case 'blinkit': return { bg: 'rgba(255,215,0,0.3)', color: '#b8860b' };
        case 'instamart': return { bg: 'rgba(255,165,0,0.2)', color: 'darkorange' };
        default: return { bg: '#eee', color: '#333' };
    }
}

function renderResults(result) {
    // Hero
    let animatedValue = 0;
    const targetValue = result.total_cost;
    const priceEl = document.getElementById('total-cost');
    
    const interval = setInterval(() => {
        animatedValue += targetValue / 20;
        if (animatedValue >= targetValue) {
            animatedValue = targetValue;
            clearInterval(interval);
        }
        priceEl.innerText = animatedValue.toFixed(2);
    }, 40);

    const savingsBadge = document.getElementById('savings-badge');
    if (result.split_cart_used) {
        savingsBadge.style.display = 'inline-block';
        document.getElementById('savings-amount').innerText = result.savings.toFixed(2);
    } else {
        savingsBadge.style.display = 'none';
    }

    // Platforms
    const container = document.getElementById('platform-cards-container');
    container.innerHTML = '';
    
    const grouped = {};
    result.winners.forEach(w => {
        if (!grouped[w.platform]) grouped[w.platform] = [];
        grouped[w.platform].push(w);
    });

    Object.keys(grouped).sort().forEach((platform, idx) => {
        const items = grouped[platform];
        const subtotal = result.platform_totals[platform] || 0;
        const colors = getBadgeColor(platform);

        const card = document.createElement('div');
        card.className = 'platform-card';
        card.style.animationDelay = `${(idx+1) * 0.1}s`;
        
        let itemsHtml = items.map(item => `
            <div class="item-row">
                <div>
                    <div class="item-name">${item.name}</div>
                    ${item.rating ? `<div style="font-size: 12px; color: gray;">⭐ ${item.rating.toFixed(1)}</div>` : ''}
                </div>
                <div class="item-price">₹${item.price.toFixed(2)}</div>
            </div>
        `).join('');

        card.innerHTML = `
            <div class="platform-header">
                <span class="platform-badge" style="background:${colors.bg}; color:${colors.color}">${platform}</span>
                <span class="platform-total">₹${subtotal.toFixed(2)}</span>
            </div>
            ${itemsHtml}
        `;
        container.appendChild(card);
    });

    // Needs review
    const reviewContainer = document.getElementById('needs-review-container');
    const reviewItems = document.getElementById('review-items');
    if (result.needs_review && result.needs_review.length > 0) {
        reviewContainer.classList.remove('hidden');
        reviewItems.innerHTML = result.needs_review.map(nr => `
            <div class="item-row">
                <div class="item-name">${nr.requested_item.name}</div>
                <span class="review-badge">No Matches</span>
            </div>
        `).join('');
    } else {
        reviewContainer.classList.add('hidden');
    }
}

document.getElementById('build-carts-btn').addEventListener('click', () => {
    // Simulate build execution
    showScreen('loading');
    document.getElementById('loading-message').innerText = "Building your carts...";
    document.getElementById('loading-submessage').innerText = "Executing in headless browsers...";

    setTimeout(() => {
        renderSummary();
        showScreen('summary');
    }, 2000);
});

function renderSummary() {
    const container = document.getElementById('summary-cards-container');
    container.innerHTML = '';

    const grouped = {};
    currentResult.winners.forEach(w => {
        if (!grouped[w.platform]) grouped[w.platform] = [];
        grouped[w.platform].push(w);
    });

    Object.keys(grouped).sort().forEach(platform => {
        const count = grouped[platform].length;
        const colors = getBadgeColor(platform);
        
        const card = document.createElement('div');
        card.className = 'platform-card';
        card.innerHTML = `
            <div class="platform-header" style="justify-content: flex-start; gap: 16px;">
                <span class="platform-badge" style="background:${colors.bg}; color:${colors.color}">${platform}</span>
                <span style="font-weight: 500;">✓ ${count} items added</span>
            </div>
        `;
        container.appendChild(card);
    });
}

document.getElementById('restart-btn').addEventListener('click', () => {
    inputEl.value = '';
    compareBtn.disabled = true;
    showScreen('input');
});
