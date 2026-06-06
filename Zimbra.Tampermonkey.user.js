// ==UserScript==
// @name         Infoga i mail-editor iframe
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Skickar mail-text till Ollama AI och infogar svaret i editorn
// @author       Samuel
// @match        https://192.168.50.22:8443/*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

	const OLLAMA_PROXY_URL = '/service/extension/ollamaProxy/chat';
    const MODEL = 'openeurollm-finnish-gpu';
	// === Globala systeminstruktioner som läggs till varje prompt ===

	const SYSTEM_INSTRUCTIONS = [
        'Sinulle annetaan sähköpostiviesti. Ohita sähköpostin otsikkotiedot kuten From:, To:, Subject:, Date: ja muut vastaavat kentät. Keskity ainoastaan sähköpostin varsinaiseen sisältöön eli viestin tekstiin.',
        'Vastaa aina suomeksi.',
        // muut ohjeet...
    ];

    // === Skapa knapp ===
    const btn = document.createElement('button');
    btn.innerText = '🤖 Ask AI';
    btn.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        padding: 12px 20px; background: #2196F3; color: white;
        border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
    `;
    document.body.appendChild(btn);
    btn.addEventListener('click', openPopup);

    // === Skapa modal ===
    function createModal() {
        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'ai-modal-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
        `;

        // Modal box
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1e1e2e; color: #cdd6f4; border-radius: 10px;
            padding: 20px; width: 90vw; max-width: 1100px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5); font-family: sans-serif;
            display: flex; flex-direction: column; gap: 12px;
        `;

        // Rubrik + stäng-knapp
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
        const title = document.createElement('h3');
        title.innerText = '🤖 AI Mail-assistent';
        title.style.margin = '0';
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '✕';
        closeBtn.style.cssText = `
            background: none; border: none; color: #cdd6f4;
            font-size: 18px; cursor: pointer;
        `;
        closeBtn.addEventListener('click', () => overlay.remove());
        header.appendChild(title);
        header.appendChild(closeBtn);

        // Fält 2: Instruktioner (ovanför, smal)
        const labelInstruction = document.createElement('label');
        labelInstruction.innerText = 'Instruktion till AI:';
        labelInstruction.style.cssText = 'font-size: 13px; color: #a6adc8;';
        const instructionArea = document.createElement('textarea');
        instructionArea.id = 'ai-instruction';
        instructionArea.placeholder = 'T.ex. "Förbättra tonen" eller "Översätt till engelska"...';
        instructionArea.style.cssText = `
            width: 100%; height: 70px; resize: vertical;
            background: #313244; color: #cdd6f4; border: 1px solid #45475a;
            border-radius: 6px; padding: 8px; font-size: 13px; box-sizing: border-box;
        `;

        // Nedre rad: Fält 1 (vänster) + Fält 3 (höger)
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; gap: 12px; flex: 1;';

        // Fält 1: Mail-body (vänster)
        const leftCol = document.createElement('div');
        leftCol.style.cssText = 'display: flex; flex-direction: column; gap: 4px; flex: 1;';
        const labelBody = document.createElement('label');
        labelBody.innerText = 'Mail-innehåll:';
        labelBody.style.cssText = 'font-size: 13px; color: #a6adc8;';
        const bodyArea = document.createElement('textarea');
        bodyArea.id = 'ai-body';
        bodyArea.placeholder = 'Hämtar text från editorn...';
		bodyArea.rows = 20;
        bodyArea.style.cssText = `
            flex: 1; height: 80px; resize: vertical;
            background: #313244; color: #cdd6f4; border: 1px solid #45475a;
            border-radius: 6px; padding: 8px; font-size: 13px; box-sizing: border-box; width: 100%;
        `;
        leftCol.appendChild(labelBody);
        leftCol.appendChild(bodyArea);

        // Fält 3: AI-svar (höger)
        const rightCol = document.createElement('div');
        rightCol.style.cssText = 'display: flex; flex-direction: column; gap: 4px; flex: 1;';
        const labelResponse = document.createElement('label');
        labelResponse.innerText = 'AI-svar:';
        labelResponse.style.cssText = 'font-size: 13px; color: #a6adc8;';
        const responseArea = document.createElement('textarea');
        responseArea.id = 'ai-response';
        responseArea.placeholder = 'Svaret visas här...';
        responseArea.readOnly = false;
		responseArea.rows = 20;
        responseArea.style.cssText = `
            flex: 1; height: 80px; resize: vertical;
            background: #181825; color: #a6e3a1; border: 1px solid #45475a;
            border-radius: 6px; padding: 8px; font-size: 13px; box-sizing: border-box; width: 100%;
        `;
        rightCol.appendChild(labelResponse);
        rightCol.appendChild(responseArea);

        row.appendChild(leftCol);
        row.appendChild(rightCol);

        // Knappar: Skicka + Infoga
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';

        const sendBtn = document.createElement('button');
        sendBtn.innerText = '📤 Skicka till AI';
        sendBtn.style.cssText = `
            padding: 10px 20px; background: #2196F3; color: white;
            border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
        `;

        const insertBtn = document.createElement('button');
        insertBtn.innerText = '✅ Infoga svar i editor';
        insertBtn.disabled = true;
        insertBtn.style.cssText = `
            padding: 10px 20px; background: #45475a; color: #585b70;
            border: none; border-radius: 6px; cursor: not-allowed; font-size: 14px;
        `;

        sendBtn.addEventListener('click', () => handleSend(sendBtn, insertBtn, responseArea));
        insertBtn.addEventListener('click', () => handleInsert(responseArea, overlay));

        btnRow.appendChild(sendBtn);
        btnRow.appendChild(insertBtn);

        modal.appendChild(header);
        modal.appendChild(labelInstruction);
        modal.appendChild(instructionArea);
        modal.appendChild(row);
        modal.appendChild(btnRow);
        overlay.appendChild(modal);

        // Stäng vid klick utanför
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        return { overlay, bodyArea, instructionArea, responseArea, insertBtn };
    }

    // === Öppna popup och fyll body-fältet ===
    function openPopup() {
        if (document.getElementById('ai-modal-overlay')) return;

        const { overlay, bodyArea } = createModal();
        document.body.appendChild(overlay);

		// Stäng med Escape
		const escHandler = (e) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				e.preventDefault(); // förhindrar även webbläsarens egna Esc-beteenden
				overlay.remove();
				document.removeEventListener('keydown', escHandler);
			}
		};
		document.addEventListener('keydown', escHandler, true);

        // Hämta text från iframe
        const iframe = document.getElementById('ZmHtmlEditor1_body_ifr');
        if (iframe) {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc && doc.body) {
                const divs = Array.from(doc.body.children).filter(el => el.tagName === 'DIV');
                const text = divs.map(d => d.innerText.trim()).filter(Boolean).join('\n').trim();
                bodyArea.value = text || '';
            }
        }
    }

    // === Skicka till AI ===
    async function handleSend(sendBtn, insertBtn, responseArea) {
        const bodyText = document.getElementById('ai-body')?.value?.trim();
        const instruction = document.getElementById('ai-instruction')?.value?.trim();

        if (!bodyText) {
            alert('Mail-fältet är tomt.');
            return;
        }

        //const prompt = instruction
        //    ? `${instruction}\n\n---\n${bodyText}`
        //    : bodyText;
		const systemPrefix = SYSTEM_INSTRUCTIONS
			.filter(s => s.trim() !== '')
			.join('\n');

		const prompt = [
			systemPrefix,
			instruction,
			'---',
			bodyText
		].filter(Boolean).join('\n\n');

        console.log("prompt" + prompt);

        sendBtn.disabled = true;
        sendBtn.innerText = '⏳ Tänker...';
        responseArea.value = '';

        try {
            const res = await fetch(OLLAMA_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                //body: JSON.stringify({ model: MODEL, prompt })
                body: JSON.stringify({
                    model: MODEL,
                    system: SYSTEM_INSTRUCTIONS.filter(s => s.trim() !== '').join('\n'),
                    prompt: instruction ? `${instruction}\n\n---\n${bodyText}` : bodyText
                })
            });

            if (res.status === 401) { alert('Du måste vara inloggad i Zimbra.'); return; }
            if (!res.ok) { alert('Fel från proxyn: ' + res.status); return; }

            const json = await res.json();
            const aiResponse = json.response || JSON.stringify(json);
            responseArea.value = aiResponse;

            // Aktivera infoga-knappen
            insertBtn.disabled = false;
            insertBtn.style.cssText = `
                padding: 10px 20px; background: #a6e3a1; color: #1e1e2e;
                border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;
            `;
        } catch (err) {
            alert('Fel: ' + err.message);
            console.error(err);
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerText = '📤 Skicka till AI';
        }
    }

    // === Infoga svar i editorn ===
    function handleInsert(responseArea, overlay) {
        const aiResponse = responseArea.value.trim();
		if (!aiResponse) { alert('Inget svar att infoga.'); return; }

		const iframe = document.getElementById('ZmHtmlEditor1_body_ifr');
		if (!iframe) { alert('Kunde inte hitta mail-editorn.'); return; }

		const doc = iframe.contentDocument || iframe.contentWindow?.document;
		if (!doc || !doc.body) { alert('Mail-editorn är inte redo.'); return; }

		// Konvertera plain text till HTML som Zimbra förstår
		const html = aiResponse
			.split('\n\n')                        // stycken
			.map(para => {
				const lines = para
					.split('\n')
					.map(line => {
						// Fetstil: **text** → <strong>
						line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
						// Kursiv: *text* → <em>
						line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
						return line;
					})
					.join('<br>');
				return `<div>${lines}</div>`;
			})
			.join('<div><br></div>');             // tomt stycke mellan paragrafer

		const wrapper = doc.createElement('div');
		wrapper.style.cssText = `
			font-family: Arial, sans-serif;
			font-size: 12pt;
			color: #000000;
			margin-bottom: 12px;
		`;
		wrapper.innerHTML = textToZimbraHtml(aiResponse);

		if (doc.body.firstChild) {
			doc.body.insertBefore(wrapper, doc.body.firstChild);
		} else {
			doc.body.appendChild(wrapper);
		}

		doc.body.dispatchEvent(new Event('input', { bubbles: true }));
		doc.body.dispatchEvent(new Event('change', { bubbles: true }));

		overlay.remove();
    }

    function textToZimbraHtml(text) {
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    for (let line of lines) {
        // Markdown inline: **fetstil**, *kursiv*, `kod`
        line = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');

        // Rubrik: ## Rubrik
        if (/^#{1,3}\s/.test(line)) {
            if (inList) { html += '</ul>'; inList = false; }
            const level = line.match(/^(#{1,3})/)[1].length;
            const content = line.replace(/^#{1,3}\s/, '');
            html += `<div><strong><span style="font-size:${level === 1 ? '14' : '12'}pt">${content}</span></strong></div>`;

        // Lista: - item eller * item
        } else if (/^[-*]\s/.test(line)) {
            if (!inList) { html += '<ul style="margin:4px 0;padding-left:20px;">'; inList = true; }
            html += `<li>${line.replace(/^[-*]\s/, '')}</li>`;

        // Tom rad = styckebrytning
        } else if (line.trim() === '') {
            if (inList) { html += '</ul>'; inList = false; }
            html += '<div><br></div>';

        // Vanlig rad
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<div>${line}</div>`;
        }
    }

    if (inList) html += '</ul>';
    return html;
}
})();