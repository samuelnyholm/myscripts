Kolla proxy-zimlet\tmp

jars - Kopierat från Zimbra /opt/zimbra/lib/jars/
zimlet - Basic Zimlet zip package filen
OllamaProxyExtension.java - needed to be compiled to ollama-proxy.jar
OllamaProxyHandler.java - needed to be compiled to ollama-proxy.jar
manifest-update.txt - Add content to MANIFEST.MF

Kolla proxy-zimlet

ollama-proxy-zimlet.zip - filen skapad av Claude Ai (okompilerade java filer)
claude.ai.txt - min discussion med Claude Ai


Bygg java filerna:
# javac -cp "/mnt/c/Develop/proxy-zimlet/tmp/jars/*" -d /mnt/c/Develop/proxy-zimlet/tmp/ollama-build /mnt/c/Develop/proxy-zimlet/tmp/*.java

Skapa Jar fil:
# cd ollama-build/
# jar cf /mnt/c/Develop/proxy-zimlet/tmp/ollama-proxy.jar .

Lägg till rätt manifest till jar filen
# jar cfm ollama-proxy.jar /mnt/c/Develop/proxy-zimlet/tmp/manifest-update.txt com/

Skapa ZIP
# mkdir -p mnt/c/Develop/proxy-zimlet/tmp/zimlet-package
# mkdir -p mnt/c/Develop/proxy-zimlet/tmp/zimlet-package/lib

# cp /mnt/c/Develop/proxy-zimlet/tmp/ollama-proxy.jar         /mnt/c/Develop/proxy-zimlet/tmp/zimlet-package/lib/
# cp /mnt/c/Develop/proxy-zimlet/tmp/zimlet/ollama_proxy.xml  /mnt/c/Develop/proxy-zimlet/tmp/zimlet-package/
# cp /mnt/c/Develop/proxy-zimlet/tmp/zimlet/com_ollama_proxy.js /mnt/c/Develop/proxy-zimlet/tmp/zimlet-package/

# cd /mnt/c/Develop/proxy-zimlet/tmp/zimlet-package
# zip -r /mnt/c/Develop/proxy-zimlet/tmp/com_ollama_proxy.zip .

Ladda upp ZIP i Zimlet admin

SSH till 192.168.50.22

Kolla om lib foldern finns skapat, om inte skapa det
# sudo ls -la /opt/zimbra/zimlets-deployed/com_ollama_proxy
# sudo -u zimbra mkdir -p /opt/zimbra/zimlets-deployed/com_ollama_proxy/lib

Ladda upp Jar filen till /home/same/proxy/
# sudo -u zimbra cp /home/same/proxy/ollama-proxy.jar /opt/zimbra/zimlets-deployed/com_ollama_proxy/lib/
# sudo cp /home/same/compile/ollama-proxy.jar /opt/zimbra/lib/ext/ollama-proxy/

Starta om Zimbra
# sudo -u zimbra /opt/zimbra/bin/zmmailboxdctl restart

Kolla att det funkar
# sudo grep -i "ollama" /opt/zimbra/log/mailbox.log | tail -10

Gå till egen maskin och testa
(Borde inte funka längre pga att REST API kräver login)
# curl -X POST https://192.168.50.22:8443/service/extension/ollamaProxy/chat -H "Content-Type: application/json" -k -d '{"model":"llama2","prompt":"Translate to finnish: Hi there!"}'