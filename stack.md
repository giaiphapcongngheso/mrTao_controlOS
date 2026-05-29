# 🏗️ Technology Stack

> **Cập nhật lần cuối**: 2026-05-28
> **Phạm vi**: Frontend Application

---

## Backend Architecture — Serverless (Firebase Direct)

> ⚠️ **Không có backend riêng biệt.** App kết nối **trực tiếp** tới Firebase từ phía frontend.
> Toàn bộ logic giao tiếp dữ liệu được viết bằng TypeScript trong thư mục `share/services/`.

### Mô hình hoạt động

```
┌──────────────┐         ┌───────────────────┐         ┌──────────────┐
│   React UI   │ ──────► │  TypeScript       │ ──────► │   Firebase   │
│  Components  │         │  Service Layer    │         │  (Firestore, │
│              │ ◄────── │  (share/services) │ ◄────── │   Auth,      │
│              │         │                   │         │   Storage)   │
└──────────────┘         └───────────────────┘         └──────────────┘
     View                   Business Logic                 Database
```

### Base Service Pattern

Toàn bộ services được xây dựng trên pattern **Factory + Inheritance**:

- **`share/services/base-service.ts`** — Generic CRUD factory (`createBaseService<TEntity, TRequest>`)
- Các service cụ thể chỉ cần **kế thừa** và truyền config (`controller`, `api`, `baseFilters`)
- Không cần viết lại logic CRUD cho mỗi entity

#### Các operations có sẵn từ Base Service

| Method | Mô tả |
|--------|--------|
| `getPaged(params)` | Phân trang với filter tự động merge |
| `getAll(params)` | Lấy toàn bộ records (có base filter) |
| `getDropdown(params)` | Lấy dữ liệu cho dropdown/select |
| `getById({ id, includes })` | Lấy chi tiết theo ID |
| `create(data)` | Tạo mới record |
| `update(id, data)` | Cập nhật record |
| `delete(id)` | Xóa 1 record |
| `deleteItems(ids)` | Xóa nhiều records |
| `checkExistGenerationCode()` | Kiểm tra rule sinh mã tự động |
| `exportTemplate()` | Export template Excel |
| `import(file)` | Import dữ liệu từ Excel |
| `exportData(params)` | Export dữ liệu ra file |

#### Cách tạo service mới (ví dụ)

```typescript
// share/services/product-service.ts
import { createBaseService } from './base-service';
import type { IProduct, IProductRequest } from '../types';
import { api } from '../api';

export const productService = createBaseService<IProduct, IProductRequest>({
  api: () => api,
  controller: 'products',
  // baseFilters mặc định: { status: Active }
  // Có thể override hoặc tắt: useDefaultFilters: false
});
```

### Tính năng nổi bật

- **Auto Base Filters**: Mặc định filter `status == Active` cho `getPaged`, `getAll`, `getDropdown`
- **Filter Merge**: User filters tự động merge với base filters (user override nếu trùng key)
- **`ignoreStatusFilter`**: Bỏ qua filter status khi cần lấy cả inactive records
- **Lazy API Resolution**: Hỗ trợ `ApiGetter` dạng function để tránh circular dependency

---

## Frontend Frameworks

### SPA Framework

| Package | Version |
|---------|--------|
| `react` | 19.1.1 |
| `react-dom` | 19.1.1 |

### Routing

| Package | Version | Mô tả |
|---------|---------|--------|
| `@tanstack/react-router` | 1.132.47 | File-based routing with code splitting |
| `@tanstack/router-cli` | — | Route generation CLI (`tsr generate` / `tsr watch`) |
| `@tanstack/zod-adapter` | — | Schema-validated search params |

### Build Tooling

| Package | Version | Mô tả |
|---------|---------|--------|
| `vite` | 7.1.7 | Dev server + bundler |
| `@vitejs/plugin-react-swc` | — | Fast compilation via SWC |

---

## Styling

| Package | Version | Mô tả |
|---------|---------|--------|
| `tailwindcss` | 4.1.14 | Utility-first CSS framework |
| `@tailwindcss/vite` | — | Vite integration plugin |
| `tailwind-merge` | 3.3.1 | Class string conflict resolution |
| `tw-animate-css` | — | Animation utilities |
| `tailwindcss-animate` | — | Animation utilities |

---

## UI Components

| Package | Version | Mô tả |
|---------|---------|--------|
| `@radix-ui/*` | — | Headless primitives (accordion, dialog, popover, select, tabs, etc.) |
| shadcn/ui | — | Component conventions (`components.json`) |
| `cmdk` | 1.1.1 | Command palette |
| `lucide-react` | 0.545.0 | Icon library |
| `sonner` | 2.0.7 | Toast notifications |
| `next-themes` | 0.4.6 | Dark / Light theme switching |

---

## Data Fetching & State Management

| Package | Version | Mô tả |
|---------|---------|--------|
| `@tanstack/react-query` | 5.90.2 | Server state, caching, background refetch |
| `zustand` | 5.0.8 | Client-side global state |
| `axios` | 1.12.2 | HTTP client |
| `axios-retry` | 4.5.0 | Automatic request retry |

---

## Forms & Validation

