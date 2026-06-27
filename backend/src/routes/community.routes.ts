import { Router } from 'express';
import { CommunityController } from '../controllers/community.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/posts', authenticate, CommunityController.getPosts);
router.get('/posts/:id', authenticate, CommunityController.getPost);
router.post('/posts', authenticate, CommunityController.createPost);
router.post('/posts/:id/reply', authenticate, CommunityController.addReply);
router.post('/posts/:id/upvote', authenticate, CommunityController.upvotePost);
router.delete('/posts/:id', authenticate, CommunityController.deletePost);

export default router;
