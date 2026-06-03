const { request, setToken } = require("../../utils/request");
const { syncMeSnapshot } = require("../../utils/quota");

Page({
  data: {
    loading: false
  },

  onShow() {
    const token = wx.getStorageSync("authToken");
    if (token) {
      wx.switchTab({ url: "/pages/index/index" });
    }
  },

  handleWechatLogin() {
    if (this.data.loading) {
      return;
    }
    this.setData({ loading: true });
    this.getLoginCode()
      .then((code) => request({
        url: "/api/auth/wechat/login",
        method: "POST",
        data: { code }
      }))
      .then((res) => {
        setToken(res.token);
        syncMeSnapshot(getApp(), res);
        wx.switchTab({ url: "/pages/index/index" });
      })
      .catch((err) => {
        if (err.errorCode === "LOGIN_LIMIT_EXCEEDED") {
          return;
        }
        wx.showToast({
          title: err.message || "登录失败",
          icon: "none"
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  getLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          if (!loginRes.code) {
            reject(new Error("无法获取微信登录凭证"));
            return;
          }
          resolve(loginRes.code);
        },
        fail: (err) => {
          reject(new Error(`wx.login 调用失败: ${(err && err.errMsg) || "unknown"}`));
        }
      });
    });
  }
});
