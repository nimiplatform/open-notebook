# Nimi release 1.14.5 — Source Runtime support for Catalog Apps

Updates the frozen public npm dependency to Kit/native 0.19.2. The installed App keeps its published native carrier and can connect to a source-development Runtime when launched through Home. Native peer identity checks and Runtime-owned installed-source, session and App Access admission remain mandatory. Production Runtime trust remains unchanged; invalid source Runtime observations fail closed without fallback. SDK 0.21.0, App Tools 0.12.0 and the existing App business workflows are retained.

# Nimi release 1.14.4

Uses published SDK 0.21.0, Kit 0.19.0 and App Tools 0.12.0 with frozen npm locks. Document/query embedding purposes and shared public speech Job observation are preserved. Fresh build hosts bootstrap uv, use managed Python 3.12 and prepare the pinned SurrealDB binary. Standard file URIs and episode paths work across declared macOS arm64 and Windows x86_64 targets. Signing discovery bounds concurrent file reads while retaining strict signature verification.

Real Desktop-supervised source indexing, grounded chat and generated podcast playback were exercised on macOS. Windows interactive workflows remain NOT-VERIFIED.

# Nimi 开发适配

## 1.14.1

- 修复安装版本的后端启动失败问题。
- 启动失败后等待手动重试，避免反复创建后台进程。
- 保留已有笔记本、模型配置与媒体存储。

## 1.14.0

- 保留 Open Notebook 的资料、笔记、检索、对话、转换和播客工作流。
- 授权、模型配置与 AI 调用接入 Nimi SDK/Kit。
- 向量索引保留 Runtime 的空间标识，避免混用不同模型的向量。
- 当前不向其他 App 或 Agent 注册业务 Integration 操作。

这份记录描述本地开发版本，不代表公开发布或 Catalog 安装验收。
