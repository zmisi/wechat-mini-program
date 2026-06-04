const DEFAULT_NICKNAME = "微信用户";
const DEFAULT_AVATAR_MARK = "mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg";

const PROFILE_SETUP_KEY = "profileSetupPending";

function needsProfileSetup(user) {
  if (!user) {
    return true;
  }
  const name = (user.nickname || "").trim();
  if (!name || name === DEFAULT_NICKNAME) {
    return true;
  }
  const url = user.avatarUrl || "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return true;
  }
  if (url.includes(DEFAULT_AVATAR_MARK)) {
    return true;
  }
  return false;
}

/** 调起微信官方隐私授权弹窗（允许使用头像、昵称等） */
function requirePrivacyAuthorize() {
  return new Promise((resolve, reject) => {
    if (typeof wx.requirePrivacyAuthorize === "function") {
      wx.requirePrivacyAuthorize({
        success: () => resolve(),
        fail: (err) => reject(err || new Error("未同意隐私协议"))
      });
      return;
    }
    resolve();
  });
}

function openPrivacyContract() {
  if (typeof wx.openPrivacyContract === "function") {
    wx.openPrivacyContract();
  }
}

function markProfileSetupPending() {
  wx.setStorageSync(PROFILE_SETUP_KEY, "1");
}

function clearProfileSetupPending() {
  wx.removeStorageSync(PROFILE_SETUP_KEY);
}

function isProfileSetupPending() {
  return wx.getStorageSync(PROFILE_SETUP_KEY) === "1";
}

module.exports = {
  PROFILE_SETUP_KEY,
  needsProfileSetup,
  requirePrivacyAuthorize,
  openPrivacyContract,
  markProfileSetupPending,
  clearProfileSetupPending,
  isProfileSetupPending
};
