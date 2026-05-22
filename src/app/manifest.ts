import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Odi.Pet',
    short_name: 'Odi.Pet',
    description: 'Evcil hayvanlarınızın tüm sağlık, bakım ve aktivite süreçlerini şifresiz ve güvenli şekilde takip edin.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon.jpg', // Next.js varsayılan ikon, varsa .png maskable versiyonlarla değiştirilmeli
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/icon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}
