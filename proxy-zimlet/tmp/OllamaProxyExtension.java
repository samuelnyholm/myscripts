package com.ollama.proxy;

import com.zimbra.cs.extension.ExtensionDispatcherServlet;
import com.zimbra.cs.extension.ZimbraExtension;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

/**
 * OllamaProxyExtension
 *
 * Registreras av Zimbra när Zimlet laddas. Anmäler OllamaProxyHandler
 * som hanterar /service/extension/ollamaProxy/*
 */
public class OllamaProxyExtension implements ZimbraExtension {

    private static final Logger LOG = LogManager.getLogger(OllamaProxyExtension.class);

    @Override
    public String getName() {
        return "ollamaProxy";
    }

    @Override
    public void init() {
        LOG.info("OllamaProxyExtension: initierar, registrerar handler");
		try {
			ExtensionDispatcherServlet.register(this, new OllamaProxyHandler());
		} catch(java.lang.Exception ex) {}
    }

    @Override
    public void destroy() {
        LOG.info("OllamaProxyExtension: avslutas");
        ExtensionDispatcherServlet.unregister(this);
    }
}
