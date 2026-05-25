import { MaterialIcons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";

export type TabId = "overview" | "payments" | "inquiries" | "certificate";

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: "overview", icon: "dashboard", label: "Overview" },
  { id: "payments", icon: "payments", label: "Payments" },
  { id: "inquiries", icon: "help-outline", label: "Inquiries" },
  { id: "certificate", icon: "verified", label: "Certificate" },
];

type Props = { active: TabId; onChange: (id: TabId) => void };

export function BottomNav({ active, onChange }: Props) {
  return (
    <View style={styles.nav}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.id)}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={22}
              color={isActive ? tokens.onSecondaryContainer : tokens.onSurfaceVariant}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
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
    backgroundColor: "rgba(254,249,241,0.94)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
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
  tabActive: { backgroundColor: tokens.secondaryContainer },
  label: { fontSize: 11, color: tokens.onSurfaceVariant, fontWeight: "500" },
  labelActive: { color: tokens.onSecondaryContainer, fontWeight: "700" },
});
