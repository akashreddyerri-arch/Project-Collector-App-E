const Project = require('../models/Project');

const staffRoles = ['faculty', 'admin'];
const isStaff = (user) => staffRoles.includes(user.role);
const populateProject = (query) => query
  .populate('student', 'name email')
  .populate('reviewedBy', 'name');

const getFeaturedProjects = async (req, res) => {
  const projects = await populateProject(
    Project.find({ status: { $in: ['approved', 'in-progress', 'completed'] } })
  ).sort({ updatedAt: -1 }).limit(6);
  res.json(projects);
};

const getProjects = async (req, res) => {
  const filter = {};
  if (!isStaff(req.user)) filter.student = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };

  const projects = await populateProject(Project.find(filter)).sort({ createdAt: -1 });
  res.json(projects);
};

const getProject = async (req, res) => {
  const project = await populateProject(Project.findById(req.params.id));
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!isStaff(req.user) && String(project.student._id) !== String(req.user._id)) {
    return res.status(403).json({ message: 'You can only view your own projects' });
  }
  res.json(project);
};

const createProject = async (req, res) => {
  const technologies = Array.isArray(req.body.technologies)
    ? req.body.technologies
    : String(req.body.technologies || '').split(',').map((value) => value.trim()).filter(Boolean);
  const project = await Project.create({
    title: req.body.title,
    summary: req.body.summary,
    category: req.body.category,
    technologies,
    repositoryUrl: req.body.repositoryUrl,
    demoUrl: req.body.demoUrl,
    student: req.user._id,
  });
  await project.populate('student', 'name email');
  res.status(201).json(project);
};

const updateProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (isStaff(req.user)) {
    return res.status(400).json({ message: 'Use the review action to update project status' });
  }
  if (String(project.student) !== String(req.user._id)) {
    return res.status(403).json({ message: 'You can only edit your own projects' });
  }
  if (!['pending', 'rejected'].includes(project.status)) {
    return res.status(409).json({ message: 'Only pending or rejected projects can be edited' });
  }

  project.title = req.body.title ?? project.title;
  project.summary = req.body.summary ?? project.summary;
  project.category = req.body.category ?? project.category;
  project.technologies = Array.isArray(req.body.technologies)
    ? req.body.technologies
    : String(req.body.technologies ?? project.technologies.join(',')).split(',').map((value) => value.trim()).filter(Boolean);
  project.repositoryUrl = req.body.repositoryUrl ?? project.repositoryUrl;
  project.demoUrl = req.body.demoUrl ?? project.demoUrl;
  if (project.status === 'rejected') {
    project.status = 'pending';
    project.feedback = '';
    project.reviewedBy = null;
    project.reviewedAt = null;
  }
  await project.save();
  await project.populate('student', 'name email');
  res.json(project);
};

const reviewProject = async (req, res) => {
  const { status, feedback = '' } = req.body;
  const validStatuses = ['approved', 'rejected', 'in-progress', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Choose a valid review status' });
  }
  if (status === 'rejected' && !String(feedback).trim()) {
    return res.status(400).json({ message: 'Add feedback when rejecting a project' });
  }

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { status, feedback: String(feedback).trim(), reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!project) return res.status(404).json({ message: 'Project not found' });
  await project.populate('student', 'name email');
  await project.populate('reviewedBy', 'name');
  res.json(project);
};

const deleteProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (req.user.role === 'faculty') {
    return res.status(403).json({ message: 'Only admins can delete projects' });
  }
  if (!isStaff(req.user) && String(project.student) !== String(req.user._id)) {
    return res.status(403).json({ message: 'You can only delete your own projects' });
  }
  if (!isStaff(req.user) && !['pending', 'rejected'].includes(project.status)) {
    return res.status(409).json({ message: 'Reviewed projects cannot be deleted by students' });
  }
  await project.deleteOne();
  res.status(204).end();
};

module.exports = {
  getFeaturedProjects,
  getProjects,
  getProject,
  createProject,
  updateProject,
  reviewProject,
  deleteProject,
};