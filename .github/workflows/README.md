# 公考每日内容包

这个仓库只干一件事：每天早上把 `pack-src/` 里的内容打包成 `pack.json`，
推到仓库根目录，供手机上的备考 APP 拉取。

## 文件说明

| 路径 | 作用 |
|---|---|
| `pack-src/questions.json` | 新增题目（数组） |
| `pack-src/shizheng.json` | 时政素材（数组） |
| `pack-src/idioms.json` | 成语辨析（数组） |
| `pack-src/notify.json` | 手工指定的推送文案，留 `{}` 即可 |
| `pack-src/meta.json` | 备注信息，一般不用动 |
| `pack.json` | 自动生成，**不要手改** |
| `.github/workflows/daily-pack.yml` | 每天 UTC 21:00（北京 05:00）自动生成 |

## 怎么加内容

编辑 `pack-src/questions.json`，往数组里追加一条，格式：

```json
{
  "id": 991006,
  "mod": "资料分析",
  "diff": 3,
  "exam": "公务员",
  "src": "2024 国考副省级 改编",
  "hot": 0,
  "tier": "中等",
  "q": "题干……",
  "opts": ["选项1", "选项2", "选项3", "选项4"],
  "ans": 0,
  "exp": "解析，至少 8 个字……",
  "alts": [{ "t": "解法二：列方程", "d": "……" }]
}
```

提交后等 1 分钟，Actions 会自动重跑并更新 `pack.json`。
校验不过（选项不是 4 个、答案指向空、解析太短）会直接失败，坏数据进不来。

## 手机端地址

```
https://raw.githubusercontent.com/用户名/仓库名/main/pack.json
```
