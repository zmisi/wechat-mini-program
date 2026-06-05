const { request, clearToken, getToken } = require("../../utils/request");
const { formatGuestHeaderHint, syncMeSnapshot } = require("../../utils/quota");
const { normalizeMessages } = require("../../utils/messageBlocks");
const {
  CONVERSATION_KEY,
  PENDING_CONVERSATION_KEY,
  TAB_NEW_CHAT_KEY,
  TAB_INDEX,
  setTabBarSelected,
  tabBarHeightPx,
  measureTabBarTopOffset
} = require("../../utils/tabNav");

Page({
  data: {
    conversationId: "",
    chatTitle: "随手查升学",
    messages: [],
    inputText: "",
    loading: false,
    hasMessages: false,
    scrollIntoView: "",
    scrollHeight: 400,
    composerBottom: 50,
    keyboardHeight: 0,
    nextMsgId: 1,
    roleLabel: "",
    quotaHint: "",
    isAdmin: false
  },

  onLoad(options) {
    this.initComposerBottom();
    this.bindKeyboardHeightListener();
    this.initScrollHeight();
    if (options.id) {
      const title = options.title ? decodeURIComponent(options.title) : "随手查升学";
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
    this.initComposerBottom();
    wx.nextTick(() => this.updateScrollHeight());
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
    this.initComposerBottom();
    this.updateScrollHeight();
  },

  onUnload() {
    if (this.keyboardHeightHandler) {
      wx.offKeyboardHeightChange(this.keyboardHeightHandler);
    }
  },

  bindKeyboardHeightListener() {
    this.keyboardHeightHandler = (res) => {
      this.applyKeyboardHeight(res.height || 0);
    };
    wx.onKeyboardHeightChange(this.keyboardHeightHandler);
  },

  initComposerBottom() {
    measureTabBarTopOffset(this).then((bottom) => {
      if (this.data.keyboardHeight > 0) {
        return;
      }
      this.setData({ composerBottom: bottom }, () => this.updateScrollHeight());
    });
  },

  applyKeyboardHeight(keyboardHeight) {
    if (!this.data.hasMessages) {
      this.setData({ keyboardHeight });
      return;
    }
    if (keyboardHeight > 0) {
      this.setData({ keyboardHeight, composerBottom: keyboardHeight }, () => this.updateScrollHeight());
      return;
    }
    measureTabBarTopOffset(this).then((bottom) => {
      this.setData({ keyboardHeight: 0, composerBottom: bottom }, () => this.updateScrollHeight());
    });
  },

  initScrollHeight() {
    const sys = wx.getSystemInfoSync();
    const tabBar = tabBarHeightPx();
    this.setData({ scrollHeight: sys.windowHeight - 180 - tabBar });
  },

  updateScrollHeight() {
    if (!this.data.hasMessages) {
      return;
    }
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select(".top-bar").boundingClientRect();
      query.select(".composer-bottom-bar").boundingClientRect();
      query.exec((res) => {
        const sys = wx.getSystemInfoSync();
        const topBar = (res[0] && res[0].height) || 44;
        const composer = (res[1] && res[1].height) || 88;
        const bottomInset = this.data.composerBottom || tabBarHeightPx();
        const scrollHeight = Math.max(
          sys.windowHeight - topBar - composer - bottomInset,
          200
        );
        this.setData({ scrollHeight });
      });
    });
  },

  resetForNewChat() {
    this.setData({
      conversationId: "",
      chatTitle: "随手查升学",
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
      }, () => {
        this.initComposerBottom();
        this.updateScrollHeight();
      });

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
  },

  toggleSchoolExpand(event) {
    const { msgId, tableId, groupId } = event.currentTarget.dataset;
    const parsedMsgId = Number(msgId);
    const messages = this.data.messages.map((message) => {
      if (message.id !== parsedMsgId) {
        return message;
      }
      return {
        ...message,
        tables: message.tables.map((table) => {
          if (table.id !== tableId) {
            return table;
          }
          return {
            ...table,
            groups: table.groups.map((group) => {
              if (group.id !== groupId) {
                return group;
              }
              return {
                ...group,
                expanded: !group.expanded
              };
            })
          };
        })
      };
    });
    this.setData({ messages });
  }
});
