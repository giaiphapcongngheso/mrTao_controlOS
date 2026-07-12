function getIdentityToolkitService_() {
  return getServiceAccountService_('identity-toolkit-service-account', [
    IDENTITY_TOOLKIT_SCOPE_
  ]);
}

function lookupLocalIdByEmail_(email, service) {
  var normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) {
    return null;
  }

  var result = callIdentityToolkit_(
    'accounts:lookup',
    {
      email: [normalizedEmail]
    },
    service
  );

  if (result.users && result.users.length) {
    return result.users[0].localId || null;
  }

  return null;
}

function lookupFirebaseAuthUserByEmail_(email, service) {
  var localId = lookupLocalIdByEmail_(email, service);
  if (!localId) {
    return null;
  }
  return lookupFirebaseAuthUserByUid_(localId, service);
}

function lookupFirebaseAuthUserByUid_(uid, service) {
  var normalizedUid = uid ? String(uid).trim() : '';
  if (!normalizedUid) {
    return null;
  }

  var result = callIdentityToolkit_(
    'accounts:lookup',
    {
      localId: [normalizedUid]
    },
    service
  );

  if (result.users && result.users.length) {
    return result.users[0];
  }

  return null;
}

function lookupFirebaseAuthUser_(request, service) {
  var lookupSteps = [];

  if (request.firebaseUid) {
    lookupSteps.push({
      type: 'uid',
      value: String(request.firebaseUid).trim()
    });
  }

  if (request.currentAuthEmail) {
    lookupSteps.push({
      type: 'email',
      value: normalizeEmail_(request.currentAuthEmail)
    });
  }

  if (request.authEmail) {
    lookupSteps.push({
      type: 'email',
      value: normalizeEmail_(request.authEmail)
    });
  }

  var seen = {};
  for (var i = 0; i < lookupSteps.length; i += 1) {
    var step = lookupSteps[i];
    if (!step.value) {
      continue;
    }

    var dedupeKey = step.type + ':' + step.value;
    if (seen[dedupeKey]) {
      continue;
    }
    seen[dedupeKey] = true;

    var user =
      step.type === 'uid'
        ? lookupFirebaseAuthUserByUid_(step.value, service)
        : lookupFirebaseAuthUserByEmail_(step.value, service);

    if (user) {
      return user;
    }
  }

  return null;
}

function updateFirebaseAuthUser_(user, request, service) {
  var nextEmail = normalizeEmail_(request.authEmail);
  var nextPassword = request.password ? String(request.password) : '';
  var payload = {
    localId: user.localId
  };
  var hasChanges = false;

  if (nextEmail && nextEmail !== normalizeEmail_(user.email)) {
    payload.email = nextEmail;
    hasChanges = true;
  }

  if (nextPassword) {
    payload.password = nextPassword;
    hasChanges = true;
  }

  if (hasChanges) {
    var updated = callIdentityToolkit_('accounts:update', payload, service);
    return {
      uid: updated.localId || user.localId,
      authEmail: updated.email || nextEmail || user.email || '',
      status: 'updated'
    };
  }

  return {
    uid: user.localId,
    authEmail: nextEmail || user.email || '',
    status: 'updated'
  };
}

function createFirebaseAuthUser_(request, service) {
  var nextEmail = normalizeEmail_(request.authEmail);
  var nextPassword = request.password ? String(request.password) : '';

  if (!nextPassword) {
    throw new Error(
      'Firebase Auth user not found and password is required to create a new user'
    );
  }

  var payload = {
    email: nextEmail,
    password: nextPassword
  };

  if (request.firebaseUid) {
    payload.localId = String(request.firebaseUid).trim();
  }

  var created = callIdentityToolkit_('accounts', payload, service);
  return {
    uid: created.localId,
    authEmail: created.email || nextEmail,
    status: 'created'
  };
}

function handleStaffAuthUpdate_(request) {
  var providedToken = request && request.token ? String(request.token) : '';
  var expectedToken = getSecret('GAS_SYNC_TOKEN');
  if (!providedToken || providedToken !== expectedToken) {
    return {
      success: false,
      error: 'Unauthorized. Invalid token.'
    };
  }

  var authEmail = normalizeEmail_(request.authEmail);
  if (!authEmail) {
    return {
      success: false,
      error: 'Missing authEmail'
    };
  }

  var service = getIdentityToolkitService_();
  if (!service.hasAccess()) {
    return {
      success: false,
      error:
        'Service account authorization failed: ' +
        (service.getLastError() || 'unknown error')
    };
  }

  try {
    var existingUser = lookupFirebaseAuthUser_(request, service);
    if (existingUser) {
      return {
        success: true,
        data: updateFirebaseAuthUser_(existingUser, request, service)
      };
    }

    if (asBoolean_(request.allowCreate)) {
      return {
        success: true,
        data: createFirebaseAuthUser_(request, service)
      };
    }

    return {
      success: false,
      error: 'Firebase Auth user not found'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function buildStaffAuthResponse_(request, payload) {
  var mode = request && request.mode ? String(request.mode).toLowerCase() : '';
  if (mode === 'json') {
    return jsonResponse_(payload);
  }

  var origin = request && request.origin ? String(request.origin) : '';
  var requestId = request && request.requestId ? String(request.requestId) : '';
  return iframePostMessageResponse_(origin, requestId, payload);
}

function safeStaffAuthErrorResponse_(request, error) {
  var payload = {
    success: false,
    error: error && error.message ? String(error.message) : 'Unexpected Apps Script error'
  };

  try {
    return buildStaffAuthResponse_(request, payload);
  } catch (responseError) {
    return jsonResponse_({
      success: false,
      error: payload.error,
      responseModeError:
        responseError && responseError.message ? String(responseError.message) : 'Unable to build iframe response'
    });
  }
}

// doPost đã được chuyển sang main.js để gộp chung với chức năng gửi Email.
function doPostDeprecated_(e) {
  var request = {};

  try {
    request = parseRequestPayload_(e);
  } catch (error) {
    return safeStaffAuthErrorResponse_(request, error);
  }

  var action = request && request.action ? String(request.action) : '';
  if (action !== 'staffAuthUpdate') {
    return safeStaffAuthErrorResponse_(request, new Error('Unsupported action'));
  }

  var payload;
  try {
    payload = handleStaffAuthUpdate_(request);
  } catch (error) {
    return safeStaffAuthErrorResponse_(request, error);
  }

  try {
    return buildStaffAuthResponse_(request, payload);
  } catch (error) {
    return safeStaffAuthErrorResponse_(request, error);
  }
}
