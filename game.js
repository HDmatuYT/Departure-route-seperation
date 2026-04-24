'use strict';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API = 'https://black-sunset-cabb.mathiaslennart-mandel.workers.dev';

// ─── EQUIPMENT CATALOGUE ─────────────────────────────────────────────────────
const CATALOGUE = [
  { id:'panel100',  type:'panel',      name:'100W Panel',      icon:'🟦', desc:'100W peak · starter grade',   price:89,  watts:100  },
  { id:'panel400',  type:'panel',      name:'400W Panel',      icon:'🟦', desc:'400W high-efficiency mono',   price:299, watts:400  },
  { id:'ctrl20',    type:'controller', name:'20A MPPT Ctrl',   icon:'⚡', desc:'Up to 500W panel input',      price:65,  maxW:500   },
  { id:'ctrl60',    type:'controller', name:'60A MPPT Ctrl',   icon:'⚡', desc:'Up to 1500W panel input',     price:145, maxW:1500  },
  { id:'bat100',    type:'battery',    name:'100Ah LiFePO4',   icon:'🔋', desc:'1280 Wh usable storage',      price:280, wh:1280    },
  { id:'bat200',    type:'battery',    name:'200Ah LiFePO4',   icon:'🔋', desc:'2560 Wh usable storage',      price:520, wh:2560    },
  { id:'inv1000',   type:'inverter',   name:'1000W Inverter',  icon:'🔌', desc:'Grid-tie up to 1000W',        price:120, maxW:1000  },
  { id:'inv3000',   type:'inverter',   name:'3000W Inverter',  icon:'🔌', desc:'Grid-tie up to 3000W',        price:280, maxW:3000  },
];

// ─── STATE ───────────────────────────────────────────────────────────────────
let AUTH = { token: null, username: null };

const S = {
  balance:         1500,
  owned:           {},
  prices:          [],
  pricesLive:      false,
  batteryWh:       0,
  reservedWh:      0,
  soldTodayEur:    0,
  soldTodayKwh:    0,
  lastTick:        Date.now(),
  scheduledOrders: [],
  nextOrderId:     1,
};

// in-memory log entries for download
const LOG_ENTRIES = [];

// ─── AUTH ─────────────────────────────────────────────────────────────────────
let authMode = 'login';

function switchTab(mode) {
  authMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register').classList.toggle('active', mode === 'register');
  document.getElementById('auth-submit-btn').textContent = mode === 'login' ? 'LOGIN' : 'REGISTER';
  document.getElementById('auth-error').style.display = 'none';
}

async function submitAuth() {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  const btn      = document.getElementById('auth-submit-btn');
  const errEl    = document.getElementById('auth-error');

  if (!username || !password) { showAuthError('Please enter username and password'); return; }

  btn.disabled = true;
  btn.textContent = authMode === 'login' ? 'LOGGING IN…' : 'REGISTERING…';
  errEl.style.display = 'none';

  try {
    const resp = await fetch(`${API}/api/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await resp.json();
    if (!resp.ok) { showAuthError(data.error || 'Something went wrong'); return; }

    AUTH.token    = data.token;
    AUTH.username = data.username;
    localStorage.setItem('solar_token',    data.token);
    localStorage.setItem('solar_username', data.username);

    await loadState();
    startGame();
  } catch (e) {
    showAuthError('Could not reach server — check your connection');
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'LOGIN' : 'REGISTER';
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function logout() {
  localStorage.removeItem('solar_token');
  localStorage.removeItem('solar_username');
  AUTH = { token: null, username: null };
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  clearInterval(window._tickInterval);
  clearInterval(window._clockInterval);
  clearInterval(window._saveInterval);
}

// ─── API CALLS ────────────────────────────────────────────────────────────────
async function loadState() {
  try {
    const resp = await fetch(`${API}/api/state`, {
      headers: { 'Authorization': `Bearer ${AUTH.token}` },
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const st   = data.state;
    S.balance         = st.balance         ?? 1500;
    S.owned           = st.owned           ?? {};
    S.batteryWh       = st.batteryWh       ?? 0;
    S.reservedWh      = st.reservedWh      ?? 0;
    S.soldTodayEur    = st.soldTodayEur    ?? 0;
    S.soldTodayKwh    = st.soldTodayKwh    ?? 0;
    S.scheduledOrders = st.scheduledOrders ?? [];
    S.nextOrderId     = st.nextOrderId     ?? 1;
  } catch (_) {}
}

async function saveState() {
  if (!AUTH.token) return;
  try {
    await fetch(`${API}/api/state`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH.token}` },
      body: JSON.stringify({
        state: {
          balance: S.balance, owned: S.owned, batteryWh: S.batteryWh,
          reservedWh: S.reservedWh, soldTodayEur: S.soldTodayEur,
          soldTodayKwh: S.soldTodayKwh, scheduledOrders: S.scheduledOrders,
          nextOrderId: S.nextOrderId,
        }
      }),
    });
  } catch (_) {}
}

