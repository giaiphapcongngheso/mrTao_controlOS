import { useNavigate } from '@tanstack/react-router';
import KpiView from './KpiView';
import { useAppShellState, TAB_ROUTE_MAP } from '../app-shell-state';

export default function KpiRoute() {
  const navigate = useNavigate();
  const { staffRanks } = useAppShellState();

  return (
    <KpiView
      staffRanks={staffRanks}
      onSetTab={(tab) => {
        void navigate({ to: TAB_ROUTE_MAP[tab] });
      }}
    />
  );
}
