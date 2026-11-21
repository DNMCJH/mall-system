'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateUsername, validatePassword } = require('../auth');

test('合法用户名通过校验', () => {
  for (const name of ['wang', 'zhb_459300', 'Alice2026']) {
    assert.equal(validateUsername(name), null, name);
  }
});

test('用户名过短、带空格或含非法字符时拒绝', () => {
  for (const name of ['wan', ' wang', 'wang ', 'wang-1', '王小明', '']) {
    assert.equal(validateUsername(name), '用户名格式不正确', name);
  }
});

test('合法口令通过校验', () => {
  for (const pwd of ['123456h', '123456H', 'abc123', 'Zx9012']) {
    assert.equal(validatePassword(pwd), null, pwd);
  }
});

test('口令过短、纯数字、纯字母或带空格时拒绝', () => {
  for (const pwd of ['12345', '123456', 'password', ' 123456h', '123456h ', '123 456']) {
    assert.equal(validatePassword(pwd), '密码格式不正确', pwd);
  }
});
