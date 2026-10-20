// Every row of a paged list, for downloads: asks for pages of 100 until all
// are in. `pageFn(params)` must return { items, total }.
const MAX_ROWS = 10000;

export async function fetchAllPages(pageFn, params = {}, { pageSize = 100, onProgress } = {}) {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const res = await pageFn({ ...params, page, pageSize });
    rows.push(...(res.items || []));
    onProgress?.(rows.length, res.total);
    if (!res.items?.length || rows.length >= (res.total ?? 0) || rows.length >= MAX_ROWS) break;
  }
  return rows;
}
