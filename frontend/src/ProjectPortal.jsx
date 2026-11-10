import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react'
import './ProjectPortal.css'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`
const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'student@collector.edu', password: 'Student123!', tone: 'demo-student' },
  { role: 'Faculty', email: 'faculty@collector.edu', password: 'Faculty123!', tone: 'demo-faculty' },
  { role: 'Admin', email: 'admin@collector.edu', password: 'Admin123!', tone: 'demo-admin' },
]
const STATUSES = ['pending', 'approved', 'rejected', 'in-progress', 'completed']
const CATEGORIES = ['Technology', 'Research', 'Sustainability', 'Accessibility', 'Community', 'Design', 'Other']

async function apiRequest(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (response.status === 204) return null
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status})`)
  return result
}

function dateLabel(value) {
  if (!value) return 'Recently submitted'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function statusLabel(status = 'pending') {
  return status.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function roleDashboard(role) {
  if (role === 'student') return 'studentDashboard'
  return role === 'faculty' ? 'facultyDashboard' : 'adminDashboard'
}

function ProjectPortal() {
  const [page, setPage] = useState('home')
  const [user, setUser] = useState(null)
  const [token, setToken] = useState('')
  const [authReady, setAuthReady] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [demoAccount, setDemoAccount] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [activeProject, setActiveProject] = useState(null)
  const [reviewProject, setReviewProject] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let active = true
    const storedToken = localStorage.getItem('collector-token')
    if (!storedToken) {
      Promise.resolve().then(() => active && setAuthReady(true))
      return () => { active = false }
    }

    apiRequest('/auth/me', { token: storedToken })
      .then(({ user: currentUser }) => {
        if (!active) return
        setToken(storedToken)
        setUser(currentUser)
        setPage(roleDashboard(currentUser.role))
      })
      .catch(() => localStorage.removeItem('collector-token'))
      .finally(() => active && setAuthReady(true))

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const isDataPage = ['home', 'viewProjects', 'studentDashboard', 'facultyDashboard', 'adminDashboard', 'manageProjects', 'viewStudents', 'manageStudents', 'manageFaculty', 'viewReports'].includes(page)
    if (!isDataPage) return undefined

    const shouldLoadPublic = page === 'home' || (page === 'viewProjects' && !token)
    const path = shouldLoadPublic ? '/projects/featured' : '/projects'
    apiRequest(path, { token: shouldLoadPublic ? '' : token })
      .then((data) => {
        if (active) {
          setProjects(data)
          setError('')
        }
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setProjectsLoading(false))

    return () => { active = false }
  }, [page, token])

  useEffect(() => {
    let active = true
    const isUserPage = ['facultyDashboard', 'adminDashboard', 'viewStudents', 'manageStudents', 'manageFaculty', 'viewReports'].includes(page)
    if (!isUserPage || !token) return undefined

    const path = user?.role === 'faculty' ? '/users/students' : '/users'
    apiRequest(path, { token })
      .then((data) => active && setUsers(data))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setUsersLoading(false))

    return () => { active = false }
  }, [page, token, user?.role])

  const isStaff = user && ['faculty', 'admin'].includes(user.role)
  const isAdmin = user?.role === 'admin'
  const filteredProjects = projects.filter((project) => {
    const matchesText = [project.title, project.category, project.summary, project.student?.name]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
    return matchesText && (statusFilter === 'all' || project.status === statusFilter)
  })

  const navigate = (nextPage) => {
    const protectedPages = ['studentDashboard', 'addProject', 'facultyDashboard', 'adminDashboard', 'manageProjects', 'viewStudents', 'manageStudents', 'manageFaculty', 'viewReports']
    if (protectedPages.includes(nextPage) && !token) {
      setPage('login')
    } else if (['facultyDashboard', 'viewStudents'].includes(nextPage) && !isStaff) {
      setPage(user ? 'studentDashboard' : 'login')
    } else if (['adminDashboard', 'manageStudents', 'manageFaculty', 'viewReports'].includes(nextPage) && !isAdmin) {
      setPage(user ? roleDashboard(user.role) : 'login')
    } else if (nextPage === 'manageProjects' && !isStaff) {
      setPage(user ? 'studentDashboard' : 'login')
    } else if (['studentDashboard', 'addProject'].includes(nextPage) && user?.role !== 'student') {
      setPage(user ? roleDashboard(user.role) : 'login')
    } else {
      setPage(nextPage)
    }
    setSearch('')
    setStatusFilter('all')
    setMobileMenuOpen(false)
    setError('')
    if (['home', 'viewProjects', 'studentDashboard', 'adminDashboard', 'manageProjects'].includes(nextPage)) {
      setProjectsLoading(true)
    }
    if (['facultyDashboard', 'adminDashboard', 'viewStudents', 'manageStudents', 'manageFaculty', 'viewReports'].includes(nextPage)) {
      setUsersLoading(true)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    setError('')
    try {
      const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(values) })
      localStorage.setItem('collector-token', result.token)
      setToken(result.token)
      setUser(result.user)
      setPage(roleDashboard(result.user.role))
      setProjectsLoading(true)
      setUsersLoading(true)
      setNotice(`Welcome back, ${result.user.name.split(' ')[0]}.`)
    } catch (loginError) {
      setError(loginError.message)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    delete values.confirmPassword
    setError('')
    try {
      const result = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(values) })
      if (result.pendingApproval) {
        setPage('login')
        setNotice(result.message)
        return
      }
      localStorage.setItem('collector-token', result.token)
      setToken(result.token)
      setUser(result.user)
      setPage('studentDashboard')
      setProjectsLoading(true)
      setNotice('Your student account is ready. Submit your first project when you are ready.')
    } catch (registerError) {
      setError(registerError.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('collector-token')
    setToken('')
    setUser(null)
    setProjects([])
    setUsers([])
    setPage('home')
    setNotice('You have signed out.')
  }

  const handleSaveProject = async (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    values.technologies = values.technologies.split(',').map((technology) => technology.trim()).filter(Boolean)
    const isEditing = Boolean(editingProject?._id)
    try {
      const result = await apiRequest(`/projects${isEditing ? `/${editingProject._id}` : ''}`, {
        token,
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify(values),
      })
      setProjects((current) => isEditing
        ? current.map((project) => project._id === result._id ? result : project)
        : [result, ...current])
      setEditingProject(null)
      setNotice(isEditing ? 'Project changes saved.' : 'Project submitted for faculty review.')
      setPage('viewProjects')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const handleReview = async (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      const result = await apiRequest(`/projects/${reviewProject._id}/review`, {
        token,
        method: 'PATCH',
        body: JSON.stringify(values),
      })
      setProjects((current) => current.map((project) => project._id === result._id ? result : project))
      setReviewProject(null)
      setNotice(`Project marked ${statusLabel(result.status).toLowerCase()}.`)
    } catch (reviewError) {
      setError(reviewError.message)
    }
  }

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return
    try {
      await apiRequest(`/projects/${project._id}`, { token, method: 'DELETE' })
      setProjects((current) => current.filter((entry) => entry._id !== project._id))
      setActiveProject(null)
      setNotice('Project deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const handleApproveFaculty = async (faculty) => {
    try {
      const approved = await apiRequest(`/users/${faculty._id}/approve`, { token, method: 'PATCH' })
      setUsers((current) => current.map((userRecord) => userRecord._id === approved._id ? approved : userRecord))
      setNotice(`${approved.name}'s faculty account is approved.`)
    } catch (approveError) {
      setError(approveError.message)
    }
  }

  const handleDeleteUser = async (account) => {
    if (!window.confirm(`Delete ${account.name}'s account? This cannot be undone.`)) return
    try {
      await apiRequest(`/users/${account._id}`, { token, method: 'DELETE' })
      setUsers((current) => current.filter((entry) => entry._id !== account._id))
      setNotice(`${account.name}'s account was deleted.`)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const showDemoLogin = (account) => {
    setDemoAccount(account)
    setPage('login')
    setError('')
  }

  const menuItems = [
    { id: 'home', title: 'Home', icon: GraduationCap },
    ...(user?.role === 'student' ? [
      { id: 'studentDashboard', title: 'Student Dashboard', icon: LayoutDashboard },
      { id: 'addProject', title: 'Add Project', icon: Plus },
      { id: 'viewProjects', title: 'View Projects', icon: FolderKanban },
    ] : user?.role === 'faculty' ? [
      { id: 'facultyDashboard', title: 'Faculty Dashboard', icon: LayoutDashboard },
      { id: 'viewStudents', title: 'View Students', icon: Users },
      { id: 'manageProjects', title: 'View Projects', icon: FolderKanban },
    ] : isAdmin ? [
      { id: 'adminDashboard', title: 'Admin Dashboard', icon: LayoutDashboard },
      { id: 'manageStudents', title: 'Manage Students', icon: Users },
      { id: 'manageFaculty', title: 'Manage Faculty', icon: UserCheck },
      { id: 'manageProjects', title: 'Manage Projects', icon: FolderKanban },
      { id: 'viewReports', title: 'Reports', icon: BarChart3 },
    ] : [
      { id: 'viewProjects', title: 'View Projects', icon: FolderKanban },
    ]),
  ]

  if (!authReady) return <div className="boot-screen"><span className="boot-mark"><GraduationCap size={24} /></span>Opening project workspace...</div>

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <button className="mobile-toggle icon-only" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={20} /></button>
        <button className="portal-brand" onClick={() => navigate('home')}>
          <span className="portal-brand-mark"><GraduationCap size={21} /></span>
          <span>COLLECTOR APP-E<small>STUDENT PROJECT PORTAL</small></span>
        </button>
        <nav className={`portal-nav ${mobileMenuOpen ? 'portal-nav-open' : ''}`} aria-label="Main navigation">
          {menuItems.map(({ id, title, icon: Icon }) => (
            <button key={id} className={page === id ? 'portal-nav-active' : ''} onClick={() => navigate(id)}><Icon size={16} />{title}</button>
          ))}
          {!user && <button className="nav-register-mobile" onClick={() => navigate('register')}>Create account</button>}
        </nav>
        <div className="header-account">
          {user ? <>
            <span className="account-name"><strong>{user.name}</strong><small>{user.role}</small></span>
            <button className="header-action" onClick={handleLogout}><LogOut size={15} /><span>Sign out</span></button>
          </> : <>
            <button className="header-action login-action" onClick={() => navigate('login')}><LogIn size={15} />Sign in</button>
            <button className="button button-dark header-register" onClick={() => navigate('register')}>Register <ArrowRight size={15} /></button>
          </>}
        </div>
      </header>

      <main className="portal-main">
        {error && <div className="portal-alert" role="alert"><CircleAlert size={18} /><span>{error}</span><button className="icon-only" aria-label="Dismiss alert" onClick={() => setError('')}><X size={16} /></button></div>}
        {notice && <div className="portal-notice" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button className="icon-only" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={15} /></button></div>}
        {page === 'home' && <HomePage projects={projects} loading={projectsLoading} onNavigate={navigate} onDemo={showDemoLogin} />}
        {page === 'login' && <LoginPage onSubmit={handleLogin} onRegister={() => navigate('register')} demoAccount={demoAccount} onDemo={showDemoLogin} />}
        {page === 'register' && <RegistrationPage onSubmit={handleRegister} onLogin={() => navigate('login')} />}
        {page === 'studentDashboard' && user?.role === 'student' && <StudentDashboard user={user} projects={projects} loading={projectsLoading} onNavigate={navigate} onView={setActiveProject} onEdit={(project) => { setEditingProject(project); setPage('addProject') }} />}
        {page === 'addProject' && user?.role === 'student' && <ProjectFormPage project={editingProject} onSubmit={handleSaveProject} onCancel={() => navigate('studentDashboard')} />}
        {page === 'viewProjects' && <ProjectsPage projects={filteredProjects} total={projects.length} loading={projectsLoading} user={user} search={search} onSearch={setSearch} statusFilter={statusFilter} onStatusFilter={setStatusFilter} onView={setActiveProject} onEdit={(project) => { setEditingProject(project); setPage('addProject') }} onDelete={handleDelete} onAdd={() => { setEditingProject(null); navigate('addProject') }} />}
        {page === 'facultyDashboard' && user?.role === 'faculty' && <FacultyDashboard user={user} projects={projects} students={users} loading={projectsLoading || usersLoading} onNavigate={navigate} onReview={setReviewProject} onView={setActiveProject} />}
        {page === 'adminDashboard' && isAdmin && <AdminDashboard projects={projects} users={users} loading={projectsLoading || usersLoading} onNavigate={navigate} />}
        {page === 'manageProjects' && isStaff && <ManageProjects projects={filteredProjects} total={projects.length} loading={projectsLoading} search={search} onSearch={setSearch} statusFilter={statusFilter} onStatusFilter={setStatusFilter} onReview={setReviewProject} onView={setActiveProject} onDelete={handleDelete} isAdmin={isAdmin} />}
        {page === 'viewStudents' && user?.role === 'faculty' && <UserDirectory title="View students" eyebrow="FACULTY WORKSPACE" description="Browse student accounts and their project activity." users={users} loading={usersLoading} />}
        {page === 'manageStudents' && isAdmin && <UserDirectory title="Manage students" eyebrow="ADMINISTRATION" description="View student accounts and manage access to the project portal." users={users.filter((account) => account.role === 'student')} loading={usersLoading} onDelete={handleDeleteUser} />}
        {page === 'manageFaculty' && isAdmin && <UserDirectory title="Manage faculty" eyebrow="ADMINISTRATION" description="Approve new faculty registrations and manage faculty accounts." users={users.filter((account) => account.role === 'faculty')} loading={usersLoading} onApprove={handleApproveFaculty} onDelete={handleDeleteUser} />}
        {page === 'viewReports' && isAdmin && <ReportsPage projects={projects} users={users} loading={projectsLoading || usersLoading} />}
        {!['home', 'login', 'register', 'studentDashboard', 'facultyDashboard', 'addProject', 'viewProjects', 'adminDashboard', 'manageProjects', 'viewStudents', 'manageStudents', 'manageFaculty', 'viewReports'].includes(page) && <HomePage projects={projects} loading={projectsLoading} onNavigate={navigate} onDemo={showDemoLogin} />}
      </main>

      <footer className="portal-footer"><span>COLLECTOR APP-E <i>•</i> PROJECT SUBMISSION & REVIEW</span><span>Built for student ideas and faculty feedback.</span></footer>
      {activeProject && <ProjectDetails project={activeProject} user={user} onClose={() => setActiveProject(null)} onEdit={(project) => { setActiveProject(null); setEditingProject(project); setPage('addProject') }} onDelete={handleDelete} />}
      {reviewProject && <ReviewDialog project={reviewProject} onClose={() => setReviewProject(null)} onSubmit={handleReview} />}
    </div>
  )
}

function HomePage({ projects, loading, onNavigate, onDemo }) {
  const highlights = projects.slice(0, 3)
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" />A CAMPUS PROJECT EXCHANGE</p>
          <h1>Good ideas deserve<br /><em>a place to go.</em></h1>
          <p className="hero-description">Submit your work, get thoughtful faculty feedback, and discover what your campus is building.</p>
          <div className="hero-actions"><button className="button button-coral" onClick={() => onNavigate('register')}>Start a project <ArrowRight size={16} /></button><button className="button button-outline" onClick={() => onNavigate('viewProjects')}>Explore projects <ArrowUpRight size={16} /></button></div>
          <div className="hero-meta"><span><CheckCircle2 size={15} />Reviewed by faculty</span><span><Users size={15} />Built for campus teams</span></div>
        </div>
        <div className="hero-board" aria-label="Project showcase preview">
          <div className="board-top"><span>RECENTLY REVIEWED</span><span className="board-live"><i /> LIVE SHOWCASE</span></div>
          <div className="board-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="visual-center"><FolderKanban size={36} /></span><span className="visual-tag tag-one">IDEA</span><span className="visual-tag tag-two">BUILD</span><span className="visual-tag tag-three">SHARE</span></div>
          <div className="board-bottom"><span><strong>{projects.length.toString().padStart(2, '0')}</strong><small>FEATURED PROJECTS</small></span><span className="board-arrow"><ArrowUpRight size={20} /></span></div>
        </div>
      </section>

      <section className="showcase-section">
        <div className="section-title-row"><div><p className="eyebrow">FROM THE COMMUNITY</p><h2>Projects worth a closer look</h2></div><button className="text-link" onClick={() => onNavigate('viewProjects')}>View all projects <ArrowRight size={15} /></button></div>
        {loading ? <div className="portal-loading"><span className="spinner" />Loading featured projects...</div> : highlights.length ? <div className="featured-grid">{highlights.map((project, index) => <FeaturedProject key={project._id} project={project} index={index} />)}</div> : <div className="quiet-empty"><FolderKanban size={21} /><span>Approved projects will appear here.</span></div>}
      </section>

      <section className="demo-strip">
        <div className="demo-heading"><span className="demo-icon"><ShieldCheck size={18} /></span><div><p className="eyebrow">READY TO EXPLORE</p><h2>Demo access</h2><p>Use a sample role to preview the full workflow.</p></div></div>
        <div className="demo-accounts">{DEMO_ACCOUNTS.map((account) => <button key={account.role} className={`demo-account ${account.tone}`} onClick={() => onDemo(account)}><span>{account.role} demo</span><strong>{account.email}</strong><small>Password: {account.password}</small></button>)}</div>
      </section>
    </>
  )
}

function FeaturedProject({ project, index }) {
  return (
    <article className={`featured-card featured-${index % 3}`}>
      <div className="featured-art"><span className="art-index">0{index + 1}</span><span className="art-symbol"><FolderKanban size={27} strokeWidth={1.6} /></span><span className="featured-category">{project.category}</span></div>
      <div className="featured-body"><div className="featured-meta"><StatusPill status={project.status} /><span>{dateLabel(project.updatedAt)}</span></div><h3>{project.title}</h3><p>{project.summary}</p><div className="tag-list">{project.technologies?.slice(0, 3).map((technology) => <span key={technology}>{technology}</span>)}</div><div className="featured-student"><span className="avatar-small">{(project.student?.name || 'S').slice(0, 1)}</span>{project.student?.name || 'Student project'}</div></div>
    </article>
  )
}

function LoginPage({ onSubmit, onRegister, demoAccount, onDemo }) {
  return (
    <section className="auth-layout">
      <div className="auth-aside"><span className="auth-aside-mark"><GraduationCap size={23} /></span><p className="eyebrow">COLLECTOR APP-E</p><h1>Pick up where<br />your idea left off.</h1><p>Sign in to track a submission, respond to feedback, or review the next campus project.</p><div className="auth-aside-rule" /><span className="auth-aside-foot">STUDENT <i /> FACULTY <i /> ADMIN</span></div>
      <div className="auth-form-panel"><div className="auth-form-heading"><p className="eyebrow">WELCOME BACK</p><h2>Sign in</h2><p>Enter your account details to continue.</p></div><form className="portal-form" onSubmit={onSubmit}><label>Email address<input name="email" type="email" autoComplete="email" required defaultValue={demoAccount?.email || ''} placeholder="you@college.edu" /></label><label>Password<input name="password" type="password" autoComplete="current-password" required defaultValue={demoAccount?.password || ''} placeholder="Enter your password" /></label><button className="button button-dark form-submit" type="submit">Sign in <ArrowRight size={16} /></button></form><p className="auth-switch">New to the portal? <button onClick={onRegister}>Create a student account</button></p><div className="auth-demo-list"><p className="eyebrow">DEMO ACCOUNTS</p>{DEMO_ACCOUNTS.map((account) => <button key={account.role} onClick={() => onDemo(account)}><span>{account.role}</span><small>{account.email}</small></button>)}</div></div>
    </section>
  )
}

function RegistrationPage({ onSubmit, onLogin }) {
  return (
    <section className="auth-layout register-layout">
      <div className="auth-aside"><span className="auth-aside-mark"><GraduationCap size={23} /></span><p className="eyebrow">YOUR NEXT PROJECT STARTS HERE</p><h1>Make the work<br />easy to share.</h1><p>Students can share projects; faculty accounts are activated after admin approval.</p><div className="auth-aside-rule" /><span className="auth-aside-foot">STUDENT <i /> FACULTY</span></div>
      <div className="auth-form-panel"><div className="auth-form-heading"><p className="eyebrow">ACCOUNT REGISTRATION</p><h2>Create account</h2><p>Faculty registrations require approval from an admin.</p></div><form className="portal-form" onSubmit={onSubmit}><label>Account type<select name="role" defaultValue="student"><option value="student">Student</option><option value="faculty">Faculty</option></select></label><label>Full name<input name="name" autoComplete="name" minLength="2" maxLength="80" required placeholder="Your name" /></label><label>College email<input name="email" type="email" autoComplete="email" required placeholder="you@college.edu" /></label><label>Password<input name="password" type="password" autoComplete="new-password" minLength="8" required placeholder="At least 8 characters" /></label><label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" required placeholder="Repeat your password" /></label><button className="button button-dark form-submit" type="submit">Create account <ArrowRight size={16} /></button></form><p className="auth-switch">Already registered? <button onClick={onLogin}>Sign in</button></p></div>
    </section>
  )
}

function PageIntro({ eyebrow, title, description, action }) {
  return <section className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</section>
}

function StudentDashboard({ user, projects, loading, onNavigate, onView, onEdit }) {
  const pending = projects.filter((project) => project.status === 'pending').length
  const approved = projects.filter((project) => ['approved', 'in-progress', 'completed'].includes(project.status)).length
  const recent = [...projects].slice(0, 3)
  return <div className="page-stack"><PageIntro eyebrow="STUDENT WORKSPACE" title={`Welcome, ${user.name.split(' ')[0]}.`} description="Track submissions, read faculty feedback, and keep your project details current." action={<button className="button button-coral" onClick={() => onNavigate('addProject')}><Plus size={16} /> Submit project</button>} /><section className="metric-row"><Metric icon={FolderKanban} label="My projects" value={projects.length} tone="coral" /><Metric icon={Clock3} label="Awaiting review" value={pending} tone="yellow" /><Metric icon={CheckCircle2} label="Approved or active" value={approved} tone="green" /></section><section className="section-panel"><div className="section-title-row compact-title"><div><p className="eyebrow">YOUR SUBMISSIONS</p><h2>Recent projects</h2></div><button className="text-link" onClick={() => onNavigate('viewProjects')}>View all <ArrowRight size={15} /></button></div>{loading ? <div className="portal-loading"><span className="spinner" />Loading your projects...</div> : recent.length ? <div className="project-list">{recent.map((project) => <ProjectRow key={project._id} project={project} onView={onView} onEdit={onEdit} />)}</div> : <EmptyProjects title="Your first project starts here" message="Share a project idea with faculty and track its review from this dashboard." action="Add a project" onAction={() => onNavigate('addProject')} />}</section></div>
}

function Metric({ icon: Icon, label, value, tone = 'green' }) {
  return <article className="metric-card"><span className={`metric-icon metric-${tone}`}><Icon size={18} /></span><span className="metric-label">{label}</span><strong>{value}</strong></article>
}

function ProjectFormPage({ project, onSubmit, onCancel }) {
  return <div className="page-stack"><PageIntro eyebrow={project ? 'UPDATE SUBMISSION' : 'STUDENT SUBMISSION'} title={project ? 'Edit project' : 'Add a project'} description="Share a clear summary so faculty can understand the problem, your approach, and what you built." /><section className="form-sheet"><div className="form-sheet-heading"><span className="form-sheet-icon"><FileText size={19} /></span><div><h2>Project details</h2><p>Fields marked with * are required.</p></div></div><form className="project-form" onSubmit={onSubmit}><label className="wide-field">Project title *<input name="title" maxLength="140" required defaultValue={project?.title || ''} placeholder="Give your project a clear name" /></label><div className="form-two-col"><label>Category *<select name="category" required defaultValue={project?.category || ''}><option value="" disabled>Select a category</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Technologies<input name="technologies" defaultValue={project?.technologies?.join(', ') || ''} placeholder="React, Python, MongoDB" /><small>Separate technologies with commas.</small></label></div><label className="wide-field">Project summary *<textarea name="summary" required rows="5" maxLength="1500" defaultValue={project?.summary || ''} placeholder="What problem does this solve? What did you build?" /><small>Keep it under 1,500 characters.</small></label><div className="form-two-col"><label>Repository URL<input name="repositoryUrl" type="url" defaultValue={project?.repositoryUrl || ''} placeholder="https://github.com/..." /></label><label>Demo URL<input name="demoUrl" type="url" defaultValue={project?.demoUrl || ''} placeholder="https://..." /></label></div><div className="form-submit-row"><button type="button" className="button button-outline" onClick={onCancel}>Cancel</button><button type="submit" className="button button-coral"><Check size={16} />{project ? 'Save changes' : 'Submit for review'}</button></div></form></section></div>
}

function ProjectsPage({ projects, total, loading, user, search, onSearch, statusFilter, onStatusFilter, onView, onEdit, onDelete, onAdd }) {
  const isStudent = user?.role === 'student'
  const publicView = !user
  return <div className="page-stack"><PageIntro eyebrow={publicView ? 'CAMPUS SHOWCASE' : isStudent ? 'STUDENT WORKSPACE' : 'PROJECT DIRECTORY'} title="View projects" description={publicView ? 'Explore approved work shared by students across campus.' : isStudent ? 'Review your submissions and follow faculty feedback.' : 'Browse reviewed and active projects from the community.'} action={isStudent ? <button className="button button-coral" onClick={onAdd}><Plus size={16} /> Add project</button> : null} /><section className="section-panel listing-panel"><div className="list-toolbar"><span className="result-count">{projects.length} of {total} {total === 1 ? 'project' : 'projects'}</span><div className="list-filters"><label className="filter-search"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search projects" /></label><select aria-label="Filter by status" value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)}><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div></div>{loading ? <div className="portal-loading"><span className="spinner" />Loading projects...</div> : projects.length ? <div className="project-grid">{projects.map((project, index) => <ProjectCard key={project._id} project={project} index={index} canEdit={isStudent && ['pending', 'rejected'].includes(project.status)} canDelete={isStudent && ['pending', 'rejected'].includes(project.status)} onView={onView} onEdit={onEdit} onDelete={onDelete} />)}</div> : <EmptyProjects title={search || statusFilter !== 'all' ? 'No projects match these filters' : 'No projects to show yet'} message={publicView ? 'Approved projects will be shared here.' : isStudent ? 'Submit a project to start your review timeline.' : 'Project submissions will appear here.'} action={isStudent ? 'Submit a project' : null} onAction={onAdd} />}</section></div>
}

function ProjectCard({ project, index, canEdit, canDelete, onView, onEdit, onDelete }) {
  return <article className="project-card"><div className={`project-card-art project-art-${index % 4}`}><span className="art-index">PROJECT / {String(index + 1).padStart(2, '0')}</span><span className="project-card-mark"><FolderKanban size={25} /></span><span className="project-card-category">{project.category}</span></div><div className="project-card-content"><div className="project-card-meta"><StatusPill status={project.status} /><span>{dateLabel(project.updatedAt)}</span></div><h3>{project.title}</h3><p>{project.summary}</p><div className="tag-list">{project.technologies?.slice(0, 4).map((technology) => <span key={technology}>{technology}</span>)}</div><div className="project-card-footer"><span className="project-author">{project.student?.name || 'Student submission'}</span><div className="card-actions"><button className="text-link" onClick={() => onView(project)}>Details <ChevronRight size={15} /></button>{canEdit && <button className="icon-only" aria-label={`Edit ${project.title}`} title="Edit project" onClick={() => onEdit(project)}><Pencil size={15} /></button>}{canDelete && <button className="icon-only delete-icon" aria-label={`Delete ${project.title}`} title="Delete project" onClick={() => onDelete(project)}><Trash2 size={15} /></button>}</div></div></div></article>
}

function ProjectRow({ project, onView, onEdit }) {
  return <article className="project-row"><span className="row-project-icon"><FolderKanban size={18} /></span><div className="row-project-info"><strong>{project.title}</strong><small>{project.category} <i /> Updated {dateLabel(project.updatedAt)}</small></div><StatusPill status={project.status} /><button className="icon-only" aria-label={`View ${project.title}`} onClick={() => onView(project)}><ChevronRight size={18} /></button>{['pending', 'rejected'].includes(project.status) && <button className="icon-only" aria-label={`Edit ${project.title}`} onClick={() => onEdit(project)}><Pencil size={15} /></button>}</article>
}

function FacultyDashboard({ user, projects, students, loading, onNavigate, onReview, onView }) {
  const pending = projects.filter((project) => project.status === 'pending')
  const reviewed = projects.filter((project) => project.status !== 'pending').length
  return <div className="page-stack"><PageIntro eyebrow="FACULTY WORKSPACE" title={`Welcome, ${user.name.split(' ')[0]}.`} description="Review student submissions, leave helpful remarks, and follow project progress." action={<button className="button button-dark" onClick={() => onNavigate('manageProjects')}>Review projects <ArrowRight size={15} /></button>} /><section className="metric-row"><Metric icon={Users} label="Students" value={students.length} tone="blue" /><Metric icon={FolderKanban} label="All projects" value={projects.length} tone="coral" /><Metric icon={Clock3} label="Awaiting review" value={pending.length} tone="yellow" /><Metric icon={CheckCircle2} label="Reviewed" value={reviewed} tone="green" /></section><section className="section-panel"><div className="section-title-row compact-title"><div><p className="eyebrow">FACULTY REVIEW</p><h2>Pending submissions</h2></div><button className="text-link" onClick={() => onNavigate('viewStudents')}>View students <ArrowRight size={15} /></button></div>{loading ? <div className="portal-loading"><span className="spinner" />Loading workspace...</div> : pending.length ? <div className="review-queue">{pending.slice(0, 5).map((project) => <div className="queue-row" key={project._id}><div className="queue-project"><span className="queue-icon"><FileText size={17} /></span><span><strong>{project.title}</strong><small>{project.student?.name} <i /> {project.category} <i /> {dateLabel(project.createdAt)}</small></span></div><button className="button button-outline button-small" onClick={() => onView(project)}>View</button><button className="button button-coral button-small" onClick={() => onReview(project)}>Add remarks</button></div>)}</div> : <EmptyProjects title="Review queue is clear" message="New student submissions will appear here." />}</section></div>
}

function AdminDashboard({ projects, users, loading, onNavigate }) {
  const students = users.filter((account) => account.role === 'student')
  const faculty = users.filter((account) => account.role === 'faculty')
  const waitingFaculty = faculty.filter((account) => account.isApproved === false).length
  const pending = projects.filter((project) => project.status === 'pending').length
  return <div className="page-stack"><PageIntro eyebrow="ADMINISTRATION" title="Admin dashboard" description="Manage campus accounts, oversee projects, approve faculty, and review portal reports." action={<button className="button button-dark" onClick={() => onNavigate('viewReports')}><BarChart3 size={15} /> View reports</button>} /><section className="metric-row"><Metric icon={Users} label="Students" value={students.length} tone="blue" /><Metric icon={UserCheck} label="Faculty" value={faculty.length} tone="green" /><Metric icon={Clock3} label="Faculty approvals" value={waitingFaculty} tone="yellow" /><Metric icon={FolderKanban} label="Projects to review" value={pending} tone="coral" /></section><section className="section-panel admin-actions-panel"><div className="section-title-row compact-title"><div><p className="eyebrow">PORTAL ADMINISTRATION</p><h2>Manage the workspace</h2></div></div><div className="admin-action-grid"><button onClick={() => onNavigate('manageStudents')}><Users size={20} /><strong>Manage students</strong><span>Review student accounts</span><ChevronRight size={16} /></button><button onClick={() => onNavigate('manageFaculty')}><UserCheck size={20} /><strong>Manage faculty</strong><span>{waitingFaculty} awaiting approval</span><ChevronRight size={16} /></button><button onClick={() => onNavigate('manageProjects')}><FolderKanban size={20} /><strong>Manage projects</strong><span>{projects.length} project records</span><ChevronRight size={16} /></button><button onClick={() => onNavigate('viewReports')}><BarChart3 size={20} /><strong>View reports</strong><span>Project and account summary</span><ChevronRight size={16} /></button></div>{loading && <div className="portal-loading"><span className="spinner" />Refreshing administration data...</div>}</section></div>
}

function UserDirectory({ title, eyebrow, description, users, loading, onDelete, onApprove }) {
  const pendingFaculty = users.filter((account) => account.role === 'faculty' && account.isApproved === false).length
  return <div className="page-stack"><PageIntro eyebrow={eyebrow} title={title} description={description} /><section className="section-panel listing-panel"><div className="list-toolbar"><span className="result-count">{users.length} {users.length === 1 ? 'account' : 'accounts'}{pendingFaculty ? ` · ${pendingFaculty} awaiting approval` : ''}</span></div>{loading ? <div className="portal-loading"><span className="spinner" />Loading accounts...</div> : users.length ? <div className="user-list">{users.map((account) => <article className="user-row" key={account._id}><span className="user-avatar"><UserRound size={18} /></span><div className="user-info"><strong>{account.name}</strong><span>{account.email}</span></div><span className={`account-status ${account.isApproved === false ? 'account-pending' : 'account-active'}`}>{account.isApproved === false ? 'Awaiting approval' : account.role}</span><div className="user-actions">{onApprove && account.isApproved === false && <button className="button button-coral button-small" onClick={() => onApprove(account)}>Approve</button>}{onDelete && <button className="icon-only delete-icon" title={`Delete ${account.name}`} aria-label={`Delete ${account.name}`} onClick={() => onDelete(account)}><Trash2 size={15} /></button>}</div></article>)}</div> : <EmptyProjects title="No accounts to show" message="Registered accounts will appear here." />}</section></div>
}

function ReportsPage({ projects, users, loading }) {
  const counts = STATUSES.map((status) => ({ status, count: projects.filter((project) => project.status === status).length }))
  const maxCount = Math.max(1, ...counts.map(({ count }) => count))
  const studentCount = users.filter((account) => account.role === 'student').length
  const facultyCount = users.filter((account) => account.role === 'faculty').length
  const approvedFaculty = users.filter((account) => account.role === 'faculty' && account.isApproved !== false).length
  return <div className="page-stack"><PageIntro eyebrow="ADMINISTRATION" title="Project reports" description="A current overview of project submissions, review status, and portal accounts." /><section className="metric-row"><Metric icon={FolderKanban} label="Total projects" value={projects.length} tone="blue" /><Metric icon={Users} label="Students" value={studentCount} tone="coral" /><Metric icon={UserCheck} label="Approved faculty" value={approvedFaculty} tone="green" /><Metric icon={Clock3} label="Faculty pending" value={facultyCount - approvedFaculty} tone="yellow" /></section><section className="section-panel report-panel"><div className="section-title-row compact-title"><div><p className="eyebrow">PROJECT STATUS</p><h2>Submission breakdown</h2></div></div>{loading ? <div className="portal-loading"><span className="spinner" />Loading report...</div> : <div className="report-list">{counts.map(({ status, count }) => <div className="report-row" key={status}><span>{statusLabel(status)}</span><div className="report-bar-track"><span className={`report-bar status-${status}`} style={{ width: `${(count / maxCount) * 100}%` }} /></div><strong>{count}</strong></div>)}</div>}</section></div>
}

function ManageProjects({ projects, total, loading, search, onSearch, statusFilter, onStatusFilter, onReview, onView, onDelete, isAdmin }) {
  return <div className="page-stack"><PageIntro eyebrow="PROJECT WORKSPACE" title={isAdmin ? 'Manage projects' : 'Review projects'} description={isAdmin ? 'Review submissions, update project status, and manage the project catalogue.' : 'Review student submissions and leave clear, useful remarks.'} /><section className="section-panel listing-panel"><div className="list-toolbar"><span className="result-count">{projects.length} of {total} projects</span><div className="list-filters"><label className="filter-search"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search projects or students" /></label><select aria-label="Filter by status" value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)}><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div></div>{loading ? <div className="portal-loading"><span className="spinner" />Loading submissions...</div> : projects.length ? <div className="manage-list">{projects.map((project) => <article className="manage-row" key={project._id}><div className="manage-project-main"><span className="manage-project-icon"><FolderKanban size={18} /></span><div><h3>{project.title}</h3><p>{project.student?.name} <i /> {project.category} <i /> Submitted {dateLabel(project.createdAt)}</p></div></div><StatusPill status={project.status} /><div className="manage-actions"><button className="button button-outline button-small" onClick={() => onView(project)}>Details</button><button className="button button-coral button-small" onClick={() => onReview(project)}>{project.status === 'pending' ? 'Review' : 'Add remarks'}</button>{isAdmin && <button className="icon-only delete-icon" title="Delete project" aria-label={`Delete ${project.title}`} onClick={() => onDelete(project)}><Trash2 size={15} /></button>}</div></article>)}</div> : <EmptyProjects title="No projects match these filters" message="Try another search or status filter." />}</section></div>
}

function StatusPill({ status }) {
  const Icon = status === 'approved' || status === 'completed' ? CheckCircle2 : status === 'rejected' ? X : Clock3
  return <span className={`status-pill status-${status}`}><Icon size={13} />{statusLabel(status)}</span>
}

function EmptyProjects({ title, message, action, onAction }) {
  return <div className="empty-projects"><span className="empty-project-icon"><FolderKanban size={22} /></span><h3>{title}</h3><p>{message}</p>{action && <button className="button button-coral button-small" onClick={onAction}><Plus size={15} />{action}</button>}</div>
}

function ProjectDetails({ project, user, onClose, onEdit, onDelete }) {
  const canEdit = user?.role === 'student' && ['pending', 'rejected'].includes(project.status)
  const canDelete = user && (user.role === 'admin' || (user.role === 'student' && ['pending', 'rejected'].includes(project.status)))
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title"><div className="dialog-top"><div><p className="eyebrow">PROJECT DETAILS</p><StatusPill status={project.status} /></div><button className="icon-only" aria-label="Close project details" onClick={onClose}><X size={18} /></button></div><h2 id="project-dialog-title">{project.title}</h2><p className="dialog-byline">Submitted by {project.student?.name || 'Student'} on {dateLabel(project.createdAt)}</p><p className="dialog-summary">{project.summary}</p><div className="dialog-detail-grid"><div><span>CATEGORY</span><strong>{project.category}</strong></div><div><span>SUBMITTED</span><strong>{dateLabel(project.createdAt)}</strong></div></div>{project.technologies?.length > 0 && <div className="dialog-field"><span>TECHNOLOGIES</span><div className="tag-list">{project.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div></div>}{project.feedback && <div className="feedback-box"><p className="eyebrow">FACULTY FEEDBACK</p><p>{project.feedback}</p>{project.reviewedBy?.name && <small>Reviewed by {project.reviewedBy.name}</small>}</div>}<div className="dialog-links">{project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Repository</a>}{project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Live demo</a>}</div><div className="dialog-actions">{canDelete && <button className="button button-outline delete-button" onClick={() => onDelete(project)}><Trash2 size={15} />Delete</button>}{canEdit && <button className="button button-coral" onClick={() => onEdit(project)}><Pencil size={15} />Edit project</button>}<button className="button button-dark" onClick={onClose}>Close</button></div></section></div>
}

function ReviewDialog({ project, onClose, onSubmit }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-dialog-title"><div className="dialog-top"><div><p className="eyebrow">FACULTY REVIEW</p><h2 id="review-dialog-title">Review submission</h2></div><button className="icon-only" aria-label="Close review" onClick={onClose}><X size={18} /></button></div><div className="review-project-summary"><strong>{project.title}</strong><span>{project.student?.name} <i /> {project.category}</span></div><form className="portal-form" onSubmit={onSubmit}><label>Decision<select name="status" defaultValue={project.status === 'pending' ? 'approved' : project.status} required>{STATUSES.filter((status) => status !== 'pending').map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label><label>Feedback<textarea name="feedback" rows="4" maxLength="1200" defaultValue={project.feedback || ''} placeholder="Give the student useful next steps. Required for rejection." /></label><div className="dialog-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button type="submit" className="button button-coral"><Check size={15} />Save review</button></div></form></section></div>
}

export default ProjectPortal