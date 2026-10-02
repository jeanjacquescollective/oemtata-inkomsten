# Oemtata inkomsten

Dag-, week- en maandoverzichten van de betaalterminal (Europabank / eb online).

- **Publiek:** grafieken met omzet en aantal betalingen per dag, week, maand, kwartaal of jaar.
- **Detailscherm (code):** alle transacties, omzet per uur, kaartmerken, commissie en CSV-download.
- **Cafédag:** een dag loopt tot 06:00 de volgende ochtend (instelbaar via `DAY_CUTOFF_HOUR`).

## Hoe het werkt

Europabank heeft geen gratis API voor handelaars. Het script `fetch` logt daarom in
op eb online met gebruikersnaam en paswoord en gebruikt dezelfde knop
"Geavanceerd zoeken en exporteren → Excel" die je zelf zou gebruiken. Het resultaat is een CSV-bestand.

```
npm run fetch    eb online → import/*.csv
npm run import   import/*.csv → data/transactions.json   (dubbels worden weggefilterd)
npm run build    → docs/data/summary.json (publiek) + docs/data/detail.enc.json (versleuteld)
                 → reports/week-JJJJ-Wnn.md (weekoverzicht van de afgelopen week)
npm run weekly   de drie stappen hierboven na elkaar
npm run publish  commit + push van docs/ naar GitHub
npm run serve    lokale preview op http://localhost:8080
```

`fetch` haalt standaard alles op vanaf drie dagen voor de laatste gekende dag. Een andere
periode kan met `npm run fetch -- --from 2025-08-01 --to 2025-12-31`, en met `--headed`
zie je de browser.

## Installatie

1. `npm install`
2. Kopieer `.env.example` naar `.env` en vul de logingegevens in.
3. `npm run weekly`, daarna `npm run serve` om het resultaat te bekijken.

## Online zetten (GitHub Pages, gratis)

1. Maak een **nieuwe repository** op GitHub, bijvoorbeeld `oemtata-inkomsten`.
2. In deze map:
   ```
   git init -b main
   git add .
   git commit -m "Eerste versie"
   git remote add origin https://github.com/<gebruiker>/oemtata-inkomsten.git
   git push -u origin main
   ```
3. Ga op GitHub naar *Settings → Pages* en kies *Deploy from a branch*, met branch `main` en map `/docs`.
4. De site staat dan op `https://<gebruiker>.github.io/oemtata-inkomsten/`.

`.env`, `data/`, `import/` en `reports/` worden nooit gecommit (zie `.gitignore`).

## Elke maandag automatisch

`weekly.cmd` haalt de data op, bouwt de site en publiceert die. Om dit elke maandag om 12:00 in
de Windows Taakplanner te zetten:

```powershell
$a = New-ScheduledTaskAction -Execute "$PWD\weekly.cmd" -WorkingDirectory "$PWD"
$t = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 12:00
$s = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName "Oemtata inkomsten" -Action $a -Trigger $t -Settings $s
```

Stond de pc uit, dan start de taak automatisch zodra hij weer aanstaat.
De uitvoer komt in `reports/weekly.log`.

## Over de beveiliging van het detailscherm

De transacties staan versleuteld (AES-GCM, sleutel afgeleid van de PIN) in `detail.enc.json`.
Zonder de code is de lijst dus niet te lezen. Een code van vier cijfers kan iemand met wat
technische kennis wel uitproberen tot hij past (er zijn maar 10.000 mogelijkheden).
Dit is een deur die dicht is, geen kluis. Wil je meer zekerheid, gebruik dan een langere code of zin in
`DETAIL_PIN` en draai `npm run build` opnieuw. Kaartnummers en autorisatiecodes zitten er
nooit in.

## Als het ophalen faalt

Als Europabank de website aanpast, kan `fetch` stoppen met werken. Je krijgt dan een
foutmelding en een screenshot in `import/fout.png`. Als noodoplossing kun je de export
handmatig downloaden (Bewegingen → Geavanceerd zoeken en exporteren → Excel), het
bestand in `import/` zetten en `npm run import && npm run build` draaien.
