type CliOptions = {
  input: string;
  out: string;
  version: string;
};

type SourceFile = {
  path: string;
  relativePath: string;
  text: string;
};

const DEFAULT_VERSION = "pt.0.59";

const unsupportedPatterns: Array<[RegExp, string]> = [
  [/\basync\b/, "async"],
  [/\bawait\b/, "await"],
  [/\bPromise\b/, "Promise"],
  [/@[A-Za-z_][A-Za-z0-9_]*/, "decorator"],
  [/\bimport\s*\(/, "dynamic import"],
  [/\beval\s*\(/, "eval"],
  [/\bFunction\s*\(/, "Function constructor"],
  [/\bProxy\b/, "Proxy"],
  [/\bReflect\b/, "Reflect"],
  [/\bwith\s*\(/, "with"],
  [/\bas\s+[A-Za-z_][A-Za-z0-9_]*/, "type assertion"],
  [/\bexport\s+default\b/, "export default"],
  [/\benum\s+[A-Za-z_][A-Za-z0-9_]*/, "enum"],
  [/#[A-Za-z_][A-Za-z0-9_]*/, "private field"],
  [/\?\.\s*\(/, "optional call"],
  [/\b[A-Za-z_][A-Za-z0-9_]*\s*\[[^\]\n]+\]\s*\(/, "dynamic function call"],
  [/\?\?=|\|\|=|&&=/, "logical assignment"],
];

const allowedMethodCalls = new Set([
  "map",
  "filter",
  "forEach",
  "push",
  "includes",
  "join",
  "slice",
  "split",
  "trim",
  "toUpperCase",
  "toLowerCase",
  "replace",
  "startsWith",
  "endsWith",
  "floor",
  "ceil",
  "round",
  "max",
  "min",
  "abs",
  "stringify",
  "parse",
  "keys",
  "values",
  "entries",
  "isArray",
  "isInteger",
  "isFinite",
  "absPath",
  "arrayAll",
  "arrayAny",
  "arrayAppend",
  "arraySet",
  "arrayKeyExists",
  "arrayDiff",
  "arrayFind",
  "arrayFindKey",
  "arrayMerge",
  "arraySearch",
  "arrayUnique",
  "arrayValues",
  "bcCeil",
  "bcDivmod",
  "bcFloor",
  "bcNumber",
  "bcRound",
  "basename",
  "bin2hex",
  "base64Encode",
  "base64Decode",
  "chmod",
  "copy",
  "count",
  "curlClose",
  "curlError",
  "curlErrno",
  "curlExec",
  "curlGetinfo",
  "curlInit",
  "curlSetopt",
  "curlPostTransferTimeInfo",
  "curlDebugFunctionOption",
  "curlHeaderInInfo",
  "curlHttpVersion3Only",
  "curlPrereqFunctionOption",
  "curlSslDataInInfo",
  "curlSslDataOutInfo",
  "curlTcpKeepCountOption",
  "curlServerResponseTimeoutOption",
  "curlVersion",
  "curlSetoptArray",
  "ctypeDigit",
  "date",
  "dateFormat",
  "dateTime",
  "dateTimeImmutable",
  "dateTimeImmutableFromTimestamp",
  "dateTimeFromTimestamp",
  "dateMicrosecond",
  "dateSetMicrosecond",
  "dateTimestamp",
  "deprecatedAttribute",
  "dbaClose",
  "dbaDelete",
  "dbaExists",
  "dbaFetch",
  "dbaFirstKey",
  "dbaInsert",
  "dbaNextKey",
  "dbaOpen",
  "dbaPopen",
  "dbaReplace",
  "dbaSync",
  "dirname",
  "domHtmlDocumentFromFile",
  "domHtmlDocumentFromString",
  "domNodeCompareDocumentPosition",
  "domDocumentPositionContainedBy",
  "domDocumentPositionContains",
  "domDocumentPositionDisconnected",
  "domDocumentPositionFollowing",
  "domDocumentPositionPreceding",
  "domElementClassList",
  "domParentNodeQuerySelector",
  "domParentNodeQuerySelectorAll",
  "domTokenListContains",
  "domXmlDocumentFromFile",
  "domXmlDocumentFromString",
  "domXPathQuote",
  "domXPathRegisterPhpFunctionNS",
  "escapeHtml",
  "echo",
  "exit",
  "clearStatCache",
  "fileExists",
  "fileMTime",
  "fileGetContents",
  "filePutContents",
  "files",
  "filterVar",
  "filesystemIterator",
  "fpow",
  "explode",
  "get",
  "getenv",
  "gmdate",
  "gzinflate",
  "glob",
  "graphemeStrSplit",
  "hash",
  "hashEquals",
  "hashFile",
  "hashContextDebugInfo",
  "hasFiles",
  "hasPost",
  "hasServer",
  "hasSession",
  "header",
  "httpResponseCode",
  "httpBuildQuery",
  "httpClearLastResponseHeaders",
  "httpGetLastResponseHeaders",
  "iniGet",
  "iniSet",
  "inArray",
  "intlDateFormatterParseToCalendar",
  "intlGregorianCalendarCreateFromDate",
  "intlGregorianCalendarCreateFromDateTime",
  "intlTimeZoneGetIanaId",
  "intlCharCompatMathContinue",
  "intlCharCompatMathStart",
  "intlCharIdsUnaryOperator",
  "intlDateFormatterPattern",
  "intlNumberFormatterRoundHalfOdd",
  "inputBytes",
  "isArray",
  "isBool",
  "isDir",
  "isFile",
  "isInt",
  "isLink",
  "isEmpty",
  "isNumeric",
  "isReadable",
  "isSet",
  "isString",
  "isUploadedFile",
  "isWritable",
  "ldapTlsProtocolMaxOption",
  "ldapTlsProtocolTls13",
  "iteratorIsDir",
  "iteratorIsFile",
  "iteratorPathname",
  "jsonLastError",
  "jsonLastErrorMsg",
  "jsonDecode",
  "jsonEncode",
  "ksort",
  "ltrim",
  "matchValue",
  "mbLcfirst",
  "mbLtrim",
  "mbRtrim",
  "mbTrim",
  "mbUcfirst",
  "mkdir",
  "moveUploadedFile",
  "now",
  "nl2br",
  "opcacheJitBlacklist",
  "ord",
  "objectProp",
  "opensslPkeyGetDetails",
  "opensslPkeyNew",
  "opensslSign",
  "opensslVerify",
  "opensslPurposeOcspHelper",
  "opensslPurposeTimestampSign",
  "odbcClose",
  "odbcConnect",
  "odbcError",
  "odbcErrormsg",
  "odbcExec",
  "odbcFetchArray",
  "odbcFetchObject",
  "odbcPconnect",
  "odbcPrepare",
  "odbcResult",
  "odbcExecute",
  "passwordArgon2Provider",
  "passwordHash",
  "passwordVerify",
  "pathinfo",
  "pcntlQosClass",
  "pdo",
  "pdoBeginTransaction",
  "pdoConnect",
  "pdoCommit",
  "pdoExec",
  "pdoLastInsertId",
  "pdoPrepare",
  "pdoQuery",
  "pdoRollback",
  "pdoSetAttribute",
  "pdoDbLibDriver",
  "pdoFirebirdDriver",
  "pdoMysqlDriver",
  "pdoOdbcDriver",
  "pdoPgsqlDriver",
  "pdoSqlite",
  "pdoSqliteDriver",
  "pdoStatementBindValue",
  "pdoStatementCloseCursor",
  "pdoStatementExecute",
  "pdoStatementFetch",
  "pdoStatementFetchAll",
  "pdoStatementFetchColumn",
  "pdoStatementRowCount",
  "post",
  "pregMatch",
  "pregSplit",
  "pregReplace",
  "rawUrlEncode",
  "reflectionConstantGetName",
  "reflectionConstantGetValue",
  "reflectionConstantIsDeprecated",
  "reflectionClassConstantIsDeprecated",
  "reflectionClassGetLazyInitializer",
  "reflectionClassInitializeLazyObject",
  "reflectionClassIsUninitializedLazyObject",
  "reflectionClassMarkLazyObjectAsInitialized",
  "reflectionClassNewLazyGhost",
  "reflectionClassNewLazyProxy",
  "reflectionClassResetAsLazyGhost",
  "reflectionClassResetAsLazyProxy",
  "reflectionGeneratorIsClosed",
  "reflectionPropertyIsDynamic",
  "reflectionPropertyGetHook",
  "reflectionPropertyGetHooks",
  "reflectionPropertyGetRawValue",
  "reflectionPropertyGetSettableType",
  "reflectionPropertyHasHook",
  "reflectionPropertyHasHooks",
  "reflectionPropertyIsAbstract",
  "reflectionPropertyIsFinal",
  "reflectionPropertyIsLazy",
  "reflectionPropertyIsPrivateSet",
  "reflectionPropertyIsProtectedSet",
  "reflectionPropertyIsVirtual",
  "reflectionPropertyHookGet",
  "reflectionPropertyHookSet",
  "reflectionPropertySetRawValueWithoutLazyInitialization",
  "reflectionPropertySkipLazyInitialization",
  "pcntlGetcpu",
  "pcntlGetcpuaffinity",
  "pcntlGetqosClass",
  "pcntlSetns",
  "pcntlSetqosClass",
  "pcntlWaitid",
  "pdoPgsqlSetNoticeCallback",
  "pgChangePassword",
  "pgJit",
  "pgPutCopyData",
  "pgPutCopyEnd",
  "pgResultMemorySize",
  "pgSetChunkedRowsSize",
  "pgSocketPoll",
  "phpVersion",
  "randomBytes",
  "rename",
  "requestParseBody",
  "requestParseBodyException",
  "responseJson",
  "reflectionConstant",
  "roundingMode",
  "round",
  "rmdir",
  "rtrim",
  "scandir",
  "server",
  "session",
  "soapSdl",
  "soapServerGetLastResponse",
  "soapUrl",
  "sodiumAegis128LKeyBytes",
  "sodiumAegis128LAuthBytes",
  "sodiumAegis128LNonceBytes",
  "sodiumAegis128LSecretBytes",
  "sodiumAegis128LDecrypt",
  "sodiumAegis128LEncrypt",
  "sodiumAegis128LKeygen",
  "sodiumAegis256KeyBytes",
  "sodiumAegis256AuthBytes",
  "sodiumAegis256NonceBytes",
  "sodiumAegis256SecretBytes",
  "sodiumAegis256Decrypt",
  "sodiumAegis256Encrypt",
  "sodiumAegis256Keygen",
  "sessionCookieParams",
  "sessionDestroy",
  "sessionName",
  "sessionRegenerateId",
  "sessionSetCookieParams",
  "sessionStart",
  "sessionStatus",
  "setCookie",
  "setSession",
  "filesize",
  "strtotime",
  "strlen",
  "strcmp",
  "strtolower",
  "strrpos",
  "strStartsWith",
  "strEndsWith",
  "splObjectStorageSeek",
  "spoofcheckerSetAllowedChars",
  "strIncrement",
  "streamBucket",
  "streamBucketData",
  "streamBucketDatalen",
  "streamBucketSetData",
  "strtoupper",
  "substr",
  "strtok",
  "sqlite3",
  "sqlite3BusyTimeout",
  "sqlite3Changes",
  "sqlite3Close",
  "sqlite3EnableExceptions",
  "sqlite3EscapeString",
  "sqlite3Exec",
  "sqlite3LastErrorMsg",
  "sqlite3LastInsertRowId",
  "sqlite3Open",
  "sqlite3Prepare",
  "sqlite3Query",
  "sqlite3QuerySingle",
  "sqlite3ResultFetchArray",
  "sqlite3ResultFinalize",
  "sqlite3StatementBindValue",
  "sqlite3StatementExecute",
  "sqlite3Version",
  "time",
  "touch",
  "unsetPost",
  "unsetSession",
  "unpack",
  "unlink",
  "xmlReaderFromStream",
  "xmlReaderFromString",
  "xmlReaderFromUri",
  "xmlWriterToMemory",
  "xmlWriterToStream",
  "xmlWriterToUri",
  "tidyNodeGetNextSibling",
  "tidyNodeGetPreviousSibling",
  "xsltProcessorRegisterPhpFunctionNS",
  "xsltProcessorMaxTemplateDepth",
  "xsltProcessorMaxTemplateVars",
  "xsltProcessorSetMaxTemplateDepth",
  "xsltProcessorSetMaxTemplateVars",
  "throwDomain",
  "throwInvalidArgument",
  "throwLogic",
  "throwRequestParseBody",
  "throwRuntime",
  "throwUnexpectedValue",
  "toBool",
  "toFloat",
  "toInt",
  "toString",
  "usortVersionDesc",
  "versionCompare",
  "zipAddFile",
  "zipAddFromString",
  "zipArchive",
  "zipErrorTruncatedZip",
  "zipClose",
  "zipExtractTo",
  "zipOpen",
]);

const unsupportedKnownMethodCalls = new Set<string>();

async function main(args: string[]): Promise<number> {
  try {
    const options = parseArgs(args);
    const files = await readSourceFiles(options.input);
    const classNames = new Set<string>();
    const outputs: Array<[string, string]> = [];

    for (const file of files) {
      validateSource(file);
      const php = transpile(file, options.version);
      const names = php.match(/\b(?:final\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/g) ?? [];
      for (const entry of names) {
        const name = entry.replace(/\bfinal\s+class\s+|\bclass\s+/, "");
        if (classNames.has(name)) {
          throw new UserError(`${file.relativePath}: duplicate PHP class name: ${name}`);
        }
        classNames.add(name);
      }
      outputs.push([phpOutputPath(options.out, file.relativePath), php]);
    }

    await ensureDirectory(options.out);
    for (const [path, php] of outputs) {
      await ensureDirectory(dirname(path));
      await writeTextFileWithRetry(path, php);
    }
    return 0;
  } catch (error) {
    if (error instanceof UserError) {
      console.error(error.message);
      return 1;
    }
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    return 2;
  }
}

async function ensureDirectory(path: string): Promise<void> {
  await retryFileSystemOperation(() => Deno.mkdir(path, { recursive: true }));
}

async function writeTextFileWithRetry(path: string, text: string): Promise<void> {
  await retryFileSystemOperation(() => Deno.writeTextFile(path, text));
}

async function retryFileSystemOperation(operation: () => Promise<void>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableFileSystemError(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw lastError;
}

function isRetryableFileSystemError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Resource deadlock avoided|os error 35|EDEADLK|Device or resource busy|EBUSY/.test(message);
}

function parseArgs(args: string[]): CliOptions {
  let input = "";
  let out = "";
  let version = DEFAULT_VERSION;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--input") {
      input = requireValue(args, ++index, arg);
    } else if (arg === "--out") {
      out = requireValue(args, ++index, arg);
    } else if (arg === "--version") {
      version = requireValue(args, ++index, arg);
    } else {
      throw new UserError(`unknown argument: ${arg}`);
    }
  }

  if (input === "" || out === "") {
    throw new UserError("usage: deno task transpile -- --input <input-file-or-directory> --out <output-directory> [--version pt.N.N]");
  }
  if (!/^pt\.[0-9]+\.[0-9]+$/.test(version)) {
    throw new UserError(`PhpTranspiler version must use pt.<major>.<minor>: ${version}`);
  }

  return { input, out, version };
}

function requireValue(args: string[], index: number, name: string): string {
  const value = args[index];
  if (value === undefined || value.startsWith("--")) {
    throw new UserError(`missing value for ${name}`);
  }
  return value;
}

async function readSourceFiles(input: string): Promise<SourceFile[]> {
  const stat = await Deno.stat(input);
  if (stat.isFile) {
    if (!input.endsWith(".ts")) {
      throw new UserError(`input file must use .ts extension: ${input}`);
    }
    return [{
      path: input,
      relativePath: basename(input),
      text: await Deno.readTextFile(input),
    }];
  }

  if (!stat.isDirectory) {
    throw new UserError(`input must be a TypeScript file or directory: ${input}`);
  }

  const files: SourceFile[] = [];
  for await (const entry of walk(input)) {
    if (entry.endsWith(".ts")) {
      files.push({
        path: entry,
        relativePath: relative(input, entry),
        text: await Deno.readTextFile(entry),
      });
    }
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function* walk(root: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(root)) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory) {
      yield* walk(path);
    } else if (entry.isFile) {
      yield path;
    }
  }
}

function validateSource(file: SourceFile): void {
  const lines = file.text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/^\/\/\s*@php-(?:declare|namespace|use|run-unless-defined)\s+.+$/.test(line)) {
      return;
    }
    for (const [pattern, label] of unsupportedPatterns) {
      if (pattern.test(line)) {
        throw new UserError(`${file.relativePath}:${index + 1}: unsupported syntax: ${label}`);
      }
    }
    const importMatches = line.matchAll(/\bimport\s+\{?\s*[A-Za-z0-9_,\s]+\s*\}?\s+from\s+["'](.+?)["'];?/g);
    for (const match of importMatches) {
      const importPath = match[1];
      if (importPath !== undefined && (!importPath.startsWith("./") || importPath.includes("../"))) {
        throw new UserError(`${file.relativePath}:${index + 1}: unsupported import path: ${importPath}`);
      }
    }
    const methodMatches = line.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g);
    for (const match of methodMatches) {
      const target = match[1];
      const method = match[2];
      if (method === undefined || target === undefined) {
        continue;
      }
      if (unsupportedKnownMethodCalls.has(method) || (isGlobalNamespace(target) && !allowedMethodCalls.has(method))) {
        throw new UserError(`${file.relativePath}:${index + 1}: unsupported built-in API: ${method}`);
      }
    }
  });
}

function isGlobalNamespace(target: string): boolean {
  return ["Date", "Math", "JSON", "Object", "Array", "Number", "Php"].includes(target);
}

function transpile(file: SourceFile, version: string): string {
  let text = file.text.replace(/\r\n/g, "\n");
  const requireLines: string[] = [];
  const fileDirectives = parsePhpFileDirectives(file, text);
  const footerDirectives = parsePhpFooterDirectives(file, text);
  text = stripPhpFileDirectives(text);

  text = text.replace(/^import\s+\{?\s*([A-Za-z0-9_,\s]+)\s*\}?\s+from\s+["'](.+?)["'];?$/gm, (_match, _names, path) => {
    requireLines.push(`require_once __DIR__ . '/${String(path).replace(/^\.\//, "").replace(/\.ts$/, ".php")}';`);
    return "";
  });
  text = text.replace(/^export\s+/gm, "");
  text = convertInterfaceBlocks(text);
  text = removeTypeAliasBlocks(text);
  text = text.replace(/(?<!["'])\bundefined\b(?!["'])/g, "null");
  text = text.replace(/(public|private|protected)\s+static\s+readonly\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^=\n;]+)?\s*=\s*([^;\n]+);/g, (_match, visibility, name, value) => {
    return `${visibility} const ${name} = ${convertExpression(String(value).trim())};`;
  });
  text = text.replace(/(public|private|protected)\s+static\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^=\n;]+)(?:\s*=\s*([^;\n]+))?;/g, (_match, visibility, name, typeName, value) => {
    const defaultValue = value === undefined ? "" : ` = ${convertExpression(String(value).trim())}`;
    return `${visibility} static ${phpType(String(typeName))} $${name}${defaultValue};`;
  });
  text = text.replace(/(public|private|protected)\s+readonly\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^\n;]+)\s*;/g, (_match, visibility, name, typeName) => {
    return `${visibility} readonly ${phpType(String(typeName))} $${name};`;
  });
  text = text.replace(/(public|private|protected)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^\n;]+)\s*;/g, (_match, visibility, name, typeName) => {
    return `${visibility} ${phpType(String(typeName))} $${name};`;
  });
  text = text.replace(/(public|private|protected)\s+constructor\s*\(([^)]*)\)/g, (_match, visibility, params) => {
    return `${visibility} function __construct(${convertParams(String(params))})`;
  });
  text = text.replace(/(public|private|protected)\s+static\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^{\n]+)\s*\{/g, (_match, visibility, name, params, returnType) => {
    return `${visibility} static function ${name}(${convertParams(String(params))}): ${phpType(String(returnType))} {`;
  });
  text = text.replace(/(public|private|protected)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^{\n]+)\s*\{/g, (_match, visibility, name, params, returnType) => {
    return `${visibility} function ${name}(${convertParams(String(params))}): ${phpType(String(returnType))} {`;
  });
  text = text.replace(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^{\n]+)\s*\{/gm, (_match, name, params, returnType) => {
    return `function ${name}(${convertParams(String(params))}): ${phpType(String(returnType))} {`;
  });
  text = convertForLoops(text);
  text = convertVariableDeclarations(text);
  text = text.replace(/:\s*Array<([^>]+)>/g, ": array");
  text = text.replace(/\bnew\s+Error\(/g, "new Exception(");
  text = convertCatchClauses(text);
  text = convertTemplateLiterals(text);
  text = text.replace(/\bthis\./g, "$this->");
  text = text.replace(/(?<![.>])\b(serverSideClient|serverSide)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)\n]*)\)/g, (_match, target, method, args) => `$${target}->${method}(${convertArgumentList(String(args))})`);
  text = text.replace(/(?<!->)\bruntime\.(serverSideClient|configRoot|workRoot|config|git)\b/g, (_match, property) => `$runtime->${property}`);
  text = text.replace(/\b([a-z_][A-Za-z0-9_]*)\.getMessage\(\)/g, (_match, target) => `$${target}->getMessage()`);
  text = convertDeleteStatements(text);
  text = convertLocalValueReferences(text);
  text = convertIndexAssignments(text);
  text = convertStaticPropertyAssignments(text);
  text = convertPropertyAssignments(text);
  text = convertAssignmentReferences(text);
  text = convertCompoundAssignments(text);
  text = convertPhpMatchValueCalls(text);
  text = convertBlockArrowCallbacks(text);
  text = convertReturnStatements(text);
  text = convertThrowStatements(text);
  text = convertArrayFunctionalMethods(text);
  text = convertArrayPush(text);
  text = convertExpressionStatements(text);
  text = convertControlExpressions(text);
  text = text.replace(/([({,]\s*)([a-z_][A-Za-z0-9_]*)\s*:(?!:)/g, "$1'$2' =>");
  text = text.replace(/\btrue\b/g, "true");
  text = text.replace(/\bfalse\b/g, "false");
  text = text.replace(/\bnull\b/g, "null");
  text = text.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.length\b/g, (_match, name) => convertLength(String(name)));
  text = convertForOf(text);
  text = convertForIn(text);
  text = convertIncrementStatements(text);
  text = text.replace(/->serverSideClient\./g, "->serverSideClient->");
  text = restorePhpConstants(text);
  text = convertResidualThrowHelpers(text);
  text = text.replace(/\bclass\s+/g, "final class ");

  const body = text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "")
    .join("\n");

  const php = [
    "<?php",
    `/* Generated by PhpTranspiler ${version}. Source: ${file.relativePath}. */`,
    ...fileDirectives,
    ...requireLines,
    body,
    ...footerDirectives,
    "",
  ].join("\n");
  validateGeneratedPhp(file, php);
  return php;
}

