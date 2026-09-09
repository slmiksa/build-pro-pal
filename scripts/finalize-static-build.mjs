import { access, cp, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist");
const client = path.join(dist, "client");
const staged = path.join(root, ".static-build-output");
const sourceHtaccess = path.join(root, ".htaccess");
const productionRoot = "/home/shield.lamhasec.com/public_html";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(path.join(client, "index.html")))) {
  throw new Error("لم يتم إنشاء dist/client/index.html، لذلك تم إيقاف البناء بدل نشر ملفات ناقصة.");
}

await rm(staged, { recursive: true, force: true });
await mkdir(staged, { recursive: true });
await cp(client, staged, { recursive: true, force: true });
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
