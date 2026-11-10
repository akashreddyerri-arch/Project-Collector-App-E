const express = require('express');
const {
  getFeaturedProjects,
  getProjects,
  getProject,
  createProject,
  updateProject,
  reviewProject,
  deleteProject,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/featured', getFeaturedProjects);
router.use(protect);
router.route('/').get(getProjects).post(authorize('student'), createProject);
router.patch('/:id/review', authorize('faculty', 'admin'), reviewProject);
router.route('/:id').get(getProject).put(authorize('student'), updateProject);
router.delete('/:id', deleteProject);

module.exports = router;