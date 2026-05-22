# Zimbra Ollama Proxy Zimlet

## Arkitektur

```
Tampermonkey (browser)
      │  POST /service/extension/ollamaProxy/chat
      ▼
Zimbra 10 (OllamaProxyHandler.java)
      │  POST http://localhost:11434/api/generate
      ▼
Ollama (intern server, ej exponerad mot internet)
```

---

## Steg 1 – Kompilera Java-koden

Du behöver Zimbra SDK / server-libs på classpath. På en Zimbra 10-server
finns de normalt under `/opt/zimbra/lib/jars/`.

```bash
javac -cp /opt/zimbra/lib/jars/*  \
      server/OllamaProxyExtension.java \
      server/OllamaProxyHandler.java

# Packa till JAR
mkdir -p build/com/ollama/proxy
cp server/*.class build/com/ollama/proxy/
jar cf ollama-proxy.jar -C build .
```

---

## Steg 2 – Packa Zimlet-filen (.zip)

Zimlets laddas upp som en ZIP med följande struktur:

```
com_ollama_proxy.zip
├── ollama_proxy.xml          (manifest)
├── com_ollama_proxy.js       (klient-JS)
└── lib/
    └── ollama-proxy.jar      (server-extension)
```

```bash
mkdir -p package/lib
cp zimlet/ollama_proxy.xml  package/
cp zimlet/com_ollama_proxy.js package/
cp ollama-proxy.jar          package/lib/

cd package
zip -r ../com_ollama_proxy.zip .
cd ..
```

---

## Steg 3 – Ladda upp via Admin Console

1. Logga in på `https://DIN-ZIMBRA:7071/zimbraAdmin`
2. Gå till **Zimlets** (vänster meny)
3. Klicka **Deploy Zimlet**
4. Välj `com_ollama_proxy.zip` och klicka **Deploy**
5. Starta om Zimbra mailbox-tjänsten:
   ```bash
   sudo -u zimbra /opt/zimbra/bin/zmcontrol restart
   # eller bara mailbox:
   sudo -u zimbra /opt/zimbra/bin/zmmailboxdctl restart
   ```

---

## Steg 4 – Konfigurera Ollama-URL (om inte localhost:11434)

Lägg till JVM-argument i Zimbra:

```bash
sudo -u zimbra zmprov mcf zimbraMailboxdJavaAdditionalOptions \
    "-Dollama.base.url=http://MIN-OLLAMA-HOST:11434 -Dollama.default.model=llama3"
```

Eller sätt miljövariabeln `OLLAMA_BASE_URL` innan Zimbra startas.

---

## Steg 5 – Installera Tampermonkey-pluginet

1. Öppna `zimbra_ollama_tampermonkey.js` i en editor
2. Byt ut `DIN-ZIMBRA-SERVER` mot din Zimbra-webbadress (t.ex. `mail.foretaget.se`)
3. Skapa ett nytt script i Tampermonkey och klistra in innehållet
4. Spara och ladda om Zimbra webmail
5. En **🤖 Fråga AI**-knapp dyker upp i verktygsfältet

---

## Endpoint-referens

| Metod  | URL                                        | Beskrivning              |
|--------|--------------------------------------------|--------------------------|
| POST   | `/service/extension/ollamaProxy/chat`      | Skicka prompt till Ollama|
| OPTIONS| `/service/extension/ollamaProxy/chat`      | CORS preflight           |

### Request body
```json
{
  "model": "llama3",
  "prompt": "Sammanfatta det här mailet: ..."
}
```

### Response (vidarebefordrat direkt från Ollama)
```json
{
  "model": "llama3",
  "response": "Det här mailet handlar om...",
  "done": true
}
```

---

## Felsökning

- **404 på endpointen** – Zimlet inte deployad korrekt eller mailbox ej omstartad
- **Connection refused till Ollama** – Kontrollera `OLLAMA_BASE_URL` och brandvägg
- **CORS-fel** – Tampermonkey och Zimbra måste köra på samma domän, eller justera `Access-Control-Allow-Origin` i `OllamaProxyHandler.java`
- **Knappen syns inte** – Zimbra-UI kan ha ändrat CSS-selektorer; justera `getMailBody()` och `addButton()` i Tampermonkey-scriptet
