function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};

    var token = params.token || '';
    var expectedToken = getSecret('GAS_SYNC_TOKEN');

    if (!token || token !== expectedToken) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Unauthorized: Invalid security token'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var preview = params.preview === 'true';
    var action = params.action || 'all';

    // Quick path: invoices proxy (single-purpose for reports)
    if (action === 'invoices') {
      try {
        var from = params.fromPurchaseDate || params.from || '';
        var to = params.toPurchaseDate || params.to || '';
        var pageSize = params.pageSize ? Number(params.pageSize) : undefined;
        var currentItem = params.currentItem ? Number(params.currentItem) : undefined;
        var kiotToken = getCachedKiotVietToken();
        var invoices = getKiotVietInvoicesPayload(kiotToken, from, to, pageSize, currentItem);
        return ContentService
          .createTextOutput(JSON.stringify({ success: true, data: invoices }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService
          .createTextOutput(JSON.stringify({ success: false, error: err && err.message ? err.message : String(err) }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Chuẩn hóa action
    var target = 'all';

    if (action === 'customers') {
      target = 'customers';
    } else if (action === 'warehouse') {
      target = 'warehouse';
    } else if (action === 'all' || action === '') {
      target = 'all';
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Unsupported action: ' + action
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    Logger.log('doGet action=' + action + ', target=' + target + ', preview=' + preview);

    var result = runSyncProcess(preview, target);

    // Debug tạm thời để kiểm tra đúng route
    result.action = action;
    result.target = target;

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error && error.message ? error.message : String(error)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var request = {};
  try {
    request = parseRequestPayload_(e);
  } catch (error) {
    return json_({ success: false, error: error.message });
  }

  var action = request && request.action ? String(request.action) : '';

  // 1. Gửi Email báo cáo
  if (action === 'sendEmail') {
    try {
      var to = request.to;
      var subject = request.subject;
      var body = request.body;
      var htmlBody = request.htmlBody;
      var rawAttachments = request.attachments || [];
      
      // Xử lý chuyển đổi ảnh Base64 hoặc URL HTTP/HTTPS thành file đính kèm thật trong Gmail
      var mailAttachments = [];
      for (var i = 0; i < rawAttachments.length; i++) {
        var file = rawAttachments[i];
        if (file.url) {
          if (file.url.indexOf(";base64,") !== -1) {
            try {
              var parts = file.url.split(";base64,");
              var mimeType = parts[0].split(":")[1] || "image/jpeg";
              var base64Data = parts[1];
              var decoded = Utilities.base64Decode(base64Data);
              var blob = Utilities.newBlob(decoded, mimeType, file.name || ("attachment_" + i + ".jpg"));
              mailAttachments.push(blob);
            } catch(err) {
              // Bỏ qua file lỗi
            }
          } else if (file.url.indexOf("http") === 0) {
            try {
              var resp = UrlFetchApp.fetch(file.url);
              var blob = resp.getBlob();
              if (file.name) {
                blob.setName(file.name);
              } else {
                blob.setName("attachment_" + i + ".jpg");
              }
              mailAttachments.push(blob);
            } catch(err) {
              // Bỏ qua file lỗi
            }
          }
        }
      }

      var mailOptions = {
        to: to,
        subject: subject,
        body: body || "",
        htmlBody: htmlBody || undefined
      };

      if (request.senderName) {
        mailOptions.name = request.senderName;
      }
      
      if (mailAttachments.length > 0) {
        mailOptions.attachments = mailAttachments;
      }
      
      MailApp.sendEmail(mailOptions);
      
      return json_({
        success: true,
        message: "Email sent successfully"
      });
    } catch (error) {
      return json_({
        success: false,
        error: error.message
      });
    }
  }

  // 2. Cập nhật phân quyền tài khoản nhân sự
  if (action === 'staffAuthUpdate') {
    try {
      var payload = handleStaffAuthUpdate_(request);
      return buildStaffAuthResponse_(request, payload);
    } catch (error) {
      return safeStaffAuthErrorResponse_(request, error);
    }
  }

  // 3. Các hành động khác không hỗ trợ
  return json_({
    success: false,
    error: 'Unsupported action: ' + action
  });
}
