# FrostWalker

FrostWalker ist ein schneller und besonders einfach bedienbarer Minecraft-Java-Launcher für Windows und macOS. Er verbindet eine kuratierte Performance-Grundlage mit der Modrinth-Bibliothek, Microsoft-Anmeldung, Skin-Verwaltung und einer ruhigen, hochwertigen Oberfläche.

> Status: **Native Alpha 0.3**. Die Tauri-/Rust-Desktop-App bindet die echte Modrinth-API ein, verwaltet isolierte Instanzen und enthält den Installations- und Startpfad für Minecraft Java mit Fabric. Microsoft OAuth, Crafty-Skin-Rendering, lokale Profile und die sichtbare Startsequenz sind integriert. Die Microsoft-App-ID muss vor einem Release-Build noch hinterlegt und der vollständige Login-/Startweg mit einem Minecraft-Konto abgenommen werden.

## Desktop-App

Der aktive Launcher-Code liegt in [`apps/desktop`](apps/desktop). Lokale Entwicklung:

```bash
cd apps/desktop
npm install
npm run tauri dev
```

Release-Builds werden als `.dmg`/`.app` für macOS und über die vorbereitete GitHub-Actions-Pipeline als `.exe`/`.msi` für Windows erzeugt.

Für einen lokalen Build mit Microsoft-Anmeldung:

```bash
FROSTWALKER_MICROSOFT_CLIENT_ID="deine-entra-client-id" npm run tauri dev
```

Die Client-ID ist öffentlich und darf im Build stehen. Refresh-Tokens werden ausschließlich im lokalen App-Datenverzeichnis gespeichert und auf Unix-Systemen mit Dateirechten `0600` geschützt.

## Produktversprechen

**„Ein Klick bis ins Spiel – schnell, schön und verständlich.“**

FrostWalker soll nicht wie ein überladenes Gaming-Dashboard wirken. Die Standardkonfiguration funktioniert sofort; fortgeschrittene Einstellungen bleiben erreichbar, ohne den Hauptweg zu belasten.

## Dokumentation

- [Produktumfang](docs/PRODUCT.md)
- [Designsystem](docs/DESIGN.md)
- [Technische Architektur](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Offene Entscheidungen](docs/DECISIONS.md)

## Alpha-0.3-Funktionsumfang

1. Microsoft-Konto per Systembrowser verbinden und die Minecraft-Berechtigung übernehmen.
2. Eine stabile Fabric-Instanz samt passender offizieller Java-Laufzeit installieren.
3. Modrinth bereits während der Eingabe durchsuchen, nach Relevanz, Downloads, Follows oder Aktualität sortieren und weitere Ergebnisse beim Scrollen vorladen.
4. Projektbanner, verfügbare Versionen und installierte Mod-Dateien anzeigen.
5. Instanzpfad öffnen, Installation prüfen/reparieren und Minecraft mit sichtbarem Prozessstatus und Logdatei starten.
6. Borderless Fullscreen für schnelles Alt-Tab vorbereiten.
7. Ruhige, klar sichtbare Hover-/Startanimationen mit `prefers-reduced-motion` anbieten.

Noch vor einer öffentlichen Beta erforderlich: Ende-zu-Ende-Abnahme mit einem lizenzierten Minecraft-Konto, Windows-Release-Test sowie Code Signing/Notarisierung für Windows und macOS.

## Grundregeln

- Keine Werbung, kein verstecktes Tracking, keine ungefragten Hintergrundprozesse.
- Keine Zugangsdaten im Web-Frontend oder in Klartextdateien speichern.
- Downloads per Hash prüfen; jede Instanz bleibt isoliert und reparierbar.
- Mod-Lizenzen und Modrinth-Abhängigkeiten respektieren.
- Minecraft- und Microsoft-Marken nicht als eigene Marke ausgeben.
