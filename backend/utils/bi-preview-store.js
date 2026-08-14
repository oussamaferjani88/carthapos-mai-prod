const fs = require('fs');
const path = require('path');

const PREVIEW_DIR = path.join(__dirname, '..', 'uploads', 'bi-previews');
if (!fs.existsSync(PREVIEW_DIR)) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

function previewPath(uploadId) {
  return path.join(PREVIEW_DIR, `${uploadId}.json`);
}

function loadPreview(uploadId) {
  const p = previewPath(uploadId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function savePreview(uploadId, data) {
  fs.writeFileSync(previewPath(uploadId), JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { loadPreview, savePreview, previewPath, PREVIEW_DIR };
