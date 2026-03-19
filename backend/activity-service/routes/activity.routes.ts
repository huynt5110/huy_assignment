import { Router } from 'express';
import { activityController } from '../controllers/activity.controller';
import { validate } from '../../middleware/validate';
import { createActivitySchema } from '../schemas/activity.schema';

const router = Router();

router.get('/leads/:id/activities', activityController.listActivities);
router.post('/leads/:id/activities', validate(createActivitySchema), activityController.createActivity);

export default router;
