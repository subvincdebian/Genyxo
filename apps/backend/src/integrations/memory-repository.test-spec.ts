/** In-memory stand-in for a TypeORM repository in unit tests (excluded from builds as *spec.ts). */
export function memoryRepository<T extends { id?: any }>(rows: T[] = []) {
  let next = 1;
  const matches = (row: any, where: any = {}) =>
    Object.entries(where).every(([key, value]: [string, any]) =>
      value && typeof value === "object" && "_value" in value
        ? value._value.includes(row[key])
        : row[key] === value,
    );
  return {
    rows,
    create: (data: Partial<T>) => ({ ...data }) as T,
    find: jest.fn(async ({ where }: any = {}) =>
      rows.filter((row) => matches(row, where)),
    ),
    findOne: jest.fn(
      async ({ where }: any) => rows.find((row) => matches(row, where)) || null,
    ),
    save: jest.fn(async (row: any) => {
      if (row.id === undefined) row.id = next++;
      const index = rows.findIndex((item) => item.id === row.id);
      if (index >= 0) rows[index] = row;
      else rows.push(row);
      return row;
    }),
    update: jest.fn(async (where: any, patch: any) => {
      const hits = rows.filter((row) => matches(row, where));
      hits.forEach((row) => Object.assign(row, patch));
      return { affected: hits.length };
    }),
    delete: jest.fn(async (where: any) => {
      const before = rows.length;
      for (let index = rows.length - 1; index >= 0; index--)
        if (matches(rows[index], where)) rows.splice(index, 1);
      return { affected: before - rows.length };
    }),
  };
}
