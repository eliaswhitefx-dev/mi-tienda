// Entrega el logo de la tienda como imagen normal (para el ícono de la notificación).
const PROJECT = process.env.FB_PROJECT || 'lirios-store-7cf62';
module.exports = async (req, res) => {
  const t = String((req.query && req.query.t) || '');
  const volver = () => { res.statusCode = 302; res.setHeader('Location', '/icon-192.png'); res.end(); };
  if (!/^[A-Za-z0-9_-]{10,60}$/.test(t)) return volver();
  try {
    const r = await fetch('https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/catalogos/' + t + '?mask.fieldPaths=logo').then(r => r.json());
    const v = r && r.fields && r.fields.logo && r.fields.logo.stringValue;
    const m = v && v.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/);
    if (!m) return volver();
    res.statusCode = 200;
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(Buffer.from(m[2], 'base64'));
  } catch (e) { volver(); }
};