async function loadLeaderboard() {
  const el = document.getElementById('leaderboard-list');
  el.innerHTML = '<div class="lb-empty">Loading…</div>';
  try {
    const resp = await fetch(`${API}/api/leaderboard`);
    const data = await resp.json();
    if (!data.leaderboard.length) { el.innerHTML = '<div class="lb-empty">No players yet</div>'; return; }
    el.innerHTML = '';
    const medals = ['gold','silver','bronze'];
    data.leaderboard.forEach((p, i) => {
      const isMe   = p.username === AUTH.username;
      const profit = p.profit >= 0;
      const div    = document.createElement('div');
      div.className = 'lb-row';
      div.innerHTML = `
        <span class="lb-rank ${medals[i]||''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</span>
        <span class="lb-name ${isMe?'me':''}">${p.username}${isMe?' (you)':''}</span>
        <span class="lb-balance">€${p.balance.toFixed(2)}</span>
        <span class="lb-profit ${profit?'':'neg'}">${profit?'+':''} €${p.profit.toFixed(2)}</span>`;
      el.appendChild(div);
    });
  } catch (_) {
    el.innerHTML = '<div class="lb-empty">Could not load leaderboard</div>';
  }
}

// ─── COMPUTED ─────────────────────────────────────────────────────────────────
const byType    = t => CATALOGUE.filter(i => i.type === t);
const sumOwned  = (type, prop) => byType(type).reduce((s,i) => s + (S.owned[i.id]||0)*(i[prop]||0), 0);
const totalPanelW  = () => sumOwned('panel','watts');
const maxCtrlW     = () => sumOwned('controller','maxW');
const totalBatWh   = () => sumOwned('battery','wh');
const maxInvW      = () => sumOwned('inverter','maxW');
const hasCtrl      = () => maxCtrlW() > 0;
const hasBat       = () => totalBatWh() > 0;
const hasInv       = () => maxInvW() > 0;
const availableWh  = () => Math.max(0, S.batteryWh - S.reservedWh);
function effectivePanelW() { return hasCtrl() ? Math.min(totalPanelW(), maxCtrlW()) : 0; }

const SUN = [0,0,0,0,0,0.02,0.10,0.25,0.45,0.65,0.82,0.94,1,0.97,0.88,0.74,0.55,0.35,0.15,0.05,0.01,0,0,0];
const sunMult = () => SUN[new Date().getHours()] || 0;
const currentPriceCents = () => S.prices.length ? (S.prices[new Date().getHours()] ?? S.prices[0]) : null;

// ─── PRICE FETCH ──────────────────────────────────────────────────────────────
async function fetchPrices() {
  try {
    const resp = await fetch(API + '/api/prices');
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    if (data.prices && data.prices.length === 24) {
      S.prices = data.prices;
      S.pricesLive = true;
      log('Live Nordpool EE prices loaded ✓', 'good');
      populateHourSelect(); return;
    }
  } catch (_) {}
  S.prices = Array.from({length:24},(_,h) => +Math.max(0, 7+5*Math.sin((h-13)*Math.PI/12)+(Math.random()-0.5)*2).toFixed(2));
  S.pricesLive = false;
  log('Simulated prices loaded (API unavailable)', 'warn');
  populateHourSelect();
}

function populateHourSelect() {
  const sel = document.getElementById('sched-hour');
  sel.innerHTML = '';
  const now = new Date().getHours();
  for (let h = 0; h < 24; h++) {
    if (h <= now) continue;
    const p   = S.prices[h] ?? 0;
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = `${String(h).padStart(2,'0')}:00 · ${p.toFixed(1)}c → ${(p*0.95).toFixed(1)}c after 5% fee`;
    sel.appendChild(opt);
  }
  if (!sel.options.length) {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = 'No future hours today';
    sel.appendChild(opt);
  }
}

