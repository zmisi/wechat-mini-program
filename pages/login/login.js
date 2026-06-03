const { request, setToken } = require("../../utils/request");

Page({
  data: {
    loading: false
  },

  onShow() {
    const token = wx.getStorageSync("authToken");
    if (token) {
      wx.switchTab({
        url: "/pages/index/index",
        fail: () => {
          wx.redirectTo({ url: "/pages/index/index" });
        }
      });
    }
  },

  handleWechatLogin() {
    if (this.data.loading) {
      return;
    }
    this.setData({ loading: true });
    wx.getUserProfile({
      desc: "用于完善升学咨询账号信息",
      success: (profileRes) => {
        this.getLoginCode()
          .then((code) => request({
            url: "/api/auth/wechat/login",
            method: "POST",
            data: {
              code,
              nickname: (profileRes.userInfo && profileRes.userInfo.nickName) || "",
              avatarUrl: (profileRes.userInfo && profileRes.userInfo.avatarUrl) || "",
              province: (profileRes.userInfo && profileRes.userInfo.province) || "",
              city: (profileRes.userInfo && profileRes.userInfo.city) || "",
              gender: (profileRes.userInfo && profileRes.userInfo.gender) || 0
            }
          }))
          .then((res) => {
            setToken(res.token);
            const app = getApp();
            app.globalData.user = res.user || null;
            wx.redirectTo({ url: "/pages/index/index" });
          })
          .catch((err) => {
            wx.showToast({
              title: err.message || "登录失败",
              icon: "none"
            });
          })
          .finally(() => {
            this.setData({ loading: false });
          });
      },
      fail: (err) => {
        const errMsg = (err && err.errMsg) || "";
        const msg = errMsg.includes("auth deny") || errMsg.includes("deny")
          ? "你已拒绝微信授权，请允许后再登录"
          : `获取微信用户信息失败: ${errMsg || "unknown error"}`;
        wx.showToast({
          title: msg,
          icon: "none"
        });
        this.setData({ loading: false });
      }
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
          const errMsg = (err && err.errMsg) || "";
          reject(new Error(`wx.login 调用失败: ${errMsg || "unknown error"}`));
        }
      });
    });
  }
});
