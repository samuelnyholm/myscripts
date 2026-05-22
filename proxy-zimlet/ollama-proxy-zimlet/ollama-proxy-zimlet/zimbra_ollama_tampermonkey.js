// ==UserScript==
// @name         Zimbra → Ollama AI
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Skickar mail-body till Ollama via Zimlet-proxy och visar svaret
// @match        https://DIN-ZIMBRA-SERVER/*          // <-- byt ut mot din URL
// @grant        GM_xmlhttpRequest
// @connect      DIN-ZIMBRA-SERVER                    // <-- samma server
// ==/UserScript==

(function () {
    'use strict';

    // ------------------------------------------------------------------ config
    // Peka på samma host som Zimbra – proxyn sitter på servern
    const PROXY_URL = '/service/extension/ollamaProxy/chat';
    const MODEL     = 'llama3';   // byt mot din modell, t.ex. 'mistral', 'phi3'

    // ------------------------------------------------------------------ UI
    function addButton() {
        // Vänta tills Zimbra-UI är laddat
        const toolbar = document.querySelector('.ZmAppToolBar') ||
                        document.querySelector('[id^="ztb__TV"]');
        if (!toolbar || document.getElementById('ollama-btn')) return;

        const btn = document.createElement('button');
        btn.id        = 'ollama-btn';
        btn.innerText = '🤖 Fråga AI';
        btn.style.cssText = `
            margin: 4px 8px;
            padding: 4px 12px;
            background: #4f46e5;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        `;
        btn.addEventListener('click', onAskAI);
        toolbar.appendChild(btn);
    }

    // ------------------------------------------------------------------ logik
    function getMailBody() {
        // Zimbra 10 renderar mail-body i en iframe med klass ZmIframe
        const iframe = document.querySelector('iframe.ZmIframe');
        if (iframe) {
            return iframe.contentDocument?.body?.innerText?.trim() || '';
        }
        // Fallback – försök hämta aktiv vy
        const view = document.querySelector('.ZmMailMsgView') ||
                     document.querySelector('[id^="zv__MSG"]');
        return view ? view.innerText.trim() : '';
    }

    async function onAskAI() {
        const prompt = getMailBody();
        if (!prompt) {
            alert('Inget mail valt eller ingen text hittades.');
            return;
        }

        const btn = document.getElementById('ollama-btn');
        btn.disabled  = true;
        btn.innerText = '⏳ Tänker...';

        try {
            const response = await fetchProxy(prompt);
            showResult(response);
        } catch (err) {
            alert('Fel vid anrop till Ollama-proxy:\n' + err.message);
            console.error(err);
        } finally {
            btn.disabled  = false;
            btn.innerText = '🤖 Fråga AI';
        }
    }

    function fetchProxy(prompt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method : 'POST',
                url    : PROXY_URL,
                headers: { 'Content-Type': 'application/json' },
                data   : JSON.stringify({ model: MODEL, prompt }),
                onload(res) {
                    if (res.status >= 400) {
                        reject(new Error(`HTTP ${res.status}: ${res.responseText}`));
                        return;
                    }
                    try {
                        const json = JSON.parse(res.responseText);
                        // Ollama /api/generate returnerar { response: "..." }
                        resolve(json.response || res.responseText);
                    } catch {
                        resolve(res.responseText);
                    }
                },
                onerror(err) { reject(new Error('Nätverksfel: ' + JSON.stringify(err))); }
            });
        });
    }

    // ------------------------------------------------------------------ resultatfönster
    function showResult(text) {
        // Ta bort eventuellt gammalt fönster
        document.getElementById('ollama-result')?.remove();

        const panel = document.createElement('div');
        panel.id = 'ollama-result';
        panel.style.cssText = `
            position: fixed;
            top: 60px; right: 20px;
            width: 420px; max-height: 70vh;
            overflow-y: auto;
            background: #fff;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,.15);
            z-index: 99999;
            font-family: sans-serif;
            font-size: 14px;
        `;
        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:10px 14px;background:#4f46e5;color:#fff;border-radius:8px 8px 0 0">
                <strong>🤖 AI-svar</strong>
                <span style="cursor:pointer;font-size:18px" onclick="this.closest('#ollama-result').remove()">✕</span>
            </div>
            <div style="padding:14px;white-space:pre-wrap">${escapeHtml(text)}</div>
        `;
        document.body.appendChild(panel);
    }

    function escapeHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ------------------------------------------------------------------ bootstrap
    // Zimbra är en SPA – vänta tills DOM är klar
    const observer = new MutationObserver(() => addButton());
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(addButton, 3000); // extra säkerhet

})();
