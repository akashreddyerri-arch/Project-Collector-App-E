const express = require('express');
const {
  getUsers,
  getStudents,
  getUser,
  createUser,
  updateUser,
  approveFaculty,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/students', authorize('faculty', 'admin'), getStudents);
router.patch('/:id/approve', authorize('admin'), approveFaculty);
router.use(authorize('admin'));
router.route('/').get(getUsers).post(createUser);
router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);

module.exports = router;