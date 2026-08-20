export class StaticResult {
  public constructor(public readonly language: string) {
  }
}

export class StaticResultFactory {
  public static make(): StaticResult {
    return new StaticResult("ja");
  }
}

export class ServerMigrationCriticalBridge {
  public normalizeMarkdownPath(path: string): string {
    return Php.pregReplace("/\\.md$/", ".html", path);
  }

  private versionNumber(version: string): string {
    return version;
  }

  public normalizeAction(action: string): string {
    return Php.matchValue(action, {
      ["before", "main_before", "before_content"]: "before",
      ["after", "main_after", "after_content"]: "after",
      logic: Php.throwLogic("論理的に到達しないactionです。"),
      default: Php.throwInvalidArgument("未対応のactionです。"),
    });
  }

  public normalizeUsers(users: any): any {
    return users.map((user: any): any => {
      return {
        username: Php.toString(user["username"] ?? ""),
        role: Php.toString(user["role"] ?? ""),
        created_at: Php.toString(user["created_at"] ?? ""),
      };
    });
  }

  public allowedRole(role: string): boolean {
    return Php.inArray(role, ["admin", "editor"], true);
  }

  public workItemPath(item: any): string {
    return Php.iteratorPathname(item);
  }

  public encodedPath(path: string): string {
    return Php.rawUrlEncode(path);
  }

  public sortByPath(items: any): any {
    items.sort((left, right) => left.path.localeCompare(right.path));
    return items;
  }

  public sortByPublishedAtDesc(items: any): any {
    items.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
    return items;
  }

  public sortByVersionDesc(items: any): any {
    items.sort((left: any, right: any): number => Php.versionCompare(this.versionNumber(String(right["version"] ?? "")), this.versionNumber(String(left["version"] ?? ""))));
    return items;
  }

  public blockMap(values: string[]): string[] {
    return values.map((value: string): string => {
      return value.trim();
    });
  }

  public dateAtom(value: string): string {
    const published = Php.dateTimeImmutable(value);
    return Php.dateFormat(published, DATE_ATOM);
  }

  public currentTimestamp(): number {
    return Date.now();
  }

  public zipManifest(path: string): boolean {
    const archive = Php.zipArchive();
    Php.zipOpen(archive, path, ZipArchive.CREATE);
    Php.zipAddFromString(archive, "manifest.json", "{}");
    Php.zipClose(archive);
    return true;
  }

  public fetchText(url: string): string {
    const handle = Php.curlInit(url);
    Php.curlSetopt(handle, CURLOPT_RETURNTRANSFER, true);
    const body = Php.curlExec(handle);
    Php.curlClose(handle);
    return String(body);
  }

  public forwardCompatibleLibraryHelpers(value: string, timestamp: number): any {
    const trimmed = Php.mbTrim(value);
    const title = Php.mbUcfirst(trimmed);
    const next = Php.strIncrement("az");
    const headers = Php.httpGetLastResponseHeaders();
    Php.httpClearLastResponseHeaders();
    const created = Php.dateTimeImmutableFromTimestamp(timestamp);
    const micros = Php.dateMicrosecond(created);
    Php.dateSetMicrosecond(created, micros);
    return { title, next, headers, micros };
  }

  public parsedRequestBody(): any {
    return Php.requestParseBody();
  }

