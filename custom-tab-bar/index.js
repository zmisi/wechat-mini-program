const { startNewChat } = require("../utils/tabNav");

Component({
  data: {
    selected: 1,
    list: [
      "/pages/chats/chats",
      "/pages/index/index",
      "/pages/profile/profile"
    ]
  },

  methods: {
    onSwitch(event) {
      const index = Number(event.currentTarget.dataset.index);
      const url = this.data.list[index];
      if (index === 1) {
        startNewChat();
        return;
      }
      wx.switchTab({ url });
      this.setData({ selected: index });
    }
  }
});
