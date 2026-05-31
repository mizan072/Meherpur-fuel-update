const CACHE_VERSION = '3.6';
if (localStorage.getItem('nurCacheVersion') !== CACHE_VERSION) {
  localStorage.clear();
  localStorage.setItem('nurCacheVersion', CACHE_VERSION);
}

const WORKER_URL = atob('aHR0cHM6Ly90b2Rlci1iYXAuYWJhbC1zdWRhLndvcmtlcnMuZGV2');

// All users forced to True so no feature blocks ever load
let _isProUser = true;
Object.defineProperty(window, 'isProUser', {
  get() { return _isProUser; },
  set() { },
  configurable: false,
  enumerable: false,
});

let mode = 'normal';
let history = [];
let busy = false;
let msgCount = 0;

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (isLight) {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    label.textContent = 'Dark Mode';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    label.textContent = 'Light Mode';
  }
  localStorage.setItem('nurTheme', isLight ? 'light' : 'dark');
}

if (localStorage.getItem('nurTheme') === 'light') {
  document.body.classList.add('light');
  document.addEventListener('DOMContentLoaded', () => {
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    if (label) label.textContent = 'Dark Mode';
  });
}

let currentChatId = null;

async function saveChatHistory() {
  if (!currentChatId || history.length === 0) return;
  const chatData = { id: currentChatId, title: getChatTitle(), mode, history, timestamp: Date.now(), uid: 'anonymous', isPro: true };

  const storageKey = 'nurVaiChats_anonymous';
  let allChats = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const idx = allChats.findIndex(c => c.id === currentChatId);
  if (idx >= 0) allChats[idx] = chatData;
  else allChats.unshift(chatData);
  allChats = allChats.slice(0, 30);
  localStorage.setItem(storageKey, JSON.stringify(allChats));
  renderHistoryList();
}

function getChatTitle() {
  const firstUserMsg = history.find(m => m.role === 'user');
  if (!firstUserMsg) return 'নতুন chat';
  const t = firstUserMsg.content.trim();
  return t.length > 35 ? t.slice(0, 35) + '...' : t;
}

async function renderHistoryList() {
  const list = document.getElementById('historyList');
  if (!list) return;
  
  const storageKey = 'nurVaiChats_anonymous';
  let allChats = JSON.parse(localStorage.getItem(storageKey) || '[]');

  if (allChats.length === 0) {
    list.innerHTML = '<div style="padding:8px 16px;font-size:12px;color:var(--text-muted);font-family:Sora,sans-serif;">কোনো chat নেই</div>';
    return;
  }
  list.innerHTML = allChats.map(c => `
    <div class="history-item ${c.id === currentChatId ? 'active' : ''}" onclick="loadChat('${c.id}')">
      <div class="history-title">${escapeHtml(c.title)}</div>
      <button class="history-del-btn" onclick="deleteChat(event,'${c.id}')" title="Delete">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
  `).join('');
}

async function deleteChat(e, id) {
  e.stopPropagation();
  const storageKey = 'nurVaiChats_anonymous';

  let allChats = JSON.parse(localStorage.getItem(storageKey) || '[]');
  allChats = allChats.filter(c => c.id !== id);
  localStorage.setItem(storageKey, JSON.stringify(allChats));

  if (currentChatId === id) {
    history = [];
    msgCount = 0;
    currentChatId = null;
    const chatEl = document.getElementById('chat');
    chatEl.innerHTML = '';
    const w = document.createElement('div');
    w.className = 'welcome'; w.id = 'welcome';
    w.innerHTML = `<div class="w-icon">🔥</div><div class="w-title">NurVai এ স্বাগতম!</div><div class="w-credit">* তৈরি করেছেন <strong>Nur Khan</strong> — মানুষের কাজে লাগবে, হাসাবে, সাহায্য করবে, এই স্বপ্ন নিয়েই NurVai।</div>`;
    chatEl.appendChild(w);
  }
  renderHistoryList();
}