  public php84LibraryHelpers(value: string, decimal: string, reflectionConstant: any, reflectionProperty: any, generator: any): any {
    const rounded = Php.bcRound(decimal, 2);
    const ceiling = Php.bcCeil(decimal);
    const floor = Php.bcFloor(decimal);
    const pair = Php.bcDivmod(decimal, "2");
    const ieee = Php.fpow(0, -2);
    const graphemes = Php.graphemeStrSplit(value);
    const reader = Php.xmlReaderFromString("<root />");
    const writer = Php.xmlWriterToMemory();
    const allFilled = Php.arrayAll([value], (entry: string): boolean => entry !== "");
    const anyFilled = Php.arrayAny([value], (entry: string): boolean => entry !== "");
    const found = Php.arrayFind([value], (entry: string): boolean => entry !== "");
    const foundKey = Php.arrayFindKey([value], (entry: string): boolean => entry !== "");
    return {
      rounded,
      ceiling,
      floor,
      pair,
      ieee,
      graphemes,
      reader,
      writer,
      allFilled,
      anyFilled,
      found,
      foundKey,
      deprecated: Php.reflectionClassConstantIsDeprecated(reflectionConstant),
      dynamic: Php.reflectionPropertyIsDynamic(reflectionProperty),
      closed: Php.reflectionGeneratorIsClosed(generator),
    };
  }

  public php84ExtensionHelpers(domNode: any, otherDomNode: any, xpath: any, timezone: any, formatter: any, calendar: any, storage: any, soapServer: any, tidyNode: any, xslt: any): any {
    const position = Php.domNodeCompareDocumentPosition(domNode, otherDomNode);
    const disconnected = Php.domDocumentPositionDisconnected();
    const preceding = Php.domDocumentPositionPreceding();
    const following = Php.domDocumentPositionFollowing();
    const contains = Php.domDocumentPositionContains();
    const containedBy = Php.domDocumentPositionContainedBy();
    const selected = Php.domParentNodeQuerySelector(domNode, "main > article.featured");
    const selectedAll = Php.domParentNodeQuerySelectorAll(domNode, "article");
    const classList = Php.domElementClassList(otherDomNode);
    const featured = Php.domTokenListContains(classList, "featured");
    const quoted = Php.domXPathQuote("value");
    Php.domXPathRegisterPhpFunctionNS(xpath, "urn:adlaire", "format", "format_callback");
    const iana = Php.intlTimeZoneGetIanaId(timezone);
    const parsed = Php.intlDateFormatterParseToCalendar(formatter, "2026-08-16");
    const gregorianDate = Php.intlGregorianCalendarCreateFromDate(2026, 7, 16);
    const gregorianDateTime = Php.intlGregorianCalendarCreateFromDateTime(2026, 7, 16, 10, 30, 0);
    Php.splObjectStorageSeek(storage, 0);
    const soapResponse = Php.soapServerGetLastResponse(soapServer);
    const nextSibling = Php.tidyNodeGetNextSibling(tidyNode);
    const previousSibling = Php.tidyNodeGetPreviousSibling(tidyNode);
    Php.xsltProcessorRegisterPhpFunctionNS(xslt, "urn:adlaire", "render", "render_callback");
    return { position, disconnected, preceding, following, contains, containedBy, selected, selectedAll, featured, quoted, iana, parsed, gregorianDate, gregorianDateTime, soapResponse, nextSibling, previousSibling };
  }