// ─── SELL ─────────────────────────────────────────────────────────────────────
function doManualSell() {
  if (!hasInv()) { log('No inverter installed', 'bad'); return; }
  const amtWh = parseFloat(document.getElementById('manual-amount').value);
  if (!amtWh || amtWh <= 0) { log('Enter a valid Wh amount', 'bad'); return; }
  if (amtWh > availableWh()) { log('Not enough available battery charge', 'bad'); return; }
  const pc = currentPriceCents();
  if (pc === null) { log('No price data yet', 'bad'); return; }
  const earn = (amtWh/1000) * pc/100;
  S.batteryWh    = Math.max(0, S.batteryWh - amtWh);
  S.balance      += earn;
  S.soldTodayEur += earn;
  S.soldTodayKwh += amtWh/1000;
  log(`Manual sell: ${amtWh.toFixed(0)}Wh @ ${pc.toFixed(1)}c → +€${earn.toFixed(3)}`, 'good');
  document.getElementById('manual-amount').value = '';
  updateManualPreview();
  renderPendingOrders();
  updateUI();
}

function updateManualPreview() {
  const el    = document.getElementById('manual-preview');
  const amtWh = parseFloat(document.getElementById('manual-amount').value);
  const pc    = currentPriceCents();
  if (!amtWh || amtWh <= 0 || pc === null) { el.textContent = 'Enter Wh amount above'; el.className='sell-preview'; return; }
  if (amtWh > availableWh()) { el.textContent=`Only ${availableWh().toFixed(0)}Wh available`; el.className='sell-preview bad'; return; }
  el.textContent = `→ +€${((amtWh/1000)*pc/100).toFixed(3)} at ${pc.toFixed(1)} c/kWh · no fee`;
  el.className = 'sell-preview good';
}

function addScheduledOrder() {
  if (!hasInv()) { log('No inverter installed', 'bad'); return; }
  const amtWh = parseFloat(document.getElementById('sched-amount').value);
  const hour  = parseInt(document.getElementById('sched-hour').value);
  if (!amtWh || amtWh <= 0) { log('Enter a valid Wh amount', 'bad'); return; }
  if (isNaN(hour)) { log('Select a future hour', 'bad'); return; }
  if (amtWh > availableWh()) { log(`Only ${availableWh().toFixed(0)}Wh available`, 'bad'); return; }
  const order = { id: S.nextOrderId++, hour, wh: amtWh };
  S.scheduledOrders.push(order);
  S.reservedWh += amtWh;
  const pc  = S.prices[hour] ?? 0;
  const est = +((amtWh/1000)*(pc*0.95)/100).toFixed(3);
  log(`Order #${order.id} scheduled: ${amtWh}Wh @ ${hour}:00 (est. +€${est} after fee)`, 'good');
  document.getElementById('sched-amount').value = '';
  updateSchedPreview();
  renderPendingOrders();
  updateUI();
}

function cancelOrder(id) {
  const idx = S.scheduledOrders.findIndex(o => o.id === id);
  if (idx === -1) return;
  S.reservedWh = Math.max(0, S.reservedWh - S.scheduledOrders[idx].wh);
  S.scheduledOrders.splice(idx, 1);
  log(`Order #${id} cancelled`, 'warn');
  renderPendingOrders(); updateUI();
}

function executeScheduledOrders() {
  const h   = new Date().getHours();
  const due = S.scheduledOrders.filter(o => o.hour === h);
  due.forEach(o => {
    const sellWh = Math.min(o.wh, S.batteryWh);
    const pc     = S.prices[h] ?? 0;
    const earn   = (sellWh/1000)*(pc*0.95)/100;
    S.batteryWh    = Math.max(0, S.batteryWh - sellWh);
    S.reservedWh   = Math.max(0, S.reservedWh - o.wh);
    S.balance      += earn;
    S.soldTodayEur += earn;
    S.soldTodayKwh += sellWh/1000;
    log(`Order #${o.id} executed: ${sellWh.toFixed(0)}Wh @ ${pc.toFixed(1)}c (5% fee) → +€${earn.toFixed(3)}`, 'good');
    const idx = S.scheduledOrders.findIndex(x => x.id === o.id);
    if (idx !== -1) S.scheduledOrders.splice(idx, 1);
  });
  if (due.length) { renderPendingOrders(); updateUI(); }
}

