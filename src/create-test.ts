import { resolve } from 'path';
import { useYGOProTest, YGOProTestOptions } from 'ygopro-jstest';

type MaybeArray<T> = T | T[];

export type CreateTestOptions = Partial<YGOProTestOptions>;

const toArray = <T>(value: MaybeArray<T> | undefined): T[] => {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

export const createTest = (
  options: CreateTestOptions = {},
  cb: Parameters<typeof useYGOProTest>[1],
) => {
  const ygoproDir = resolve(process.cwd(), 'ygopro');

  return useYGOProTest(
    {
      ...options,
      cdb: [...toArray(options.cdb), resolve(ygoproDir, 'cards.cdb')],
      scriptPath: [
        ...toArray(options.scriptPath),
        resolve(ygoproDir, 'script'),
      ],
      ygoproPath: toArray(options.ygoproPath),
    },
    cb,
  );
};
