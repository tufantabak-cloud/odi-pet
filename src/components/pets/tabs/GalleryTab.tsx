import React, { useState, useEffect, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function GalleryTab({ pet }: { pet: any }) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
          image_url: urlData.publicUrl
        });

      if (dbError) throw dbError;

      fetchPhotos();
    } catch (err) {
      setErrorMsg('Fotoğraf yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) return;
    setErrorMsg(null);
    try {
      await supabase.from('pet_gallery').delete().eq('id', id);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch(err) {
      setErrorMsg("Fotoğraf silinirken hata oluştu.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeInUp">
      {errorMsg && <div role="alert" className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl text-center border border-error/20">{errorMsg}</div>}
      <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-2xl flex items-center justify-center shadow-sm">
          <span className="text-2xl">📸</span>
        </div>
        <div>
          <h3 className="font-extrabold text-text-primary text-[17px] mb-1">{pet.name}'nin Galerisi</h3>
          <p className="text-[13px] text-text-secondary leading-relaxed">Güzel anılarınızı ve fotoğraflarını burada saklayın.</p>
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
          {uploading ? 'Yükleniyor...' : '+ Fotoğraf Yükle'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-text-secondary text-[13px] font-bold">Fotoğraflar yükleniyor...</div>
      ) : photos.length === 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {/* Placeholder for images */}
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-slate-100 rounded-xl border border-border-main flex items-center justify-center text-text-secondary opacity-50 overflow-hidden">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="aspect-square relative rounded-xl border border-border-main overflow-hidden group bg-slate-100">
              <Image 
                src={photo.image_url} 
                alt="Galeri fotoğrafı" 
                fill 
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 20vw"
              />
              <button 
                onClick={() => handleDelete(photo.id)}
                className="absolute top-1.5 right-1.5 p-1.5 bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error backdrop-blur-sm"
                title="Sil"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