async function loadChat(id) {
  const storageKey = 'nurVaiChats_anonymous';
  const allChats = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const chat = allChats.find(c => c.id === id);

  if (!chat) return;
  currentChatId = id;
  history = [...chat.history];
  mode = chat.mode;

  document.querySelectorAll('.mode-item').forEach(x => x.classList.remove('active'));
  const modeKeys = ['friendly','motivate','normal','islamic','study','professional'];
  const modeIdx2 = modeKeys.indexOf(mode);
  const allModeItems = document.querySelectorAll('.mode-item');
  if (modeIdx2 >= 0 && allModeItems[modeIdx2]) allModeItems[modeIdx2].classList.add('active');

  const chatEl = document.getElementById('chat');
  chatEl.innerHTML = '';
  msgCount = 0;
  history.forEach(m => {
    const role = m.role === 'user' ? 'user' : 'bot';
    addMsgInstant(role, m.content);
  });
  renderHistoryList();
  closeSidebar();

  setTimeout(() => {
    const chatEl = document.getElementById('chat');
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
  }, 100);
}

const GROQ_MODELS = ['deepseek-r1-distill-llama-70b', 'llama-3.3-70b-versatile', 'gemma2-9b-it'];
let modelIdx = 0;

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function setupMarked() {
  if (typeof marked === 'undefined') return;
  const renderer = new marked.Renderer();

  renderer.code = function(code, lang) {
    const language = (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) ? lang : 'plaintext';
    let highlighted = code;
    try {
      if (typeof hljs !== 'undefined') {
        highlighted = lang ? hljs.highlight(code, { language }).value : hljs.highlightAuto(code).value;
      }
    } catch(e) { highlighted = code; }
    const uid = 'cb_' + Math.random().toString(36).slice(2, 8);
    return `<div class="code-block-wrap">
      <div class="code-block-header">
        <button class="code-toggle-btn" onclick="toggleCode('${uid}')" id="toggle_${uid}">▼ ${language}</button>
        <button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
      </div>
      <div class="code-body" id="${uid}">
        <pre><code class="hljs language-${language}">${highlighted}</code></pre>
      </div>
    </div>`;
  };
  marked.setOptions({ renderer, breaks: true, gfm: true });
}

function copyCode(btn) {
  const code = btn.closest('.code-block-wrap').querySelector('code');
  navigator.clipboard.writeText(code.innerText).then(() => {
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  });
}

function toggleCode(uid) {
  const body = document.getElementById(uid);
  const btn = document.getElementById('toggle_' + uid);
  if (!body || !btn) return;
  const isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  const lang = btn.textContent.replace(/^[▼▶] /, '');
  btn.textContent = (isHidden ? '▼ ' : '▶ ') + lang;
}

function copyMsg(btn) {
  const bubble = btn.closest('.msg-content').querySelector('.msg-bubble');
  const text = bubble.innerText || bubble.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = '⎘ Copy'; btn.classList.remove('copied'); }, 2000);
  });
}

function sanitizeHTML(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+\s*=\s*["'][^"']*["']/gi, '').replace(/on\w+\s*=\s*[^\s>]*/gi, '').replace(/javascript:/gi, '');
}

function renderMarkdown(text) {
  if (typeof marked === 'undefined') return text.replace(/\n/g, '<br>');
  try {
    const trimmed = text.trim();
    if (trimmed.includes('<div style=') || trimmed.includes('<audio ') || trimmed.includes('<script>setTimeout')) {
      const htmlStart = trimmed.search(/<div style=/);
      if (htmlStart > 0) {
        return marked.parse(trimmed.slice(0, htmlStart)) + trimmed.slice(htmlStart);
      }
      return text;
    }
    if (trimmed.startsWith('<div') || trimmed.startsWith('<audio') || trimmed.startsWith('<p') || trimmed.startsWith('<table')) {
      return text;
    }
    return sanitizeHTML(marked.parse(text));
  } catch(e) { return text.replace(/\n/g, '<br>'); }
}

