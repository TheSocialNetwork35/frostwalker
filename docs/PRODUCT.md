# FrostWalker – Produktumfang

Stand: 5. August 2026

## 1. Positionierung

FrostWalker ist ein eigenständiger Minecraft-Java-Launcher mit einem klaren Schwerpunkt:

- **Einfachheit:** Ein primärer „Spielen“-Weg, gute automatische Entscheidungen und verständliche Sprache.
- **Geschwindigkeit:** schneller Launcher-Start, parallele Downloads, wiederverwendete Dateien und ein getestetes Performance-Profil.
- **Offenheit:** Modrinth als integrierte Bibliothek statt eines geschlossenen Mod-Katalogs.
- **Vertrauen:** keine Werbung, keine versteckten Prozesse, nachvollziehbare Downloads und signierte Releases.
- **Persönlichkeit:** Skin, Name, Akzentfarbe, Startseite und später HUD-Module anpassbar.

Der Name bleibt **FrostWalker**. In Fließtext und UI wird er mit großem W geschrieben; technische IDs verwenden `frostwalker`.

## 2. Was Feather beziehungsweise Dawn beinhaltet(e)

Feather wurde inzwischen zu **Dawn** weitergeführt. Die öffentlich dokumentierten Kernfunktionen von Feather waren FPS-Verbesserungen, eigene Fabric-/Forge-Mods, mehr als 40 integrierte Mods, Cross-Server-Chat, Voice-Chat, HUD-Editor, Skin-Manager und lokales Server-Hosting. Dawn bewirbt heute unter anderem mehr als 100 konfigurierbare Module, Voice-Chat, Waypoints, Screenshots, Zoom und FPS-Verbesserungen. Quellen: [Feather](https://feathermc.com/a/), [Dawn](https://dawn.gg/).

Diese Liste ist Inspiration, nicht der MVP-Umfang. FrostWalker kopiert weder UI noch Assets oder proprietären Code.

## 3. Funktionsumfang nach Priorität

### P0 – muss im ersten öffentlichen Build funktionieren

| Bereich | Funktion | Akzeptanzkriterium |
| --- | --- | --- |
| Konto | Microsoft-Anmeldung im Systembrowser | Token landet nicht im Frontend; Abmelden und erneutes Anmelden funktionieren |
| Konto | Minecraft-Profil | Spielername, Kopf-/Skin-Vorschau und Besitzstatus werden angezeigt |
| Instanzen | Erstellen, duplizieren, löschen | Jede Instanz besitzt getrennte Mods, Welten, Einstellungen und Logs |
| Versionen | Vanilla und Fabric | Unterstützte Minecraft- und Loader-Versionen werden kompatibel aufgelöst |
| Start | Ein primärer Play-Button | Download, Prüfung, Java-Auswahl und Start benötigen nach Einrichtung einen Klick |
| Performance | FrostWalker Balanced | Kuratiertes, versioniertes und abschaltbares Profil wird reproduzierbar installiert |
| Alt-Tab | Borderless Fullscreen | Als klarer Schalter aktivierbar; F11 und Alt-Tab verhalten sich erwartbar |
| Modrinth | Suche und Filter | Mods, Modpacks, Resource Packs und Shader nach Version/Loader filtern |
| Modrinth | Installieren/Entfernen/Aktualisieren | Abhängigkeiten werden aufgelöst; inkompatible Versionen werden blockiert |
| Diagnose | Logs und Reparatur | Nutzer kann Log kopieren, Ordner öffnen und Dateien erneut prüfen lassen |
| Updates | Launcher-Update | signierter Update-Feed, Downloadfortschritt, kontrollierter Neustart |
| Distribution | Windows + macOS | signierte Installer; macOS zusätzlich notarisiert |

### P1 – direkt nach dem stabilen Launcher

| Bereich | Funktion |
| --- | --- |
| Bibliothek | Favoriten, Sammlungen, Update-Alles, Changelog und Konflikthinweise |
| Skin Room | Ganzkörper-Vorschau, mehrere Skins speichern, wechseln und Verlauf |
| Screenshots | lokaler Browser, Favoriten, Tags, Löschen, Öffnen und Teilen |
| Statistiken | Spielzeit je Instanz/Version/Server und GitHub-artiges Tagesraster |
| Sync | verschlüsselte Kontosynchronisierung für Einstellungen und Metadaten |
| Onboarding | Hardware-Erkennung, RAM-Empfehlung und drei Qualitätsprofile |
| Komfort | Schnellstart über Taskleiste/Dock, Protokoll-Link und zuletzt gespielte Instanz |

### P2 – eigenes Ökosystem

| Bereich | Funktion |
| --- | --- |
| Mobile/Web | Aktivitätsraster, Profile, Screenshot-Galerie und Geräteverwaltung |
| Screenshot Sync | Opt-in Upload in Originalqualität plus Vorschaubilder |
| Social | Freunde, Status und Einladungen – nur mit klarer Moderations- und Datenschutzstrategie |
| In-Game | eigener kleiner FrostWalker-Mod für Screenshot-Hook, Status und ausgewählte QoL-Funktionen |
| HUD | editierbare Module erst nach stabilem Launcher-Core |
| iOS | native App oder installierbare Web-App nach validiertem Sync-Produkt |

### Vorerst nicht bauen

- Kosmetik-Shop, Währung oder Lootboxen.
- Eigenes Voice-Chat- oder Server-Hosting-Netzwerk.
- Anti-Cheat-Versprechen.
- Bedrock-Support.
- Mehr als ein Mod-Katalog im MVP.
- Ein eigener Mod-Loader oder Fork von Minecraft.

Diese Begrenzung hält das erste Release klein genug, um Login, Downloads, Updates und Reparatur wirklich zuverlässig zu machen.

## 4. Kuratiertes Performance-Profil

Das Standardprofil heißt **Balanced** und ist ein versioniertes Manifest, keine fest in den Launcher kopierte JAR-Sammlung. Der Resolver wählt nur Versionen aus, die zur gewählten Minecraft-/Fabric-Version passen.

Vorgesehene Kandidaten:

- Sodium – Rendering
- Lithium – Spiellogik
- FerriteCore – Speicherbedarf
- ImmediatelyFast – unmittelbares Rendering/HUD
- Entity Culling – nicht sichtbare Entitäten
- Dynamic FPS – Ressourcenverbrauch im Hintergrund
- ModernFix – Startzeit, Speicher und Fehlerbehebungen, sofern für die Version empfohlen
- FastQuit – schneller zurück zum Menü
- Cubes Without Borders – Borderless Fullscreen und schnelles Alt-Tab
- Mod Menu und erforderliche Konfigurationsbibliotheken

Die konkrete Kombination wird pro Minecraft-Version automatisiert getestet. „Mehr FPS“ darf nicht pauschal behauptet werden: Hardware, Welt, Server, Shader und Mod-Kombination verändern das Ergebnis. Für Borderless Fullscreen ist [Cubes Without Borders](https://modrinth.com/mod/cubes-without-borders) ein passender, plattformübergreifender Kandidat; [FastQuit](https://modrinth.com/mod/fastquit) adressiert das Speichern beim Verlassen einer Welt.

## 5. Modrinth-Integration

Die Modrinth-API unterstützt öffentliche Lesezugriffe weitgehend ohne Nutzer-Token. FrostWalker sendet immer einen eindeutig identifizierenden `User-Agent`, speichert stabile Projekt-IDs statt veränderbarer Slugs, beachtet Rate-Limit-Header und behandelt API-Versionen als austauschbare Adapter. Quelle: [Modrinth API](https://docs.modrinth.com/api/).

Installationsablauf:

1. Nutzer wählt Instanz, Minecraft-Version und Loader.
2. Suche wird bereits serverseitig passend gefiltert.
3. FrostWalker wählt eine kompatible Projektversion.
4. Erforderliche und optionale Abhängigkeiten werden sichtbar aufgelöst.
5. Dateien werden in einen Content-Addressed Cache geladen und per SHA-512/SHA-1 geprüft.
6. Erst danach werden sie atomar in die Instanz eingebunden.
7. Ein Lockfile hält Projekt-ID, Versions-ID, Hash, Quelle und Lizenzhinweis fest.

Wichtig: „Auf Modrinth verfügbar“ bedeutet nicht automatisch, dass FrostWalker eine Datei beliebig neu bündeln darf. Wo möglich lädt der Client die gewählte Version direkt von der angegebenen Quelle. Ein eigenes öffentliches Performance-Modpack braucht eine Lizenzprüfung für jeden Bestandteil.

## 6. Aktivität und Screenshot-Sync

Der Desktop-Client erfasst lokal Start-/Endzeit, Instanz und Spielversion. Serveradressen sind standardmäßig **nicht** Bestandteil der Cloud-Synchronisierung. Die Aktivitätsansicht aggregiert Minuten pro lokalem Kalendertag und zeigt sie als 53 × 7 Raster.

Screenshot-Sync ist immer Opt-in:

- Der Client erkennt neue Minecraft-Screenshots.
- Vor dem Upload zeigt er Warteschlange, Dateigröße und Zielkonto.
- Originale gehen in privaten Objektspeicher; Thumbnails werden separat erzeugt.
- Freigabelinks sind zeitlich begrenzt und widerrufbar.
- Nutzer können Cloud-Originale löschen, ohne lokale Dateien zu verlieren.
- Die iOS-/Web-App zeigt nur Daten des angemeldeten Kontos.

## 7. Qualitätsziele

- Launcher zeigt innerhalb von 500 ms eine nutzbare Shell auf typischer Hardware.
- Warmer Start bis zur interaktiven Oberfläche: Ziel unter 1 Sekunde.
- UI bleibt während Downloads und Datei-Prüfung flüssig.
- Abgebrochene Installationen beschädigen keine bestehende Instanz.
- Jede Fehlermeldung nennt Ursache, betroffene Instanz und nächste Handlung.
- Telemetrie ist aus, bis der Nutzer verständlich zustimmt.

