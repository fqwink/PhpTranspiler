# PhpTranspiler

PhpTranspilerは、Adlaire EcosystemのTypeScriptからPHPへの変換を担当する独立ビルドツールである。

実装正本はTypeScriptとし、実行ランタイムはDenoのみとする。Node.js、npm、package-lockファイル、CDN依存は通常の実行ランタイムおよび依存物として使用しない。

ローカル検査はDenoで実行する。Adlaire-Ecosystem側のServerFoundation生成検査から利用する場合は、`PHPTRANSPILER_ROOT` または隣接ディレクトリ `../PhpTranspiler` として本リポジトリを参照する。

専用Dockerビルドツールを使用できない場合に限り、依存なしNode.jsフォールバックでゴールデンテストを実行できる。この経路は開発、ビルド、テスト用途に限定する。Node.jsおよびnpm依存物をリリースパッケージまたは利用者実行ファイルに含めてはならない。

## 構成

- `VERSION`: PhpTranspilerバージョン。
- `deno.json`: Denoタスク定義。
- `src/main.ts`: CLIおよびトランスパイラ実装。
- `tests/run-golden.ts`: ゴールデンテストおよび非対応入力テストのランナー。
- `tests/golden/`: 固定TypeScript入力と期待PHP出力のペア。
- `tests/errors/`: 固定非対応TypeScript入力と期待エラーのペア。
- `Docs/`: 仕様・設計、変更履歴、生成PHP規則を管理するドキュメント領域。

## 対応範囲

PhpTranspiler pt.0.59は、PHP 8.4以降の安全・安定サブセットを対象とする。PHP 8.5以降で非推奨・廃止・高リスクとなる構文/APIは生成しない。PHP標準ライブラリは、Adlaire実装で必要なものだけを `Php.*` helperとして明示許可する。

