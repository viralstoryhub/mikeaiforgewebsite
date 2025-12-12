import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        savedTools: true,
        utilityUsage: true,
        personas: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ status: 'success', data: { user: userWithoutPassword } });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, bio, profilePictureUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, bio, profilePictureUrl },
    });

    const { password, ...userWithoutPassword } = user;
    res.json({ status: 'success', data: { user: userWithoutPassword } });
  } catch (error) {
    next(error);
  }
};

export const saveTool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toolId } = req.body;

    // Idempotent: create if not exists
    await prisma.savedTool.upsert({
      where: { userId_toolId: { userId: req.user!.id, toolId } },
      update: {}, // No-op if already exists
      create: { userId: req.user!.id, toolId },
    });

    res.json({ status: 'success', data: { saved: true } });
  } catch (error) {
    next(error);
  }
};

export const unsaveTool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toolId } = req.body;

    // Idempotent: delete if exists, no error if not exists
    await prisma.savedTool.deleteMany({
      where: { userId: req.user!.id, toolId },
    });

    res.json({ status: 'success', data: { saved: false } });
  } catch (error) {
    next(error);
  }
};

// Simple in-memory queue for batching utility usage updates
const usageQueue = new Map<string, { userId: string; utilitySlug: string; count: number }>();
let flushTimeout: NodeJS.Timeout | null = null;

const flushUsageQueue = async () => {
  if (usageQueue.size === 0) return;

  const entries = Array.from(usageQueue.entries());
  usageQueue.clear();

  // Process all queued updates in parallel
  await Promise.all(
    entries.map(([_, data]) =>
      prisma.utilityUsage.upsert({
        where: { userId_utilitySlug: { userId: data.userId, utilitySlug: data.utilitySlug } },
        update: {
          count: { increment: data.count },
          lastUsedAt: new Date(),
        },
        create: {
          userId: data.userId,
          utilitySlug: data.utilitySlug,
          count: data.count,
          lastUsedAt: new Date(),
        },
      }).catch((error) => {
        console.error('Error flushing usage queue:', error);
      })
    )
  );
};

export const recordUtilityUsage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { utilitySlug } = req.body;
    const userId = req.user!.id;
    const queueKey = `${userId}:${utilitySlug}`;

    // Add to queue or increment existing entry
    const existing = usageQueue.get(queueKey);
    if (existing) {
      existing.count += 1;
    } else {
      usageQueue.set(queueKey, { userId, utilitySlug, count: 1 });
    }

    // Schedule flush if not already scheduled
    if (!flushTimeout) {
      flushTimeout = setTimeout(async () => {
        flushTimeout = null;
        await flushUsageQueue();
      }, 5000); // Flush every 5 seconds
    }

    res.json({ status: 'success', data: { queued: true } });
  } catch (error) {
    next(error);
  }
};

export const createPersona = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;

    const persona = await prisma.aIPersona.create({
      data: {
        userId: req.user!.id,
        name,
        description,
      },
    });

    res.status(201).json({ status: 'success', data: { persona } });
  } catch (error) {
    next(error);
  }
};

export const updatePersona = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { personaId } = req.params;
    const { name, description } = req.body;

    const persona = await prisma.aIPersona.updateMany({
      where: { id: personaId, userId: req.user!.id },
      data: { name, description },
    });

    if (persona.count === 0) {
      throw new AppError('Persona not found', 404);
    }

    res.json({ status: 'success', data: { persona } });
  } catch (error) {
    next(error);
  }
};

export const deletePersona = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { personaId } = req.params;

    // Parse personaId to a number and validate
    const parsedPersonaId = parseInt(personaId, 10);
    if (isNaN(parsedPersonaId)) {
      throw new AppError('Invalid persona ID', 400);
    }

    const result = await prisma.aIPersona.deleteMany({
      where: { id: String(parsedPersonaId), userId: req.user!.id },
    });

    if (result.count === 0) {
      throw new AppError('Persona not found or not owned by user', 404);
    }

    res.json({ status: 'success', message: 'Persona deleted' });
  } catch (error) {
    next(error);
  }
};
