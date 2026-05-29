const KIOT_TOKEN_CACHE_KEY = 'mrtao:kiot:access_token';
const KIOT_TRIGGER_FUNCTION = 'runKiotVietAutoSync';
const KIOT_SYNC_STATE_SHEET = 'KiotSyncState';
const KIOT_SYNC_LOG_SHEET = 'KiotSyncLog';
const KIOT_SYNC_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

const KIOT_SYNC_LOG_HEADERS = [
  'RunId',
  'StartedAt',
  'FinishedAt',
  'Mode',
  'Status',
  'Entities',
  'Message',
  'SummaryJson',
];

const KIOT_SYNC_STATE_HEADERS = [
  'Entity',
  'LastSyncAt',
  'LastSuccessAt',
  'LastError',
  'UpdatedAt',
];

const KIOT_ENTITY_CONFIGS = {
  branches: {
    endpoint: '/branches',
    sheetName: 'KiotBranches',
    keyField: 'KiotId',
    headers: ['KiotId', 'BranchCode', 'BranchName', 'ContactNumber', 'Email', 'Address', 'RetailerId', 'ModifiedDate', 'CreatedDate', 'Deleted', 'RawJson', 'SyncedAt'],
    map: function mapBranch(item) {
      return {
        KiotId: item.id,
        BranchCode: item.branchCode || '',
        BranchName: item.branchName || item.name || '',
        ContactNumber: item.contactNumber || '',
        Email: item.email || '',
        Address: item.address || '',
        RetailerId: item.retailerId || '',
        ModifiedDate: item.modifiedDate || '',
        CreatedDate: item.createdDate || '',
      };
    },
  },
  categories: {
    endpoint: '/categories',
    sheetName: 'KiotCategories',
    keyField: 'KiotId',
    headers: ['KiotId', 'ParentId', 'CategoryName', 'RetailerId', 'HasChild', 'ModifiedDate', 'CreatedDate', 'Deleted', 'RawJson', 'SyncedAt'],
    map: function mapCategory(item) {
      return {
        KiotId: item.categoryId || item.id,
        ParentId: item.parentId || '',
        CategoryName: item.categoryName || item.name || '',
        RetailerId: item.retailerId || '',
        HasChild: item.hasChild || false,
        ModifiedDate: item.modifiedDate || '',
        CreatedDate: item.createdDate || '',
      };
    },
  },
  products: {
    endpoint: '/products',
    sheetName: 'KiotProducts',
    keyField: 'KiotId',
    defaultParams: {
      includeInventory: true,
      includePricebook: true,
      includeRemoveIds: true,
    },
    headers: ['KiotId', 'Code', 'Name', 'FullName', 'CategoryId', 'CategoryName', 'BasePrice', 'Cost', 'OnHand', 'Reserved', 'AllowsSale', 'IsActive', 'ProductType', 'RetailerId', 'ModifiedDate', 'CreatedDate', 'Deleted', 'RawJson', 'SyncedAt'],
    map: function mapProduct(item) {
      const inventory = getKiotFirstInventory(item);
      return {
        KiotId: item.id,
        Code: item.code || '',
        Name: item.name || '',
        FullName: item.fullName || '',
        CategoryId: item.categoryId || '',
        CategoryName: item.categoryName || '',
        BasePrice: item.basePrice || '',
        Cost: inventory ? inventory.cost : '',
        OnHand: inventory ? inventory.onHand : '',
        Reserved: inventory ? inventory.reserved : '',
        AllowsSale: item.allowsSale,
        IsActive: item.isActive,
        ProductType: item.productType || '',
        RetailerId: item.retailerId || '',
        ModifiedDate: item.modifiedDate || '',
        CreatedDate: item.createdDate || '',
      };
    },
  },
  customers: {
    endpoint: '/customers',
    sheetName: 'KiotCustomers',
    keyField: 'KiotId',
    defaultParams: {
      includeRemoveIds: true,
      includeTotal: true,
      includeCustomerGroup: true,
    },
    headers: ['KiotId', 'Code', 'Name', 'ContactNumber', 'Email', 'Gender', 'BirthDate', 'Address', 'LocationName', 'Organization', 'TaxCode', 'Groups', 'Debt', 'TotalInvoiced', 'TotalPoint', 'TotalRevenue', 'RetailerId', 'ModifiedDate', 'CreatedDate', 'Deleted', 'RawJson', 'SyncedAt'],
    map: function mapCustomer(item) {
      return {
        KiotId: item.id,
        Code: item.code || '',
        Name: item.name || '',
        ContactNumber: item.contactNumber || '',
        Email: item.email || '',
        Gender: item.gender,
        BirthDate: item.birthDate || '',
        Address: item.address || '',
        LocationName: item.locationName || '',
        Organization: item.organization || '',
        TaxCode: item.taxCode || '',
        Groups: item.groups || '',
        Debt: item.debt || '',
        TotalInvoiced: item.totalInvoiced || '',
        TotalPoint: item.totalPoint || '',
        TotalRevenue: item.totalRevenue || '',
        RetailerId: item.retailerId || '',
        ModifiedDate: item.modifiedDate || '',
        CreatedDate: item.createdDate || '',
      };
    },
  },
  invoices: {
    endpoint: '/invoices',
    sheetName: 'KiotInvoices',
    keyField: 'KiotId',
    defaultParams: {
      includePayment: true,
      includeInvoiceDelivery: true,
      includeInvoiceDelivey: true,
    },
    headers: ['KiotId', 'Code', 'OrderCode', 'PurchaseDate', 'BranchId', 'BranchName', 'SoldById', 'SoldByName', 'CustomerId', 'CustomerCode', 'CustomerName', 'Total', 'TotalPayment', 'Discount', 'Status', 'StatusValue', 'UsingCod', 'ModifiedDate', 'CreatedDate', 'Deleted', 'RawJson', 'SyncedAt'],
    map: function mapInvoice(item) {
      return {
        KiotId: item.id,
        Code: item.code || '',
        OrderCode: item.orderCode || '',
        PurchaseDate: item.purchaseDate || '',
        BranchId: item.branchId || '',
        BranchName: item.branchName || '',
        SoldById: item.soldById || '',
        SoldByName: item.soldByName || '',
        CustomerId: item.customerId || '',
        CustomerCode: item.customerCode || '',
        CustomerName: item.customerName || '',
        Total: item.total || '',
        TotalPayment: item.totalPayment || '',
        Discount: item.discount || '',
        Status: item.status || '',
        StatusValue: item.statusValue || '',
        UsingCod: item.usingCod,
        ModifiedDate: item.modifiedDate || '',
        CreatedDate: item.createdDate || '',
      };
    },
  },
};

