import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

/**
 * Một controller chỉ nhận request khi module chứa nó được AppModule nạp vào.
 * Quên một dòng trong mảng imports thì toàn bộ route của controller đó biến mất
 * và máy chủ trả "Cannot GET", trong khi typecheck, lint và unit test đều xanh.
 *
 * Đúng lỗi này đã xảy ra: CollectorsModule chưa từng được đăng ký, nên ba route
 * /collectors/me, /collectors/me (PATCH) và /collectors/me/nearby-orders không
 * tồn tại dù mã nguồn của chúng vẫn biên dịch bình thường.
 */

type ModuleLike = { name?: string };

/** Duyệt cây imports của Nest để lấy mọi module mà AppModule thật sự nạp. */
function collectRegisteredModules(root: unknown, seen = new Set<string>()): Set<string> {
  const imports = (Reflect.getMetadata('imports', root as object) ?? []) as unknown[];
  for (const entry of imports) {
    // Bỏ qua module động dạng { module: X } và các giá trị không phải class.
    const candidate =
      typeof entry === 'object' && entry !== null && 'module' in entry
        ? (entry as { module: unknown }).module
        : entry;
    const name = (candidate as ModuleLike)?.name;
    if (typeof name !== 'string' || seen.has(name)) continue;
    seen.add(name);
    collectRegisteredModules(candidate, seen);
  }
  return seen;
}

/** Tên tất cả module có file *.module.ts trong src/modules. */
function moduleFilesOnDisk(): string[] {
  const modulesDir = join(__dirname, 'modules');
  const names: string[] = [];
  for (const entry of readdirSync(modulesDir)) {
    const dir = join(modulesDir, entry);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.module.ts')) continue;
      // collectors.module.ts -> CollectorsModule
      const base = file.replace('.module.ts', '');
      const pascal = base
        .split(/[-.]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      names.push(`${pascal}Module`);
    }
  }
  return names;
}

describe('AppModule nạp đủ các module', () => {
  const registered = collectRegisteredModules(AppModule);

  it('nạp CollectorsModule để các route /collectors/* có thật', () => {
    expect([...registered]).toContain('CollectorsModule');
  });

  it('không bỏ sót module nào đang có file trên đĩa', () => {
    const missing = moduleFilesOnDisk().filter((name) => !registered.has(name));

    expect(missing).toEqual([]);
  });
});
