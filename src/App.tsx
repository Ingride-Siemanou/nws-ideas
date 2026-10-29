import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isConfigured, allowedDomain } from './lib/supabase'
import {
  categories,
  statuses,
  type Category,
  type Idea,
  type IdeaStatus
} from './types'
import {
  Lightbulb,
  Search,
  Plus,
  ThumbsUp,
  LogOut,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  X,
  MessageCircle,
  ArrowUpRight,
  LoaderCircle,
  ImagePlus,
  CheckCircle2,
  Bell,
  Check,
  Trash2
} from 'lucide-react'

type Profile = {
  id: string
  email: string
  role: 'student' | 'admin'
}

type Page = 'ideas' | 'mine' | 'admin' | 'notifications'

type IdeaComment = {
  id: string
  idea_id: string
  author_id: string
  body: string
  created_at: string
}

type AppNotification = {
  id: string
  user_id: string
  idea_id: string
  message: string
  read_at: string | null
  created_at: string
}

const demoIdeas: Idea[] = [
  {
    id: 'demo-1',
    title: 'Un espace détente entre les cours',
    description:
      'Créer un coin confortable avec quelques fauteuils, des jeux de société et une petite bibliothèque pour souffler entre deux projets.',
    category: 'Vie étudiante',
    status: 'À l’étude',
    image_url: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    author_id: 'demo',
    votes_count: 24,
    has_voted: false
  },
  {
    id: 'demo-2',
    title: 'Des ateliers portfolio avec des professionnels',
    description:
      'Organiser des sessions régulières pour obtenir des retours concrets sur nos portfolios et nos projets.',
    category: 'Pédagogie',
    status: 'Acceptée',
    image_url: null,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    author_id: 'demo',
    votes_count: 18,
    has_voted: false
  },
  {
    id: 'demo-3',
    title: 'Une soirée projets créatifs',
    description:
      'Une soirée par trimestre pour présenter les projets réalisés, découvrir les autres promotions et échanger.',
    category: 'Événements',
    status: 'Proposée',
    image_url: null,
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    author_id: 'demo',
    votes_count: 13,
    has_voted: false
  },
  {
    id: 'demo-4',
    title: 'Plus de prises dans les espaces communs',
    description:
      'Ajouter quelques multiprises sécurisées pour pouvoir recharger nos ordinateurs pendant les pauses.',
    category: 'Équipements',
    status: 'Réalisée',
    image_url: null,
    created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
    author_id: 'demo',
    votes_count: 9,
    has_voted: false
  }
]

