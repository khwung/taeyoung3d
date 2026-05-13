module.exports = async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "PUT only" });
  }

  try {
    const uploadUrl = req.headers["x-upload-url"];
    const start = req.headers["x-start"];
    const end = req.headers["x-end"];
    const total = req.headers["x-total"];
    const mimeType = req.headers["x-mime-type"] || "application/octet-stream";

    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    const googleRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Content-Range": `bytes ${start}-${end}/${total}`,
      },
      body: buffer,
    });

    const text = await googleRes.text();

    if (googleRes.status === 308) {
      return res.status(200).json({
        done: false,
      });
    }

    if (googleRes.ok) {
      let result = null;

      try {
        result = text ? JSON.parse(text) : null;
      } catch (err) {
        result = null;
      }

      return res.status(200).json({
        done: true,
        result,
      });
    }

    return res.status(googleRes.status).json({
      error: text || "Google Drive 업로드 실패",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "chunk upload failed",
    });
  }
};