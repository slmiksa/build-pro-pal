import { access, cp, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist");
const staged = path.join(root, ".static-build-output");
const sourceHtaccess = path.join(root, ".htaccess");
const productionRoot = "/home/shield.lamhasec.com/public_html";
const staticOutputCandidates = [
  path.join(root, ".output", "public"),
  path.join(root, ".output", "client"),
  path.join(dist, "client"),
  path.join(dist, "public"),
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

let staticOutput;
for (const candidate of staticOutputCandidates) {
  if (await exists(path.join(candidate, "index.html"))) {
    staticOutput = candidate;
    break;
  }
}

if (!staticOutput) {
  throw new Error("لم يتم العثور على index.html في ناتج الموقع (.output/public أو dist/client).");
}

await rm(staged, { recursive: true, force: true });
await mkdir(staged, { recursive: true });
await cp(staticOutput, staged, { recursive: true, force: true });
await cp(sourceHtaccess, path.join(staged, ".htaccess"), { force: true });

// لا نُبقي أي ناتج خادم أو ملفات قديمة داخل dist.
await rm(dist, { recursive: true, force: true });
await rename(staged, dist);
await rm(path.join(dist, "server"), { recursive: true, force: true });
await rm(path.join(dist, ".output"), { recursive: true, force: true });
await rm(path.join(dist, "nitro.json"), { force: true });
await rm(path.join(dist, ".lovable"), { recursive: true, force: true });

if (!(await exists(path.join(dist, "index.html")))) {
  throw new Error("فشل تجهيز dist/index.html.");
}
if (await exists(path.join(dist, "server"))) {
  throw new Error("فشل حذف dist/server.");
}

// cp -r dist/* لا ينسخ الملفات المخفية؛ لذا نضع .htaccess مباشرة في public_html عند توفره.
if (await exists(productionRoot)) {
  await rm(path.join(productionRoot, "server"), { recursive: true, force: true });
  await cp(sourceHtaccess, path.join(productionRoot, ".htaccess"), { force: true });
  console.log(`تم حذف مجلد server القديم من ${productionRoot}`);
  console.log(`تم نسخ .htaccess إلى ${productionRoot}/.htaccess`);
}

console.log("تم تجهيز dist: index.html وملفات الموقع فقط، بدون server.");
