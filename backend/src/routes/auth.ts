import express from 'express';
import { register, login, verifyEmail, forgotPassword, resetPassword } from '../controllers/authController';
import { addCorsHeaders } from '../middleware/auth';

const router = express.Router();

// Add CORS headers to all auth routes
router.use(addCorsHeaders);

// Handle OPTIONS requests explicitly
router.options('*', (_req, res) => {
    res.sendStatus(200);
});

router.post('/register', register);
router.post('/login', login);
router.get('/verify/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;
