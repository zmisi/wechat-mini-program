const ENV = "dev";

const CONFIG_MAP = {
  dev: {
    apiBaseUrl: "https://moodiness-dissuade-strongly.ngrok-free.dev"
  },
  test: {
    apiBaseUrl: "https://test-api.example.com"
  },
  prod: {
    apiBaseUrl: "https://api.example.com"
  }
};

function getConfig() {
  return Object.assign({ env: ENV }, CONFIG_MAP[ENV] || CONFIG_MAP.dev);
}

module.exports = {
  ENV,
  getConfig
};
