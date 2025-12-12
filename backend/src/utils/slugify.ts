import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prismaClientSingleton = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClientSingleton;
}

export const slugify = (input: string): string => {
  if (!input) {
    return '';
  }

  const normalized = input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const sanitized = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim();

  const hyphenated = sanitized
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return hyphenated;
};

export interface UniqueSlugOptions {
  prismaClient?: PrismaClient;
  fieldName?: string;
  excludeId?: string | number;
  idField?: string;
}

export const uniqueSlug = async (
  baseValue: string,
  modelName: Prisma.ModelName,
  options: UniqueSlugOptions = {}
): Promise<string> => {
  const {
    prismaClient = prismaClientSingleton,
    fieldName = 'slug',
    excludeId,
    idField = 'id',
  } = options;

  const baseSlug = slugify(baseValue) || 'item';
  const delegateKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const modelDelegate = (prismaClient as Record<string, any>)[delegateKey];

  if (!modelDelegate || typeof modelDelegate.findFirst !== 'function') {
    throw new Error(`Prisma model delegate for ${modelName} not found on PrismaClient.`);
  }

  const slugExists = async (candidate: string): Promise<boolean> => {
    const where: Record<string, any> = { [fieldName]: candidate };

    if (excludeId !== undefined && excludeId !== null) {
      where.NOT = { [idField]: excludeId };
    }

    const existing = await modelDelegate.findFirst({ where });
    return Boolean(existing);
  };

  if (!(await slugExists(baseSlug))) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;

  while (await slugExists(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
};