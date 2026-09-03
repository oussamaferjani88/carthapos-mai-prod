const DEFAULT_IMAGE_SETTINGS = { zoom: 1, posX: 50, posY: 50, fit: 'cover' };

export function parseImageSettings(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}
  return null;
}

export function getImageStyle(raw) {
  const s = parseImageSettings(raw);
  if (!s) return { objectFit: 'cover' };
  return {
    objectFit: s.fit || 'cover',
    objectPosition: `${s.posX ?? 50}% ${s.posY ?? 50}%`,
    transform: `scale(${s.zoom || 1})`,
  };
}
