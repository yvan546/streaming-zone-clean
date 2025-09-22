const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Mémoire des liens temporaires
const links = {};

// Génère un lien unique valable 1 minute et 2 utilisations
app.get('/generate', (req, res) => {
  const token = crypto.randomBytes(8).toString('hex');
  const expiresAt = Date.now() + 60 * 1000; // 1 minute
  links[token] = { expiresAt, uses: 2 };

  const base = `${req.protocol}://${req.get('host')}`;
  res.send(`${base}/watch/${token}`);
});

// Page protégée
app.get('/watch/:token', (req, res) => {
  const token = req.params.token;
  const now = Date.now();
  const link = links[token];

  if (!link || link.expiresAt < now || link.uses <= 0) {
    return res.send('<h1>⛔ Lien expiré ou déjà utilisé</h1>');
  }

  // Consommer une utilisation
  link.uses--;

  res.sendFile(path.join(__dirname, 'watch.html'));
});

// Proxy vers tv.garden
app.use(
  '/tv',
  createProxyMiddleware({
    target: 'https://tv.garden',
    changeOrigin: true,
    pathRewrite: { '^/tv': '' },
    onProxyRes: (proxyRes) => {
      // Supprimer les en-têtes qui bloquent l’iframe
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
    },
  })
);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
