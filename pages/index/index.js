const { request, clearToken, getToken } = require("../../utils/request");

const CONVERSATION_KEY = "conversationId";

Page({
  data: {
    conversationId: "",
    chatTitle: "升学咨询",
    messages: [],
    inputText: "",
    loading: false,
    hasMessages: false,
    scrollIntoView: "",
    scrollHeight: 400,
    nextMsgId: 1
  },

  onLoad(options) {
    this.initScrollHeight();
    if (options.id) {
      const title = options.title ? decodeURIComponent(options.title) : "升学咨询";
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
    }
  },

  onReady() {
    this.updateScrollHeight();
  },

  initScrollHeight() {
    const sys = wx.getSystemInfoSync();
    this.setData({ scrollHeight: sys.windowHeight - 180 });
  },

  updateScrollHeight() {
    const query = wx.createSelectorQuery().in(this);
    query.select(".top-bar").boundingClientRect();
    query.select(".composer-bottom-bar").boundingClientRect();
    query.exec((res) => {
      const sys = wx.getSystemInfoSync();
      const topBar = (res[0] && res[0].height) || 44;
      const composer = (res[1] && res[1].height) || 100;
      const scrollHeight = Math.max(sys.windowHeight - topBar - composer, 200);
      this.setData({ scrollHeight });
    });
  },

  openChatList() {
    wx.navigateTo({ url: "/pages/chats/chats" });
  },

  newChat() {
    request({ url: "/api/conversations", method: "POST" })
      .then((created) => {
        wx.setStorageSync(CONVERSATION_KEY, created.id);
        wx.redirectTo({
          url: `/pages/index/index?id=${encodeURIComponent(created.id)}&title=${encodeURIComponent(created.title || "新对话")}`
        });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || "创建失败", icon: "none" });
      });
  },

  resetForNewChat() {
    this.setData({
      conversationId: "",
      chatTitle: "升学咨询",
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
        const messages = (rows || [])
          .filter((row) => row.role === "user" || row.role === "assistant")
          .map((row, index) => ({
            id: row.id || index + 1,
            role: row.role,
            text: row.text || ""
          }));
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
          const assistantMsg = this.appendMessage("assistant", assistantText);
          this.setData({
            loading: false,
            scrollIntoView: `msg-${assistantMsg.id}`
          }, () => this.scrollToBottom());
        })
        .catch((err) => {
          this.setData({ loading: false });
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
        wx.showToast({ title: err.message || "创建会话失败", icon: "none" });
      });
  },

  appendMessage(role, text) {
    const id = this.data.nextMsgId;
    const message = { id, role, text };
    this.setData({
      messages: this.data.messages.concat(message),
      nextMsgId: id + 1,
      hasMessages: true
    });
    return message;
  },

  scrollToBottom() {
    const last = this.data.messages[this.data.messages.length - 1];
    if (last) {
      this.setData({ scrollIntoView: `msg-${last.id}` });
    }
  }
});
