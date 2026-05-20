import { TextInput, View, Text, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightAdornment?: React.ReactNode;
}

export function Input({ label, error, rightAdornment, className, ...props }: InputProps) {
  return (
    <View className="gap-1">
      {label && (
        <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
          {label}
        </Text>
      )}
      <View className={["border border-line rounded-lg bg-paper px-3 py-2.5 flex-row items-center gap-2", error ? "border-danger" : ""].join(" ")}>
        <TextInput
          className="flex-1 text-sm text-ink"
          placeholderTextColor="#b5b5b5"
          {...props}
        />
        {rightAdornment}
      </View>
      {error && <Text className="text-xs text-danger">{error}</Text>}
    </View>
  );
}
