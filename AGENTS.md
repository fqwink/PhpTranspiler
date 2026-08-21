# AGENTS.md

## 作業開始時の必須確認

- すべての作業開始時に、必ずこの `AGENTS.md` を読むこと。
- このリポジトリは `PhpTranspiler` の開発正本・仕様正本・公開配布リポジトリとして扱うこと。
- 仕様・設計の正本は `Docs/Project_Charter` とする。
- ドキュメント索引は `Docs/Document_Index`、変更履歴は `Docs/Change_History`、生成PHP規則は `Docs/GENERATED_PHP_STANDARD.md` とする。
- Adlaire Ecosystem全体との境界は、`Adlaire-Docs/Document_Charter` および `Adlaire-Docs/Common_Documents/Adlaire_Ecosystem_Charter` を参照すること。

## リポジトリ構成

- `src/`: PhpTranspiler本体
- `tests/`: golden/error test
- `node-fallback/`: 専用Docker/Denoが使えない場合の開発・検査用フォールバック
- `Docs/`: 仕様・設計、ドキュメント索引、変更履歴、生成PHP規則
- `VERSION`: PhpTranspiler安定版バージョン
- `deno.json`: Denoタスク定義
- `LICENSE`: ライセンス本文

## 基本方針

- 実行ランタイムはDenoのみとすること。
- Node.jsは、専用Docker/Denoが使えない場合の開発・ビルド・テスト用途フォールバックに限ること。
- Node.js/npm依存物(`package.json`、`package-lock.json`、`node_modules`、`tsconfig.json`)を追加しないこと。
- ドキュメントフォルダ名は `Docs/` とし、`Documents/` は作成しないこと。
- 生成PHPは `Docs/GENERATED_PHP_STANDARD.md` に従うこと。
