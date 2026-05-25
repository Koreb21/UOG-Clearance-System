import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";

type Props = { title?: string };

export function AppBar({ title = "Clearance Portal" }: Props) {
  return (
    <LinearGradient
      colors={["#000511", "#006a63"]}
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
      <MaterialIcons name="account-circle" size={28} color="#fff" />
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
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
