// Envía una notificación a todos los clientes suscritos al catálogo del dueño.
const webpush = require('web-push');
const API_KEY = process.env.FB_API_KEY || 'AIzaSyD3-zBWHuFFXuaL-J6MlgYsBzrRPBDh5gs';
const PROJECT = process.env.FB_PROJECT || 'lirios-store-7cf62';
const DB = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  try {
    const pub = process.env.VAPID_PUBLIC, priv = process.env.VAPID_PRIVATE;
    if (!pub || !priv) return res.status(500).json({ error: 'Faltan las llaves VAPID en Vercel.' });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://mi-tienda-4ith.vercel.app', pub, priv);

    const tk = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!tk) return res.status(401).json({ error: 'No autorizado' });
    // Verifica quién es el dueño con su sesión de Firebase
    const who = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: tk })
    }).then(r => r.json());
    const uid = who && who.users && who.users[0] && who.users[0].localId;
    if (!uid) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.' });

    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const titulo = String(b.titulo || '').slice(0, 60), texto = String(b.texto || '').slice(0, 140);
    let url = String(b.url || '');
    if (!titulo) return res.status(400).json({ error: 'Falta el título' });
    // Si el dueño puso un enlace https (ej. un post de Instagram) se usa; si no, abre su catálogo
    const base = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host);
    try { if (new URL(url).protocol !== 'https:') url = ''; } catch (x) { url = ''; }
    if (!url) url = base + '/catalogo.html?t=' + uid;

    // Lee las suscripciones (con la sesión del dueño: solo él puede)
    const H = { Authorization: 'Bearer ' + tk };
    const subs = []; let pt = '';
    for (let i = 0; i < 5; i++) {
      const r = await fetch(DB + '/avisos/' + uid + '/subs?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H }).then(r => r.json());
      (r.documents || []).forEach(d => { try { subs.push({ name: d.name, s: JSON.parse(d.fields.s.stringValue) }) } catch (e) {} });
      if (!r.nextPageToken) break; pt = r.nextPageToken;
    }
    // Calienta el logo en la red de Vercel para que aparezca de inmediato en el aviso
    await fetch(base + '/api/logo?t=' + uid).catch(() => {});
    const payload = JSON.stringify({ t: titulo, b: texto, u: url, g: 'aviso-' + uid, l: uid, n: String(b.tienda || '').slice(0, 40) });
    let ok = 0, fail = 0, quitados = 0;
    for (let i = 0; i < subs.length; i += 25) {
      await Promise.all(subs.slice(i, i + 25).map(async x => {
        try { await webpush.sendNotification(x.s, payload, { TTL: 86400 }); ok++ }
        catch (e) {
          fail++;
          if (e && (e.statusCode === 404 || e.statusCode === 410)) { // suscripción vencida: se borra
            quitados++; fetch('https://firestore.googleapis.com/v1/' + x.name, { method: 'DELETE', headers: H }).catch(() => {});
          }
        }
      }));
    }
    res.status(200).json({ ok: true, enviados: ok, fallidos: fail, quitados });
  } catch (e) {
    res.status(500).json({ error: 'Error al enviar: ' + String((e && e.message) || e) });
  }
};
