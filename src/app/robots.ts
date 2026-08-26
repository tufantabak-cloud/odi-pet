import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/owner/',
        '/admin/',
        '/api/',
        '/clinic/',
        '/groomer/',
        '/hotel/',
        '/sitter/',
        '/trainer/',
      ],
    },
    sitemap: 'https://odi.pet/sitemap.xml',
  }
}
