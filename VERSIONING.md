# Kopfnuss Versionsverwaltung

## Übersicht

Kopfnuss verwendet ein semantisches Versionierungssystem (Semantic Versioning) mit automatischem Cache-Management.

## Version Format

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking Changes (z.B. Änderungen an der Datenstruktur)
- **MINOR**: Neue Features (z.B. neue Challenge-Typen)
- **PATCH**: Bug Fixes und kleinere Verbesserungen

Aktuelle Version: **1.0.0**

## Dateien für Versionsverwaltung

### 1. `version.js`
Zentrale Versionskonfiguration:
```javascript
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  get string() { return `${this.major}.${this.minor}.${this.patch}`; },
  get cache() { return `kopfnuss-v${this.major}-${this.minor}-${this.patch}`; }
};
```

### 2. `sw.js` (Service Worker)
- Definiert `APP_VERSION` (muss manuell aktualisiert werden)
- Cache-Name basiert auf Version: `kopfnuss-v1.0.0`
- Automatisches Löschen alter Caches bei Aktivierung

### 3. `manifest.json`
- Enthält `version` Feld für PWA-Manifest

## Cache-Verwaltung

### Automatisches Cache-Cleanup

Bei jeder neuen Version:
1. Service Worker installiert neuen Cache mit neuem Namen
2. Bei Aktivierung werden alle alten Caches gelöscht
3. Nur der aktuelle Cache bleibt bestehen

### Cache-Strategie

**Network First mit Cache Fallback**:
- Versucht zuerst, Ressourcen vom Netzwerk zu laden
- Bei Erfolg: Speichert Response im Cache für Offline-Nutzung
- Bei Fehler: Lädt aus Cache (falls vorhanden)

### Gecachte Dateien

```javascript
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './version.js',
  './data/balancing.js',
  './logic/*.js'  // Alle Logic-Module
];
```

## Version aktualisieren

### Schritt 1: Version erhöhen

**In `version.js`:**
```javascript
export const VERSION = {
  major: 1,
  minor: 1,  // Erhöht für neues Feature
  patch: 0
};
```

**In `sw.js`:**
```javascript
const APP_VERSION = '1.1.0';  // Muss manuell aktualisiert werden
```

**In `manifest.json`:**
```json
{
  "version": "1.1.0"
}
```

### Schritt 2: Deployment

1. Änderungen committen
2. Zu GitHub pushen
3. Bei Zugriff auf App:
   - Neuer Service Worker wird installiert
   - Alte Caches werden automatisch gelöscht
   - Benutzer wird über Update informiert

### Schritt 3: Benutzer-Update

Wenn neuer Service Worker verfügbar:
- Automatische Benachrichtigung erscheint
- Benutzer kann auf "Aktualisieren" klicken
- Seite wird neu geladen mit neuer Version

## Update-Benachrichtigung

Die App zeigt automatisch eine Benachrichtigung, wenn eine neue Version verfügbar ist:

```
┌────────────────────────────────────┐
│ Neue Version verfügbar!            │
│                    [Aktualisieren] │
└────────────────────────────────────┘
```

## Version-Anzeige

Die aktuelle Version wird angezeigt:
- Im Challenge-Screen Header (klein, rechts)
- In der Browser-Konsole beim Start
- Format: `v1.0.0`

## Cache-Größe überwachen

Der Service Worker speichert:
- HTML/CSS/JS Dateien (~50 KB)
- Logic-Module (~30 KB)
- Geladene Ressourcen (~20 KB)

Gesamt: ca. 100 KB pro Version

## Debugging

### Service Worker Status prüfen

**Chrome DevTools:**
1. F12 → Application Tab
2. Service Workers → Kopfnuss
3. Status: "activated and running"

### Cache inspizieren

**Chrome DevTools:**
1. F12 → Application Tab
2. Cache Storage
3. Sehen: `kopfnuss-v1.0.0`

### Logs

In Browser-Konsole:
```
[SW] Installing version: 1.0.0
[SW] Caching app files for version: 1.0.0
[SW] Installation complete
[SW] Activating version: 1.0.0
[SW] Deleting old caches: ['kopfnuss-v0.9.0']
[SW] Deleting cache: kopfnuss-v0.9.0
[SW] Activation complete, version: 1.0.0
```

## Manuelle Cache-Löschung

Falls nötig, manuell löschen:

**Chrome DevTools:**
1. F12 → Application Tab
2. Clear Storage
3. "Clear site data"

Oder programmatisch:
```javascript
// In Browser-Konsole
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
```

## Best Practices

1. **Immer alle drei Dateien aktualisieren** (`version.js`, `sw.js`, `manifest.json`)
2. **MAJOR erhöhen** bei Breaking Changes (z.B. localStorage-Format ändert sich)
3. **MINOR erhöhen** bei neuen Features
4. **PATCH erhöhen** bei Bug Fixes
5. **Testen** vor Deployment: Alte Version → Update → Neue Version
6. **Release Notes** führen für größere Updates

## Troubleshooting

### Problem: Service Worker aktualisiert nicht

**Lösung:**
1. Hard Refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. Service Worker deregistrieren in DevTools
3. Cache manuell löschen

### Problem: Alte Caches bleiben

**Lösung:**
1. Prüfen ob `APP_VERSION` in sw.js aktualisiert wurde
2. Service Worker neu registrieren
3. Browser neu starten

### Problem: Update-Benachrichtigung erscheint nicht

**Lösung:**
1. Prüfen ob Service Worker aktiviert ist
2. Console-Logs prüfen auf Fehler
3. Event Listener in main.js überprüfen

## Rollback

Bei Problemen mit neuer Version:

1. `version.js` auf alte Version zurücksetzen
2. `sw.js` APP_VERSION zurücksetzen
3. `manifest.json` version zurücksetzen
4. Deployen
5. Benutzer müssen hard refresh machen
