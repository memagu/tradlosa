# ETSN11 – trådlösa nätverk och applikationer

Ett statiskt studieverktyg för **ETSN11, Trådlösa nätverk och applikationer – Systemdesign och prestanda** vid Lunds universitet.

## Innehåll

- **Riktiga tentor** – sex tentamenstillfällen. Tre har officiella lösningar; tre är exempel på inlämnade tentor där frågorna visas utan studentsvar.
- **Övningsprov** – sex genererade prov med samma 90-poängsstruktur som de riktiga tentorna (del A/B/C). Frågorna är AI-genererade från kursmaterialet men är inte officiella tentafrågor; kontrollera dem mot kursmaterialet.
- **Begrepp** – slumpad matchning mellan definition/användning och begrepp. Rätt par låses direkt, får en visuell kabel och ger poäng/streak. Varje runda har fler svarsalternativ än frågor och extra distraktorer.
- **Alla frågor** – alla 132 frågor på ett ställe, med ämnesfilter och ett reglage för AI-genererade övningsprov (på som standard).
- **Kursmaterial** – alla föreläsnings-PDF:er samt de artiklar och whitepapers som föreläsningarna hänvisar till.

Varje uppgift har färgkodade ämnes taggar som länkar till relevant sida i kursmaterialet. De tre officiella tentorna har även en länk till original-PDF:en.

Sajten innehåller 54 frågor i den genererade frågebanken (6 prov), 92 begrepp och 36 artikelreferenser. 13 open-access-artiklar finns i `articles/`, och köteorikompendiet `course-material/QueuingSystems.pdf` finns också lokalt.

Varje fråga har en **Alla poäng**-knapp som fyller i hela poängraden direkt. Svarsalternativen går att klicka för att markera dem visuellt, men markeringen påverkar inte poängen och avslöjar inte rätt svar – poängen prickas fortfarande av manuellt. Bakgrunden är en långsam nätverksgraf med pulser längs länkarna; noderna tänds när pulser skickas och tas emot. Grafen parallax-scrollar med sidan.

## Struktur

```text
index.html                 genererad sajt
assets/
  site.css, theme.css      layout och nätverkstema
  site.js                  poäng, lösningar, celebrationer, ritverktyg
  app.js                   flikar och examensväljare
  matching.js              begreppsträning
  network.js               animerad nätverksbakgrund
  exams/<datum>/           beskurna fråge- och lösningsbilder
content/
  generated_bank.json      frågebank för genererade övningsprov
  terms.json               begreppsbank för matchning
  articles.json            artikelreferenser
articles/                  nedladdade open-access-artiklar
course-material/           föreläsnings-PDF:er
old-exams/                 originaltentor och lösningsdokument
scripts/build.py           bygger index.html och bilderna
```

## Bygg och kör lokalt

```bash
python3 -m pip install pymupdf pillow
python3 scripts/build.py
python3 -m http.server 8000 --bind 0.0.0.0
```

Öppna <http://localhost:8000/>.

Beroenden: Python 3, PyMuPDF (`pymupdf`) och Pillow. Bygget läser PDF:erna i `old-exams/`, renderar fråge- och lösningsbilder till `assets/exams/` och skriver `index.html`.

## Publicera

Sajten är helt statisk och kan publiceras direkt från repo-roten med **GitHub Pages → Deploy from a branch → main → /(root)**. `.nojekyll` finns så att GitHub Pages inte kör Jekyll.

Vid publicering behövs ingen separat byggnad: `index.html`, `assets/`, `course-material/` och `articles/` ligger färdiga i repot. Kontrollera att eventuella artiklar och tentor får publiceras.

## Viktigt

- De tre exemplen på inlämnade tentor är studentinlämningar där endast frågorna återges; deras svar och poäng visas inte. De är inte officiella lösningar. Original-PDF:erna är gitignorerade eftersom de innehåller studentuppgifter; de behövs bara lokalt om man vill bygga om kandidatdelen.
- Genererade övningsprov är just övningsmaterial. Kontrollera alltid mot kursmaterialet.
- Artiklar som är open access ligger i `articles/`; begränsade artiklar länkas till förlaget i `content/articles.json`.
- Publicera bara kursmaterial och tentor om du har rätt att göra det offentligt.

## Kända begränsningar

- 2023 års lösningsdokument saknar officiella svar för de fem första flervalsfrågorna; de visas därför med tydligt märkta LLM-förslag.
- De tre inlämnade tentorna saknar officiella lösningar; även de har LLM-förslag baserade på kursmaterialet.
- De inlämnade tentorna saknar bilder i den textbaserade återgivningen; original-PDF:erna länkas inte.
- LLM-lösningarna är förslag, inte officiella facit.
