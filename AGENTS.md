# Handoff / agent notes

Detta är en statisk studiesajt för **ETSN11 – Trådlösa nätverk och applikationer**
vid Lunds universitet. `index.html` är genererad och committad; sajten publiceras
direkt från repo-roten med GitHub Pages (`main` → `/(root)`).

## Snabbstart

```bash
python3 -m pip install -r requirements.txt
python3 scripts/build.py
python3 -m http.server 8000 --bind 0.0.0.0
```

Kräver Python 3.10+ samt PyMuPDF och Pillow.

Öppna `http://localhost:8000/`. Bygget skriver om `index.html` och bilderna i
`assets/exams/`. Ändra därför helst källan, inte `index.html` direkt.

## Viktigaste filerna

- `scripts/build.py` – bygger sajten, beskär tentamensbilder, genererar
  övningsprov, kopplar taggar, LLM-lösningar, svarsval och svarsrutor.
- `assets/site.js` – poäng, rättning, lösningar, ritverktyg, filter för
  ”Alla frågor”, klickbara svarsalternativ.
- `assets/app.js` – flikar, examensväljare, tema (mörkt/ljust) och lokalt
  sparade textsvar.
- `assets/matching.js` – begreppsmatchningen.
- `assets/network.js` – animerad nätverksbakgrund och parallax.
- `assets/site.css`, `assets/theme.css` – grundlayout respektive nätverkstema.
- `content/generated_bank.json` – 54 frågor till 6 genererade prov.
- `content/terms.json` – 92 begrepp till matchningen.
- `content/llm_solutions.json` – 44 LLM-lösningar för frågor utan officiellt facit.
- `content/candidates.json` – integritetssäker frågesnapshot för de tre
  inlämnade tentorna. Används automatiskt om original-PDF:erna saknas.
- `content/articles.json` – 36 artikelreferenser och åtkomststatus.
- `old-exams/` – officiella tentor + lösningar; de tre inlämnade PDF:erna är
  gitignorerade av integritetsskäl.
- `course-material/` – föreläsnings-PDF:er, inklusive `QueuingSystems.pdf`.
- `articles/` – 13 nedladdade open-access-artiklar. Betalda artiklar länkas.

## Viktiga regler

1. **Genererade prov är inte officiella tentor.** Märk dem alltid som
   AI-genererade/övning och uppmana till kontroll mot kursmaterialet.
2. **Inlämnade tentor är frågeexempel**, inte officiella prov. Publicera aldrig
   studenternas svar, poäng, namn eller candidate-PDF:er. `content/candidates.json`
   innehåller endast frågetext, alternativ, poäng och taggar.
3. **Poäng sätts manuellt.** Klickbara alternativ och svarsrutor får inte
   automatiskt rätta, fylla i poäng eller avslöja rätt svar.
4. **LLM-lösningar är förslag**, inte facit. De ska vara tydligt märkta.
5. Officiella tentor har prioritet över LLM-material. 2023 års fem första
   flervalsfrågor saknar officiella svar och använder LLM.
6. `index.html` får inte handredigeras om bygget ska kunna reproduceras.

## Dagens innehåll

- 6 tentamenstillfällen: 3 officiella + 3 inlämnade frågeexempel.
- 6 genererade övningsprov, 9 frågor vardera (5 A + 2 B + 2 C), 90 p/prov.
- 132 frågor totalt i ”Alla frågor”.
- 56 flervalsfrågor totalt; 48 har explicit **Rätt val**-rad, medan 8
  officiella lösningar visas som bild.
- 76 textfrågor med lokal svarsruta.
- 92 begrepp i matchningen; 36 artiklar (13 lokala PDF:er).
- Betygsgränser: 3 = 45 p, 4 = 60 p, 5 = 75 p; 6 = full pott (bonus,
  inte officiell ETSN11-gräns).

## Kända begränsningar

- Original-PDF:erna för de tre inlämnade tentorna finns inte i repot. Frågorna
  kan byggas från `content/candidates.json`; PDF:erna behövs bara om man vill
  extrahera om dem.
- 2023-10-25 uppgift 14 hänvisar till en figur som saknas i käll-PDF:en;
  kortet har en tydlig notis om detta.
- Vissa artiklar är betalda och finns bara som DOI-länk.
- Rätt-val-raderna för 2023:s MCQ och de inlämnade tentorna är LLM-härledda.
  Kontrollera dem mot kursmaterialet innan de presenteras som facit.

## Verifiering före publicering

- Kör `python3 scripts/build.py` och kontrollera att `index.html` skapas.
- Kontrollera att alla fem flikar fungerar, att alla prov har 90 p och att
  ”Alla poäng” fungerar.
- Kontrollera att svarsrutor sparas och att mörkt/ljust tema växlar.
- Kontrollera att inga candidate-PDF:er, studentnamn eller studentsvar har
  committats.
- Kontrollera att GitHub Pages-bygget blir `built` och att sajten svarar 200.
