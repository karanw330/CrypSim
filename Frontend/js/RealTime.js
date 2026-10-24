const datetime = new Date();
today_date = datetime.getFullYear() + '-' + (datetime.getMonth() + 1) + '-' + datetime.getDate();
const curr_time = datetime.getHours() + ':' + datetime.getMinutes() + ':' + datetime.getSeconds();
window.selected = 'BTC';
const price_url = `${window.APP_CONFIG.WS_BASE_URL}/ws/market`
const first_socket = new WebSocket(price_url);

async function getAccessToken() {
    let token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp - now < 60) { // Refresh if less than 1 minute left
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) return token;

            const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                return data.access_token;
            }
        }
    } catch (e) {
        console.error("Token error", e);
    }
    return token;
}

async function fetchWithAuth(url, options = {}) {
    const token = await getAccessToken();
    if (!token) {
        window.location.replace('./login_page.html');
        return;
    }
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    return fetch(url, options);
}

window.logout = function () {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.replace('./login_page.html');
};
window.curr_price_var = 'btc';
const order_panel = document.getElementById("order_panel");
let curr_price = Number("");
const inactive_span = document.getElementById("last_inactive_order");
const order_type = document.getElementById('order_type');

let symbol_placeholder = document.getElementById("symbol");
let price_placeholder = document.getElementById("curr_price");
let volume_placeholder = document.getElementById("volume");
let logo_placeholder = document.getElementById("logo");
let fname_placeholder = document.getElementById("fname");
let open_placeholder = document.getElementById("open");
let high_placeholder = document.getElementById("24H");
let low_placeholder = document.getElementById("24L");
let change = document.getElementById("change");

function clearFields() {
    symbol_placeholder.innerHTML = '';
    price_placeholder.innerHTML = '';
    volume_placeholder.innerHTML = '';
    logo_placeholder.setAttribute("src", '');
    fname_placeholder.innerHTML = '';
    open_placeholder.innerHTML = '';
    high_placeholder.innerHTML = '';
    low_placeholder.innerHTML = '';
}

