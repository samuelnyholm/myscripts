// ==UserScript==
// @name         Infoga i mail-editor iframe
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Infoga i mail-editor iframe
// @author       Samuel
// @match        https://mail.novafloor.fi/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Skapa din knapp (om du vill trigga manuellt)
    const btn = document.createElement('button');
    btn.innerText = 'Infoga Hejsan i editor';
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

    btn.addEventListener('click', injectToEditor);

    // Eller kör automatiskt efter en stund (ta bort kommentar om du vill)
    // setTimeout(injectToEditor, 3000);

    function injectToEditor() {
        const iframe = document.getElementById('ZmHtmlEditor1_body_ifr');

        if (!iframe) {
            console.log("Iframe HtmlEditor1_body_ifr hittades inte");
            return;
        }

        function tryInject() {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;

                if (!doc || !doc.body) {
                    console.log("Iframe body inte redo än – väntar...");
                    setTimeout(tryInject, 500); // Polla var 0.5 sekund
                    return;
                }

                // Hämta ALLA direkta <div>-barn till body
                const divs = Array.from(doc.body.children)
                    .filter(el => el.tagName === 'DIV');

                if (divs.length === 0) {
                    alert("Inga <div>-element hittades direkt under body");
                    return;
                }

                let textToCopy = '';
                divs.forEach((div, index) => {
                    const text = div.innerText.trim();
                    textToCopy += text;
                });
                //let textDiv = '<div>' + textToCopy + '</div>';
                const textDiv = doc.createElement('div');
                textDiv.textContent = textToCopy;
                if (doc.body.firstChild) {
                    doc.body.insertBefore(textDiv, doc.body.firstChild);
                } else {
                    doc.body.appendChild(textDiv);
                }
                // Nu finns body – infoga!
                //const div = doc.createElement('div');
                //div.textContent = 'Hejsan';

                // Högst upp i editorn
                //if (doc.body.firstChild) {
                //    doc.body.insertBefore(div, doc.body.firstChild);
                //} else {
                //    doc.body.appendChild(div);
                //}

                // Trigga TinyMCE/redigerings-händelser (viktigt!)
                doc.body.dispatchEvent(new Event('input', { bubbles: true }));
                doc.body.dispatchEvent(new Event('change', { bubbles: true }));

                console.log("Hejsan infogat i editorns body!");
                alert("Hejsan infogat i mailet!");

            } catch (err) {
                console.error("Fel vid åtkomst till iframe:", err);
                // Om SecurityError → cross-origin trots allt (ovanligt här)
            }
        }

        // Starta försöket direkt eller vänta på load
        if (iframe.contentDocument?.readyState === 'complete') {
            tryInject();
        } else {
            iframe.addEventListener('load', tryInject, { once: true });
        }
    }
})();