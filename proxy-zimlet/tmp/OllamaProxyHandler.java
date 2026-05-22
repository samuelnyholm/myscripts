package com.ollama.proxy;

import com.zimbra.cs.extension.ExtensionHttpHandler;
import com.zimbra.cs.extension.ZimbraExtension;
import com.zimbra.cs.account.AuthToken;
import com.zimbra.cs.account.AuthTokenException;
import com.zimbra.cs.servlet.util.AuthUtil;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

/**
 * OllamaProxyHandler
 *
 * Lyssnar på: /service/extension/ollamaProxy/chat  (POST)
 *
 * Tar emot JSON från Tampermonkey:
 * {
 *   "model": "llama3",          // valfri, faller tillbaka på OLLAMA_DEFAULT_MODEL
 *   "prompt": "<mail-text>"
 * }
 *
 * Returnerar Ollamasvaret rakt tillbaka som JSON.
 *
 * Konfigurera Ollama-URL med systemproperty eller miljövariabel:
 *   -Dollama.base.url=http://localhost:11434   (JVM-arg i Zimbra)
 */
public class OllamaProxyHandler extends ExtensionHttpHandler {

    private static final Logger LOG = LogManager.getLogger(OllamaProxyHandler.class);

    private static final String OLLAMA_URL =
            System.getProperty("ollama.base.url",
                    System.getenv().getOrDefault("OLLAMA_BASE_URL", "http://192.168.50.20:11434"));

    private static final String DEFAULT_MODEL =
            System.getProperty("ollama.default.model",
                    System.getenv().getOrDefault("OLLAMA_DEFAULT_MODEL", "llama3"));

    private static final int TIMEOUT_MS = 120_000; // 2 minuter

    @Override
    public void init(ZimbraExtension ext) {
		try {
			super.init(ext);
		} catch(java.lang.Exception ex) {}
    }

    @Override
    public String getPath() {
        return "/ollamaProxy";
    }

    // ------------------------------------------------------------------ POST
    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {

		// --- Kontrollera att användaren är inloggad ---
        try {
            AuthToken authToken = AuthUtil.getAuthTokenFromHttpReq(req, false);
            if (authToken == null || authToken.isExpired()) {
                LOG.warn("OllamaProxy: obehörig åtkomst från {}", req.getRemoteAddr());
                sendError(resp, HttpServletResponse.SC_UNAUTHORIZED, "Inloggning krävs");
                return;
            }
        } catch (Exception e) {
            LOG.warn("OllamaProxy: ogiltig auth token från {}", req.getRemoteAddr());
            sendError(resp, HttpServletResponse.SC_UNAUTHORIZED, "Ogiltig session");
            return;
        }


        // --- Läs inkommande body ---
        String body = req.getReader().lines().collect(Collectors.joining("\n"));
        LOG.debug("OllamaProxy inkommande body: {}", body);

        String model   = extractJsonField(body, "model");
        String prompt  = extractJsonField(body, "prompt");

        if (model  == null || model.isBlank())  model  = DEFAULT_MODEL;
        if (prompt == null || prompt.isBlank()) {
            sendError(resp, HttpServletResponse.SC_BAD_REQUEST, "Fältet 'prompt' saknas");
            return;
        }

        // --- Bygg Ollama-request ---
        String ollamaPayload = String.format(
                "{\"model\":\"%s\",\"prompt\":%s,\"stream\":false}",
                escapeJson(model),
                toJsonString(prompt)
        );

        // --- Skicka till Ollama ---
        URL ollamaEndpoint = new URL(OLLAMA_URL + "/api/generate");
        HttpURLConnection conn = (HttpURLConnection) ollamaEndpoint.openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(TIMEOUT_MS);
            conn.setReadTimeout(TIMEOUT_MS);
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");

            try (OutputStream os = conn.getOutputStream()) {
                os.write(ollamaPayload.getBytes(StandardCharsets.UTF_8));
            }

            int status = conn.getResponseCode();
            InputStream is = (status < 400) ? conn.getInputStream() : conn.getErrorStream();
            String ollamaResponse = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))
                    .lines().collect(Collectors.joining("\n"));

            resp.setStatus(status);
            resp.setContentType("application/json; charset=UTF-8");
            resp.setHeader("Access-Control-Allow-Origin", "*");
            resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

            try (PrintWriter writer = resp.getWriter()) {
                writer.print(ollamaResponse);
            }

        } finally {
            conn.disconnect();
        }
    }

    // ------------------------------------------------------------ OPTIONS (CORS preflight)
    @Override
    public void doOptions(HttpServletRequest req, HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    // ---------------------------------------------------------------- helpers
    private void sendError(HttpServletResponse resp, int code, String msg) throws IOException {
        resp.setStatus(code);
        resp.setContentType("application/json; charset=UTF-8");
        resp.getWriter().print("{\"error\":\"" + escapeJson(msg) + "\"}");
    }

    private String extractJsonField(String json, String field) {
        String key = "\"" + field + "\"";
        int idx = json.indexOf(key);
        if (idx < 0) return null;
        int colon = json.indexOf(':', idx + key.length());
        if (colon < 0) return null;
        String rest = json.substring(colon + 1).trim();
        if (rest.startsWith("\"")) {
            StringBuilder sb = new StringBuilder();
            boolean escape = false;
            for (int i = 1; i < rest.length(); i++) {
                char c = rest.charAt(i);
                if (escape) { sb.append(c); escape = false; }
                else if (c == '\\') escape = true;
                else if (c == '"') break;
                else sb.append(c);
            }
            return sb.toString();
        }
        return null;
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    private String toJsonString(String s) {
        return "\"" + escapeJson(s) + "\"";
    }
}
