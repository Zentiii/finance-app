// Synchronizacja panelu budżetu — wklej całość w Rozszerzenia → Apps Script.
// Ten sam kod pokazuje aplikacja w Ustawieniach (stała GAS w index.html) — trzymaj je identyczne.
var PLIK = 'budzet.json';

function doGet(e){
  var f = znajdz();
  if (!f) return out({ok:true, data:null});
  try { return out({ok:true, data: JSON.parse(f.getBlob().getDataAsString())}); }
  catch (err) { return out({ok:false, error:'Plik budzet.json jest uszkodzony'}); }
}

function doPost(e){
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var body = JSON.parse(e.postData.contents);
    if (body.action !== 'save' || !body.data || !Array.isArray(body.data.tx))
      return out({ok:false, error:'Nieprawidłowe dane'});
    var json = JSON.stringify(body.data);
    var f = znajdz();
    if (f) f.setContent(json);
    else DriveApp.createFile(PLIK, json, MimeType.PLAIN_TEXT);
    mirror(body.data);
    return out({ok:true});
  } catch (err) {
    return out({ok:false, error:String(err)});
  } finally {
    lock.releaseLock();
  }
}

function znajdz(){
  var it = DriveApp.getFilesByName(PLIK);
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; }
  return null;
}

function mirror(d){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var sh = ss.getSheetByName('Transakcje') || ss.insertSheet('Transakcje');
  var gdzie = {konto:'Konto', kasa:'Gotówka'};
  var typ = {'in':'Wpłata', out:'Wydatek', move:'Bankomat'};
  var rows = [['Data','Typ','Kwota','Kategoria','Skąd / gdzie','Dokąd','Opis']];
  (d.tx || []).slice().sort(function(a,b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
    .forEach(function(t){
      rows.push([t.date, typ[t.kind] || '', t.amount, t.category || '', gdzie[t.account] || '',
        t.kind === 'move' ? (gdzie[t.toAccount] || '') : '', t.note || '']);
    });
  sh.clear();
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (rows.length > 1) sh.getRange(2, 3, rows.length - 1, 1).setNumberFormat('#,##0.00 "zł"');
}

function out(o){
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