| Package | Version | Mô tả |
|---------|---------|--------|
| `react-hook-form` | 7.65.0 | Performant form management |
| `zod` | 4.x | Schema validation |
| `@hookform/resolvers` | 5.2.2 | Bridge React Hook Form ↔ Zod |

---

## Tables & Virtualization

| Package | Version | Mô tả |
|---------|---------|--------|
| `@tanstack/react-table` | 8.21.3 | Headless table logic |
| `@tanstack/react-virtual` | 3.13.12 | Windowed / virtualized list rendering |

---

## Real-Time Communication

| Package | Version | Mô tả |
|---------|---------|--------|
| `@microsoft/signalr` | 9.0.6 | SignalR WebSocket client |
| `@microsoft/signalr-protocol-msgpack` | 9.0.6 | MessagePack binary protocol |

---

## Internationalization (i18n)

| Package | Version | Mô tả |
|---------|---------|--------|
| `i18next` | 25.6.0 | Core i18n framework |
| `react-i18next` | 16.0.1 | React bindings for i18next |

---

## Date Handling

| Package | Version | Mô tả |
|---------|---------|--------|
| `date-fns` | 4.1.0 | Date utility functions |
| `react-day-picker` | 9.11.1 | Date picker component |

---

## Charts & Visualization

| Package | Version | Mô tả |
|---------|---------|--------|
| `recharts` | 2.15.4 | Composable charting library |

---

## Drag & Drop

| Package | Version | Mô tả |
|---------|---------|--------|
| `@dnd-kit/core` | 6.x | Core drag & drop engine |
| `@dnd-kit/sortable` | 10.x | Sortable preset |
| `@dnd-kit/utilities` | — | Utility helpers |

---

## Document / Export

| Package | Version | Mô tả |
|---------|---------|--------|
| `xlsx` | 0.18.5 | Excel export |
| `jspdf` | 3.0.3 | PDF generation |
| `qrcode` | 1.5.4 | QR code generation |
| `react-qr-code` | 2.0.18 | React QR code component |
| `qrcode.react` | 4.2.0 | React QR code component (alternative) |

---

## BI / Reporting

| Package | Version | Mô tả |
|---------|---------|--------|
| `powerbi-client` | 2.23.9 | Power BI embedded reports |

---

## Authentication — Custom (Firebase Auth)

> ⚠️ **Không sử dụng OAuth / OIDC.** Auth được tự viết hoàn toàn, kết nối trực tiếp Firebase Authentication.

- Tự xây dựng flow: **Login / Register / Reset Password / Session Management**
- Sử dụng **Firebase Authentication SDK** để xác thực người dùng
- Auth store & helpers nằm tại `shared/auth/`

---

## Utilities

| Package | Version | Mô tả |
|---------|---------|--------|
| `lodash` | 4.17.21 | Utility functions |
| `uuid` | 13.0.0 | UUID generation |
| `jsonc-parser` | 3.3.1 | JSONC file parsing |

---

## Linting & Formatting

| Package | Version | Mô tả |
|---------|---------|--------|
| `eslint` | 9.36.0 | Linter — config in `eslint.config.js` |
| `typescript-eslint` | 8.45.0 | TypeScript ESLint parser & rules |
| `eslint-plugin-react-hooks` | — | React Hooks lint rules |
| `eslint-plugin-react-refresh` | — | React Refresh lint rules |
| `prettier` | 3.6.2 | Code formatter (via lint-staged on commit) |

---

## Testing

| Package | Version | Mô tả |
|---------|---------|--------|
| `vitest` | 4.x | Test runner |
| `@testing-library/react` | 16.x | React testing utilities |
| `@testing-library/user-event` | — | User interaction simulation |
| `@vitest/ui` | — | Visual test UI |
| `jsdom` | — | DOM simulation |

---

## Git Hooks

| Package | Version | Mô tả |
|---------|---------|--------|
| `husky` | 9.1.7 | Git hooks manager |
| `lint-staged` | 16.2.3 | Pre-commit formatting |

---

## 📊 Stack Summary

```
┌─────────────────────────────────────────────────────────────┐
│  React 19  ─►  TanStack Router  ─►  Vite 7                 │
│      │              │                   │                   │
│      ▼              ▼                   ▼                   │
│  Radix UI      TanStack Query      Tailwind CSS 4           │
│  shadcn/ui     Zustand             tw-animate                │
│  cmdk          Axios               tailwind-merge            │
│      │              │                                        │
│      ▼              ▼                                        │
│  React Hook Form + Zod  ◄──  @hookform/resolvers            │
│      │                                                       │
│      ▼                                                       │
│  SignalR (Real-time)  │  i18next (i18n)  │  recharts (Viz)  │
│  Power BI (Reports)   │  dnd-kit (DnD)   │  jspdf / xlsx    │
│      │                                                       │
│      ▼                                                       │
│  oidc-client-ts  ◄──  Auth (PKCE)                           │
│                                                              │
│  ── Dev Tools ──────────────────────────────────────────     │
│  ESLint 9 + Prettier │ Vitest 4 │ Husky + lint-staged       │
└─────────────────────────────────────────────────────────────┘
```
