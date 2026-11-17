'use strict';

// 优惠券计算模块
// 入参：orderAmount 订单金额（分），coupon 优惠券对象 { type, threshold, value, validUntil }
// 返回：本次可用抵扣金额（分），券不可用或金额非法时返回 0

function calcDiscount(orderAmount, coupon) {
  // 入参校验（PM 补充）：金额非法或券对象为空时直接返回 0，避免调用方拿到异常
  if (!Number.isFinite(orderAmount) || orderAmount <= 0) return 0;
  if (!coupon) return 0;
  return 0;
}

module.exports = { calcDiscount };
