# OPOS Phase 3C — Runtime Illustration Index

| Component | Route | Illustration ID | Component Props | Lazy Loading | Responsive View |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `NotificationsClient` | `/owner/notifications` | **`notification-reminder`** | `{"id":"notification-reminder","size":"md"}` | lazy (default) | fluid max-w-64 |
| `VetsPage` | `/owner/vets` | **`services-vet-finder`** | `{"id":"services-vet-finder","size":"md","className":"mx-auto mb-4"}` | lazy (default) | fluid mx-auto |
| `AIVetPage` | `/owner/ai-vet` | **`ai-vet-assistant`** | `{"id":"ai-vet-assistant"}` | lazy (default) | fluid max-w-64 |
| `EmptyState` | `Global Reusable UI Component` | **`dynamic (prop passed)`** | `{"illustrationId":"IllustrationID"}` | lazy (default) | fluid |
