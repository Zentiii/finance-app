# budzet.html — panel budżetowy

Osobista aplikacja budżetowa jednej osoby. Student dorabiający na grafice i montażu. Używana codziennie, głównie z telefonu, wpisy robione w biegu.

## Najważniejsza zasada domenowa

Użytkownik ma pieniądze z dwóch źródeł na jednym koncie bankowym: **od rodziców** (wyłącznie na jedzenie) i **własne z pracy** (wszystko inne). Do tego odkłada trzecią pulę.

Dlatego każda transakcja ma **dwa wymiary**, które nigdy nie mogą się zlać w jeden:

- **konto** — gdzie pieniądze fizycznie leżą: `glowne`, `oszcz`, `kasa`
- **koperta** — czyje są i na co mogą pójść: `rodzice`, `moje`, `oszcz`

Suma sald wszystkich kont musi się zgadzać z sumą sald wszystkich kopert. Jeśli jakakolwiek zmiana rozjeżdża tę równość, jest błędna.

Trzy reguły wynikające z domeny, których nie wolno przypadkiem złamać:

1. **Niezapłacone zlecenie nie liczy się do sald.** Wpływ z `status: 'wait'` jest wykluczany funkcją `counted()`. Chodzi o to, żeby użytkownik nie wydawał pieniędzy, których jeszcze nie dostał.
2. **Przesunięcie to nie wydatek.** `kind: 'move'` zdejmuje z jednej pary konto+koperta i dokłada do drugiej. Odkładanie na oszczędności nie może psuć bilansu miesiąca, bo to zniechęca do odkładania.
3. **Wydatek nigdy nie zmienia koperty automatycznie na podstawie konta.** Kopertę wybiera użytkownik. Kategoria tylko podpowiada domyślną.

## Stan i architektura

Jeden plik, ~680 linii, bez procesu budowania. Vanilla JS, style w `<style>`, brak frameworka. Zewnętrzne zależności: font z Google Fonts i SheetJS z CDN (tylko do eksportu Excela — brak biblioteki nie może wywalić aplikacji).

```
S   — stan trwały: {pin, monthlySavings, fixedCosts[], tx[], updatedAt}
ui  — stan ulotny: {tab, ym, edit, flt, form, set, syncState, unlocked}
```

Rendering: pełne przemalowanie `innerHTML` przy każdej zmianie. Zdarzenia przez delegację w `afterRender()` — jeden `onclick` na root, akcje w atrybutach `data-act="nazwa:parametr"`, obsługa w `switch` w `act()`. Pola formularza przez `data-field`, ustawienia przez `data-set`.

To jest celowo prymitywne i ma takie zostać. Przy tej skali pełny re-render jest prostszy w utrzymaniu niż jakikolwiek system reaktywności, a jedyne miejsce, gdzie robi różnicę, to pole kwoty — dlatego `oninput` aktualizuje tam tylko stan formularza i przycisk, bez przerysowania (inaczej pole traci focus w trakcie pisania).

Struktura pliku, po sekcjach: dane i helpery → synchronizacja → obliczenia (`calc()`) → render i widoki (`view*`) → kod Apps Script jako string (`GAS`) → interakcje (`act()`) → eksport/import → motyw → start.

## Trwałość i synchronizacja

Zapis do `localStorage` natychmiast, wysyłka do chmury z 1,5-sekundowym opóźnieniem (`queuePush`). Backend to Google Apps Script, którego kod użytkownik wkleja sam — trzyma go stała `GAS` w tym pliku i wyświetla instrukcja w Ustawieniach. Dane lądują jako `budzet.json` na Dysku Google plus czytelna kopia w arkuszu.

Rozstrzyganie konfliktów: wygrywa nowszy `updatedAt`. Prymitywne, ale wystarcza przy jednym użytkowniku na dwóch urządzeniach. **Nie przerabiaj tego na merge per-transakcja bez wyraźnej prośby** — złożoność nie warta problemu, który rozwiązuje.

Adres skryptu leży w `localStorage` pod osobnym kluczem, nigdy w pliku HTML. Dzięki temu panel może być hostowany publicznie. Nie wpisuj tam żadnego przykładowego adresu.

## Konwencje

- **Cały interfejs po polsku.** Komunikaty pisane po ludzku, bez żargonu: „brakuje 40 zł — jakiś wydatek nie został wpisany", nie „niezgodność salda".
- Kwoty przez `zl()` / `zl0()`, parsowanie wejścia przez `num()` (obsługuje przecinek dziesiętny).
- Każdy tekst od użytkownika przepuszczony przez `esc()` przed wstawieniem do `innerHTML`.
- Kolory zawsze przez zmienne CSS. Warianty `--c-*` do wypełnień, `--t-*` do tekstu — na jasnym tle żółty tekst jest nieczytelny, dlatego istnieją oba.
- `inputmode="decimal"` na polach kwot, minimum 16 px czcionki na inputach (inaczej iOS zoomuje przy focusie).
- Motyw: `data-theme` na `<html>`, ciemny domyślnie, wybór per urządzenie.

## Priorytety przy zmianach

Szybkość wpisania transakcji jest ważniejsza od elegancji ekranu. Dodanie wydatku ma się mieścić w trzech dotknięciach — jeśli zmiana dokłada czwarte, potrzebuje dobrego uzasadnienia.

Aplikacja jest skończona funkcjonalnie. Domyślnie nie dokładaj funkcji, których nie ma w prośbie — żadnych budżetów per kategoria, powiadomień, wielu walut, kont użytkowników.

Przy zmianach w `calc()` sprawdź, czy suma kont dalej równa się sumie kopert.
