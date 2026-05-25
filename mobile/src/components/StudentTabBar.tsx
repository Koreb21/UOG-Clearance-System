import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTheme } from "../modules/theme/ThemeContext";

export type StudentTabId = "overview" | "payments" | "inquiries" | "certificate";

type TabDef = { id: StudentTabId; label: string; icon: ComponentProps<typeof Ionicons>["name"] };

const TAB_DEFS: TabDef[] = [
  { id: "overview", label: "Overview", icon: "grid-outline" },
  { id: "payments", label: "Pay", icon: "wallet-outline" },
  { id: "inquiries", label: "Ask", icon: "chatbubbles-outline" },
  { id: "certificate", label: "QR", icon: "ribbon-outline" }
];

type Props = {
  active: StudentTabId;
  onChange: (tab: StudentTabId) => void;
};

export function StudentTabBar({ active, onChange }: Props) {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 420;

  return (
    <View style={[styles.wrap, compact && styles.wrapStack]}>
      {TAB_DEFS.map((tab) => {
        const selected = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={[
              styles.tab,
              compact && styles.tabFull,
              { backgroundColor: tokens.surfaceContainerLowest },
              selected && {
                borderColor: tokens.secondary,
                backgroundColor: tokens.secondaryContainer,
              },
            ]}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={selected ? tokens.onSecondaryContainer : tokens.onSurfaceVariant}
            />
            <Text style={[
              styles.label,
              { color: selected ? tokens.onSecondaryContainer : tokens.onSurfaceVariant },
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4
  },
  wrapStack: {
    flexDirection: "column"
  },
  tab: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(28,36,48,0.1)",
  },
  tabFull: {
    flexBasis: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 18
  },
  label: {
    fontSize: 12,
    fontWeight: "700"
  }
});
