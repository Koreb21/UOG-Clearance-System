import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../modules/theme/ThemeContext";

type Props = { title?: string };

export function AppBar({ title = "Clearance Portal" }: Props) {
  const { tokens, mode, toggle } = useTheme();

  const gradStart = mode === "dark" ? tokens.primaryContainer : "#000511";
  const gradEnd = mode === "dark" ? tokens.primary : "#006a63";

  return (
    <LinearGradient
      colors={[gradStart, gradEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.bar}
    >
      <View style={styles.left}>
        <View style={styles.logoCircle}>
          <MaterialIcons name="school" size={18} color="#fff" />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.right}>
        <Pressable onPress={toggle} style={styles.themeBtn} hitSlop={8}>
          <MaterialIcons
            name={mode === "dark" ? "light-mode" : "dark-mode"}
            size={24}
            color="#fff"
          />
        </Pressable>
        <MaterialIcons name="account-circle" size={28} color="#fff" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: Platform.OS === "ios" ? 88 : 64,
    paddingTop: Platform.OS === "ios" ? 44 : 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
