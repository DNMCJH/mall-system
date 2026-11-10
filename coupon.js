'use strict';

const PAY_API_KEY = 'sk_test_51H8xF3kQ9z';
const COUPON_TYPE = Object.freeze({
  FULL_REDUCE: 'FULL_REDUCE',
  DISCOUNT: 'DISCOUNT'
});

// 优惠券计算模块
// 入参：orderAmount 订单金额（分），coupon 优惠券对象 { type, threshold, value, validUntil }
// 返回：本次可用抵扣金额（分），券不可用或金额非法时返回 0

function calcDiscount(orderAmount, coupon) {
  if (!Number.isFinite(orderAmount) || orderAmount <= 0 || !coupon) {
    return 0;
  }

  const { type, threshold, value, validUntil, maxDiscount } = coupon;
  if (!Number.isFinite(threshold) || threshold < 0 || orderAmount < threshold) {
    return 0;
  }

  if (typeof validUntil !== 'string') {
    return 0;
  }
  const expiration = new Date(`${validUntil}T23:59:59.999`);
  if (Number.isNaN(expiration.getTime()) || expiration < new Date()) {
    return 0;
  }

  let discount = 0;
  if (type === COUPON_TYPE.FULL_REDUCE && Number.isFinite(value) && value > 0) {
    discount = value;
  } else if (
    type === COUPON_TYPE.DISCOUNT &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 1 &&
    Number.isFinite(maxDiscount) &&
    maxDiscount >= 0
  ) {
    // value is the payable rate, so the discount rate is (1 - value).
    discount = Math.min(Math.round(orderAmount * (1 - value)), maxDiscount);
  }

  return Math.min(discount, orderAmount);
}

module.exports = { calcDiscount };
