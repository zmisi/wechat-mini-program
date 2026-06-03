const { ENV, getConfig } = require("./config");

const config = getConfig();

App({
  globalData: {
    env: ENV,
    apiBaseUrl: config.apiBaseUrl,
    user: null
  }
});
