const { request, getToken } = require("../../../utils/request");

const ROLES = ["admin", "member", "guest"];
const STATUSES = ["active", "disabled"];

Page({
  data: {
    loading: false,
    users: []
  },

  onShow() {
    if (!getToken()) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    this.loadUsers();
  },

  loadUsers() {
    this.setData({ loading: true });
    request({ url: "/api/admin/users" })
      .then((users) => {
        this.setData({ users: users || [], loading: false });
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || "加载失败", icon: "none" });
      });
  },

  changeRole(event) {
    const { id, role, status } = event.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ["admin", "member", "guest"],
      success: (res) => {
        const nextRole = ROLES[res.tapIndex];
        request({
          url: `/api/admin/users/${id}`,
          method: "PATCH",
          data: { role: nextRole, status: status || "active" }
        })
          .then(() => {
            wx.showToast({ title: "已更新", icon: "success" });
            this.loadUsers();
          })
          .catch((err) => {
            wx.showToast({ title: err.message || "更新失败", icon: "none" });
          });
      }
    });
  },

  resetQuota(event) {
    const { id, role, status } = event.currentTarget.dataset;
    request({
      url: `/api/admin/users/${id}`,
      method: "PATCH",
      data: { role: role || "guest", status: status || "active", resetGuestQuota: true }
    })
      .then(() => {
        wx.showToast({ title: "配额已重置", icon: "success" });
        this.loadUsers();
      })
      .catch((err) => {
        wx.showToast({ title: err.message || "操作失败", icon: "none" });
      });
  }
});
