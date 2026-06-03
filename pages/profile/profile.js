const { request, clearToken, getToken } = require("../../utils/request");
const { TAB_INDEX, setTabBarSelected } = require("../../utils/tabNav");
const { syncMeSnapshot } = require("../../utils/quota");
const { isLocalAvatarPath, uploadAvatar } = require("../../utils/upload");

const DEFAULT_AVATAR = "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0";
const DEFAULT_NICKNAME = "微信用户";

const ROLE_MAP = {
  admin: "管理员",
  member: "会员",
  guest: "访客"
};

const STATUS_MAP = {
  active: "正常",
  disabled: "已禁用"
};

Page({
  data: {
    user: {},
    editAvatar: DEFAULT_AVATAR,
    editNickname: DEFAULT_NICKNAME,
    savedNickname: DEFAULT_NICKNAME,
    pendingAvatarPath: "",
    profileDirty: false,
    savingProfile: false,
    roleLabel: "",
    statusLabel: "",
    isGuest: false,
    isAdmin: false,
    quota: { limit: 0, used: 0, remaining: 0 }
  },

  onShow() {
    if (!getToken()) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    setTabBarSelected(this, TAB_INDEX.profile);
    this.loadProfile();
  },

  resolveAvatar(user) {
    const url = user && user.avatarUrl;
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      return url;
    }
    return DEFAULT_AVATAR;
  },

  resolveNickname(user) {
    const name = user && user.nickname;
    if (name && name.trim()) {
      return name.trim();
    }
    return DEFAULT_NICKNAME;
  },

  applyUserToForm(user) {
    const nickname = this.resolveNickname(user);
    const avatar = this.resolveAvatar(user);
    this.setData({
      user: user || {},
      editAvatar: avatar,
      editNickname: nickname,
      savedNickname: nickname,
      pendingAvatarPath: "",
      profileDirty: false
    });
  },

  onChooseAvatar(event) {
    const avatarUrl = event.detail && event.detail.avatarUrl;
    if (!avatarUrl) {
      return;
    }
    this.setData({
      editAvatar: avatarUrl,
      pendingAvatarPath: isLocalAvatarPath(avatarUrl) ? avatarUrl : "",
      profileDirty: true
    });
  },

  onNicknameInput(event) {
    const editNickname = event.detail.value || "";
    this.setData({
      editNickname,
      profileDirty: this.isProfileDirty(editNickname, this.data.pendingAvatarPath)
    });
  },

  onNicknameBlur(event) {
    const editNickname = (event.detail.value || "").trim();
    this.setData({
      editNickname,
      profileDirty: this.isProfileDirty(editNickname, this.data.pendingAvatarPath)
    });
  },

  isProfileDirty(nickname, pendingAvatarPath) {
    const nickChanged = (nickname || "").trim() !== (this.data.savedNickname || "").trim();
    return nickChanged || !!pendingAvatarPath;
  },

  onAvatarError() {
    this.setData({ editAvatar: DEFAULT_AVATAR });
  },

  openAdmin() {
    wx.navigateTo({ url: "/pages/admin/users/users" });
  },

  loadProfile() {
    return request({ url: "/api/auth/me" })
      .then((res) => {
        const user = res.user || {};
        const role = user.role || res.role || "guest";
        const isGuest = role === "guest";
        this.applyUserToForm(user);
        this.setData({
          roleLabel: ROLE_MAP[role] || role,
          statusLabel: STATUS_MAP[user.status] || user.status || "未知",
          isGuest,
          isAdmin: role === "admin",
          quota: res.quota || res.loginQuota || { limit: -1, used: 0, remaining: -1 }
        });
        syncMeSnapshot(getApp(), res);
      })
      .catch((err) => {
        if (err.relogin) {
          return;
        }
        wx.showToast({ title: err.message || "加载失败", icon: "none" });
      });
  },

  saveProfile() {
    const nickname = (this.data.editNickname || "").trim();
    if (!nickname) {
      wx.showToast({ title: "请填写昵称", icon: "none" });
      return;
    }
    if (!this.data.profileDirty) {
      return;
    }

    this.setData({ savingProfile: true });
    const upload = this.data.pendingAvatarPath
      ? uploadAvatar(this.data.pendingAvatarPath)
      : Promise.resolve(null);

    upload
      .then(() => request({
        url: "/api/auth/profile",
        method: "PATCH",
        data: { nickname }
      }))
      .then(() => this.loadProfile())
      .then(() => {
        wx.showToast({ title: "已保存", icon: "success" });
      })
      .catch((err) => {
        if (err.relogin) {
          return;
        }
        wx.showToast({ title: err.message || "保存失败", icon: "none" });
      })
      .finally(() => {
        this.setData({ savingProfile: false });
      });
  },

  handleLogout() {
    wx.showModal({
      title: "退出登录",
      content: "确认退出当前账号？",
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        request({ url: "/api/auth/logout", method: "POST" })
          .catch(() => {})
          .finally(() => {
            clearToken();
            wx.removeStorageSync("conversationId");
            wx.redirectTo({ url: "/pages/login/login" });
          });
      }
    });
  }
});
