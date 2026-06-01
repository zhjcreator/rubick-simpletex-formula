# SimpleTex 公式识别 Rubick 插件

一个轻量的 Rubick UI 插件，用 SimpleTex API 快速识别图片中的数学公式，并提供 LaTeX 编辑、预览和复制能力。

## 功能

- 支持 Rubick 图片入口：剪贴板有图片或向 Rubick 粘贴图片时，可直接选择“识别图片公式”。
- 支持在插件窗口内粘贴、拖入或选择图片。
- 支持自动调用 SimpleTex 识别，并显示识别置信度。
- 支持 SimpleTex `latex_ocr_turbo` 和 `latex_ocr` 模型。
- 本地保存 SimpleTex UAT Token 和模型偏好。
- 支持编辑 LaTeX、MathJax 实时预览、复制 LaTeX、Markdown 公式块或 Word MathML。
- 无构建依赖，Rubick 可直接加载 `index.html`。

## 安装调试

在项目目录执行：

```bash
npm link
```

然后打开 Rubick 插件市场的开发者安装入口，填写本插件目录或 npm 包名：

```text
rubick-simpletex-formula
```

如果 Rubick 没有刷新到最新的 `package.json` 命令配置，先卸载旧的开发插件，再重新安装。

## 使用

### 图片快速入口

1. 复制一张包含公式的图片，或把图片粘贴到 Rubick 输入框。
2. 在 Rubick 的图片动作里选择“识别图片公式”。
3. 插件会自动载入图片并开始识别。

### 插件窗口内识别

1. 在 Rubick 中输入 `公式识别`、`latex`、`simpletex` 或 `ocr` 打开插件。
2. 粘贴、拖入或选择一张公式图片。
3. 点击“开始识别”，或直接在粘贴图片后等待自动识别。
4. 编辑识别出的 LaTeX，复制 LaTeX、Markdown 公式块或 Word MathML。

## Word MathML

点击“复制 Word MathML”会把当前 LaTeX 转成 MathML 文本。Microsoft Word 可以把 MathML 转成 Office MathML，并作为可编辑公式插入。

在 Word 中使用：

1. 点击插件里的“复制 Word MathML”。
2. 在 Word 文档中直接粘贴。
3. Word 会把 MathML 转换为可编辑公式。

这个做法参考了 [MathML2Word](https://github.com/scalad/MathML2Word) 的思路：Word 内部可以使用 Office 自带的 `MML2OMML.xsl` 将 MathML 转成 OMML。

## SimpleTex Token

插件默认使用 SimpleTex UAT 鉴权。请在 SimpleTex 用户中心创建用户授权令牌，然后在插件右上角设置中填写 `UAT Token`。

UAT Token 会保存在 Rubick 本地数据库中。SimpleTex 文档说明 UAT 适合开发调试，不建议在公开发布的纯客户端插件中直接暴露。若要面向更多用户发布，建议改为服务端代理或 APP 临时授权令牌。

## 项目结构

```text
.
├── index.html
├── package.json
├── preload.js
├── renderer.js
├── style.css
└── README.md
```

## 开发命令

```bash
npm run lint
```

该命令会对 `preload.js` 和 `renderer.js` 做 Node 语法检查。

## 参考

- Rubick 插件开发文档：https://rubickcenter.github.io/docs/dev/
- Rubick 插件事件 API：https://rubickcenter.github.io/rubick/api/
- SimpleTex 公式识别接口：https://server.simpletex.cn/api/latex_ocr_turbo

## License

MIT