- exportされたclass、interface、implements、top-level function、constructor、型付きpublic/private/protected method、static method、readonly property
- ServerFoundation本体2ファイル移行向けのPHPファイルディレクティブ: `declare(strict_types=1)`、`namespace`、`use`、定数未定義時のBootstrap実行入口
- scalar型、配列型、`Array<T>`、単純union/null型、`never`からPHP 8.4構文への型変換
- optional parameterからnullable PHP parameterへの変換、default parameterからPHP default parameterへの変換
- constructor parameter property、`static readonly` class constant、`Class.CONST`、`this.service.method()`、`(new Class(args)).method(args)` の変換
- ローカル `const` / `let` 宣言、配列/オブジェクト分割代入、単純代入、複合代入、配列/連想配列indexアクセス、object風プロパティアクセス、return文、throw文、`if`、`while`、`switch` / `case` / `default`、`break`、`continue`、基本 `for`、式を対象にできる `for ... of` / `for ... in`
- 式文としてのメソッド呼び出し、`this` メソッド呼び出し、クラスstatic呼び出し、単純関数呼び出し、`try` / `catch(Throwable)` / `finally`、変数なし `catch` を含む制御フロー、`delete` による連想配列/プロパティ削除
- template literal、`this.` 参照、optional chaining、null coalescing、三項演算子、`typeof` type guard、`instanceof`、`undefined`、`Error`、`catch`
- 単純な配列リテラルおよびquoted key/shorthand propertyを含むオブジェクトリテラル、配列/オブジェクトspread、runtime不要なtype aliasの消去
- 選択対応するcollection helper: `length`、`includes`、`join`、`slice`、`push`、単純 `map`、単純 `filter`、単純 `forEach`、単一式predicateの `some` / `every` / `find` / `findIndex`、単純 `reduce`、単純 `sort`、typed arrow callback、単純block arrow callback、`order`差分、spaceship、`localeCompare`、`version_compare` / `strcmp` を含む `usort` comparator
- 選択対応するstring helper: `trim`、`toUpperCase`、`toLowerCase`、`split`、`slice`、`replace`、`startsWith`、`endsWith`、単純 `trim().toUpperCase()` / `trim().toLowerCase()` chain
- 選択対応する `Math` helper、`Date.now` / `Date.parse`、`JSON.stringify` / `JSON.parse`、`Object.keys` / `Object.values` / `Object.entries`、`Array.isArray`、`Number.isInteger` / `Number.isFinite`、`String()` / `Number()` / `Boolean()` / `parseInt()` / `parseFloat()`
- ServerFoundation移行向けの `Php.*` helper: file/session/password/hash/path/time/json error/ini/cookie、SQLite既定DB向けPDO/sqlite3拡張、`$_SERVER` / `$_POST` / `$_SESSION` / `$_FILES`、HTTP header、JSON response、入力型判定、明示cast、URL/email検証、HTMLエスケープ、ファイル/ディレクトリ操作、`FilesystemIterator` 巡回、iterator object method、ファイル存在/読み書き可否/サイズ/mtime確認、アップロード移動、アップロードファイル判定、glob、`preg_match` / `preg_replace`、`in_array`、`rawurlencode`、文字列長・大文字化・小文字化・分割、`mb_trim` 系、`BcMath\Number`、PHP 8.4追加のBC Math関数、`fpow`、`array_all` / `array_any` / `array_find` / `array_find_key`、`grapheme_str_split`、DBA/ODBC/DOM/Intl/PCNTL/PGSQL/SPL/SOAP/Tidy/XMLReader/XMLWriter/XSL生成、DOM CSS selector/classList操作、Deprecated/RequestParseBodyException/StreamBucket生成、Reflection追加メソッド、Reflection lazy object API、ReflectionProperty hook API、PropertyHookType、PHP 8.4追加定数、配列unique/search/value整形、`bin2hex` / `random_bytes`、複数キーとthrow armを含むmatch値分岐、InvalidArgumentException/LogicException/RuntimeException/DomainException/UnexpectedValueException throw、isset/empty、配列整形、クエリ生成、HTTP最終レスポンスヘッダー取得/クリア、バージョン比較、DateTime/DateTimeImmutable、ZipArchive、cURL系、OpenSSL鍵/署名/検証、Argon2 provider定数、LDAP TLS 1.3定数、IntlChar/IntlDateFormatter/NumberFormatter追加定数、Sodium AEGIS定数/keygen/encrypt/decrypt、XSLTProcessor最大テンプレート深度/変数プロパティ、PDO/SQLite3系、`PDO::connect()`、`Pdo\Sqlite` / `Pdo\Mysql` / `Pdo\Pgsql` / `Pdo\Odbc` / `Pdo\DbLib` / `Pdo\Firebird`、`Pcntl\QosClass`、`RoundingMode`、`Dom\HTMLDocument` / `Dom\XMLDocument`、`Deprecated`、`RequestParseBodyException`、`Dba\Connection`、`Odbc\Connection` / `Odbc\Result`、`Soap\Url` / `Soap\Sdl`、`StreamBucket`、`ReflectionConstant`生成/参照、`ZipArchive::ER_TRUNCATED_ZIP` のPHP標準機能への変換

非対応TypeScript構文は、PHP生成前にビルドエラーにしなければならない。テストランナーは、ゴールデンPHP出力、ディレクトリ/プロジェクト入力出力、PHP構文、クラス重複拒否、非対応入力の期待失敗ケースを検証する。

生成PHPはファイル書き込み前に、`Docs/GENERATED_PHP_STANDARD.md` に基づいて監査する。未変換TypeScript断片、危険PHP関数、可変変数、変数関数呼び出し、動的include/require、PHP 8.4/8.5非推奨生成物、閉じPHPタグ、CRLF、タブ、末尾空白が残った場合はビルドエラーとする。これにより、非対応入力が壊れたリリース成果物を静かに生成することを防ぐ。

## コマンド

```sh
deno task test
deno task transpile -- --input <input-file-or-directory> --out <output-directory>
```

Adlaire-Ecosystem側のビルドスクリプト経由で実行する場合、テストタスクは専用build-toolsイメージ内のPHP 8.4で生成PHPに対して `php -l` も実行する。

Denoまたは専用Dockerがなく、Node.jsが利用できる場合:

```sh
node node-fallback/run-golden.mjs
```

Adlaire-Ecosystem側から明示的に参照する場合:

```sh
cd /path/to/Adlaire-Ecosystem
PHPTRANSPILER_ROOT=/path/to/PhpTranspiler sh Tools/build/check-phptranspiler.sh
```
