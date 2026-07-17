// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
var FIRESTORE_SCOPE_ = 'https://www.googleapis.com/auth/datastore';

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION & UTILITIES (Giữ nguyên)
// ─────────────────────────────────────────────────────────────────────────────

function getCachedKiotVietToken() {
  var cache = CacheService.getScriptCache();
  var cachedToken = cache.get('KIOT_VIET_TOKEN');
  if (cachedToken) {
    return cachedToken;
  }

  var clientId = getSecret('KIOT_CLIENT_ID');
  var clientSecret = getSecret('KIOT_CLIENT_SECRET');
  var response = UrlFetchApp.fetch('https://id.kiotviet.vn/connect/token', {
    method: 'post',
    payload: {
      scope: 'PublicApi.Access',
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText());
  if (response.getResponseCode() !== 200 || !result.access_token) {
    Logger.log('KiotViet token error: ' + response.getContentText());
    throw new Error('Unable to retrieve KiotViet token');
  }

  try {
    cache.put('KIOT_VIET_TOKEN', result.access_token, 3000);
  } catch (error) {
    Logger.log('Unable to cache KiotViet token: ' + error.message);
  }

  return result.access_token;
}

function getFirestoreAccessToken_() {
  return getServiceAccountAccessToken_('firestore-service-account', [
    FIRESTORE_SCOPE_
  ]);
}

function safeFetch(url, options, retries) {
  var totalRetries = retries || 3;
  for (var attempt = 0; attempt < totalRetries; attempt += 1) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        return response;
      }
      Logger.log(
        'HTTP ' +
          response.getResponseCode() +
          ' from ' +
          url +
          ' on attempt ' +
          (attempt + 1) +
          ': ' +
          response.getContentText()
      );
    } catch (error) {
      Logger.log('Fetch error on attempt ' + (attempt + 1) + ': ' + error);
    }

    Utilities.sleep(1000);
  }

  throw new Error('Unable to complete upstream request after multiple retries');
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === 'object') {
    var fields = {};
    Object.keys(val).forEach(function(key) {
      fields[key] = toFirestoreValue(val[key]);
    });
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  var fields = {};
  Object.keys(obj).forEach(function(key) {
    fields[key] = toFirestoreValue(obj[key]);
  });
  return { fields: fields };
}

function batchCommitToFirestore(projectId, googleToken, writes) {
  if (!writes.length) {
    return;
  }

  var chunkSize = 400;
  var requests = [];

  for (var i = 0; i < writes.length; i += chunkSize) {
    requests.push({
      url:
        'https://firestore.googleapis.com/v1/projects/' +
        projectId +
        '/databases/(default)/documents:commit',
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + googleToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ writes: writes.slice(i, i + chunkSize) }),
      muteHttpExceptions: true
    });
  }

  UrlFetchApp.fetchAll(requests).forEach(function(response, index) {
    if (response.getResponseCode() !== 200) {
      Logger.log('Firestore batch error: ' + response.getContentText());
      throw new Error(
        'Unable to write Firestore batch ' +
          (index + 1) +
          '. HTTP ' +
          response.getResponseCode()
      );
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DIFF ENGINE — Hash-based change detection to minimize Firestore writes
// ─────────────────────────────────────────────────────────────────────────────

var SNAPSHOT_PREFIX_ = 'SYNC_SNAP_';
var SNAPSHOT_MAX_CHUNK_BYTES_ = 8500; // ~9KB limit per property, keep safe margin
var SNAPSHOT_TOTAL_BUDGET_KB_ = 400;  // Max KB for all snapshots (out of 500KB total)

// Fields that change every sync run but don't represent actual data changes.
// Excluding them from hash prevents false-positive diffs.
var HASH_EXCLUDE_FIELDS_ = ['lastSyncedAt', 'updatedAt'];

/**
 * Compute a deterministic SHA-256 hash for a single document object.
 * Keys are sorted alphabetically so the same data always produces the same hash.
 * Volatile fields (lastSyncedAt, updatedAt) are excluded from the hash.
 */
function computeDocHash_(doc) {
  var sortedKeys = Object.keys(doc).filter(function(k) {
    return HASH_EXCLUDE_FIELDS_.indexOf(k) === -1;
  }).sort();
  var normalized = {};
  for (var i = 0; i < sortedKeys.length; i++) {
    var key = sortedKeys[i];
    var val = doc[key];
    // Recursively sort nested arrays/objects for deterministic output
    if (Array.isArray(val)) {
      normalized[key] = val.map(function(item) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          var subKeys = Object.keys(item).sort();
          var subObj = {};
          for (var j = 0; j < subKeys.length; j++) {
            subObj[subKeys[j]] = item[subKeys[j]];
          }
          return subObj;
        }
        return item;
      });
    } else {
      normalized[key] = val;
    }
  }

  var raw = JSON.stringify(normalized);
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function(b) {
    return ('0' + ((b < 0 ? b + 256 : b)).toString(16)).slice(-2);
  }).join('');
}

