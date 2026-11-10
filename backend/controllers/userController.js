const User = require('../models/User');
const Project = require('../models/Project');

const getUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
};

const getStudents = async (req, res) => {
  const students = await User.find({ role: 'student' }).sort({ name: 1 });
  res.json(students);
};

const approveFaculty = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'faculty' },
    { isApproved: true },
    { new: true, runValidators: true }
  );
  if (!user) return res.status(404).json({ message: 'Faculty account not found' });
  res.json(user);
};

const getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

const createUser = async (req, res) => {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
  });
  res.status(201).json(user);
};

const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.name = req.body.name ?? user.name;
  user.email = req.body.email ?? user.email;
  user.role = req.body.role ?? user.role;
  await user.save();
  res.json(user);
};

const deleteUser = async (req, res) => {
  const projectCount = await Project.countDocuments({ student: req.params.id });
  if (projectCount > 0) {
    return res.status(409).json({
      message: 'Transfer or remove this student’s projects before deleting the account',
    });
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.status(204).end();
};

module.exports = { getUsers, getStudents, getUser, createUser, updateUser, approveFaculty, deleteUser };