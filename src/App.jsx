import { useState, useEffect } from 'react'
const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const put = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const uid = () => Math.random().toString(36).slice(2, 9)
const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const go = h => { location.hash = h }
const TYPES = { heading: 'Heading', text: 'Paragraph', image: 'Image URL', button: 'Button' }

if (!get('cms_users')) put('cms_users', [{ id: 'a1', name: 'Admin', email: 'admin@cms.com', password: 'admin123', role: 'admin' }])
if (!get('cms_pages')) put('cms_pages', [{ id: 'p1', title: 'Welcome', slug: 'welcome', desc: 'Welcome to Inkwell CMS.', template: 'modern', status: 'published', author: 'a1', authorName: 'Admin', views: 0, updated: Date.now(), blocks: [{ id: 'b1', type: 'heading', text: 'Welcome to Inkwell' }, { id: 'b2', type: 'text', text: 'Build pages by dragging blocks onto the canvas, then publish.' }] }])

function useHash() {
  const [h, setH] = useState(location.hash.slice(1) || '/login')
  useEffect(() => { const f = () => setH(location.hash.slice(1) || '/login'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return h
}

export default function App() {
  const path = useHash(), [, a, b] = path.split('/')
  const [user, setUser] = useState(() => get('cms_session', null))
  const [, tick] = useState(0), refresh = () => tick(t => t + 1)
  const home = u => (u.role === 'admin' ? '/dashboard' : '/pages')
  useEffect(() => {
    if (a === 'view') return
    if (!user && a !== 'login' && a !== 'signup') go('/login')
    if (user && (!a || a === 'login' || a === 'signup')) go(home(user))
    if (user && a === 'users' && user.role !== 'admin') go('/pages')
  }, [path, user])
  const login = u => { put('cms_session', u); setUser(u); go(home(u)) }
  const logout = () => { localStorage.removeItem('cms_session'); setUser(null); go('/login') }
  if (a === 'view') return <Public slug={b} />
  if (!user) return a === 'signup' ? <Signup onDone={login} /> : <Login onDone={login} />
  const nav = [['/dashboard', 'Dashboard'], ['/pages', user.role === 'admin' ? 'All pages' : 'My pages'], ['/edit/new', 'New page'], ...(user.role === 'admin' ? [['/users', 'Users']] : [])]
  return (
    <div className="shell">
      <aside>
        <h1 className="brand">Inkwell</h1>
        <nav>{nav.map(([p, l]) => <a key={p} href={'#' + p} className={path === p || (p === '/pages' && a === 'edit' && b !== 'new') ? 'on' : ''}>{l}</a>)}</nav>
        <div className="me"><b>{user.name}</b><span className={'pill ' + user.role}>{user.role}</span><button className="ghost" onClick={logout}>Log out</button></div>
      </aside>
      <main>
        {a === 'dashboard' && <Dashboard user={user} />}
        {a === 'pages' && <Pages user={user} refresh={refresh} />}
        {a === 'edit' && <Editor key={b} id={b} user={user} />}
        {a === 'users' && user.role === 'admin' && <Users me={user} refresh={refresh} />}
      </main>
    </div>
  )
}

function Auth({ title, sub, children, foot }) {
  return <div className="auth"><div className="auth-art"><h1>Inkwell</h1><p>Write, review and publish pages without touching code.</p></div><div className="auth-card"><h2>{title}</h2><p className="muted">{sub}</p>{children}<p className="muted foot">{foot}</p></div></div>
}
function Login({ onDone }) {
  const [f, setF] = useState({ email: '', password: '' }), [err, setErr] = useState('')
  const submit = () => {
    const u = get('cms_users', []).find(x => x.email === f.email.trim().toLowerCase() && x.password === f.password)
    u ? onDone(u) : setErr('Email or password is incorrect. Check both and try again.')
  }
  return <Auth title="Log in" sub="Welcome back. Enter your details to continue." foot={<>New here? <a href="#/signup">Create an account</a></>}>
    <label>Email<input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
    <label>Password<input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && submit()} /></label>
    {err && <p className="err">{err}</p>}<button onClick={submit}>Log in</button></Auth>
}
function Signup({ onDone }) {
  const [f, setF] = useState({ name: '', email: '', password: '' }), [err, setErr] = useState('')
  const submit = () => {
    const users = get('cms_users', []), email = f.email.trim().toLowerCase()
    if (!f.name.trim() || !email.includes('@') || f.password.length < 6) return setErr('Enter your name, a valid email and a password of 6+ characters.')
    if (users.some(u => u.email === email)) return setErr('That email already has an account. Log in instead.')
    const u = { id: uid(), name: f.name.trim(), email, password: f.password, role: 'user' }
    put('cms_users', [...users, u]); onDone(u)
  }
  return <Auth title="Create account" sub="Sign up to start writing pages." foot={<>Have an account? <a href="#/login">Log in</a></>}>
    <label>Name<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
    <label>Email<input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
    <label>Password<input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && submit()} /></label>
    {err && <p className="err">{err}</p>}<button onClick={submit}>Sign up</button></Auth>
}

function Dashboard({ user }) {
  const all = get('cms_pages', []), pages = user.role === 'admin' ? all : all.filter(p => p.author === user.id)
  const n = s => pages.filter(p => p.status === s).length, views = pages.reduce((s, p) => s + p.views, 0)
  const max = Math.max(1, ...pages.map(p => p.views))
  const stats = [['Pages', pages.length], ['Published', n('published')], ['Awaiting approval', n('pending')], ['Total views', views]]
  return <><h2>{user.role === 'admin' ? 'Admin dashboard' : 'Your workspace'}</h2>
    <div className="stats">{stats.map(([l, v]) => <div key={l} className="stat"><b>{v}</b><span>{l}</span></div>)}</div>
    <h3>Views per page</h3>
    <div className="chart">{pages.length === 0 && <p className="muted">No pages yet. Create one to see analytics.</p>}
      {pages.map(p => <div key={p.id} className="bar"><span>{p.title}</span><i style={{ width: (p.views / max) * 100 + '%' }} /><em>{p.views}</em></div>)}</div>
    {user.role === 'admin' && <p className="muted">Pending pages appear in All pages with Approve and Reject buttons.</p>}</>
}

function Pages({ user, refresh }) {
  const [q, setQ] = useState(''), [st, setSt] = useState('all')
  const all = get('cms_pages', []), admin = user.role === 'admin'
  const pages = (admin ? all : all.filter(p => p.author === user.id)).filter(p => (st === 'all' || p.status === st) && p.title.toLowerCase().includes(q.toLowerCase()))
  const setStatus = (id, status) => { put('cms_pages', all.map(p => p.id === id ? { ...p, status } : p)); refresh() }
  const del = id => { if (confirm('Delete this page permanently?')) { put('cms_pages', all.filter(p => p.id !== id)); refresh() } }
  return <><div className="row"><h2>{admin ? 'All pages' : 'My pages'}</h2><a className="btn" href="#/edit/new">New page</a></div>
    <div className="row tools"><input placeholder="Search by title" value={q} onChange={e => setQ(e.target.value)} />
      <select value={st} onChange={e => setSt(e.target.value)}>{['all', 'draft', 'pending', 'published', 'rejected'].map(s => <option key={s}>{s}</option>)}</select></div>
    {pages.length === 0 && <p className="muted">No pages match. Create a new page to get started.</p>}
    <div className="cards">{pages.map(p => <div className="card" key={p.id}>
      <span className={'pill ' + p.status}>{p.status}</span><h3>{p.title}</h3>
      <p className="muted">by {p.authorName} · {p.views} views</p>
      <div className="row acts"><a className="btn sm" href={'#/edit/' + p.id}>Edit</a>
        {p.status === 'published' && <a className="btn sm ghost" href={'#/view/' + p.slug} target="_blank">View</a>}
        {admin && p.status === 'pending' && <><button className="sm" onClick={() => setStatus(p.id, 'published')}>Approve</button><button className="sm ghost" onClick={() => setStatus(p.id, 'rejected')}>Reject</button></>}
        {(admin || p.status !== 'published') && <button className="sm danger" onClick={() => del(p.id)}>Delete</button>}</div></div>)}</div></>
}

function Preview({ blocks, template }) {
  return <div className={'preview t-' + template}>{blocks.map(b => b.type === 'heading' ? <h1 key={b.id}>{b.text}</h1> : b.type === 'text' ? <p key={b.id}>{b.text}</p> : b.type === 'image' ? <img key={b.id} src={b.text} alt="" /> : <a key={b.id} className="cta" href="#">{b.text}</a>)}</div>
}

function Editor({ id, user }) {
  const isNew = id === 'new', all = get('cms_pages', [])
  const [p, setP] = useState(() => (isNew ? { id: uid(), title: '', slug: '', desc: '', template: 'classic', blocks: [], status: 'draft', author: user.id, authorName: user.name, views: 0 } : all.find(x => x.id === id)))
  const [msg, setMsg] = useState('')
  if (!p) return <p>Page not found. <a href="#/pages">Back to pages</a></p>
  if (user.role !== 'admin' && p.author !== user.id) return <p>You can only edit your own pages.</p>
  const set = patch => setP({ ...p, ...patch })
  const drop = (e, i) => {
    e.preventDefault(); const d = e.dataTransfer.getData('text/plain')
    if (d.startsWith('new:')) { const bl = [...p.blocks]; bl.splice(i, 0, { id: uid(), type: d.slice(4), text: d.slice(4) === 'button' ? 'Click me' : '' }); set({ blocks: bl }) }
    else if (d.startsWith('mv:')) { const from = p.blocks.findIndex(x => x.id === d.slice(3)), bl = [...p.blocks], [m] = bl.splice(from, 1); bl.splice(i > from ? i - 1 : i, 0, m); set({ blocks: bl }) }
  }
  const save = status => {
    if (!p.title.trim()) return setMsg('Add a page title first.')
    const slug = slugify(p.slug || p.title), clash = all.some(x => x.slug === slug && x.id !== p.id)
    if (clash) return setMsg('That URL slug is taken. Change the slug.')
    const next = { ...p, slug, status, updated: Date.now() }
    put('cms_pages', all.some(x => x.id === p.id) ? all.map(x => x.id === p.id ? next : x) : [...all, next]); go('/pages')
  }
  const seo = [p.title.length >= 20 && p.title.length <= 60, p.desc.length >= 70 && p.desc.length <= 160, p.blocks.some(b => b.type === 'heading')].filter(Boolean).length
  return <><div className="row"><h2>{isNew ? 'New page' : 'Edit page'}</h2><div className="row acts">
    <button className="ghost" onClick={() => save('draft')}>Save draft</button>
    {user.role === 'admin' ? <button onClick={() => save('published')}>Publish</button> : <button onClick={() => save('pending')}>Submit for approval</button>}</div></div>
    {msg && <p className="err">{msg}</p>}
    <div className="editor">
      <div className="palette"><h3>Blocks</h3><p className="muted">Drag onto the canvas</p>
        {Object.entries(TYPES).map(([t, l]) => <div key={t} className="chip" draggable onDragStart={e => e.dataTransfer.setData('text/plain', 'new:' + t)}>{l}</div>)}</div>
      <div className="canvas" onDragOver={e => e.preventDefault()} onDrop={e => drop(e, p.blocks.length)}>
        {p.blocks.length === 0 && <p className="muted empty">Drop a block here to start building.</p>}
        {p.blocks.map((b, i) => <div key={b.id} className="blk" draggable onDragStart={e => e.dataTransfer.setData('text/plain', 'mv:' + b.id)} onDragOver={e => e.preventDefault()} onDrop={e => { e.stopPropagation(); drop(e, i) }}>
          <span className="grip">{TYPES[b.type]}</span>
          {b.type === 'text' ? <textarea value={b.text} onChange={e => set({ blocks: p.blocks.map(x => x.id === b.id ? { ...x, text: e.target.value } : x) })} /> : <input value={b.text} placeholder={b.type === 'image' ? 'https://…/image.jpg' : ''} onChange={e => set({ blocks: p.blocks.map(x => x.id === b.id ? { ...x, text: e.target.value } : x) })} />}
          <button className="sm danger" onClick={() => set({ blocks: p.blocks.filter(x => x.id !== b.id) })}>Remove</button></div>)}
        <h3>Live preview</h3><Preview blocks={p.blocks} template={p.template} /></div>
      <div className="side"><h3>Settings</h3>
        <label>Template<select value={p.template} onChange={e => set({ template: e.target.value })}><option value="classic">Classic</option><option value="modern">Modern</option><option value="dark">Dark</option></select></label>
        <label>Title<input value={p.title} onChange={e => set({ title: e.target.value })} /></label>
        <label>URL slug<input value={p.slug} placeholder={slugify(p.title)} onChange={e => set({ slug: e.target.value })} /></label>
        <label>Meta description<textarea value={p.desc} onChange={e => set({ desc: e.target.value })} /></label>
        <div className="seo"><b>SEO score {seo}/3</b><small>Title 20–60 chars · description 70–160 chars · has a heading</small></div></div>
    </div></>
}

function Users({ me, refresh }) {
  const users = get('cms_users', [])
  const upd = (id, patch) => { put('cms_users', users.map(u => u.id === id ? { ...u, ...patch } : u)); refresh() }
  const del = id => { if (confirm('Remove this user?')) { put('cms_users', users.filter(u => u.id !== id)); refresh() } }
  return <><h2>Users</h2><div className="cards">{users.map(u => <div className="card" key={u.id}><h3>{u.name}</h3><p className="muted">{u.email}</p>
    <div className="row acts"><select disabled={u.id === me.id} value={u.role} onChange={e => upd(u.id, { role: e.target.value })}><option value="user">user</option><option value="admin">admin</option></select>
      {u.id !== me.id && <button className="sm danger" onClick={() => del(u.id)}>Remove</button>}</div></div>)}</div></>
}

function Public({ slug }) {
  const page = get('cms_pages', []).find(p => p.slug === slug && p.status === 'published')
  useEffect(() => {
    if (!page) return
    put('cms_pages', get('cms_pages', []).map(p => p.id === page.id ? { ...p, views: p.views + 1 } : p))
    document.title = page.title
    let m = document.querySelector('meta[name=description]'); if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m) }
    m.content = page.desc
  }, [slug])
  if (!page) return <div className="auth-card solo"><h2>Page not found</h2><p className="muted">This page is unpublished or the link is wrong.</p><a href="#/login">Go to Inkwell</a></div>
  return <Preview blocks={page.blocks} template={page.template} />
}