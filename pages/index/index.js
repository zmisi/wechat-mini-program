const { request, clearToken, getToken } = require("../../utils/request");
const { formatGuestHeaderHint, syncMeSnapshot } = require("../../utils/quota");
const { normalizeMessages } = require("../../utils/messageBlocks");
const {
  CONVERSATION_KEY,
  PENDING_CONVERSATION_KEY,
  TAB_NEW_CHAT_KEY,
  TAB_INDEX,
  setTabBarSelected,
  tabBarHeightPx
} = require("../../utils/tabNav");

Page({
  data: {
    conversationId: "",
    chatTitle: "升学问答助手",
    messages: [],
    inputText: "",
    loading: false,
    hasMessages: false,
    scrollIntoView: "",
    scrollHeight: 400,
    nextMsgId: 1,
    roleLabel: "",
    quotaHint: "",
    isAdmin: false
  },

  onLoad(options) {
    this.initScrollHeight();
    if (options.id) {
      const title = options.title ? decodeURIComponent(options.title) : "升学问答助手";
      wx.setStorageSync(CONVERSATION_KEY, options.id);
      this.setData({ conversationId: options.id, chatTitle: title });
      this.loadMessages(options.id);
      return;
    }
    if (options.new === "1") {
      this.resetForNewChat();
    }
  },

  onShow() {
    if (!getToken()) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    setTabBarSelected(this, TAB_INDEX.index);
    this.fetchCurrentUser();
    this.consumeTabNavigation();
  },

  consumeTabNavigation() {
    if (wx.getStorageSync(TAB_NEW_CHAT_KEY)) {
      wx.removeStorageSync(TAB_NEW_CHAT_KEY);
      this.resetForNewChat();
      return;
    }
    const pending = wx.getStorageSync(PENDING_CONVERSATION_KEY);
    if (pending && pending.id) {
      wx.removeStorageSync(PENDING_CONVERSATION_KEY);
      wx.setStorageSync(CONVERSATION_KEY, pending.id);
      this.setData({
        conversationId: pending.id,
        chatTitle: pending.title || "新对话"
      });
      this.loadMessages(pending.id);
    }
  },

  fetchCurrentUser() {
    return request({ url: "/api/auth/me" })
      .then((res) => {
        this.applyMeResponse(res);
      })
      .catch((err) => {
        if (err.relogin) {
          return;
        }
        clearToken();
        wx.redirectTo({ url: "/pages/login/login" });
      });
  },

  applyMeResponse(res) {
    const app = getApp();
    syncMeSnapshot(app, res);
    const role = (res.user && res.user.role) || res.role || "guest";
    const isGuest = role === "guest";
    const roleMap = { admin: "管理员", member: "成员", guest: "访客" };
    const quotaHint = isGuest ? formatGuestHeaderHint(res.quota) : "";
    this.setData({
      roleLabel: roleMap[role] || role,
      quotaHint,
      isAdmin: role === "admin"
    });
  },

  refreshQuota() {
    return request({ url: "/api/auth/me" })
      .then((res) => this.applyMeResponse(res))
      .catch(() => {});
  },

  openAdmin() {
    wx.navigateTo({ url: "/pages/admin/users/users" });
  },

  onReady() {
    this.updateScrollHeight();
  },

  initScrollHeight() {
    const sys = wx.getSystemInfoSync();
    const tabBar = tabBarHeightPx();
    this.setData({ scrollHeight: sys.windowHeight - 180 - tabBar });
  },

  updateScrollHeight() {
    const query = wx.createSelectorQuery().in(this);
    query.select(".top-bar").boundingClientRect();
    query.select(".composer-bottom-bar").boundingClientRect();
    query.exec((res) => {
      const sys = wx.getSystemInfoSync();
      const topBar = (res[0] && res[0].height) || 44;
      const composer = (res[1] && res[1].height) || 100;
      const tabBar = tabBarHeightPx();
      const scrollHeight = Math.max(sys.windowHeight - topBar - composer - tabBar, 200);
      this.setData({ scrollHeight });
    });
  },

  resetForNewChat() {
    this.setData({
      conversationId: "",
      chatTitle: "升学问答助手",
      messages: [],
      inputText: "",
      loading: false,
      hasMessages: false,
      scrollIntoView: "",
      nextMsgId: 1
    });
    wx.removeStorageSync(CONVERSATION_KEY);
  },

  loadMessages(conversationId) {
    request({ url: `/api/conversations/${encodeURIComponent(conversationId)}/messages` })
      .then((rows) => {
        const messages = normalizeMessages(rows);
        this.setData({
          messages,
          hasMessages: messages.length > 0,
          nextMsgId: messages.length + 1
        }, () => {
          this.updateScrollHeight();
          this.scrollToBottom();
        });
      })
      .catch((err) => {
        if (err.relogin) {
          return;
        }
        wx.showToast({ title: err.message || "加载消息失败", icon: "none" });
      });
  },

  onInput(event) {
    this.setData({ inputText: event.detail.value });
  },

  sendMessage() {
    const text = (this.data.inputText || "").trim();
    if (!text || this.data.loading) {
      return;
    }

    const send = (conversationId) => {
      const userMsg = this.appendMessage("user", text);
      this.setData({
        inputText: "",
        loading: true,
        hasMessages: true,
        scrollIntoView: `msg-${userMsg.id}`
      }, () => this.updateScrollHeight());

      request({
        url: `/api/conversations/${encodeURIComponent(conversationId)}/chat`,
        method: "POST",
        data: { message: text },
        timeout: 180000
      })
        .then((res) => {
          const assistantText = (res && res.assistant) || "（无回复内容）";
          const tables = (res && res.tables) || [];
          const assistantMsg = this.appendMessage("assistant", assistantText, tables);
          this.setData({
            loading: false,
            scrollIntoView: `msg-${assistantMsg.id}`
          }, () => this.scrollToBottom());
        })
        .catch((err) => {
          this.setData({ loading: false });
          if (err.relogin) {
            return;
          }
          this.appendMessage("assistant", `请求失败：${err.message || "unknown error"}`);
          wx.showToast({ title: err.message || "发送失败", icon: "none" });
        });
    };

    if (this.data.conversationId) {
      send(this.data.conversationId);
      return;
    }

    request({ url: "/api/conversations", method: "POST" })
      .then((created) => {
        wx.setStorageSync(CONVERSATION_KEY, created.id);
        this.setData({
          conversationId: created.id,
          chatTitle: created.title || "新对话"
        });
        send(created.id);
      })
      .catch((err) => {
        if (err.relogin) {
          return;
        }
        wx.showToast({ title: err.message || "创建会话失败", icon: "none" });
      });
  },

  appendMessage(role, text, tables) {
    const id = this.data.nextMsgId;
    const normalized = normalizeMessages([{
      id,
      role,
      text,
      tables: tables || []
    }])[0];
    this.setData({
      messages: this.data.messages.concat(normalized),
      nextMsgId: id + 1,
      hasMessages: true
    });
    return normalized;
  },

  scrollToBottom() {
    const last = this.data.messages[this.data.messages.length - 1];
    if (last) {
      this.setData({ scrollIntoView: `msg-${last.id}` });
    }
  }
});
