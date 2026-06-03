const TOKEN_KEY = "authToken";

function getApiBaseUrl() {
  const app = getApp();
  return app.globalData.apiBaseUrl;
}

function buildHeaders(options) {
  const headers = Object.assign({
    "Content-Type": "application/json"
  }, options.header || {});

  const token = wx.getStorageSync(TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  if (baseUrl.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  return headers;
}

const RELOGIN_ERROR_CODES = new Set([
  "UNAUTHORIZED",
  "SESSION_IDLE_TIMEOUT",
  "SESSION_EXPIRED",
  "SESSION_REVOKED"
]);

function parseError(res) {
  let data = res.data || {};
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      data = {};
    }
  }
  const errorCode = data.error || "";
  const message = data.message || `HTTP ${res.statusCode}`;
  const err = new Error(message);
  err.errorCode = errorCode;
  err.statusCode = res.statusCode;
  return err;
}

function shouldRelogin(err) {
  return err.statusCode === 401 || RELOGIN_ERROR_CODES.has(err.errorCode);
}

function handleAuthError(err) {
  if (shouldRelogin(err)) {
    clearToken();
    wx.removeStorageSync("conversationId");
    wx.showToast({ title: err.message || "登录已过期，请重新登录", icon: "none" });
    wx.redirectTo({ url: "/pages/login/login" });
    err.relogin = true;
    return true;
  }
  if (err.errorCode === "LOGIN_LIMIT_EXCEEDED" || err.errorCode === "GUEST_QUOTA_EXCEEDED") {
    wx.showModal({
      title: "登录次数已用完",
      content: err.message || "请联系管理员升级为会员",
      showCancel: false
    });
    return true;
  }
  if (err.errorCode === "USER_DISABLED") {
    clearToken();
    wx.removeStorageSync("conversationId");
    wx.showToast({ title: err.message || "账号已禁用", icon: "none" });
    wx.redirectTo({ url: "/pages/login/login" });
    err.relogin = true;
    return true;
  }
  return false;
}

function request(options) {
  const url = `${getApiBaseUrl()}${options.url}`;
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || "GET",
      data: options.data || {},
      header: buildHeaders(options),
      timeout: options.timeout || 60000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        const err = parseError(res);
        handleAuthError(err);
        reject(err);
      },
      fail(err) {
        const errMsg = (err && err.errMsg) || "network error";
        reject(new Error(errMsg.includes("timeout") ? "请求超时，请确认后端和 ngrok 都在运行" : errMsg));
      }
    });
  });
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token);
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY);
}

function getToken() {
  return wx.getStorageSync(TOKEN_KEY);
}

module.exports = {
  request,
  setToken,
  clearToken,
  getToken,
  shouldRelogin
};
