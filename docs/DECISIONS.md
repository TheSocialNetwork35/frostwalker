# FrostWalker – offene Entscheidungen

## Entscheidungen, die vor dem Core fallen müssen

| ID | Frage | Empfehlung | Status |
| --- | --- | --- | --- |
| D-001 | Open Source oder proprietär? | öffentliches Repository und permissive Eigenkomponenten; GPL-Code nur bei bewusster GPL-Entscheidung | offen |
| D-002 | Primärer Loader? | Fabric zuerst; NeoForge/Forge nach stabilem Resolver | vorgeschlagen |
| D-003 | Betriebssysteme im ersten Release? | Windows x64 und macOS Apple Silicon; Intel macOS später nach Nachfrage | vorgeschlagen |
| D-004 | Webseite auf Pages oder Workers? | Worker mit Static Assets für neue Full-Stack-App; Domain bleibt unabhängig | vorgeschlagen |
| D-005 | FrostWalker-Konto im MVP? | nein; Microsoft-Login lokal, Cloud-Konto erst mit Sync | vorgeschlagen |
| D-006 | Telemetrie? | keine im MVP; später explizites Opt-in für anonymisierte Stabilitätsdaten | vorgeschlagen |
| D-007 | Windows-Verteilung? | Direktdownload signiert plus später MSIX im Store | vorgeschlagen |
| D-008 | Akzentfarbe? | Mint `#52D9C2` als Default, Nutzerwahl mit Kontrastschutz | vorgeschlagen |

## Produktfragen für den nächsten Review

1. Soll FrostWalker vollständig Open Source sein?
2. Ist Fabric-first akzeptiert, oder muss Forge bereits im ersten öffentlichen Build enthalten sein?
3. Soll das aktuelle Signet exakt übernommen oder geometrisch verfeinert werden?
4. Wirkt Mint als Default passend, oder soll FrostWalker rein schwarz/weiß starten?
5. Soll die erste öffentliche Oberfläche nur Deutsch oder direkt Deutsch und Englisch unterstützen?