function getKiotFirstInventory(item) {
  const inventories = item.inventories || item.Inventories || [];
  return inventories.length ? inventories[0] : null;
}

function ensureKiotConfigured() {
  const missing = [];
  if (!getKiotClientId()) {
    missing.push('KIOT_CLIENT_ID');
  }
  if (!getKiotClientSecret()) {
    missing.push('KIOT_CLIENT_SECRET');
  }
  if (!getKiotRetailer()) {
    missing.push('KIOT_RETAILER');
  }

  if (missing.length) {
    throw createAppError('Missing KiotViet config: ' + missing.join(', '), ERROR_CODES.CONFIG_ERROR);
  }
}

function encodeKiotForm(data) {
  return Object.keys(data).map(function mapPair(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
  }).join('&');
}

function buildKiotQuery(params) {
  return Object.keys(params || {}).filter(function filterValue(key) {
    return params[key] !== undefined && params[key] !== null && params[key] !== '';
  }).map(function mapPair(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
}

function parseKiotJsonResponse(response, context) {
  const statusCode = response.getResponseCode();
  const text = response.getContentText() || '';
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (err) {
      throw createAppError('KiotViet returned invalid JSON for ' + context, ERROR_CODES.EXTERNAL_API_ERROR, {
        statusCode: statusCode,
        body: text.slice(0, 500),
      });
    }
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw createAppError('KiotViet API error for ' + context, ERROR_CODES.EXTERNAL_API_ERROR, {
      statusCode: statusCode,
      body: payload,
    });
  }

  return payload;
}

function getKiotAccessToken() {
  ensureKiotConfigured();

  const cachedToken = CacheService.getScriptCache().get(KIOT_TOKEN_CACHE_KEY);
  if (cachedToken) {
    return cachedToken;
  }

  const response = UrlFetchApp.fetch(getKiotTokenUrl(), {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: encodeKiotForm({
      scopes: getKiotApiScope(),
      grant_type: 'client_credentials',
      client_id: getKiotClientId(),
      client_secret: getKiotClientSecret(),
    }),
    muteHttpExceptions: true,
  });
  const payload = parseKiotJsonResponse(response, 'token');

  if (!payload.access_token) {
    throw createAppError('KiotViet token response is missing access_token', ERROR_CODES.EXTERNAL_API_ERROR, payload);
  }

  const ttl = Math.max(60, Number(payload.expires_in || 3600) - 300);
  CacheService.getScriptCache().put(KIOT_TOKEN_CACHE_KEY, payload.access_token, ttl);
  return payload.access_token;
}

function fetchKiotApi(path, params) {
  const query = buildKiotQuery(params || {});
  const url = getKiotApiBaseUrl() + path + (query ? '?' + query : '');
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Retailer: getKiotRetailer(),
      Authorization: 'Bearer ' + getKiotAccessToken(),
    },
    muteHttpExceptions: true,
  });

  return parseKiotJsonResponse(response, path);
}

