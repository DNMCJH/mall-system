'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { calcDiscount } = require('./coupon');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
const CAPTCHA_TTL = 5 * 60 * 1000;

// 演示账号。生产环境应存数据库并以 scrypt 加盐哈希保存
const USERS = new Map([
  ['wang', { password: '123456h', name: '王小明' }],
]);

// 已发放的优惠券。value 在满减券上是面额（分），在折扣券上是折后比例
const COUPONS = new Map([
  ['FULL100', { code: 'FULL100', type: 'FULL_REDUCE', threshold: 10000, value: 1000, validUntil: '2026-12-31' }],
  ['FULL50', { code: 'FULL50', type: 'FULL_REDUCE', threshold: 5000, value: 500, validUntil: '2026-12-31' }],
  ['DISC90', { code: 'DISC90', type: 'DISCOUNT', threshold: 0, value: 0.9, maxDiscount: 5000, validUntil: '2026-12-31' }],
  ['EXPIRE10', { code: 'EXPIRE10', type: 'FULL_REDUCE', threshold: 1000, value: 100, validUntil: '2025-01-01' }],
]);

const sessions = new Map();
const captchas = new Map();
const attempts = new Map();

function randomSid() {
  return crypto.randomBytes(12).toString('hex');
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(payload));
}

function sendFile(res, name, type) {
  fs.readFile(path.join(PUBLIC_DIR, name), (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(buf);
  });
}

function captchaSvg(code) {
  const glyphs = code.split('').map((ch, i) => {
    const x = 20 + i * 26;
    const rotate = i % 2 === 0 ? 6 : -6;
    return `<text x="${x}" y="33" font-size="28" font-family="Consolas" fill="#2b2b2b" transform="rotate(${rotate} ${x} 29)">${ch}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="44" viewBox="0 0 120 44">` +
    '<rect width="120" height="44" fill="#f2f2f2"/>' + glyphs +
    '<path d="M4 39 L116 7" stroke="#9aa0a6" stroke-width="1"/>' +
    '<path d="M6 9 L114 37" stroke="#c4c4c4" stroke-width="1"/></svg>';
}

function handleCaptcha(req, res) {
  const cookies = parseCookies(req);
  let sid = cookies.sid;
  const headers = { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store' };
  if (!sid) {
    sid = randomSid();
    headers['Set-Cookie'] = `sid=${sid}; Path=/; SameSite=Lax`;
  }
  const code = String(Math.floor(1000 + Math.random() * 9000));
  captchas.set(sid, { code, expiresAt: Date.now() + CAPTCHA_TTL });
  res.writeHead(200, headers);
  res.end(captchaSvg(code));
}

async function handleLogin(req, res) {
  const sid = parseCookies(req).sid || '';
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, message: '请求格式错误' });
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const captcha = typeof body.captcha === 'string' ? body.captcha : '';

  if (!username) return sendJson(res, 400, { ok: false, message: '请输入用户名' });
  if (!password) return sendJson(res, 400, { ok: false, message: '请输入密码' });
  if (!captcha) return sendJson(res, 400, { ok: false, message: '请输入验证码' });

  const cap = captchas.get(sid);
  if (!cap || Date.now() > cap.expiresAt) {
    return sendJson(res, 400, { ok: false, message: '验证码已失效，请点击图片刷新' });
  }
  if (cap.code !== captcha.trim()) {
    return sendJson(res, 400, { ok: false, message: '验证码不正确' });
  }

  const key = username.toLowerCase();
  const state = attempts.get(key) || { failed: 0, lockedUntil: 0 };
  if (state.lockedUntil > Date.now()) {
    return sendJson(res, 423, { ok: false, message: '账号已被锁定，请15分钟后再试' });
  }

  const user = USERS.get(key);
  if (!user || user.password !== password.trim()) {
    if (user) {
      state.failed += 1;
      if (state.failed >= MAX_FAILED) {
        state.lockedUntil = Date.now() + LOCK_MS;
        state.failed = 0;
        attempts.set(key, state);
        return sendJson(res, 401, { ok: false, message: '密码错误，您已经被锁定，请15分钟后再试' });
      }
      attempts.set(key, state);
      return sendJson(res, 401, { ok: false, message: `密码错误，还可以尝试${MAX_FAILED - state.failed}次` });
    }
    return sendJson(res, 401, { ok: false, message: '用户名或密码错误' });
  }

  attempts.set(key, { failed: 0, lockedUntil: 0 });
  sessions.set(sid, key);
  sendJson(res, 200, { ok: true, user: user.name, message: '登录成功' });
}

async function handleCoupon(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, message: '请求格式错误' });
  }
  const amount = Number(body.amount);
  const code = body.coupon && body.coupon.code;
  const coupon = COUPONS.get(code);
  if (!coupon) return sendJson(res, 404, { ok: false, message: '优惠券不存在' });
  if (!Number.isFinite(amount) || amount <= 0) {
    return sendJson(res, 400, { ok: false, message: '订单金额不合法' });
  }
  const discount = calcDiscount(amount, coupon);
  sendJson(res, 200, { ok: true, amount, discount, payable: amount - discount });
}

const routes = {
  'GET /captcha.svg': handleCaptcha,
  'POST /api/login': handleLogin,
  'POST /api/coupon': handleCoupon,
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const handler = routes[`${req.method} ${url.pathname}`];
  if (handler) return handler(req, res);

  if (req.method === 'GET') {
    if (url.pathname === '/' || url.pathname === '/login.html') {
      return sendFile(res, 'login.html', 'text/html; charset=utf-8');
    }
    if (url.pathname === '/home') {
      const sid = parseCookies(req).sid || '';
      if (!sessions.has(sid)) {
        res.writeHead(302, { Location: '/login.html' });
        return res.end();
      }
      return sendFile(res, 'home.html', 'text/html; charset=utf-8');
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`mall-system listening on http://127.0.0.1:${PORT}`);
  });
}

module.exports = { server, calcDiscount };