function isTimeQuery(text) {
  const t = text.trim().toLowerCase();
  const clockKeywords = ['কটা বাজে','কয়টা বাজে','সময় কত','সময় কতো','এখন কত বাজে','কত বাজে','somoi koto','akhn somoi','akhn koto baje','time koto','what time','current time','আজকের তারিখ','আজকে কত তারিখ','আজ কত তারিখ','ajker tarik','ajker date','ajker somoi','aaj koto tarik','হিজরি তারিখ','hijri date','bangla date','বাংলা তারিখ','tarik koto','date koto'];
  return clockKeywords.some(k => t.includes(k)) && !/weather|آবহাওয়া|news|খবর/i.test(text);
}

function getHijriDate() {
  const now = new Date();
  const jd = Math.floor((now.getTime() / 86400000) + 2440587.5);
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  return { day: l - Math.floor((709 * month) / 24), month: ['মুহররম','সফর','রবিউল আউয়াল','রবিউস সানি','জমাদিউল আউয়াল','জমাদিউস সানি','রজব','শাবান','রমজান','শাওয়াল','জিলকদ','জিলহজ'][month - 1] || '', year: 30 * n + j - 30 };
}

function getBanglaDate(now) {
  const banglaMonths = ['বৈশাখ','জ্যৈষ্ঠ','আষাঢ়','শ্রাবণ','ভাদ্র','আশ্বিন','কার্তিক','অগ্রহায়ণ','পৌষ','মাঘ','ফাল্গুন','চৈত্র'];
  const gregYear = now.getFullYear();
  const gregMonth = now.getMonth() + 1;
  const gregDay = now.getDate();
  const transitions = [{ gm: 4, gd: 14, bm: 0 },{ gm: 5, gd: 15, bm: 1 },{ gm: 6, gd: 15, bm: 2 },{ gm: 7, gd: 16, bm: 3 },{ gm: 8, gd: 16, bm: 4 },{ gm: 9, gd: 16, bm: 5 },{ gm: 10, gd: 16, bm: 6 },{ gm: 11, gd: 15, bm: 7 },{ gm: 12, gd: 15, bm: 8 },{ gm: 1, gd: 13, bm: 9 },{ gm: 2, gd: 13, bm: 10 },{ gm: 3, gd: 14, bm: 11 }];
  let bmIdx = -1, bDay = 0;
  for (let t of transitions) {
    if (gregMonth === t.gm && gregDay >= t.gd) { bmIdx = t.bm; bDay = gregDay - t.gd + 1; break; }
  }
  return `${bDay} ${banglaMonths[bmIdx]}, ${bmIdx <= 8 ? gregYear - 593 : gregYear - 594} বঙ্গাব্দ`;
}

function renderClockCard() {
  const now = new Date();
  const engDate = `${['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'][now.getDay()]}, ${now.getDate()} ${['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'][now.getMonth()]} ${now.getFullYear()}`;
  const hj = getHijriDate();
  const uid = 'clk_' + Date.now();
  return `<div class="nur-clock-card" id="${uid}" style="background:#1a1a1a;border:1px solid #2d2d2d;border-radius:16px;padding:14px 16px;width:100%;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
      <div>
        <div id="dig_${uid}" style="font-size:38px;font-weight:700;color:#fff;">00:00</div>
        <div style="font-size:11px;color:#666;margin-top:5px;">Khulna, Bangladesh</div>
      </div>
    </div>
    <div style="border-top:1px solid #2a2a2a;padding-top:10px;display:flex;flex-direction:column;gap:5px;font-size:12px;">
      <div>📅 <span style="color:#ccc;">${engDate}</span></div>
      <div>🌙 <span style="color:#e8956d;">${hj.day} ${hj.month}, ${hj.year} হিজরি</span></div>
      <div>🗓️ <span style="color:#7ecfff;">${getBanglaDate(now)}</span></div>
    </div>
  </div>`;
}

function startClockTick(uid) {
  function tick() {
    if (!document.getElementById(uid)) return;
    const n = new Date();
    const dig = document.getElementById('dig_' + uid);
    if (dig) dig.textContent = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
    setTimeout(tick, 1000);
  }
  tick();
}