function getKiotEntityNames(request) {
  const rawEntities = request && (request.entities || (request.data && request.data.entities));
  const entities = Array.isArray(rawEntities)
    ? rawEntities
    : String(rawEntities || '').split(',');
  const selected = entities.map(function normalizeEntity(entity) {
    return String(entity || '').trim();
  }).filter(function filterEntity(entity) {
    return entity !== '';
  });

  return selected.length ? selected : getKiotSyncEntities();
}

function normalizeKiotFullSyncFlag(request) {
  const rawValue = request && (request.full || (request.data && request.data.full));
  return rawValue === true || String(rawValue).toLowerCase() === 'true' || String(rawValue) === '1';
}

function formatKiotDateTime(dateValue) {
  return Utilities.formatDate(dateValue, getAppTimezone(), KIOT_SYNC_DATE_FORMAT);
}

function getKiotSyncStateMap() {
  const rows = readKiotSheetRows(KIOT_SYNC_STATE_SHEET);
  const stateMap = {};
  rows.forEach(function mapState(row) {
    if (row.Entity) {
      stateMap[row.Entity] = row;
    }
  });
  return stateMap;
}

function getKiotLastModifiedFrom(entityName, isFullSync, stateMap) {
  if (isFullSync) {
    return '';
  }

  const state = stateMap[entityName];
  if (!state || !state.LastSyncAt) {
    return '';
  }

  const parsed = new Date(state.LastSyncAt);
  if (Number.isNaN(parsed.getTime())) {
    return state.LastSyncAt;
  }

  const lookbackMillis = getKiotSyncLookbackMinutes() * 60 * 1000;
  return formatKiotDateTime(new Date(parsed.getTime() - lookbackMillis));
}

function syncKiotEntity(entityName, options) {
  const config = KIOT_ENTITY_CONFIGS[entityName];
  if (!config) {
    throw createAppError('Unsupported KiotViet sync entity: ' + entityName, ERROR_CODES.VALIDATION_ERROR);
  }

  const pageSize = getKiotSyncPageSize();
  const lastModifiedFrom = getKiotLastModifiedFrom(entityName, options.full, options.stateMap);
  let currentItem = 0;
  let totalFetched = 0;
  let totalUpserted = 0;
  let removedCount = 0;
  let maxModifiedDate = lastModifiedFrom || '';

  ensureKiotSheet(config.sheetName, config.headers);

  while (true) {
    const params = Object.assign({}, config.defaultParams || {}, {
      pageSize: pageSize,
      currentItem: currentItem,
      includeRemoveIds: true,
      orderDirection: 'Asc',
    });

    if (lastModifiedFrom) {
      params.lastModifiedFrom = lastModifiedFrom;
    }

    const payload = fetchKiotApi(config.endpoint, params);
    const items = payload.data || [];
    const rows = items.map(function mapItem(item) {
      const row = config.map(item);
      row.Deleted = false;
      row.RawJson = JSON.stringify(item);
      row.SyncedAt = new Date();

      if (row.ModifiedDate && (!maxModifiedDate || String(row.ModifiedDate) > String(maxModifiedDate))) {
        maxModifiedDate = row.ModifiedDate;
      }

      return row;
    });

    totalFetched += items.length;
    totalUpserted += upsertKiotRows(config.sheetName, config.headers, config.keyField, rows);
    removedCount += markKiotRemovedRows(config, payload);

    if (items.length < pageSize) {
      break;
    }

    currentItem += items.length;
  }

  const syncAt = maxModifiedDate || formatKiotDateTime(new Date());
  updateKiotSyncState(entityName, syncAt, '', new Date());

  return {
    entity: entityName,
    sheetName: config.sheetName,
    fetched: totalFetched,
    upserted: totalUpserted,
    removed: removedCount,
    lastSyncAt: syncAt,
  };
}

