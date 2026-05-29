# Shared Auth & Permission

Module dùng chung cho xác thực (OIDC + /info + employee) và kiểm tra quyền (permissions).

**Import:** Dùng alias của workspace, ví dụ `@cogain/shared/auth` hoặc `@shared/auth` tùy cấu hình (paths trong tsconfig / package exports).

## Cách dùng trong từng app (workflow, helpdesk, bizdoc, interactive)

### 1. Khởi tạo Auth Store (một lần khi app boot)

Trong `main.tsx` hoặc điểm bootstrap (trước khi render), gọi:

```ts
import { setAuthStoreDeps, setupOidcEventListeners, createAuthService } from '@cogain/shared/auth';
import { userManager } from '@/services/auth/oidc-client';
import {
  clearTokenCache,
  invalidateTokenCache,
  scheduleSilentRefresh,
} from '@/lib/ensure-valid-token';
import { userService } from '@/services/user-service'; // identity: getInfo()
import { employeeService } from '@/services/employee-service'; // getById()
import { useGlobalStore } from '@/stores/global-store'; // setAuthInfoError (nếu có)

// 1) Inject deps cho store (userManager, clearTokenCache)
setAuthStoreDeps({ userManager, clearTokenCache });

// 2) Tạo auth service (fetchProfileAndSave chỉ gọi /info; organization + permissions từ /info)
const { fetchProfileAndSave } = createAuthService({
  userService,
  setAuthInfoError: (msg) => useGlobalStore.getState().setAuthInfoError(msg),
});

// 3) Đăng ký OIDC listeners (renew token, refetch profile)
setupOidcEventListeners({
  fetchProfileAndSave,
  invalidateTokenCache,
  scheduleSilentRefresh,
});
```

### 2. Dùng Auth Store trong app

Thay store auth local bằng re-export từ shared:

**`stores/auth-store.ts`**:

```ts
export { useAuthStore } from '@cogain/shared/auth';
```

State: `user`, `employeeInfo`, `permissions`, `organization`, `accessToken`, `refreshToken`, …

### 3. Auth Service (login, logout, fetchProfileAndSave)

- `fetchProfileAndSave`: dùng từ `createAuthService` (bước 1).
- `login`, `logout`, `handleCallback`, …: giữ trong app (gọi `userManager`, `useAuthStore.getState().clearAuth()` từ shared).

### 4. Permission

Import từ shared:

```ts
import {
  useHasPermission,
  hasPermission,
  useFormPermissions,
  requirePermission,
  PermissionAction,
} from '@cogain/shared/permission';
```

- **Trong component:** `const canCreate = useHasPermission('Identity.User', PermissionAction.Create);`
- **Trong route (beforeLoad):** `requirePermission('Identity.User', 'Create');`
- **Form:** `const { canSave, isReadOnly } = useFormPermissions('DocFlow.Employee', 'edit');`

Mỗi app giữ enum module riêng (ví dụ `PermissionModuleEn`) và truyền string vào các hàm trên.

## Yêu cầu API

- **userService.getInfo(config?):** `GET /identity/users/info` → `{ data: { id, fullName, email, employeeId, organizationId, organizationName, permissions?, roles?: [{ permissions }] }, statusCode }`. Organization và permissions lấy từ /info; không gọi thêm API HR employee.

## Types (shared)

- `IAuthUser`, `IAuthUserProfile`, `IAuthEmployee` từ `@cogain/shared/types` (auth.types).
- App có thể cast `useAuthStore.getState().user` sang type đầy đủ của app nếu cần.
