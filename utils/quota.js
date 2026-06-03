function formatQuotaLine(label, quota) {
  if (!quota || quota.limit < 0 || quota.remaining < 0) {
    return "";
  }
  const used = quota.used != null ? quota.used : 0;
  const limit = quota.limit != null ? quota.limit : 0;
  const remaining = quota.remaining != null ? quota.remaining : 0;
  return `${label} ${used}/${limit}（剩余 ${remaining}）`;
}

/** 访客额度 = 授权登录次数（与后端 quota 字段一致） */
function formatGuestHeaderHint(quota) {
  const line = formatQuotaLine("登录次数", quota);
  return line ? ` · ${line}` : "";
}

function syncMeSnapshot(app, res) {
  if (!app || !app.globalData) {
    return;
  }
  const quota = res.quota || res.loginQuota || null;
  app.globalData.user = res.user || null;
  app.globalData.quota = quota;
  app.globalData.loginQuota = quota;
  app.globalData.meRole = (res.user && res.user.role) || res.role || "";
}

module.exports = {
  formatQuotaLine,
  formatGuestHeaderHint,
  syncMeSnapshot
};
