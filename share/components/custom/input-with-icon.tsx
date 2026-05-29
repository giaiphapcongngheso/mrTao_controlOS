import { Input, type InputProps } from '../../ui/input';

type InputWithIconProps = InputProps & {
  icon: React.ReactNode;
  position?: 'left' | 'right';
};

export function InputWithIcon({
  icon,
  position = 'left',
  className,
  ...props
}: InputWithIconProps) {
  const iconClass = position === 'left' ? 'left-3' : 'right-3';

  const padding = position === 'left' ? 'pl-20' : 'pr-20';

  return (
    <div className="relative w-full">
      <span className={`absolute ${iconClass} top-1/2 -translate-y-1/2 text-gray-400`}>{icon}</span>
      <div className={padding}>
        <Input {...props} className={`${className || ''}`} />
      </div>
    </div>
  );
}