function renderPendingOrders() {
  const el = document.getElementById('pending-orders');
  el.innerHTML = '';
  if (!S.scheduledOrders.length) { el.innerHTML='<div class="pending-empty">No orders scheduled</div>'; return; }
  S.scheduledOrders.forEach(o => {
    const pc  = S.prices[o.hour] ?? 0;
    const est = +((o.wh/1000)*(pc*0.95)/100).toFixed(3);
    const div = document.createElement('div');
    div.className = 'pending-order';
    div.innerHTML = `
      <div class="order-info">#${o.id} · ${String(o.hour).padStart(2,'0')}:00 · ${o.wh}Wh</div>
      <div class="order-earn">est. +€${est}</div>
      <button class="order-cancel" data-id="${o.id}">✕</button>`;
    el.appendChild(div);
  });
  el.querySelectorAll('.order-cancel').forEach(btn => btn.addEventListener('click', () => cancelOrder(+btn.dataset.id)));
}

function updateSchedPreview() {
  const el    = document.getElementById('sched-preview');
  const amtWh = parseFloat(document.getElementById('sched-amount').value);
  const hour  = parseInt(document.getElementById('sched-hour').value);
  if (!amtWh || amtWh <= 0 || isNaN(hour)) { el.textContent='Select hour and Wh amount'; el.className='sell-preview'; return; }
  if (amtWh > availableWh()) { el.textContent=`Only ${availableWh().toFixed(0)}Wh available`; el.className='sell-preview bad'; return; }
  const pc  = S.prices[hour] ?? 0;
  el.textContent = `→ est. +€${((amtWh/1000)*(pc*0.95)/100).toFixed(3)} · ${(pc*0.95).toFixed(1)}c/kWh after 5% fee`;
  el.className = 'sell-preview good';
}

// ─── SHOP ─────────────────────────────────────────────────────────────────────
function renderShop() {
  const sections = { panel: document.getElementById('shop-panels'), controller: document.getElementById('shop-controllers'), battery: document.getElementById('shop-batteries'), inverter: document.getElementById('shop-inverters') };
  Object.values(sections).forEach(el => { if (el) el.innerHTML=''; });
  CATALOGUE.forEach(item => {
    const el  = sections[item.type]; if (!el) return;
    const cnt = S.owned[item.id]||0;
    const can = S.balance >= item.price;
    const card = document.createElement('div');
    card.className = 'shop-card'+(can?'':' cant-afford');
    card.innerHTML = `
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-info"><div class="shop-name">${item.name}</div><div class="shop-desc">${item.desc}</div></div>
      <div class="shop-right">
        <span class="shop-price">€${item.price}</span>
        ${cnt>0?`<span class="owned-tag">${cnt}×</span>`:''}
        <button class="buy-btn" data-id="${item.id}" ${can?'':'disabled'}>BUY</button>
      </div>`;
    el.appendChild(card);
  });
  document.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', () => buyItem(btn.dataset.id)));
}

function buyItem(id) {
  const item = CATALOGUE.find(i => i.id===id);
  if (!item || S.balance < item.price) return;
  S.balance -= item.price;
  S.owned[id] = (S.owned[id]||0)+1;
  log(`Bought ${item.name} — €${item.price}`, 'good');
  renderShop(); renderFarm(); updateUI();
}

