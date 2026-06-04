const { ENV, getConfig } = require("./config");

const config = getConfig();

App({
  onLaunch() {
    if (typeof wx.onNeedPrivacyAuthorization === "function") {
      wx.onNeedPrivacyAuthorization((resolve) => {
        wx.showModal({
          title: "隐私授权",
          content: "使用头像、昵称前需同意《用户隐私保护指引》",
          confirmText: "同意",
          cancelText: "拒绝",
          success: (res) => {
            if (res.confirm && resolve) {
              resolve({ event: "agree", buttonId: "agree-btn" });
            } else if (resolve) {
              resolve({ event: "disagree" });
            }
          }
        });
      });
    }
  },

  globalData: {
    env: ENV,
    apiBaseUrl: config.apiBaseUrl,
    user: null,
    quota: null,
    loginQuota: null,
    meRole: ""
  }
});
