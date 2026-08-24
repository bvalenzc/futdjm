/**
 * DJM · Backend del panel de cartas
 * -----------------------------------
 * 1. Crea una Google Sheet nueva (o usa una existente).
 * 2. Extensiones > Apps Script, pega este archivo completo (reemplaza el contenido).
 * 3. Implementar > Nueva implementación > Tipo: Aplicación web
 *      - Ejecutar como: Yo
 *      - Quién tiene acceso: Cualquier usuario
 * 4. Copiá la URL que te da y pegala en ADMIN_HTML como APPS_SCRIPT_URL.
 * 5. La primera vez que guardes una carta, Google va a pedir autorización — acéptala.
 *
 * Crea automáticamente:
 *  - Una hoja "Cartas" con las columnas de cada carta.
 *  - Una carpeta de Drive "DJM - Fotos Cartas" donde se guardan las fotos subidas.
 */

const SHEET_NAME = 'Cartas';
const FOLDER_NAME = 'DJM - Fotos Cartas';

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID', 'Nombre', 'Posicion', 'Media', 'Tipo', 'FotoUrl', 'CreadoEn']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getFolder_() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

function doGet(e) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const cartas = data.slice(1)
    .filter(r => r[0]) // saltar filas vacías
    .map(r => ({
      id: r[0],
      nombre: r[1],
      posicion: r[2],
      media: r[3],
      tipo: r[4],
      fotoUrl: r[5],
      creadoEn: r[6]
    }));
  return ContentService.createTextOutput(JSON.stringify({ ok: true, cartas: cartas }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'JSON inválido' });
  }

  const action = body.action || 'add';

  if (action === 'add') return addCarta_(body);
  if (action === 'delete') return deleteCarta_(body);

  return jsonOut_({ ok: false, error: 'Acción desconocida: ' + action });
}

function addCarta_(body) {
  if (!body.nombre || !body.media) {
    return jsonOut_({ ok: false, error: 'Falta nombre o media' });
  }

  const sheet = getSheet_();
  const id = Utilities.getUuid();
  let fotoUrl = '';

  if (body.fotoBase64) {
    const folder = getFolder_();
    const mime = body.mimeType || 'image/jpeg';
    const bytes = Utilities.base64Decode(body.fotoBase64);
    const blob = Utilities.newBlob(bytes, mime, id + '.jpg');
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fotoUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();
  }

  sheet.appendRow([
    id,
    body.nombre,
    body.posicion || '',
    body.media,
    body.tipo || 'auto',
    fotoUrl,
    new Date().toISOString()
  ]);

  return jsonOut_({ ok: true, id: id, fotoUrl: fotoUrl });
}

function deleteCarta_(body) {
  if (!body.id) return jsonOut_({ ok: false, error: 'Falta id' });
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.id) {
      sheet.deleteRow(i + 1);
      return jsonOut_({ ok: true });
    }
  }
  return jsonOut_({ ok: false, error: 'No encontrada' });
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
