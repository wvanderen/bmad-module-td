import { createHash } from "node:crypto";
import { readdir, readFile, rm, cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");

const sourceArgIndex = process.argv.indexOf("--source-dir");
const sourceDir =
  sourceArgIndex >= 0 && process.argv[sourceArgIndex + 1]
    ? process.argv[sourceArgIndex + 1]
    : ".";

const sourcePath = (target) =>
  sourceDir === "." ? target : path.join(sourceDir, target);

const syncPairs = [
  { src: sourcePath("data"), dest: "_bmad/td-integration/data", type: "dir" },
  {
    src: sourcePath("templates"),
    dest: "_bmad/td-integration/templates",
    type: "dir",
  },
  { src: sourcePath("tools"), dest: "_bmad/td-integration/tools", type: "dir" },
  {
    src: sourcePath("workflows"),
    dest: "_bmad/td-integration/workflows",
    type: "dir",
  },
  {
    src: sourcePath("module.yaml"),
    dest: "_bmad/td-integration/module.yaml",
    type: "file",
  },
  {
    src: sourcePath("module-help.csv"),
    dest: "_bmad/td-integration/module-help.csv",
    type: "file",
  },
  {
    src: sourcePath("README.md"),
    dest: "_bmad/td-integration/README.md",
    type: "file",
  },
  {
    src: sourcePath("AGENTS.md"),
    dest: "_bmad/td-integration/AGENTS.md",
    type: "file",
  },
];

const hashBuffer = (buffer) =>
  createHash("sha256").update(buffer).digest("hex");

const listFiles = async (baseDir) => {
  const absolute = path.join(root, baseDir);
  const files = [];

  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(path.relative(absolute, fullPath));
      }
    }
  };

  await walk(absolute);
  files.sort();
  return files;
};

const ensureExists = async (targetPath) => {
  try {
    await stat(path.join(root, targetPath));
    return true;
  } catch {
    return false;
  }
};

const compareFile = async (srcPath, destPath) => {
  const [srcBuffer, destBuffer] = await Promise.all([
    readFile(path.join(root, srcPath)),
    readFile(path.join(root, destPath)),
  ]);
  return hashBuffer(srcBuffer) === hashBuffer(destBuffer);
};

const checkSync = async () => {
  const drift = [];

  for (const pair of syncPairs) {
    const srcExists = await ensureExists(pair.src);
    const destExists = await ensureExists(pair.dest);

    if (!srcExists) {
      drift.push(`Missing source: ${pair.src}`);
      continue;
    }

    if (!destExists) {
      drift.push(`Missing destination: ${pair.dest}`);
      continue;
    }

    if (pair.type === "file") {
      const same = await compareFile(pair.src, pair.dest);
      if (!same) drift.push(`File differs: ${pair.src} -> ${pair.dest}`);
      continue;
    }

    const [srcFiles, destFiles] = await Promise.all([
      listFiles(pair.src),
      listFiles(pair.dest),
    ]);

    const srcSet = new Set(srcFiles);
    const destSet = new Set(destFiles);

    for (const relative of srcFiles) {
      if (!destSet.has(relative)) {
        drift.push(`Missing file in destination: ${pair.dest}/${relative}`);
        continue;
      }

      const same = await compareFile(
        path.join(pair.src, relative),
        path.join(pair.dest, relative),
      );
      if (!same) {
        drift.push(
          `File differs: ${pair.src}/${relative} -> ${pair.dest}/${relative}`,
        );
      }
    }

    for (const relative of destFiles) {
      if (!srcSet.has(relative)) {
        drift.push(`Extra file in destination: ${pair.dest}/${relative}`);
      }
    }
  }

  if (drift.length > 0) {
    console.error("td-integration mirror is out of sync:");
    for (const item of drift) console.error(`- ${item}`);
    process.exit(1);
  }

  console.log("td-integration mirror is in sync.");
};

const doSync = async () => {
  for (const pair of syncPairs) {
    const srcAbsolute = path.join(root, pair.src);
    const destAbsolute = path.join(root, pair.dest);

    if (pair.type === "dir") {
      await rm(destAbsolute, { recursive: true, force: true });
      await mkdir(path.dirname(destAbsolute), { recursive: true });
      await cp(srcAbsolute, destAbsolute, { recursive: true });
      continue;
    }

    await mkdir(path.dirname(destAbsolute), { recursive: true });
    await cp(srcAbsolute, destAbsolute);
  }

  console.log("Synchronized source module files into _bmad/td-integration.");
};

if (checkOnly) {
  await checkSync();
} else {
  await doSync();
  await checkSync();
}
