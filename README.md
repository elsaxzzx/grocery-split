# 🛒 买菜分账 Grocery Split

xyd · zxb · zxy 专属分账工具

## 部署到 Vercel（5分钟搞定）

### 第一步：上传到 GitHub

1. 打开 [github.com](https://github.com) 并登录（没有账号就注册一个，免费）
2. 点击右上角 **"+"** → **"New repository"**
3. 取名 `grocery-split`，点 **"Create repository"**
4. 把这个项目文件夹里所有文件上传上去：
   - 点 **"uploading an existing file"**
   - 把整个 `grocery-split` 文件夹里的文件都拖进去
   - 点 **"Commit changes"**

### 第二步：部署到 Vercel

1. 打开 [vercel.com](https://vercel.com) → 用 GitHub 账号登录
2. 点 **"Add New Project"** → 选择 `grocery-split` 仓库
3. 点 **"Deploy"**（Vercel 会自动检测 Vite 项目）

### 第三步：添加 API Key（小票识别功能需要）

1. 在 Vercel 项目页面，点 **"Settings"** → **"Environment Variables"**
2. 添加：
   - Name: `VITE_ANTHROPIC_API_KEY`
   - Value: 你的 Anthropic API Key（`sk-ant-...`）
3. 点 **"Save"**，然后去 **"Deployments"** 重新部署一次

### 完成！

你会得到一个网址，比如 `grocery-split-xxx.vercel.app`

把网址发给 zxb 和 zxy，大家都可以用。

手机上打开网址 → 点「分享」→「添加到主屏幕」→ 就像 App 一样！

---

## 本地运行（可选）

```bash
npm install
npm run dev
```
