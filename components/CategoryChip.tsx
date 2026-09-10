import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius } from "@/constants/Colors";

const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "All", icon: "grid-outline" },
  { key: "mountain", label: "Mountains", icon: "trail-sign-outline" },
  { key: "beach", label: "Beach", icon: "umbrella-outline" },
  { key: "city", label: "City", icon: "business-outline" },
  { key: "forest", label: "Forest", icon: "leaf-outline" },
  { key: "lake", label: "Lake", icon: "water-outline" },
  { key: "desert", label: "Desert", icon: "sunny-outline" },
  { key: "backwater", label: "Backwater", icon: "boat-outline" },
  { key: "heritage", label: "Heritage", icon: "library-outline" },
];

export { CATEGORIES };

interface Props {
  category: string;
  active: boolean;
  onPress: () => void;
}

export function CategoryChip({ category, active, onPress }: Props) {
  const cat = CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Ionicons
        name={cat.icon}
        size={16}
        color={active ? Colors.terra : Colors.charcoal2}
      />
      <Text style={[styles.label, active && styles.labelActive]}>{cat.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.paper,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.warmBg,
    borderColor: Colors.terra,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.charcoal2,
  },
  labelActive: {
    color: Colors.terra,
  },
});
