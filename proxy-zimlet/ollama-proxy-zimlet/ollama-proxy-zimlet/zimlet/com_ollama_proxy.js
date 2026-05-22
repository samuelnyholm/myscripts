/*
 * com_ollama_proxy Zimlet
 * Client-side entry point – registreras av Zimbra men all logik
 * sker server-side via /service/extension/ollamaProxy/chat
 */
function com_ollama_proxy_HandlerObject() {}

com_ollama_proxy_HandlerObject.prototype = new ZmZimletBase();
com_ollama_proxy_HandlerObject.prototype.constructor = com_ollama_proxy_HandlerObject;

com_ollama_proxy_HandlerObject.prototype.init = function() {
    // Zimlet är redo. Tampermonkey-pluginet anropar direkt REST-endpointen.
};
