require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');

const demoUsers = [
  { name: 'Avery Morgan', email: 'admin@collector.edu', password: 'Admin123!', role: 'admin' },
  { name: 'Dr. Rowan Lee', email: 'faculty@collector.edu', password: 'Faculty123!', role: 'faculty' },
  { name: 'Maya Chen', email: 'student@collector.edu', password: 'Student123!', role: 'student' },
  { name: 'Jordan Patel', email: 'jordan@collector.edu', password: 'Student123!', role: 'student' },
];

const demoProjects = [
  {
    title: 'Campus Energy Monitor',
    summary: 'A dashboard that visualizes building energy use and identifies opportunities to reduce after-hours consumption.',
    category: 'Sustainability',
    technologies: ['React', 'Node.js', 'MongoDB'],
    repositoryUrl: 'https://github.com/example/campus-energy-monitor',
    status: 'approved',
    feedback: 'Clear scope and a useful campus impact. Approved for the showcase.',
  },
  {
    title: 'Accessible Route Finder',
    summary: 'A campus map that helps students find step-free routes between buildings, with elevator and path updates.',
    category: 'Accessibility',
    technologies: ['React', 'OpenStreetMap', 'Express'],
    repositoryUrl: 'https://github.com/example/accessible-route-finder',
    status: 'pending',
    feedback: '',
  },
  {
    title: 'Library Seat Availability',
    summary: 'A lightweight reservation and occupancy tool that helps students find an available study space.',
    category: 'Student Life',
    technologies: ['Vue', 'Node.js', 'PostgreSQL'],
    repositoryUrl: 'https://github.com/example/library-seats',
    status: 'in-progress',
    feedback: 'Approved. Please include a short privacy note in the final submission.',
  },
  {
    title: 'Community Garden Planner',
    summary: 'A shared planting calendar with seasonal recommendations and volunteer sign-up for the campus garden.',
    category: 'Community',
    technologies: ['React', 'Express', 'MongoDB'],
    repositoryUrl: 'https://github.com/example/garden-planner',
    status: 'completed',
    feedback: 'Great documentation and a polished final demonstration.',
  },
  {
    title: 'Lab Equipment Checkout',
    summary: 'A QR-based checkout log for shared equipment with due-date reminders and an inventory history.',
    category: 'Campus Tools',
    technologies: ['React', 'Express', 'MongoDB'],
    repositoryUrl: 'https://github.com/example/lab-checkout',
    status: 'rejected',
    feedback: 'Please narrow the first release to one department and clarify who can approve returns.',
  },
];

const seed = async () => {
  await connectDB();
  const users = {};

  for (const demoUser of demoUsers) {
    let user = await User.findOne({ email: demoUser.email }).select('+password');
    if (!user) user = new User(demoUser);
    else {
      user.name = demoUser.name;
      user.password = demoUser.password;
      user.role = demoUser.role;
    }
    await user.save();
    users[demoUser.email] = user;
  }

  const faculty = users['faculty@collector.edu'];
  for (const [index, details] of demoProjects.entries()) {
    const student = users[index === 2 ? 'jordan@collector.edu' : 'student@collector.edu'];
    let project = await Project.findOne({ title: details.title, student: student._id });
    if (!project) project = new Project({ ...details, student: student._id });
    else Object.assign(project, details);

    if (['approved', 'in-progress', 'completed', 'rejected'].includes(details.status)) {
      project.reviewedBy = faculty._id;
      project.reviewedAt = project.reviewedAt || new Date();
    }
    await project.save();
  }

  console.log('Demo data is ready.');
  console.log('Admin: admin@collector.edu / Admin123!');
  console.log('Faculty: faculty@collector.edu / Faculty123!');
  console.log('Student: student@collector.edu / Student123!');
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});