# FrostWalker – visuelle Richtung

## 1. Auswertung der Referenzen

Die acht Referenzen teilen eine klare Designsprache:

- fast monochrome, helle Flächen statt dunkler Gaming-Chrome;
- große Radien, ruhige Karten und sehr feine Konturen;
- weiche, breite Schatten statt harter Drop-Shadows;
- starke schwarze Typografie und viel ungenutzter Raum;
- pillenförmige Segmente, Tabs und Primäraktionen;
- Farbe als gezieltes Signal, nicht als permanente Dekoration;
- editorartige Seitenleisten und klar getrennte Arbeitsbereiche;
- Datenvisualisierung mit einer einzigen Akzentfarbe;
- ein plakatives, schwarzes Signet auf Weiß.

FrostWalker übernimmt diese Prinzipien, nicht die konkreten Layouts. Die 3D-/Clay-Anmutung aus einigen Bildern eignet sich für Marketing und Onboarding, aber nicht als dauerhafte Materialsimulation im Launcher: starke Schatten und Glasflächen würden bei häufigen Aktionen schnell schwer wirken.

## 2. Markencharakter

**Frostig, ruhig, präzise, schnell.**

Das Interface ist überwiegend warmweiß und anthrazit. „Frost“ wird nicht durch Eistexturen oder Blauzwang dargestellt, sondern durch Klarheit, Luft, scharfe Typografie und eine kühle optionale Akzentfarbe. „Walker“ steht für Fortschritt und wird in Statusanzeigen, dem Aktivitätsraster und subtilen Richtungsbewegungen sichtbar.

## 3. Design Tokens

### Farbe

| Token | Default | Verwendung |
| --- | --- | --- |
| `canvas` | `#F3F3F1` | Fensterhintergrund |
| `surface` | `#FFFFFF` | primäre Flächen |
| `surface-subtle` | `#F7F7F5` | Inputs, sekundäre Panels |
| `ink` | `#111111` | Text, Logo, Primärbutton |
| `ink-muted` | `#72726E` | Metadaten |
| `line` | `#E4E4E0` | Konturen und Separatoren |
| `accent` | `#52D9C2` | Fortschritt, Auswahl, Daten |
| `danger` | `#D94A3D` | destruktive Aktionen |
| `warning` | `#D58A22` | Konflikte und Hinweise |

Die Akzentfarbe ist anpassbar. Kontrast und semantische Farben bleiben dabei geschützt; Nutzerfarbe ersetzt niemals Fehlerrot oder Warnorange.

### Typografie

- UI-Schrift: Inter oder systemnahe Sans; keine Font-Datei ist für den ersten Paint zwingend.
- Display: 40/44, Gewicht 650.
- Titel: 24/30, Gewicht 650.
- Abschnitt: 16/22, Gewicht 620.
- Body: 14/20, Gewicht 450.
- Meta: 12/16, Gewicht 500, sparsam in Versalien.
- Zahlen in Statistiken: tabellarische Ziffern.

### Form und Tiefe

- Fenster-/Hero-Radius: 28 px.
- Karten: 20 px.
- Inputs und kleine Buttons: 12 px.
- Pills: volle Rundung.
- Standardabstände: 4, 8, 12, 16, 24, 32, 48 px.
- Schatten: maximal zwei weiche Ebenen; Listenzeilen bleiben flach.

## 4. Launcher-Struktur

Die Desktop-App verwendet eine schmale linke Navigation und einen großen Arbeitsbereich:

1. **Home** – Profil, aktuelle Instanz, großer Play-Button, Updates.
2. **Library** – Instanzen und Modpacks.
3. **Discover** – Modrinth-Suche für Mods, Packs, Shader und Resource Packs.
4. **Screenshots** – lokale Galerie; später Sync.
5. **Activity** – Spielzeit und Tagesraster.
6. **Profile** – Skin Room und Konten.
7. **Settings** – Java, Speicher, Downloads, Theme, Datenschutz und Diagnose.

Der Play-Button bleibt als primäre Aktion sichtbar. Download- und Installationsstatus ersetzen seinen Inhalt, ohne die Seite komplett umzubauen.

## 5. Interaktionsregeln

- Häufige Tastaturaktionen reagieren sofort und ohne Bewegungsanimation.
- Button-Press: 120–160 ms, `scale(0.97)`.
- Popover/Select: 160–200 ms mit kräftigem Ease-out.
- Drawer/Modal: 220–280 ms; Modals skalieren aus der Mitte, Popovers vom Auslöser.
- Nur `transform` und `opacity` werden bewegt.
- Keine UI-Animation dauert länger als 300 ms.
- `prefers-reduced-motion` entfernt Wegbewegungen, behält hilfreiche Fades.
- Hover-Effekte werden nur für Geräte mit feinem Pointer aktiviert.
- Fortschritt ist determiniert, wenn Bytes bekannt sind; unbestimmte Spinner nur als letzte Wahl.

Damit beeinflusst die Design-Engineering-Richtlinie konkret die Produktentscheidung: Animation dient Rückmeldung und räumlicher Orientierung, nicht Show. Das schützt auch das Performance-Versprechen des Launchers.

## 6. Schreibstil

- kurz und konkret: „Fabric 0.17 wird installiert“ statt „Deine Magie wird vorbereitet“;
- Ursache plus Lösung: „Sodium passt nicht zu Minecraft 1.20.1. Andere Version wählen“;
- deutsche UI zuerst, englische Fallback-Texte vollständig gepflegt;
- keine künstliche Dringlichkeit, keine Werbebanner und keine manipulativen Opt-ins.

## 7. Logo

Das gelieferte schwarze Stern-/Frost-Signet auf Weiß ist die Basis. Eine erste saubere Vektorinterpretation liegt unter [`assets/brand/frostwalker-mark.svg`](../assets/brand/frostwalker-mark.svg). Vor Veröffentlichung braucht sie eine geometrische Finalisierung, optische Größenvarianten (16/24/32/128/512 px) und eine Marken-/Ähnlichkeitsprüfung.

