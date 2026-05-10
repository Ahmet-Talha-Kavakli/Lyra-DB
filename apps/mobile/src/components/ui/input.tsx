import { TextInput, View, Text, type TextInputProps } from 'react-native';
import { useState } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`gap-1.5 ${className}`}>
      {label && (
        <Text className="text-sm font-medium text-text-secondary">{label}</Text>
      )}
      <TextInput
        className={`rounded-2xl bg-surface-secondary px-4 py-3.5 text-base text-text-primary placeholder:text-text-muted ${
          isFocused ? 'border-2 border-brand-500' : 'border border-brand-800/30'
        } ${error ? 'border-accent-alert' : ''}`}
        placeholderTextColor="#6B5E8A"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && (
        <Text className="text-xs text-accent-alert">{error}</Text>
      )}
    </View>
  );
}