function parsePhpFileDirectives(file: SourceFile, text: string): string[] {
  const lines: string[] = [];
  const directiveMatches = text.matchAll(/^\/\/\s*@php-(declare|namespace|use)\s+(.+)$/gm);
  for (const match of directiveMatches) {
    const directive = match[1];
    const value = String(match[2] ?? "").trim();
    if (directive === "declare") {
      if (value !== "strict_types=1") {
        throw new UserError(`${file.relativePath}: unsupported php declare directive: ${value}`);
      }
      lines.push("declare(strict_types=1);");
      continue;
    }
    if (directive === "namespace") {
      if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\\[A-Za-z_][A-Za-z0-9_]*)*$/.test(value)) {
        throw new UserError(`${file.relativePath}: invalid php namespace directive: ${value}`);
      }
      lines.push(`namespace ${value};`);
      continue;
    }
    if (directive === "use") {
      if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\\[A-Za-z_][A-Za-z0-9_]*)*(?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?$/.test(value)) {
        throw new UserError(`${file.relativePath}: invalid php use directive: ${value}`);
      }
      lines.push(`use ${value};`);
    }
  }
  return lines;
}

function parsePhpFooterDirectives(file: SourceFile, text: string): string[] {
  const lines: string[] = [];
  const directiveMatches = text.matchAll(/^\/\/\s*@php-run-unless-defined\s+([A-Z_][A-Z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)::([A-Za-z_][A-Za-z0-9_]*)\s+\(__DIR__\)$/gm);
  for (const match of directiveMatches) {
    const constant = match[1];
    const className = match[2];
    const method = match[3];
    if (constant === undefined || className === undefined || method === undefined) {
      throw new UserError(`${file.relativePath}: invalid php run-unless-defined directive`);
    }
    lines.push(`if (!defined('${constant}')) {`);
    lines.push(`    ${className}::${method}(__DIR__);`);
    lines.push("}");
  }
  return lines;
}

function stripPhpFileDirectives(text: string): string {
  return text.replace(/^\/\/\s*@php-(?:declare|namespace|use|run-unless-defined)\s+.+$/gm, "");
}

function validateGeneratedPhp(file: SourceFile, php: string): void {
  const checks: Array<[RegExp, string]> = [
    [/\r/, "generated PHP must use LF line endings"],
    [/\t/, "generated PHP must not contain tab indentation"],
    [/[ \t]+$/m, "generated PHP must not contain trailing whitespace"],
    [/\?>\s*$/, "generated PHP must not use a closing PHP tag"],
    [/^\s+<\?php/m, "generated PHP must start at the first byte"],
    [/\$\{/, "unconverted template interpolation"],
    [/^\s*(?:const|let)\s+/m, "unconverted variable declaration"],
    [/\bundefined\b/, "unconverted undefined"],
    [/`/, "unconverted template literal"],
    [/\bthis\./, "unconverted this reference"],
    [/\btypeof\b/, "unconverted typeof"],
    [/\bArray\.isArray\s*\(/, "unconverted Array.isArray"],
    [/\bNumber\.(?:isInteger|isFinite)\s*\(/, "unconverted Number guard"],
    [/\bPhp\.[A-Za-z_][A-Za-z0-9_]*\s*\(/, "unconverted Php helper"],
    [/(?<!\\)\b(?:String|Number|Boolean|parseInt|parseFloat)\s*\(/, "unconverted cast helper"],
    [/\b[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*\s*\(/, "unconverted dotted call"],
    [/=>\s*\{/, "unconverted block arrow callback"],
    [/(?:=|return|\[\]\s*=)\s*\{\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*=>/, "malformed object literal"],
    [/\+\s*[A-Za-z_][A-Za-z0-9_]*\s*\+/, "unconverted string concatenation operand"],
    [/\)\.\$[A-Za-z_][A-Za-z0-9_]*/, "unconverted method result property access"],
    [/\b[A-Za-z_][A-Za-z0-9_]*::(?:trim|slice|startsWith|endsWith|push)\s*\(/, "unconverted instance method call"],
    [/^\s*type\s+[A-Za-z_][A-Za-z0-9_]*/m, "unconverted type declaration"],
    [/(?<!->)\b(?:eval|assert|create_function|shell_exec|exec|system|passthru|proc_open|popen|pcntl_exec|extract|parse_str|unserialize)\s*\(/, "forbidden dynamic or unsafe PHP function"],
    [/\((?:boolean|integer|double|binary)\)/, "PHP 8.5 deprecated non-canonical cast"],
    [/^\s*case\s+[^:\n]+;/m, "PHP 8.5 deprecated semicolon case terminator"],
    [/\b(?:curl_close|curl_share_close|finfo_close|imagedestroy|xml_parser_free|socket_set_timeout)\s*\(/, "PHP 8.5 deprecated function"],
    [/\b(?:DATE_RFC7231|E_STRICT)\b/, "PHP 8.5 deprecated constant"],
    [/\bMHASH_[A-Z0-9_]+\b/, "PHP 8.5 deprecated hash constant"],
    [/\bfunction\s+__(?:sleep|wakeup)\s*\(/, "PHP 8.5 soft-deprecated serialization magic method"],
    [/\$http_response_header\b/, "PHP 8.5 deprecated local response header variable"],
    [/array_key_exists\(\s*null\s*,/, "PHP 8.5 deprecated null array key check"],
    [/\bclass\s+_\s*[\{]/, "PHP 8.4 deprecated underscore class name"],
    [/\b(?:public|protected|private)\s+(?:public|protected|private)\(set\)\s+/, "unsupported PHP 8.4 asymmetric property visibility output"],
    [/\$[A-Za-z_][A-Za-z0-9_]*\s*\{\s*(?:get|set)\b/s, "unsupported PHP 8.4 property hook output"],
    [/[,(]\s*(?!mixed\s+\$)(?![A-Za-z_][A-Za-z0-9_\\]*\|)[A-Za-z_][A-Za-z0-9_\\]*\s+\$[A-Za-z_][A-Za-z0-9_]*\s*=\s*null/, "PHP 8.4 deprecated implicit nullable parameter"],
    [/\b(?:mysqli_ping|mysqli_kill|mysqli_refresh)\s*\(/, "PHP 8.4 deprecated mysqli function"],
    [/->(?:ping|kill|refresh)\s*\(/, "PHP 8.4 deprecated mysqli method"],
    [/\b(?:MYSQLI_REFRESH_[A-Z0-9_]+|MYSQLI_SET_CHARSET_DIR|MYSQLI_STMT_ATTR_PREFETCH_ROWS|MYSQLI_CURSOR_TYPE_FOR_UPDATE|MYSQLI_CURSOR_TYPE_SCROLLABLE|MYSQLI_TYPE_INTERVAL|MYSQLI_STORE_RESULT_COPY_DATA)\b/, "PHP 8.4 deprecated or removed mysqli constant"],
    [/\b(?:CURLOPT_BINARYTRANSFER|DOM_PHP_ERR|SUNFUNCS_RET_TIMESTAMP|SUNFUNCS_RET_STRING|SUNFUNCS_RET_DOUBLE|SOAP_FUNCTIONS_ALL|SID)\b/, "PHP 8.4 deprecated constant"],
    [/\b(?:date_sunset|date_sunrise|lcg_value|xml_set_object)\s*\(/, "PHP 8.4 deprecated function"],
    [/\bstream_context_set_option\s*\([^,]+\s*,\s*[^,]+\s*\)/, "PHP 8.4 deprecated stream_context_set_option two-argument call"],
    [/trigger_error\([^;]*E_USER_ERROR/s, "PHP 8.4 deprecated E_USER_ERROR trigger_error"],
    [/PDO::(?:DBLIB|FB|MYSQL|ODBC|PGSQL|SQLITE)_/, "PHP 8.5 deprecated PDO driver-specific constant"],
    [/\b(?:sqlite_open|sqlite_popen|sqlite_query|sqlite_exec|sqlite_fetch_array|sqlite_close)\s*\(/, "legacy sqlite extension function"],
    [/(?<!:)\$\$/, "forbidden variable variable"],
    [/\$[A-Za-z_][A-Za-z0-9_]*\s*\(/, "forbidden variable function call"],
    [/\b(?:include|include_once|require|require_once)\b(?!\s+__DIR__\s*\.)/, "forbidden dynamic include or require"],
  ];
  if (!php.startsWith("<?php\n")) {
    throw new UserError(`${file.relativePath}: generated PHP failed coding standard: missing opening PHP tag`);
  }
  if (!php.endsWith("\n")) {
    throw new UserError(`${file.relativePath}: generated PHP failed coding standard: missing final newline`);
  }
  if (!php.split("\n")[1]?.startsWith("/* Generated by PhpTranspiler ")) {
    throw new UserError(`${file.relativePath}: generated PHP failed coding standard: missing generated header`);
  }
  for (const [pattern, label] of checks) {
    const match = php.match(pattern);
    if (match !== null) {
      const index = match.index ?? 0;
      const lineNumber = php.slice(0, index).split("\n").length;
      const line = php.split("\n")[lineNumber - 1] ?? "";
      const excerpt = line.trim().replace(/\s+/g, " ").slice(0, 160);
      throw new UserError(`${file.relativePath}:${lineNumber}: generated PHP failed safety audit: ${label}: ${excerpt}`);
    }
  }
}

function convertInterfaceBlocks(text: string): string {
  return text.replace(/interface\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\n\}/g, (_match, name, body) => {
    const methods = String(body)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line) => {
        const method = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^;]+);$/);
        if (method === null || method[1] === undefined || method[2] === undefined || method[3] === undefined) {
          return line;
        }
        return `  public function ${method[1]}(${convertParams(method[2])}): ${phpType(method[3])};`;
      })
      .join("\n");
    return `interface ${name} {\n${methods}\n}`;
  });
}

function removeTypeAliasBlocks(text: string): string {
  return text
    .replace(/^type\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*\{[\s\S]*?^\};?$/gm, "")
    .replace(/^type\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*[^;\n]+;$/gm, "");
}

function phpType(typeName: string): string {
  const cleaned = typeName.trim().replace(/\s+/g, "");
  if (cleaned === "") {
    return "mixed";
  }
  if (cleaned.includes("|")) {
    return unique(cleaned.split("|").map((part) => phpType(part))).join("|");
  }
  if (/^Array<.+>$/.test(cleaned)) {
    return "array";
  }
  if (cleaned.endsWith("[]")) {
    return "array";
  }
  const normalized = cleaned.replace(/\[\]$/, "");
  switch (normalized) {
    case "string":
      return "string";
    case "number":
      return "int|float";
    case "boolean":
      return "bool";
    case "void":
      return "void";
    case "never":
      return "never";
    case "unknown":
    case "any":
      return "mixed";
    default:
      return normalized;
  }
}

function convertParams(params: string): string {
  return splitTopLevelComma(params)
    .map((param) => param.trim())
    .filter((param) => param !== "")
    .map((param) => {
      const match = param.match(/^(?:(public|private|protected)\s+)?(?:(readonly)\s+)?([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*(.+)$/);
      if (match === null) {
        return param.startsWith("$") ? param : `$${param}`;
      }
      const visibility = match[1];
      const readonly = match[2] !== undefined;
      const name = match[3];
      const optional = match[4] !== undefined;
      const typeAndDefault = match[5];
      if (name === undefined || typeAndDefault === undefined) {
        return param;
      }
      const [typeName, defaultValue] = splitTopLevelAssignment(typeAndDefault);
      const type = optional ? nullablePhpType(typeName) : phpType(typeName);
      const propertyPrefix = visibility === undefined ? "" : `${visibility} ${readonly ? "readonly " : ""}`;
      if (defaultValue !== null) {
        return `${propertyPrefix}${type} $${name} = ${convertExpression(defaultValue.trim())}`;
      }
      return optional ? `${propertyPrefix}${type} $${name} = null` : `${propertyPrefix}${type} $${name}`;
    })
    .join(", ");
}

function splitTopLevelAssignment(value: string): [string, string | null] {
  let depth = 0;
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote !== "") {
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[" || char === "{" || char === "(") {
      depth += 1;
      continue;
    }
    if (char === "]" || char === "}" || char === ")") {
      depth -= 1;
      continue;
    }
    if (char === "=" && depth === 0) {
      return [value.slice(0, index).trim(), value.slice(index + 1).trim()];
    }
  }
  return [value.trim(), null];
}

function nullablePhpType(typeName: string): string {
  const type = phpType(typeName);
  return type.split("|").includes("null") ? type : `${type}|null`;
}

function convertTemplateLiterals(text: string): string {
  return text.replace(/`([^`]+)`/g, (_match, inner) => {
    const converted = String(inner).replace(/\$\{this\.([^}]+)\}/g, "{$this->$1}").replace(/\$\{([^}]+)\}/g, "{$$$1}");
    return `"${converted}"`;
  });
}

function convertVariableDeclarations(text: string): string {
  let converted = text.replace(/^(\s*)(?:const|let)\s+\[([^\]\n]+)\]\s*=\s*([^;]+);/gm, (_match, indent, names, value) => {
    const variables = splitTopLevelComma(String(names)).map((name) => `$${name.trim()}`).join(", ");
    return `${indent}[${variables}] = ${convertExpression(String(value).trim())};`;
  });
  converted = converted.replace(/^(\s*)(?:const|let)\s+\{([^}\n]+)\}\s*=\s*([^;]+);/gm, (_match, indent, names, value) => {
    const variables = splitTopLevelComma(String(names)).map((entry) => {
      const parts = entry.split(":").map((part) => part.trim());
      const key = parts[0] ?? "";
      const variable = parts[1] ?? key;
      return `'${key}' => $${variable}`;
    }).join(", ");
    return `${indent}[${variables}] = ${convertExpression(String(value).trim())};`;
  });
  return converted.replace(/^(\s*)(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^=;]+)?\s*=\s*([^;]+);/gm, (_match, indent, name, value) => {
    return `${indent}$${name} = ${convertExpression(String(value))};`;
  });
}

