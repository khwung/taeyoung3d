const { google } = require("googleapis");

const spreadsheetId = "11cDl6ZDJKOn0EZYSR07wkPvRA9L_Uwv7YNjiZJAwO7M";


module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const {
      inquiry_time,
      name,
      phone,
      email,
      category,
      budget,
      message,
      file_name,
      file_link,
    } = req.body;

    const auth = new google.auth.GoogleAuth({
      keyFile: "./api/google-drive-key.json",
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "A:I",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          inquiry_time || "",
          name || "",
          phone || "",
          email || "",
          category || "",
          budget || "",
          message || "",
          file_name || "",
          file_link || "",
        ]],
      },
    });

    return res.status(200).json({
      ok: true,
    });

  } catch (error) {
    console.error("save-inquiry error:", error);
return res.status(500).json({
  error: "스프레드시트 저장 실패",
  detail: error.message,
  code: error.code,
});
  }
};