/**
 * Build a hash map from an array of items: { "<id>": "<sha256>" }
 */
function buildHashMap_(items, idField) {
  var map = {};
  for (var i = 0; i < items.length; i++) {
    var id = String(items[i][idField]);
    map[id] = computeDocHash_(items[i]);
  }
  return map;
}

/**
 * Compute a single hash for an entire collection (Option A fallback).
 */
function computeCollectionHash_(items) {
  var raw = JSON.stringify(items);
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function(b) {
    return ('0' + ((b < 0 ? b + 256 : b)).toString(16)).slice(-2);
  }).join('');
}

/**
 * Save a hash map snapshot to PropertiesService.
 * If the data exceeds a single property limit, it splits into numbered chunks.
 * Returns true if saved as per-document map, false if fell back to collection hash.
 */
function saveSnapshot_(collectionName, hashMap) {
  var props = PropertiesService.getScriptProperties();
  var baseKey = SNAPSHOT_PREFIX_ + collectionName;
  var serialized = JSON.stringify(hashMap);

  // Clean up any previous chunks
  clearSnapshotChunks_(collectionName);

  // Check total budget: rough estimate of all SYNC_SNAP_ properties
  var allProps = props.getProperties();
  var existingSnapSize = 0;
  var propKeys = Object.keys(allProps);
  for (var k = 0; k < propKeys.length; k++) {
    if (propKeys[k].indexOf(SNAPSHOT_PREFIX_) === 0) {
      existingSnapSize += allProps[propKeys[k]].length;
    }
  }

  var totalAfterSave = existingSnapSize + serialized.length;
  if (totalAfterSave > SNAPSHOT_TOTAL_BUDGET_KB_ * 1024) {
    // Over budget: fall back to collection-level hash (Option A)
    Logger.log('[DIFF_ENGINE] Snapshot too large (' + Math.round(totalAfterSave / 1024) + 'KB), falling back to collection hash for ' + collectionName);
    return false;
  }

  if (serialized.length <= SNAPSHOT_MAX_CHUNK_BYTES_) {
    // Fits in a single property
    props.setProperty(baseKey, serialized);
    props.setProperty(baseKey + '_chunks', '1');
  } else {
    // Split into chunks
    var chunks = [];
    for (var i = 0; i < serialized.length; i += SNAPSHOT_MAX_CHUNK_BYTES_) {
      chunks.push(serialized.substring(i, i + SNAPSHOT_MAX_CHUNK_BYTES_));
    }
    for (var c = 0; c < chunks.length; c++) {
      props.setProperty(baseKey + '_' + c, chunks[c]);
    }
    props.setProperty(baseKey + '_chunks', String(chunks.length));
  }

  return true;
}

/**
 * Load a hash map snapshot from PropertiesService.
 * Returns the hash map object, or null if no snapshot exists.
 */
function loadSnapshot_(collectionName) {
  var props = PropertiesService.getScriptProperties();
  var baseKey = SNAPSHOT_PREFIX_ + collectionName;
  var chunksCount = props.getProperty(baseKey + '_chunks');

  if (!chunksCount) {
    return null;
  }

  var numChunks = parseInt(chunksCount, 10);
  var serialized;

  if (numChunks === 1) {
    serialized = props.getProperty(baseKey);
  } else {
    var parts = [];
    for (var i = 0; i < numChunks; i++) {
      var chunk = props.getProperty(baseKey + '_' + i);
      if (chunk === null) {
        Logger.log('[DIFF_ENGINE] Missing chunk ' + i + ' for ' + collectionName + ', treating as no snapshot');
        return null;
      }
      parts.push(chunk);
    }
    serialized = parts.join('');
  }

  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized);
  } catch (e) {
    Logger.log('[DIFF_ENGINE] Corrupt snapshot for ' + collectionName + ': ' + e.message);
    return null;
  }
}

/**
 * Clear all snapshot chunks for a collection.
 */
function clearSnapshotChunks_(collectionName) {
  var props = PropertiesService.getScriptProperties();
  var baseKey = SNAPSHOT_PREFIX_ + collectionName;
  var chunksCount = props.getProperty(baseKey + '_chunks');

  if (!chunksCount) return;

  var numChunks = parseInt(chunksCount, 10);
  if (numChunks === 1) {
    props.deleteProperty(baseKey);
  } else {
    for (var i = 0; i < numChunks; i++) {
      props.deleteProperty(baseKey + '_' + i);
    }
  }
  props.deleteProperty(baseKey + '_chunks');
}