function runKiotVietSync(options) {
  const startedAt = new Date();
  const runId = Utilities.getUuid();
  const syncOptions = options || {};
  const entities = syncOptions.entities || getKiotSyncEntities();
  const results = [];
  let status = 'success';
  let message = '';

  try {
    ensureKiotConfigured();
    entities.forEach(function syncEntity(entityName) {
      results.push(syncKiotEntity(entityName, {
        full: !!syncOptions.full,
        stateMap: getKiotSyncStateMap(),
      }));
    });
  } catch (err) {
    status = 'error';
    message = err.message;
    logKiotSyncRun(runId, startedAt, new Date(), syncOptions.mode || 'manual', status, entities, message, results);
    throw err;
  }

  logKiotSyncRun(runId, startedAt, new Date(), syncOptions.mode || 'manual', status, entities, message, results);

  return {
    runId: runId,
    status: status,
    startedAt: startedAt,
    finishedAt: new Date(),
    results: results,
  };
}

function runKiotVietSyncFromRequest(request) {
  const result = runKiotVietSync({
    entities: getKiotEntityNames(request),
    full: normalizeKiotFullSyncFlag(request),
    mode: 'manual',
  });
  return buildSuccessPayload(result, 'KiotViet sync completed');
}

function runKiotVietAutoSync() {
  return runKiotVietSync({
    entities: getKiotSyncEntities(),
    full: false,
    mode: 'trigger',
  });
}

function ensureKiotAdminAccess(request) {
  const user = getUserRecord(request.userId);
  if (!user || String(user.VaiTro) !== 'CHU_CUA_HANG') {
    throw createAppError('Only CHU_CUA_HANG can manage KiotViet sync', ERROR_CODES.PERMISSION_DENIED);
  }
}

function getKiotVietSyncStatus() {
  return buildSuccessPayload({
    state: readKiotSheetRows(KIOT_SYNC_STATE_SHEET),
    triggers: listKiotVietSyncTriggers(),
  });
}

function installKiotVietSyncTriggerFromRequest(request) {
  const rawMinutes = request.minutes || (request.data && request.data.minutes);
  const minutes = rawMinutes ? Number(rawMinutes) : getKiotSyncIntervalMinutes();
  installKiotVietSyncTrigger(minutes);
  return buildSuccessPayload({
    functionName: KIOT_TRIGGER_FUNCTION,
    minutes: normalizeKiotTriggerMinutes(minutes),
    triggers: listKiotVietSyncTriggers(),
  }, 'KiotViet sync trigger installed');
}

function removeKiotVietSyncTriggerFromRequest() {
  removeKiotVietSyncTriggers();
  return buildSuccessPayload({
    triggers: listKiotVietSyncTriggers(),
  }, 'KiotViet sync trigger removed');
}

function normalizeKiotTriggerMinutes(minutes) {
  const value = Math.floor(Number(minutes) || getKiotSyncIntervalMinutes());
  const allowed = [1, 5, 10, 15, 30];
  if (allowed.indexOf(value) === -1) {
    throw createAppError('KiotViet trigger minutes must be one of: ' + allowed.join(', '), ERROR_CODES.VALIDATION_ERROR);
  }
  return value;
}

function installKiotVietSyncTrigger(minutes) {
  const normalizedMinutes = normalizeKiotTriggerMinutes(minutes);
  removeKiotVietSyncTriggers();
  ScriptApp.newTrigger(KIOT_TRIGGER_FUNCTION).timeBased().everyMinutes(normalizedMinutes).create();
}