function convertCatchClauses(text: string): string {
  return text
    .replace(/\bcatch\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g, (_match, name) => {
      return `catch (Throwable $${name})`;
    })
    .replace(/\bcatch\s*\{/g, "catch (Throwable) {");
}

function convertLocalValueReferences(text: string): string {
  return text.replace(/=\s*([A-Za-z_][A-Za-z0-9_]*)\s*([;)])/g, (_match, name, suffix) => {
    if (isLiteralLike(String(name))) {
      return `= ${name}${suffix}`;
    }
    return `= $${name}${suffix}`;
  });
}

function convertAssignmentReferences(text: string): string {
  return text.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);/gm, (_match, indent, target, value) => {
    return `${indent}$${target} = ${convertExpression(String(value).trim())};`;
  });
}

function convertIndexAssignments(text: string): string {
  return text.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, target, index, operator, value) => {
    const lhs = convertIndexAccess(`${target}[${String(index).trim()}]`);
    return `${indent}${lhs} ${operator} ${convertExpression(String(value).trim())};`;
  });
}

function convertPropertyAssignments(text: string): string {
  return text.replace(/^(\s*)([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, target, property, operator, value) => {
    return `${indent}$${target}->${property} ${operator} ${convertExpression(String(value).trim())};`;
  });
}

function convertStaticPropertyAssignments(text: string): string {
  return text
    .replace(/^(\s*)self\.([a-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, property, index, operator, value) => {
      return `${indent}self::$${property}[${convertExpression(String(index).trim())}] ${operator} ${convertExpression(String(value).trim())};`;
    })
    .replace(/^(\s*)([A-Z][A-Za-z0-9_]*)\.([a-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, className, property, index, operator, value) => {
      return `${indent}${className}::$${property}[${convertExpression(String(index).trim())}] ${operator} ${convertExpression(String(value).trim())};`;
    })
    .replace(/^(\s*)self\.([a-z_][A-Za-z0-9_]*)\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, property, operator, value) => {
      return `${indent}self::$${property} ${operator} ${convertExpression(String(value).trim())};`;
    })
    .replace(/^(\s*)([A-Z][A-Za-z0-9_]*)\.([a-z_][A-Za-z0-9_]*)\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, className, property, operator, value) => {
      return `${indent}${className}::$${property} ${operator} ${convertExpression(String(value).trim())};`;
    });
}

function convertDeleteStatements(text: string): string {
  return text
    .replace(/^(\s*)delete\s+\$this->([A-Za-z_][A-Za-z0-9_]*);/gm, (_match, indent, property) => {
      return `${indent}unset($this->${property});`;
    })
    .replace(/^(\s*)delete\s+([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*);/gm, (_match, indent, target, property) => {
      return `${indent}unset($${target}->${property});`;
    })
    .replace(/^(\s*)delete\s+([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\];/gm, (_match, indent, target, index) => {
      return `${indent}unset($${target}[${convertExpression(String(index).trim())}]);`;
    });
}

function convertCompoundAssignments(text: string): string {
  return text.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/]=)\s*([^;]+);/gm, (_match, indent, target, operator, value) => {
    return `${indent}$${target} ${operator} ${convertExpression(String(value).trim())};`;
  });
}

function convertReturnStatements(text: string): string {
  return text.replace(/\breturn\s+([^;]+);/g, (_match, value) => {
    return `return ${convertExpression(String(value).trim())};`;
  });
}

function convertThrowStatements(text: string): string {
  return text.replace(/\bthrow\s+([^;]+);/g, (_match, value) => {
    return `throw ${convertExpression(String(value).trim())};`;
  });
}

function convertControlExpressions(text: string): string {
  const converted = convertParenthesizedControlExpressions(text);
  return converted.replace(/^(\s*)case\s+([^:]+):/gm, (_match, indent, value) => {
    return `${indent}case ${convertExpression(String(value).trim())}:`;
  });
}

function convertParenthesizedControlExpressions(text: string): string {
  let output = "";
  let index = 0;
  while (index < text.length) {
    const match = text.slice(index).match(/\b(if|while|switch)\s*\(/);
    if (match === null || match.index === undefined || match[1] === undefined) {
      output += text.slice(index);
      break;
    }
    const start = index + match.index;
    const open = start + match[0].lastIndexOf("(");
    const close = findMatchingParen(text, open);
    if (close === null) {
      output += text.slice(index);
      break;
    }
    output += text.slice(index, start);
    output += `${match[1]} (${convertExpression(text.slice(open + 1, close).trim())})`;
    index = close + 1;
  }
  return output;
}

function findMatchingParen(text: string, open: number): number | null {
  let depth = 0;
  let quote = "";
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== "") {
      if (char === quote && text[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return null;
}

function convertForLoops(text: string): string {
  return text.replace(/\bfor\s*\(\s*(?:let|const)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);\s*([^;]+);\s*([^)]+)\)\s*\{/g, (_match, name, initial, condition, step) => {
    return `for ($${name} = ${convertExpression(String(initial).trim())}; ${convertExpression(String(condition).trim())}; ${convertForStep(String(step).trim())}) {`;
  });
}

function convertForStep(step: string): string {
  return step
    .replace(/^([A-Za-z_][A-Za-z0-9_]*)(\+\+|--)$/, (_match, name, op) => `$${name}${op}`)
    .replace(/^([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/])=\s*(.+)$/, (_match, name, op, value) => `$${name} ${op}= ${convertExpression(String(value).trim())}`);
}

function convertIncrementStatements(text: string): string {
  return text.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\+\+|--);/gm, (_match, indent, name, op) => {
    return `${indent}$${name}${op};`;
  });
}

function convertArrayFunctionalMethods(text: string): string {
  const singleParam = "\\(?\\s*([A-Za-z_][A-Za-z0-9_]*)(?:\\s*:\\s*[^)=,]+)?\\s*\\)?(?:\\s*:\\s*[^=]+)?\\s*=>";
  let converted = text.replace(new RegExp(`\\b([A-Za-z_][A-Za-z0-9_]*)\\.map\\(\\s*${singleParam}\\s*([^)]+?)\\s*\\)`, "g"), (_match, array, item, expression) => {
    return `array_map(fn($${item}) => ${convertExpression(String(expression).trim())}, $${array})`;
  });
  converted = converted.replace(new RegExp(`\\b([A-Za-z_][A-Za-z0-9_]*)\\.filter\\(\\s*${singleParam}\\s*([^)]+?)\\s*\\)`, "g"), (_match, array, item, expression) => {
    return `array_values(array_filter($${array}, fn($${item}) => ${convertExpression(String(expression).trim())}))`;
  });
  converted = converted.replace(new RegExp(`\\b([A-Za-z_][A-Za-z0-9_]*)\\.(some|every|find|findIndex)\\(\\s*${singleParam}\\s*([^)]+?)\\s*\\)`, "g"), (_match, array, method, item, expression) => {
    return convertArrayPredicateCall(String(array), String(method), String(item), String(expression));
  });
  converted = converted.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.reduce\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^,)=]+)?\s*,\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)=]+)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*([^,\n)]+)(?:,\s*([^)]+))?\)/g, (_match, array, carry, item, expression, initial) => {
    return convertArrayReduceCall(String(array), String(carry), String(item), String(expression), initial === undefined ? null : String(initial));
  });
  converted = converted.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\.sort\(\s*\);/gm, (_match, indent, array) => {
    return `${indent}sort($${array});`;
  });
  converted = converted.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\.sort\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^,)=]+)?\s*,\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)=]+)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*([^;\n]+)\s*\);/gm, (_match, indent, array, left, right, expression) => {
    return `${indent}usort($${array}, fn($${left}, $${right}): int => ${convertSortComparator(String(left), String(right), String(expression).trim())});`;
  });
  converted = converted.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\.forEach\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)=]+)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*([^;]+)\s*\);/gm, (_match, indent, array, item, statement) => {
    return `${indent}foreach ($${array} as $${item}) {\n${indent}  ${convertStatement(String(statement).trim())}\n${indent}}`;
  });
  return converted;
}

function convertStatement(statement: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*\.push\(/.test(statement)) {
    return convertArrayPush(`${statement};`);
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(statement)) {
    return convertAssignmentReferences(`${statement};`);
  }
  return `${convertExpression(statement)};`;
}

function convertExpressionStatements(text: string): string {
  const statementKeywords = new Set([
    "break",
    "case",
    "catch",
    "continue",
    "default",
    "do",
    "else",
    "finally",
    "for",
    "foreach",
    "function",
    "if",
    "return",
    "switch",
    "throw",
    "try",
    "while",
  ]);

  return text.split("\n").map((line) => {
    const statement = line.match(/^(\s*)(.+);$/);
    if (statement === null || statement[1] === undefined || statement[2] === undefined) {
      return line;
    }
    const expression = statement[2].trim();
    const push = expression.match(/^([A-Za-z_][A-Za-z0-9_]*)\.push\(([\s\S]+)\)$/);
    if (push !== null && push[1] !== undefined && push[2] !== undefined) {
      return `${statement[1]}$${push[1]}[] = ${convertExpression(push[2].trim())};`;
    }
    if (!isCallableExpressionStatement(expression)) {
      return line;
    }
    const head = expression.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
    if (head !== null && statementKeywords.has(head[1] ?? "")) {
      return line;
    }
    return `${statement[1]}${convertExpression(expression)};`;
  }).join("\n");
}

