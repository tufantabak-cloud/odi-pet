"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Database } from '@/types';
import { z } from 'zod';

export const CategorySchema = z.enum(['general', 'health', 'document', 'memory', 'daily']);
export type CategoryType = z.infer<typeof CategorySchema>;

const categoryLabels: Record<CategoryType, string> = {
  general: 'Genel',
  health: 'Sağlık',
  document: 'Belge',
  memory: 'Anı',
  daily: 'Günlük'
};

type PetRow = Database['public']['Tables']['pets']['Row'];
type PetWithCover = PetRow & { cover_url?: string | null };

export default function GalleryTab({ pet }: { pet: PetWithCover }) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  
  // New Form States
  const [caption, setCaption] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [category, setCategory] = useState<CategoryType>('general');
  const [activeTab, setActiveTab] = useState<CategoryType | 'all'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserSupabaseClient();
  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pet_gallery')
      .select('*')
      .eq('pet_id', pet.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPhotos(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos();
  }, [pet.id]);



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Kullanıcı oturumu bulunamadı.");

      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${pet.id}/${Math.random().toString(36).substring(7)}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pet_gallery_bucket')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('pet_gallery_bucket')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('pet_gallery')
        .insert({
          pet_id: pet.id,
          user_id: userId,
          image_url: urlData.publicUrl,
          caption: caption.trim() || null,
          taken_at: takenAt || null,
          category: category
        });

      if (dbError) throw dbError;

      fetchPhotos();
      setSuccessMsg('+20 puan kazandın! 🎉');
      setCaption('');
      setTakenAt('');
      setCategory('general');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg('Fotoğraf yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    const photoToDelete = photos.find(p => p.id === id);

    // Profil veya kapak fotoğrafı koruma kontrolü
    if (photoToDelete?.image_url === pet.avatar_url) {
      setErrorMsg('Bu fotoğraf profil resmi olarak kullanılıyor. Önce profil resmini değiştirin.');
      return;
    }
    const coverUrl = pet.cover_url;
    if (coverUrl && photoToDelete?.image_url === coverUrl) {
      setErrorMsg('Bu fotoğraf kapak fotoğrafı olarak kullanılıyor. Önce kapak fotoğrafını değiştirin.');
      return;
    }

    // Lightbox açıksa ve silinen resimse kapat
    if (selectedPhoto && selectedPhoto.id === id) {
      setSelectedPhoto(null);
    }
    setErrorMsg(null);
    try {
      if (photoToDelete && photoToDelete.image_url) {
        // public URL'den bucket içindeki path'i çıkar
        // Örn: .../public/pet_gallery_bucket/petId/filename.jpg -> petId/filename.jpg
        const urlParts = photoToDelete.image_url.split('/pet_gallery_bucket/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          // DB'den silmeden önce/sonra storage'dan sil
          const { error: storageError } = await supabase.storage
            .from('pet_gallery_bucket')
            .remove([filePath]);
          
          if (storageError) console.error("Storage delete error:", storageError);
        }
      }

      await supabase.from('pet_gallery').delete().eq('id', id);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch(err) {
      setErrorMsg("Fotoğraf silinirken hata oluştu.");
    }
  }

  const filteredPhotos = activeTab === 'all' ? photos : photos.filter(p => p.category === activeTab);

  return (
    <div className="flex flex-col gap-5 animate-fadeInUp">
      {errorMsg && <div role="alert" className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl text-center border border-error/20">{errorMsg}</div>}
      {successMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm animate-bounce">
          {successMsg}
        </div>
      )}
      
      <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-2xl flex items-center justify-center shadow-sm">
          <span className="text-2xl">📸</span>
        </div>
        <div>
          <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{pet.name}'nin Galerisi</h3>
          <p className="text-[13px] text-text-secondary leading-relaxed">Güzel anılarınızı ve fotoğraflarını burada saklayın.</p>
        </div>

        <div className="w-full flex flex-col gap-3 text-left">
          <input 
            type="text" 
            placeholder="Fotoğraf için bir not (opsiyonel)" 
            maxLength={200}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full input-base text-sm"
          />
          <div className="flex gap-3">
            <input 
              type="date" 
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-1/2 input-base text-sm"
            />
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryType)}
              className="w-1/2 input-base text-sm bg-white"
            >
              {Object.entries(categoryLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50"
        >
          {uploading ? 'Yükleniyor...' : '+ Fotoğraf Seç ve Yükle'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <button 
          onClick={() => setActiveTab('all')}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'}`}
        >
          Tümü
        </button>
        {Object.entries(categoryLabels).map(([val, label]) => (
          <button 
            key={val}
            onClick={() => setActiveTab(val as CategoryType)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === val ? 'bg-violet-600 text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-violet-200 rounded-2xl bg-violet-50 text-center gap-3">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-3xl mb-1">
            🎁
          </div>
          <h4 className="text-[15px] font-black text-violet-700">İlk Fotoğrafı Yükle!</h4>
          <p className="text-[13px] text-violet-600/80 leading-tight">Patili dostunun en güzel anlarını burada biriktirmeye başla.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredPhotos.map(photo => {
            const displayDate = photo.taken_at || photo.created_at;
            const dateStr = displayDate ? new Date(displayDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            return (
              <div 
                key={photo.id} 
                className="group flex flex-col gap-1.5 cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="aspect-square relative rounded-xl border border-border-main overflow-hidden bg-slate-100">
                  <Image 
                    src={photo.image_url} 
                    alt="Galeri fotoğrafı" 
                    fill 
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  {/* Profil / Kapak rozetleri */}
                  {photo.image_url === pet.avatar_url && (
                    <span className="absolute top-2 left-2 text-[10px] bg-violet-500 text-white px-2 py-0.5 rounded-full font-bold shadow">
                      Profil
                    </span>
                  )}
                  {photo.image_url === pet.cover_url && (
                    <span className="absolute top-2 left-2 text-[10px] bg-pink-500 text-white px-2 py-0.5 rounded-full font-bold shadow">
                      Kapak
                    </span>
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                    {categoryLabels[photo.category as CategoryType] || 'Genel'}
                  </div>
                </div>
                {photo.caption && (
                  <p className="text-[12px] font-medium text-text-primary line-clamp-2 leading-tight px-1">{photo.caption}</p>
                )}
                <span className="text-[10px] font-bold text-text-secondary px-1">{dateStr}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center" onClick={() => setSelectedPhoto(null)}>
          <button 
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedPhoto(null); }}
          >
            ✕
          </button>
          
          <div className="relative w-full max-w-lg aspect-square" onClick={e => e.stopPropagation()}>
            <Image 
              src={selectedPhoto.image_url} 
              alt="Büyütülmüş fotoğraf" 
              fill 
              className="object-contain"
            />
            {selectedPhoto.caption && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md text-white p-3 rounded-xl text-sm font-medium">
                {selectedPhoto.caption}
              </div>
            )}
          </div>

          <div className="absolute bottom-10 left-0 right-0 flex justify-center pb-safe" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => {
                if(confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) {
                  handleDelete(selectedPhoto.id);
                }
              }}
              className="flex items-center gap-2 px-5 py-3 bg-red-500/90 hover:bg-red-500 text-white font-bold rounded-2xl shadow-lg backdrop-blur-sm transition-all"
            >
              🗑️ Fotoğrafı Sil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
