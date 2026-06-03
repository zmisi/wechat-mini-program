const { request } = require("../../utils/request");

Page({
  data: {
    conversations: [],
    loading: false
  },

  onShow() {
    this.loadConversations();
  },

  loadConversations() {
    this.setData({ loading: true });
    request({ url: "/api/conversations" })
      .then((list) => {
        this.setData({
          conversations: (list || []).map((item) => ({
            id: item.id,
            title: item.title || "新对话",
            updatedAt: formatTime(item.updatedAt)
          })),
          loading: false
        });
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({
          title: err.message || "加载失败",
          icon: "none"
        });
      });
  },

  openChat(event) {
    const { id, title } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/index/index?id=${encodeURIComponent(id)}&title=${encodeURIComponent(title || "新对话")}`
    });
  },

  createChat() {
    request({ url: "/api/conversations", method: "POST" })
      .then((created) => {
        wx.navigateTo({
          url: `/pages/index/index?id=${encodeURIComponent(created.id)}&title=${encodeURIComponent(created.title || "新对话")}`
        });
      })
      .catch((err) => {
        wx.showToast({
          title: err.message || "创建失败",
          icon: "none"
        });
      });
  },

  showActions(event) {
    const { id, title } = event.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ["重命名", "归档", "删除"],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.renameChat(id, title);
        } else if (res.tapIndex === 1) {
          this.archiveChat(id);
        } else if (res.tapIndex === 2) {
          this.deleteChat(id);
        }
      }
    });
  },

  renameChat(id, currentTitle) {
    wx.showModal({
      title: "重命名会话",
      editable: true,
      placeholderText: currentTitle,
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        const nextTitle = (res.content || "").trim();
        if (!nextTitle) {
          wx.showToast({ title: "标题不能为空", icon: "none" });
          return;
        }
        request({
          url: `/api/conversations/${encodeURIComponent(id)}`,
          method: "PATCH",
          data: { title: nextTitle }
        })
          .then(() => this.loadConversations())
          .catch((err) => {
            wx.showToast({ title: err.message || "重命名失败", icon: "none" });
          });
      }
    });
  },

  archiveChat(id) {
    wx.showModal({
      title: "归档会话",
      content: "归档后会话将从列表中隐藏，确认归档？",
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        request({
          url: `/api/conversations/${encodeURIComponent(id)}/archive`,
          method: "POST"
        })
          .then(() => {
            wx.showToast({ title: "已归档", icon: "success" });
            this.loadConversations();
          })
          .catch((err) => {
            wx.showToast({ title: err.message || "归档失败", icon: "none" });
          });
      }
    });
  },

  deleteChat(id) {
    wx.showModal({
      title: "删除会话",
      content: "删除后不可恢复，确认删除？",
      confirmColor: "#e11d48",
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        request({
          url: `/api/conversations/${encodeURIComponent(id)}`,
          method: "DELETE"
        })
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.loadConversations();
          })
          .catch((err) => {
            wx.showToast({ title: err.message || "删除失败", icon: "none" });
          });
      }
    });
  }
});

function formatTime(raw) {
  if (!raw) {
    return "";
  }
  const text = String(raw).replace("T", " ").slice(0, 16);
  return text;
}