function isCallableExpressionStatement(expression: string): boolean {
  const open = expression.indexOf("(");
  if (open === -1) {
    return false;
  }
  const callee = expression.slice(0, open);
  if (!/^(?:\$this->[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*|[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)$/.test(callee)) {
    return false;
  }
  return findMatchingParen(expression, open) === expression.length - 1;
}

function convertArgumentList(args: string): string {
  return splitTopLevelComma(args)
    .map((arg) => convertExpression(arg.trim()))
    .join(", ");
}

function convertStringMethod(target: string, method: string, args: string): string {
  const value = phpValueReference(target);
  const convertedArgs = convertArgumentList(args);
  switch (method) {
    case "trim":
      return `trim(${value})`;
    case "toUpperCase":
      return `mb_strtoupper(${value})`;
    case "toLowerCase":
      return `mb_strtolower(${value})`;
    case "split":
      return `explode(${convertedArgs}, ${value})`;
    case "slice":
      return `mb_substr(${value}, ${convertedArgs})`;
    case "includes":
      return `str_contains(${value}, ${convertedArgs})`;
    case "replace": {
      const parts = args.split(",").map((arg) => convertExpression(arg.trim()));
      return `str_replace(${parts.join(", ")}, ${value})`;
    }
    case "startsWith":
      return `str_starts_with(${value}, ${convertedArgs})`;
    case "endsWith":
      return `str_ends_with(${value}, ${convertedArgs})`;
    default:
      return `${value}->${method}(${convertedArgs})`;
  }
}

function convertStaticFunction(namespace: string, method: string, args: string): string {
  const convertedArgs = convertArgumentList(args);
  const firstArg = splitTopLevelComma(args)[0]?.trim() ?? "";
  const firstValue = convertExpression(firstArg);
  if (namespace === "Math" && ["floor", "ceil", "round", "max", "min", "abs"].includes(method)) {
    return `${method}(${convertedArgs})`;
  }
  if (namespace === "JSON" && method === "stringify") {
    return `json_encode(${convertedArgs}, JSON_UNESCAPED_UNICODE)`;
  }
  if (namespace === "JSON" && method === "parse") {
    return `json_decode(${convertedArgs}, true)`;
  }
  if (namespace === "Object" && method === "keys") {
    return `array_keys(${convertedArgs})`;
  }
  if (namespace === "Object" && method === "values") {
    return `array_values(${convertedArgs})`;
  }
  if (namespace === "Object" && method === "entries") {
    return `array_map(fn($key, $value) => [$key, $value], array_keys(${firstValue}), array_values(${firstValue}))`;
  }
  if (namespace === "Array" && method === "isArray") {
    return `is_array(${convertedArgs})`;
  }
  if (namespace === "Number" && method === "isInteger") {
    return `is_int(${convertedArgs})`;
  }
  if (namespace === "Number" && method === "isFinite") {
    return `is_finite(${convertedArgs})`;
  }
  if (namespace === "Date" && method === "now") {
    return "time()";
  }
  if (namespace === "Date" && method === "parse") {
    return `strtotime(${convertedArgs})`;
  }
  if (namespace === "Php") {
    return convertPhpHelper(method, args);
  }
  return `${namespace}.${method}(${args})`;
}

function convertPhpHelper(method: string, args: string): string {
  const convertedArgs = convertArgumentList(args);
  switch (method) {
    case "absPath":
      return `realpath(${convertedArgs})`;
    case "arrayAll":
      return phpArrayPredicateHelper("array_all", args);
    case "arrayAny":
      return phpArrayPredicateHelper("array_any", args);
    case "arrayAppend":
      return phpArrayAppend(args);
    case "arraySet":
      return phpArraySet(args);
    case "arrayDiff":
      return `array_diff(${convertedArgs})`;
    case "arrayFind":
      return phpArrayPredicateHelper("array_find", args);
    case "arrayFindKey":
      return phpArrayPredicateHelper("array_find_key", args);
    case "arrayKeyExists":
      return `array_key_exists(${convertedArgs})`;
    case "arrayMerge":
      return `array_merge(${convertedArgs})`;
    case "arraySearch":
      return `array_search(${convertedArgs})`;
    case "arrayUnique":
      return `array_unique(${convertedArgs})`;
    case "arrayValues":
      return `array_values(${convertedArgs})`;
    case "bcCeil":
      return `bcceil(${convertedArgs})`;
    case "bcDivmod":
      return `bcdivmod(${convertedArgs})`;
    case "bcFloor":
      return `bcfloor(${convertedArgs})`;
    case "bcNumber":
      return `new BcMath\\Number(${convertedArgs})`;
    case "bcRound":
      return `bcround(${convertedArgs})`;
    case "basename":
      return `basename(${convertedArgs})`;
    case "base64Encode":
      return `base64_encode(${convertedArgs})`;
    case "base64Decode":
      return `base64_decode(${convertedArgs})`;
    case "bin2hex":
      return `bin2hex(${convertedArgs})`;
    case "chmod":
      return `chmod(${convertedArgs})`;
    case "copy":
      return `copy(${convertedArgs})`;
    case "curlClose":
      return `unset(${convertedArgs})`;
    case "curlError":
      return `curl_error(${convertedArgs})`;
    case "curlErrno":
      return `curl_errno(${convertedArgs})`;
    case "curlExec":
      return `curl_exec(${convertedArgs})`;
    case "curlGetinfo":
      return `curl_getinfo(${convertedArgs})`;
    case "curlInit":
      return convertedArgs === "" ? "curl_init()" : `curl_init(${convertedArgs})`;
    case "curlSetopt":
      return `curl_setopt(${convertedArgs})`;
    case "curlPostTransferTimeInfo":
      return "CURLINFO_POSTTRANSFER_TIME_T";
    case "curlDebugFunctionOption":
      return "CURLOPT_DEBUGFUNCTION";
    case "curlHeaderInInfo":
      return "CURLINFO_HEADER_IN";
    case "curlHttpVersion3Only":
      return "CURL_HTTP_VERSION_3ONLY";
    case "curlPrereqFunctionOption":
      return "CURLOPT_PREREQFUNCTION";
    case "curlSslDataInInfo":
      return "CURLINFO_SSL_DATA_IN";
    case "curlSslDataOutInfo":
      return "CURLINFO_SSL_DATA_OUT";
    case "curlTcpKeepCountOption":
      return "CURLOPT_TCP_KEEPCNT";
    case "curlServerResponseTimeoutOption":
      return "CURLOPT_SERVER_RESPONSE_TIMEOUT";
    case "curlVersion":
      return convertedArgs === "" ? "curl_version()" : `curl_version(${convertedArgs})`;
    case "curlSetoptArray":
      return `curl_setopt_array(${convertedArgs})`;
    case "clearStatCache":
      return `clearstatcache(${convertedArgs})`;
    case "count":
      return `count(${convertedArgs})`;
    case "ctypeDigit":
      return `ctype_digit(${convertedArgs})`;
    case "dirname":
      return `dirname(${convertedArgs})`;
    case "domHtmlDocumentFromFile":
      return `Dom\\HTMLDocument::createFromFile(${convertedArgs})`;
    case "domHtmlDocumentFromString":
      return `Dom\\HTMLDocument::createFromString(${convertedArgs})`;
    case "domNodeCompareDocumentPosition":
      return phpObjectMethod("compareDocumentPosition", args);
    case "domDocumentPositionContainedBy":
      return "Dom\\Node::DOCUMENT_POSITION_CONTAINED_BY";
    case "domDocumentPositionContains":
      return "Dom\\Node::DOCUMENT_POSITION_CONTAINS";
    case "domDocumentPositionDisconnected":
      return "Dom\\Node::DOCUMENT_POSITION_DISCONNECTED";
    case "domDocumentPositionFollowing":
      return "Dom\\Node::DOCUMENT_POSITION_FOLLOWING";
    case "domDocumentPositionPreceding":
      return "Dom\\Node::DOCUMENT_POSITION_PRECEDING";
    case "domElementClassList":
      return phpObjectProperty("classList", args);
    case "domParentNodeQuerySelector":
      return phpObjectMethod("querySelector", args);
    case "domParentNodeQuerySelectorAll":
      return phpObjectMethod("querySelectorAll", args);
    case "domTokenListContains":
      return phpObjectMethod("contains", args);
    case "domXmlDocumentFromFile":
      return `Dom\\XMLDocument::createFromFile(${convertedArgs})`;
    case "domXmlDocumentFromString":
      return `Dom\\XMLDocument::createFromString(${convertedArgs})`;
    case "domXPathQuote":
      return `DOMXPath::quote(${convertedArgs})`;
    case "domXPathRegisterPhpFunctionNS":
      return phpObjectMethod("registerPhpFunctionNS", args);
    case "date":
      return `date(${convertedArgs})`;
    case "dateFormat":
      return phpObjectMethod("format", args);
    case "dateTime":
      return `new DateTime(${convertedArgs})`;
    case "dateTimeImmutable":
      return `new DateTimeImmutable(${convertedArgs})`;
    case "dateTimeImmutableFromTimestamp":
      return `DateTimeImmutable::createFromTimestamp(${convertedArgs})`;
    case "dateTimeFromTimestamp":
      return `DateTime::createFromTimestamp(${convertedArgs})`;
    case "dateMicrosecond":
      return phpObjectMethod("getMicrosecond", args);
    case "dateSetMicrosecond":
      return phpObjectMethod("setMicrosecond", args);
    case "dateTimestamp":
      return phpObjectMethod("getTimestamp", args);
    case "deprecatedAttribute":
      return `new Deprecated(${convertedArgs})`;
    case "dbaClose":
      return `dba_close(${convertedArgs})`;
    case "dbaDelete":
      return `dba_delete(${convertedArgs})`;
    case "dbaExists":
      return `dba_exists(${convertedArgs})`;
    case "dbaFetch":
      return `dba_fetch(${convertedArgs})`;
    case "dbaFirstKey":
      return `dba_firstkey(${convertedArgs})`;
    case "dbaInsert":
      return `dba_insert(${convertedArgs})`;
    case "dbaNextKey":
      return `dba_nextkey(${convertedArgs})`;
    case "dbaOpen":
      return `dba_open(${convertedArgs})`;
    case "dbaPopen":
      return `dba_popen(${convertedArgs})`;
    case "dbaReplace":
      return `dba_replace(${convertedArgs})`;
    case "dbaSync":
      return `dba_sync(${convertedArgs})`;
    case "escapeHtml": {
      const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
      if (parts.length <= 1) {
        return `htmlspecialchars(${convertedArgs}, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8")`;
      }
      return `htmlspecialchars(${convertedArgs})`;
    }
    case "echo":
      return `echo ${convertedArgs}`;
    case "exit":
      return convertedArgs === "" ? "exit" : `exit(${convertedArgs})`;
    case "fileExists":
      return `file_exists(${convertedArgs})`;
    case "fileMTime":
      return `filemtime(${convertedArgs})`;
    case "fileGetContents":
      return `file_get_contents(${convertedArgs})`;
    case "filePutContents":
      return `file_put_contents(${convertedArgs})`;
    case "files":
      return phpSuperglobalRead("$_FILES", args);
    case "filterVar":
      return `filter_var(${convertedArgs})`;
    case "filesystemIterator":
      return `new FilesystemIterator(${convertedArgs}, FilesystemIterator::SKIP_DOTS)`;
    case "fpow":
      return `fpow(${convertedArgs})`;
    case "explode":
      return `explode(${convertedArgs})`;
    case "get":
      return phpSuperglobalRead("$_GET", args);
    case "getenv":
      return `getenv(${convertedArgs})`;
    case "gmdate":
      return `gmdate(${convertedArgs})`;
    case "gzinflate":
      return `gzinflate(${convertedArgs})`;
    case "glob":
      return `glob(${convertedArgs})`;
    case "graphemeStrSplit":
      return `grapheme_str_split(${convertedArgs})`;
    case "hash":
      return `hash(${convertedArgs})`;
    case "hashEquals":
      return `hash_equals(${convertedArgs})`;
    case "hashFile":
      return `hash_file(${convertedArgs})`;
    case "hashContextDebugInfo":
      return phpObjectMethod("__debugInfo", args);
    case "hasFiles":
      return `isset($_FILES[${convertArgumentList(args)}])`;
    case "hasPost":
      return `isset($_POST[${convertArgumentList(args)}])`;
    case "hasServer":
      return `isset($_SERVER[${convertArgumentList(args)}])`;
    case "hasSession":
      return `isset($_SESSION[${convertArgumentList(args)}])`;
    case "header":
      return `header(${convertedArgs})`;
    case "httpResponseCode":
      return `http_response_code(${convertedArgs})`;
    case "httpBuildQuery":
      return `http_build_query(${convertedArgs})`;
    case "httpClearLastResponseHeaders":
      return "http_clear_last_response_headers()";
    case "httpGetLastResponseHeaders":
      return "http_get_last_response_headers()";
    case "iniGet":
      return `ini_get(${convertedArgs})`;
    case "iniSet":
      return `ini_set(${convertedArgs})`;
    case "inArray":
      return `in_array(${convertedArgs})`;
    case "intlDateFormatterParseToCalendar":
      return phpObjectMethod("parseToCalendar", args);
    case "intlGregorianCalendarCreateFromDate":
      return `IntlGregorianCalendar::createFromDate(${convertedArgs})`;
    case "intlGregorianCalendarCreateFromDateTime":
      return `IntlGregorianCalendar::createFromDateTime(${convertedArgs})`;
    case "intlTimeZoneGetIanaId":
      return phpObjectMethod("getIanaID", args);
    case "intlCharCompatMathContinue":
      return "IntlChar::PROPERTY_ID_COMPAT_MATH_CONTINUE";
    case "intlCharCompatMathStart":
      return "IntlChar::PROPERTY_ID_COMPAT_MATH_START";
    case "intlCharIdsUnaryOperator":
      return "IntlChar::PROPERTY_IDS_UNARY_OPERATOR";
    case "intlDateFormatterPattern":
      return "IntlDateFormatter::PATTERN";
    case "intlNumberFormatterRoundHalfOdd":
      return "NumberFormatter::ROUND_HALFODD";
    case "inputBytes":
      return "file_get_contents('php://input')";
    case "isArray":
      return `is_array(${convertedArgs})`;
    case "isBool":
      return `is_bool(${convertedArgs})`;
    case "isDir":
      return `is_dir(${convertedArgs})`;
    case "isFile":
      return `is_file(${convertedArgs})`;
    case "isInt":
      return `is_int(${convertedArgs})`;
    case "isLink":
      return `is_link(${convertedArgs})`;
    case "isEmpty":
      return `empty(${convertedArgs})`;
    case "isNumeric":
      return `is_numeric(${convertedArgs})`;
    case "isReadable":
      return `is_readable(${convertedArgs})`;
    case "isSet":
      return `isset(${convertedArgs})`;
    case "isString":
      return `is_string(${convertedArgs})`;
    case "isUploadedFile":
      return `is_uploaded_file(${convertedArgs})`;
    case "isWritable":
      return `is_writable(${convertedArgs})`;
    case "ldapTlsProtocolMaxOption":
      return "LDAP_OPT_X_TLS_PROTOCOL_MAX";
    case "ldapTlsProtocolTls13":
      return "LDAP_OPT_X_TLS_PROTOCOL_TLS1_3";
    case "iteratorIsDir":
      return phpObjectMethod("isDir", args);
    case "iteratorIsFile":
      return phpObjectMethod("isFile", args);
    case "iteratorPathname":
      return phpObjectMethod("getPathname", args);
    case "jsonLastError":
      return `json_last_error(${convertedArgs})`;
    case "jsonLastErrorMsg":
      return `json_last_error_msg(${convertedArgs})`;
    case "jsonDecode":
      return `json_decode(${convertedArgs})`;
    case "ksort":
      return `ksort(${convertedArgs})`;
    case "jsonEncode": {
      const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
      if (parts.length <= 1) {
        return `json_encode(${convertedArgs}, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)`;
      }
      return `json_encode(${convertedArgs})`;
    }
    case "ltrim":
      return `ltrim(${convertedArgs})`;
    case "mbLcfirst":
      return `mb_lcfirst(${convertedArgs})`;
    case "mbLtrim":
      return `mb_ltrim(${convertedArgs})`;
    case "mbRtrim":
      return `mb_rtrim(${convertedArgs})`;
    case "mbTrim":
      return `mb_trim(${convertedArgs})`;
    case "mbUcfirst":
      return `mb_ucfirst(${convertedArgs})`;
    case "max":
      return `max(${convertedArgs})`;
    case "min":
      return `min(${convertedArgs})`;
    case "abs":
      return `abs(${convertedArgs})`;
    case "matchValue":
      return phpMatchValue(args);
    case "mkdir":
      return `mkdir(${convertedArgs})`;
    case "moveUploadedFile":
      return `move_uploaded_file(${convertedArgs})`;
    case "nl2br":
      return `nl2br(${convertedArgs})`;
    case "objectProp":
      return phpObjectProp(args);
    case "opensslPkeyGetDetails":
      return `openssl_pkey_get_details(${convertedArgs})`;
    case "opensslPkeyNew":
      return convertedArgs === "" ? "openssl_pkey_new()" : `openssl_pkey_new(${convertedArgs})`;
    case "opensslSign":
      return `openssl_sign(${convertedArgs})`;
    case "opensslVerify":
      return `openssl_verify(${convertedArgs})`;
    case "opensslPurposeOcspHelper":
      return "X509_PURPOSE_OCSP_HELPER";
    case "opensslPurposeTimestampSign":
      return "X509_PURPOSE_TIMESTAMP_SIGN";
    case "odbcClose":
      return `odbc_close(${convertedArgs})`;
    case "odbcConnect":
      return `odbc_connect(${convertedArgs})`;
    case "odbcError":
      return convertedArgs === "" ? "odbc_error()" : `odbc_error(${convertedArgs})`;
    case "odbcErrormsg":
      return convertedArgs === "" ? "odbc_errormsg()" : `odbc_errormsg(${convertedArgs})`;
    case "odbcExec":
      return `odbc_exec(${convertedArgs})`;
    case "odbcFetchArray":
      return `odbc_fetch_array(${convertedArgs})`;
    case "odbcFetchObject":
      return `odbc_fetch_object(${convertedArgs})`;
    case "odbcPconnect":
      return `odbc_pconnect(${convertedArgs})`;
    case "odbcPrepare":
      return `odbc_prepare(${convertedArgs})`;
    case "odbcExecute":
      return `odbc_execute(${convertedArgs})`;
    case "odbcResult":
      return `odbc_result(${convertedArgs})`;
    case "opcacheJitBlacklist":
      return `opcache_jit_blacklist(${convertedArgs})`;
    case "ord":
      return `ord(${convertedArgs})`;
    case "passwordArgon2Provider":
      return "PASSWORD_ARGON2_PROVIDER";
    case "passwordHash":
      return `password_hash(${convertedArgs})`;
    case "passwordVerify":
      return `password_verify(${convertedArgs})`;
    case "pathinfo":
      return `pathinfo(${convertedArgs})`;
    case "pcntlQosClass":
      return phpPcntlQosClass(args);
    case "pdo":
      return `new PDO(${convertedArgs})`;
    case "pdoBeginTransaction":
      return phpObjectMethod("beginTransaction", args);
    case "pdoConnect":
      return `PDO::connect(${convertedArgs})`;
    case "pdoCommit":
      return phpObjectMethod("commit", args);
    case "pdoExec":
      return phpObjectMethod("exec", args);
    case "pdoLastInsertId":
      return phpObjectMethod("lastInsertId", args);
    case "pdoPrepare":
      return phpObjectMethod("prepare", args);
    case "pdoQuery":
      return phpObjectMethod("query", args);
    case "pdoRollback":
      return phpObjectMethod("rollBack", args);
    case "pdoSetAttribute":
      return phpObjectMethod("setAttribute", args);
    case "pdoDbLibDriver":
      return `new Pdo\\DbLib(${convertedArgs})`;
    case "pdoFirebirdDriver":
      return `new Pdo\\Firebird(${convertedArgs})`;
    case "pdoMysqlDriver":
      return `new Pdo\\Mysql(${convertedArgs})`;
    case "pdoOdbcDriver":
      return `new Pdo\\Odbc(${convertedArgs})`;
    case "pdoPgsqlDriver":
      return `new Pdo\\Pgsql(${convertedArgs})`;
    case "pdoSqlite":
      return phpPdoSqlite(args);
    case "pdoSqliteDriver":
      return `new Pdo\\Sqlite(${convertedArgs})`;
    case "pdoStatementBindValue":
      return phpObjectMethod("bindValue", args);
    case "pdoStatementCloseCursor":
      return phpObjectMethod("closeCursor", args);
    case "pdoStatementExecute":
      return phpObjectMethod("execute", args);
    case "pdoStatementFetch":
      return phpObjectMethod("fetch", args);
    case "pdoStatementFetchAll":
      return phpObjectMethod("fetchAll", args);
    case "pdoStatementFetchColumn":
      return phpObjectMethod("fetchColumn", args);
    case "pdoStatementRowCount":
      return phpObjectMethod("rowCount", args);
    case "pcntlGetcpu":
      return "pcntl_getcpu()";
    case "pcntlGetcpuaffinity":
      return convertedArgs === "" ? "pcntl_getcpuaffinity()" : `pcntl_getcpuaffinity(${convertedArgs})`;
    case "pcntlGetqosClass":
      return "pcntl_getqos_class()";
    case "pcntlSetns":
      return `pcntl_setns(${convertedArgs})`;
    case "pcntlSetqosClass":
      return `pcntl_setqos_class(${convertedArgs})`;
    case "pcntlWaitid":
      return `pcntl_waitid(${convertedArgs})`;
    case "pdoPgsqlSetNoticeCallback":
      return phpObjectMethod("setNoticeCallback", args);
    case "pgChangePassword":
      return `pg_change_password(${convertedArgs})`;
    case "pgJit":
      return `pg_jit(${convertedArgs})`;
    case "pgPutCopyData":
      return `pg_put_copy_data(${convertedArgs})`;
    case "pgPutCopyEnd":
      return `pg_put_copy_end(${convertedArgs})`;
    case "pgResultMemorySize":
      return `pg_result_memory_size(${convertedArgs})`;
    case "pgSetChunkedRowsSize":
      return `pg_set_chunked_rows_size(${convertedArgs})`;
    case "pgSocketPoll":
      return `pg_socket_poll(${convertedArgs})`;
    case "post":
      return phpSuperglobalRead("$_POST", args);
    case "pregMatch":
      return `preg_match(${convertedArgs})`;
    case "pregSplit":
      return `preg_split(${convertedArgs})`;
    case "pregReplace":
      return `preg_replace(${convertedArgs})`;
    case "rawUrlEncode":
      return `rawurlencode(${convertedArgs})`;
    case "reflectionClassConstantIsDeprecated":
      return phpObjectMethod("isDeprecated", args);
    case "reflectionClassGetLazyInitializer":
      return phpObjectMethod("getLazyInitializer", args);
    case "reflectionClassInitializeLazyObject":
      return phpObjectMethod("initializeLazyObject", args);
    case "reflectionClassIsUninitializedLazyObject":
      return phpObjectMethod("isUninitializedLazyObject", args);
    case "reflectionClassMarkLazyObjectAsInitialized":
      return phpObjectMethod("markLazyObjectAsInitialized", args);
    case "reflectionClassNewLazyGhost":
      return phpObjectMethod("newLazyGhost", args);
    case "reflectionClassNewLazyProxy":
      return phpObjectMethod("newLazyProxy", args);
    case "reflectionClassResetAsLazyGhost":
      return phpObjectMethod("resetAsLazyGhost", args);
    case "reflectionClassResetAsLazyProxy":
      return phpObjectMethod("resetAsLazyProxy", args);
    case "reflectionGeneratorIsClosed":
      return phpObjectMethod("isClosed", args);
    case "reflectionPropertyIsDynamic":
      return phpObjectMethod("isDynamic", args);
    case "reflectionPropertyGetHook":
      return phpObjectMethod("getHook", args);
    case "reflectionPropertyGetHooks":
      return phpObjectMethod("getHooks", args);
    case "reflectionPropertyGetRawValue":
      return phpObjectMethod("getRawValue", args);
    case "reflectionPropertyGetSettableType":
      return phpObjectMethod("getSettableType", args);
    case "reflectionPropertyHasHook":
      return phpObjectMethod("hasHook", args);
    case "reflectionPropertyHasHooks":
      return phpObjectMethod("hasHooks", args);
    case "reflectionPropertyIsAbstract":
      return phpObjectMethod("isAbstract", args);
    case "reflectionPropertyIsFinal":
      return phpObjectMethod("isFinal", args);
    case "reflectionPropertyIsLazy":
      return phpObjectMethod("isLazy", args);
    case "reflectionPropertyIsPrivateSet":
      return phpObjectMethod("isPrivateSet", args);
    case "reflectionPropertyIsProtectedSet":
      return phpObjectMethod("isProtectedSet", args);
    case "reflectionPropertyIsVirtual":
      return phpObjectMethod("isVirtual", args);
    case "reflectionPropertyHookGet":
      return "PropertyHookType::Get";
    case "reflectionPropertyHookSet":
      return "PropertyHookType::Set";
    case "reflectionPropertySetRawValueWithoutLazyInitialization":
      return phpObjectMethod("setRawValueWithoutLazyInitialization", args);
    case "reflectionPropertySkipLazyInitialization":
      return phpObjectMethod("skipLazyInitialization", args);
    case "phpVersion":
      return "PHP_VERSION";
    case "randomBytes":
      return `random_bytes(${convertedArgs})`;
    case "rename":
      return `rename(${convertedArgs})`;
    case "requestParseBody":
      return convertedArgs === "" ? "request_parse_body()" : `request_parse_body(${convertedArgs})`;
    case "requestParseBodyException":
      return `new RequestParseBodyException(${convertedArgs})`;
    case "reflectionConstant":
      return `new ReflectionConstant(${convertedArgs})`;
    case "reflectionConstantGetName":
      return phpObjectMethod("getName", args);
    case "reflectionConstantGetValue":
      return phpObjectMethod("getValue", args);
    case "reflectionConstantIsDeprecated":
      return phpObjectMethod("isDeprecated", args);
    case "round":
      return `round(${convertedArgs})`;
    case "roundingMode":
      return phpRoundingMode(args);
    case "responseJson":
      return `echo json_encode(${convertedArgs}, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{"ok":false,"error":"JSON応答を生成できません。"}'`;
    case "rmdir":
      return `rmdir(${convertedArgs})`;
    case "rtrim":
      return `rtrim(${convertedArgs})`;
    case "scandir":
      return `scandir(${convertedArgs})`;
    case "server":
      return phpSuperglobalRead("$_SERVER", args);
    case "session":
      return phpSuperglobalRead("$_SESSION", args);
    case "soapSdl":
      return `new Soap\\Sdl(${convertedArgs})`;
    case "soapServerGetLastResponse":
      return phpObjectMethod("__getLastResponse", args);
    case "soapUrl":
      return `new Soap\\Url(${convertedArgs})`;
    case "sodiumAegis128LKeyBytes":
      return "SODIUM_CRYPTO_AEAD_AEGIS128L_KEYBYTES";
    case "sodiumAegis128LAuthBytes":
      return "SODIUM_CRYPTO_AEAD_AEGIS128L_ABYTES";
    case "sodiumAegis128LNonceBytes":
      return "SODIUM_CRYPTO_AEAD_AEGIS128L_NPUBBYTES";
    case "sodiumAegis128LSecretBytes":
      return "SODIUM_CRYPTO_AEAD_AEGIS128L_NSECBYTES";
    case "sodiumAegis128LDecrypt":
      return `sodium_crypto_aead_aegis128l_decrypt(${convertedArgs})`;
    case "sodiumAegis128LEncrypt":
      return `sodium_crypto_aead_aegis128l_encrypt(${convertedArgs})`;
    case "sodiumAegis128LKeygen":
      return "sodium_crypto_aead_aegis128l_keygen()";
    case "sodiumAegis256KeyBytes":
      return "SODIUM_CRYPTO_AEAD_AEGIS256_KEYBYTES";
    case "sodiumAegis256AuthBytes":
      return "SODIUM_CRYPTO_AEAD_AEGIS256_ABYTES";
    case "sodiumAegis256NonceBytes":
      return "SODIUM_CRYPTO_AEAD_AEGIS256_NPUBBYTES";
    case "sodiumAegis256SecretBytes":
      return "SODIUM_CRYPTO_AEAD_AEGIS256_NSECBYTES";
    case "sodiumAegis256Decrypt":
      return `sodium_crypto_aead_aegis256_decrypt(${convertedArgs})`;
    case "sodiumAegis256Encrypt":
      return `sodium_crypto_aead_aegis256_encrypt(${convertedArgs})`;
    case "sodiumAegis256Keygen":
      return "sodium_crypto_aead_aegis256_keygen()";
    case "sessionCookieParams":
      return `session_get_cookie_params(${convertedArgs})`;
    case "sessionDestroy":
      return `session_destroy(${convertedArgs})`;
    case "sessionName":
      return `session_name(${convertedArgs})`;
    case "sessionRegenerateId":
      return `session_regenerate_id(${convertedArgs})`;
    case "sessionSetCookieParams":
      return `session_set_cookie_params(${convertedArgs})`;
    case "sessionStart":
      return `session_start(${convertedArgs})`;
    case "sessionStatus":
      return `session_status(${convertedArgs})`;
    case "setCookie":
      return `setcookie(${convertedArgs})`;
    case "setSession":
      return phpSuperglobalWrite("$_SESSION", args);
    case "filesize":
      return `filesize(${convertedArgs})`;
    case "strtotime":
      return `strtotime(${convertedArgs})`;
    case "strlen":
      return `strlen(${convertedArgs})`;
    case "strcmp":
      return `strcmp(${convertedArgs})`;
    case "strtolower":
      return `strtolower(${convertedArgs})`;
    case "strrpos":
      return `strrpos(${convertedArgs})`;
    case "strStartsWith":
      return `str_starts_with(${convertedArgs})`;
    case "strEndsWith":
      return `str_ends_with(${convertedArgs})`;
    case "splObjectStorageSeek":
      return phpObjectMethod("seek", args);
    case "spoofcheckerSetAllowedChars":
      return phpObjectMethod("setAllowedChars", args);
    case "strIncrement":
      return `str_increment(${convertedArgs})`;
    case "streamBucket":
      return convertedArgs === "" ? "new StreamBucket()" : `new StreamBucket(${convertedArgs})`;
    case "streamBucketData":
      return phpObjectProperty("data", args);
    case "streamBucketDatalen":
      return phpObjectProperty("datalen", args);
    case "streamBucketSetData":
      return phpObjectPropertySet("data", args);
    case "strtoupper":
      return `strtoupper(${convertedArgs})`;
    case "substr":
      return `substr(${convertedArgs})`;
    case "strtok":
      return `strtok(${convertedArgs})`;
    case "sqlite3":
      return `new SQLite3(${convertedArgs})`;
    case "sqlite3BusyTimeout":
      return phpObjectMethod("busyTimeout", args);
    case "sqlite3Changes":
      return phpObjectMethod("changes", args);
    case "sqlite3Close":
      return phpObjectMethod("close", args);
    case "sqlite3EnableExceptions":
      return `SQLite3::enableExceptions(${convertedArgs})`;
    case "sqlite3EscapeString":
      return `SQLite3::escapeString(${convertedArgs})`;
    case "sqlite3Exec":
      return phpObjectMethod("exec", args);
    case "sqlite3LastErrorMsg":
      return phpObjectMethod("lastErrorMsg", args);
    case "sqlite3LastInsertRowId":
      return phpObjectMethod("lastInsertRowID", args);
    case "sqlite3Open":
      return phpObjectMethod("open", args);
    case "sqlite3Prepare":
      return phpObjectMethod("prepare", args);
    case "sqlite3Query":
      return phpObjectMethod("query", args);
    case "sqlite3QuerySingle":
      return phpObjectMethod("querySingle", args);
    case "sqlite3ResultFetchArray":
      return phpObjectMethod("fetchArray", args);
    case "sqlite3ResultFinalize":
      return phpObjectMethod("finalize", args);
    case "sqlite3StatementBindValue":
      return phpObjectMethod("bindValue", args);
    case "sqlite3StatementExecute":
      return phpObjectMethod("execute", args);
    case "sqlite3Version":
      return "SQLite3::version()";
    case "time":
      return `time(${convertedArgs})`;
    case "touch":
      return `touch(${convertedArgs})`;
    case "trim":
      return `trim(${convertedArgs})`;
    case "unsetPost":
      return `unset($_POST[${convertArgumentList(args)}])`;
    case "unsetSession":
      return `unset($_SESSION[${convertArgumentList(args)}])`;
    case "unpack":
      return `unpack(${convertedArgs})`;
    case "unlink":
      return `unlink(${convertedArgs})`;
    case "xmlReaderFromStream":
      return `XMLReader::fromStream(${convertedArgs})`;
    case "xmlReaderFromString":
      return `XMLReader::fromString(${convertedArgs})`;
    case "xmlReaderFromUri":
      return `XMLReader::fromUri(${convertedArgs})`;
    case "xmlWriterToMemory":
      return convertedArgs === "" ? "XMLWriter::toMemory()" : `XMLWriter::toMemory(${convertedArgs})`;
    case "xmlWriterToStream":
      return `XMLWriter::toStream(${convertedArgs})`;
    case "xmlWriterToUri":
      return `XMLWriter::toUri(${convertedArgs})`;
    case "tidyNodeGetNextSibling":
      return phpObjectMethod("getNextSibling", args);
    case "tidyNodeGetPreviousSibling":
      return phpObjectMethod("getPreviousSibling", args);
    case "xsltProcessorRegisterPhpFunctionNS":
      return phpObjectMethod("registerPhpFunctionNS", args);
    case "xsltProcessorMaxTemplateDepth":
      return phpObjectProperty("maxTemplateDepth", args);
    case "xsltProcessorMaxTemplateVars":
      return phpObjectProperty("maxTemplateVars", args);
    case "xsltProcessorSetMaxTemplateDepth":
      return phpObjectPropertySet("maxTemplateDepth", args);
    case "xsltProcessorSetMaxTemplateVars":
      return phpObjectPropertySet("maxTemplateVars", args);
    case "throwDomain":
      return `throw new DomainException(${convertedArgs})`;
    case "throwInvalidArgument":
      return `throw new InvalidArgumentException(${convertedArgs})`;
    case "throwLogic":
      return `throw new LogicException(${convertedArgs})`;
    case "throwRequestParseBody":
      return `throw new RequestParseBodyException(${convertedArgs})`;
    case "throwRuntime":
      return `throw new RuntimeException(${convertedArgs})`;
    case "throwUnexpectedValue":
      return `throw new UnexpectedValueException(${convertedArgs})`;
    case "toBool":
      return `(bool)(${convertedArgs})`;
    case "toFloat":
      return `(float)(${convertedArgs})`;
    case "toInt":
      return `(int)(${convertedArgs})`;
    case "toString":
      return `(string)(${convertedArgs})`;
    case "usortVersionDesc":
      return phpUsortVersionDesc(args);
    case "versionCompare":
      return `version_compare(${convertedArgs})`;
    case "zipAddFile":
      return phpObjectMethod("addFile", args);
    case "zipAddFromString":
      return phpObjectMethod("addFromString", args);
    case "zipArchive":
      return "new ZipArchive()";
    case "zipErrorTruncatedZip":
      return "ZipArchive::ER_TRUNCATED_ZIP";
    case "zipClose":
      return phpObjectMethod("close", args);
    case "zipExtractTo":
      return phpObjectMethod("extractTo", args);
    case "zipOpen":
      return phpZipOpen(args);
    default:
      return `Php.${method}(${args})`;
  }
}

function phpPcntlQosClass(args: string): string {
  const raw = splitTopLevelComma(args)[0]?.trim().replace(/^['"]|['"]$/g, "") ?? "Default";
  const allowed = new Set(["UserInteractive", "UserInitiated", "Default", "Utility", "Background"]);
  const mode = allowed.has(raw) ? raw : "Default";
  return `Pcntl\\QosClass::${mode}`;
}

function phpRoundingMode(args: string): string {
  const raw = splitTopLevelComma(args)[0]?.trim().replace(/^['"]|['"]$/g, "") ?? "HalfAwayFromZero";
  const allowed = new Set([
    "HalfAwayFromZero",
    "HalfTowardsZero",
    "HalfEven",
    "HalfOdd",
    "TowardsZero",
    "AwayFromZero",
    "NegativeInfinity",
    "PositiveInfinity",
  ]);
  const mode = allowed.has(raw) ? raw : "HalfAwayFromZero";
  return `RoundingMode::${mode}`;
}

function phpPdoSqlite(args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const path = parts[0] === undefined ? "':memory:'" : convertExpression(parts[0]);
  const username = parts[1] === undefined ? "null" : convertExpression(parts[1]);
  const password = parts[2] === undefined ? "null" : convertExpression(parts[2]);
  const options = parts[3] === undefined ? "[]" : convertExpression(parts[3]);
  return `new PDO('sqlite:' . ${path}, ${username}, ${password}, ${options})`;
}

function phpObjectMethod(method: string, args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "null" : convertExpression(parts[0]);
  const convertedArgs = parts.slice(1).map((arg) => convertExpression(arg)).join(", ");
  return `${target}->${method}(${convertedArgs})`;
}

function phpArrayPredicateHelper(functionName: string, args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "[]" : convertExpression(parts[0]);
  const callback = parts[1] === undefined ? "fn($value): bool => true" : convertArrowCallbackExpression(parts[1]);
  return `${functionName}(${target}, ${callback})`;
}

function convertArrowCallbackExpression(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)=,]+)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*([\s\S]+)$/);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return convertExpression(trimmed);
  }
  return `fn($${match[1]}): bool => ${convertExpression(match[2].trim())}`;
}

function phpArrayAppend(args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "$items" : convertExpression(parts[0]);
  const key = parts[1] === undefined ? "''" : convertExpression(parts[1]);
  const value = parts[2] === undefined ? "null" : convertExpression(parts[2]);
  return `${target}[${key}][] = ${value}`;
}

function phpArraySet(args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "$items" : convertExpression(parts[0]);
  const key = parts[1] === undefined ? "''" : convertExpression(parts[1]);
  const value = parts[2] === undefined ? "null" : convertExpression(parts[2]);
  return `${target}[${key}] = ${value}`;
}

function phpObjectProp(args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "null" : convertExpression(parts[0]);
  const propertyRaw = parts[1] === undefined ? "''" : parts[1].trim();
  const property = propertyRaw.replace(/^["']|["']$/g, "");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(property)) {
    return `${target}->{${convertExpression(propertyRaw)}}`;
  }
  return `${target}->${property}`;
}

function phpObjectProperty(property: string, args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "null" : convertExpression(parts[0]);
  return `${target}->${property}`;
}

function phpObjectPropertySet(property: string, args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "null" : convertExpression(parts[0]);
  const value = parts[1] === undefined ? "null" : convertExpression(parts[1]);
  return `${target}->${property} = ${value}`;
}

function phpZipOpen(args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
    const target = convertExpression(parts[0]);
    const path = convertExpression(parts[1]);
    const flags = parts[2] === undefined ? "0" : convertExpression(parts[2]);
    return `${target}->open(${path}, ${flags})`;
  }
  const path = parts[0] === undefined ? "''" : convertExpression(parts[0]);
  const flags = parts[1] === undefined ? "0" : convertExpression(parts[1]);
  return `(new ZipArchive())->open(${path}, ${flags})`;
}

function phpUsortVersionDesc(args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "$items" : convertExpression(parts[0]);
  const key = parts[1] === undefined ? "'version'" : convertExpression(parts[1]);
  return `usort(${target}, fn(array $a, array $b): int => version_compare((string)($b[${key}] ?? ''), (string)($a[${key}] ?? '')))`;
}

function phpMatchValue(args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "null" : convertExpression(parts[0]);
  const cases = parts[1] ?? "{}";
  if (!/^\{[\s\S]*\}$/.test(cases)) {
    return `match (${target}) { default => null }`;
  }
  const body = cases.slice(1, -1).trim();
  if (body === "") {
    return `match (${target}) { default => null }`;
  }
  const arms = splitTopLevelComma(body).map((entry) => entry.trim()).filter((entry) => entry !== "").map((entry) => {
    const match = entry.match(/^\s*(\[[\s\S]+\]|[A-Za-z_][A-Za-z0-9_]*|["'][^"']+["'])\s*:\s*([\s\S]+)\s*$/);
    if (match === null || match[1] === undefined || match[2] === undefined) {
      return `default => ${convertExpression(entry.trim())}`;
    }
    return `${phpMatchKey(match[1])} => ${convertMatchArmExpression(match[2].trim())}`;
  });
  return `match (${target}) { ${arms.join(", ")} }`;
}

function convertMatchArmExpression(value: string): string {
  const invalidArgument = value.match(/^Php\.throwInvalidArgument\(([\s\S]*)\)$/);
  if (invalidArgument !== null && invalidArgument[1] !== undefined) {
    return `throw new InvalidArgumentException(${convertArgumentList(invalidArgument[1])})`;
  }
  const runtime = value.match(/^Php\.throwRuntime\(([\s\S]*)\)$/);
  if (runtime !== null && runtime[1] !== undefined) {
    return `throw new RuntimeException(${convertArgumentList(runtime[1])})`;
  }
  return convertExpression(value);
}

function phpMatchKey(value: string): string {
  const key = value.trim();
  if (key === "default") {
    return "default";
  }
  if (/^\[[\s\S]*\]$/.test(key)) {
    const entries = splitTopLevelComma(key.slice(1, -1)).map((entry) => entry.trim()).filter((entry) => entry !== "");
    return entries.map((entry) => convertExpression(entry)).join(", ");
  }
  if (/^["']/.test(key)) {
    return convertExpression(key);
  }
  return `"${key}"`;
}

function phpSuperglobalRead(superglobal: string, args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const key = parts[0] === undefined ? "''" : convertExpression(parts[0]);
  const defaultValue = parts[1] === undefined ? "null" : convertExpression(parts[1]);
  return `(${superglobal}[${key}] ?? ${defaultValue})`;
}

function phpSuperglobalWrite(superglobal: string, args: string): string {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const key = parts[0] === undefined ? "''" : convertExpression(parts[0]);
  const value = parts[1] === undefined ? "null" : convertExpression(parts[1]);
  return `${superglobal}[${key}] = ${value}`;
}

function replaceOutsideStringLiterals(
  value: string,
  pattern: RegExp,
  replacer: (...args: unknown[]) => string,
): string {
  let output = "";
  let segment = "";
  let quote = "";
  let index = 0;
  const flush = (): void => {
    output += segment.replace(pattern, (...args: unknown[]) => replacer(...args));
    segment = "";
  };

  while (index < value.length) {
    const char = value[index] ?? "";
    if (quote !== "") {
      output += char;
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      flush();
      quote = char;
      output += char;
      index += 1;
      continue;
    }
    segment += char;
    index += 1;
  }
  flush();
  return output;
}

function convertIdentifiersInExpression(value: string): string {
  const reserved = new Set([
    "true",
    "false",
    "null",
    "new",
    "self",
    "echo",
    "exit",
    "instanceof",
    "match",
    "throw",
    "string",
    "int",
    "float",
    "bool",
    "array",
    "object",
    "mixed",
    "DATE_ATOM",
    "JSON_UNESCAPED_UNICODE",
    "JSON_PRETTY_PRINT",
    "JSON_UNESCAPED_SLASHES",
    "JSON_ERROR_NONE",
    "LOCK_EX",
    "PASSWORD_DEFAULT",
    "PATHINFO_EXTENSION",
    "PHP_SESSION_ACTIVE",
    "ENT_QUOTES",
    "ENT_SUBSTITUTE",
    "FILTER_VALIDATE_URL",
    "FILTER_VALIDATE_EMAIL",
    "UPLOAD_ERR_NO_FILE",
    "PHP_VERSION",
  ]);
  if (/^new\s+[A-Za-z_][A-Za-z0-9_]*(?:\\[A-Za-z_][A-Za-z0-9_]*)*\(/.test(value)) {
    return value;
  }
  let output = "";
  let index = 0;
  let quote = "";
  while (index < value.length) {
    const char = value[index] ?? "";
    if (quote !== "") {
      output += char;
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      output += char;
      index += 1;
      continue;
    }
    const rest = value.slice(index);
    const match = rest.match(/^\b([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (match === null || match[1] === undefined) {
      output += char;
      index += 1;
      continue;
    }
    const name = match[1];
    const before = value.slice(0, index);
    const after = value.slice(index + name.length);
    const previous = value.slice(Math.max(0, index - 1), index);
    if (reserved.has(name) || /\binstanceof\s+$/.test(before) || previous === "$" || previous === ">" || previous === ":" || /^\s*(?:\(|=>|->|::)/.test(after)) {
      output += name;
    } else {
      output += `$${name}`;
    }
    index += name.length;
  }
  return output;
}

function convertExpression(value: string): string {
  const trimmed = value.trim();
  const ternary = convertTernaryExpression(trimmed);
  if (ternary !== null) {
    return ternary;
  }
  const concatenation = convertStringConcatenation(trimmed);
  if (concatenation !== null) {
    return concatenation;
  }
  const functional = convertWholeArrayFunctionalExpression(trimmed);
  if (functional !== null) {
    return functional;
  }
  const literal = convertLiteralExpression(value.trim());
  if (literal !== null) {
    return literal;
  }
    return value
    .replace(/\bthis\./g, "$this->")
    .replace(/(?<![.>])\b(serverSideClient|serverSide)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)\n]*)\)/g, (_match, target, method, args) => `$${target}->${method}(${convertArgumentList(String(args))})`)
    .replace(/\?\./g, "?->")
    .replace(/\btypeof\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*|\[[^\]\n]+\])?)\s*(===|!==)\s*["'](string|number|boolean|object|undefined)["']/g, (_match, target, operator, typeName) => {
      return convertTypeofComparison(String(target), String(operator), String(typeName));
    })
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*|\[[^\]\n]+\])?)\s+instanceof\s+([A-Z][A-Za-z0-9_]*)/g, (_match, target, className) => {
      return `${convertExpression(String(target))} instanceof ${className}`;
    })
    .replace(/^[\s\S]*$/, (expression) => replaceStaticFunctionCalls(String(expression)))
    .replace(/^[\s\S]*$/, (expression) => replaceStaticFunctionResultStringMethods(String(expression)))
    .replace(/(?<!\$)\b([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\.(trim|toUpperCase|toLowerCase|split|replace|startsWith|endsWith)\(([^)]*)\)/g, (_match, target, index, method, args) => {
      return convertStringMethod(`$${target}[${convertExpression(String(index).trim())}]`, String(method), String(args));
    })
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([A-Za-z_][A-Za-z0-9_]*)\.trim\(\)\.(toUpperCase|toLowerCase)\(\)/g, (_match, target, method) => {
      return convertStringMethod(convertStringMethod(String(target), "trim", ""), String(method), "");
    })
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([A-Za-z_][A-Za-z0-9_]*)\.(trim|toUpperCase|toLowerCase|split|replace|startsWith|endsWith)\(([^)]*)\)/g, (_match, target, method, args) => {
      return convertStringMethod(String(target), String(method), String(args));
    })
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([a-z_][A-Za-z0-9_]*[A-Z][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, target, method, args) => {
      return `$${target}->${method}(${convertArgumentList(String(args))})`;
    })
    .replace(/\bPhp\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, method, args) => {
      return convertPhpHelper(String(method), String(args));
    })
    .replace(/(?<![A-Za-z0-9_>$])\b([A-Z][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, className, method, args) => {
      return `${className}::${method}(${convertArgumentList(String(args))})`;
    })
    .replace(/\b([A-Z][A-Za-z0-9_]*::[A-Za-z_][A-Za-z0-9_]*\([^\n()]*\))\.([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*\()/g, (_match, call, property) => {
      return `${call}->${property}`;
    })
    .replace(/\b([A-Z][A-Za-z0-9_]*)\.([A-Z][A-Z0-9_]*)\b/g, (_match, className, constant) => {
      return `${className}::${constant}`;
    })
    .replace(/\bself\.([A-Z][A-Z0-9_]*)\b/g, (_match, constant) => {
      return `self::${constant}`;
    })
    .replace(/\bself\.([a-z_][A-Za-z0-9_]*)\b(?!\s*\()/g, (_match, property) => {
      return `self::$${property}`;
    })
    .replace(/\b([A-Z][A-Za-z0-9_]*)\.([a-z_][A-Za-z0-9_]*)\b(?!\s*\()/g, (_match, className, property) => {
      return `${className}::$${property}`;
    })
    .replace(/^[\s\S]*$/, (expression) => replaceStringCastResultMethods(String(expression)))
    .replace(/(\(string\)\(\([^;\n]+\)\))\.(trim|toUpperCase|toLowerCase)\(([^)]*)\)/g, (_match, target, method, methodArgs) => {
      return convertStringMethod(String(target), String(method), String(methodArgs));
    })
    .replace(/(?<!\\)\bString\(([^)]*)\)\.(trim|toUpperCase|toLowerCase)\(([^)]*)\)/g, (_match, args, method, methodArgs) => {
      return convertStringMethod(convertCastHelper("String", String(args)), String(method), String(methodArgs));
    })
    .replace(/(?<!\\)\b(String|Number|Boolean|parseInt|parseFloat)\(([^)]*)\)/g, (_match, helper, args) => {
      return convertCastHelper(String(helper), String(args));
    })
    .replace(/(?<!\$)\b([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]/g, (_match, target, index) => {
      return convertIndexAccess(`${target}[${String(index).trim()}]`);
    })
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.map\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)?\s*=>\s*([^)]+?)\s*\)/g, (_match, array, item, expression) => {
      return `array_map(fn($${item}) => ${convertExpression(String(expression).trim())}, $${array})`;
    })
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.filter\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)?\s*=>\s*([^)]+?)\s*\)/g, (_match, array, item, expression) => {
      return `array_values(array_filter($${array}, fn($${item}) => ${convertExpression(String(expression).trim())}))`;
    })
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.(some|every|find|findIndex)\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)?\s*=>\s*([^)]+?)\s*\)/g, (_match, array, method, item, expression) => {
      return convertArrayPredicateCall(String(array), String(method), String(item), String(expression));
    })
    .replace(/\b([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\.(trim|toUpperCase|toLowerCase|split|replace)\(([^)]*)\)/g, (_match, target, property, method, args) => {
      return convertStringMethod(`$${target}->${property}`, String(method), String(args));
    })
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*)\.(trim|toUpperCase|toLowerCase|split|replace|startsWith|endsWith)\(([^)]*)\)/g, (_match, property, method, args) => {
      return convertStringMethod(`$this->${property}`, String(method), String(args));
    })
    .replace(/\b([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\.(startsWith|endsWith)\(([^)]*)\)/g, (_match, target, property, method, args) => {
      return convertStringMethod(`$${target}->${property}`, String(method), String(args));
    })
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([A-Za-z_][A-Za-z0-9_]*)\.trim\(\)\.(toUpperCase|toLowerCase)\(\)/g, (_match, target, method) => {
      return convertStringMethod(convertStringMethod(String(target), "trim", ""), String(method), "");
    })
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([A-Za-z_][A-Za-z0-9_]*)\.(trim|toUpperCase|toLowerCase|split|replace|startsWith|endsWith)\(([^)]*)\)/g, (_match, target, method, args) => {
      return convertStringMethod(String(target), String(method), String(args));
    })
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.slice\(([^)]*)\)/g, (_match, target, args) => convertSlice(String(target), String(args)))
    .replace(/(\$this->[A-Za-z_][A-Za-z0-9_]*\([^)]*\)|\$[a-z_][A-Za-z0-9_]*->[A-Za-z_][A-Za-z0-9_]*\([^)]*\)|[A-Z][A-Za-z0-9_]*::[A-Za-z_][A-Za-z0-9_]*\([^)]*\))\.length\b/g, (_match, call) => {
      return `count(${call})`;
    })
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*)\.length\b/g, (_match, property) => convertLength(`$this->${property}`))
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.length\b/g, (_match, name) => convertLength(String(name)))
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.includes\(([^)]+)\)/g, (_match, array, needle) => {
      return convertIncludes(String(array), String(needle));
    })
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.join\(([^)]+)\)/g, (_match, array, separator) => {
      return `implode(${String(separator).trim()}, $${array})`;
    })
    .replace(/\(new\s+([A-Z][A-Za-z0-9_]*)\(([^)]*)\)\)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, className, constructorArgs, method, methodArgs) => {
      return `(new ${className}(${convertArgumentList(String(constructorArgs))}))->${method}(${convertArgumentList(String(methodArgs))})`;
    })
    .replace(/^[\s\S]*$/, (expression) => replaceNewClassExpressions(String(expression)))
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, chain, method, args) => {
      return `$this->${String(chain).replace(/\./g, "->")}->${method}(${convertArgumentList(String(args))})`;
    })
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*(?:->[A-Za-z_][A-Za-z0-9_]*)+)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, chain, method, args) => {
      return `$this->${chain}->${method}(${convertArgumentList(String(args))})`;
    })
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, property, method, args) => {
      return `$this->${property}->${method}(${convertArgumentList(String(args))})`;
    })
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, method, args) => {
      return `$this->${method}(${convertArgumentList(String(args))})`;
    })
    .replace(/\b([a-z_][A-Za-z0-9_]*)\.getMessage\(\)/g, (_match, target) => {
      return `$${target}->getMessage()`;
    })
    .replace(/\b([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, target, method, args) => {
      return `$${target}->${method}(${convertArgumentList(String(args))})`;
    })
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+)\b(?!\s*\()/g, (_match, chain) => {
      return `$this->${String(chain).replace(/\./g, "->")}`;
    })
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*(?:->[A-Za-z_][A-Za-z0-9_]*)+)\.([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*\()/g, (_match, chain, property) => {
      return `$this->${chain}->${property}`;
    })
    .replace(/->([a-z_][A-Za-z0-9_]*)::([A-Za-z_][A-Za-z0-9_]*)\(/g, (_match, property, method) => {
      return `->${property}->${method}(`;
    })
    .replace(/^.*$/, (expression) => replaceOutsideStringLiterals(String(expression), /(?<![\$>\'":/])\b([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*\()/g, (_match, target, property) => {
      return `$${target}->${property}`;
    }))
    .replace(/(.+)\s+\?\?\s+(.+)/g, (_match, left, right) => `${convertExpression(String(left).trim())} ?? ${convertExpression(String(right).trim())}`)
    .replace(/^.*$/, (expression) => convertIdentifiersInExpression(expression))
    .replace(/\$\$([A-Za-z_][A-Za-z0-9_]*->)/g, "$$$1");
}

function convertPhpMatchValueCalls(text: string): string {
  let output = "";
  let index = 0;
  const needle = "Php.matchValue(";
  while (index < text.length) {
    const start = text.indexOf(needle, index);
    if (start === -1) {
      output += text.slice(index);
      break;
    }
    const open = start + needle.length - 1;
    const close = findMatchingParen(text, open);
    if (close === null) {
      output += text.slice(index);
      break;
    }
    output += text.slice(index, start);
    output += phpMatchValue(text.slice(open + 1, close));
    index = close + 1;
  }
  return output;
}

function convertResidualThrowHelpers(text: string): string {
  return text
    .replace(/Php\.throwInvalidArgument\(([^()\n]*)\)/g, (_match, args) => {
      return `throw new InvalidArgumentException(${convertArgumentList(String(args))})`;
    })
    .replace(/Php\.throwRuntime\(([^()\n]*)\)/g, (_match, args) => {
      return `throw new RuntimeException(${convertArgumentList(String(args))})`;
    });
}

function convertTernaryExpression(value: string): string | null {
  let depth = 0;
  let quote = "";
  let question = -1;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? "";
    if (quote !== "") {
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      continue;
    }
    if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
      continue;
    }
    if (depth === 0 && char === "?" && value[index + 1] !== "?" && value[index + 1] !== "." && value[index - 1] !== "?") {
      question = index;
      break;
    }
  }
  if (question === -1) {
    return null;
  }
  depth = 0;
  quote = "";
  for (let index = question + 1; index < value.length; index += 1) {
    const char = value[index] ?? "";
    if (quote !== "") {
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      continue;
    }
    if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
      continue;
    }
    if (depth === 0 && char === ":") {
      const condition = value.slice(0, question).trim();
      const whenTrue = value.slice(question + 1, index).trim();
      const whenFalse = value.slice(index + 1).trim();
      if (condition === "" || whenTrue === "" || whenFalse === "") {
        return null;
      }
      return `${convertExpression(condition)} ? ${convertExpression(whenTrue)} : ${convertExpression(whenFalse)}`;
    }
  }
  return null;
}