function removeKiotVietSyncTriggers() {
  ScriptApp.getProjectTriggers().forEach(function removeTrigger(trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === KIOT_TRIGGER_FUNCTION) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function listKiotVietSyncTriggers() {
  return ScriptApp.getProjectTriggers().filter(function filterTrigger(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === KIOT_TRIGGER_FUNCTION;
  }).map(function mapTrigger(trigger) {
    return {
      handlerFunction: trigger.getHandlerFunction(),
      eventType: String(trigger.getEventType ? trigger.getEventType() : ''),
      source: String(trigger.getTriggerSource ? trigger.getTriggerSource() : ''),
    };
  });
}

function ensureKiotSheet(sheetName, headers) {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function normalizeHeader(header) {
    return String(header || '');
  });
  const missingHeaders = headers.filter(function filterHeader(header) {
    return existingHeaders.indexOf(header) === -1;
  });

  if (missingHeaders.length) {
    sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }

  sheet.setFrozenRows(1);
  return sheet;
}

function readKiotSheetRows(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1 || sheet.getLastColumn() === 0) {
    return [];
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).filter(function filterRow(row) {
    return row.some(function hasValue(cell) {
      return cell !== '' && cell !== null && cell !== undefined;
    });
  }).map(function mapRow(row, rowIndex) {
    const item = { _rowNumber: rowIndex + 2 };
    headers.forEach(function assignCell(header, columnIndex) {
      item[header] = row[columnIndex];
    });
    return item;
  });
}

function upsertKiotRows(sheetName, headers, keyField, rows) {
  if (!rows.length) {
    return 0;
  }

  const sheet = ensureKiotSheet(sheetName, headers);
  const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingRows = readKiotSheetRows(sheetName);
  const rowByKey = {};
  existingRows.forEach(function indexRow(row) {
    rowByKey[String(row[keyField])] = row;
  });

  let changedCount = 0;
  rows.forEach(function upsertRow(row) {
    const key = String(row[keyField]);
    if (!key || key === 'undefined' || key === 'null') {
      return;
    }

    const values = actualHeaders.map(function mapHeader(header) {
      return toSheetCellValue(row[header]);
    });
    const existing = rowByKey[key];

    if (existing) {
      sheet.getRange(existing._rowNumber, 1, 1, actualHeaders.length).setValues([values]);
    } else {
      sheet.appendRow(values);
    }
    changedCount += 1;
  });

  return changedCount;
}

function getKiotRemovedIds(payload) {
  return payload.removeIds || payload.removedIds || payload.removeId || payload.removedId || [];
}

function markKiotRemovedRows(config, payload) {
  const removedIds = getKiotRemovedIds(payload);
  if (!removedIds.length) {
    return 0;
  }

  const sheet = ensureKiotSheet(config.sheetName, config.headers);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyIndex = headers.indexOf(config.keyField);
  const deletedIndex = headers.indexOf('Deleted');
  const syncedAtIndex = headers.indexOf('SyncedAt');

  if (keyIndex === -1 || deletedIndex === -1) {
    return 0;
  }

  const removedMap = {};
  removedIds.forEach(function mapRemoved(id) {
    removedMap[String(id)] = true;
  });

  const values = sheet.getDataRange().getValues();
  let changedCount = 0;
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (removedMap[String(values[rowIndex][keyIndex])]) {
      sheet.getRange(rowIndex + 1, deletedIndex + 1).setValue(true);
      if (syncedAtIndex !== -1) {
        sheet.getRange(rowIndex + 1, syncedAtIndex + 1).setValue(new Date());
      }
      changedCount += 1;
    }
  }

  return changedCount;
}

function updateKiotSyncState(entityName, lastSyncAt, lastError, updatedAt) {
  const row = {
    Entity: entityName,
    LastSyncAt: lastSyncAt,
    LastSuccessAt: lastError ? '' : lastSyncAt,
    LastError: lastError || '',
    UpdatedAt: updatedAt || new Date(),
  };
  upsertKiotRows(KIOT_SYNC_STATE_SHEET, KIOT_SYNC_STATE_HEADERS, 'Entity', [row]);
}

function logKiotSyncRun(runId, startedAt, finishedAt, mode, status, entities, message, results) {
  const row = {
    RunId: runId,
    StartedAt: startedAt,
    FinishedAt: finishedAt,
    Mode: mode,
    Status: status,
    Entities: (entities || []).join(','),
    Message: message || '',
    SummaryJson: JSON.stringify(results || []),
  };
  upsertKiotRows(KIOT_SYNC_LOG_SHEET, KIOT_SYNC_LOG_HEADERS, 'RunId', [row]);
}
