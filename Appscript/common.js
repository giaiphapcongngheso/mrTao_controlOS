var FIRESTORE_SCOPE_ = 'https://www.googleapis.com/auth/datastore';
var IDENTITY_TOOLKIT_SCOPE_ = 'https://www.googleapis.com/auth/identitytoolkit';

function getSecret(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error('Missing Script Property: ' + key);
  }
  return value;
}

function getOptionalSecret_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function parseRequestPayload_(e) {
  var data = {};

  if (e && e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (error) {
      // Return empty if postData cannot be parsed as JSON
    }
  }

  if (e && e.parameter) {
    for (var key in e.parameter) {
      if (data[key] === undefined) {
        data[key] = e.parameter[key];
      }
    }
  }

  return data;
}

function jsonResponse_(obj) {
  return json_(obj);
}

function normalizeOriginValue_(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\/+$/g, '');
}

function getAllowedWebOrigins_() {
  var configured = getOptionalSecret_('ALLOWED_WEB_ORIGINS');
  var defaults = [
    'https://giaiphapcongngheso.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  var merged = defaults.slice();

  if (configured) {
    configured
      .split(/[,\n]/)
      .map(function(item) {
        return normalizeOriginValue_(item);
      })
      .filter(function(item) {
        return !!item;
      })
      .forEach(function(item) {
        if (merged.indexOf(item) === -1) {
          merged.push(item);
        }
      });
  }

  return merged.map(function(item) {
    return normalizeOriginValue_(item);
  });
}

function isAllowedWebOrigin_(origin) {
  var normalizedOrigin = normalizeOriginValue_(origin);
  if (!normalizedOrigin) {
    return false;
  }

  var allowlist = getAllowedWebOrigins_();
  for (var i = 0; i < allowlist.length; i += 1) {
    if (allowlist[i] === normalizedOrigin) {
      return true;
    }
  }

  return false;
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function iframePostMessageResponse_(targetOrigin, requestId, payload) {
  var normalizedTargetOrigin = normalizeOriginValue_(targetOrigin);
  if (!isAllowedWebOrigin_(normalizedTargetOrigin)) {
    throw new Error(
      'Origin is not allowed: ' +
        normalizedTargetOrigin +
        '. Allowed: ' +
        getAllowedWebOrigins_().join(', ')
    );
  }

  var serializedPayload = JSON.stringify({
    requestId: requestId ? String(requestId) : '',
    success: !!(payload && payload.success),
    data: payload && payload.data ? payload.data : null,
    error: payload && payload.error ? String(payload.error) : null
  })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  var html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' +
    '<script>' +
    '(function(){' +
    'var payload=' +
    serializedPayload +
    ';' +
    'var targetOrigin=' +
    JSON.stringify(String(normalizedTargetOrigin)) +
    ';' +
    'if(window.top&&window.top!==window){window.top.postMessage(payload,targetOrigin);}else{window.postMessage(payload,targetOrigin);}' +
    '})();' +
    '</script>' +
    '<div style="font-family:Arial,sans-serif;font-size:12px;color:#475569;padding:8px;">' +
    escapeHtml_(payload && payload.success ? 'Staff auth synchronized.' : 'Staff auth failed.') +
    '</div>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
}

function getServiceAccountCredentials_() {
  var rawServiceAccountKey = getOptionalSecret_('SERVICE_ACCOUNT_KEY');
  if (rawServiceAccountKey) {
    var parsed = JSON.parse(rawServiceAccountKey);
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error(
        'SERVICE_ACCOUNT_KEY must contain client_email and private_key'
      );
    }

    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    return parsed;
  }

  var legacyClientEmail = getOptionalSecret_('FIREBASE_CLIENT_EMAIL');
  var legacyPrivateKey = getOptionalSecret_('FIREBASE_PRIVATE_KEY');
  if (legacyClientEmail && legacyPrivateKey) {
    return {
      client_email: legacyClientEmail,
      private_key: legacyPrivateKey.replace(/\\n/g, '\n')
    };
  }

  throw new Error(
    'Missing service account credentials. Set SERVICE_ACCOUNT_KEY or legacy FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.'
  );
}

function getServiceAccountService_(serviceName, scopes) {
  var requestedScopes = scopes.slice();
  return {
    hasAccess: function() {
      try {
        this.getAccessToken();
        return true;
      } catch (error) {
        this._lastError = error.message;
        return false;
      }
    },
    getAccessToken: function() {
      if (!this._accessToken) {
        this._accessToken = getServiceAccountAccessTokenManual_(
          serviceName,
          requestedScopes
        );
      }
      return this._accessToken;
    },
    getLastError: function() {
      return this._lastError || null;
    }
  };
}

function getServiceAccountAccessToken_(serviceName, scopes) {
  var service = getServiceAccountService_(serviceName, scopes);
  if (!service.hasAccess()) {
    throw new Error(
      'Service account authorization failed: ' +
        (service.getLastError() || 'unknown error')
    );
  }
  return service.getAccessToken();
}

function getServiceAccountAccessTokenManual_(serviceName, scopes) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'SA_TOKEN_' + serviceName + '_' + scopes.join('|');
  var cachedToken = cache.get(cacheKey);
  if (cachedToken) {
    return cachedToken;
  }

  var credentials = getServiceAccountCredentials_();
  var issuedAt = Math.floor(Date.now() / 1000);
  var expiresAt = issuedAt + 3600;
  var header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  var claimSet = {
    iss: credentials.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiresAt,
    iat: issuedAt
  };

  var encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  var encodedClaimSet = Utilities.base64EncodeWebSafe(JSON.stringify(claimSet));
  var signatureInput = encodedHeader + '.' + encodedClaimSet;
  var signature = Utilities.computeRsaSha256Signature(
    signatureInput,
    credentials.private_key
  );
  var jwt =
    signatureInput + '.' + Utilities.base64EncodeWebSafe(signature);

  var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    },
    muteHttpExceptions: true
  });

  var responseText = response.getContentText();
  var parsed;
  try {
    parsed = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    parsed = {};
  }

  if (response.getResponseCode() !== 200 || !parsed.access_token) {
    throw new Error(
      extractGoogleApiError_(parsed, 'Service account token request failed')
    );
  }

  try {
    cache.put(cacheKey, parsed.access_token, 3000);
  } catch (error) {
    Logger.log('Unable to cache service account token: ' + error.message);
  }

  return parsed.access_token;
}

function callIdentityToolkit_(path, payload, service) {
  var projectId = getSecret('FIREBASE_PROJECT_ID');
  var normalizedPath = String(path || '').replace(/^\/+/, '');
  var url =
    'https://identitytoolkit.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) +
    '/' +
    normalizedPath;

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + service.getAccessToken()
    },
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true
  });

  var responseText = response.getContentText();
  var responseCode = response.getResponseCode();
  var parsed;

  try {
    parsed = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    parsed = {};
  }

  if (responseCode < 200 || responseCode >= 300) {
    throw new Error(
      extractGoogleApiError_(parsed, 'Identity Toolkit request failed')
    );
  }

  return parsed;
}

function extractGoogleApiError_(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage;
  }

  if (payload.error) {
    if (typeof payload.error === 'string') {
      return payload.error;
    }
    if (payload.error.message) {
      return payload.error.message;
    }
    if (payload.error.status) {
      return payload.error.status;
    }
  }

  if (payload.message) {
    return payload.message;
  }

  return fallbackMessage;
}

function normalizeEmail_(value) {
  return value ? String(value).trim() : '';
}

function asBoolean_(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}