  public php84ClassAndConstantHelpers(path: string, reflector: any, initializer: any, lazyObject: any, property: any): any {
    const amount = Php.bcNumber("12.34");
    const connected = Php.pdoConnect("sqlite:" + path);
    const sqliteDriver = Php.pdoSqliteDriver("sqlite:" + path);
    const ghost = Php.reflectionClassNewLazyGhost(reflector, initializer);
    const uninitialized = Php.reflectionClassIsUninitializedLazyObject(reflector, ghost);
    Php.reflectionClassInitializeLazyObject(reflector, ghost);
    Php.reflectionClassMarkLazyObjectAsInitialized(reflector, ghost);
    Php.reflectionClassResetAsLazyGhost(reflector, lazyObject, initializer);
    Php.reflectionPropertySkipLazyInitialization(property, lazyObject);
    Php.reflectionPropertySetRawValueWithoutLazyInitialization(property, lazyObject, "value");
    const rounded = Php.round(1.5, 0, Php.roundingMode("HalfAwayFromZero"));
    const backgroundQos = Php.pcntlQosClass("Background");
    const mysqlDriver = Php.pdoMysqlDriver("mysql:host=localhost");
    const pgsqlDriver = Php.pdoPgsqlDriver("pgsql:host=localhost");
    const odbcDriver = Php.pdoOdbcDriver("odbc:adlaire");
    const dbLibDriver = Php.pdoDbLibDriver("dblib:host=localhost");
    const firebirdDriver = Php.pdoFirebirdDriver("firebird:dbname=localhost:/tmp/adlaire.fdb");
    const html = Php.domHtmlDocumentFromString("<main></main>");
    const xml = Php.domXmlDocumentFromString("<root />");
    const reflectedConstant = Php.reflectionConstant("PHP_VERSION");
    const reflectedConstantName = Php.reflectionConstantGetName(reflectedConstant);
    const reflectedConstantValue = Php.reflectionConstantGetValue(reflectedConstant);
    const reflectedConstantDeprecated = Php.reflectionConstantIsDeprecated(reflectedConstant);
    return {
      amount,
      connected,
      sqliteDriver,
      mysqlDriver,
      pgsqlDriver,
      odbcDriver,
      dbLibDriver,
      firebirdDriver,
      uninitialized,
      rounded,
      backgroundQos,
      html,
      xml,
      reflectedConstant,
      reflectedConstantName,
      reflectedConstantValue,
      reflectedConstantDeprecated,
      curl: Php.curlVersion(),
      phpOutput: PHP_OUTPUT_HANDLER_PROCESSED,
      phpSbin: PHP_SBINDIR,
      curlHttp3: CURL_HTTP_VERSION_3,
      curlPrereqOk: CURL_PREREQFUNC_OK,
      libxmlNoXxe: LIBXML_NO_XXE,
      pgChunk: PGSQL_TUPLES_CHUNK,
      tokenizer: T_PUBLIC_SET,
      xmlHuge: XML_OPTION_PARSE_HUGE,
      zipTruncated: Php.zipErrorTruncatedZip(),
    };
  }

  public php84MetadataAndStreamHelpers(): any {
    const deprecated = Php.deprecatedAttribute("Use replacement", "pt.0.59");
    const parseError = Php.requestParseBodyException("multipart parse failed");
    const soapUrl = Php.soapUrl("https://example.test/service");
    const soapSdl = Php.soapSdl("https://example.test/service.wsdl");
    const bucket = Php.streamBucket();
    Php.streamBucketSetData(bucket, "payload");
    const bucketData = Php.streamBucketData(bucket);
    const bucketLength = Php.streamBucketDatalen(bucket);
    return { deprecated, parseError, soapUrl, soapSdl, bucketData, bucketLength };
  }

  public php84CryptoCurlAndXslHelpers(xslt: any, keyConfig: any, signature: any): any {
    const pkey = Php.opensslPkeyNew(keyConfig);
    const pkeyDetails = Php.opensslPkeyGetDetails(pkey);
    const signed = Php.opensslSign("payload", signature, pkey, OPENSSL_ALGO_SHA256);
    const verified = Php.opensslVerify("payload", signature, pkey, OPENSSL_ALGO_SHA256);
    const argonProvider = Php.passwordArgon2Provider();
    const postTransferInfo = Php.curlPostTransferTimeInfo();
    const responseTimeoutOption = Php.curlServerResponseTimeoutOption();
    Php.xsltProcessorSetMaxTemplateDepth(xslt, 200);
    Php.xsltProcessorSetMaxTemplateVars(xslt, 100);
    const maxDepth = Php.xsltProcessorMaxTemplateDepth(xslt);
    const maxVars = Php.xsltProcessorMaxTemplateVars(xslt);
    return { pkey, pkeyDetails, signed, verified, argonProvider, postTransferInfo, responseTimeoutOption, maxDepth, maxVars };
  }

