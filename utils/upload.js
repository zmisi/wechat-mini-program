const { request } = require("./request");

function isLocalAvatarPath(path) {
  if (!path || typeof path !== "string") {
    return false;
  }
  return (
    path.startsWith("wxfile://")
    || path.startsWith("http://tmp/")
    || path.startsWith("https://tmp/")
    || (!path.startsWith("http://") && !path.startsWith("https://"))
  );
}

function readFileBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: "base64",
      success(res) {
        resolve(res.data || "");
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || "读取头像失败"));
      }
    });
  });
}

/** 走 wx.request，与 API 共用 request 合法域名，无需配置 uploadFile 域名 */
function uploadAvatar(filePath) {
  return readFileBase64(filePath).then((dataBase64) => request({
    url: "/api/auth/avatar/base64",
    method: "POST",
    data: {
      contentType: "image/jpeg",
      dataBase64
    }
  }));
}

module.exports = {
  isLocalAvatarPath,
  uploadAvatar
};
