package com.ollama.proxy;

import com.zimbra.cs.extension.ZimbraExtension;
import com.zimbra.cs.servlet.ZimbraServlet;
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
    public void init() throws Exception {
        LOG.info("OllamaProxyExtension: initierar, registrerar servlet-handler");
        ZimbraServlet.addServlet("ollamaProxy", OllamaProxyHandler.class);
    }

    @Override
    public void destroy() {
        LOG.info("OllamaProxyExtension: avslutas");
    }
}