function updateMarketDisplay(stocks_data, profileInfo) {
    curr_price = stocks_data.last_price;
    symbol_placeholder.innerHTML = profileInfo.live_fname;
    price_placeholder.innerHTML = '$' + Number(curr_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    volume_placeholder.innerHTML = Number(stocks_data.volume).toLocaleString('en-US');
    logo_placeholder.setAttribute("src", profileInfo.logo_src);
    fname_placeholder.innerHTML = stocks_data.symbol;
    open_placeholder.innerHTML = '$' + Number(stocks_data.openprice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    high_placeholder.innerHTML = '$' + Number(stocks_data.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    low_placeholder.innerHTML = '$' + Number(stocks_data.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const changeEl = document.getElementById("change");
    if (stocks_data.abs_change > 0) {
        changeEl.innerHTML = '+' + stocks_data.abs_change + ' (+' + stocks_data.perc_change + '%)';
        changeEl.className = "change-positive";
        changeEl.style.color = "#00ff88";
        changeEl.style.background = 'rgba(0, 255, 136, 0.1)';
    } else {
        changeEl.innerHTML = stocks_data.abs_change + ' (' + stocks_data.perc_change + '%)';
        changeEl.className = "change-negative";
        changeEl.style.color = "#ff4757";
        changeEl.style.background = 'rgba(255, 71, 87, 0.1)';
    }
}

let live_symbol = "";
let live_fname = "";
let logo_src = "";

window.profile = {
    'BINANCE:BTCUSDT': {
        "live_symbol": "BTC",
        "live_fname": "Bitcoin",
        "logo_src": "https://s3-symbol-logo.tradingview.com/crypto/XTVCBTC--big.svg",
        "curr_price_var": "btc"
    },
    'BINANCE:ETHUSDT': {
        "live_symbol": "ETH",
        "live_fname": "Ethereum",
        "logo_src": "https://s3-symbol-logo.tradingview.com/crypto/XTVCETH--big.svg",
        "curr_price_var": "eth"
    },
    'BINANCE:SOLUSDT': {
        "live_symbol": "SOL",
        "live_fname": "Solana",
        "logo_src": "https://s3-symbol-logo.tradingview.com/crypto/XTVCSOL--big.svg",
        "curr_price_var": "sol"
    },
    'BINANCE:BNBUSDT': {
        "live_symbol": "BNB",
        "live_fname": "Binance Coin",
        "logo_src": "https://s3-symbol-logo.tradingview.com/crypto/XTVCBNB--big.svg",
        "curr_price_var": "bnb"
    },
    'BINANCE:XRPUSDT': {
        "live_symbol": "XRP",
        "live_fname": "Ripple",
        "logo_src": "https://s3-symbol-logo.tradingview.com/crypto/XTVCXRP--big.svg",
        "curr_price_var": "xrp"
    },
    'BINANCE:DOGEUSDT': {
        "live_symbol": "DOGE",
        "live_fname": "Doge Coin",
        "logo_src": "https://s3-symbol-logo.tradingview.com/crypto/XTVCDOGE--big.svg",
        "curr_price_var": "dog"
    }
}

window.initialPriceLoadComplete = false;
first_socket.onmessage = function (event) {
    let stocks_data = JSON.parse(event.data);
    if (order_type.value === 'market') {
        priceChangeMarket();
    }


    live_symbol = profile[stocks_data.symbol].live_symbol;
    live_fname = profile[stocks_data.symbol].live_fname;
    logo_src = profile[stocks_data.symbol].logo_src;
    profile[stocks_data.symbol].price = Number(stocks_data.last_price);
    profile[stocks_data.symbol].entire = stocks_data; // Cache entire payload

    if (stocks_data.symbol === 'BINANCE:BTCUSDT') {
        if (curr_price_var === 'btc') { curr_price = profile["BINANCE:BTCUSDT"].price; }
    }
    else if (stocks_data.symbol === 'BINANCE:ETHUSDT') {
        if (curr_price_var === 'eth') { curr_price = profile["BINANCE:ETHUSDT"].price; }
    }
    else if (stocks_data.symbol === 'BINANCE:SOLUSDT') {
        if (curr_price_var === 'sol') { curr_price = profile["BINANCE:SOLUSDT"].price; }
    }
    else if (stocks_data.symbol === 'BINANCE:BNBUSDT') {
        if (curr_price_var === 'bnb') { curr_price = profile["BINANCE:BNBUSDT"].price; }
    }
    else if (stocks_data.symbol === 'BINANCE:XRPUSDT') {
        if (curr_price_var === 'xrp') { curr_price = profile["BINANCE:XRPUSDT"].price; }
    }
    else if (stocks_data.symbol === 'BINANCE:DOGEUSDT') {
        if (curr_price_var === 'dog') { curr_price = profile["BINANCE:DOGEUSDT"].price; }
    }

    window.symbol = stocks_data.symbol;
    if (symbol === selected) {
        window.updateMarketDisplay(stocks_data, window.profile[stocks_data.symbol]);
    }

    if (!window.initialPriceLoadComplete) {
        const requiredSymbols = Object.keys(window.profile);
        const allLoaded = requiredSymbols.every(s => window.profile[s].price !== undefined);

        if (allLoaded) {
            window.initialPriceLoadComplete = true;
            syncDashboard();
        }
    }

    // Update active order cards for this symbol
    const orderCards = document.querySelectorAll(`.order-price-change[data-symbol="${stocks_data.symbol}"]`);
    orderCards.forEach(card => {
        const entryPrice = parseFloat(card.getAttribute('data-entry'));
        const side = card.getAttribute('data-side') || 'Buy';
        const livePrice = profile[stocks_data.symbol].price;
        if (entryPrice && livePrice) {
            let perc = 0;
            if (side === 'Buy') {
                perc = ((livePrice - entryPrice) / entryPrice) * 100;
            } else {
                perc = ((entryPrice - livePrice) / entryPrice) * 100;
            }
            const percFixed = perc.toFixed(2);
            card.textContent = (percFixed >= 0 ? '+' : '') + percFixed + '%';
            card.style.color = percFixed >= 0 ? '#00ff88' : '#ff4757';
        }
    });

    // Removal of high-frequency syncDashboard call as per user request (switched to interval)
};


const user_trade_url = `${window.APP_CONFIG.WS_BASE_URL}/ws/user/trades?token=` + (localStorage.getItem('access_token') || "");
const second_socket = new WebSocket(user_trade_url);
const last = document.getElementById("last");
function createActiveOrderCard(order) {
    const order_id = order.order_id || order.id || 1;
    const order_symbol = order.symbol;
    const order_buy_sell = order.order || order.buy_sell || order.side || "Buy";
    const timestamp = order.timestamp || (order.date + " " + order.time);
    const order_date = timestamp.split(' ')[0];
    const order_time = timestamp.split(' ')[1] || "";
    const order_price = (order.order_price || order.price || 0).toLocaleString('en-US');
    const order_quantity = order.order_quantity || order.quantity || 0;
    const entry_price = order.entry_price || order.entry || 0;
    const new_entry_price = entry_price.toLocaleString('en-US');
    const calc_new_entry_price = Number(entry_price);
    return `
    <div class="cards-container" id="ODID${order_id}">
        <div class="trade-order-card" style="height: 23vh;margin-bottom: 10px;">
            <div class="order-card-header">
                <div class="trade-coin-info">
                    <div class="trade-coin-details">
                        <h3> <img src="${profile[order_symbol].logo_src}" width="23%" height="23%" style="border-radius:50%;margin-top: 0;position:relative;top:5px;">  ${profile[order_symbol].live_fname}</h3>
                        <p></p>
                    </div>
                    <div class="order-info-group">
                        <p class="order-value trade-order-type" data-type="${order_buy_sell.trim()}">${order_buy_sell}</p>
                    </div>
                </div>
                <div class="order-price-change" id="order-${order_id}_order_change" 
                     data-side="${order_buy_sell}" 
                     data-symbol="${order_symbol}" 
                     data-entry="${calc_new_entry_price}">
                    ${profile[order_symbol].price ? (
            order_buy_sell === 'Buy'
                ? (((Number(profile[order_symbol].price) - calc_new_entry_price) / Number(calc_new_entry_price)) * 100).toFixed(2)
                : (((calc_new_entry_price - Number(profile[order_symbol].price)) / Number(calc_new_entry_price)) * 100).toFixed(2)
        ) : 0}%
                </div>
            </div>

            <div class="order-card-body">
                <div class="order-body-row">
                    <div class="order-info-group">
                        <h4>Entry Price</h4>
                        <p class="order-value">$${new_entry_price}</p>
                    </div>
                    <div class="order-info-group">
                        <h4>Time Created</h4>
                        <p class="order-value">${order_date} | ${order_time}</p>
                    </div>
                </div>
                <div class="order-body-row">
                    <div class="order-info-group">
                        <h4>Quantity</h4>
                        <p class="order-value order-amount-value">${order_quantity}</p>
                    </div>
                    <div class="order-info-group">
                        <h4>Total Value</h4>
                        <p class="order-value order-amount-value">$${order_price}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function createInactiveOrderCard(order) {
    const order_id = order.order_id || order.id || 1;
    const order_symbol = order.symbol;
    const order_buy_sell = order.order || order.buy_sell || order.side || "Buy";
    const timestamp = order.timestamp || (order.date + " " + order.time);
    const order_date = timestamp.split(' ')[0];
    const order_time = timestamp.split(' ')[1] || "";
    const order_quantity = order.order_quantity || order.quantity || 0;
    const entry_price = order.entry_price || order.price || 0;
    const new_entry_price = entry_price.toLocaleString('en-US');
    const order_price = (order.order_price || order.price || 0).toLocaleString('en-US');
    const order_limit = order.limit_value !== undefined ? (order.limit_value === 0 ? "-" : order.limit_value) : (order.limit || "-");
    const order_stop = order.stop_value !== undefined ? (order.stop_value === 0 ? "-" : order.stop_value) : (order.stop_price || "-");
    const order_type = (order.order_type || "LIMIT").toUpperCase();

    return `<div class="cards-container" id="ODID${order_id}">
        <div class="trade-order-card">
            <div class="order-card-header">
                <div class="trade-coin-info">
                    <div class="trade-coin-details">
                        <h3><img src="${profile[order_symbol].logo_src}" width="17%" height="17%" style="border-radius:50%;margin-top: 0;position:relative;top:5px;"> <span id="ASSET${order_id}">${profile[order_symbol].live_fname}</span></h3>
                    </div>
                    <div class="order-info-group">
                        <p class="order-value trade-order-type" data-type="${order_buy_sell.trim()}" id="BS${order_id}">${order_buy_sell}</p>
                    </div>
                    <p style="margin-left: 45%;" id="TYPE${order_id}">${order_type}</p>
                </div>
            </div>

            <div class="order-card-body">
                <div class="order-body-row">
                    <div class="order-info-group">
                        <h4>Entry Price</h4>
                        <p class="order-value">$<span id="ENTRY${order_id}">${new_entry_price}</span></p>
                    </div>
                    <div class="order-info-group">
                        <h4>Time Created</h4>
                        <p class="order-value">${order_date} | ${order_time}</p>
                    </div>
                    <div class="order-info-group">
                        <h4>Quantity</h4>
                        <p class="order-value" id="Q${order_id}">${order_quantity}</p>
                    </div>
                </div>
                <div class="order-body-row">
                    <div class="order-info-group">
                        <h4>Total Value</h4>
                        <p class="order-value order-amount-value">$<span id="TOT${order_id}">${order_price}</span></p>
                    </div>
                    <div class="order-info-group">
                        <h4>Limit</h4>
                        <p class="order-value order-amount-value" id="LIM${order_id}">${order_limit}</p>
                    </div>
                    <div class="order-info-group">
                        <h4>Stop</h4>
                        <p class="order-value order-amount-value" id="STOP${order_id}">${order_stop}</p>
                    </div>
                </div>
            </div>

            <div class="order-card-actions" style="margin-bottom: 100px;">
                <button class="order-action-btn order-close-btn" id="DEL${order_id}" onclick="delete_order(this.id)">Close trade</button>
                <button class="order-action-btn order-modify-btn" id="${order_id}" onclick="showModifyModal(this.id)">Modify Order</button>
            </div>
        </div>
    </div>`;
}

second_socket.onmessage = function (event) {
    let user_trade_data = JSON.parse(event.data);

    if (user_trade_data["data_type"] === "balance_update") {
        const newBalance = parseFloat(user_trade_data.balance_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (document.getElementById("cash_available")) document.getElementById("cash_available").innerText = `$${newBalance}`;
        if (document.getElementById("buying_power")) document.getElementById("buying_power").innerText = `$${newBalance}`;
        // Refresh dashboard stats to update Total Equity/P&L
        if (typeof syncDashboard === 'function') syncDashboard();
    }
    else if (user_trade_data["data_type"] === "static_trades") {
        for (let index = 0; index < user_trade_data.data.length; index++) {
            const order = user_trade_data.data[index];
            if (order.status === "completed") {
                if (last) last.insertAdjacentHTML("afterbegin", createActiveOrderCard(order));
            } else if (order.status === "active") {
                if (inactive_span) inactive_span.insertAdjacentHTML("afterbegin", createInactiveOrderCard(order));
            }
        }
    }
    else if (user_trade_data['data_type'] === 'new_order') {
        clearOrderFields();
        const order = user_trade_data.data;
        if (order.status === "completed") {
            if (last) last.insertAdjacentHTML("afterbegin", createActiveOrderCard(order));
        } else if (order.status === "active") {
            if (inactive_span) inactive_span.insertAdjacentHTML("afterbegin", createInactiveOrderCard(order));
        }
    }
    else if (user_trade_data['data_type'] === 'limit_triggered' || user_trade_data['data_type'] === 'stop_loss_triggered') {
        showTradeNotification(`Order #${user_trade_data.order_id} executed!`, 5000);
        // Remove from pending
        const order_id = user_trade_data.order_id;
        const element = document.getElementById(`ODID${order_id}`);
        if (element) element.remove();
        syncDashboard(); // Refresh balances and past orders
    }
};

async function syncDashboard() {
    try {
        // 1. Fetch User Profile (Balance)
        const userRes = await fetchWithAuth(`${window.APP_CONFIG.API_BASE_URL}/users/me/`);
        let userBalance = 0;
        let lockedUsd = 0;

        if (userRes && userRes.ok) {
            const userData = await userRes.json();
            userBalance = userData.balance_usd;
            lockedUsd = userData.locked_usd || 0;

            // Update user menu initials
            if (document.getElementById('stockUserMenu')) {
                document.getElementById('stockUserMenu').textContent = userData.username.substring(0, 2).toUpperCase();
            }

            // Update Home dashboard elements
            if (document.getElementById('cash_available')) {
                document.getElementById('cash_available').textContent = `$${userBalance.toLocaleString('en-US')}`;
            }
            if (document.getElementById('buying_power')) {
                document.getElementById('buying_power').textContent = `$${(userBalance - lockedUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }

            if (document.getElementById('dashboard_buying_power')) {
                document.getElementById('dashboard_buying_power').textContent = `Buying Power: $${(userBalance - lockedUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }

            // Update user initials
            if (document.getElementById('stockUserMenu') && userData.full_name) {
                const names = userData.full_name.split(' ');
                const initials = names.map(n => n[0]).join('').toUpperCase();
                document.getElementById('stockUserMenu').textContent = initials;
            }
        }

        // 2. Fetch Pending Orders
        const orderRes = await fetchWithAuth(`${window.APP_CONFIG.API_BASE_URL}/users/me/orders`);
        if (orderRes && orderRes.ok) {
            const orders = await orderRes.json();
            if (inactive_span) {
                inactive_span.innerHTML = '';
                const pendingOrders = orders.filter(o => o.status === 'active' || o.status === 'inactive');
                if (pendingOrders.length === 0) {
                    inactive_span.innerHTML = '<div class="orders-empty-state">No pending orders</div>';
                } else {
                    pendingOrders.forEach(order => {
                        inactive_span.insertAdjacentHTML("afterbegin", createInactiveOrderCard(order));
                    });
                }
            }
        }

        // 3. Fetch Past Trades
        const tradeRes = await fetchWithAuth(`${window.APP_CONFIG.API_BASE_URL}/users/me/trades`);
        let allTrades = [];
        if (tradeRes && tradeRes.ok) {
            allTrades = await tradeRes.json();
            if (last) {
                last.innerHTML = '';
                if (allTrades.length === 0) {
                    last.innerHTML = '<div class="orders-empty-state">No past trades</div>';
                } else {
                    allTrades.forEach(trade => {
                        last.insertAdjacentHTML("afterbegin", createActiveOrderCard(trade));
                    });
                }
            }
        }

        // 4. Fetch Portfolio (Holdings) & Calculate ROI
        const portfolioRes = await fetchWithAuth(`${window.APP_CONFIG.API_BASE_URL}/users/me/items/`);
        if (portfolioRes && portfolioRes.ok) {
            const holdings = await portfolioRes.json();
            const holdingsList = document.getElementById('dashboard_holdings_list');

            let totalHoldingsValue = 0;
            if (holdingsList) {
                holdingsList.innerHTML = '';
            }

            if (holdings.length === 0 && holdingsList) {
                holdingsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">No holdings yet</div>';
            }

            holdings.forEach(item => {
                const symbol = item.item_id;
                const amount = item.amount || 0;
                const lockedTokens = item.locked_tokens || 0;
                const totalUnits = amount + lockedTokens;


                // const priceInfo = Object.values(profile).find(p => p.live_symbol === symbol || p.curr_price_var === symbol);

                // const currentPrice = priceInfo ? (priceInfo.price || 0) : 0;
                const currentPrice = profile[symbol].price || 0;
                const val = totalUnits * currentPrice;
                totalHoldingsValue += val;

                if (holdingsList) {
                    // Calculate average cost for this symbol (based on available + locked)
                    const symbolTrades = allTrades.filter(t => t.symbol.includes(symbol));
                    let totalCost = 0;
                    let totalQty = 0;
                    symbolTrades.forEach(t => {
                        if (t.side === 'Buy') {
                            totalCost += (t.quantity * t.price);
                            totalQty += t.quantity;
                        }
                    });
                    const avgPrice = totalQty > 0 ? totalCost / totalQty : 0;
                    const roi = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

                    const coinName = priceInfo ? priceInfo.live_fname : symbol;
                    const logo = priceInfo ? priceInfo.logo_src : "";

                    holdingsList.insertAdjacentHTML('beforeend', `
                        <div class="stock-item">
                            <div class="stock-info">
                                <div class="stock-icon" style="background: rgba(255,255,255,0.1);"><img src="${logo}" width="100%" height="100%" style="border-radius:50%"></div>
                                <div class="stock-details">
                                    <h4>${coinName}</h4>
                                    <p>${symbol} • ${totalUnits.toFixed(4)} units ${lockedTokens > 0 ? `(${lockedTokens.toFixed(4)} locked)` : ''}</p>
                                    <p style="font-size: 0.8em; color: ${roi >= 0 ? '#00ff88' : '#ff4757'}">
                                        Avg: $${avgPrice.toLocaleString()} • ROI: ${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                            <div class="stock-price">
                                <div class="price">$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div class="change" style="color: #888;">Live: $${currentPrice.toLocaleString()}</div>
                            </div>
                        </div>
                    `);
                }
            });

            // Update Total Stats
            const totalEquity = userBalance + lockedUsd + totalHoldingsValue;
            const initialBalance = 100000;
            const totalProfit = totalEquity - initialBalance;
            const profitPerc = (totalProfit / initialBalance) * 100;

            if (document.getElementById('dashboard_total_value')) {
                document.getElementById('dashboard_total_value').textContent = `$${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            if (document.getElementById('dashboard_total_perc_change')) {
                document.getElementById('dashboard_total_perc_change').textContent = `${profitPerc >= 0 ? '+' : ''}${profitPerc.toFixed(2)}%`;
                document.getElementById('dashboard_total_perc_change').className = profitPerc >= 0 ? 'stats-change positive' : 'stats-change negative';
            }
            if (document.getElementById('dashboard_total_profit')) {
                document.getElementById('dashboard_total_profit').textContent = `${totalProfit >= 0 ? '+' : '-'}$${Math.abs(totalProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                document.getElementById('dashboard_total_profit').className = totalProfit >= 0 ? 'stats-value positive' : 'stats-value negative';
            }

            // --- Home Page Specific Metrics ---
            if (document.getElementById('portfolio_value')) {
                document.getElementById('portfolio_value').textContent = `$${totalHoldingsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            if (document.getElementById('total_equity')) {
                document.getElementById('total_equity').textContent = `$${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            if (document.getElementById('day_pnl')) {
                document.getElementById('day_pnl').textContent = `${totalProfit >= 0 ? '+' : '-'}$${Math.abs(totalProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                document.getElementById('day_pnl').style.color = totalProfit >= 0 ? '#00ff88' : '#ff4757';
            }
        }
    } catch (e) {
        console.error("Sync error:", e);
    }
}

window.addEventListener('load', () => {
    // syncDashboard(); // Deferred until price load
    // Re-sync every 5 minutes (300,000 ms) instead of on every price tick
    setInterval(syncDashboard, 300000);

    // Safety fallback: if prices take too long, sync anyway
    setTimeout(() => {
        if (!window.initialPriceLoadComplete) {
            console.warn("Price load timed out, forcing dashboard sync");
            window.initialPriceLoadComplete = true;
            syncDashboard();
        }
    }, 6000); // Increased to 6s to allow for slower connections
});

const symbolMap = {
    "BTC - Bitcoin": { chart: "BINANCE:BTCUSD", symbol: "BINANCE:BTCUSDT", var: "btc" },
    "ETH - Ethereum": { chart: "BINANCE:ETHUSD", symbol: "BINANCE:ETHUSDT", var: "eth" },
    "SOL - Solana": { chart: "BINANCE:SOLUSD", symbol: "BINANCE:SOLUSDT", var: "sol" },
    "BNB - Binance Coin": { chart: "BINANCE:BNBUSD", symbol: "BINANCE:BNBUSDT", var: "bnb" },
    "XRP - Ripple": { chart: "BINANCE:XRPUSD", symbol: "BINANCE:XRPUSDT", var: "xrp" },
    "DOGE - Doge Coin": { chart: "BINANCE:DOGEUSD", symbol: "BINANCE:DOGEUSDT", var: "dog" },
};

class FinancialSelector {
    constructor() {
        this.button = document.getElementById('selectorButton');
        this.menu = document.getElementById('dropdownMenu');
        this.list = document.getElementById('dropdownList');
        this.arrow = document.getElementById('arrowIcon');
        this.selectedText = this.button.querySelector('.selected-text');
        this.isOpen = false;
        this.selectedIndex = -1;

        this.securities = [
            { symbol: 'BTC', name: 'Bitcoin' },
            { symbol: 'ETH', name: 'Ethereum' },
            { symbol: 'SOL', name: 'Solana' },
            { symbol: 'BNB', name: 'Binance Coin' },
            { symbol: 'XRP', name: 'Ripple' },
            { symbol: 'DOGE', name: 'Doge Coin' }
        ];

        this.init();
    }

    init() {
        this.renderItems();
        this.bindEvents();
        this.selectItem(0);
    }

    renderItems() {
        this.list.innerHTML = '';

        this.securities.forEach((security, index) => {
            const item = document.createElement('li');
            item.className = 'dropdown-item';
            item.dataset.index = index;

            item.innerHTML = `
                        <div>
                            <span class="item-symbol">${security.symbol}</span>
                            <span class="item-name">${security.name}</span>
                        </div>  
                    `;

            this.list.appendChild(item);
        });
    }

    bindEvents() {
        // Toggle dropdown
        this.button.addEventListener('click', () => {
            this.toggle();
        });

        // Item selection
        this.list.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (item) {
                this.selectItem(parseInt(item.dataset.index));
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.button.contains(e.target) && !this.menu.contains(e.target)) {
                this.close();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            switch (e.key) {
                case 'Escape':
                    this.close();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateDown();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateUp();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.selectedIndex >= 0) {
                        this.selectItem(this.selectedIndex);
                    }
                    break;
            }
        });

        // Hover effects for keyboard navigation
        this.list.addEventListener('mouseover', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (item) {
                this.clearSelection();
                this.selectedIndex = parseInt(item.dataset.index);
                item.classList.add('selected');
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.menu.classList.add('open');
        this.arrow.classList.add('rotated');
        this.button.classList.add('active');

        // Reset animations by removing and re-adding items
        const items = this.list.querySelectorAll('.dropdown-item');
        items.forEach((item, index) => {
            item.style.animation = 'none';
            item.offsetHeight; // Trigger reflow
            item.style.animation = null;
        });
    }

    close() {
        this.isOpen = false;
        this.menu.classList.remove('open');
        this.arrow.classList.remove('rotated');
        this.button.classList.remove('active');
        this.clearSelection();
        this.selectedIndex = -1;
    }


    selectItem(index) {
        const security = this.securities[index];
        this.selectedText.textContent = `${security.symbol} - ${security.name}`;
        let selectedSymbol = document.getElementById("selected-symbol").innerHTML;
        window.curr_order_symbol = symbolMap[selectedSymbol].symbol;

        let config = symbolMap[selectedSymbol];
        if (config) {
            clearFields();
            clearOrderFields();

            // Instant UI Update from Cache
            const cachedData = profile[config.symbol] ? profile[config.symbol].entire : null;
            if (cachedData) {
                updateMarketDisplay(cachedData, profile[config.symbol]);
            }

            order_type.value = "market";
            renderTradingViewChart(config.chart);
            window.selected = config.symbol;
            window.curr_price_var = config.var;
        }

        this.close();
    }

    navigateDown() {
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.securities.length - 1);
        this.updateSelection();
    }

    navigateUp() {
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
    }

    updateSelection() {
        this.clearSelection();
        const items = this.list.querySelectorAll('.dropdown-item');
        if (items[this.selectedIndex]) {
            items[this.selectedIndex].classList.add('selected');
            items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    clearSelection() {
        this.list.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('selected');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FinancialSelector();
});

const StockMarketHeader = {
    // Initialize user interactions
    initUserInteractions: function () {
        const portfolioBtn = document.getElementById('stockPortfolioBtn');
        const userMenu = document.getElementById('stockUserMenu');

        if (portfolioBtn) {
            portfolioBtn.addEventListener('click', function () {
                window.dispatchEvent(new CustomEvent('stockPortfolioClick'));
            });
        }

        if (userMenu) {
            const dropdown = document.getElementById('userDropdown');
            const logoutBtn = document.getElementById('logoutBtn');

            userMenu.addEventListener('click', function (e) {
                e.stopPropagation();
                if (dropdown) dropdown.classList.toggle('active');
            });

            document.addEventListener('click', function (e) {
                if (dropdown && !userMenu.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });

            if (logoutBtn) {
                logoutBtn.addEventListener('click', function () {
                    window.logout();
                });
            }
        }
    },

    initTickerInteractions: function () {
        const ticker = document.getElementById('stockTickerContent');
        if (ticker) {
            ticker.addEventListener('mouseenter', () => {
                ticker.style.animationPlayState = 'paused';
            });
            ticker.addEventListener('mouseleave', () => {
                ticker.style.animationPlayState = 'running';
            });
        }
    },

    // Initialize all components
    init: function () {
        this.initUserInteractions();
        this.initTickerInteractions();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => StockMarketHeader.init());
} else {
    StockMarketHeader.init();
}
let order = "Buy";

function switchTab(tab, type) {
    document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const button = document.getElementById('quickOrderBtn');
    if (type === 'buy') {
        button.textContent = 'Place Buy Order';
        button.classList.remove('sell-btn');
        order = "Buy";
    } else {
        button.textContent = 'Place Sell Order';
        button.classList.add('sell-btn');
        order = "Sell";
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const price = document.querySelector('.current-price');
    if (price) {
        setInterval(() => {
            price.classList.add('pulse');
            setTimeout(() => price.classList.remove('pulse'), 1000);
        }, 5000);
    }

});

const order_quantity = document.getElementById('order_quantity');
const order_price = document.getElementById('order_price');
const stop_value = document.getElementById('stop_value');
const limit_value = document.getElementById('limit_value');
order_price.readOnly = true;

function priceChangeMarket() {
    order_price.value = (Number(order_quantity.value) * curr_price).toFixed(2);
}

function priceChangeLimit() {
    order_price.value = (Number(order_quantity.value) * Number(limit_value.value)).toFixed(2);
}

function priceChangeStop() {
    order_price.value = (Number(order_quantity.value) * Number(stop_value.value)).toFixed(2);
}

function clearOrderFields() {
    order_quantity.value = "";
    order_price.value = "";
    stop_value.value = "";
    limit_value.value = "";
}

function validation() {
    clearOrderFields();
    if (order_type.value === 'market') {
        limit_value.readOnly = true;
        stop_value.readOnly = true;
        order_quantity.addEventListener('input', priceChangeMarket);
        order_quantity.removeEventListener('input', priceChangeStop);
        order_quantity.removeEventListener('input', priceChangeLimit);
        limit_value.removeEventListener('input', priceChangeLimit);
        stop_value.removeEventListener('input', priceChangeLimit);
    }
    else if (order_type.value === 'limit') {
        limit_value.readOnly = false;
        stop_value.readOnly = true;
        limit_value.value = Number(curr_price);
        limit_value.addEventListener('input', priceChangeLimit);
        order_quantity.removeEventListener('input', priceChangeMarket);
        order_quantity.addEventListener('input', priceChangeLimit);
        order_quantity.removeEventListener('input', priceChangeStop);
        stop_value.removeEventListener('input', priceChangeLimit);
    }
    else if (order_type.value === 'stop-loss') {
        limit_value.readOnly = true;
        stop_value.readOnly = false;
        stop_value.value = Number(curr_price);
        limit_value.removeEventListener('input', priceChangeLimit);
        order_quantity.addEventListener('input', priceChangeStop);
        order_quantity.removeEventListener('input', priceChangeLimit);
        order_quantity.removeEventListener('input', priceChangeMarket);
        stop_value.addEventListener('input', priceChangeLimit);
    }
    else {
        limit_value.readOnly = false;
        stop_value.readOnly = false;
        stop_value.value = Number(curr_price);
        limit_value.value = Number(curr_price);
        limit_value.addEventListener('input', priceChangeLimit);
        order_quantity.removeEventListener('input', priceChangeMarket);
        order_quantity.removeEventListener('input', priceChangeStop);
        order_quantity.addEventListener('input', priceChangeLimit);
        stop_value.removeEventListener('input', priceChangeLimit);
    }
}

order_type.addEventListener('change', validation);
window.addEventListener('DOMContentLoaded', validation);


function checkOrderMod() {
    let trx_type = document.getElementById("trxOrderType").innerText.toUpperCase();
    let trx_quan = parseFloat(document.getElementById("trxVolumeInput").value) || 0;
    let trx_limval = parseFloat(document.getElementById("trxLimitInput").value) || 0;
    let trx_stopval = parseFloat(document.getElementById("trxStopInput").value) || 0;
    let trx_aggregate_el = document.getElementById("trxAggregateSum");

    if (trx_type.includes("LIMIT")) {
        trx_aggregate_el.innerText = '$' + (trx_limval * trx_quan).toFixed(2);
    }
    else {
        trx_aggregate_el.innerText = '$' + (trx_stopval * trx_quan).toFixed(2);
    }
}

function showModifyModal(id) {
    localStorage.setItem('current_mod_id', id);

    let asset = document.getElementById(`ASSET${id}`).innerText;
    let quan = document.getElementById(`Q${id}`).innerText;
    let entry = document.getElementById(`ENTRY${id}`).innerText;
    let lim = document.getElementById(`LIM${id}`).innerText;
    let stop = document.getElementById(`STOP${id}`).innerText;
    let bs = document.getElementById(`BS${id}`).innerText;
    let type = document.getElementById(`TYPE${id}`).innerText;
    document.getElementById("trxOrderType").innerText = type + " (" + bs + ")";
    document.getElementById("trxAssetIdentifier").innerText = asset;
    // document.getElementById("trxEntryQuote").innerText='$'+entry;
    const modLim = document.getElementById("trxLimitInput");
    const modStop = document.getElementById("trxStopInput")
    const modQuan = document.getElementById("trxVolumeInput");
    modLim.value = lim;
    modStop.value = stop;
    modQuan.value = quan;
    if (lim === "-") {
        document.getElementById("trxLimitQuote").classList.add("hide_modal");
    }
    else {
        document.getElementById("trxLimitQuote").classList.remove("hide_modal");
    }
    if (stop === "-") {
        document.getElementById("trxStopQuote").classList.add("hide_modal");
    }
    else {
        document.getElementById("trxStopQuote").classList.remove("hide_modal");
    }
    const modify_modal = document.getElementById("modify-modal");
    modify_modal.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
    checkOrderMod();
}

function dismissAlterationPanel() {
    let modal = document.getElementById('modify-modal');
    modal.classList.remove('modal-active');
    document.body.style.overflow = 'auto';
}


function showOrderModal() {
    let html_code = "";
    try {
        document.getElementById("lim").remove();
        document.getElementById("stop").remove();
    }
    catch (error) {
    }
    if (order_type.value === "limit") {
        html_code = `<div class="summary-row" id="lim">
                        <span class="summary-label">Limit</span>
                        <span class="summary-value" id="limitValue">$${Number(limit_value.value)}</span>
                    </div>`
    }
    else if (order_type.value === "stop-loss") {
        html_code = `<div class="summary-row" id="stop">
                        <span class="summary-label">Stop Value</span>
                        <span class="summary-value" id="stopValue">$${Number(stop_value.value)}</span>
                    </div>`
    }
    else {
        html_code = `<div class="summary-row" id="lim">
                        <span class="summary-label">Limit</span>
                        <span class="summary-value" id="limitValue">$${Number(limit_value.value)}</span>
                    </div>
                    <div class="summary-row" id="stop">
                        <span class="summary-label">Stop Value</span>
                        <span class="summary-value" id="quantityValue">$${Number(stop.value)}</span>
                    </div>`
    }
    if (order_type.value !== "market") {
        document.getElementById("pric").insertAdjacentHTML("beforebegin", html_code);
    }
    let orderConfirm = {
        "order": order,
        "entry_price": curr_price,
        "order_type": order_type.value,
        "order_quantity": Number(order_quantity.value),
        "order_price": Number(order_price.value),
        "limit_value": Number(limit_value.value),
        "stop_value": Number(stop_value.value),
        "status": "active",
        "symbol": curr_order_symbol,
        "date": today_date,
        "time": curr_time
    };
    if (orderConfirm["order_price"] != 0 && orderConfirm["order_price"]) {
        const modal = document.getElementById('orderConfirmModal');

        if (orderConfirm) {
            updateModalContent(orderConfirm);
        }

        modal.classList.add('modal-active');
        document.body.style.overflow = 'hidden';
    } else { alert("Please fill all the required fields"); }
}

function hideOrderModal() {
    const modal = document.getElementById('orderConfirmModal');
    modal.classList.remove('modal-active');
    document.body.style.overflow = 'auto';
}

function updateModalContent() {
    if (order_type) {
        document.getElementById('orderTypeValue').textContent = order_type.value + " " + order;
    }
    if (curr_order_symbol) {
        document.getElementById('assetValue').textContent = profile[curr_order_symbol].live_fname;
    }
    if (order_quantity.value) {
        document.getElementById('quantityValue').textContent = order_quantity.value;
    }
    if (curr_price) {
        document.getElementById('priceValue').textContent = "$" + curr_price;
    }
    if (order_price.value) {
        document.getElementById('totalValue').textContent = "$" + order_price.value;
    }
}

// Close modal when clicking outside
document.getElementById('orderConfirmModal').addEventListener('click', function (e) {
    if (e.target === this) {
        hideOrderModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('orderConfirmModal').classList.contains('modal-active')) {
        hideOrderModal();
    }
});


loadingSVG = `
<svg width="50" height="50" fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"><animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite"/></path></svg>
`;
let temphtml = ``;
let box = document.getElementById("orderConfirmModal");

function update() {
    let trx_type = document.getElementById("trxOrderType").innerText;
    let trx_quan = +document.getElementById("trxVolumeInput").value;
    let trx_limval = +parseFloat(document.getElementById("trxLimitInput").value);
    let trx_stopval = +parseFloat(document.getElementById("trxStopInput").value);
    let trx_aggregate = document.getElementById("trxAggregateSum");
    const in_box = document.getElementById("inner-modify");
    const confirmBtn = document.querySelector('.trx-execute-control');
    const originalText = confirmBtn.innerText;

    confirmBtn.disabled = true;
    confirmBtn.innerText = "Updating...";

    temphtml = in_box.innerHTML;
    fetchWithAuth(`${window.APP_CONFIG.API_BASE_URL}/updateorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "order_id": Number(localStorage.getItem('current_mod_id')),
            "order_type": trx_type,
            "order_quantity": trx_quan,
            "limit_value": trx_limval,
            "stop_value": trx_stopval,
            "order_price": Number(trx_aggregate.innerText.replace('$', ''))
        })
    })
        .then(response => {
            confirmBtn.disabled = false;
            confirmBtn.innerText = originalText;
            if (!response) return;
            if (!response.ok) {
                return response.json().then(err => {
                    showTradeFailureNotification(err.detail || "Update failed", 5000);
                    throw new Error(err.detail);
                });
            }
            return response.json();
        })
        .then(result => {
            if (result) {
                if (result.status === "ok") {
                    showTradeNotification("Order updated successfully", 5000);
                    dismissAlterationPanel();
                    syncDashboard();
                } else {
                    showTradeFailureNotification(result.reason || result.detail || "Update failed", 5000);
                }
            }
        })
        .catch(e => console.error("Update error", e));
}

function update_conf(temp, status, obj) {
    document.getElementById("inner-modify").innerHTML = temp;
    if (status === "ok") {
        showTradeNotification(`Order # updated!`, 10000);
    }
    else {
        showTradeFailureNotification("Failed to update order", 10000);
    }
    dismissAlterationPanel();
    const in_box = document.getElementById("inner-modify");
}

function delete_order(button_id) {
    const odid = button_id.replace("DEL", "");
    const btn = document.getElementById(button_id);
    const originalText = btn.innerText;

    btn.disabled = true;
    btn.innerText = "Closing...";

    const element = document.getElementById(`ODID${odid}`);

    fetchWithAuth(`${window.APP_CONFIG.API_BASE_URL}/delorder`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "order_id": odid })
    })
        .then(response => {
            btn.disabled = false;
            btn.innerText = originalText;
            if (!response) return;
            if (!response.ok) {
                return response.json().then(err => {
                    showTradeFailureNotification(err.detail || "Deletion failed", 5000);
                    throw new Error(err.detail);
                });
            }
            return response.json();
        })
        .then(result => {
            if (result && result.status === "ok") {
                showTradeNotification(`Order #${odid} closed!`, 5000);
                if (element) element.remove();
                syncDashboard();
            } else if (result) {
                showTradeFailureNotification(result.reason || result.detail || `Failed to close order #${odid}`, 5000);
            }
        })
        .catch(e => console.error("Delete error", e));
}

function del_conf(status, odid) {
    if (status === "ok") {
        showTradeNotification(`Order #${odid} deleted!`, 10000);
    }
    else {
        showTradeFailureNotification(`Order deletion failed`, 10000);
    }
}

// tells if active tab is buy or sell
function orderDetails() {
    if (order_quantity.value != 0 && order_price.value != 0) {
        const confirmBtn = document.querySelector('.confirm-btn');
        const originalText = confirmBtn.innerText;
        confirmBtn.disabled = true;
        confirmBtn.innerText = "Placing Order...";

        let order_data = {
            "order_id": 0, // Backend assigns ID
            "order": order,
            "entry_price": curr_price,
            "order_type": order_type.value,
            "order_quantity": Number(order_quantity.value),
            "order_price": Number(order_price.value),
            "limit_value": Number(limit_value.value),
            "stop_value": Number(stop_value.value),
            "status": "active",
            "symbol": curr_order_symbol,
            "date": today_date,
            "time": curr_time
        }
        fetchWithAuth(`${window.APP_CONFIG.API_BASE_URL}/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order_data)
        })
            .then(response => {
                confirmBtn.disabled = false;
                confirmBtn.innerText = originalText;
                if (!response) return;
                if (!response.ok) {
                    return response.json().then(err => {
                        showTradeFailureNotification(err.detail || "Order failed", 5000);
                        throw new Error(err.detail);
                    });
                }
                return response.json();
            })
            .then(result => {
                if (result && result.status === "ok") {
                    showTradeNotification("Order placed successfully!", 5000);
                    hideOrderModal();
                    clearOrderFields();
                    syncDashboard();
                } else if (result) {
                    showTradeFailureNotification(result.reason || result.detail || "Order failed", 5000);
                    hideOrderModal();
                }
            })
            .catch(e => console.error("Order error", e));
    }
}

function confirmOrder(status) {
    hideOrderModal();
    box.innerHTML = temphtml;
    if (status === "ok") {
        showTradeNotification("Order placed!", 10000);
    }
    else {
        showTradeFailureNotification("Order failed to execute", 10000);
    }
}

function renderTradingViewChart(symbol) {
    const container = document.getElementById("chart-container");

    // Clear previous widget
    container.innerHTML = `
    <div class="tradingview-widget-container" style="height:100%;width:100%;border-radius:25px;">
      <div id="tv-chart" class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%;border-radius:25px;"></div>
      <div class="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
          <span class="blue-text">Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  `;

    const config = {
        autosize: true,
        symbol: symbol,
        interval: "60",
        timezone: "Asia/Kolkata",
        theme: "dark",
        style: "1",
        locale: "en",
        hide_legend: true,
        withdateranges: true,
        allow_symbol_change: false,
        save_image: false,
        hide_volume: true,
        container_id: "tv-chart",
        support_host: "https://www.tradingview.com"
    };

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify(config);

    container.querySelector(".tradingview-widget-container").appendChild(script);
}

renderTradingViewChart("BINANCE:BTCUSD");

function showTradeNotification(message, duration) {
    if (!duration) {
        duration = 4000;
    }

    let container = document.getElementById('tsNotificationContainer');

    let notification = document.createElement('div');
    notification.className = 'ts__notification__card__j48s';

    let icon = document.createElement('div');
    icon.className = 'ts__notification__icon__p54w';
    icon.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>';

    let content = document.createElement('div');
    content.className = 'ts__notification__content__r67t';
    content.textContent = message;

    let progress = document.createElement('div');
    progress.className = 'ts__notification__progress__k91v';
    progress.style.width = '100%';

    notification.appendChild(icon);
    notification.appendChild(content);
    notification.appendChild(progress);
    container.appendChild(notification);

    setTimeout(function () {
        notification.classList.add('ts__notification__show__m73p');
    }, 10);

    setTimeout(function () {
        progress.style.transition = 'width ' + duration + 'ms linear';
        progress.style.width = '0%';
    }, 50);

    setTimeout(function () {
        notification.classList.remove('ts__notification__show__m73p');
        notification.classList.add('ts__notification__hide__n82q');

        setTimeout(function () {
            notification.remove();
        }, 400);
    }, duration);
}

function showOrderSuccess() {
    showTradeNotification('Buy order placed successfully!', 4000);
}

function showTradeComplete() {
    showTradeNotification('Trade executed at $91,574.26', 3500);
}

function showDepositSuccess() {
    showTradeNotification('Deposit confirmed - funds available', 4500);
}


function showTradeFailureNotification(message, duration) {
    if (!duration) {
        duration = 4000;
    }

    let container = document.getElementById('tsNotificationContainer');

    let notification = document.createElement('div');
    notification.className = 'ts__notification__card__j48s';

    let icon = document.createElement('div');
    icon.className = 'ts__notification__icon__error__q29x';
    icon.innerHTML = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    let content = document.createElement('div');
    content.className = 'ts__notification__content__r67t';
    content.textContent = message;

    let progress = document.createElement('div');
    progress.className = 'ts__notification__progress__error__v45h';
    progress.style.width = '100%';

    notification.appendChild(icon);
    notification.appendChild(content);
    notification.appendChild(progress);
    container.appendChild(notification);

    setTimeout(function () {
        notification.classList.add('ts__notification__show__m73p');
    }, 10);

    setTimeout(function () {
        progress.style.transition = 'width ' + duration + 'ms linear';
        progress.style.width = '0%';
    }, 50);

    setTimeout(function () {
        notification.classList.remove('ts__notification__show__m73p');
        notification.classList.add('ts__notification__hide__n82q');

        setTimeout(function () {
            notification.remove();
        }, 400);
    }, duration);
}

function showOrderFailure() {
    showTradeFailureNotification('Order failed - Insufficient funds', 4000);
}

function showConnectionError() {
    showTradeFailureNotification('Connection lost - Please retry', 3500);
}

function showWithdrawalError() {
    showTradeFailureNotification('Withdrawal failed - Invalid address', 4500);
}