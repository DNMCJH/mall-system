# mall-system

电商促销系统，软件工程课程团队协作演练项目。包含会员登录、优惠券发放与核销、订单结算三个基础模块，当前处于骨架阶段。

## 目录结构

```
mall-system/
├─ server.js          # HTTP 服务入口，路由与静态资源
├─ coupon.js          # 优惠券计算模块（feature/coupon-calc 负责实现）
├─ public/
│  ├─ login.html      # 登录页（用户名 / 密码 / 图形验证码）
│  └─ home.html       # 登录后的工作台
├─ package.json
└─ README.md
```

## 本地运行

```
npm start            # 默认 http://127.0.0.1:3000
npm test             # node --test，单元测试放在 test/ 目录
```

演示账号：`wang / 123456h`。

## 分支规范（GitFlow）

| 分支 | 用途 | 规则 |
| --- | --- | --- |
| main | 生产主干，随时可发布 | 受保护，禁止直接推送，只能通过 PR 合并 |
| develop | 日常集成 | 受保护，默认只能通过 PR 合并 |
| feature/* | 单个需求开发，如 feature/coupon-calc | 从 develop 切出，完成后提 PR |
| release/* | 发版前的版本号修改与回归 | 从 develop 切出，发版后同时合回 main 和 develop |

提交信息约定：`<type>(<scope>): <描述>`，type 取 feat / fix / docs / test / chore。

## 测试约定

业务逻辑改动必须附单元测试，测试文件放 `test/` 目录，命名 `*.test.js`，使用 Node 内置的 `node:test`。
