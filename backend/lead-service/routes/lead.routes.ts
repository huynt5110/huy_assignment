import { Router } from 'express';
import { leadController } from '../controllers/lead.controller';
import { validate } from '../../middleware/validate';
import { createLeadSchema } from '../schemas/lead.schema';

const router = Router();

router.get('/leads', leadController.listLeads);
router.get('/leads/:id', leadController.getLead);
router.post('/leads', validate(createLeadSchema), leadController.createLead);

export default router;
