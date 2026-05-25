import { MaterialIcons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../modules/theme/ThemeContext";

export type TabId = "overview" | "payments" | "inquiries" | "certificate";

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: "overview", icon: "dashboard", label: "Overview" },
  { id: "payments", icon: "payments", label: "Payments" },
  { id: "inquiries", icon: "help-outline", label: "Inquiries" },
  { id: "certificate", icon: "verified", label: "Certificate" },
];

type Props = { active: TabId; onChange: (id: TabId) => void };

export function BottomNav({ active, onChange }: Props) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.nav, { backgroundColor: tokens.surfaceContainerLow, borderTopColor: tokens.outlineVariant }]}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            style={[styles.tab, isActive && { backgroundColor: tokens.secondaryContainer }]}
            onPress={() => onChange(tab.id)}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={22}
              color={isActive ? tokens.onSecondaryContainer : tokens.onSurfaceVariant}
            />
            <Text style={[styles.label, isActive && { color: tokens.onSecondaryContainer, fontWeight: "700" }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 22 : 8,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 14,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 2,
  },
  label: { fontSize: 11, fontWeight: "500" },
});
