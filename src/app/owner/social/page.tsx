"use no memo"
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SocialPage() {
  const supabase = await createServerSupabaseClient()
  const user = await getSessionUser()

  const { data: posts } = await supabase
    .from('social_posts')
    .select('*, profiles(first_name, last_name), pets(name, species)')
    .order('created_at', { ascending: false })
    .limit(20)

  // Mock posts eğer DB boşsa
  const mockPosts = [
    {
      id: 'mock-1',
      caption: 'Bugün Mia ile bahçede harika vakit geçirdik 🌿',
      image_url: null,
      like_count: 24,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      profiles: { first_name: 'Ayşe', last_name: 'K.' },
      pets: { name: 'Mia', species: 'Kedi' },
      owner_id: 'mock',
    },
    {
      id: 'mock-2',
      caption: 'Max ilk aşısını yaptırdı, çok cesurdu! 💉🐶',
      image_url: null,
      like_count: 42,
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      profiles: { first_name: 'Emre', last_name: 'Y.' },
      pets: { name: 'Max', species: 'Köpek' },
      owner_id: 'mock',
    },
    {
      id: 'mock-3',
      caption: 'Boncuk bugün 1 yaşına girdi 🎂🎉 Doğum günün kutlu olsun tatlım!',
      image_url: null,
      like_count: 89,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      profiles: { first_name: 'Selin', last_name: 'D.' },
      pets: { name: 'Boncuk', species: 'Kedi' },
      owner_id: 'mock',
    },
    {
      id: 'mock-4',
      caption: 'Luna bugün tüy tarama seansını çok sevdi! 💕',
      image_url: null,
      like_count: 31,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      profiles: { first_name: 'Can', last_name: 'A.' },
      pets: { name: 'Luna', species: 'Köpek' },
      owner_id: 'mock',
    },
  ]

  const displayPosts = (posts && posts.length > 0) ? posts : mockPosts

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 1) return 'Az önce'
    if (mins < 60) return `${mins} dk önce`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} saat önce`
    return `${Math.floor(hours / 24)} gün önce`
  }

  return (
    <div className="flex flex-col gap-8 pb-10 w-full mx-auto">
      <div className="flex items-center justify-between border-b border-border-main pb-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Pati Dünyası</h1>
          <p className="text-text-secondary mt-1 text-[15px] font-medium">Topluluktan taze anlar 🐾</p>
        </div>
        <Link href="/owner/social/compose" className="btn-primary px-4 py-2.5 text-[13px] gap-2 flex items-center shadow-lg shadow-primary/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Paylaş
        </Link>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-5">
        {displayPosts.map((post: any) => (
          <div key={post.id} className="card-base overflow-hidden group">
            {/* Post image placeholder */}
            {post.image_url ? (
              <img src={post.image_url} alt="post" className="w-full h-56 object-cover"/>
            ) : (
              <div className="w-full h-36 bg-gradient-to-br from-primary-soft via-white to-primary/5 flex items-center justify-center text-[64px] select-none">
                {post.pets?.species === 'Kedi' ? '🐱' : '🐶'}
              </div>
            )}

            {/* Content */}
            <div className="p-5">
              {/* Author & pet */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-[14px] shrink-0">
                  {post.profiles?.first_name?.charAt(0) ?? '?'}
                </div>
                <div className="flex flex-col">
                  <p className="text-[14px] font-bold text-text-primary leading-tight">
                    {post.profiles?.first_name} {post.profiles?.last_name} &mdash; <span className="text-primary">{post.pets?.name}</span>
                  </p>
                  <p className="text-[12px] text-text-secondary">{timeAgo(post.created_at)}</p>
                </div>
              </div>

              {/* Caption */}
              <p className="text-[15px] text-text-primary leading-relaxed">{post.caption}</p>

              {/* Actions */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-main">
                <button className="flex items-center gap-2 text-[13px] font-bold text-text-secondary hover:text-error transition-colors group">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:fill-error group-hover:stroke-error transition-all">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {post.like_count}
                </button>
                <button className="flex items-center gap-2 text-[13px] font-bold text-text-secondary hover:text-primary transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Yorum
                </button>
                <button className="flex items-center gap-2 text-[13px] font-bold text-text-secondary hover:text-primary transition-colors ml-auto">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  Paylaş
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