function getTimeStr() {
  return new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('DOMContentLoaded', () => {
  setupMarked();
  renderHistoryList();
  const ttsBtn = document.getElementById('ttsBtn');
  if (ttsBtn) ttsBtn.classList.add('tts-off');
  const inp = document.getElementById('userInput');
  if (inp) inp.addEventListener('input', updateSendMicToggle);
});

function setMode(el, m) {
  document.querySelectorAll('.mode-item').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  mode = m;
  newChat();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function newChat() {
  history = []; msgCount = 0; currentChatId = 'chat_' + Date.now();
  const chatEl = document.getElementById('chat');
  chatEl.innerHTML = '';
  const w = document.createElement('div');
  w.className = 'welcome'; w.id = 'welcome';
  w.innerHTML = `<div class="w-icon"><img src="image/profile.jpg" style="width:72px;height:72px;border-radius:50%;"></div><div class="w-title">${mode.toUpperCase()} Mode চালু হয়েছে!</div>`;
  chatEl.appendChild(w);
  renderHistoryList();
  closeSidebar();
}

function resize(el) {
  el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  updateSendMicToggle();
}
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
}
function updateSendMicToggle() {
  const inp = document.getElementById('userInput'), sendBtn = document.getElementById('sendBtn'), micBtn = document.getElementById('micBtn');
  const hasText = inp.value.trim().length > 0 || !!selectedFile;
  sendBtn.style.display = hasText ? 'flex' : 'none';
  micBtn.style.display = hasText ? 'none' : 'flex';
}

function addMsgWithCard(role, cardHtml) {
  const chat = document.getElementById('chat'), row = document.createElement('div');
  row.className = 'msg-row bot-row';
  row.innerHTML = `<div class="msg-avatar bot-av"><img src="image/profile.jpg" style="width:100%;height:100%;border-radius:50%;"></div><div class="msg-content"><div>NurVai</div>${cardHtml}<div class="msg-timestamp">${getTimeStr()}</div></div>`;
  chat.appendChild(row); chat.scrollTop = chat.scrollHeight;
  const card = row.querySelector('.nur-clock-card');
  if (card) startClockTick(card.id);
}

function addMsg(role, text) {
  const w = document.getElementById('welcome'); if (w) w.remove();
  const chat = document.getElementById('chat'); msgCount++;
  if (msgCount > 1) { const d = document.createElement('div'); d.className = 'msg-divider'; d.innerHTML = '<hr>'; chat.appendChild(d); }
  const row = document.createElement('div'); row.className = `msg-row ${role === 'user' ? 'user-row' : ''}`;
  if (role === 'bot') {
    row.innerHTML = `<div class="msg-avatar bot-av"><img src="image/profile.jpg" style="width:100%;height:100%;border-radius:50%;"></div><div class="msg-content"><div>NurVai</div><div class="msg-bubble">${renderMarkdown(text)}</div><div class="msg-actions"><button class="msg-copy-btn" onclick="copyMsg(this)">⎘ Copy</button><span>${getTimeStr()}</span></div></div>`;
  } else {
    row.innerHTML = `<div class="msg-content"><div>তুমি</div><div class="msg-bubble">${escapeHtml(text)}</div><span>${getTimeStr()}</span></div>`;
  }
  chat.appendChild(row); chat.scrollTop = chat.scrollHeight;
}

function addMsgInstant(role, text) { addMsg(role, text); }

function showTyping() {
  const chat = document.getElementById('chat'), t = document.createElement('div');
  t.className = 'typing-row'; t.id = 'typing';
  t.innerHTML = `<div class="msg-avatar bot-av"><img src="image/profile.jpg" style="width:100%;height:100%;border-radius:50%;"></div><div style="display:flex;align-items:center;gap:4px;"><span class="typing-text">লিখছে...</span></div>`;
  chat.appendChild(t); chat.scrollTop = chat.scrollHeight;
}
function removeTyping() { const t = document.getElementById('typing'); if (t) t.remove(); }

async function callTavily(query) {
  try {
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const res = await fetch(proxyUrl + encodeURIComponent(WORKER_URL), { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ provider: 'tavily', uid: 'anonymous', query }) 
    });
    return await res.json();
  } catch(e) { return null; }
}

