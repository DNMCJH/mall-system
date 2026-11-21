'use strict';

// 登录入参格式校验，供 server.js 调用。
// 用户名：4~20 位字母、数字、下划线；口令：6~20 位字母数字，且必须同时含字母与数字。

const USERNAME_PATTERN = /^[A-Za-z0-9_]{4,20}$/;
const PASSWORD_PATTERN = /^[A-Za-z0-9]{6,20}$/;

function validateUsername(username) {
  if (!USERNAME_PATTERN.test(username)) {
    return '用户名格式不正确';
  }
  return null;
}

function validatePassword(password) {
  if (!PASSWORD_PATTERN.test(password)) {
    return '密码格式不正确';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return '密码格式不正确';
  }
  return null;
}

module.exports = { validateUsername, validatePassword };
