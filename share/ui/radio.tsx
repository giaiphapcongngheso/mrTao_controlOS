import * as React from 'react';
import {
  Root as RadioGroupRoot,
  Item as RadioGroupItemPrimitive,
  Indicator as RadioGroupIndicator,
} from '@radix-ui/react-radio-group';
import { cn } from '../lib/utils';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupRoot>,
  React.ComponentPropsWithoutRef<typeof RadioGroupRoot>
>(({ className, ...props }, ref) => (
  <RadioGroupRoot ref={ref} className={cn('grid gap-2', className)} {...props} />
));
RadioGroup.displayName = 'RadioGroup';

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupItemPrimitive>,
  React.ComponentPropsWithoutRef<typeof RadioGroupItemPrimitive>
>(({ className, ...props }, ref) => (
  <RadioGroupItemPrimitive
    ref={ref}
    className={cn(
      'aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      className,
    )}
    {...props}
  >
    <RadioGroupIndicator className="flex items-center justify-center">
      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
    </RadioGroupIndicator>
  </RadioGroupItemPrimitive>
));
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
