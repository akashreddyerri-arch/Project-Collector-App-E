const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createToken = (user) => jwt.sign(
  { sub: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);

const register = async (req, res) => {
  const { name, email, password } = req.body;
  const role = req.body.role === 'faculty' ? 'faculty' : 'student';
  const user = await User.create({
    name,
    email,
    password,
    role,
    isApproved: role === 'student',
  });
  if (!user.isApproved) {
    return res.status(201).json({
      pendingApproval: true,
      message: 'Your faculty account is awaiting admin approval.',
    });
  }
  res.status(201).json({ token: createToken(user), user });
};

const login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email }).select('+password');
  const validPassword = user && await bcrypt.compare(
    String(req.body.password || ''),
    user.password
  );

  if (!validPassword) {
    return res.status(401).json({ message: 'Email or password is incorrect' });
  }
  if (!user.isApproved) {
    return res.status(403).json({ message: 'Your faculty account is awaiting admin approval' });
  }
  res.json({ token: createToken(user), user });
};

const currentUser = (req, res) => res.json({ user: req.user });

module.exports = { register, login, currentUser };