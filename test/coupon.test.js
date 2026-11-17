'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calcDiscount } = require('../coupon');

const FUTURE_DATE = '2999-12-31';
const EXPIRED_DATE = '2000-01-01';

test('满减券达到门槛时抵扣面额', () => {
  const coupon = {
    type: 'FULL_REDUCE',
    threshold: 5000,
    value: 1000,
    validUntil: FUTURE_DATE
  };

  assert.equal(calcDiscount(8000, coupon), 1000);
});

test('订单未达到门槛时不抵扣', () => {
  const coupon = {
    type: 'FULL_REDUCE',
    threshold: 5000,
    value: 1000,
    validUntil: FUTURE_DATE
  };

  assert.equal(calcDiscount(4999, coupon), 0);
});

test('折扣券按应付比例计算抵扣金额', () => {
  const coupon = {
    type: 'DISCOUNT',
    threshold: 0,
    value: 0.8,
    maxDiscount: 5000,
    validUntil: FUTURE_DATE
  };

  assert.equal(calcDiscount(10000, coupon), 2000);
});

test('折扣券抵扣金额不超过单笔上限', () => {
  const coupon = {
    type: 'DISCOUNT',
    threshold: 0,
    value: 0.5,
    maxDiscount: 1500,
    validUntil: FUTURE_DATE
  };

  assert.equal(calcDiscount(10000, coupon), 1500);
});

test('已过期优惠券不抵扣', () => {
  const coupon = {
    type: 'FULL_REDUCE',
    threshold: 0,
    value: 500,
    validUntil: EXPIRED_DATE
  };

  assert.equal(calcDiscount(10000, coupon), 0);
});

test('非法金额或空券对象返回零且不抛异常', () => {
  assert.doesNotThrow(() => calcDiscount('10000', null));
  assert.equal(calcDiscount('10000', null), 0);
  assert.equal(calcDiscount(-1, {}), 0);
});
