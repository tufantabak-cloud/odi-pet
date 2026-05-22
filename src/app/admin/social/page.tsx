import React from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Image from 'next/image'

export const metadata = {
  title: 'Sosyal İçerik Moderasyonu — ODI Admin',
}

export default async function AdminSocialPage() {
  const supabase = await createServerSupabaseClient()
  
  // Fetch posts with their owners (using profiles instead of users as per standard supabase setup)
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select(`
      id,
      caption,
      created_at,
      profiles:owner_id (
        first_name,
        last_name,
        email,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            📱 Sosyal İçerik Moderasyonu
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Topluluk tarafından paylaşılan Odi.Pet sosyal gönderilerinin incelendiği ve modere edildiği alan.
          </p>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
          <p className="font-bold">Veriler çekilirken bir hata oluştu:</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      ) : !posts || posts.length === 0 ? (
        <div className="p-12 text-center border border-border-main rounded-2xl bg-surface">
          <span className="text-[40px] mb-4 block">📭</span>
          <h2 className="text-lg font-bold text-text-primary">Henüz Gönderi Yok</h2>
          <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
            Sistemde kayıtlı sosyal medya gönderisi bulunamadı.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post: any) => {
            const author = post.profiles || {}
            const authorName = author.first_name ? `${author.first_name} ${author.last_name || ''}` : (author.email || 'Bilinmeyen Kullanıcı')
            
            return (
              <div key={post.id} className="p-5 border border-border-main rounded-2xl bg-surface flex flex-col justify-between hover:border-primary/30 transition-colors shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-primary text-xs font-bold overflow-hidden relative">
                        {author.avatar_url ? (
                          <Image src={author.avatar_url} alt={authorName} fill className="object-cover" />
                        ) : (
                          authorName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-text-primary leading-tight">{authorName}</p>
                        <p className="text-[10px] text-text-secondary leading-tight">{new Date(post.created_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Yayında</span>
                  </div>
                  
                  <div className="bg-bg-main p-3 rounded-xl border border-border-main mb-4">
                    <p className="text-[13px] text-text-primary whitespace-pre-wrap">{post.caption}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border-main">
                  <button className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-[12px] font-bold hover:bg-red-100 transition-colors">
                    Kaldır
                  </button>
                  <button className="flex-1 py-2 bg-bg-main text-text-primary rounded-xl text-[12px] font-bold hover:bg-gray-100 transition-colors">
                    İncele
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
