import CogainLogo from '@/assets/cogain-logo.png'; // hoặc đường dẫn đến logo sprite của bạn
export function PoweredByLogo() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-xs">Powered by</span>
      <div className="flex items-center">
        <img src={CogainLogo} alt="Cogain Logo" className="h-6" />
      </div>
    </div>
  );
}
