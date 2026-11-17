import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("../../scripts/package-windows-portable.ps1", import.meta.url),
);
const windowsOnly = { skip: process.platform !== "win32" };
const fixture = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "portable-package-test-"));
  const exe = path.join(root, "synthetic.exe");
  const output = path.join(root, "output");
  // 合成内容，仅验证打包；不启动程序，不接触真实配置。
  writeFileSync(exe, "synthetic executable fixture");
  return { root, exe, output };
};
const pack = (exe, output, version = "1.2.0") =>
  execFileSync(
    "pwsh",
    [
      "-NoProfile",
      "-NonInteractive",
      "-File",
      script,
      "-Version",
      version,
      "-ExecutablePath",
      exe,
      "-OutputDirectory",
      output,
    ],
    { encoding: "utf8", stdio: "pipe" },
  );

test(
  "portable ZIP contains exactly the executable and portable marker at its root",
  windowsOnly,
  () => {
    const { root, exe, output } = fixture();
    writeFileSync(
      path.join(root, "private-config.json"),
      "must not be packaged",
    );
    pack(exe, output);
    const archive = path.join(
      output,
      "CC-Switch-Classic-v1.2.0-Windows-Portable.zip",
    );
    const contents = JSON.parse(
      execFileSync(
        "pwsh",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `
    $zip = [System.IO.Compression.ZipFile]::OpenRead($env:PORTABLE_TEST_ARCHIVE)
    try {
      @($zip.Entries | ForEach-Object {
        $reader = [System.IO.StreamReader]::new($_.Open())
        try { @{ name = $_.FullName; text = $reader.ReadToEnd() } }
        finally { $reader.Dispose() }
      }) | ConvertTo-Json -Compress
    } finally { $zip.Dispose() }
  `,
        ],
        {
          encoding: "utf8",
          env: { ...process.env, PORTABLE_TEST_ARCHIVE: archive },
        },
      ),
    );
    assert.deepEqual(contents.map((entry) => entry.name).sort(), [
      "cc-switch.exe",
      "portable.ini",
    ]);
    assert.equal(
      contents.find((entry) => entry.name === "cc-switch.exe").text,
      "synthetic executable fixture",
    );
    assert.match(
      contents.find((entry) => entry.name === "portable.ini").text,
      /^portable=true\r?$/m,
    );
    const original = readFileSync(archive);
    assert.throws(() => pack(exe, output), /Refusing to overwrite/);
    assert.deepEqual(readFileSync(archive), original);
  },
);

test(
  "missing or empty executable never produces an archive",
  windowsOnly,
  () => {
    const { root, exe, output } = fixture();
    assert.throws(
      () => pack(path.join(root, "missing.exe"), output),
      /executable not found/,
    );
    writeFileSync(exe, "");
    assert.throws(() => pack(exe, output), /executable is empty/);
    assert.equal(existsSync(output), false);
  },
);

test(
  "branch names and path fragments cannot become release versions",
  windowsOnly,
  () => {
    const { exe, output } = fixture();
    assert.throws(() => pack(exe, output, "personal/main"));
    assert.throws(() => pack(exe, output, "../escape"));
    assert.equal(existsSync(output), false);
  },
);