// ─── FARM ─────────────────────────────────────────────────────────────────────
function renderFarm() {
  const grid  = document.getElementById('farm-grid');
  const empty = document.getElementById('farm-empty');
  const stats = document.getElementById('farm-stats');
  grid.innerHTML = '';
  if (totalPanelW()===0) { empty.style.display=''; stats.style.display='none'; grid.appendChild(empty); return; }
  empty.style.display='none'; stats.style.display='';
  const panelCount = byType('panel').reduce((s,i)=>s+(S.owned[i.id]||0),0);
  for (let i=0; i<Math.min(panelCount,20); i++) {
    const ic=document.createElement('div'); ic.className='farm-panel-icon'; ic.textContent='🟦'; grid.appendChild(ic);
  }
  if (panelCount>20) { const m=document.createElement('div'); m.style.cssText='font-size:0.75rem;color:var(--text2);align-self:center;'; m.textContent=`+${panelCount-20} more`; grid.appendChild(m); }
  document.getElementById('fs-panels').textContent = totalPanelW()+'W';
  document.getElementById('fs-ctrl').textContent   = hasCtrl()?maxCtrlW()+'W max':'None ⚠';
  document.getElementById('fs-bat').textContent    = totalBatWh()>0?totalBatWh()+' Wh':'None ⚠';
  document.getElementById('fs-inv').textContent    = maxInvW()>0?maxInvW()+'W max':'None ⚠';
  document.getElementById('fs-eff').textContent    = Math.round(sunMult()*100)+'%';
  document.getElementById('fs-gen').textContent    = Math.round(effectivePanelW()*sunMult())+'W';
}

// ─── GAME TICK ────────────────────────────────────────────────────────────────
let lastCheckedHour = new Date().getHours();

