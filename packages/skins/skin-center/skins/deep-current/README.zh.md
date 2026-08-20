# 深流（Deep Current）

[English](README.md) | 中文

深流为 dsh web GUI 注入海洋观测站气质：深海墨绿侧栏围住珍珠色工作区，安静的等深线聚拢在输入区周围。

## 能力

- **分层深度配色**：亮色主题以深色侧栏搭配珍珠画布；暗色主题整体下潜为低亮度深海配色。
- **等深线标志**：静态等深线与柔和洋流带集中在输入区周围，不会在消息正文下方持续运动。
- **最小结构补丁**：完整界面主要由 token 重映射承载，少量 CSS 补丁只使用结构数据、语义数据和 ARIA 属性；不含哈希类选择器或脚本。

## 安装

深流随 @linxin666/dsh-client-ui-skin-center 内置发布。安装皮肤中心，打开「设置 → 皮肤中心」，即可试穿或应用「深流」。

~~~sh
dsh plugin --profile web add @linxin666/dsh-client-ui-skin-center
~~~

## 配置

皮肤自动跟随 GUI 的亮暗主题，没有自己的配置项。皮肤中心总开关与全局背景控制仍然可用。

## 预览

~~~sh
node scripts/gallery-build
open gallery/preview.html?skin=deep-current&theme=light
open gallery/preview.html?skin=deep-current&theme=dark
node scripts/capture-previews deep-current
~~~

## 已知限制

- 纯呈现层：只改变浏览器样式，不触及模型请求或已存数据。
- 分色侧栏与输入区处理使用皮肤中心披露的高敏感 CSS 补丁入口，但范围仅限稳定的结构与语义属性。
