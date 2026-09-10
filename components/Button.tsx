import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Colors, Radius } from "@/constants/Colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: ViewStyle;
  /** Maestro/E2E hook — forwarded to the underlying touchable. */
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  full = false,
  style,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      testID={testID}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        full && styles.full,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "primary" ? "#fff" : Colors.terra} />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    flexDirection: "row",
  },
  primary: {
    backgroundColor: Colors.terra,
  },
  secondary: {
    backgroundColor: Colors.aanganDeep,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.edge,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  size_sm: {
    height: 36,
    paddingHorizontal: 16,
  },
  size_md: {
    height: 48,
    paddingHorizontal: 24,
  },
  size_lg: {
    height: 56,
    paddingHorizontal: 32,
  },
  full: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  text_primary: {
    color: "#FFFFFF",
  },
  text_secondary: {
    color: "#FFFFFF",
  },
  text_outline: {
    color: Colors.charcoal,
  },
  text_ghost: {
    color: Colors.terra,
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 14,
  },
  textSize_lg: {
    fontSize: 15,
  },
});
