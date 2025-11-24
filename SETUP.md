# Kopfnuss PWA - Entwicklungsumgebung

## Setup erstellt
Das Basis-Setup für die Kopfnuss PWA ist erstellt. Die Struktur ist vorhanden, aber die Funktionalität ist noch nicht implementiert (nur Platzhalter und Kommentare).

## Struktur

### Root-Dateien
- `index.html` - Haupt-HTML-Datei mit App-Container
- `style.css` - Mobile-First CSS mit Variablen und Base Styles
- `main.js` - App-Initialisierung und Routing-Skelett
- `manifest.json` - PWA Manifest für Installierbarkeit
- `sw.js` - Service Worker für Offline-Funktionalität

### Ordner
- `screens/` - Screen-Dateien (challenges.html, taskScreen.html, stats.html)
- `components/` - Wiederverwendbare UI-Komponenten (noch nicht implementiert)
- `logic/` - Geschäftslogik (noch nicht implementiert)
- `data/` - Datenmodelle und Konfiguration (noch nicht implementiert)
- `assets/` - Icons, Bilder, Sounds (Platzhalter vorhanden)

## Lokale Entwicklung

### Einfacher HTTP Server
Da PWAs HTTPS erfordern (oder localhost), können Sie einen lokalen Server starten:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Dann öffnen Sie: http://localhost:8000

### PWA testen
1. Öffnen Sie die App in Chrome/Edge
2. Öffnen Sie DevTools (F12)
3. Gehen Sie zum "Application" Tab
4. Prüfen Sie:
   - Manifest
   - Service Worker
   - Cache Storage

### Offline-Modus testen
In Chrome DevTools:
1. "Application" Tab → "Service Workers"
2. Aktivieren Sie "Offline" Checkbox

## Nächste Schritte (TODO)
1. ✅ Basis-Struktur erstellt
2. ⏳ Routing-Logik implementieren (main.js)
3. ⏳ Service Worker Cache implementieren (sw.js)
4. ⏳ UI-Komponenten entwickeln (components/)
5. ⏳ Aufgaben-Generator implementieren (logic/)
6. ⏳ Datenmodelle definieren (data/)
7. ⏳ Icons und Assets erstellen (assets/)
8. ⏳ Screens mit Funktionalität füllen
9. ⏳ Tests schreiben
10. ⏳ Deployment-Setup

## Hinweise
- Alle Dateien enthalten nur Platzhalter und Kommentare
- Keine Logik ist implementiert
- Service Worker ist registriert, aber Cache-Funktionalität ist auskommentiert
- Icons sind Platzhalter und müssen durch echte Assets ersetzt werden
