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
        const message = (res.data && res.data.message) || `HTTP ${res.statusCode}`;
        reject(new Error(message));
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
  getToken
};