/**
 * Compare new items against an old hash map snapshot.
 * Returns { changed: [...], added: [...], unchanged: [...], deleted: [...ids] }
 */
function computeDiff_(newItems, oldHashMap, idField) {
  var result = { changed: [], added: [], unchanged: [], deleted: [] };

  if (!oldHashMap) {
    // No previous snapshot: everything is "added"
    result.added = newItems.slice();
    return result;
  }

  var seenIds = {};
  for (var i = 0; i < newItems.length; i++) {
    var item = newItems[i];
    var id = String(item[idField]);
    seenIds[id] = true;

    var newHash = computeDocHash_(item);
    if (!oldHashMap[id]) {
      result.added.push(item);
    } else if (oldHashMap[id] !== newHash) {
      result.changed.push(item);
    } else {
      result.unchanged.push(item);
    }
  }

  // Find deleted items (in old but not in new)
  var oldIds = Object.keys(oldHashMap);
  for (var d = 0; d < oldIds.length; d++) {
    if (!seenIds[oldIds[d]]) {
      result.deleted.push(oldIds[d]);
    }
  }

  return result;
}

/**
 * Save a collection-level hash as fallback (Option A).
 */
function saveCollectionHash_(collectionName, hash) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty(SNAPSHOT_PREFIX_ + collectionName + '_hash', hash);
}

/**
 * Load a collection-level hash (Option A fallback).
 */
