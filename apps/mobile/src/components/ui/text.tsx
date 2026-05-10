import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'label';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<TextVariant, string> = {
  h1: 'text-4xl font-bold text-text-primary',
  h2: 'text-2xl font-bold text-text-primary',
  h3: 'text-xl font-semibold text-text-primary',
  body: 'text-base text-text-primary',
  bodySmall: 'text-sm text-text-secondary',
  caption: 'text-xs text-text-muted',
  label: 'text-sm font-medium text-text-secondary uppercase tracking-wider',
};

export function Text({ variant = 'body', className = '', children, ...props }: TextProps) {
  return (
    <RNText className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </RNText>
  );
}
