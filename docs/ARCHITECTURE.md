# FrostWalker – technische Architektur

## 1. Empfohlener Stack

| Schicht | Entscheidung | Grund |
| --- | --- | --- |
| Desktop Shell | Tauri 2 | kleine native Distribution, Rust für Datei-/Prozesslogik, Web-UI für schnelle Produktentwicklung |
| Desktop UI | React + TypeScript + Vite | gemeinsames Komponentenmodell mit Webseite; gute Testbarkeit |
| Launcher Core | eigene Rust-Crates hinter stabilen Interfaces | Downloads, Hashes, Instanzen, Java und Prozessstart bleiben unabhängig von der UI |
| Lokale Daten | SQLite + OS-Keychain | transaktionale Instanzdaten; Tokens niemals in Local Storage |
| Webseite/API | Cloudflare Worker mit Static Assets | Frontend und `/api/*` in einem Deployment; aktuelle Cloudflare-Empfehlung für neue Full-Stack-SPAs |
| Cloud-Daten | D1 | Nutzerprofil, Geräte, Aktivitäts-Aggregate und Screenshot-Metadaten |
| Dateien | R2 | private Screenshot-Originale, Thumbnails und Release-Artefakte |
| Hintergrundarbeit | Queues | Thumbnailing, Löschung, Benachrichtigungen und spätere Sync-Jobs |
| iOS | SwiftUI, später | native Share-/Foto-Erfahrung; spricht dieselbe Worker-API |

Cloudflare kann statische Assets und Worker-Logik inzwischen in einer Einheit verteilen. Deshalb ist für einen Neubau ein Worker mit Static Assets einfacher als getrennte Pages- und Worker-Projekte; Pages bleibt möglich, ist aber nicht mehr zwingend. Quelle: [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/).

## 2. Repository-Zielstruktur

```text
apps/
  desktop/             Tauri-App und Desktop-UI
  web/                 Download-, Profil- und Galerie-Webseite
  api/                 Cloudflare Worker
  ios/                 spätere SwiftUI-App
crates/
  launcher-core/       Instanzen, Manifeste, Startargumente
  minecraft-auth/      Microsoft/Xbox/Minecraft-Tokenkette
  modrinth/            API-Adapter, Resolver und Cache
  downloads/           parallele, resumierbare, gehashte Downloads
packages/
  ui/                  Tokens und gemeinsame Web-Komponenten
  contracts/           API-Schemas und generierte Typen
assets/
  brand/
docs/
```

## 3. Launcher-Core

Der Rust-Core wird als Zustandsmaschine gebaut:

```text
Idle → Resolving → Downloading → Verifying → Preparing → Launching → Running → Finished
                                  ↓
                                Failed → Repair
```

Kernregeln:

- UI darf keine beliebigen Shell-Befehle ausführen.
- Jede Tauri-Command hat ein minimales, typisiertes Eingabeschema.
- Downloads landen zunächst in temporären Dateien und werden nach Hash-Prüfung atomar verschoben.
- Gemeinsame Assets/Libraries leben in einem Content-Addressed Cache; Instanzen referenzieren sie.
- Java wird pro Minecraft-Version automatisch gewählt, kann aber pro Instanz überschrieben werden.
- Prozessausgabe wird strukturiert gestreamt und sensible Pfade werden vor Support-Export geschwärzt.
- Startargumente und Auth-Tokens erscheinen nie in Logs.

## 4. Anmeldung