function convertStringConcatenation(value: string): string | null {
  const parts = splitTopLevelOperator(value, "+");
  if (parts.length < 2 || !parts.some((part) => /^["']/.test(part.trim()))) {
    return null;
  }
  return parts.map((part) => convertExpression(part.trim())).join(" . ");
}

function splitTopLevelOperator(value: string, operator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? "";
    if (quote !== "") {
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[" || char === "{" || char === "(") {
      depth += 1;
      continue;
    }
    if (char === "]" || char === "}" || char === ")") {
      depth -= 1;
      continue;
    }
    if (char === operator && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function convertCastHelper(helper: string, args: string): string {
  const firstArg = splitTopLevelComma(args)[0]?.trim() ?? "";
  const value = convertExpression(firstArg);
  switch (helper) {
    case "String":
      return `(string)(${value})`;
    case "Number":
    case "parseFloat":
      return `(float)(${value})`;
    case "Boolean":
      return `(bool)(${value})`;
    case "parseInt":
      return `(int)(${value})`;
    default:
      return `${helper}(${args})`;
  }
}

function replaceStaticFunctionCalls(value: string): string {
  const namespaces = new Set(["Math", "JSON", "Object", "Array", "Number", "Date", "Php"]);
  let output = "";
  let index = 0;
  let quote = "";
  while (index < value.length) {
    const char = value[index] ?? "";
    if (quote !== "") {
      output += char;
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      output += char;
      index += 1;
      continue;
    }
    const match = value.slice(index).match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(/);
    if (match === null || match[1] === undefined || match[2] === undefined) {
      output += char;
      index += 1;
      continue;
    }
    const argsStart = index + match[0].length;
    const argsEnd = findMatchingParen(value, argsStart - 1);
    if (argsEnd === null) {
      output += char;
      index += 1;
      continue;
    }
    const args = value.slice(argsStart, argsEnd);
    if (namespaces.has(match[1])) {
      output += convertStaticFunction(match[1], match[2], args);
    } else if (/^[A-Z]/.test(match[1])) {
      output += `${match[1]}::${match[2]}(${convertArgumentList(args)})`;
    } else {
      output += value.slice(index, argsEnd + 1);
      index = argsEnd + 1;
      continue;
    }
    index = argsEnd + 1;
  }
  return output;
}

function replaceStaticFunctionResultStringMethods(value: string): string {
  const stringMethods = new Set(["trim", "toUpperCase", "toLowerCase", "split", "replace", "startsWith", "endsWith"]);
  let output = "";
  let index = 0;
  let quote = "";
  while (index < value.length) {
    const char = value[index] ?? "";
    if (quote !== "") {
      output += char;
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      output += char;
      index += 1;
      continue;
    }
    const callMatch = value.slice(index).match(/^([A-Z][A-Za-z0-9_]*::[A-Za-z_][A-Za-z0-9_]*)\(/);
    if (callMatch === null || callMatch[1] === undefined) {
      output += char;
      index += 1;
      continue;
    }
    const callOpen = index + callMatch[0].length - 1;
    const callClose = findMatchingParen(value, callOpen);
    if (callClose === null) {
      output += char;
      index += 1;
      continue;
    }
    const tail = value.slice(callClose + 1);
    const methodMatch = tail.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\(/);
    if (methodMatch === null || methodMatch[1] === undefined || !stringMethods.has(methodMatch[1])) {
      output += value.slice(index, callClose + 1);
      index = callClose + 1;
      continue;
    }
    const methodOpen = callClose + 1 + methodMatch[0].length - 1;
    const methodClose = findMatchingParen(value, methodOpen);
    if (methodClose === null) {
      output += value.slice(index, callClose + 1);
      index = callClose + 1;
      continue;
    }
    const call = value.slice(index, callClose + 1);
    const methodArgs = value.slice(methodOpen + 1, methodClose);
    output += convertStringMethod(call, methodMatch[1], methodArgs);
    index = methodClose + 1;
  }
  return output;
}

function replaceStringCastResultMethods(value: string): string {
  const stringMethods = new Set(["trim", "toUpperCase", "toLowerCase", "split", "replace", "startsWith", "endsWith"]);
  let output = "";
  let index = 0;
  let quote = "";
  while (index < value.length) {
    const char = value[index] ?? "";
    if (quote !== "") {
      output += char;
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      output += char;
      index += 1;
      continue;
    }
    if (!value.slice(index).startsWith("String(")) {
      output += char;
      index += 1;
      continue;
    }
    const callOpen = index + "String".length;
    const callClose = findMatchingParen(value, callOpen);
    if (callClose === null) {
      output += char;
      index += 1;
      continue;
    }
    const tail = value.slice(callClose + 1);
    const methodMatch = tail.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\(/);
    if (methodMatch === null || methodMatch[1] === undefined || !stringMethods.has(methodMatch[1])) {
      output += value.slice(index, callClose + 1);
      index = callClose + 1;
      continue;
    }
    const methodOpen = callClose + 1 + methodMatch[0].length - 1;
    const methodClose = findMatchingParen(value, methodOpen);
    if (methodClose === null) {
      output += value.slice(index, callClose + 1);
      index = callClose + 1;
      continue;
    }
    const castArgs = value.slice(callOpen + 1, callClose);
    const methodArgs = value.slice(methodOpen + 1, methodClose);
    output += convertStringMethod(convertCastHelper("String", castArgs), methodMatch[1], methodArgs);
    index = methodClose + 1;
  }
  return output;
}

function replaceNewClassExpressions(value: string): string {
  let output = "";
  let index = 0;
  let quote = "";
  while (index < value.length) {
    const char = value[index] ?? "";
    if (quote !== "") {
      output += char;
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      output += char;
      index += 1;
      continue;
    }
    const match = value.slice(index).match(/^new\s+([A-Z][A-Za-z0-9_]*(?:\\[A-Z][A-Za-z0-9_]*)*)\(/);
    if (match === null || match[1] === undefined) {
      output += char;
      index += 1;
      continue;
    }
    const open = index + match[0].length - 1;
    const close = findMatchingParen(value, open);
    if (close === null) {
      output += char;
      index += 1;
      continue;
    }
    const args = value.slice(open + 1, close);
    output += `new ${match[1]}(${convertArgumentList(args)})`;
    index = close + 1;
  }
  return output;
}

function convertLength(target: string): string {
  if (target.startsWith("$this->")) {
    return `count(${target})`;
  }
  if (target.endsWith("s") || ["values", "items", "list", "array", "keys", "entries"].includes(target)) {
    return `count($${target})`;
  }
  return `strlen($${target})`;
}

function restorePhpConstants(text: string): string {
  return text.replace(/\$(DATE_ATOM|JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_ERROR_NONE|LOCK_EX|PASSWORD_DEFAULT|PASSWORD_ARGON2I|PASSWORD_ARGON2ID|PASSWORD_ARGON2_PROVIDER|PATHINFO_EXTENSION|PHP_SESSION_ACTIVE|ENT_QUOTES|ENT_SUBSTITUTE|FILTER_VALIDATE_URL|FILTER_VALIDATE_EMAIL|UPLOAD_ERR_NO_FILE|PHP_VERSION|PHP_OUTPUT_HANDLER_PROCESSED|PHP_SBINDIR|SQLITE3_[A-Z0-9_]+|CURLOPT_[A-Z0-9_]+|CURLINFO_[A-Z0-9_]+|CURLOPT_PREREQFUNCTION|CURLOPT_DEBUGFUNCTION|CURLOPT_SERVER_RESPONSE_TIMEOUT|CURL_HTTP_VERSION_[A-Z0-9_]+|CURL_PREREQFUNC_[A-Z0-9_]+|LDAP_OPT_[A-Z0-9_]+|LIBXML_[A-Z0-9_]+|MYSQLI_TYPE_VECTOR|X509_PURPOSE_[A-Z0-9_]+|OPENSSL_KEYTYPE_[A-Z0-9_]+|OPENSSL_ALGO_[A-Z0-9_]+|SIGCKPTEXIT|SIGCKPT|WEXITED|WSTOPPED|WNOWAIT|P_ALL|P_PID|P_PGID|P_PIDFD|P_UID|P_GID|P_SID|P_JAILID|PGSQL_TUPLES_CHUNK|POSIX_SC_[A-Z0-9_]+|SO_[A-Z0-9_]+|SOCK_[A-Z0-9_]+|TCP_[A-Z0-9_]+|IP_PORTRANGE(?:_[A-Z0-9_]+)?|SODIUM_CRYPTO_AEAD_AEGIS[A-Z0-9_]+|T_PUBLIC_SET|T_PROTECTED_SET|T_PRIVATE_SET|XML_OPTION_PARSE_HUGE|ZipArchive::ER_TRUNCATED_ZIP|RoundingMode::[A-Za-z0-9_]+|Pcntl\\QosClass::[A-Za-z0-9_]+|PropertyHookType::[A-Za-z0-9_]+|IntlDateFormatter::[A-Za-z0-9_]+|IntlChar::[A-Za-z0-9_]+|NumberFormatter::[A-Za-z0-9_]+|Soap\\[A-Za-z0-9_]+|Dom\\[A-Za-z0-9_]+|Pdo\\[A-Za-z0-9_]+|BcMath\\Number|Deprecated|RequestParseBodyException|StreamBucket)\b/g, "$1");
}

function convertTypeofComparison(target: string, operator: string, typeName: string): string {
  const value = convertExpression(target);
  const negated = operator === "!==";
  switch (typeName) {
    case "string":
      return negated ? `!is_string(${value})` : `is_string(${value})`;
    case "boolean":
      return negated ? `!is_bool(${value})` : `is_bool(${value})`;
    case "object":
      return negated ? `!is_array(${value})` : `is_array(${value})`;
    case "undefined":
      return negated ? `${value} !== null` : `${value} === null`;
    case "number":
      return negated ? `(!is_int(${value}) && !is_float(${value}))` : `(is_int(${value}) || is_float(${value}))`;
    default:
      return `${value} ${operator} "${typeName}"`;
  }
}

function convertIndexAccess(value: string): string {
  return value.replace(/(?<!\$)\b([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]/g, (_match, target, index) => {
    return `$${target}[${convertExpression(String(index).trim())}]`;
  });
}

function convertLiteralExpression(value: string): string | null {
  if (/^\[[\s\S]*\]$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    if (inner === "") {
      return "[]";
    }
    const entries = splitTopLevelComma(inner).map((entry) => entry.trim());
    if (entries.some((entry) => entry.startsWith("..."))) {
      const segments = entries.map((entry) => entry.startsWith("...")
        ? convertExpression(entry.slice(3).trim())
        : `[${convertExpression(entry)}]`);
      return `array_merge(${segments.join(", ")})`;
    }
    return `[${entries.map((entry) => convertExpression(entry)).join(", ")}]`;
  }
  if (/^\{[\s\S]*\}$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    if (inner === "") {
      return "[]";
    }
    const rawEntries = splitTopLevelComma(inner).map((entry) => entry.trim());
    const entries = rawEntries.map((entry) => {
      if (entry.startsWith("...")) {
        return convertExpression(entry.slice(3).trim());
      }
      const keyed = entry.match(/^\s*([A-Za-z_][A-Za-z0-9_]*|["'][^"']+["'])\s*:\s*([\s\S]+)\s*$/);
      const phpKeyed = entry.match(/^\s*([A-Za-z_][A-Za-z0-9_]*|["'][^"']+["'])\s*=>\s*([\s\S]+)\s*$/);
      const shorthand = entry.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/);
      const effectiveKeyed = keyed ?? phpKeyed;
      if (effectiveKeyed !== null && effectiveKeyed[1] !== undefined && effectiveKeyed[2] !== undefined) {
        const rawKey = effectiveKeyed[1].trim();
        const key = /^["']/.test(rawKey) ? convertExpression(rawKey) : `'${rawKey}'`;
        const value = convertExpression(effectiveKeyed[2].trim());
        return rawEntries.some((rawEntry) => rawEntry.startsWith("..."))
          ? `[${key} => ${value}]`
          : `${key} => ${value}`;
      }
      if (shorthand !== null && shorthand[1] !== undefined) {
        const key = `'${shorthand[1]}'`;
        const value = convertExpression(shorthand[1]);
        return rawEntries.some((rawEntry) => rawEntry.startsWith("..."))
          ? `[${key} => ${value}]`
          : `${key} => ${value}`;
      }
      return convertExpression(entry.trim());
    });
    if (rawEntries.some((entry) => entry.startsWith("..."))) {
      return `array_merge(${entries.join(", ")})`;
    }
    return `[${entries.join(", ")}]`;
  }
  return null;
}

function splitTopLevelComma(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote !== "") {
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[" || char === "{" || char === "(") {
      depth += 1;
      continue;
    }
    if (char === "]" || char === "}" || char === ")") {
      depth -= 1;
      continue;
    }
    if (char === "," && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function convertWholeArrayFunctionalExpression(value: string): string | null {
  const reduce = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\.reduce\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)?\s*=>\s*([^,\n)]+)(?:,\s*(.+))?\)$/);
  if (reduce !== null && reduce[1] !== undefined && reduce[2] !== undefined && reduce[3] !== undefined && reduce[4] !== undefined) {
    return convertArrayReduceCall(reduce[1], reduce[2], reduce[3], reduce[4], reduce[5] ?? null);
  }
  const match = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\.(map|filter|some|every|find|findIndex)\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)?\s*=>\s*(.+)\)$/);
  if (match === null) {
    return null;
  }
  const [, array, method, item, expression] = match;
  if (array === undefined || method === undefined || item === undefined || expression === undefined) {
    return null;
  }
  const convertedExpression = convertExpression(expression.trim());
  if (method === "map") {
    return `array_map(fn($${item}) => ${convertedExpression}, $${array})`;
  }
  if (method === "filter") {
    return `array_values(array_filter($${array}, fn($${item}) => ${convertedExpression}))`;
  }
  return convertArrayPredicateCall(array, method, item, expression);
}

function convertArrayReduceCall(array: string, carry: string, item: string, expression: string, initial: string | null): string {
  const callback = `fn($${carry}, $${item}) => ${convertExpression(expression.trim())}`;
  if (initial === null || initial.trim() === "") {
    return `array_reduce($${array}, ${callback})`;
  }
  return `array_reduce($${array}, ${callback}, ${convertExpression(initial.trim())})`;
}

function convertSortComparator(left: string, right: string, expression: string): string {
  const normalized = normalizeArrowExpression(expression);
  const simpleSubtract = expression.match(new RegExp(`^${left}\\.([A-Za-z_][A-Za-z0-9_]*)\\s*-\\s*${right}\\.([A-Za-z_][A-Za-z0-9_]*)$`));
  if (simpleSubtract !== null && simpleSubtract[1] !== undefined && simpleSubtract[2] !== undefined) {
    return `$${left}['${simpleSubtract[1]}'] <=> $${right}['${simpleSubtract[2]}']`;
  }
  const spaceship = normalized.match(new RegExp(`^(${left}|${right})(?:\\.([A-Za-z_][A-Za-z0-9_]*)|\\[([^\\]\\n]+)\\])\\s*<=>\\s*(${left}|${right})(?:\\.([A-Za-z_][A-Za-z0-9_]*)|\\[([^\\]\\n]+)\\])$`));
  if (spaceship !== null && spaceship[1] !== undefined && spaceship[4] !== undefined) {
    return `${phpComparatorAccess(spaceship[1], spaceship[2] ?? spaceship[3])} <=> ${phpComparatorAccess(spaceship[4], spaceship[5] ?? spaceship[6])}`;
  }
  const stringCompare = normalized.match(new RegExp(`^(${left}|${right})(?:\\.([A-Za-z_][A-Za-z0-9_]*)|\\[([^\\]\\n]+)\\])\\.localeCompare\\(\\s*(${left}|${right})(?:\\.([A-Za-z_][A-Za-z0-9_]*)|\\[([^\\]\\n]+)\\])\\s*\\)$`));
  if (
    stringCompare !== null &&
    stringCompare[1] !== undefined &&
    stringCompare[4] !== undefined
  ) {
    return `strcmp(${phpComparatorAccess(stringCompare[1], stringCompare[2] ?? stringCompare[3])}, ${phpComparatorAccess(stringCompare[4], stringCompare[5] ?? stringCompare[6])})`;
  }
  if (/\b(?:Php\.)?versionCompare\s*\(|\bversion_compare\s*\(/.test(normalized)) {
    return convertExpression(normalized);
  }
  if (/\bstrcmp\s*\(/.test(normalized)) {
    return convertExpression(normalized);
  }
  return convertExpression(normalized);
}

function phpComparatorAccess(name: string, property: string | undefined): string {
  if (property === undefined || property.trim() === "") {
    return `$${name}`;
  }
  const key = property.trim();
  if (/^["']/.test(key)) {
    return `$${name}[${convertExpression(key)}]`;
  }
  return `$${name}['${key}']`;
}

function normalizeArrowExpression(expression: string): string {
  return expression
    .replace(/\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^,)]+,\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^,)]+\s*\)\s*=>\s*/, "")
    .replace(/\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*=>\s*/, "")
    .trim();
}

function convertBlockArrowCallbacks(text: string): string {
  let converted = text.replace(/^(\s*)return\s+([A-Za-z_][A-Za-z0-9_]*)\.map\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)]*)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*\{\s*return\s+([\s\S]*?);\s*\}\s*\);/gm, (_match, indent, array, item, expression) => {
    return `${indent}return array_map(fn($${item}) => ${convertExpression(String(expression).trim())}, $${array});`;
  });
  converted = converted.replace(/^(\s*)return\s+([A-Za-z_][A-Za-z0-9_]*)\.filter\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)]*)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*\{\s*return\s+([\s\S]*?);\s*\}\s*\);/gm, (_match, indent, array, item, expression) => {
    return `${indent}return array_values(array_filter($${array}, fn($${item}) => ${convertExpression(String(expression).trim())}));`;
  });
  converted = converted.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\.forEach\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)]*)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*\{\s*([\s\S]*?)\s*\}\s*\);/gm, (_match, indent, array, item, body) => {
    const lines = String(body).split("\n").map((line) => line.trim()).filter((line) => line !== "").map((line) => `${indent}  ${convertStatement(line.replace(/;$/, ""))}`);
    return `${indent}foreach ($${array} as $${item}) {\n${lines.join("\n")}\n${indent}}`;
  });
  return converted;
}

