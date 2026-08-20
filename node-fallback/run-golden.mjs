#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const goldenRoot = path.join(root, "tests", "golden");
const outputRoot = path.resolve(root, "Work", `phptranspiler-node-golden-${process.pid}-${Date.now()}`);
const version = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();

fs.mkdirSync(outputRoot, { recursive: true });
try {
for (const entry of fs.readdirSync(goldenRoot).sort()) {
  if (!entry.endsWith(".input.ts")) {
    continue;
  }

  const inputPath = path.join(goldenRoot, entry);
  const outputName = entry.replace(".ts", ".php");
  const expectedPath = path.join(goldenRoot, entry.replace(".input.ts", ".expected.php"));
  const outputPath = path.join(outputRoot, outputName);
  const actual = transpile({
    relativePath: entry,
    text: fs.readFileSync(inputPath, "utf8"),
  }, version);
  const expected = fs.readFileSync(expectedPath, "utf8");

  fs.writeFileSync(outputPath, actual);

  if (actual !== expected) {
    throw new Error(`golden mismatch: ${entry}\nexpected:\n${expected}\nactual:\n${actual}`);
  }
}

console.log("phptranspiler-node-golden-ok");
} finally {
  fs.rmSync(outputRoot, { recursive: true, force: true });
}

function transpile(file, version) {
  validateSource(file);

  let text = file.text.replace(/\r\n/g, "\n");
  const requireLines = [];
  const fileDirectives = parsePhpFileDirectives(file, text);
  const footerDirectives = parsePhpFooterDirectives(file, text);
  text = stripPhpFileDirectives(text);

  text = text.replace(/^import\s+\{?\s*([A-Za-z0-9_,\s]+)\s*\}?\s+from\s+["'](.+?)["'];?$/gm, (_match, _names, importPath) => {
    requireLines.push(`require_once __DIR__ . '/${String(importPath).replace(/^\.\//, "").replace(/\.ts$/, ".php")}';`);
    return "";
  });
  text = text.replace(/^export\s+/gm, "");
  text = convertInterfaceBlocks(text);
  text = text
    .replace(/^type\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*\{[\s\S]*?^\};?$/gm, "")
    .replace(/^type\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*[^;\n]+;$/gm, "");
  text = text.replace(/(?<!["'])\bundefined\b(?!["'])/g, "null");
  text = text.replace(/(public|private|protected)\s+static\s+readonly\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^=\n;]+)?\s*=\s*([^;\n]+);/g, (_match, visibility, name, value) => `${visibility} const ${name} = ${convertExpression(String(value).trim())};`);
  text = text.replace(/(public|private|protected)\s+static\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^=\n;]+)(?:\s*=\s*([^;\n]+))?;/g, (_match, visibility, name, typeName, value) => {
    const defaultValue = value === undefined ? "" : ` = ${convertExpression(String(value).trim())}`;
    return `${visibility} static ${phpType(String(typeName))} $${name}${defaultValue};`;
  });
  text = text.replace(/(public|private|protected)\s+readonly\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^\n;]+)\s*;/g, (_match, visibility, name, typeName) => `${visibility} readonly ${phpType(String(typeName))} $${name};`);
  text = text.replace(/(public|private|protected)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^\n;]+)\s*;/g, (_match, visibility, name, typeName) => `${visibility} ${phpType(String(typeName))} $${name};`);
  text = text.replace(/(public|private|protected)\s+constructor\s*\(([^)]*)\)/g, (_match, visibility, params) => `${visibility} function __construct(${convertParams(String(params))})`);
  text = text.replace(/(public|private|protected)\s+static\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^{\n]+)\s*\{/g, (_match, visibility, name, params, returnType) => `${visibility} static function ${name}(${convertParams(String(params))}): ${phpType(String(returnType))} {`);
  text = text.replace(/(public|private|protected)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^{\n]+)\s*\{/g, (_match, visibility, name, params, returnType) => `${visibility} function ${name}(${convertParams(String(params))}): ${phpType(String(returnType))} {`);
  text = text.replace(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^{\n]+)\s*\{/gm, (_match, name, params, returnType) => `function ${name}(${convertParams(String(params))}): ${phpType(String(returnType))} {`);
  text = convertForLoops(text);
  text = convertVariableDeclarations(text);
  text = text.replace(/:\s*Array<([^>]+)>/g, ": array");
  text = text.replace(/\bnew\s+Error\(/g, "new Exception(");
  text = text
    .replace(/\bcatch\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g, (_match, name) => `catch (Throwable $${name})`)
    .replace(/\bcatch\s*\{/g, "catch (Throwable) {");
  text = text.replace(/`([^`]+)`/g, (_match, inner) => `"${String(inner).replace(/\$\{this\.([^}]+)\}/g, "{$this->$1}").replace(/\$\{([^}]+)\}/g, "{$$$1}")}"`);
  text = text.replace(/\bthis\./g, "$this->");
  text = text.replace(/(?<![.>])\b(serverSideClient|serverSide)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)\n]*)\)/g, (_match, target, method, args) => `$${target}->${method}(${convertArgumentList(String(args))})`);
  text = text.replace(/(?<!->)\bruntime\.(serverSideClient|configRoot|workRoot|config|git)\b/g, (_match, property) => `$runtime->${property}`);
  text = text.replace(/\b([a-z_][A-Za-z0-9_]*)\.getMessage\(\)/g, (_match, target) => `$${target}->getMessage()`);
  text = convertDeleteStatements(text);
  text = text.replace(/=\s*([A-Za-z_][A-Za-z0-9_]*)\s*([;)])/g, (_match, name, suffix) => isLiteralLike(String(name)) ? `= ${name}${suffix}` : `= $${name}${suffix}`);
  text = convertIndexAssignments(text);
  text = convertStaticPropertyAssignments(text);
  text = convertPropertyAssignments(text);
  text = text.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);/gm, (_match, indent, target, value) => `${indent}$${target} = ${convertExpression(String(value).trim())};`);
  text = convertCompoundAssignments(text);
  text = convertPhpMatchValueCalls(text);
  text = convertBlockArrowCallbacks(text);
  text = text.replace(/\breturn\s+([^;]+);/g, (_match, value) => `return ${convertExpression(String(value).trim())};`);
  text = text.replace(/\bthrow\s+([^;]+);/g, (_match, value) => `throw ${convertExpression(String(value).trim())};`);
  text = convertArrayFunctionalMethods(text);
  text = text.replace(/([A-Za-z_][A-Za-z0-9_]*)\.push\(([^)]+)\);/g, (_match, array, value) => `$${array}[] = ${phpValueReference(String(value).trim())};`);
  text = convertExpressionStatements(text);
  text = convertParenthesizedControlExpressions(text);
  text = text.replace(/^(\s*)case\s+([^:]+):/gm, (_match, indent, value) => `${indent}case ${convertExpression(String(value).trim())}:`);
  text = text.replace(/([({,]\s*)([a-z_][A-Za-z0-9_]*)\s*:(?!:)/g, "$1'$2' =>");
  text = text.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.length\b/g, (_match, name) => convertLength(String(name)));
  text = convertIncrementStatements(text);
  text = convertForOf(text);
  text = convertForIn(text);
  text = text.replace(/->serverSideClient\./g, "->serverSideClient->");
  text = restorePhpConstants(text);
  text = convertResidualThrowHelpers(text);
  text = text.replace(/\bclass\s+/g, "final class ");

  const body = text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "")
    .join("\n");

  const php = ["<?php", `/* Generated by PhpTranspiler ${version}. Source: ${file.relativePath}. */`, ...fileDirectives, ...requireLines, body, ...footerDirectives, ""].join("\n");
  validateGeneratedPhp(file, php);
  return php;
}

function parsePhpFileDirectives(file, text) {
  const lines = [];
  const directiveMatches = text.matchAll(/^\/\/\s*@php-(declare|namespace|use)\s+(.+)$/gm);
  for (const match of directiveMatches) {
    const directive = match[1];
    const value = String(match[2] ?? "").trim();
    if (directive === "declare") {
      if (value !== "strict_types=1") {
        throw new Error(`${file.relativePath}: unsupported php declare directive: ${value}`);
      }
      lines.push("declare(strict_types=1);");
      continue;
    }
    if (directive === "namespace") {
      if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\\[A-Za-z_][A-Za-z0-9_]*)*$/.test(value)) {
        throw new Error(`${file.relativePath}: invalid php namespace directive: ${value}`);
      }
      lines.push(`namespace ${value};`);
      continue;
    }
    if (directive === "use") {
      if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\\[A-Za-z_][A-Za-z0-9_]*)*(?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?$/.test(value)) {
        throw new Error(`${file.relativePath}: invalid php use directive: ${value}`);
      }
      lines.push(`use ${value};`);
    }
  }
  return lines;
}

function parsePhpFooterDirectives(file, text) {
  const lines = [];
  const directiveMatches = text.matchAll(/^\/\/\s*@php-run-unless-defined\s+([A-Z_][A-Z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)::([A-Za-z_][A-Za-z0-9_]*)\s+\(__DIR__\)$/gm);
  for (const match of directiveMatches) {
    const constant = match[1];
    const className = match[2];
    const method = match[3];
    if (constant === undefined || className === undefined || method === undefined) {
      throw new Error(`${file.relativePath}: invalid php run-unless-defined directive`);
    }
    lines.push(`if (!defined('${constant}')) {`);
    lines.push(`    ${className}::${method}(__DIR__);`);
    lines.push("}");
  }
  return lines;
}

function stripPhpFileDirectives(text) {
  return text.replace(/^\/\/\s*@php-(?:declare|namespace|use|run-unless-defined)\s+.+$/gm, "");
}

function validateGeneratedPhp(file, php) {
  const checks = [
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
    [/\b(?:String|Number|Boolean|parseInt|parseFloat)\s*\(/, "unconverted cast helper"],
    [/\b[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*\s*\(/, "unconverted dotted call"],
    [/=>\s*\{/, "unconverted block arrow callback"],
    [/(?:=|return|\[\]\s*=)\s*\{\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*=>/, "malformed object literal"],
    [/\+\s*[A-Za-z_][A-Za-z0-9_]*\s*\+/, "unconverted string concatenation operand"],
    [/\b[A-Za-z_][A-Za-z0-9_]*::(?:trim|slice|startsWith|endsWith|push)\s*\(/, "unconverted instance method call"],
    [/^\s*type\s+[A-Za-z_][A-Za-z0-9_]*/m, "unconverted type declaration"],
    [/\b(?:eval|assert|create_function|shell_exec|exec|system|passthru|proc_open|popen|pcntl_exec|extract|parse_str|unserialize)\s*\(/, "forbidden dynamic or unsafe PHP function"],
    [/(?<!:)\$\$/, "forbidden variable variable"],
    [/\$[A-Za-z_][A-Za-z0-9_]*\s*\(/, "forbidden variable function call"],
    [/\b(?:include|include_once|require|require_once)\b(?!\s+__DIR__\s*\.)/, "forbidden dynamic include or require"],
  ];
  if (!php.startsWith("<?php\n")) {
    throw new Error(`${file.relativePath}: generated PHP failed coding standard: missing opening PHP tag`);
  }
  if (!php.endsWith("\n")) {
    throw new Error(`${file.relativePath}: generated PHP failed coding standard: missing final newline`);
  }
  if (!php.split("\n")[1]?.startsWith("/* Generated by PhpTranspiler ")) {
    throw new Error(`${file.relativePath}: generated PHP failed coding standard: missing generated header`);
  }
  for (const [pattern, label] of checks) {
    const match = php.match(pattern);
    if (match !== null) {
      const excerpt = (match[0] ?? "").replace(/\s+/g, " ").slice(0, 120);
      throw new Error(`${file.relativePath}: generated PHP failed safety audit: ${label}: ${excerpt}`);
    }
  }
}

function convertForLoops(text) {
  return text.replace(/\bfor\s*\(\s*(?:let|const)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);\s*([^;]+);\s*([^)]+)\)\s*\{/g, (_match, name, initial, condition, step) => {
    return `for ($${name} = ${convertExpression(String(initial).trim())}; ${convertExpression(String(condition).trim())}; ${convertForStep(String(step).trim())}) {`;
  });
}

function convertInterfaceBlocks(text) {
  return text.replace(/interface\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\n\}/g, (_match, name, body) => {
    const methods = String(body)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line) => {
        const method = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^;]+);$/);
        if (method === null) {
          return line;
        }
        return `  public function ${method[1]}(${convertParams(method[2])}): ${phpType(method[3])};`;
      })
      .join("\n");
    return `interface ${name} {\n${methods}\n}`;
  });
}

function convertVariableDeclarations(text) {
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
  return converted.replace(/^(\s*)(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^=;]+)?\s*=\s*([^;]+);/gm, (_match, indent, name, value) => `${indent}$${name} = ${convertExpression(String(value))};`);
}

function convertForStep(step) {
  return step
    .replace(/^([A-Za-z_][A-Za-z0-9_]*)(\+\+|--)$/, (_match, name, op) => `$${name}${op}`)
    .replace(/^([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/])=\s*(.+)$/, (_match, name, op, value) => `$${name} ${op}= ${convertExpression(String(value).trim())}`);
}

function convertIncrementStatements(text) {
  return text.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\+\+|--);/gm, (_match, indent, name, op) => `${indent}$${name}${op};`);
}

function convertIndexAssignments(text) {
  return text.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, target, index, operator, value) => {
    const lhs = convertIndexAccess(`${target}[${String(index).trim()}]`);
    return `${indent}${lhs} ${operator} ${convertExpression(String(value).trim())};`;
  });
}

function convertPropertyAssignments(text) {
  return text.replace(/^(\s*)([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, target, property, operator, value) => {
    return `${indent}$${target}['${property}'] ${operator} ${convertExpression(String(value).trim())};`;
  });
}

function convertCompoundAssignments(text) {
  return text.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/]=)\s*([^;]+);/gm, (_match, indent, target, operator, value) => {
    return `${indent}$${target} ${operator} ${convertExpression(String(value).trim())};`;
  });
}

function convertStaticPropertyAssignments(text) {
  return text
    .replace(/^(\s*)self\.([a-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, property, index, operator, value) => `${indent}self::$${property}[${convertExpression(String(index).trim())}] ${operator} ${convertExpression(String(value).trim())};`)
    .replace(/^(\s*)([A-Z][A-Za-z0-9_]*)\.([a-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, className, property, index, operator, value) => `${indent}${className}::$${property}[${convertExpression(String(index).trim())}] ${operator} ${convertExpression(String(value).trim())};`)
    .replace(/^(\s*)self\.([a-z_][A-Za-z0-9_]*)\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, property, operator, value) => `${indent}self::$${property} ${operator} ${convertExpression(String(value).trim())};`)
    .replace(/^(\s*)([A-Z][A-Za-z0-9_]*)\.([a-z_][A-Za-z0-9_]*)\s*([+\-*/]?=)\s*([^;]+);/gm, (_match, indent, className, property, operator, value) => `${indent}${className}::$${property} ${operator} ${convertExpression(String(value).trim())};`);
}

function convertDeleteStatements(text) {
  return text
    .replace(/^(\s*)delete\s+\$this->([A-Za-z_][A-Za-z0-9_]*);/gm, (_match, indent, property) => `${indent}unset($this->${property});`)
    .replace(/^(\s*)delete\s+([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*);/gm, (_match, indent, target, property) => `${indent}unset($${target}['${property}']);`)
    .replace(/^(\s*)delete\s+([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\];/gm, (_match, indent, target, index) => `${indent}unset($${target}[${convertExpression(String(index).trim())}]);`);
}

function convertParenthesizedControlExpressions(text) {
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

function findMatchingParen(text, open) {
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

function convertArrayFunctionalMethods(text) {
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
  converted = converted.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\.sort\(\s*\);/gm, (_match, indent, array) => `${indent}sort($${array});`);
  converted = converted.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\.sort\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^,)=]+)?\s*,\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)=]+)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*([^;\n]+)\s*\);/gm, (_match, indent, array, left, right, expression) => {
    return `${indent}usort($${array}, fn($${left}, $${right}): int => ${convertSortComparator(String(left), String(right), String(expression).trim())});`;
  });
  converted = converted.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\.forEach\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)=]+)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*([^;]+)\s*\);/gm, (_match, indent, array, item, statement) => {
    return `${indent}foreach ($${array} as $${item}) {\n${indent}  ${convertStatement(String(statement).trim())}\n${indent}}`;
  });
  return converted;
}

function convertStatement(statement) {
  if (/^[A-Za-z_][A-Za-z0-9_]*\.push\(/.test(statement)) {
    return statement.replace(/([A-Za-z_][A-Za-z0-9_]*)\.push\(([^)]+)\)/, (_match, array, value) => `$${array}[] = ${phpValueReference(String(value).trim())};`);
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(statement)) {
    return statement.replace(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\$?[A-Za-z_][A-Za-z0-9_]*)$/, (_match, target, value) => `$${target} = ${phpValueReference(String(value))};`);
  }
  return `${convertExpression(statement)};`;
}

function convertBlockArrowCallbacks(text) {
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

function convertExpressionStatements(text) {
  const statementKeywords = new Set([
    "break", "case", "catch", "continue", "default", "do", "else", "finally", "for", "foreach",
    "function", "if", "return", "switch", "throw", "try", "while",
  ]);

  return text.split("\n").map((line) => {
    const statement = line.match(/^(\s*)(.+);$/);
    if (statement === null || statement[1] === undefined || statement[2] === undefined) {
      return line;
    }
    const expression = statement[2].trim();
    const indexedPush = expression.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\.push\(([\s\S]+)\)$/);
    if (indexedPush !== null && indexedPush[1] !== undefined && indexedPush[2] !== undefined && indexedPush[3] !== undefined) {
      return `${statement[1]}$${indexedPush[1]}[${convertExpression(indexedPush[2].trim())}][] = ${convertExpression(indexedPush[3].trim())};`;
    }
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

function isCallableExpressionStatement(expression) {
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

function convertExpression(value) {
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
    .replace(/\btypeof\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*|\[[^\]\n]+\])?)\s*(===|!==)\s*["'](string|number|boolean|object|undefined)["']/g, (_match, target, operator, typeName) => convertTypeofComparison(String(target), String(operator), String(typeName)))
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*|\[[^\]\n]+\])?)\s+instanceof\s+([A-Z][A-Za-z0-9_]*)/g, (_match, target, className) => `${convertExpression(String(target))} instanceof ${className}`)
    .replace(/^[\s\S]*$/, (expression) => replaceStaticFunctionCalls(String(expression)))
    .replace(/^[\s\S]*$/, (expression) => replaceStaticFunctionResultStringMethods(String(expression)))
    .replace(/(?<!\$)\b([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]\.(trim|toUpperCase|toLowerCase|split|replace|startsWith|endsWith)\(([^)]*)\)/g, (_match, target, index, method, args) => convertStringMethod(`$${target}[${convertExpression(String(index).trim())}]`, String(method), String(args)))
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([A-Za-z_][A-Za-z0-9_]*)\.trim\(\)\.(toUpperCase|toLowerCase)\(\)/g, (_match, target, method) => convertStringMethod(convertStringMethod(String(target), "trim", ""), String(method), ""))
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([A-Za-z_][A-Za-z0-9_]*)\.(trim|toUpperCase|toLowerCase|split|replace|startsWith|endsWith)\(([^)]*)\)/g, (_match, target, method, args) => convertStringMethod(String(target), String(method), String(args)))
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([a-z_][A-Za-z0-9_]*[A-Z][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, target, method, args) => `$${target}->${method}(${convertArgumentList(String(args))})`)
    .replace(/\bPhp\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, method, args) => convertPhpHelper(String(method), String(args)))
    .replace(/(?<![A-Za-z0-9_>$])\b([A-Z][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, className, method, args) => `${className}::${method}(${convertArgumentList(String(args))})`)
    .replace(/\b([A-Z][A-Za-z0-9_]*)\.([A-Z][A-Z0-9_]*)\b/g, (_match, className, constant) => `${className}::${constant}`)
    .replace(/\bself\.([A-Z][A-Z0-9_]*)\b/g, (_match, constant) => `self::${constant}`)
    .replace(/\bself\.([a-z_][A-Za-z0-9_]*)\b(?!\s*\()/g, (_match, property) => `self::$${property}`)
    .replace(/\b([A-Z][A-Za-z0-9_]*)\.([a-z_][A-Za-z0-9_]*)\b(?!\s*\()/g, (_match, className, property) => `${className}::$${property}`)
    .replace(/^[\s\S]*$/, (expression) => replaceStringCastResultMethods(String(expression)))
    .replace(/(\(string\)\(\([^;\n]+\)\))\.(trim|toUpperCase|toLowerCase)\(([^)]*)\)/g, (_match, target, method, methodArgs) => convertStringMethod(String(target), String(method), String(methodArgs)))
    .replace(/(?<!\\)\bString\(([^)]*)\)\.(trim|toUpperCase|toLowerCase)\(([^)]*)\)/g, (_match, args, method, methodArgs) => convertStringMethod(convertCastHelper("String", String(args)), String(method), String(methodArgs)))
    .replace(/\b(String|Number|Boolean|parseInt|parseFloat)\(([^)]*)\)/g, (_match, helper, args) => convertCastHelper(String(helper), String(args)))
    .replace(/(?<!\$)\b([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]/g, (_match, target, index) => convertIndexAccess(`${target}[${String(index).trim()}]`))
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.map\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)?\s*=>\s*([^)]+?)\s*\)/g, (_match, array, item, expression) => `array_map(fn($${item}) => ${convertExpression(String(expression).trim())}, $${array})`)
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.filter\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)?\s*=>\s*([^)]+?)\s*\)/g, (_match, array, item, expression) => `array_values(array_filter($${array}, fn($${item}) => ${convertExpression(String(expression).trim())}))`)
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.(some|every|find|findIndex)\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)?\s*=>\s*([^)]+?)\s*\)/g, (_match, array, method, item, expression) => convertArrayPredicateCall(String(array), String(method), String(item), String(expression)))
    .replace(/\b([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\.(trim|toUpperCase|toLowerCase|split|replace)\(([^)]*)\)/g, (_match, target, property, method, args) => convertStringMethod(`${target}.${property}`, String(method), String(args)))
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*)\.(trim|toUpperCase|toLowerCase|split|replace|startsWith|endsWith)\(([^)]*)\)/g, (_match, property, method, args) => convertStringMethod(`$this->${property}`, String(method), String(args)))
    .replace(/\b([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\.(startsWith|endsWith)\(([^)]*)\)/g, (_match, target, property, method, args) => convertStringMethod(`${target}.${property}`, String(method), String(args)))
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([A-Za-z_][A-Za-z0-9_]*)\.trim\(\)\.(toUpperCase|toLowerCase)\(\)/g, (_match, target, method) => convertStringMethod(convertStringMethod(String(target), "trim", ""), String(method), ""))
    .replace(/(?<!->)(?<!\$)(?<!["'])(?<!\.)\b([A-Za-z_][A-Za-z0-9_]*)\.(trim|toUpperCase|toLowerCase|split|replace|startsWith|endsWith)\(([^)]*)\)/g, (_match, target, method, args) => convertStringMethod(String(target), String(method), String(args)))
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.slice\(([^)]*)\)/g, (_match, target, args) => convertSlice(String(target), String(args)))
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*)\.length\b/g, (_match, property) => convertLength(`$this->${property}`))
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.length\b/g, (_match, name) => convertLength(String(name)))
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.includes\(([^)]+)\)/g, (_match, array, needle) => convertIncludes(String(array), String(needle)))
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\.join\(([^)]+)\)/g, (_match, array, separator) => `implode(${String(separator).trim()}, $${array})`)
    .replace(/\(new\s+([A-Z][A-Za-z0-9_]*)\(([^)]*)\)\)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, className, constructorArgs, method, methodArgs) => `(new ${className}(${convertArgumentList(String(constructorArgs))}))->${method}(${convertArgumentList(String(methodArgs))})`)
    .replace(/^[\s\S]*$/, (expression) => replaceNewClassExpressions(String(expression)))
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, chain, method, args) => `$this->${String(chain).replace(/\./g, "->")}->${method}(${convertArgumentList(String(args))})`)
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*(?:->[A-Za-z_][A-Za-z0-9_]*)+)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, chain, method, args) => `$this->${chain}->${method}(${convertArgumentList(String(args))})`)
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, property, method, args) => `$this->${property}->${method}(${convertArgumentList(String(args))})`)
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, method, args) => `$this->${method}(${convertArgumentList(String(args))})`)
    .replace(/\b([a-z_][A-Za-z0-9_]*)\.getMessage\(\)/g, (_match, target) => `$${target}->getMessage()`)
    .replace(/\b([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g, (_match, target, method, args) => `$${target}->${method}(${convertArgumentList(String(args))})`)
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+)\b(?!\s*\()/g, (_match, chain) => `$this->${String(chain).replace(/\./g, "->")}`)
    .replace(/\$this->([A-Za-z_][A-Za-z0-9_]*(?:->[A-Za-z_][A-Za-z0-9_]*)+)\.([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*\()/g, (_match, chain, property) => `$this->${chain}->${property}`)
    .replace(/->([a-z_][A-Za-z0-9_]*)::([A-Za-z_][A-Za-z0-9_]*)\(/g, (_match, property, method) => `->${property}->${method}(`)
    .replace(/^.*$/, (expression) => replaceOutsideStringLiterals(String(expression), /(?<![\$>\'":/])\b([a-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*\()/g, (_match, target, property) => `$${target}->${property}`))
    .replace(/(.+)\s+\?\?\s+(.+)/g, (_match, left, right) => `${convertExpression(String(left).trim())} ?? ${convertExpression(String(right).trim())}`)
    .replace(/^.*$/, (expression) => convertIdentifiersInExpression(expression))
    .replace(/\$\$([A-Za-z_][A-Za-z0-9_]*->)/g, "$$$1");
}

function convertResidualThrowHelpers(text) {
  return text
    .replace(/Php\.throwInvalidArgument\(([^()\n]*)\)/g, (_match, args) => `throw new InvalidArgumentException(${convertArgumentList(String(args))})`)
    .replace(/Php\.throwRuntime\(([^()\n]*)\)/g, (_match, args) => `throw new RuntimeException(${convertArgumentList(String(args))})`);
}

function convertPhpMatchValueCalls(text) {
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

function convertTernaryExpression(value) {
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

function convertStringConcatenation(value) {
  const parts = splitTopLevelOperator(value, "+");
  if (parts.length < 2 || !parts.some((part) => /^["']/.test(part.trim()))) {
    return null;
  }
  return parts.map((part) => convertExpression(part.trim())).join(" . ");
}

function splitTopLevelOperator(value, operator) {
  const parts = [];
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

function convertCastHelper(helper, args) {
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

function replaceStaticFunctionCalls(value) {
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

function convertLength(target) {
  if (target.startsWith("$this->")) {
    return `count(${target})`;
  }
  if (target.endsWith("s") || ["values", "items", "list", "array", "keys", "entries"].includes(target)) {
    return `count($${target})`;
  }
  return `strlen($${target})`;
}

function restorePhpConstants(text) {
  return text.replace(/\$(DATE_ATOM|JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_ERROR_NONE|LOCK_EX|PASSWORD_DEFAULT|PATHINFO_EXTENSION|PHP_SESSION_ACTIVE|ENT_QUOTES|ENT_SUBSTITUTE|FILTER_VALIDATE_URL|FILTER_VALIDATE_EMAIL|UPLOAD_ERR_NO_FILE|PHP_VERSION|CURLOPT_[A-Z0-9_]+|CURLINFO_[A-Z0-9_]+)\b/g, "$1");
}

function convertTypeofComparison(target, operator, typeName) {
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

function convertIndexAccess(value) {
  return value.replace(/(?<!\$)\b([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*([^\]\n]+)\s*\]/g, (_match, target, index) => {
    return `$${target}[${convertExpression(String(index).trim())}]`;
  });
}

function convertLiteralExpression(value) {
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
      const shorthand = entry.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/);
      if (keyed !== null) {
        const rawKey = keyed[1].trim();
        const key = /^["']/.test(rawKey) ? convertExpression(rawKey) : `'${rawKey}'`;
        const convertedValue = convertExpression(keyed[2].trim());
        return rawEntries.some((rawEntry) => rawEntry.startsWith("..."))
          ? `[${key} => ${convertedValue}]`
          : `${key} => ${convertedValue}`;
      }
      if (shorthand !== null) {
        const key = `'${shorthand[1]}'`;
        const convertedValue = convertExpression(shorthand[1]);
        return rawEntries.some((rawEntry) => rawEntry.startsWith("..."))
          ? `[${key} => ${convertedValue}]`
          : `${key} => ${convertedValue}`;
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

function splitTopLevelComma(value) {
  const parts = [];
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

function convertWholeArrayFunctionalExpression(value) {
  const reduce = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\.reduce\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^,)=]+)?\s*,\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)=]+)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*([^,\n)]+)(?:,\s*(.+))?\)$/);
  if (reduce !== null) {
    return convertArrayReduceCall(reduce[1], reduce[2], reduce[3], reduce[4], reduce[5] ?? null);
  }
  const match = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\.(map|filter|some|every|find|findIndex)\(\s*\(?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[^)=,]+)?\s*\)?(?:\s*:\s*[^=]+)?\s*=>\s*(.+)\)$/);
  if (match === null) {
    return null;
  }
  const [, array, method, item, expression] = match;
  const convertedExpression = convertExpression(expression.trim());
  if (method === "map") {
    return `array_map(fn($${item}) => ${convertedExpression}, $${array})`;
  }
  if (method === "filter") {
    return `array_values(array_filter($${array}, fn($${item}) => ${convertedExpression}))`;
  }
  return convertArrayPredicateCall(array, method, item, expression);
}

function convertArrayReduceCall(array, carry, item, expression, initial) {
  const callback = `fn($${carry}, $${item}) => ${convertExpression(expression.trim())}`;
  if (initial === null || initial.trim() === "") {
    return `array_reduce($${array}, ${callback})`;
  }
  return `array_reduce($${array}, ${callback}, ${convertExpression(initial.trim())})`;
}

function convertSortComparator(left, right, expression) {
  const normalized = normalizeArrowExpression(expression);
  const simpleSubtract = normalized.match(new RegExp(`^${left}\\.([A-Za-z_][A-Za-z0-9_]*)\\s*-\\s*${right}\\.([A-Za-z_][A-Za-z0-9_]*)$`));
  if (simpleSubtract !== null) {
    return `$${left}['${simpleSubtract[1]}'] <=> $${right}['${simpleSubtract[2]}']`;
  }
  const spaceship = normalized.match(new RegExp(`^(${left}|${right})(?:\\.([A-Za-z_][A-Za-z0-9_]*)|\\[([^\\]\\n]+)\\])\\s*<=>\\s*(${left}|${right})(?:\\.([A-Za-z_][A-Za-z0-9_]*)|\\[([^\\]\\n]+)\\])$`));
  if (spaceship !== null) {
    return `${phpComparatorAccess(spaceship[1], spaceship[2] ?? spaceship[3])} <=> ${phpComparatorAccess(spaceship[4], spaceship[5] ?? spaceship[6])}`;
  }
  const stringCompare = normalized.match(new RegExp(`^(${left}|${right})(?:\\.([A-Za-z_][A-Za-z0-9_]*)|\\[([^\\]\\n]+)\\])\\.localeCompare\\(\\s*(${left}|${right})(?:\\.([A-Za-z_][A-Za-z0-9_]*)|\\[([^\\]\\n]+)\\])\\s*\\)$`));
  if (stringCompare !== null) {
    return `strcmp(${phpComparatorAccess(stringCompare[1], stringCompare[2] ?? stringCompare[3])}, ${phpComparatorAccess(stringCompare[4], stringCompare[5] ?? stringCompare[6])})`;
  }
  if (/\b(?:Php\.)?versionCompare\s*\(|\bversion_compare\s*\(|\bstrcmp\s*\(/.test(normalized)) {
    return convertExpression(normalized);
  }
  return convertExpression(normalized);
}

function phpComparatorAccess(name, property) {
  if (property === undefined || property.trim() === "") {
    return `$${name}`;
  }
  const key = property.trim();
  if (/^["']/.test(key)) {
    return `$${name}[${convertExpression(key)}]`;
  }
  return `$${name}['${key}']`;
}

function normalizeArrowExpression(expression) {
  return expression
    .replace(/\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^,)]+,\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^,)]+\s*\)\s*=>\s*/, "")
    .replace(/\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*=>\s*/, "")
    .trim();
}

function convertArrayPredicateCall(array, method, item, expression) {
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

function convertArgumentList(args) {
  return splitTopLevelComma(args)
    .map((arg) => convertExpression(arg.trim()))
    .join(", ");
}

function convertStringMethod(target, method, args) {
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

function convertStaticFunction(namespace, method, args) {
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

function convertPhpHelper(method, args) {
  const convertedArgs = convertArgumentList(args);
  switch (method) {
    case "absPath":
      return `realpath(${convertedArgs})`;
    case "arrayAppend":
      return phpArrayAppend(args);
    case "arraySet":
      return phpArraySet(args);
    case "arrayDiff":
      return `array_diff(${convertedArgs})`;
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
      return `curl_close(${convertedArgs})`;
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
    case "date":
      return `date(${convertedArgs})`;
    case "dateFormat":
      return phpObjectMethod("format", args);
    case "dateTime":
      return `new DateTime(${convertedArgs})`;
    case "dateTimeImmutable":
      return `new DateTimeImmutable(${convertedArgs})`;
    case "dateTimestamp":
      return phpObjectMethod("getTimestamp", args);
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
    case "explode":
      return `explode(${convertedArgs})`;
    case "getenv":
      return `getenv(${convertedArgs})`;
    case "gmdate":
      return `gmdate(${convertedArgs})`;
    case "gzinflate":
      return `gzinflate(${convertedArgs})`;
    case "glob":
      return `glob(${convertedArgs})`;
    case "hash":
      return `hash(${convertedArgs})`;
    case "hashEquals":
      return `hash_equals(${convertedArgs})`;
    case "hashFile":
      return `hash_file(${convertedArgs})`;
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
    case "iniGet":
      return `ini_get(${convertedArgs})`;
    case "iniSet":
      return `ini_set(${convertedArgs})`;
    case "inArray":
      return `in_array(${convertedArgs})`;
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
    case "ord":
      return `ord(${convertedArgs})`;
    case "passwordHash":
      return `password_hash(${convertedArgs})`;
    case "passwordVerify":
      return `password_verify(${convertedArgs})`;
    case "pathinfo":
      return `pathinfo(${convertedArgs})`;
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
    case "phpVersion":
      return "PHP_VERSION";
    case "randomBytes":
      return `random_bytes(${convertedArgs})`;
    case "rename":
      return `rename(${convertedArgs})`;
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
    case "strtoupper":
      return `strtoupper(${convertedArgs})`;
    case "substr":
      return `substr(${convertedArgs})`;
    case "strtok":
      return `strtok(${convertedArgs})`;
    case "time":
      return `time(${convertedArgs})`;
    case "touch":
      return `touch(${convertedArgs})`;
    case "unsetPost":
      return `unset($_POST[${convertArgumentList(args)}])`;
    case "unsetSession":
      return `unset($_SESSION[${convertArgumentList(args)}])`;
    case "unpack":
      return `unpack(${convertedArgs})`;
    case "unlink":
      return `unlink(${convertedArgs})`;
    case "throwDomain":
      return `throw new DomainException(${convertedArgs})`;
    case "throwInvalidArgument":
      return `throw new InvalidArgumentException(${convertedArgs})`;
    case "throwLogic":
      return `throw new LogicException(${convertedArgs})`;
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

function phpObjectMethod(method, args) {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "null" : convertExpression(parts[0]);
  const convertedArgs = parts.slice(1).map((arg) => convertExpression(arg)).join(", ");
  return `${target}->${method}(${convertedArgs})`;
}

function phpArrayAppend(args) {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "$items" : convertExpression(parts[0]);
  const key = parts[1] === undefined ? "''" : convertExpression(parts[1]);
  const value = parts[2] === undefined ? "null" : convertExpression(parts[2]);
  return `${target}[${key}][] = ${value}`;
}

function phpArraySet(args) {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "$items" : convertExpression(parts[0]);
  const key = parts[1] === undefined ? "''" : convertExpression(parts[1]);
  const value = parts[2] === undefined ? "null" : convertExpression(parts[2]);
  return `${target}[${key}] = ${value}`;
}

function phpObjectProp(args) {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "null" : convertExpression(parts[0]);
  const propertyRaw = parts[1] === undefined ? "''" : parts[1].trim();
  const property = propertyRaw.replace(/^["']|["']$/g, "");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(property)) {
    return `${target}->{${convertExpression(propertyRaw)}}`;
  }
  return `${target}->${property}`;
}

function phpZipOpen(args) {
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

function phpUsortVersionDesc(args) {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const target = parts[0] === undefined ? "$items" : convertExpression(parts[0]);
  const key = parts[1] === undefined ? "'version'" : convertExpression(parts[1]);
  return `usort(${target}, fn(array $a, array $b): int => version_compare((string)($b[${key}] ?? ''), (string)($a[${key}] ?? '')))`;
}

function phpMatchValue(args) {
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
    if (match === null) {
      return `default => ${convertExpression(entry.trim())}`;
    }
    return `${phpMatchKey(match[1])} => ${convertMatchArmExpression(match[2].trim())}`;
  });
  return `match (${target}) { ${arms.join(", ")} }`;
}

function convertMatchArmExpression(value) {
  const invalidArgument = value.match(/^Php\.throwInvalidArgument\(([\s\S]*)\)$/);
  if (invalidArgument !== null) {
    return `throw new InvalidArgumentException(${convertArgumentList(invalidArgument[1])})`;
  }
  const runtime = value.match(/^Php\.throwRuntime\(([\s\S]*)\)$/);
  if (runtime !== null) {
    return `throw new RuntimeException(${convertArgumentList(runtime[1])})`;
  }
  return convertExpression(value);
}

function phpMatchKey(value) {
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

function phpSuperglobalRead(superglobal, args) {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const key = parts[0] === undefined ? "''" : convertExpression(parts[0]);
  const defaultValue = parts[1] === undefined ? "null" : convertExpression(parts[1]);
  return `(${superglobal}[${key}] ?? ${defaultValue})`;
}

function phpSuperglobalWrite(superglobal, args) {
  const parts = splitTopLevelComma(args).map((arg) => arg.trim()).filter((arg) => arg !== "");
  const key = parts[0] === undefined ? "''" : convertExpression(parts[0]);
  const value = parts[1] === undefined ? "null" : convertExpression(parts[1]);
  return `${superglobal}[${key}] = ${value}`;
}


function replaceStaticFunctionResultStringMethods(value) {
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

function replaceStringCastResultMethods(value) {
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

function replaceNewClassExpressions(value) {
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

function convertIdentifiersInExpression(value) {
  const reserved = new Set([
    "true", "false", "null", "new", "self", "echo", "exit", "instanceof", "match", "throw", "string", "int", "float", "bool", "array", "object", "mixed", "DATE_ATOM", "JSON_UNESCAPED_UNICODE", "JSON_PRETTY_PRINT", "JSON_UNESCAPED_SLASHES", "JSON_ERROR_NONE", "LOCK_EX", "PASSWORD_DEFAULT", "PATHINFO_EXTENSION", "PHP_SESSION_ACTIVE", "ENT_QUOTES", "ENT_SUBSTITUTE", "FILTER_VALIDATE_URL", "FILTER_VALIDATE_EMAIL", "UPLOAD_ERR_NO_FILE", "PHP_VERSION",
  ]);
  if (/^new\s+[A-Za-z_][A-Za-z0-9_]*\(/.test(value)) {
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

function convertIncludes(target, needle) {
  const convertedNeedle = phpValueReference(needle.trim());
  if (target.endsWith("s") || ["values", "items", "list", "array"].includes(target)) {
    return `in_array(${convertedNeedle}, $${target}, true)`;
  }
  return `str_contains($${target}, ${convertedNeedle})`;
}

function convertSlice(target, args) {
  const convertedArgs = convertArgumentList(args);
  if (target.endsWith("s") || ["values", "items", "list", "array"].includes(target)) {
    return `array_slice($${target}, ${convertedArgs})`;
  }
  return `mb_substr($${target}, ${convertedArgs})`;
}

function convertForOf(text) {
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

function convertForIn(text) {
  return convertForEachLike(text, "in", (name, expression) => {
    return `foreach (${convertExpression(expression)} as $${name} => $_value)`;
  });
}

function convertForEachLike(text, operator, render) {
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

function phpValueReference(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("$") || isLiteralLike(trimmed)) {
    return trimmed;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return `$${trimmed}`;
  }
  return convertExpression(trimmed);
}

function isLiteralLike(value) {
  return ["true", "false", "null"].includes(value) || /^[0-9]+(?:\.[0-9]+)?$/.test(value) || /^['"]/.test(value);
}

function validateSource(file) {
  const unsupportedPatterns = [
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

  file.text.split(/\r?\n/).forEach((line, index) => {
    if (/^\/\/\s*@php-(?:declare|namespace|use|run-unless-defined)\s+.+$/.test(line)) {
      return;
    }
    for (const [pattern, label] of unsupportedPatterns) {
      if (pattern.test(line)) {
        throw new Error(`${file.relativePath}:${index + 1}: unsupported syntax: ${label}`);
      }
    }
  });
}

function phpType(typeName) {
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

function convertParams(params) {
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

function splitTopLevelAssignment(value) {
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

function nullablePhpType(typeName) {
  const type = phpType(typeName);
  return type.split("|").includes("null") ? type : `${type}|null`;
}

function unique(values) {
  return [...new Set(values)];
}
