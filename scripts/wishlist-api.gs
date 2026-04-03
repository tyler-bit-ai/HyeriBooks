const SPREADSHEET_ID = '1neklDf3wD5Cncy8F_k0-zdH6CHCHgkat6N4EscLb--A';
const SHEET_NAME = '읽을책';
const REQUIRED_HEADERS = ['id', 'title', 'note', 'status', 'createdAt', 'updatedAt'];
const ALLOWED_STATUSES = ['wishlist', 'done', 'archived'];

function doGet(e) {
  return handleRequest_({
    action: e?.parameter?.action || 'list',
    id: e?.parameter?.id || '',
    token: e?.parameter?.token || '',
  });
}

function doPost(e) {
  const payload = parsePostBody_(e);
  return handleRequest_(payload);
}

function handleRequest_(payload) {
  try {
    validateToken_(payload.token);

    switch (payload.action) {
      case 'list':
        return jsonOutput_({ ok: true, items: listWishlistItems_() });
      case 'create':
        return jsonOutput_({ ok: true, item: createWishlistItem_(payload.item || {}) });
      case 'update':
        return jsonOutput_({ ok: true, item: updateWishlistItem_(payload.id, payload.updates || {}) });
      case 'delete':
        deleteWishlistItem_(payload.id);
        return jsonOutput_({ ok: true, deletedId: payload.id });
      default:
        return jsonOutput_({ ok: false, error: `Unsupported action: ${payload.action}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonOutput_({ ok: false, error: message });
  }
}

function parsePostBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Missing sheet: ${SHEET_NAME}`);
  }

  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const needsInitialization = REQUIRED_HEADERS.some((header, index) => currentHeaders[index] !== header);

  if (needsInitialization) {
    headerRange.setValues([REQUIRED_HEADERS]);
  }
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).getValues()[0];
  return headers.reduce((map, header, index) => {
    map[String(header)] = index;
    return map;
  }, {});
}

function listWishlistItems_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, REQUIRED_HEADERS.length).getValues();
  const headerMap = getHeaderMap_(sheet);

  return rows
    .filter((row) => row.some((value) => String(value).trim() !== ''))
    .map((row) => rowToWishlistItem_(row, headerMap))
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

function createWishlistItem_(item) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getSheet_();
    const now = new Date().toISOString();
    const nextItem = normalizeWishlistInput_({
      id: buildWishlistId_(),
      title: item.title,
      note: item.note || '',
      status: item.status || 'wishlist',
      createdAt: now,
      updatedAt: now,
    });

    sheet.appendRow(REQUIRED_HEADERS.map((header) => nextItem[header]));
    return nextItem;
  } finally {
    lock.releaseLock();
  }
}

function updateWishlistItem_(id, updates) {
  if (!id) {
    throw new Error('Missing id for update');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getSheet_();
    const match = findWishlistRowById_(sheet, id);
    const headerMap = getHeaderMap_(sheet);
    const currentItem = rowToWishlistItem_(match.values, headerMap);
    const nextItem = normalizeWishlistInput_({
      id: currentItem.id,
      title: updates.title !== undefined ? updates.title : currentItem.title,
      note: updates.note !== undefined ? updates.note : currentItem.note,
      status: updates.status !== undefined ? updates.status : currentItem.status,
      createdAt: currentItem.createdAt,
      updatedAt: new Date().toISOString(),
    });

    sheet
      .getRange(match.rowIndex, 1, 1, REQUIRED_HEADERS.length)
      .setValues([REQUIRED_HEADERS.map((header) => nextItem[header])]);

    return nextItem;
  } finally {
    lock.releaseLock();
  }
}

function deleteWishlistItem_(id) {
  if (!id) {
    throw new Error('Missing id for delete');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getSheet_();
    const match = findWishlistRowById_(sheet, id);
    sheet.deleteRow(match.rowIndex);
  } finally {
    lock.releaseLock();
  }
}

function findWishlistRowById_(sheet, id) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    throw new Error(`Wishlist item not found: ${id}`);
  }

  const values = sheet.getRange(2, 1, lastRow - 1, REQUIRED_HEADERS.length).getValues();
  const headerMap = getHeaderMap_(sheet);
  const idColumnIndex = headerMap.id;

  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][idColumnIndex]).trim() === id) {
      return {
        rowIndex: index + 2,
        values: values[index],
      };
    }
  }

  throw new Error(`Wishlist item not found: ${id}`);
}

function rowToWishlistItem_(row, headerMap) {
  return normalizeWishlistInput_({
    id: row[headerMap.id],
    title: row[headerMap.title],
    note: row[headerMap.note],
    status: row[headerMap.status],
    createdAt: row[headerMap.createdAt],
    updatedAt: row[headerMap.updatedAt],
  });
}

function normalizeWishlistInput_(item) {
  const normalized = {
    id: String(item.id || '').trim(),
    title: String(item.title || '').trim(),
    note: String(item.note || '').trim(),
    status: String(item.status || '').trim().toLowerCase(),
    createdAt: normalizeTimestamp_(item.createdAt),
    updatedAt: normalizeTimestamp_(item.updatedAt),
  };

  if (!normalized.id) {
    throw new Error('Wishlist id is required');
  }

  if (!normalized.title) {
    throw new Error('Wishlist title is required');
  }

  if (!ALLOWED_STATUSES.includes(normalized.status)) {
    throw new Error(`Unsupported wishlist status: ${item.status}`);
  }

  return normalized;
}

function normalizeTimestamp_(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return date.toISOString();
}

function buildWishlistId_() {
  return `wish_${new Date().toISOString().replace(/[-:.TZ]/g, '')}_${Utilities.getUuid().slice(0, 8)}`;
}

function validateToken_(token) {
  const expectedToken = PropertiesService.getScriptProperties().getProperty('WISHLIST_SHARED_SECRET');

  if (!expectedToken) {
    return;
  }

  if (String(token || '').trim() !== expectedToken) {
    throw new Error('Unauthorized request');
  }
}