function gameTick() {
  const now  = Date.now();
  const dtS  = (now - S.lastTick) / 1000;
  S.lastTick = now;
  const generatedWh = effectivePanelW() * sunMult() * (dtS/3600);
  const batCap = totalBatWh();
  if (batCap>0 && generatedWh>0) S.batteryWh = Math.min(S.batteryWh+generatedWh, batCap);
  const h = new Date().getHours();
  if (h !== lastCheckedHour) { lastCheckedHour=h; executeScheduledOrders(); populateHourSelect(); }
  updateUI();
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function updateUI() {
  const profit = S.balance-1500;
  document.getElementById('balance').textContent = '€'+S.balance.toFixed(2);
  const deltaEl = document.getElementById('balance-delta');
  deltaEl.textContent = (profit>=0?'+':'')+'€'+profit.toFixed(2)+' profit';
  deltaEl.className   = 'balance-delta '+(profit>0?'pos':profit<0?'neg':'');
  document.getElementById('balance-bar').style.width = Math.max(5,Math.min(100,(S.balance/3000)*100))+'%';
  document.getElementById('sold-eur').textContent = '€'+S.soldTodayEur.toFixed(2);
  document.getElementById('sold-kwh').textContent = S.soldTodayKwh.toFixed(3);
  document.getElementById('solar-w').textContent  = Math.round(effectivePanelW()*sunMult())+'W';
  const batCap=totalBatWh(); const batPct=batCap>0?Math.round(S.batteryWh/batCap*100):0;
  document.getElementById('bat-pct').textContent  = batPct+'%';
  document.getElementById('battery-fill').style.width  = batPct+'%';
  document.getElementById('battery-label').textContent = Math.round(S.batteryWh)+' / '+batCap+' Wh'+(S.reservedWh>0?` (${Math.round(S.reservedWh)}Wh reserved)`:'');
  const statusEl = document.getElementById('system-status'); statusEl.innerHTML='';
  [[totalPanelW()>0,`${totalPanelW()}W panels installed`],[hasCtrl(),hasCtrl()?`Controller OK (${maxCtrlW()}W)`:'No controller — panels inactive'],[hasBat(),hasBat()?`Battery ${totalBatWh()}Wh · ${availableWh().toFixed(0)}Wh available`:'No battery'],[hasInv(),hasInv()?`Inverter ready (${maxInvW()}W)`:'No inverter — cannot sell']].forEach(([ok,label])=>{
    const row=document.createElement('div'); row.className='status-row';
    row.innerHTML=`<span class="dot ${ok?'green':'yellow'}"></span><span>${label}</span>`;
    statusEl.appendChild(row);
  });
  const pc=currentPriceCents();
  if (pc!==null) {
    const bigEl=document.getElementById('price-big'); bigEl.textContent=pc.toFixed(1); bigEl.className='price-big '+(pc>12?'high':pc>5?'mid':'low');
    document.getElementById('sell-val').textContent    = pc.toFixed(1)+' c/kWh';
    document.getElementById('price-badge').textContent = S.pricesLive?'LIVE':'SIMULATED';
    document.getElementById('price-badge').className   = 'price-badge '+(S.pricesLive?'live':'sim');
    renderChart();
  }
}

function renderChart() {
  const barsEl=document.getElementById('chart-bars'); const axisEl=document.getElementById('chart-axis');
  if (!S.prices.length) return; barsEl.innerHTML=''; axisEl.innerHTML='';
  const max=Math.max(...S.prices)||1; const h=new Date().getHours();
  S.prices.forEach((p,i)=>{
    const bar=document.createElement('div'); bar.className='chart-bar'+(i===h?' current':'');
    bar.style.cssText=`height:${Math.max(4,(p/max)*100)}%;background:${p>12?'#ef4444':p>5?'#f59e0b':'#00c97a'};`;
    bar.innerHTML=`<div class="bar-tip">${i}:00 · ${p.toFixed(1)}c</div>`; barsEl.appendChild(bar);
    const lbl=document.createElement('span'); lbl.textContent=(i%4===0)?i+'h':''; axisEl.appendChild(lbl);
  });
}

// ─── LOG ─────────────────────────────────────────────────────────────────────
function log(msg, cls='') {
  const el=document.getElementById('log'); const d=document.createElement('div'); d.className='log-entry '+cls;
  const t=new Date(); const ts=[t.getHours(),t.getMinutes(),t.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':');
  const line=`${ts} · ${msg}`; d.textContent=line; el.prepend(d);
  LOG_ENTRIES.unshift(`[${new Date().toISOString()}] ${msg}`);
  while(el.children.length>120) el.removeChild(el.lastChild);
}

function downloadLog() {
  const text = LOG_ENTRIES.join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `solar-trader-log-${new Date().toISOString().split('T')[0]}.txt`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── CLOCK ───────────────────────────────────────────────────────────────────
function updateClock() {
  const now=new Date(); const pad=n=>String(n).padStart(2,'0');
  document.getElementById('clock').textContent    = pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
  document.getElementById('datedisp').textContent = now.toLocaleDateString('en-EE',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
}

// ─── EVENT LISTENERS ─────────────────────────────────────────────────────────
document.getElementById('manual-sell-btn').addEventListener('click', doManualSell);
document.getElementById('manual-all-btn').addEventListener('click', ()=>{ document.getElementById('manual-amount').value=Math.floor(availableWh()); updateManualPreview(); });
document.getElementById('manual-amount').addEventListener('input', updateManualPreview);
document.getElementById('sched-add-btn').addEventListener('click', addScheduledOrder);
document.getElementById('sched-all-btn').addEventListener('click', ()=>{ document.getElementById('sched-amount').value=Math.floor(availableWh()); updateSchedPreview(); });
document.getElementById('sched-amount').addEventListener('input', updateSchedPreview);
document.getElementById('sched-hour').addEventListener('change', updateSchedPreview);
document.getElementById('auth-password').addEventListener('keydown', e=>{ if(e.key==='Enter') submitAuth(); });
document.getElementById('auth-username').addEventListener('keydown', e=>{ if(e.key==='Enter') submitAuth(); });

// ─── START GAME ───────────────────────────────────────────────────────────────
function startGame() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
  document.getElementById('player-badge').textContent  = '⚡ '+AUTH.username.toUpperCase();
  log(`Welcome back, ${AUTH.username}!`, 'good');
  renderShop(); renderFarm(); renderPendingOrders(); updateUI(); updateClock();
  fetchPrices().then(updateUI);
  loadLeaderboard();
  window._tickInterval  = setInterval(gameTick,    2000);
  window._clockInterval = setInterval(updateClock, 1000);
  window._saveInterval  = setInterval(saveState,   30000); // auto-save every 30s
  setInterval(()=>{ if(new Date().getDate()!==lastDay){ lastDay=new Date().getDate(); S.soldTodayEur=0; S.soldTodayKwh=0; fetchPrices().then(updateUI); log('New day — prices refreshed','good'); } }, 30000);
  setInterval(()=>fetchPrices().then(updateUI), 60*60*1000);
}

let lastDay = new Date().getDate();

// ─── BOOT ────────────────────────────────────────────────────────────────────
async function init() {
  const token    = localStorage.getItem('solar_token');
  const username = localStorage.getItem('solar_username');
  if (token && username) {
    AUTH.token = token; AUTH.username = username;
    await loadState();
    startGame();
  }
  // else stay on auth screen
}

init();