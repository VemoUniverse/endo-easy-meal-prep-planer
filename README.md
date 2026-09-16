# Easy Endo Meal Prep – MVP

Antientzündlich orientierter Meal-Prep-Planer für der-gesundheit-zuliebe.de.
Läuft komplett im Browser, ohne Backend und ohne laufende KI-API-Kosten –
siehe `plans/2026-09-16-endo-easy-meal-prep-planer.md` für die Architektur-
Begründung.

## Lokal testen

Kein Build nötig, es ist eine reine HTML/CSS/JS-Seite. Einfach über einen
lokalen Webserver öffnen (direktes Öffnen der `index.html` per Doppelklick
funktioniert nicht zuverlässig, weil `fetch()` für die JSON-Dateien einen
Server braucht):

```bash
cd endo-easy-meal-prep-planer
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen.

## Deploy auf Netlify

1. Diesen Ordner (`endo-easy-meal-prep-planer/`) als eigenes Repository
   oder als Unterordner an Netlify anbinden (Netlify erlaubt ein
   "Base directory").
2. Kein Build-Command nötig, Publish-Directory ist einfach dieser Ordner.
3. Netlify vergibt automatisch eine kostenlose `*.netlify.app`-URL. Optional
   später eine eigene Subdomain verbinden (z. B.
   `planer.der-gesundheit-zuliebe.de`).
4. Diesen Link als Produktinhalt im Tentary-Shop hinterlegen – Käuferinnen
   erhalten ihn nach dem Kauf wie einen Download-Link.

## Rezepte ergänzen oder ändern

Alle Rezepte liegen in `data/recipes.json`. Jedes Rezept ist ein JSON-Objekt
mit festen Feldern (siehe bestehende Einträge als Vorlage). Wichtig:

- `id` muss eindeutig sein.
- `storage_category` muss auf einen Schlüssel aus `data/storage-notes.json`
  verweisen (dort liegen die geprüften, wiederverwendbaren
  Haltbarkeitstexte).
- `servings` ist immer als Basis-Batch von 4 Portionen gedacht – die App
  skaliert die Mengen automatisch je nach gewählter Tage-/Personenzahl.

## Fotos zu Rezepten hinzufügen

Jedes Rezept hat ein Feld `"image": null`. Sobald ein Foto vorhanden ist:

1. Bilddatei in einen neuen Ordner `images/` legen (z. B.
   `images/b3-kokos-porridge.jpg`).
2. Im passenden Rezept in `recipes.json` das Feld setzen, z. B.
   `"image": "images/b3-kokos-porridge.jpg"`.

Ohne Bild zeigt die App automatisch einen dezenten Platzhalter – das Tool
funktioniert also auch komplett ohne Fotos.

## Aktueller Stand

Erste Kostprobe mit 25 Rezepten (Frühstück, Mittag/Arbeit, Abendessen,
Snacks). Nach Freigabe der Rezept-Qualität durch den Blog-Betreiber auf
30–50 Rezepte erweitern (siehe Plan, Abschnitt 8).

Bewusst nicht enthalten (siehe Plan): Resteverwertung/Pantry-Modus,
Nutzerkonten, Zahlungsanbindung – das läuft über den Tentary-Shop.
