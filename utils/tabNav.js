const PENDING_CONVERSATION_KEY = "pendingConversation";
const TAB_NEW_CHAT_KEY = "tabNewChat";
const CONVERSATION_KEY = "conversationId";

const TAB_INDEX = {
  chats: 0,
  index: 1,
  profile: 2
};

function setTabBarSelected(page, index) {
  if (typeof page.getTabBar === "function" && page.getTabBar()) {
    page.getTabBar().setData({ selected: index });
  }
}

function openConversation(id, title) {
  wx.setStorageSync(PENDING_CONVERSATION_KEY, {
    id,
    title: title || "新对话"
  });
  wx.removeStorageSync(TAB_NEW_CHAT_KEY);
  wx.switchTab({ url: "/pages/index/index" });
}

function startNewChat() {
  wx.removeStorageSync(PENDING_CONVERSATION_KEY);
  wx.removeStorageSync(CONVERSATION_KEY);
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1];
  if (cur && cur.route === "pages/index/index" && typeof cur.resetForNewChat === "function") {
    cur.resetForNewChat();
    setTabBarSelected(cur, TAB_INDEX.index);
    return;
  }
  wx.setStorageSync(TAB_NEW_CHAT_KEY, "1");
  wx.switchTab({ url: "/pages/index/index" });
}

function tabBarHeightPx() {
  const sys = wx.getSystemInfoSync();
  let safeBottom = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0;
  if (!safeBottom && sys.safeArea) {
    safeBottom = Math.max(0, sys.screenHeight - sys.safeArea.bottom);
  }
  const barRpx = 100 * sys.windowWidth / 750;
  return barRpx + safeBottom;
}

/** Viewport-bottom offset (px) to align content above the custom tab bar. */
function measureTabBarTopOffset(page) {
  const fallback = tabBarHeightPx();
  return new Promise((resolve) => {
    if (typeof page.getTabBar !== "function") {
      resolve(fallback);
      return;
    }
    const tabBar = page.getTabBar();
    if (!tabBar) {
      resolve(fallback);
      return;
    }
    wx.createSelectorQuery()
      .in(tabBar)
      .select(".tab-bar")
      .boundingClientRect()
      .exec((res) => {
        const rect = res && res[0];
        if (!rect || !rect.height) {
          resolve(fallback);
          return;
        }
        const sys = wx.getSystemInfoSync();
        resolve(Math.max(Math.ceil(sys.windowHeight - rect.top), fallback));
      });
  });
}

module.exports = {
  PENDING_CONVERSATION_KEY,
  TAB_NEW_CHAT_KEY,
  CONVERSATION_KEY,
  TAB_INDEX,
  setTabBarSelected,
  openConversation,
  startNewChat,
  tabBarHeightPx,
  measureTabBarTopOffset
};
