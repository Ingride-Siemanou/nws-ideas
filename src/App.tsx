import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isConfigured, allowedDomain } from './lib/supabase'
import { categories, statuses, type Category, type Idea, type IdeaStatus } from './types'
import { Lightbulb, Search, Plus, ThumbsUp, LogOut, Sparkles, SlidersHorizontal, ShieldCheck, X, MessageCircle, ArrowUpRight, LoaderCircle, ImagePlus, CheckCircle2 } from 'lucide-react'

type Profile = { id: string; email: string; role: 'student' | 'admin' }
const demoIdeas: Idea[] = [
  { id: 'demo-1', title: 'Un espace détente entre les cours', description: 'Créer un coin confortable avec quelques fauteuils, des jeux de société et une petite bibliothèque pour souffler entre deux projets.', category: 'Vie étudiante', status: 'À l’étude', image_url: null, created_at: new Date(Date.now()-86400000*2).toISOString(), author_id: 'demo', votes_count: 24, has_voted: false },
  { id: 'demo-2', title: 'Des ateliers portfolio avec des professionnels', description: 'Organiser des sessions régulières pour obtenir des retours concrets sur nos portfolios et nos projets.', category: 'Pédagogie', status: 'Acceptée', image_url: null, created_at: new Date(Date.now()-86400000*4).toISOString(), author_id: 'demo', votes_count: 18, has_voted: false },
  { id: 'demo-3', title: 'Une soirée projets créatifs', description: 'Une soirée par trimestre pour présenter les projets réalisés, découvrir les autres promotions et échanger.', category: 'Événements', status: 'Proposée', image_url: null, created_at: new Date(Date.now()-86400000*6).toISOString(), author_id: 'demo', votes_count: 13, has_voted: false },
  { id: 'demo-4', title: 'Plus de prises dans les espaces communs', description: 'Ajouter quelques multiprises sécurisées pour pouvoir recharger nos ordinateurs pendant les pauses.', category: 'Équipements', status: 'Réalisée', image_url: null, created_at: new Date(Date.now()-86400000*9).toISOString(), author_id: 'demo', votes_count: 9, has_voted: false }
]
const statusClass = (status: string) => status.toLowerCase().replace('à', 'a').replace('é', 'e').replace('’', '-').replaceAll(' ', '-')

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>(demoIdeas)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Toutes')
  const [sort, setSort] = useState('popular')
  const [page, setPage] = useState<'ideas'|'mine'|'admin'>('ideas')
  const [authOpen, setAuthOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<Idea | null>(null)
  const [toast, setToast] = useState('')
  const [authMode, setAuthMode] = useState<'login'|'signup'|'reset'|'admin-login'|'admin-signup'>('login')
  const [resetReturnMode, setResetReturnMode] = useState<'login'|'admin-login'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('Vie étudiante')
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setProfile(null); return }
    let alive = true
    supabase.from('profiles').select('id,email,role').eq('id', session.user.id).single()
      .then(({ data }) => { if (alive && data) setProfile(data as Profile) })
    return () => { alive = false }
  }, [session])

  async function loadIdeas() {
    if (!isConfigured || !session) return
    setLoading(true)
    const { data, error } = await supabase.from('ideas').select('id,title,description,category,status,image_url,created_at,author_id,votes(count),idea_votes!left(user_id)').order('created_at', { ascending: false })
    if (!error && data) {
      const mapped = data.map((row: any) => ({
        ...row, votes_count: Array.isArray(row.votes) ? (row.votes[0]?.count || 0) : 0,
        has_voted: Array.isArray(row.idea_votes) && row.idea_votes.some((v: any) => v.user_id === session.user.id)
      })) as Idea[]
      setIdeas(mapped)
    }
    setLoading(false)
  }
  useEffect(() => { void loadIdeas() }, [session])

  const visibleIdeas = useMemo(() => {
    let list = [...ideas]
    if (page === 'mine' && session) list = list.filter(i => i.author_id === session.user.id)
    if (category !== 'Toutes') list = list.filter(i => i.category === category)
    const q = search.trim().toLocaleLowerCase('fr')
    if (q) list = list.filter(i => `${i.title} ${i.description} ${i.category}`.toLocaleLowerCase('fr').includes(q))
    if (sort === 'popular') list.sort((a,b) => b.votes_count-a.votes_count)
    else list.sort((a,b) => new Date(b.created_at).getTime()-new Date(a.created_at).getTime())
    return list
  }, [ideas, category, search, sort, page, session])

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 3500) }

  async function authenticate(e: FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const isAdminMode = authMode === 'admin-login' || authMode === 'admin-signup'
    const isSignup = authMode === 'signup' || authMode === 'admin-signup'

    if (authMode === 'reset') {
      if (!normalizedEmail.endsWith(`@${allowedDomain}`)) { notify(`Utilise ton adresse @${allowedDomain}`); return }
      setAuthBusy(true)
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: `${window.location.origin}/` })
      setAuthBusy(false)
      if (error) notify(error.message)
      else notify('Si cette adresse possède un compte, un e-mail de réinitialisation vient d’être envoyé.')
      return
    }
    if (!normalizedEmail.endsWith(`@${allowedDomain}`)) { notify(`Utilise ton adresse @${allowedDomain}`); return }
    if (password.length < 8) { notify('Le mot de passe doit contenir au moins 8 caractères.'); return }

    setAuthBusy(true)
    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { requested_role: isAdminMode ? 'admin' : 'student' } }
      })
      setAuthBusy(false)
      if (error) {
        notify(isAdminMode
          ? 'Inscription administrateur impossible. Vérifie que cette adresse est autorisée dans Supabase et qu’elle n’a pas déjà de compte.'
          : error.message)
      } else {
        setAuthOpen(false)
        notify(isAdminMode
          ? 'Demande de compte administrateur envoyée. Vérifie tes e-mails. Seules les adresses préautorisées obtiennent les droits admin.'
          : 'Compte créé. Consulte tes e-mails pour confirmer ton adresse.')
      }
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    if (error || !data.user) {
      setAuthBusy(false)
      notify(error?.message || 'Connexion impossible. Vérifie tes identifiants.')
      return
    }

    if (isAdminMode) {
      const { data: adminProfile, error: profileError } = await supabase
        .from('profiles').select('role').eq('id', data.user.id).single()
      if (profileError || adminProfile?.role !== 'admin') {
        await supabase.auth.signOut()
        setAuthBusy(false)
        notify('Ce compte n’a pas accès à l’espace administrateur. Utilise une adresse autorisée.')
        return
      }
      setPage('admin')
      setAuthOpen(false)
      setAuthBusy(false)
      notify('Bienvenue dans l’espace administrateur !')
      return
    }

    setAuthOpen(false)
    setAuthBusy(false)
    notify('Bienvenue sur NWS Ideas !')
  }

  async function vote(idea: Idea) {
    if (!session) { setAuthOpen(true); return }
    if (!isConfigured || idea.id.startsWith('demo-')) { notify('Connecte Supabase pour enregistrer les votes.'); return }
    const result = idea.has_voted
      ? await supabase.from('idea_votes').delete().eq('idea_id', idea.id).eq('user_id', session.user.id)
      : await supabase.from('idea_votes').insert({ idea_id: idea.id, user_id: session.user.id })
    if (result.error) notify(result.error.message)
    else await loadIdeas()
  }

  async function submitIdea(e: FormEvent) {
    e.preventDefault()
    if (!session) { setAuthOpen(true); return }
    if (!isConfigured) { notify('Configure Supabase pour publier réellement les idées.'); return }
    setLoading(true)
    let image_url: string | null = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop() || 'jpg'
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`
      const upload = await supabase.storage.from('idea-images').upload(path, imageFile, { upsert: false })
      if (upload.error) { setLoading(false); notify(`Image : ${upload.error.message}`); return }
      image_url = supabase.storage.from('idea-images').getPublicUrl(path).data.publicUrl
    }
    const { error } = await supabase.from('ideas').insert({ title: title.trim(), description: description.trim(), category: newCategory, author_id: session.user.id, image_url })
    setLoading(false)
    if (error) notify(error.message)
    else { setFormOpen(false); setTitle(''); setDescription(''); setImageFile(null); setPage('ideas'); await loadIdeas(); notify('Ton idée a bien été publiée !') }
  }

  async function updateStatus(ideaId: string, status: IdeaStatus) {
    const { error } = await supabase.from('ideas').update({ status }).eq('id', ideaId)
    if (error) notify(error.message)
    else { notify('Statut mis à jour.'); await loadIdeas() }
  }
  async function deleteIdea(ideaId: string) {
    if (!window.confirm('Supprimer définitivement cette idée ?')) return
    const { error } = await supabase.from('ideas').delete().eq('id', ideaId)
    if (error) notify(error.message)
    else { notify('Idée supprimée.'); setSelected(null); await loadIdeas() }
  }

  const counts = {
    total: ideas.filter(i => !i.id.startsWith('demo-')).length,
    accepted: ideas.filter(i => ['Acceptée','Réalisée'].includes(i.status)).length,
    votes: ideas.reduce((sum,i) => sum+i.votes_count,0)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={() => setPage('ideas')}><span className="brand-mark"><img src="/logo-nws.jpeg" alt="Logo Normandie Web School" /></span><span><b>NWS<span className="brand-dot">.</span>IDEAS</b><small>Fais bouger ton école</small></span></a>
      <div className="nav-label">ESPACE ÉTUDIANT</div>
      <button className={`nav-item ${page==='ideas'?'active':''}`} onClick={() => setPage('ideas')}><Sparkles size={18}/> Toutes les idées</button>
      <button className={`nav-item ${page==='mine'?'active':''}`} onClick={() => session ? setPage('mine') : setAuthOpen(true)}><Lightbulb size={18}/> Mes propositions</button>
      {profile?.role === 'admin' && <><div className="nav-label">GESTION</div><button className={`nav-item ${page==='admin'?'active':''}`} onClick={() => setPage('admin')}><ShieldCheck size={18}/> Administration</button></>}
      <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Sparkles size={18}/></div><b>Une idée en tête ?</b><p>Les meilleures améliorations commencent par une suggestion.</p><button onClick={() => session ? setFormOpen(true) : setAuthOpen(true)}>Proposer une idée <ArrowUpRight size={15}/></button></div>
      {session ? <button className="user-row" onClick={async () => { await supabase.auth.signOut(); setProfile(null); setSession(null); notify('Tu es déconnecté.') }}><span className="avatar">{(session.user.email || 'E')[0].toUpperCase()}</span><span className="user-copy"><b>{profile?.role==='admin'?'Équipe NWS':'Mon compte'}</b><small>Session connectée</small></span><LogOut size={17}/></button> : <button className="login-sidebar" onClick={() => setAuthOpen(true)}>Se connecter <ArrowUpRight size={16}/></button>}</div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">NWS <span>/</span> <b>{page==='mine'?'Mes propositions':page==='admin'?'Administration':'Boîte à idées'}</b></div><div className="top-actions"><span className="live-dot"/> <span className="top-status">L'espace collaboratif étudiant</span><button className="admin-entry" onClick={() => { if (session && profile?.role === 'admin') setPage('admin'); else { setAuthMode('admin-login'); setAuthOpen(true) } }}><ShieldCheck size={15}/> Espace admin</button>{!session && <button className="btn btn-dark btn-small" onClick={() => { setAuthMode('login'); setAuthOpen(true) }}>Connexion <ArrowUpRight size={15}/></button>}</div></header>
      <div className="content">
        <section className="hero"><div className="hero-copy"><div className="eyebrow"><span/> LA COMMUNAUTÉ NWS IMAGINE DEMAIN</div><h1>Et si on faisait<br/>bouger les choses<span className="yellow-dot">.</span></h1><p>Une idée, une envie, une amélioration ? Partage tes propositions et construisons ensemble une meilleure expérience à la NWS.</p><button className="btn btn-yellow" onClick={() => session ? setFormOpen(true) : setAuthOpen(true)}><Plus size={18}/> Proposer une idée <ArrowUpRight size={16}/></button></div><div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="idea-card-floating"><div className="floating-icon"><Lightbulb size={31}/></div><div><b>Les idées changent tout.</b><span>La prochaine peut être la tienne.</span></div><Sparkles className="floating-spark" size={23}/></div><div className="art-badge badge-top">✳ 100% collaboratif</div><div className="art-badge badge-bottom"><span className="live-dot"/> Tes idées comptent</div></div><div className="hero-index">01 <span>/</span> 03</div></section>

        <section className="stats-row"><div className="stat-item"><span className="stat-icon purple"><Lightbulb size={19}/></span><div><strong>{isConfigured ? counts.total : '—'}</strong><span>Idées proposées</span></div></div><div className="stat-item"><span className="stat-icon green"><CheckCircle2 size={19}/></span><div><strong>{isConfigured ? counts.accepted : '—'}</strong><span>Idées retenues</span></div></div><div className="stat-item"><span className="stat-icon orange"><ThumbsUp size={19}/></span><div><strong>{isConfigured ? counts.votes : '—'}</strong><span>Soutiens exprimés</span></div></div><div className="stats-note"><span className="live-dot"/> Ensemble, on va plus loin.</div></section>

        {!isConfigured && <div className="setup-notice"><b>Mode aperçu activé</b><span>Les idées affichées sont des exemples. Configure les variables Supabase dans <code>.env</code> et applique <code>supabase/schema.sql</code> pour activer les comptes, les votes et les publications réelles.</span></div>}

        {page==='admin' && profile?.role==='admin' ? <section className="ideas-section"><div className="section-heading"><div><div className="eyebrow dark-eye">ESPACE ÉQUIPE</div><h2>Modération <span className="yellow-dot">.</span></h2><p>Fais le point sur les propositions de la communauté.</p></div></div><div className="admin-table">{ideas.filter(i=>!i.id.startsWith('demo-')).map(idea=><div className="admin-row" key={idea.id}><div><b>{idea.title}</b><small>{idea.category} · {idea.votes_count} votes</small></div><select value={idea.status} onChange={e=>void updateStatus(idea.id,e.target.value as IdeaStatus)}>{statuses.map(s=><option key={s}>{s}</option>)}</select><button className="icon-button danger" onClick={()=>void deleteIdea(idea.id)}><X size={17}/></button></div>)}</div></section> :
        <section className="ideas-section"><div className="section-heading"><div><div className="eyebrow dark-eye">LE MUR DES PROPOSITIONS</div><h2>{page==='mine'?'Tes idées':'Les idées de la communauté'}<span className="yellow-dot">.</span></h2><p>{page==='mine'?'Retrouve ici tes propositions et leur avancement.':'Découvre, soutiens et fais grandir les idées des étudiants.'}</p></div><button className="btn btn-dark create-button" onClick={() => session ? setFormOpen(true) : setAuthOpen(true)}><Plus size={17}/> Nouvelle idée</button></div>
          <div className="toolbar"><label className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une idée..."/>{search && <button onClick={()=>setSearch('')} aria-label="Effacer"><X size={15}/></button>}</label><div className="filter-control"><SlidersHorizontal size={17}/><select value={category} onChange={e=>setCategory(e.target.value)}><option>Toutes</option>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div className="sort-control"><select value={sort} onChange={e=>setSort(e.target.value)}><option value="popular">Les plus populaires</option><option value="recent">Les plus récentes</option></select></div></div>
          <div className="category-chips">{['Toutes',...categories].map(c=><button key={c} className={`chip ${category===c?'selected':''}`} onClick={()=>setCategory(c)}>{c}</button>)}</div>
          {loading && <div className="loading"><LoaderCircle className="spin"/> Chargement des idées…</div>}
          <div className="ideas-grid">{visibleIdeas.map((idea,index)=><article className="idea-card" key={idea.id}><div className={`card-visual visual-${index%4}`}>{idea.image_url ? <img src={idea.image_url} alt="Illustration de l'idée"/> : <div className="visual-decoration"><span className="visual-shape"/><span className="visual-symbol">{['✳','↗','◈','✦'][index%4]}</span><span className="visual-label">NWS / IDEAS</span></div>}<span className="category-tag">{idea.category}</span></div><div className="idea-body"><div className="card-meta"><span className={`status-pill status-${statusClass(idea.status)}`}><span/> {idea.status}</span><span>{new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short'}).format(new Date(idea.created_at))}</span></div><button className="idea-title" onClick={()=>setSelected(idea)}>{idea.title}</button><p className="idea-description">{idea.description}</p><div className="idea-footer"><button className={`vote-button ${idea.has_voted?'voted':''}`} onClick={()=>void vote(idea)}><ThumbsUp size={16}/><b>{idea.votes_count}</b><span>{idea.has_voted?'Soutenu':'Soutenir'}</span></button><button className="comment-link" onClick={()=>setSelected(idea)}><MessageCircle size={16}/> Détails <ArrowUpRight size={14}/></button></div></div></article>)}</div>
          {!visibleIdeas.length && <div className="empty-state"><span><Search size={24}/></span><h3>Aucune idée trouvée</h3><p>Essaie un autre mot-clé ou change les filtres.</p><button className="btn btn-dark" onClick={()=>{setSearch('');setCategory('Toutes')}}>Réinitialiser les filtres</button></div>}
          <div className="ideas-bottom"><span>Affichage de <b>{visibleIdeas.length}</b> idée{visibleIdeas.length>1?'s':''}</span><span className="bottom-message">Une petite idée peut faire une grande différence <span>✳</span></span></div>
        </section>}
        <footer><a className="footer-brand" href="#">NWS<span>.</span>IDEAS</a><span>Imaginons ensemble l'école de demain.</span><span>© {new Date().getFullYear()} Normandie Web School · Projet étudiant</span></footer>
      </div>
    </main>

    {authOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><section className="modal auth-modal"><button className="modal-close" onClick={()=>setAuthOpen(false)} aria-label="Fermer"><X/></button><div className="modal-mark"><img src="/logo-nws.jpeg" alt="Logo Normandie Web School" /></div><div className="eyebrow dark-eye">BIENVENUE À LA NWS</div><h2>{authMode==='admin-login'?'Connexion administrateur':authMode==='admin-signup'?'Créer un compte administrateur':authMode==='login'?'Content de te revoir.':authMode==='signup'?'Rejoins la communauté.':'Mot de passe oublié ?'}</h2><p>{authMode==='reset'?'Saisis ton adresse e-mail NWS. Nous t’enverrons un lien pour choisir un nouveau mot de passe.':authMode==='admin-login'?'Connecte-toi avec une adresse autorisée pour gérer les propositions de la NWS.':authMode==='admin-signup'?'L’inscription est réservée aux adresses ajoutées à la liste d’autorisation de l’école dans Supabase.':'Connecte-toi avec ton adresse e-mail étudiante pour participer.'}</p><form onSubmit={authenticate} className="form-stack"><label>Adresse e-mail NWS<input type="email" required placeholder={`prenom@${allowedDomain}`} value={email} onChange={e=>setEmail(e.target.value)}/></label>{authMode!=='reset'&&<label>Mot de passe<input type="password" required minLength={8} placeholder="8 caractères minimum" value={password} onChange={e=>setPassword(e.target.value)}/></label>}{(authMode==='login'||authMode==='admin-login')&&<button type="button" className="forgot-password" onClick={()=>{setResetReturnMode(authMode);setAuthMode('reset')}}>Mot de passe oublié ?</button>}<button className="btn btn-yellow full-width" disabled={authBusy||!isConfigured}>{authBusy?<LoaderCircle className="spin"/>:null}{authMode==='login'?'Se connecter':authMode==='signup'?'Créer mon compte':authMode==='admin-login'?'Accéder à l’administration':authMode==='admin-signup'?'Créer mon compte administrateur':'Envoyer le lien de réinitialisation'} <ArrowUpRight size={16}/></button>{!isConfigured&&<small className="form-hint">Configure Supabase pour activer l'authentification.</small>}</form><div className="modal-switch">{authMode==='reset'?'Tu te souviens de ton mot de passe ?':authMode==='login'?'Pas encore de compte ?':authMode==='signup'?'Déjà inscrit ?':authMode==='admin-login'?'Adresse autorisée mais pas encore de compte ?':'Déjà un compte administrateur ?'} <button onClick={()=>{if(authMode==='reset')setAuthMode(resetReturnMode);else if(authMode==='login')setAuthMode('signup');else if(authMode==='signup')setAuthMode('login');else if(authMode==='admin-login')setAuthMode('admin-signup');else setAuthMode('admin-login')}}>{authMode==='reset'?'Se connecter':authMode==='login'?'Créer un compte':authMode==='signup'?'Se connecter':authMode==='admin-login'?'Créer un compte administrateur':'Se connecter'}</button>{(authMode==='admin-login'||authMode==='admin-signup')&&<div className="auth-back"><button onClick={()=>setAuthMode('login')}>← Retour à la connexion étudiante</button></div>}</div></section></div>}

    {formOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setFormOpen(false)}}><section className="modal modal-wide"><button className="modal-close" onClick={()=>setFormOpen(false)}><X/></button><div className="eyebrow dark-eye">À TOI DE JOUER</div><h2>Propose ton idée<span className="yellow-dot">.</span></h2><p>Chaque suggestion compte. Explique-nous ce qui pourrait améliorer la vie à la NWS.</p><form onSubmit={submitIdea} className="form-stack"><label>Titre de l'idée<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. : Un espace détente plus convivial"/></label><label>Description détaillée<textarea required minLength={15} maxLength={3000} rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Explique ton idée, le besoin auquel elle répond et comment la mettre en place…"/></label><label>Catégorie<select value={newCategory} onChange={e=>setNewCategory(e.target.value as Category)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="upload-box"><ImagePlus size={20}/><span><b>{imageFile?.name || 'Ajouter une image (facultatif)'}</b><small>JPG, PNG ou WebP · 5 Mo maximum</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0]||null;if(f&&f.size>5*1024*1024){notify('Image limitée à 5 Mo.');e.target.value='';return}setImageFile(f)}}/></label><button className="btn btn-yellow full-width" disabled={loading}>{loading?<LoaderCircle className="spin"/>:<Plus size={18}/>} Publier mon idée <ArrowUpRight size={16}/></button></form></section></div>}

    {selected && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="modal modal-wide"><button className="modal-close" onClick={()=>setSelected(null)}><X/></button><div className="card-meta detail-meta"><span className={`status-pill status-${statusClass(selected.status)}`}><span/> {selected.status}</span><span className="category-tag inline-tag">{selected.category}</span></div><h2>{selected.title}<span className="yellow-dot">.</span></h2><p className="detail-description">{selected.description}</p>{selected.image_url&&<img className="detail-image" src={selected.image_url} alt="Illustration de la proposition"/>}<div className="detail-actions"><button className={`vote-button ${selected.has_voted?'voted':''}`} onClick={async()=>{await vote(selected);setSelected({...selected,has_voted:!selected.has_voted,votes_count:selected.votes_count+(selected.has_voted?-1:1)})}}><ThumbsUp size={17}/><b>{selected.votes_count}</b> {selected.has_voted?'Retirer mon soutien':'Soutenir cette idée'}</button>{profile?.role==='admin'&&!selected.id.startsWith('demo-')&&<><select value={selected.status} onChange={async e=>{await updateStatus(selected.id,e.target.value as IdeaStatus);setSelected({...selected,status:e.target.value as IdeaStatus})}}>{statuses.map(s=><option key={s}>{s}</option>)}</select><button className="btn btn-danger" onClick={()=>void deleteIdea(selected.id)}>Supprimer</button></>}</div><div className="detail-note"><MessageCircle size={17}/><span>Les commentaires peuvent être activés avec la table <code>comments</code> décrite dans le schéma SQL.</span></div></section></div>}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>
}