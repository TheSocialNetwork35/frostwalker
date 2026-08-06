# FrostWalker – Roadmap

Die Roadmap ist absichtlich in überprüfbare Gates statt Wunschtermine gegliedert.

## Phase 0 – Richtung festlegen (jetzt)

- [x] Produktversprechen und Zielgruppe formulieren
- [x] Referenzbilder in Designprinzipien übersetzen
- [x] Feather-/Dawn-Funktionsumfang dokumentieren
- [x] MVP, spätere Funktionen und Nicht-Ziele trennen
- [x] Architektur- und Distributionsrichtung festhalten
- [x] erste Vektorinterpretation des Signets anlegen
- [ ] Open-Source-/Lizenzmodell entscheiden
- [ ] drei Kernansichten als klickbaren Desktop-Prototyp bauen
- [ ] Wortmarke und Logo-Geometrie finalisieren

**Gate:** Home, Discover und Skin Room fühlen sich als ein Produkt an; MVP und Lizenzmodell sind freigegeben.

## Phase 1 – Launcher-Kern ohne echtes Konto

- Tauri-/React-Monorepo aufsetzen
- lokale Instanzdatenbank und Dateilayout
- Downloadmanager mit Pause, Resume, Hashprüfung und atomaren Updates
- Minecraft-/Fabric-Manifeste auflösen
- Java-Erkennung und versiongerechte Runtime
- Offline-Testprofil mit simuliertem Startprozess
- strukturierte Logs, Crash-Auswertung und Reparatur

**Gate:** Eine Testinstanz kann wiederholbar installiert, aktualisiert, beschädigt und repariert werden.

## Phase 2 – echtes Spielen

- Microsoft-App-Registrierung und Browser-PKCE
- Minecraft-Besitz und Profil validieren
- Vanilla und Fabric starten
- Prozess-/Spielzeit erfassen
- Borderless Fullscreen integrieren
- Balanced-Performance-Manifest und Kompatibilitätstests

**Gate:** Zehn saubere End-to-End-Installationen auf Windows und macOS, einschließlich Token-Erneuerung und Offline-Fall.

## Phase 3 – Modrinth

- Suche, Filter und Detailansicht
- Abhängigkeitsauflösung und Konflikterklärung
- Mods, Resource Packs, Shader und Modpacks
- Updates, Rollback und Lockfile
- Lizenz-/Quellenanzeige
- API-Cache und Rate-Limit-Verhalten

**Gate:** Eine Instanz bleibt nach unterbrochenen Downloads und inkompatiblen Mod-Updates reparierbar.

## Phase 4 – Release

- Auto-Updater mit signiertem Manifest
- Windows `.exe`/`.msi` signieren
- macOS Universal/Architektur-Builds als signierte, notarized `.dmg`
- Download-Webseite mit Prüfsummen
- Datenschutz, Nutzungsbedingungen und Minecraft-Hinweis
- geschlossene Beta und Crash-Triage

**Gate:** Installationen auf frischen Betriebssystemen, Update und Rollback sind dokumentiert und reproduzierbar.

## Phase 5 – FrostWalker Cloud

- separates FrostWalker-Konto und Geräteverwaltung
- D1-Aktivitätsdaten und GitHub-artiges Raster
- lokale Screenshot-Galerie
- Opt-in Upload nach R2, Thumbnails und Löschung
- responsive Web-Galerie
- iOS-App erst nach stabiler Web-/API-Erfahrung

**Gate:** Datenschutzexport und vollständige Cloud-Löschung funktionieren automatisiert.

## Empfohlener nächster Arbeitsschritt

Ein klickbarer Desktop-Prototyp mit drei realistischen Zuständen:

1. **Home / Ready:** Skin, Name, Instanz, Version und Play.
2. **Discover / Installing:** Modrinth-Suche, Kompatibilität und Downloadfortschritt.
3. **Activity / Synced:** Tagesraster, Spielzeit und Screenshot-Karte.

Erst nach Freigabe dieser Navigation wird das Tauri-Monorepo angelegt. So entscheiden wir die Produktstruktur, bevor sich UI und Core gegenseitig festlegen.