  public php84ReflectionHookAndConstantHelpers(property: any, targetObject: any): any {
    const getHookType = Php.reflectionPropertyHookGet();
    const setHookType = Php.reflectionPropertyHookSet();
    const getHook = Php.reflectionPropertyGetHook(property, getHookType);
    const hooks = Php.reflectionPropertyGetHooks(property);
    const hasGetHook = Php.reflectionPropertyHasHook(property, getHookType);
    const hasHooks = Php.reflectionPropertyHasHooks(property);
    const rawValue = Php.reflectionPropertyGetRawValue(property, targetObject);
    const settableType = Php.reflectionPropertyGetSettableType(property);
    const abstractProperty = Php.reflectionPropertyIsAbstract(property);
    const finalProperty = Php.reflectionPropertyIsFinal(property);
    const lazyProperty = Php.reflectionPropertyIsLazy(property, targetObject);
    const privateSet = Php.reflectionPropertyIsPrivateSet(property);
    const protectedSet = Php.reflectionPropertyIsProtectedSet(property);
    const virtualProperty = Php.reflectionPropertyIsVirtual(property);
    return { getHookType, setHookType, getHook, hooks, hasGetHook, hasHooks, rawValue, settableType, abstractProperty, finalProperty, lazyProperty, privateSet, protectedSet, virtualProperty };
  }

  public php84AdditionalConstantHelpers(): any {
    return {
      curlDebug: Php.curlDebugFunctionOption(),
      curlHeaderIn: Php.curlHeaderInInfo(),
      curlHttp3Only: Php.curlHttpVersion3Only(),
      curlPrereq: Php.curlPrereqFunctionOption(),
      curlSslIn: Php.curlSslDataInInfo(),
      curlSslOut: Php.curlSslDataOutInfo(),
      curlKeepCount: Php.curlTcpKeepCountOption(),
      intlPattern: Php.intlDateFormatterPattern(),
      intlUnary: Php.intlCharIdsUnaryOperator(),
      intlCompatStart: Php.intlCharCompatMathStart(),
      intlCompatContinue: Php.intlCharCompatMathContinue(),
      intlRoundHalfOdd: Php.intlNumberFormatterRoundHalfOdd(),
      ldapTlsMax: Php.ldapTlsProtocolMaxOption(),
      ldapTls13: Php.ldapTlsProtocolTls13(),
      ocspPurpose: Php.opensslPurposeOcspHelper(),
      timestampPurpose: Php.opensslPurposeTimestampSign(),
      sodiumAegis128: Php.sodiumAegis128LKeyBytes(),
      sodiumAegis128Auth: Php.sodiumAegis128LAuthBytes(),
      sodiumAegis128Nonce: Php.sodiumAegis128LNonceBytes(),
      sodiumAegis128Secret: Php.sodiumAegis128LSecretBytes(),
      sodiumAegis256: Php.sodiumAegis256KeyBytes(),
      sodiumAegis256Auth: Php.sodiumAegis256AuthBytes(),
      sodiumAegis256Nonce: Php.sodiumAegis256NonceBytes(),
      sodiumAegis256Secret: Php.sodiumAegis256SecretBytes(),
    };
  }

  public php84SodiumAegisHelpers(message: string, additionalData: string, nonce128: string, nonce256: string): any {
    const key128 = Php.sodiumAegis128LKeygen();
    const encrypted128 = Php.sodiumAegis128LEncrypt(message, additionalData, nonce128, key128);
    const decrypted128 = Php.sodiumAegis128LDecrypt(encrypted128, additionalData, nonce128, key128);
    const key256 = Php.sodiumAegis256Keygen();
    const encrypted256 = Php.sodiumAegis256Encrypt(message, additionalData, nonce256, key256);
    const decrypted256 = Php.sodiumAegis256Decrypt(encrypted256, additionalData, nonce256, key256);
    return { key128, encrypted128, decrypted128, key256, encrypted256, decrypted256 };
  }

  public php84HashContextHelpers(hashContext: any): any {
    return Php.hashContextDebugInfo(hashContext);
  }

