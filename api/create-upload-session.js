const { google } = require("googleapis");

const rootFolderId = "1eX1np6Fx6t3bHJ9ROl2zaqsE1W9DCLxS";

function getKoreaMonthFolderName() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

async function getOrCreateMonthlyFolder(drive, folderName) {
  const listRes = await drive.files.list({
    q: `'${rootFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    return listRes.data.files[0].id;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    },
    fields: "id",
  });

  return createRes.data.id;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { fileName, mimeType } = req.body;

    const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const drive = google.drive({ version: "v3", auth: client });

    const monthFolderName = getKoreaMonthFolderName();
    const monthFolderId = await getOrCreateMonthlyFolder(drive, monthFolderName);

    const createRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [monthFolderId],
        mimeType: mimeType || "application/octet-stream",
      },
      fields: "id, webViewLink",
    });

    const fileId = createRes.data.id;

    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType || "application/octet-stream",
        },
      }
    );

    const uploadUrl = response.headers.get("location");

    if (!uploadUrl) {
      return res.status(500).json({ error: "업로드 주소 생성 실패" });
    }

    return res.status(200).json({
      uploadUrl,
      fileId,
      fileLink: `https://drive.google.com/file/d/${fileId}/view`,
      folderName: monthFolderName,
      folderId: monthFolderId,
    });

  } catch (error) {
    console.error("create-upload-session error:", error);
    return res.status(500).json({ error: "서버 오류" });
  }
};