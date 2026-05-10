import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated';
  className?: string;
  children: React.ReactNode;
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  const variantClass =
    variant === 'elevated'
      ? 'bg-surface-secondary border border-brand-800/50 shadow-lg shadow-black/20'
      : 'bg-surface-primary border border-brand-800/30';

  return (
    <View className={`rounded-2xl p-4 ${variantClass} ${className}`} {...props}>
      {children}
    </View>
  );
}
