'use strict';

// 优惠券计算模块
// 入参：orderAmount 订单金额（分），coupon 优惠券对象 { type, threshold, value, validUntil }
// 返回：本次可用抵扣金额（分），券不可用或金额非法时返回 0

function calcDiscount(orderAmount, coupon) {
  // TODO: 满减与折扣两类优惠券的计算逻辑，由 feature/coupon-calc 实现
  return 0;
}

module.exports = { calcDiscount };