  public php84DbaAndOdbcHelpers(path: string): any {
    const dba = Php.dbaOpen(path, "c", "flatfile");
    Php.dbaReplace("site", "Adlaire", dba);
    const dbaValue = Php.dbaFetch("site", dba);
    const dbaExists = Php.dbaExists("site", dba);
    const dbaFirst = Php.dbaFirstKey(dba);
    const dbaNext = Php.dbaNextKey(dba);
    Php.dbaSync(dba);
    Php.dbaClose(dba);
    const connection = Php.odbcConnect("adlaire", "", "");
    const result = Php.odbcExec(connection, "SELECT 1 AS value");
    const row = Php.odbcFetchArray(result);
    const objectRow = Php.odbcFetchObject(result);
    const error = Php.odbcError(connection);
    const message = Php.odbcErrormsg(connection);
    Php.odbcClose(connection);
    return { dbaValue, dbaExists, dbaFirst, dbaNext, row, objectRow, error, message };
  }

  public sqliteDefaultDatabase(path: string): any {
    const db = Php.pdoSqlite(path);
    Php.pdoSetAttribute(db, PDO.ATTR_ERRMODE, PDO.ERRMODE_EXCEPTION);
    Php.pdoSetAttribute(db, PDO.ATTR_DEFAULT_FETCH_MODE, PDO.FETCH_ASSOC);
    Php.pdoExec(db, "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    const statement = Php.pdoPrepare(db, "INSERT INTO settings (key, value) VALUES (:key, :value)");
    Php.pdoStatementBindValue(statement, ":key", "site_name", PDO.PARAM_STR);
    Php.pdoStatementBindValue(statement, ":value", "Adlaire", PDO.PARAM_STR);
    Php.pdoStatementExecute(statement);
    const rows = Php.pdoStatementFetchAll(Php.pdoQuery(db, "SELECT key, value FROM settings"), PDO.FETCH_ASSOC);
    return { rows, lastId: Php.pdoLastInsertId(db) };
  }

  public sqlite3ExtensionDatabase(path: string): any {
    Php.sqlite3EnableExceptions(true);
    const db = Php.sqlite3(path);
    Php.sqlite3BusyTimeout(db, 5000);
    Php.sqlite3Exec(db, "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    const statement = Php.sqlite3Prepare(db, "INSERT OR REPLACE INTO cache (key, value) VALUES (:key, :value)");
    Php.sqlite3StatementBindValue(statement, ":key", "home", SQLITE3_TEXT);
    Php.sqlite3StatementBindValue(statement, ":value", Php.sqlite3EscapeString("ok"), SQLITE3_TEXT);
    const result = Php.sqlite3StatementExecute(statement);
    const row = Php.sqlite3QuerySingle(db, "SELECT value FROM cache WHERE key = 'home'", true);
    const changes = Php.sqlite3Changes(db);
    Php.sqlite3ResultFinalize(result);
    Php.sqlite3Close(db);
    return { row, changes, version: Php.sqlite3Version() };
  }

  public uploadFile(): any {
    const file = Php.files("content_file", null);
    if (!Php.isArray(file) || (file["error"] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
      return null;
    }
    const tmpName = Php.toString(file["tmp_name"] ?? "");
    if (!Php.isUploadedFile(tmpName)) {
      Php.throwUnexpectedValue("アップロードファイルではありません。");
    }
    return {
      "tmp_name": tmpName,
      originalName: Php.basename(Php.toString(file["name"] ?? "")),
    };
  }

  public stringAndArrayHelpers(value: string, roles: string[]): any {
    const upper = Php.strtoupper(value);
    const lower = Php.strtolower(value);
    const length = Php.strlen(value);
    const pieces = Php.explode("/", value);
    const uniqueRoles = Php.arrayValues(Php.arrayUnique(roles));
    return {
      upper,
      lower,
      length,
      pieces,
      uniqueRoles,
      editorIndex: Php.arraySearch("editor", uniqueRoles, true),
      token: Php.bin2hex(Php.randomBytes(4)),
    };
  }
  public directObjectArgument(theme: string, user: string): void {
    this.record("theme.save", { theme: theme, user: user });
  }
  public staticResultProperty(): string {
    return StaticResultFactory.make().language;
  }

  public methodResultLength(): number {
    return this.values().length;
  }

  private values(): any[] {
    return [];
  }


  private record(type: string, data: any): void {
    Php.echo(type);
  }

}

export class ZipBinaryBridge {
  public zipBinary(bytes: string): any {
    const offset = Php.strrpos(bytes, "PK\x05\x06");
    if (offset === false) {
      Php.throwRuntime("zipが不正です。");
    }
    const length = Php.strlen(bytes);
    const data = Php.unpack("v", Php.substr(bytes, Php.toInt(offset) + 10, 2));
    const inflated = Php.gzinflate(Php.substr(bytes, 0, length));
    if (inflated === false) {
      Php.throwRuntime("zip展開に失敗しました。");
    }
    return data;
  }
}


export class ServerFoundationCompletionBridge {
  public htmlSafety(value: string, content: string, reason: string): string {
    const label = reason !== "" ? "対象 / " + reason : "対象";
    return '<div class="notice">' + Php.escapeHtml(label) + '</div>' + Php.nl2br(Php.escapeHtml(content));
  }

  public requestPayload(): any {
    const title = Php.post("title", "");
    const draft = Php.hasPost("draft");
    const file = Php.files("content_file", null);
    const bytes = Php.inputBytes();
    if (Php.isArray(file)) {
      const tmpName = Php.toString(file["tmp_name"] ?? "");
      if (tmpName !== "" && Php.isUploadedFile(tmpName)) {
        return Php.fileGetContents(tmpName);
      }
    }
    return { title, draft, bytes };
  }

  public arrayForms(items: any): any {
    while (Php.count(items) < 5) {
      items.push({ label: "", order: Php.count(items), enabled: false });
    }
    const normalized = [];
    for (const [index, item] of Object.entries(items)) {
      normalized.push({ index, label: String(item["label"] ?? "") });
    }
    return Php.arrayValues(normalized);
  }

  public staticPublisherHelpers(articles: any): any {
    const groups = {};
    const map = {};
    for (const article of articles) {
      if (!(article instanceof ArticleContract)) {
        continue;
      }
      if (!Php.objectProp(article, "publicEligible")) {
        continue;
      }
      Php.arrayAppend(groups, Php.objectProp(article, "routeBase"), article);
      const outputRecord = {
        direct: [Php.objectProp(article, "outputPath")],
        indirect: [Php.rtrim(Php.objectProp(article, "routeBase"), "/") + "/index.html"],
      };
      Php.arraySet(map, Php.objectProp(article, "id"), outputRecord);
    }
    Php.ksort(map);
    for (const [routeBase, items] of Object.entries(groups)) {
      items.sort((left: any, right: any): number => Php.strcmp(Php.objectProp(right, "publishedAt"), Php.objectProp(left, "publishedAt")));
      if (Php.strStartsWith(routeBase, "articles") && !Php.strEndsWith(routeBase, "/")) {
        Php.arraySet(map, routeBase, Php.pregReplace("/\\.md$/", ".html", Php.ltrim(routeBase, "/")));
      }
    }
    return map;
  }

  public persistence(path: string, payload: any): string {
    if (!Php.isFile(path)) {
      Php.filePutContents(path, "{}", LOCK_EX);
    }
    const bytes = Php.jsonEncode(payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if (bytes === false || Php.filePutContents(path, bytes, LOCK_EX) === false) {
      Php.throwRuntime("保存できません。");
    }
    const readBack = Php.fileGetContents(path);
    if (readBack === false || !Php.hashEquals(Php.hash("sha256", bytes), Php.hash("sha256", readBack))) {
      Php.throwRuntime("保全確認に失敗しました。");
    }
    return Php.gmdate(DATE_ATOM, Php.toInt(Php.strtotime("2026-08-16T00:00:00+00:00")));
  }
}
