import StaffPermissionsView from './StaffPermissionsView';
import { useAppStore } from '../../stores/app-store';

export default function StaffRoute() {
  const currentUser = useAppStore((state) => state.currentUser);

  return (
    <StaffPermissionsView
      currentUser={
        currentUser
          ? {
              fullName: currentUser.fullName,
              role: currentUser.role,
              user: currentUser.username,
              roleCode: currentUser.roleCode,
            }
          : null
      }
    />
  );
}
