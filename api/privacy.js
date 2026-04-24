module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FrozeNventory – Privacy Policy</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 680px;
      margin: 0 auto;
      padding: 48px 24px;
      color: #1a1a1a;
      line-height: 1.7;
      background: #fff;
    }
    h1 { font-size: 2rem; margin-bottom: 4px; }
    .updated { color: #888; font-size: 0.9rem; margin-bottom: 40px; }
    h2 { font-size: 1.1rem; margin-top: 36px; margin-bottom: 8px; }
    p { margin: 0 0 16px; }
    a { color: #007aff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="updated">FrozeNventory &nbsp;·&nbsp; Last updated April 2025</p>

  <h2>Image Processing</h2>
  <p>FrozeNventory sends images to a secure server solely for AI-powered item recognition and recipe generation. Images are processed in real-time and are <strong>not stored</strong> on any server.</p>

  <h2>Your Data Stays on Your Device</h2>
  <p>All inventory data — including the items you track — is stored locally on your device. We do not upload, sync, or retain your inventory information.</p>

  <h2>No Personal Data Collected</h2>
  <p>We do not collect, share, or sell any personal data. FrozeNventory does not require you to create an account or provide any personal information to use the app.</p>

  <h2>Subscription & Billing</h2>
  <p>Subscription billing is handled entirely by Apple through the App Store. We do not process or store any payment information.</p>

  <h2>Contact</h2>
  <p>Questions about this policy? Email us at <a href="mailto:dpaulheintz@gmail.com">dpaulheintz@gmail.com</a>.</p>
</body>
</html>`);
};
