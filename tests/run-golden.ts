const root = decodeURIComponent(new URL(".", import.meta.url).pathname).replace(/\/tests\/$/, "");
const goldenRoot = `${root}/tests/golden`;
const errorRoot = `${root}/tests/errors`;
const projectGoldenRoot = `${root}/tests/projects/golden`;
const projectErrorRoot = `${root}/tests/projects/errors`;
const outputRoot = `${root}/Work/phptranspiler-golden-${Deno.pid}-${Date.now()}`;
const version = (await Deno.readTextFile(`${root}/VERSION`)).trim();

await Deno.mkdir(outputRoot, { recursive: true });
try {

for (const entry of await sortedFileEntries(goldenRoot)) {
  if (!entry.name.endsWith(".input.ts")) {
    continue;
  }
  const inputPath = `${goldenRoot}/${entry.name}`;
  const outputName = entry.name.replace(".ts", ".php");
  const expectedPath = `${goldenRoot}/${entry.name.replace(".input.ts", ".expected.php")}`;
  const outputPath = `${outputRoot}/${outputName}`;

  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      `${root}/src/main.ts`,
      "--input",
      inputPath,
      "--out",
      outputRoot,
      "--version",
      version,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();
  if (result.code !== 0) {
    const stderr = new TextDecoder().decode(result.stderr);
    throw new Error(`transpile failed for ${entry.name}: ${stderr}`);
  }

  const actual = await Deno.readTextFile(outputPath);
  const expected = await Deno.readTextFile(expectedPath);
  if (actual !== expected) {
    throw new Error(`golden mismatch: ${entry.name}\nexpected:\n${expected}\nactual:\n${actual}`);
  }

  const lint = new Deno.Command("php", {
    args: ["-l", outputPath],
    stdout: "piped",
    stderr: "piped",
  });
  const lintResult = await lint.output();
  if (lintResult.code !== 0) {
    const stderr = new TextDecoder().decode(lintResult.stderr);
    throw new Error(`generated PHP syntax check failed for ${entry.name}: ${stderr}`);
  }
}

console.log("phptranspiler-golden-ok");

for (const project of await sortedDirectoryEntries(projectGoldenRoot)) {
  const inputPath = `${projectGoldenRoot}/${project.name}/input`;
  const expectedPath = `${projectGoldenRoot}/${project.name}/expected`;
  const actualPath = `${outputRoot}/projects/${project.name}`;
  await Deno.remove(actualPath, { recursive: true }).catch(() => undefined);
  await runTranspiler(inputPath, actualPath, project.name);
  await compareDirectory(expectedPath, actualPath, project.name);
}

console.log("phptranspiler-project-golden-ok");

for (const entry of await sortedFileEntries(errorRoot)) {
  if (!entry.name.endsWith(".input.ts")) {
    continue;
  }
  const inputPath = `${errorRoot}/${entry.name}`;
  const expectedMessagePath = `${errorRoot}/${entry.name.replace(".input.ts", ".expected-error.txt")}`;
  const expectedMessage = (await Deno.readTextFile(expectedMessagePath)).trim();
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      `${root}/src/main.ts`,
      "--input",
      inputPath,
      "--out",
      outputRoot,
      "--version",
      version,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();
  if (result.code === 0) {
    throw new Error(`expected transpile failure for ${entry.name}`);
  }
  const stderr = new TextDecoder().decode(result.stderr);
  if (!stderr.includes(expectedMessage)) {
    throw new Error(`unexpected error for ${entry.name}\nexpected to include:\n${expectedMessage}\nactual:\n${stderr}`);
  }
}

console.log("phptranspiler-error-cases-ok");

for (const project of await sortedDirectoryEntries(projectErrorRoot)) {
  const inputPath = `${projectErrorRoot}/${project.name}/input`;
  const expectedMessagePath = `${projectErrorRoot}/${project.name}/expected-error.txt`;
  const expectedMessage = (await Deno.readTextFile(expectedMessagePath)).trim();
  const command = transpilerCommand(inputPath, `${outputRoot}/project-errors/${project.name}`);
  const result = await command.output();
  if (result.code === 0) {
    throw new Error(`expected project transpile failure for ${project.name}`);
  }
  const stderr = new TextDecoder().decode(result.stderr);
  if (!stderr.includes(expectedMessage)) {
    throw new Error(`unexpected project error for ${project.name}\nexpected to include:\n${expectedMessage}\nactual:\n${stderr}`);
  }
}

console.log("phptranspiler-project-error-cases-ok");
} finally {
  await Deno.remove(outputRoot, { recursive: true }).catch(() => undefined);
}

function transpilerCommand(inputPath: string, outPath: string): Deno.Command {
  return new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      `${root}/src/main.ts`,
      "--input",
      inputPath,
      "--out",
      outPath,
      "--version",
      version,
    ],
    stdout: "piped",
    stderr: "piped",
  });
}

async function runTranspiler(inputPath: string, outPath: string, label: string): Promise<void> {
  const result = await transpilerCommand(inputPath, outPath).output();
  if (result.code !== 0) {
    const stderr = new TextDecoder().decode(result.stderr);
    throw new Error(`transpile failed for ${label}: ${stderr}`);
  }
}

async function compareDirectory(expectedRoot: string, actualRoot: string, label: string): Promise<void> {
  for (const expectedFile of await listFiles(expectedRoot)) {
    const relativePath = expectedFile.slice(expectedRoot.length + 1);
    const actualFile = `${actualRoot}/${relativePath}`;
    const expected = await Deno.readTextFile(expectedFile);
    const actual = await Deno.readTextFile(actualFile);
    if (actual !== expected) {
      throw new Error(`project golden mismatch: ${label}/${relativePath}\nexpected:\n${expected}\nactual:\n${actual}`);
    }
    if (actualFile.endsWith(".php")) {
      const lint = new Deno.Command("php", {
        args: ["-l", actualFile],
        stdout: "piped",
        stderr: "piped",
      });
      const lintResult = await lint.output();
      if (lintResult.code !== 0) {
        const stderr = new TextDecoder().decode(lintResult.stderr);
        throw new Error(`project PHP syntax check failed for ${label}/${relativePath}: ${stderr}`);
      }
    }
  }
}

async function listFiles(path: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    const entryPath = `${path}/${entry.name}`;
    if (entry.isDirectory) {
      files.push(...await listFiles(entryPath));
    } else if (entry.isFile) {
      files.push(entryPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function sortedFileEntries(path: string): Promise<Deno.DirEntry[]> {
  const entries: Deno.DirEntry[] = [];
  for await (const entry of Deno.readDir(path)) {
    if (entry.isFile) {
      entries.push(entry);
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

async function sortedDirectoryEntries(path: string): Promise<Deno.DirEntry[]> {
  const entries: Deno.DirEntry[] = [];
  for await (const entry of Deno.readDir(path)) {
    if (entry.isDirectory) {
      entries.push(entry);
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}