Für eine Desktop-App ist Systembrowser + Authorization Code mit PKCE die bevorzugte UX. Device Code ist ein Fallback, nicht der schöne Standardweg. Microsoft empfiehlt für Desktop-Szenarien seine Authentifizierungsbibliotheken; der genaue Minecraft-/Xbox-Tokenaustausch wird in einer isolierten Core-Komponente implementiert und mit Testkonten validiert. Einstieg: [Microsoft Identity Platform](https://learn.microsoft.com/en-us/entra/identity-platform/), [Device Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code).

Token-Speicherung:

- Windows Credential Manager
- macOS Keychain
- Refresh-Tokens nie an FrostWalker-Webseite oder Cloudflare senden
- Cloud-Konto und Minecraft-Konto bleiben getrennte Identitäten, die der Nutzer bewusst verknüpft
- lokaler Callback nutzt PKCE, `state` und eine kurzlebige Loopback-URL

Vor produktiver Entwicklung muss eine Microsoft-App registriert und der zulässige Minecraft-Authentifizierungsweg bestätigt werden.

## 5. Modrinth-Adapter

- Basis-URL und API-Version sind konfigurierbar.
- `User-Agent`: `TheSocialNetwork35/FrostWalker/<version> (project contact)`.
- Suche wird entprellt und kurz lokal gecacht.
- Stabile Projekt- und Versions-IDs werden persistiert.
- Rate-Limit-Header steuern Backoff; HTTP 410 löst eine klare Adapter-/Update-Meldung aus.
- Hashes aus Versionsdateien sind Teil des Installationsvertrags.
- Abhängigkeiten werden als Graph aufgelöst; Zyklen und Inkompatibilitäten werden erklärt.

Die öffentliche Modrinth-Suche benötigt in der Regel kein Benutzer-Token. Ein optionales Modrinth-OAuth-Konto kommt erst später für Favoriten oder nutzerbezogene Funktionen hinzu. Quelle: [Modrinth API](https://docs.modrinth.com/api/).

## 6. Cloud- und Screenshot-Modell

```text
Desktop / Web / iOS
        │ OAuth-Session + Gerätebindung
        ▼
Cloudflare Worker
   ├── D1: Nutzer, Geräte, Tagesaggregate, Screenshot-Metadaten
   ├── R2: private Originale und Thumbnails
   ├── Queue: Bildjobs und Löschaufträge
   └── Static Assets: Webseite
```

Upload-Ablauf:

1. Client fragt kurzlebige Upload-Berechtigung an.
2. Datei wird mit Größen- und Typgrenze in R2 geladen.
3. Worker verifiziert Besitz und schreibt Metadaten.
4. Queue erzeugt Thumbnail und entfernt Metadaten aus Bilddateien, wenn der Nutzer das wählt.
5. Galerie liefert kurzlebige, autorisierte URLs.

## 7. Distribution und Vertrauen

Tauri kann Windows-Installer als `.msi` oder NSIS-`setup.exe` sowie macOS-Apps und `.dmg` bündeln. macOS-Downloads außerhalb des App Store brauchen Developer-ID-Signierung und Notarisierung. Quelle: [Tauri Distribution](https://v2.tauri.app/distribute/).

Windows SmartScreen basiert auf Herausgeber- und Datei-Reputation. Auch ein korrekt signierter neuer Build kann zunächst als unbekannt erscheinen. Die verlässlichste warnungsfreie Installationsroute ist MSIX über den Microsoft Store; für Direktdownloads werden alle Artefakte konsistent mit derselben vertrauenswürdigen Identität signiert. Quelle: [Microsoft SmartScreen Reputation](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).

Release-Pipeline:

- getrennte Builds auf Windows und macOS;
- reproduzierbare Dependency-Locks und SBOM;
- Tests vor Signierung;
- Authenticode-Signatur für Windows;
- Developer ID + Notarisierung + Stapling für macOS;
- SHA-256-Prüfsummen und signiertes Update-Manifest;
- Release-Webseite zeigt Version, Datum, Betriebssystem und Prüfsumme;
- keine Binärdatei wird nach der Signierung verändert.

## 8. Lizenzgrenze

Prism Launcher und die Modrinth-App sind GPL-lizenziert. Direkte Übernahme kann FrostWalker zur Veröffentlichung abgeleiteter Quelltexte verpflichten. Vor Wiederverwendung treffen wir daher bewusst eine der folgenden Entscheidungen:

1. FrostWalker vollständig kompatibel Open Source unter GPL entwickeln und geeignete Teile wiederverwenden; oder
2. Launcher-Core eigenständig anhand öffentlicher Protokolle und Spezifikationen implementieren, ohne GPL-Code zu kopieren.

Bis zur Entscheidung wird kein externer Launcher-Code übernommen. Mod- und Markenlizenzen werden separat geprüft. Die [Minecraft Usage Guidelines](https://www.minecraft.net/usage-guidelines) verbieten insbesondere eine irreführende offizielle Verbindung und die unerlaubte Weiterverteilung von Spielinhalten.

