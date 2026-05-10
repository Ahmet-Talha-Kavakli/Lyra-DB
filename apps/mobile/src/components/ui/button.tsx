import { Pressable, Text, ActivityIndicator, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

const variantClasses: Record<ButtonVariant, { base: string; text: string }> = {
  primary: {
    base: 'bg-brand-500 active:bg-brand-600',
    text: 'text-white font-semibold',
  },
  secondary: {
    base: 'bg-surface-tertiary border border-brand-700 active:bg-brand-800',
    text: 'text-brand-200 font-medium',
  },
  ghost: {
    base: 'bg-transparent active:bg-surface-secondary',
    text: 'text-brand-300 font-medium',
  },
  danger: {
    base: 'bg-accent-alert/10 active:bg-accent-alert/20',
    text: 'text-accent-alert font-semibold',
  },
};

const sizeClasses: Record<ButtonSize, { base: string; text: string }> = {
  sm: { base: 'px-4 py-2 rounded-lg', text: 'text-sm' },
  md: { base: 'px-6 py-3.5 rounded-2xl', text: 'text-base' },
  lg: { base: 'px-8 py-4 rounded-2xl', text: 'text-lg' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  style,
}: ButtonProps) {
  const v = variantClasses[variant];
  const s = sizeClasses[size];
  const isDisabled = disabled || loading;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${s.base} ${v.base} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      style={style}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text className={`${s.text} ${v.text}`}>{title}</Text>
      )}
    </Pressable>
  );
}