function convertArrayPredicateCall(array: string, method: string, item: string, expression: string): string {
  const convertedExpression = convertExpression(expression.trim());
  const predicateMap = `array_map(fn($${item}) => ${convertedExpression}, $${array})`;
  const filtered = `array_filter($${array}, fn($${item}) => ${convertedExpression})`;
  switch (method) {
    case "some":
      return `count(${filtered}) > 0`;
    case "every":
      return `count(${filtered}) === count($${array})`;
    case "find":
      return `(array_values(${filtered})[0] ?? null)`;
    case "findIndex":
      return `(array_search(true, ${predicateMap}, true) === false ? -1 : array_search(true, ${predicateMap}, true))`;
    default:
      return `$${array}->${method}(fn($${item}) => ${convertedExpression})`;
  }
}

function convertIncludes(target: string, needle: string): string {
  const convertedNeedle = phpValueReference(needle.trim());
  if (target.endsWith("s") || ["values", "items", "list", "array"].includes(target)) {
    return `in_array(${convertedNeedle}, $${target}, true)`;
  }
  return `str_contains($${target}, ${convertedNeedle})`;
}

function convertSlice(target: string, args: string): string {
  const convertedArgs = convertArgumentList(args);
  if (target.endsWith("s") || ["values", "items", "list", "array"].includes(target)) {
    return `array_slice($${target}, ${convertedArgs})`;
  }
  return `mb_substr($${target}, ${convertedArgs})`;
}

