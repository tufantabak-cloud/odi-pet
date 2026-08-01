# OPOS Asset CDN & Caching Strategy

## Cache Governance
- **Immutable Assets:** SVGs served with `Cache-Control: public, max-age=31536000, immutable`.
- **ETag Validation:** Enabled for instant revalidation.
- **Content Hash Naming:** `empty-no-pets.a8f9c2.svg` for automatic cache busting.