async function send() {
  if (busy) return;
  const inp = document.getElementById('userInput'), text = inp.value.trim();
  if (!text && !selectedFile) return;

  if (!selectedFile && isTimeQuery(text)) {
    inp.value = ''; inp.style.height = 'auto'; addMsg('user', text);
    history.push({ role: 'user', content: text });
    if (!currentChatId) currentChatId = 'chat_' + Date.now();
    addMsgWithCard('bot', renderClockCard()); updateSendMicToggle(); return;
  }

  addMsg('user', text); history.push({ role: 'user', content: text });
  if (!currentChatId) currentChatId = 'chat_' + Date.now();
  inp.value = ''; inp.style.height = 'auto'; busy = true; showTyping();

  let webContext = '';
  if (/latest|current|today|now|দাম|আবহাওয়া|news/i.test(text)) {
    try {
      const tv = await callTavily(text);
      if (tv?.answer) webContext = tv.answer;
    } catch(e){}
  }

  try {
    const payloadQuery = webContext ? `Context: ${webContext}\n\nQuestion: ${text}` : text;
    
    // Using AllOrigins tracking proxy to completely bypass preflight checks
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(WORKER_URL);
    
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-NurVai-Secret': 'NurVai-2026-xK9mP3qL' 
      },
      body: JSON.stringify({ 
        provider: 'groq', 
        model: 'llama-3.3-70b-versatile', 
        messages: history.slice(-10), 
        mode: mode, 
        uid: 'anonymous' 
      })
    });
    
    const d = await res.json();
    removeTyping();
    const reply = d?.choices?.[0]?.message?.content || '⚠️ এই মুহূর্তে সংযোগ করা সম্ভব হচ্ছে না।';
    history.push({ role: 'assistant', content: reply });
    addMsg('bot', reply); saveChatHistory();
  } catch (err) {
    removeTyping(); addMsg('bot', '⚠️ সার্ভার ত্রুটি ঘটেছে। আবার চেষ্টা করুন।');
  } finally {
    busy = false; updateSendMicToggle();
  }
}

let selectedFile = null, selectedFileType = null;
function togglePlusMenu() { document.getElementById('plusMenu').style.display = document.getElementById('plusMenu').style.display === 'block' ? 'none' : 'block'; }
function openPhotos() { document.getElementById('plusMenu').style.display = 'none'; const i = document.getElementById('fileInput'); i.accept = 'image/*'; i.click(); }
function openFiles() { document.getElementById('plusMenu').style.display = 'none'; const i = document.getElementById('fileInput'); i.accept = '*/*'; i.click(); }

function handleFileSelect(event) {
  const file = event.target.files[0]; if (!file) return;
  selectedFile = file; selectedFileType = file.type.startsWith('image/') ? 'image' : 'txt';
  const preview = document.getElementById('filePreviewArea'); preview.style.display = 'block';
  preview.innerHTML = `<div class="inline-file-card"><span class="inline-file-name">${file.name}</span><button class="inline-remove-btn" onclick="removeFile()">✕</button></div>`;
  updateSendMicToggle();
}
function removeFile() { selectedFile = null; selectedFileType = null; document.getElementById('filePreviewArea').style.display = 'none'; updateSendMicToggle(); }

let recognition = null, isListening = false;
function toggleVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return alert('Your browser does not support Voice input.');
  if (isListening) { recognition.stop(); return; }
  recognition = new SpeechRecognition(); recognition.lang = 'bn-BD';
  recognition.onresult = (e) => { document.getElementById('userInput').value = e.results[0][0].transcript; resize(document.getElementById('userInput')); };
  recognition.onend = () => { isListening = false; document.getElementById('micBtn').classList.remove('listening'); send(); };
  isListening = true; document.getElementById('micBtn').classList.add('listening'); recognition.start();
}

let ttsEnabled = false;
function toggleTTS() {
  ttsEnabled = !ttsEnabled; window.speechSynthesis.cancel();
  document.getElementById('ttsBtn').classList.toggle('tts-off', !ttsEnabled);
}