function loadCollectionHash_(collectionName) {
  return PropertiesService.getScriptProperties().getProperty(
    SNAPSHOT_PREFIX_ + collectionName + '_hash'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA FETCHING FUNCTIONS (Chỉ đọc dữ liệu KiotViet)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lấy dữ liệu kho hàng (branches & products) từ KiotViet
 */
function getKiotVietDataPayload(kiotToken) {
  var retailerName = getSecret('KIOT_RETAILER');
  var getOptions = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + kiotToken,
      Retailer: retailerName,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  // Lấy chi nhánh
  var branchResponse = safeFetch('https://public.kiotapi.com/branches', getOptions);
  var rawBranches = JSON.parse(branchResponse.getContentText()).data || [];
  var branches = rawBranches.map(function(item) {
    return {
      id: Number(item.id),
      branchName: String(item.branchName || ''),
      address: String(item.address || ''),
      contactNumber: String(item.contactNumber || ''),
      isActive: item.isActive !== false,
      source: 'synced'
    };
  });

  // Lấy sản phẩm (Phân trang và gọi fetch song song)
  var pageSize = 100;
  var rawProducts = [];
  var firstResponse = safeFetch(
    'https://public.kiotapi.com/products?pageSize=' +
      pageSize +
      '&currentItem=0&includeInventory=true',
    getOptions
  );
  var firstPageData = JSON.parse(firstResponse.getContentText());
  rawProducts = rawProducts.concat(firstPageData.data || []);

  var total = Number(firstPageData.total || 0);
  if (total > pageSize) {
    var requests = [];
    for (var currentItem = pageSize; currentItem < total; currentItem += pageSize) {
      requests.push({
        url:
          'https://public.kiotapi.com/products?pageSize=' +
          pageSize +
          '&currentItem=' +
          currentItem +
          '&includeInventory=true',
        method: 'get',
        headers: getOptions.headers,
        muteHttpExceptions: true
      });
    }

    UrlFetchApp.fetchAll(requests).forEach(function(response, index) {
      if (response.getResponseCode() !== 200) {
        Logger.log('KiotViet products page error: ' + response.getContentText());
        throw new Error('Unable to load KiotViet products page ' + (index + 2));
      }
      rawProducts = rawProducts.concat(JSON.parse(response.getContentText()).data || []);
    });
  }

  var products = rawProducts.map(function(item) {
    return {
      id: Number(item.id),
      code: String(item.code || ''),
      name: String(item.name || ''),
      categoryName: String(item.categoryName || 'Other'),
      basePrice: Number(item.basePrice || 0),
      inventories: (item.inventories || []).map(function(inv) {
        return {
          branchId: Number(inv.branchId),
          branchName: String(inv.branchName || ''),
          onHand: Number(inv.onHand || 0)
        };
      }),
      source: 'synced'
    };
  });

  return { branches: branches, products: products };
}

/**
 * Lấy danh sách invoices từ KiotViet - trả về mảng invoices (không ghi vào Firestore)
 */
function getKiotVietInvoicesPayload(kiotToken, fromPurchaseDate, toPurchaseDate, pageSize, currentItem) {
  var retailerName = getSecret('KIOT_RETAILER');
  var getOptions = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + kiotToken,
      Retailer: retailerName,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  var size = pageSize || 100;
  var allInvoices = [];
  var current = currentItem || 0;

  while (true) {
    var url =
      'https://public.kiotapi.com/invoices?fromPurchaseDate=' + encodeURIComponent(fromPurchaseDate) +
      '&toPurchaseDate=' + encodeURIComponent(toPurchaseDate) +
      '&pageSize=' + size +
      '&currentItem=' + current;

    var response = safeFetch(url, getOptions);
    var parsed = JSON.parse(response.getContentText());
    var data = parsed.data || [];
    allInvoices = allInvoices.concat(data);

    if (data.length < size) {
      break;
    }
    current += data.length;
  }

  return allInvoices;
}

/**
 * Lấy dữ liệu danh sách khách hàng từ KiotViet
 */
function getKiotVietCustomersPayload(kiotToken) {
  var retailerName = getSecret('KIOT_RETAILER');
  var getOptions = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + kiotToken,
      Retailer: retailerName,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  var pageSize = 100;
  var rawCustomers = [];
  
  var firstResponse = safeFetch(
    'https://public.kiotapi.com/customers?pageSize=' +
      pageSize +
      '&currentItem=0&includeTotal=true&includeCustomerGroup=true',
    getOptions
  );
  var firstPageData = JSON.parse(firstResponse.getContentText());
  rawCustomers = rawCustomers.concat(firstPageData.data || []);

  var total = Number(firstPageData.total || 0);
  if (total > pageSize) {
    var requests = [];
    for (var currentItem = pageSize; currentItem < total; currentItem += pageSize) {
      requests.push({
        url:
          'https://public.kiotapi.com/customers?pageSize=' +
          pageSize +
          '&currentItem=' +
          currentItem +
          '&includeTotal=true&includeCustomerGroup=true',
        method: 'get',
        headers: getOptions.headers,
        muteHttpExceptions: true
      });
    }

    UrlFetchApp.fetchAll(requests).forEach(function(response, index) {
      if (response.getResponseCode() !== 200) {
        Logger.log('KiotViet customers page error: ' + response.getContentText());
        throw new Error('Unable to load KiotViet customers page ' + (index + 2));
      }
      rawCustomers = rawCustomers.concat(JSON.parse(response.getContentText()).data || []);
    });
  }

  var timestamp = new Date().toISOString();
  var customers = rawCustomers.map(function(item) {
    return {
      id: String(item.id),
      code: String(item.code || ''),
      name: String(item.name || ''),
      phone: String(item.contactNumber || ''),
      email: String(item.email || ''),
      address: String(item.address || ''),
      gender: item.gender === true ? 'male' : item.gender === false ? 'female' : 'other',
      birthDate: String(item.birthDate || ''),
      debt: Number(item.debt || 0),
      totalSpent: Number(item.totalInvoiced || 0),
      points: Number(item.totalPoint || 0),
      groupName: (item.customerGroup && item.customerGroup.name) ? String(item.customerGroup.name) : 'Khác',
      groupId: item.customerGroup ? Number(item.customerGroup.id) : 0,
      isActive: item.isActive !== false,
      lastSyncedAt: timestamp,
      updatedAt: timestamp
    };
  });

  return customers;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DATA SAVING FUNCTIONS (Diff-aware: only write changed documents)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save warehouse data (branches & products) to Firestore — diff-aware.
 * Only writes documents that actually changed since last sync.
 */
function saveWarehouseDataToFirestore_(projectId, googleToken, branches, products) {
  var writes = [];
  var stats = {
    branches: { added: 0, changed: 0, unchanged: 0, deleted: 0, mode: 'per-document' },
    products: { added: 0, changed: 0, unchanged: 0, deleted: 0, mode: 'per-document' }
  };

  // --- Diff branches ---
  var newBranchHashes = buildHashMap_(branches, 'id');
  var oldBranchHashes = loadSnapshot_('branches');

  if (oldBranchHashes) {
    var branchDiff = computeDiff_(branches, oldBranchHashes, 'id');
    stats.branches.added = branchDiff.added.length;
    stats.branches.changed = branchDiff.changed.length;
    stats.branches.unchanged = branchDiff.unchanged.length;
    stats.branches.deleted = branchDiff.deleted.length;

    var branchesToWrite = branchDiff.added.concat(branchDiff.changed);
    branchesToWrite.forEach(function(branch) {
      writes.push({
        update: {
          name: 'projects/' + projectId + '/databases/(default)/documents/warehouse_branches/' + branch.id,
          fields: toFirestoreDoc(branch).fields
        }
      });
    });
  } else {
    // First run: write all branches
    stats.branches.added = branches.length;
    branches.forEach(function(branch) {
      writes.push({
        update: {
          name: 'projects/' + projectId + '/databases/(default)/documents/warehouse_branches/' + branch.id,
          fields: toFirestoreDoc(branch).fields
        }
      });
    });
  }

  // --- Diff products ---
  var newProductHashes = buildHashMap_(products, 'id');
  var oldProductHashes = loadSnapshot_('products');

  if (oldProductHashes) {
    var productDiff = computeDiff_(products, oldProductHashes, 'id');
    stats.products.added = productDiff.added.length;
    stats.products.changed = productDiff.changed.length;
    stats.products.unchanged = productDiff.unchanged.length;
    stats.products.deleted = productDiff.deleted.length;

    var productsToWrite = productDiff.added.concat(productDiff.changed);
    productsToWrite.forEach(function(product) {
      writes.push({
        update: {
          name: 'projects/' + projectId + '/databases/(default)/documents/warehouse_products/' + product.id,
          fields: toFirestoreDoc(product).fields
        }
      });
    });
  } else {
    stats.products.added = products.length;
    products.forEach(function(product) {
      writes.push({
        update: {
          name: 'projects/' + projectId + '/databases/(default)/documents/warehouse_products/' + product.id,
          fields: toFirestoreDoc(product).fields
        }
      });
    });
  }

  // --- Batch write only if there are actual changes ---
  var totalWrites = writes.length;
  if (totalWrites > 0) {
    batchCommitToFirestore(projectId, googleToken, writes);
  }

  // --- Save snapshots for next run ---
  var branchSnapOk = saveSnapshot_('branches', newBranchHashes);
  var productSnapOk = saveSnapshot_('products', newProductHashes);

  // Fallback to collection hash if per-document snapshot failed
  if (!branchSnapOk) {
    stats.branches.mode = 'collection-hash';
    saveCollectionHash_('branches', computeCollectionHash_(branches));
  }
  if (!productSnapOk) {
    stats.products.mode = 'collection-hash';
    saveCollectionHash_('products', computeCollectionHash_(products));
  }

  // --- Write sync log only when there were actual writes ---
  var summary;
  if (totalWrites > 0) {
    var logId = 'log_' + Date.now();
    summary = 'Warehouse sync: ' + totalWrites + ' writes (' +
      stats.branches.added + ' branches added, ' + stats.branches.changed + ' changed, ' +
      stats.products.added + ' products added, ' + stats.products.changed + ' changed). ' +
      'Skipped ' + (stats.branches.unchanged + stats.products.unchanged) + ' unchanged docs.';

    batchCommitToFirestore(projectId, googleToken, [
      {
        update: {
          name: 'projects/' + projectId + '/databases/(default)/documents/warehouse_sync_logs/' + logId,
          fields: toFirestoreDoc({
            id: logId,
            timestamp: new Date().toISOString(),
            summary: summary,
            writesExecuted: totalWrites,
            writesSkipped: stats.branches.unchanged + stats.products.unchanged,
            branchesAdded: stats.branches.added,
            branchesUpdated: stats.branches.changed,
            productsAdded: stats.products.added,
            productsUpdated: stats.products.changed,
            diffMode: stats.products.mode
          }).fields
        }
      }
    ]);
  } else {
    summary = 'Warehouse sync: no changes detected. Skipped ' +
      (stats.branches.unchanged + stats.products.unchanged) + ' docs. 0 Firestore writes.';
    Logger.log('[DIFF_ENGINE] ' + summary);
  }

  stats.summary = summary;
  return stats;
}

/**
 * Save customer data to Firestore — diff-aware.
 * Only writes customers that actually changed since last sync.
 */
function saveCustomersDataToFirestore_(projectId, googleToken, customers) {
  var writes = [];
  var stats = { added: 0, changed: 0, unchanged: 0, deleted: 0, mode: 'per-document' };

  // --- Diff customers ---
  var newCustomerHashes = buildHashMap_(customers, 'id');
  var oldCustomerHashes = loadSnapshot_('customers');

  if (oldCustomerHashes) {
    var diff = computeDiff_(customers, oldCustomerHashes, 'id');
    stats.added = diff.added.length;
    stats.changed = diff.changed.length;
    stats.unchanged = diff.unchanged.length;
    stats.deleted = diff.deleted.length;

    var customersToWrite = diff.added.concat(diff.changed);
    customersToWrite.forEach(function(customer) {
      writes.push({
        update: {
          name: 'projects/' + projectId + '/databases/(default)/documents/customers/' + customer.id,
          fields: toFirestoreDoc(customer).fields
        }
      });
    });
  } else {
    // First run: write all
    stats.added = customers.length;
    customers.forEach(function(customer) {
      writes.push({
        update: {
          name: 'projects/' + projectId + '/databases/(default)/documents/customers/' + customer.id,
          fields: toFirestoreDoc(customer).fields
        }
      });
    });
  }

  // --- Batch write only if there are actual changes ---
  var totalWrites = writes.length;
  if (totalWrites > 0) {
    batchCommitToFirestore(projectId, googleToken, writes);
  }

  // --- Save snapshot for next run ---
  var snapOk = saveSnapshot_('customers', newCustomerHashes);
  if (!snapOk) {
    stats.mode = 'collection-hash';
    saveCollectionHash_('customers', computeCollectionHash_(customers));
  }

  // --- Write sync log only when there were actual writes ---
  var summary;
  if (totalWrites > 0) {
    var logId = 'log_' + Date.now();
    summary = 'Customer sync: ' + totalWrites + ' writes (' +
      stats.added + ' added, ' + stats.changed + ' changed). ' +
      'Skipped ' + stats.unchanged + ' unchanged docs.';

    batchCommitToFirestore(projectId, googleToken, [
      {
        update: {
          name: 'projects/' + projectId + '/databases/(default)/documents/customer_sync_logs/' + logId,
          fields: toFirestoreDoc({
            id: logId,
            timestamp: new Date().toISOString(),
            status: 'SUCCESS',
            writesExecuted: totalWrites,
            writesSkipped: stats.unchanged,
            addedCount: stats.added,
            updatedCount: stats.changed,
            deletedCount: 0,
            diffMode: stats.mode,
            triggeredBy: 'system_cron'
          }).fields
        }
      }
    ]);
  } else {
    summary = 'Customer sync: no changes detected. Skipped ' +
      stats.unchanged + ' docs. 0 Firestore writes.';
    Logger.log('[DIFF_ENGINE] ' + summary);
  }

  stats.summary = summary;
  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SYNC COORDINATOR (Hàm điều phối đồng bộ chính)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hàm điều phối chính
 * @param {boolean} previewOnly true nếu chỉ muốn đọc dữ liệu về hiển thị ở UI
 * @param {string} target 'warehouse' | 'customers' | 'all'
 */
function runSyncProcess(previewOnly, target) {
  var shouldPreview = previewOnly === true;
  var syncTarget = target || 'all';
  var startTime = Date.now();
  
  var kiotToken = getCachedKiotVietToken();
  var projectId = getSecret('FIREBASE_PROJECT_ID');
  
  var responsePayload = {
    success: true,
    preview: shouldPreview,
    timeTaken: ''
  };

  var warehouseData = null;
  var customers = null;

  // Step 1: Fetch raw data from KiotViet
  if (syncTarget === 'warehouse' || syncTarget === 'all') {
    warehouseData = getKiotVietDataPayload(kiotToken);
    responsePayload.branches = warehouseData.branches;
    responsePayload.products = warehouseData.products;
  }
  
  if (syncTarget === 'customers' || syncTarget === 'all') {
    customers = getKiotVietCustomersPayload(kiotToken);
    responsePayload.customers = customers;
  }

  var timeTaken = Math.floor((Date.now() - startTime) / 1000) + 's';
  responsePayload.timeTaken = timeTaken;

  // Preview mode: return data without writing to Firestore
  if (shouldPreview) {
    var previewParts = [];
    if (warehouseData) {
      previewParts.push(warehouseData.branches.length + ' branches, ' + warehouseData.products.length + ' products');
    }
    if (customers) {
      previewParts.push(customers.length + ' customers');
    }
    responsePayload.summary = 'Preview sync loaded ' + previewParts.join(' and ') + ' successfully (no database writes).';
    return responsePayload;
  }

  // Step 2: Diff-aware save (only write changed documents)
  var googleToken = getFirestoreAccessToken_();
  var summaries = [];
  var diffStats = {};

  if (warehouseData) {
    var warehouseResult = saveWarehouseDataToFirestore_(projectId, googleToken, warehouseData.branches, warehouseData.products);
    summaries.push(warehouseResult.summary);
    diffStats.branches = warehouseResult.branches;
    diffStats.products = warehouseResult.products;
  }

  if (customers) {
    var customerResult = saveCustomersDataToFirestore_(projectId, googleToken, customers);
    summaries.push(customerResult.summary);
    diffStats.customers = {
      added: customerResult.added,
      changed: customerResult.changed,
      unchanged: customerResult.unchanged,
      mode: customerResult.mode
    };
  }

  responsePayload.summary = summaries.join(' ');
  responsePayload.diffStats = diffStats;
  return responsePayload;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB API ENTRYPOINT (doGet)
// ─────────────────────────────────────────────────────────────────────────────

function doGet(e) {
  var token = e.parameter.token;
  var action = e.parameter.action || 'all'; // 'warehouse' | 'customers' | 'all'
  var preview = e.parameter.preview === 'true';

  if (token !== getSecret('GAS_SYNC_TOKEN')) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unauthorized: Invalid security token'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var result = runSyncProcess(preview, action);
    return ContentService.createTextOutput(JSON.stringify(result))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRON TRIGGERS (Tự động hàng ngày)
// ─────────────────────────────────────────────────────────────────────────────

function autoTriggerSync() {
  var startedAt = new Date();
  var startMs = Date.now();

  Logger.log('==================================================');
  Logger.log('[AUTO_SYNC] START at: ' + startedAt.toISOString());
  Logger.log('[AUTO_SYNC] Mode: preview=false, target=all');
  Logger.log('==================================================');

  try {
    var kiotToken = null;
    var projectId = null;
    var googleToken = null;

    var warehouseData = null;
    var customers = null;

    // STEP 1: Load config/token
    Logger.log('[AUTO_SYNC][STEP_1] Getting KiotViet token...');
    kiotToken = getCachedKiotVietToken();
    Logger.log('[AUTO_SYNC][STEP_1] KiotViet token OK. Token length=' + (kiotToken ? kiotToken.length : 0));

    Logger.log('[AUTO_SYNC][STEP_1] Getting Firebase project id...');
    projectId = getSecret('FIREBASE_PROJECT_ID');
    Logger.log('[AUTO_SYNC][STEP_1] Firebase project id=' + projectId);

    // STEP 2: Fetch warehouse
    try {
      Logger.log('[AUTO_SYNC][WAREHOUSE][FETCH] Start fetching branches/products from KiotViet...');
      var warehouseFetchStart = Date.now();

      warehouseData = getKiotVietDataPayload(kiotToken);

      Logger.log(
        '[AUTO_SYNC][WAREHOUSE][FETCH] Done. branches=' +
          (warehouseData && warehouseData.branches ? warehouseData.branches.length : 0) +
          ', products=' +
          (warehouseData && warehouseData.products ? warehouseData.products.length : 0) +
          ', time=' +
          Math.floor((Date.now() - warehouseFetchStart) / 1000) +
          's'
      );

      if (warehouseData && warehouseData.branches && warehouseData.branches.length > 0) {
        Logger.log('[AUTO_SYNC][WAREHOUSE][SAMPLE_BRANCH] ' + JSON.stringify(warehouseData.branches[0]));
      }

      if (warehouseData && warehouseData.products && warehouseData.products.length > 0) {
        Logger.log('[AUTO_SYNC][WAREHOUSE][SAMPLE_PRODUCT] ' + JSON.stringify(warehouseData.products[0]));
      }
    } catch (warehouseFetchError) {
      Logger.log('[AUTO_SYNC][WAREHOUSE][FETCH][ERROR] ' + warehouseFetchError.message);
      Logger.log('[AUTO_SYNC][WAREHOUSE][FETCH][STACK] ' + warehouseFetchError.stack);
      throw warehouseFetchError;
    }

    // STEP 3: Fetch customers
    try {
      Logger.log('[AUTO_SYNC][CUSTOMERS][FETCH] Start fetching customers from KiotViet...');
      var customerFetchStart = Date.now();

      customers = getKiotVietCustomersPayload(kiotToken);

      Logger.log(
        '[AUTO_SYNC][CUSTOMERS][FETCH] Done. customers=' +
          (customers ? customers.length : 0) +
          ', time=' +
          Math.floor((Date.now() - customerFetchStart) / 1000) +
          's'
      );

      if (customers && customers.length > 0) {
        Logger.log('[AUTO_SYNC][CUSTOMERS][SAMPLE_CUSTOMER] ' + JSON.stringify(customers[0]));
      } else {
        Logger.log('[AUTO_SYNC][CUSTOMERS][WARNING] KiotViet returned 0 customers.');
      }
    } catch (customerFetchError) {
      Logger.log('[AUTO_SYNC][CUSTOMERS][FETCH][ERROR] ' + customerFetchError.message);
      Logger.log('[AUTO_SYNC][CUSTOMERS][FETCH][STACK] ' + customerFetchError.stack);
      throw customerFetchError;
    }

    // STEP 4: Get Firestore token
    try {
      Logger.log('[AUTO_SYNC][FIRESTORE] Getting Firestore access token...');
      googleToken = getFirestoreAccessToken_();
      Logger.log('[AUTO_SYNC][FIRESTORE] Firestore token OK. Token length=' + (googleToken ? googleToken.length : 0));
    } catch (firestoreTokenError) {
      Logger.log('[AUTO_SYNC][FIRESTORE][TOKEN][ERROR] ' + firestoreTokenError.message);
      Logger.log('[AUTO_SYNC][FIRESTORE][TOKEN][STACK] ' + firestoreTokenError.stack);
      throw firestoreTokenError;
    }

    // STEP 5: Save warehouse (diff-aware)
    var warehouseResult = null;
    try {
      Logger.log('[AUTO_SYNC][WAREHOUSE][SAVE] Start diff-aware save to Firestore...');
      var warehouseSaveStart = Date.now();

      warehouseResult = saveWarehouseDataToFirestore_(
        projectId,
        googleToken,
        warehouseData.branches,
        warehouseData.products
      );

      Logger.log(
        '[AUTO_SYNC][WAREHOUSE][SAVE] Done. ' +
          'branches(added=' + warehouseResult.branches.added +
          ', changed=' + warehouseResult.branches.changed +
          ', unchanged=' + warehouseResult.branches.unchanged +
          ', mode=' + warehouseResult.branches.mode + ') ' +
          'products(added=' + warehouseResult.products.added +
          ', changed=' + warehouseResult.products.changed +
          ', unchanged=' + warehouseResult.products.unchanged +
          ', mode=' + warehouseResult.products.mode + ') ' +
          'time=' + Math.floor((Date.now() - warehouseSaveStart) / 1000) + 's'
      );
    } catch (warehouseSaveError) {
      Logger.log('[AUTO_SYNC][WAREHOUSE][SAVE][ERROR] ' + warehouseSaveError.message);
      Logger.log('[AUTO_SYNC][WAREHOUSE][SAVE][STACK] ' + warehouseSaveError.stack);
      throw warehouseSaveError;
    }

    // STEP 6: Save customers (diff-aware)
    var customerResult = null;
    try {
      Logger.log('[AUTO_SYNC][CUSTOMERS][SAVE] Start diff-aware save to Firestore...');
      Logger.log('[AUTO_SYNC][CUSTOMERS][SAVE] customers.length=' + (customers ? customers.length : 0));

      var customerSaveStart = Date.now();

      customerResult = saveCustomersDataToFirestore_(
        projectId,
        googleToken,
        customers || []
      );

      Logger.log(
        '[AUTO_SYNC][CUSTOMERS][SAVE] Done. ' +
          'added=' + customerResult.added +
          ', changed=' + customerResult.changed +
          ', unchanged=' + customerResult.unchanged +
          ', mode=' + customerResult.mode +
          ', time=' + Math.floor((Date.now() - customerSaveStart) / 1000) + 's'
      );
    } catch (customerSaveError) {
      Logger.log('[AUTO_SYNC][CUSTOMERS][SAVE][ERROR] ' + customerSaveError.message);
      Logger.log('[AUTO_SYNC][CUSTOMERS][SAVE][STACK] ' + customerSaveError.stack);
      throw customerSaveError;
    }

    // STEP 7: Final summary
    Logger.log('==================================================');
    Logger.log('[AUTO_SYNC] COMPLETED SUCCESSFULLY');
    Logger.log('[AUTO_SYNC] Warehouse: ' + (warehouseResult ? warehouseResult.summary : 'N/A'));
    Logger.log('[AUTO_SYNC] Customers: ' + (customerResult ? customerResult.summary : 'N/A'));
    Logger.log('[AUTO_SYNC] Total time: ' + Math.floor((Date.now() - startMs) / 1000) + 's');
    Logger.log('==================================================');
  } catch (error) {
    Logger.log('==================================================');
    Logger.log('[AUTO_SYNC] FAILED');
    Logger.log('[AUTO_SYNC] Error message: ' + error.message);
    Logger.log('[AUTO_SYNC] Error stack: ' + error.stack);
    Logger.log('[AUTO_SYNC] Total time before failed: ' + Math.floor((Date.now() - startMs) / 1000) + 's');
    Logger.log('==================================================');
  }
}

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  // Kích hoạt chạy tự động lúc 2 giờ sáng hàng ngày
  ScriptApp.newTrigger('autoTriggerSync').timeBased().everyDays(1).atHour(2).create();
  Logger.log('Scheduled daily warehouse & customer sync trigger at approximately 02:00.');
}