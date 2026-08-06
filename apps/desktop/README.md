# FrostWalker Desktop

Native Desktop-Anwendung auf Basis von Tauri 2, React und Rust.

## Aktueller Funktionsstand

- native macOS-/Windows-Shell
- reale Modrinth-Suche über den Rust-Core
- persistentes lokales Profil mit Hinzufügen und Entfernen von Mods
- sofort anpassbare Akzentfarbe und Performance-Voreinstellungen
- Crafty-basierter 3D Skin Room mit lokalem Standard-Skin-Fallback
- animierte Startsequenz und gestaffelte Ansichtswechsel
- Smart-Filter, Quick-Menü, Hilfe-Status und repariertes App-Scrolling
- Systemstatus und vorbereiteter Microsoft-Kontobereich
- Bundle-Konfiguration für `.dmg`, `.app`, `.exe` und `.msi`

## Entwicklung

```bash
npm install
npm run tauri dev
```

## Produktive Microsoft-Anmeldung

Vor dem Release muss eine eigene Microsoft-Anwendung registriert werden. Die Client-ID wird beim Build als `FROSTWALKER_MICROSOFT_CLIENT_ID` bereitgestellt. Fremde Launcher-Client-IDs werden nicht übernommen. Das aktuell verwendete Microsoft-Konto benötigt dafür zunächst ein Entra-Verzeichnis (Azure oder M365 Developer Program).
