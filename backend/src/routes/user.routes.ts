import { Router } from 'express';
import { body } from 'express-validator';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile);

router.patch(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('bio').optional().trim(),
    body('profilePictureUrl').optional().isURL(),
  ],
  validate,
  userController.updateProfile
);

router.post(
  '/saved-tools',
  [body('toolId').notEmpty()],
  validate,
  userController.saveTool
);

router.delete(
  '/saved-tools',
  [body('toolId').notEmpty()],
  validate,
  userController.unsaveTool
);

router.post(
  '/utility-usage',
  [body('utilitySlug').notEmpty()],
  validate,
  userController.recordUtilityUsage
);

router.post(
  '/personas',
  [
    body('name').trim().isLength({ min: 2 }),
    body('description').trim().isLength({ min: 10 }),
  ],
  validate,
  userController.createPersona
);

router.patch('/personas/:personaId', userController.updatePersona);
router.delete('/personas/:personaId', userController.deletePersona);

export default router;