const statusClass = (status: string) =>
  status
    .toLowerCase()
    .replace('à', 'a')
    .replace('é', 'e')
    .replace('’', '-')
    .replaceAll(' ', '-')

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>(demoIdeas)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Toutes')
  const [sort, setSort] = useState('popular')
  const [page, setPage] = useState<Page>('ideas')

  const [authOpen, setAuthOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<Idea | null>(null)
  const [toast, setToast] = useState('')

  const [authMode, setAuthMode] = useState<
    'login' | 'signup' | 'reset' | 'admin-login' | 'admin-signup'
  >('login')

  const [resetReturnMode, setResetReturnMode] =
    useState<'login' | 'admin-login'>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [newCategory, setNewCategory] =
    useState<Category>('Vie étudiante')
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [ideaComments, setIdeaComments] = useState<IdeaComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentBusy, setCommentBusy] = useState(false)

  const [notifications, setNotifications] =
    useState<AppNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  // Effacer les champs lorsque la fenêtre de connexion se ferme.
  // Cela efface l'état React, mais le navigateur peut encore proposer
  // des identifiants mémorisés dans son propre gestionnaire de mots de passe.
  useEffect(() => {
    if (!authOpen) {
      setEmail('')
      setPassword('')
    }
  }, [authOpen])

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }

  function openAuth(mode: typeof authMode = 'login') {
    // Ne jamais réutiliser les identifiants précédemment saisis
    setEmail('')
    setPassword('')
    setAuthMode(mode)
    setAuthOpen(true)
  }

  // Récupérer la session Supabase.
  useEffect(() => {
    if (!isConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => setSession(next)
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  // Charger le profil et le rôle de l'utilisateur.
  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setNotifications([])
      setPage('ideas')
      return
    }

    let alive = true

    supabase
      .from('profiles')
      .select('id,email,role')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!alive) return

        if (error) {
          console.error('Erreur de récupération du profil :', error)
          setProfile(null)
          return
        }

        if (data) setProfile(data as Profile)
      })

    return () => {
      alive = false
    }
  }, [session])

  // Charger les idées et les votes.
  async function loadIdeas() {
    if (!isConfigured || !session) return

    setLoading(true)

    const { data, error } = await supabase
      .from('ideas')
      .select(
        'id,title,description,category,status,image_url,created_at,author_id,idea_votes(user_id)'
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors du chargement des idées :', error)
      setIdeas([])
      notify(`Impossible de charger les idées : ${error.message}`)
      setLoading(false)
      return
    }

    const mapped = (data ?? []).map((row: any) => ({
      ...row,
      votes_count: Array.isArray(row.idea_votes)
        ? row.idea_votes.length
        : 0,
      has_voted:
        Array.isArray(row.idea_votes) &&
        row.idea_votes.some(
          (vote: { user_id: string }) =>
            vote.user_id === session.user.id
        )
    })) as Idea[]

    setIdeas(mapped)
    setLoading(false)
  }

  // Charger les notifications personnelles.
  async function loadNotifications() {
    if (!isConfigured || !session) {
      setNotifications([])
      return
    }

    setNotificationsLoading(true)

    const { data, error } = await supabase
      .from('notifications')
      .select('id,user_id,idea_id,message,read_at,created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur de chargement des notifications :', error)
      setNotifications([])
      notify(`Impossible de charger les notifications : ${error.message}`)
    } else {
      setNotifications((data ?? []) as AppNotification[])
    }

    setNotificationsLoading(false)
  }

  // Charger les commentaires de la proposition sélectionnée.
  async function loadComments(ideaId: string) {
    if (!isConfigured || !session || ideaId.startsWith('demo-')) {
      setIdeaComments([])
      setCommentsLoading(false)
      return
    }

    setCommentsLoading(true)

    const { data, error } = await supabase
      .from('comments')
      .select('id,idea_id,author_id,body,created_at')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erreur de chargement des commentaires :', error)
      setIdeaComments([])
      notify(`Impossible de charger les commentaires : ${error.message}`)
    } else {
      setIdeaComments((data ?? []) as IdeaComment[])
    }

    setCommentsLoading(false)
  }

  useEffect(() => {
    void loadIdeas()
  }, [session])

  useEffect(() => {
    if (session) void loadNotifications()
  }, [session])

  useEffect(() => {
    setIdeaComments([])
    setCommentText('')

    if (selected) {
      void loadComments(selected.id)
    } else {
      setCommentsLoading(false)
    }
  }, [selected?.id, session?.user.id])

  const unreadNotifications = notifications.filter(
    notification => !notification.read_at
  ).length

  // Recherche, filtres et classement.
  const visibleIdeas = useMemo(() => {
    let list = [...ideas]

    if (page === 'mine' && session) {
      list = list.filter(idea => idea.author_id === session.user.id)
    }

    if (category !== 'Toutes') {
      list = list.filter(idea => idea.category === category)
    }

    const query = search.trim().toLocaleLowerCase('fr')

    if (query) {
      list = list.filter(idea =>
        `${idea.title} ${idea.description} ${idea.category}`
          .toLocaleLowerCase('fr')
          .includes(query)
      )
    }

    if (sort === 'popular') {
      list.sort((a, b) => b.votes_count - a.votes_count)
    } else {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
    }

    return list
  }, [ideas, category, search, sort, page, session])

  // Connexion, inscription et réinitialisation du mot de passe.
  async function authenticate(event: FormEvent) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const isAdminMode =
      authMode === 'admin-login' || authMode === 'admin-signup'
    const isSignup =
      authMode === 'signup' || authMode === 'admin-signup'

    if (!normalizedEmail.endsWith(`@${allowedDomain}`)) {
      notify(`Utilise ton adresse @${allowedDomain}`)
      return
    }

    if (authMode === 'reset') {
      setAuthBusy(true)

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: `${window.location.origin}/` }
      )

      setAuthBusy(false)

      if (error) {
        notify(error.message)
      } else {
        setEmail('')
        setPassword('')
        notify(
          'Si cette adresse possède un compte, un e-mail de réinitialisation vient d’être envoyé.'
        )
      }

      return
    }

    if (password.length < 8) {
      notify('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setAuthBusy(true)

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            requested_role: isAdminMode ? 'admin' : 'student'
          }
        }
      })

      setAuthBusy(false)

      if (error) {
        notify(
          isAdminMode
            ? 'Inscription administrateur impossible. Vérifie que cette adresse est autorisée dans Supabase et qu’elle n’a pas déjà de compte.'
            : error.message
        )
      } else {
        setEmail('')
        setPassword('')
        setAuthOpen(false)

        notify(
          isAdminMode
            ? 'Demande de compte administrateur envoyée. Vérifie tes e-mails. Seules les adresses préautorisées obtiennent les droits admin.'
            : 'Compte créé. Consulte tes e-mails pour confirmer ton adresse.'
        )
      }

      return
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      })

    if (error || !data.user) {
      setAuthBusy(false)
      setPassword('')
      notify(
        error?.message || 'Connexion impossible. Vérifie tes identifiants.'
      )
      return
    }

    if (isAdminMode) {
      const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError || adminProfile?.role !== 'admin') {
        await supabase.auth.signOut()
        setEmail('')
        setPassword('')
        setAuthBusy(false)

        notify(
          'Ce compte n’a pas accès à l’espace administrateur. Utilise une adresse autorisée.'
        )

        return
      }

      setPage('admin')
      setEmail('')
      setPassword('')
      setAuthOpen(false)
      setAuthBusy(false)
      notify('Bienvenue dans l’espace administrateur !')
      return
    }

    setPage('ideas')
    setEmail('')
    setPassword('')
    setAuthOpen(false)
    setAuthBusy(false)
    notify('Bienvenue sur NWS Ideas !')
  }

  // Enregistrer ou retirer un vote.
  async function vote(idea: Idea) {
    if (!session) {
      openAuth('login')
      return
    }

    if (!isConfigured || idea.id.startsWith('demo-')) {
      notify('Les votes de démonstration ne sont pas enregistrés.')
      return
    }

    const result = idea.has_voted
      ? await supabase
          .from('idea_votes')
          .delete()
          .eq('idea_id', idea.id)
          .eq('user_id', session.user.id)
      : await supabase
          .from('idea_votes')
          .insert({
            idea_id: idea.id,
            user_id: session.user.id
          })

    if (result.error) {
      notify(result.error.message)
    } else {
      await loadIdeas()
    }
  }

  // Publier une idée.
  async function submitIdea(event: FormEvent) {
    event.preventDefault()

    if (!session) {
      openAuth('login')
      return
    }

    if (!isConfigured) {
      notify('Configure Supabase pour publier réellement les idées.')
      return
    }

    setLoading(true)

    let image_url: string | null = null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop() || 'jpg'
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`

      const upload = await supabase.storage
        .from('idea-images')
        .upload(path, imageFile, { upsert: false })

      if (upload.error) {
        setLoading(false)
        notify(`Image : ${upload.error.message}`)
        return
      }

      image_url = supabase.storage
        .from('idea-images')
        .getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from('ideas').insert({
      title: title.trim(),
      description: description.trim(),
      category: newCategory,
      author_id: session.user.id,
      image_url
    })

    setLoading(false)

    if (error) {
      notify(error.message)
    } else {
      setFormOpen(false)
      setTitle('')
      setDescription('')
      setImageFile(null)
      setPage('ideas')
      await loadIdeas()
      notify('Ton idée a bien été publiée !')
    }
  }

  // Publier un commentaire.
  async function submitComment(event: FormEvent) {
    event.preventDefault()

    if (!session) {
      openAuth('login')
      return
    }

    if (!selected || selected.id.startsWith('demo-')) {
      notify('Les commentaires sont disponibles sur les idées réelles.')
      return
    }

    const body = commentText.trim()

    if (!body) {
      notify('Écris un commentaire avant de publier.')
      return
    }

    if (body.length > 1000) {
      notify('Le commentaire ne doit pas dépasser 1000 caractères.')
      return
    }

    setCommentBusy(true)

    const { error } = await supabase.from('comments').insert({
      idea_id: selected.id,
      author_id: session.user.id,
      body
    })

    setCommentBusy(false)

    if (error) {
      notify(`Commentaire non publié : ${error.message}`)
      return
    }

    setCommentText('')
    await loadComments(selected.id)
    notify('Commentaire publié !')
  }

  // Supprimer un commentaire lorsque les droits le permettent.
  async function deleteComment(comment: IdeaComment) {
    if (
      !session ||
      (comment.author_id !== session.user.id && profile?.role !== 'admin')
    ) {
      return
    }

    if (!window.confirm('Supprimer ce commentaire ?')) return

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', comment.id)

    if (error) {
      notify(`Commentaire non supprimé : ${error.message}`)
      return
    }

    await loadComments(comment.idea_id)
    notify('Commentaire supprimé.')
  }

  // Marquer une notification comme lue.
  async function markNotificationRead(notification: AppNotification) {
    if (!session || notification.read_at) return

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('id', notification.id)
      .eq('user_id', session.user.id)

    if (error) {
      notify(`Impossible de marquer la notification comme lue : ${error.message}`)
      return
    }

    setNotifications(current =>
      current.map(item =>
        item.id === notification.id
          ? { ...item, read_at: now }
          : item
      )
    )
  }

  // Modifier le statut d'une idée, réservé au rôle administrateur.
  async function updateStatus(ideaId: string, status: IdeaStatus) {
    if (profile?.role !== 'admin') {
      notify('Accès réservé à l’administration.')
      return
    }

    const { error } = await supabase
      .from('ideas')
      .update({ status })
      .eq('id', ideaId)

    if (error) {
      notify(error.message)
    } else {
      notify('Statut mis à jour.')
      await loadIdeas()
      await loadNotifications()
    }
  }

  // Supprimer une proposition, réservé au rôle administrateur.
  async function deleteIdea(ideaId: string) {
    if (profile?.role !== 'admin') {
      notify('Accès réservé à l’administration.')
      return
    }

    if (!window.confirm('Supprimer définitivement cette idée ?')) return

    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', ideaId)

    if (error) {
      notify(error.message)
    } else {
      notify('Idée supprimée.')
      setSelected(null)
      await loadIdeas()
    }
  }

  // Déconnexion et effacement des données de formulaire.
  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      notify(`Déconnexion impossible : ${error.message}`)
      return
    }

    setProfile(null)
    setSession(null)
    setPage('ideas')
    setNotifications([])
    setIdeaComments([])
    setCommentText('')
    setEmail('')
    setPassword('')
    setAuthOpen(false)
    setSelected(null)

    notify('Tu es déconnecté.')
  }

  const realIdeas = ideas.filter(
    idea => !idea.id.startsWith('demo-')
  )

  const counts = {
    total: realIdeas.length,
    accepted: realIdeas.filter(idea =>
      ['Acceptée', 'Réalisée'].includes(idea.status)
    ).length,
    votes: realIdeas.reduce(
      (sum, idea) => sum + idea.votes_count,
      0
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={event => {
            event.preventDefault()
            setPage('ideas')
          }}
        >
          <span className="brand-mark">
            <img
              src="/logo-nws.jpeg"
              alt="Logo Normandie Web School"
            />
          </span>
          <span>
            <b>
              NWS<span className="brand-dot">.</span>IDEAS
            </b>
            <small>Fais bouger ton école</small>
          </span>
        </a>

        <div className="nav-label">ESPACE ÉTUDIANT</div>

        <button
          className={`nav-item ${page === 'ideas' ? 'active' : ''}`}
          onClick={() => setPage('ideas')}
        >
          <Sparkles size={18} />
          Toutes les idées
        </button>

        <button
          className={`nav-item ${page === 'mine' ? 'active' : ''}`}
          onClick={() =>
            session ? setPage('mine') : openAuth('login')
          }
        >
          <Lightbulb size={18} />
          Mes propositions
        </button>

        <button
          className={`nav-item ${page === 'notifications' ? 'active' : ''}`}
          onClick={() => {
            if (!session) {
              openAuth('login')
              return
            }

            setPage('notifications')
            void loadNotifications()
          }}
        >
          <Bell size={18} />
          Notifications
          {unreadNotifications > 0 && (
            <span className="notification-count">
              {unreadNotifications}
            </span>
          )}
        </button>

        {profile?.role === 'admin' && (
          <>
            <div className="nav-label">GESTION</div>

            <button
              className={`nav-item ${page === 'admin' ? 'active' : ''}`}
              onClick={() => setPage('admin')}
            >
              <ShieldCheck size={18} />
              Administration
            </button>
          </>
        )}

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <Sparkles size={18} />
            </div>
            <b>Une idée en tête ?</b>
            <p>
              Les meilleures améliorations commencent par une suggestion.
            </p>
            <button
              onClick={() =>
                session ? setFormOpen(true) : openAuth('login')
              }
            >
              Proposer une idée <ArrowUpRight size={15} />
            </button>
          </div>

          {session ? (
            <button className="user-row" onClick={() => void signOut()}>
              <span className="avatar">
                {(session.user.email || 'E')[0].toUpperCase()}
              </span>
              <span className="user-copy">
                <b>
                  {profile?.role === 'admin' ? 'Équipe NWS' : 'Mon compte'}
                </b>
                <small>Session connectée</small>
              </span>
              <LogOut size={17} />
            </button>
          ) : (
            <button
              className="login-sidebar"
              onClick={() => openAuth('login')}
            >
              Se connecter <ArrowUpRight size={16} />
            </button>
          )}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            NWS <span>/</span>{' '}
            <b>
              {page === 'mine'
                ? 'Mes propositions'
                : page === 'admin'
                  ? 'Administration'
                  : page === 'notifications'
                    ? 'Notifications'
                    : 'Boîte à idées'}
            </b>
          </div>

          <div className="top-actions">
            <span className="live-dot" />
            <span className="top-status">
              L'espace collaboratif étudiant
            </span>

            <button
              className="admin-entry"
              onClick={() => {
                if (session && profile?.role === 'admin') {
                  setPage('admin')
                } else {
                  openAuth('admin-login')
                }
              }}
            >
              <ShieldCheck size={15} />
              Espace admin
            </button>

            {!session && (
              <button
                className="btn btn-dark btn-small"
                onClick={() => openAuth('login')}
              >
                Connexion <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </header>

        <div className="content">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span />
                LA COMMUNAUTÉ NWS IMAGINE DEMAIN
              </div>

              <h1>
                Et si on faisait
                <br />
                bouger les choses<span className="yellow-dot">.</span>
              </h1>

              <p>
                Une idée, une envie, une amélioration ? Partage tes propositions
                et construisons ensemble une meilleure expérience à la NWS.
              </p>

              <button
                className="btn btn-yellow"
                onClick={() =>
                  session ? setFormOpen(true) : openAuth('login')
                }
              >
                <Plus size={18} />
                Proposer une idée <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="hero-art">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />

              <div className="idea-card-floating">
                <div className="floating-icon">
                  <Lightbulb size={31} />
                </div>
                <div>
                  <b>Les idées changent tout.</b>
                  <span>La prochaine peut être la tienne.</span>
                </div>
                <Sparkles className="floating-spark" size={23} />
              </div>

              <div className="art-badge badge-top">
                ✳ 100% collaboratif
              </div>

              <div className="art-badge badge-bottom">
                <span className="live-dot" />
                Tes idées comptent
              </div>
            </div>

            <div className="hero-index">
              01 <span>/</span> 03
            </div>
          </section>

          <section className="stats-row">
            <div className="stat-item">
              <span className="stat-icon purple">
                <Lightbulb size={19} />
              </span>
              <div>
                <strong>{isConfigured ? counts.total : '—'}</strong>
                <span>Idées proposées</span>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon green">
                <CheckCircle2 size={19} />
              </span>
              <div>
                <strong>{isConfigured ? counts.accepted : '—'}</strong>
                <span>Idées retenues</span>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon orange">
                <ThumbsUp size={19} />
              </span>
              <div>
                <strong>{isConfigured ? counts.votes : '—'}</strong>
                <span>Soutiens exprimés</span>
              </div>
            </div>

            <div className="stats-note">
              <span className="live-dot" />
              Ensemble, on va plus loin.
            </div>
          </section>

          {!isConfigured && (
            <div className="setup-notice">
              <b>Mode aperçu activé</b>
              <span>
                Les idées affichées sont des exemples. Configure les variables
                Supabase dans <code>.env</code> et applique{' '}
                <code>supabase/schema.sql</code> pour activer les comptes, les
                votes et les publications réelles.
              </span>
            </div>
          )}

          {page === 'notifications' ? (
            <section className="ideas-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow dark-eye">TON ESPACE PERSONNEL</div>
                  <h2>
                    Notifications<span className="yellow-dot">.</span>
                  </h2>
                  <p>
                    Retrouve ici les changements de statut de tes propositions.
                  </p>
                </div>

                <button
                  className="btn btn-dark create-button"
                  onClick={() => void loadNotifications()}
                >
                  <Bell size={17} /> Actualiser
                </button>
              </div>

              {notificationsLoading && (
                <div className="loading">
                  <LoaderCircle className="spin" />
                  Chargement des notifications…
                </div>
              )}

              {!notificationsLoading && notifications.length === 0 && (
                <div className="empty-state">
                  <span>
                    <Bell size={24} />
                  </span>
                  <h3>Aucune notification pour le moment</h3>
                  <p>
                    Quand le statut d’une de tes idées changera, tu trouveras
                    un message ici.
                  </p>
                </div>
              )}

              <div className="notification-list">
                {notifications.map(notification => (
                  <article
                    className={`notification-card ${
                      notification.read_at ? 'is-read' : 'is-unread'
                    }`}
                    key={notification.id}
                  >
                    <div className="notification-icon">
                      <Bell size={19} />
                    </div>

                    <div className="notification-content">
                      <p>{notification.message}</p>
                      <small>
                        {new Intl.DateTimeFormat('fr-FR', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        }).format(new Date(notification.created_at))}
                      </small>
                    </div>

                    {!notification.read_at && (
                      <button
                        className="icon-button"
                        title="Marquer comme lue"
                        aria-label="Marquer comme lue"
                        onClick={() =>
                          void markNotificationRead(notification)
                        }
                      >
                        <Check size={17} />
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ) : page === 'admin' && profile?.role === 'admin' ? (
            <section className="ideas-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow dark-eye">ESPACE ÉQUIPE</div>
                  <h2>
                    Modération<span className="yellow-dot">.</span>
                  </h2>
                  <p>
                    Lis les propositions, leurs descriptions et leurs images
                    avant de prendre une décision.
                  </p>
                </div>
              </div>

              <div className="admin-table">
                {realIdeas.map(idea => (
                  <div className="admin-row" key={idea.id}>
                    <div className="admin-row-main">
                      {idea.image_url ? (
                        <img
                          className="admin-thumb"
                          src={idea.image_url}
                          alt={`Illustration de ${idea.title}`}
                        />
                      ) : (
                        <div className="admin-thumb admin-thumb-empty">
                          <Lightbulb size={24} />
                        </div>
                      )}

                      <div className="admin-row-copy">
                        <b>{idea.title}</b>
                        <small>
                          Catégorie : {idea.category} · {idea.votes_count} votes
                        </small>
                        <p className="admin-description">{idea.description}</p>
                        <small>Statut actuel : {idea.status}</small>
                      </div>
                    </div>

                    <select
                      value={idea.status}
                      onChange={event =>
                        void updateStatus(
                          idea.id,
                          event.target.value as IdeaStatus
                        )
                      }
                      aria-label={`Statut de ${idea.title}`}
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      className="icon-button danger"
                      onClick={() => void deleteIdea(idea.id)}
                      aria-label={`Supprimer ${idea.title}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>

              {!loading && realIdeas.length === 0 && (
                <div className="empty-state">
                  <span>
                    <Search size={24} />
                  </span>
                  <h3>Aucune proposition enregistrée</h3>
                  <p>
                    Les propositions des étudiants apparaîtront ici après leur
                    enregistrement dans Supabase.
                  </p>
                </div>
              )}
            </section>
          ) : (
            <section className="ideas-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow dark-eye">LE MUR DES PROPOSITIONS</div>
                  <h2>
                    {page === 'mine' ? 'Tes idées' : 'Les idées de la communauté'}
                    <span className="yellow-dot">.</span>
                  </h2>
                  <p>
                    {page === 'mine'
                      ? 'Retrouve ici tes propositions et leur avancement.'
                      : 'Découvre, soutiens et fais grandir les idées des étudiants.'}
                  </p>
                </div>

                <button
                  className="btn btn-dark create-button"
                  onClick={() =>
                    session ? setFormOpen(true) : openAuth('login')
                  }
                >
                  <Plus size={17} /> Nouvelle idée
                </button>
              </div>

              <div className="toolbar">
                <label className="search-box">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Rechercher une idée..."
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      aria-label="Effacer"
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>

                <div className="filter-control">
                  <SlidersHorizontal size={17} />
                  <select
                    value={category}
                    onChange={event => setCategory(event.target.value)}
                  >
                    <option>Toutes</option>
                    {categories.map(item => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="sort-control">
                  <select
                    value={sort}
                    onChange={event => setSort(event.target.value)}
                  >
                    <option value="popular">Les plus populaires</option>
                    <option value="recent">Les plus récentes</option>
                  </select>
                </div>
              </div>

              <div className="category-chips">
                {['Toutes', ...categories].map(item => (
                  <button
                    key={item}
                    className={`chip ${category === item ? 'selected' : ''}`}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="loading">
                  <LoaderCircle className="spin" />
                  Chargement des idées…
                </div>
              )}

              <div className="ideas-grid">
                {visibleIdeas.map((idea, index) => (
                  <article className="idea-card" key={idea.id}>
                    <div className={`card-visual visual-${index % 4}`}>
                      {idea.image_url ? (
                        <img
                          src={idea.image_url}
                          alt={`Illustration de ${idea.title}`}
                        />
                      ) : (
                        <div className="visual-decoration">
                          <span className="visual-shape" />
                          <span className="visual-symbol">
                            {['✳', '↗', '◈', '✦'][index % 4]}
                          </span>
                          <span className="visual-label">NWS / IDEAS</span>
                        </div>
                      )}

                      <span className="category-tag">{idea.category}</span>
                    </div>

                    <div className="idea-body">
                      <div className="card-meta">
                        <span
                          className={`status-pill status-${statusClass(
                            idea.status
                          )}`}
                        >
                          <span />
                          {idea.status}
                        </span>
                        <span>
                          {new Intl.DateTimeFormat('fr-FR', {
                            day: 'numeric',
                            month: 'short'
                          }).format(new Date(idea.created_at))}
                        </span>
                      </div>

                      <button
                        className="idea-title"
                        onClick={() => setSelected(idea)}
                      >
                        {idea.title}
                      </button>

                      <p className="idea-description">{idea.description}</p>

                      <div className="idea-footer">
                        <button
                          className={`vote-button ${
                            idea.has_voted ? 'voted' : ''
                          }`}
                          onClick={() => void vote(idea)}
                        >
                          <ThumbsUp size={16} />
                          <b>{idea.votes_count}</b>
                          <span>
                            {idea.has_voted ? 'Soutenu' : 'Soutenir'}
                          </span>
                        </button>

                        <button
                          className="comment-link"
                          onClick={() => setSelected(idea)}
                        >
                          <MessageCircle size={16} />
                          Détails <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!visibleIdeas.length && !loading && (
                <div className="empty-state">
                  <span>
                    <Search size={24} />
                  </span>
                  <h3>Aucune idée trouvée</h3>
                  <p>Essaie un autre mot-clé ou change les filtres.</p>
                  <button
                    className="btn btn-dark"
                    onClick={() => {
                      setSearch('')
                      setCategory('Toutes')
                    }}
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}

              <div className="ideas-bottom">
                <span>
                  Affichage de <b>{visibleIdeas.length}</b> idée
                  {visibleIdeas.length > 1 ? 's' : ''}
                </span>
                <span className="bottom-message">
                  Une petite idée peut faire une grande différence <span>✳</span>
                </span>
              </div>
            </section>
          )}

          <footer>
            <a
              className="footer-brand"
              href="#"
              onClick={event => event.preventDefault()}
            >
              NWS<span>.</span>IDEAS
            </a>
            <span>Imaginons ensemble l'école de demain.</span>
            <span>
              © {new Date().getFullYear()} Normandie Web School · Projet étudiant
            </span>
          </footer>
        </div>
      </main>

      {/* Fenêtre de connexion, inscription et récupération du mot de passe */}
      {authOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setEmail('')
              setPassword('')
              setAuthOpen(false)
            }
          }}
        >
          <section className="modal auth-modal">
            <button
              className="modal-close"
              onClick={() => {
                setEmail('')
                setPassword('')
                setAuthOpen(false)
              }}
              aria-label="Fermer"
            >
              <X />
            </button>

            <div className="modal-mark">
              <img
                src="/logo-nws.jpeg"
                alt="Logo Normandie Web School"
              />
            </div>

            <div className="eyebrow dark-eye">BIENVENUE À LA NWS</div>

            <h2>
              {authMode === 'admin-login'
                ? 'Connexion administrateur'
                : authMode === 'admin-signup'
                  ? 'Créer un compte administrateur'
                  : authMode === 'login'
                    ? 'Content de te revoir.'
                    : authMode === 'signup'
                      ? 'Rejoins la communauté.'
                      : 'Mot de passe oublié ?'}
            </h2>

            <p>
              {authMode === 'reset'
                ? 'Saisis ton adresse e-mail NWS. Nous t’enverrons un lien pour choisir un nouveau mot de passe.'
                : authMode === 'admin-login'
                  ? 'Connecte-toi avec une adresse autorisée pour gérer les propositions de la NWS.'
                  : authMode === 'admin-signup'
                    ? 'L’inscription est réservée aux adresses ajoutées à la liste d’autorisation de l’école dans Supabase.'
                    : 'Connecte-toi avec ton adresse e-mail étudiante pour participer.'}
            </p>

            <form
              onSubmit={authenticate}
              className="form-stack"
              autoComplete="off"
            >
              <label>
                Adresse e-mail NWS
                <input
                  type="email"
                  name="nws-login-email"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  placeholder={`prenom@${allowedDomain}`}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </label>

              {authMode !== 'reset' && (
                <label>
                  Mot de passe
                  <input
                    type="password"
                    name="nws-login-password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="8 caractères minimum"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                  />
                </label>
              )}

              {(authMode === 'login' || authMode === 'admin-login') && (
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => {
                    setResetReturnMode(authMode)
                    setAuthMode('reset')
                    setEmail('')
                    setPassword('')
                  }}
                >
                  Mot de passe oublié ?
                </button>
              )}

              <button
                type="submit"
                className="btn btn-yellow full-width"
                disabled={authBusy || !isConfigured}
              >
                {authBusy && <LoaderCircle className="spin" />}
                {authMode === 'login'
                  ? 'Se connecter'
                  : authMode === 'signup'
                    ? 'Créer mon compte'
                    : authMode === 'admin-login'
                      ? 'Accéder à l’administration'
                      : authMode === 'admin-signup'
                        ? 'Créer mon compte administrateur'
                        : 'Envoyer le lien de réinitialisation'}
                <ArrowUpRight size={16} />
              </button>

              {!isConfigured && (
                <small className="form-hint">
                  Configure Supabase pour activer l'authentification.
                </small>
              )}
            </form>

            <div className="modal-switch">
              {authMode === 'reset'
                ? 'Tu te souviens de ton mot de passe ?'
                : authMode === 'login'
                  ? 'Pas encore de compte ?'
                  : authMode === 'signup'
                    ? 'Déjà inscrit ?'
                    : authMode === 'admin-login'
                      ? 'Adresse autorisée mais pas encore de compte ?'
                      : 'Déjà un compte administrateur ?'}

              <button
                onClick={() => {
                  setEmail('')
                  setPassword('')

                  if (authMode === 'reset') {
                    setAuthMode(resetReturnMode)
                  } else if (authMode === 'login') {
                    setAuthMode('signup')
                  } else if (authMode === 'signup') {
                    setAuthMode('login')
                  } else if (authMode === 'admin-login') {
                    setAuthMode('admin-signup')
                  } else {
                    setAuthMode('admin-login')
                  }
                }}
              >
                {authMode === 'reset'
                  ? 'Se connecter'
                  : authMode === 'login'
                    ? 'Créer un compte'
                    : authMode === 'signup'
                      ? 'Se connecter'
                      : authMode === 'admin-login'
                        ? 'Créer un compte administrateur'
                        : 'Se connecter'}
              </button>

              {(authMode === 'admin-login' ||
                authMode === 'admin-signup') && (
                <div className="auth-back">
                  <button
                    onClick={() => {
                      setEmail('')
                      setPassword('')
                      setAuthMode('login')
                    }}
                  >
                    ← Retour à la connexion étudiante
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Formulaire de publication d'une idée */}
      {formOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setFormOpen(false)
          }}
        >
          <section className="modal modal-wide">
            <button
              className="modal-close"
              onClick={() => setFormOpen(false)}
            >
              <X />
            </button>

            <div className="eyebrow dark-eye">À TOI DE JOUER</div>
            <h2>
              Propose ton idée<span className="yellow-dot">.</span>
            </h2>
            <p>
              Chaque suggestion compte. Explique-nous ce qui pourrait améliorer
              la vie à la NWS.
            </p>

            <form onSubmit={submitIdea} className="form-stack">
              <label>
                Titre de l'idée
                <input
                  required
                  maxLength={100}
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder="Ex. : Un espace détente plus convivial"
                />
              </label>

              <label>
                Description détaillée
                <textarea
                  required
                  minLength={15}
                  maxLength={3000}
                  rows={5}
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  placeholder="Explique ton idée, le besoin auquel elle répond et comment la mettre en place…"
                />
              </label>

              <label>
                Catégorie
                <select
                  value={newCategory}
                  onChange={event =>
                    setNewCategory(event.target.value as Category)
                  }
                >
                  {categories.map(item => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="upload-box">
                <ImagePlus size={20} />
                <span>
                  <b>
                    {imageFile?.name || 'Ajouter une image (facultatif)'}
                  </b>
                  <small>JPG, PNG ou WebP · 5 Mo maximum</small>
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={event => {
                    const file = event.target.files?.[0] || null

                    if (file && file.size > 5 * 1024 * 1024) {
                      notify('Image limitée à 5 Mo.')
                      event.target.value = ''
                      return
                    }

                    setImageFile(file)
                  }}
                />
              </label>

              <button
                className="btn btn-yellow full-width"
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle className="spin" />
                ) : (
                  <Plus size={18} />
                )}
                Publier mon idée <ArrowUpRight size={16} />
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Détails d'une idée et commentaires */}
      {selected && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setSelected(null)
          }}
        >
          <section className="modal modal-wide">
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>

            <div className="card-meta detail-meta">
              <span
                className={`status-pill status-${statusClass(selected.status)}`}
              >
                <span />
                {selected.status}
              </span>
              <span className="category-tag inline-tag">
                {selected.category}
              </span>
            </div>

            <h2>
              {selected.title}
              <span className="yellow-dot">.</span>
            </h2>

            <p className="detail-description">{selected.description}</p>

            {selected.image_url && (
              <img
                className="detail-image"
                src={selected.image_url}
                alt={`Illustration de ${selected.title}`}
              />
            )}

            <div className="detail-actions">
              <button
                className={`vote-button ${selected.has_voted ? 'voted' : ''}`}
                onClick={async () => {
                  const current = selected
                  await vote(current)
                  await loadIdeas()

                  // Le nombre affiché sera actualisé par le prochain chargement.
                  const { data } = await supabase
                    .from('ideas')
                    .select('id,title,description,category,status,image_url,created_at,author_id,idea_votes(user_id)')
                    .eq('id', current.id)
                    .single()

                  if (data) {
                    const ideaVotes = Array.isArray(data.idea_votes)
                      ? data.idea_votes
                      : []

                    setSelected({
                      ...data,
                      votes_count: ideaVotes.length,
                      has_voted: ideaVotes.some(
                        (vote: { user_id: string }) =>
                          vote.user_id === session?.user.id
                      )
                    } as Idea)
                  }
                }}
              >
                <ThumbsUp size={17} />
                <b>{selected.votes_count}</b>
                {selected.has_voted
                  ? 'Retirer mon soutien'
                  : 'Soutenir cette idée'}
              </button>

              {page === 'admin' &&
                profile?.role === 'admin' &&
                !selected.id.startsWith('demo-') && (
                  <>
                    <select
                      value={selected.status}
                      onChange={async event => {
                        const nextStatus = event.target.value as IdeaStatus
                        await updateStatus(selected.id, nextStatus)

                        setSelected(current =>
                          current
                            ? { ...current, status: nextStatus }
                            : null
                        )
                      }}
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      className="btn btn-danger"
                      onClick={() => void deleteIdea(selected.id)}
                    >
                      Supprimer
                    </button>
                  </>
                )}
            </div>

            <section className="comments-section">
              <div className="comments-heading">
                <h3>
                  <MessageCircle size={18} /> Commentaires
                </h3>
                <span>{ideaComments.length}</span>
              </div>

              {selected.id.startsWith('demo-') ? (
                <p className="comments-help">
                  Les commentaires sont disponibles sur les idées enregistrées
                  dans Supabase.
                </p>
              ) : commentsLoading ? (
                <div className="loading">
                  <LoaderCircle className="spin" />
                  Chargement des commentaires…
                </div>
              ) : ideaComments.length === 0 ? (
                <p className="comments-help">
                  Pas encore de commentaire. Lance la conversation !
                </p>
              ) : (
                <div className="comments-list">
                  {ideaComments.map(comment => (
                    <article className="comment-item" key={comment.id}>
                      <div className="comment-avatar">
                        {comment.author_id === session?.user.id ? 'Moi' : 'NWS'}
                      </div>

                      <div className="comment-content">
                        <div className="comment-meta">
                          <b>
                            {comment.author_id === session?.user.id
                              ? 'Vous'
                              : 'Membre NWS'}
                          </b>
                          <time>
                            {new Intl.DateTimeFormat('fr-FR', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            }).format(new Date(comment.created_at))}
                          </time>
                        </div>
                        <p>{comment.body}</p>
                      </div>

                      {session &&
                        (comment.author_id === session.user.id ||
                          profile?.role === 'admin') && (
                          <button
                            className="comment-delete"
                            title="Supprimer le commentaire"
                            aria-label="Supprimer le commentaire"
                            onClick={() => void deleteComment(comment)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                    </article>
                  ))}
                </div>
              )}

              {session ? (
                selected.id.startsWith('demo-') ? null : (
                  <form className="comment-form" onSubmit={submitComment}>
                    <label htmlFor="comment-body">
                      Ajouter un commentaire
                    </label>
                    <textarea
                      id="comment-body"
                      value={commentText}
                      onChange={event => setCommentText(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder="Partage ton avis, pose une question…"
                      required
                    />
                    <div className="comment-form-footer">
                      <small>{commentText.length}/1000 caractères</small>
                      <button
                        className="btn btn-dark"
                        type="submit"
                        disabled={commentBusy || !commentText.trim()}
                      >
                        {commentBusy ? (
                          <LoaderCircle className="spin" />
                        ) : (
                          <MessageCircle size={16} />
                        )}
                        Publier
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <p className="comments-help">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => openAuth('login')}
                  >
                    Connecte-toi
                  </button>{' '}
                  pour lire et publier des commentaires.
                </p>
              )}
            </section>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  )
}