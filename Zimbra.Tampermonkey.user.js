// ==UserScript==
// @name         Infoga i mail-editor iframe
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Skickar mail-text till Ollama AI och infogar svaret i editorn
// @author       Samuel
// @match        https://192.168.50.22:8443/
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    const OLLAMA_PROXY_URL = '/service/extension/ollamaProxy/chat';
    const MODEL = 'openeurollm-finnish-gpu';

    // Skapa knapp
    const btn = document.createElement('button');
    btn.innerText = '🤖 Fråga AI';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.style.padding = '12px 20px';
    btn.style.background = '#2196F3';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    document.body.appendChild(btn);

    btn.addEventListener('click', handleClick);

    async function handleClick() {
        const iframe = document.getElementById('ZmHtmlEditor1_body_ifr');
        if (!iframe) {
            alert("Kunde inte hitta mail-editorn.");
            return;
        }

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc || !doc.body) {
            alert("Mail-editorn är inte redo.");
            return;
        }

        // Hämta text från alla <div>-barn i editorn
        const divs = Array.from(doc.body.children).filter(el => el.tagName === 'DIV');
        if (divs.length === 0) {
            alert("Ingen text hittades i editorn.");
            return;
        }

        let textToCopy = '';
        divs.forEach(div => {
            textToCopy += div.innerText.trim() + '\n';
        });
        textToCopy = textToCopy.trim();

        if (!textToCopy) {
            alert("Texten är tom.");
            return;
        }

        // Visa laddningsindikator
        btn.disabled = true;
        btn.innerText = '⏳ Tänker...';

        try {
            // Använd fetch – skickar cookies automatiskt (same-origin)
            const res = await fetch(OLLAMA_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ model: MODEL, prompt: textToCopy })
            });

            if (res.status === 401) {
                alert("Du måste vara inloggad i Zimbra.");
                return;
            }
            if (!res.ok) {
                alert("Fel från proxyn: " + res.status);
                return;
            }

            const json = await res.json();
            const aiResponse = json.response || JSON.stringify(json);

            // Infoga AI-svaret överst i editorn
            const currentDoc = iframe.contentDocument || iframe.contentWindow?.document;
            const textDiv = currentDoc.createElement('div');
            textDiv.textContent = aiResponse;

            if (currentDoc.body.firstChild) {
                currentDoc.body.insertBefore(textDiv, currentDoc.body.firstChild);
            } else {
                currentDoc.body.appendChild(textDiv);
            }

            // Trigga TinyMCE/redigerings-händelser
            currentDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
            currentDoc.body.dispatchEvent(new Event('change', { bubbles: true }));

        } catch (err) {
            alert("Fel: " + err.message);
            console.error(err);
        } finally {
            btn.disabled = false;
            btn.innerText = '🤖 Fråga AI';
        }
    }
})();