function convertArrayPush(text: string): string {
  let converted = text.replace(/([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\.push\(([^)]+)\);/g, (_match, array, index, value) => {
    return `$${array}[${convertExpression(String(index).trim())}][] = ${phpValueReference(String(value).trim())};`;
  });
  converted = converted.replace(/([A-Za-z_][A-Za-z0-9_]*)\.push\(([^)]+)\);/g, (_match, array, value) => {
    return `$${array}[] = ${phpValueReference(String(value).trim())};`;
  });
  return converted;
}

function convertForOf(text: string): string {
  return convertForEachLike(text, "of", (name, expression) => {
    if (name.includes(",")) {
      const [key, value] = name.split(",").map((part) => part.trim());
      const entries = expression.match(/^Object\.entries\(([^)]+)\)$/);
      const source = entries !== null && entries[1] !== undefined ? entries[1].trim() : expression;
      return `foreach (${convertExpression(source)} as $${key} => $${value})`;
    }
    return `foreach (${convertExpression(expression)} as $${name})`;
  });
}

function convertForIn(text: string): string {
  return convertForEachLike(text, "in", (name, expression) => {
    return `foreach (${convertExpression(expression)} as $${name} => $_value)`;
  });
}

function convertForEachLike(
  text: string,
  operator: "of" | "in",
  render: (name: string, expression: string) => string,
): string {
  let output = "";
  let index = 0;
  const headerPattern = new RegExp(`^(?:const|let)\\s+(?:([A-Za-z_][A-Za-z0-9_]*)|\\[\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*,\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\])\\s+${operator}\\s+([\\s\\S]+)$`);

  while (index < text.length) {
    const match = /\bfor\s*\(/.exec(text.slice(index));
    if (!match) {
      output += text.slice(index);
      break;
    }

    const start = index + match.index;
    const open = start + match[0].lastIndexOf("(");
    const close = findMatchingParen(text, open);
    if (close === -1) {
      output += text.slice(index);
      break;
    }

    const header = text.slice(open + 1, close).trim();
    const headerMatch = header.match(headerPattern);
    if (!headerMatch) {
      output += text.slice(index, close + 1);
      index = close + 1;
      continue;
    }

    output += text.slice(index, start);
    const itemName = headerMatch[1] !== undefined ? String(headerMatch[1]) : `${String(headerMatch[2])},${String(headerMatch[3])}`;
    const expression = headerMatch[1] !== undefined ? String(headerMatch[4] ?? "").trim() : String(headerMatch[4]).trim();
    output += render(itemName, expression);
    index = close + 1;
  }

  return output;
}

function phpValueReference(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("$") || isLiteralLike(trimmed)) {
    return trimmed;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return `$${trimmed}`;
  }
  return convertExpression(trimmed);
}

function isLiteralLike(value: string): boolean {
  return ["true", "false", "null"].includes(value) || /^[0-9]+(?:\.[0-9]+)?$/.test(value) || /^['"]/.test(value);
}

function phpOutputPath(out: string, relativePath: string): string {
  return `${out}/${relativePath.replace(/\.ts$/, ".php")}`;
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function dirname(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || ".";
}

function relative(root: string, path: string): string {
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

class UserError extends Error {}

if (import.meta.main) {
  Deno.exit(await main(Deno.args));
}
