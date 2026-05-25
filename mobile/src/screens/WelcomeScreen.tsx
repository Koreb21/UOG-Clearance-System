import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = { onGetStarted: () => void };

export function WelcomeScreen({ onGetStarted }: Props) {
  return (
    <LinearGradient
      colors={["#001e40", "#0c5c54", "#0f766e"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Ambient glow blobs */}
      <View style={[styles.glow, { top: -80, left: -80, width: 320, height: 320 }]} />
      <View style={[styles.glow, { top: "35%", left: "10%", width: 400, height: 400, opacity: 0.18 }]} />
      <View style={[styles.glow, { bottom: -100, right: -80, width: 380, height: 380, opacity: 0.22 }]} />

      {/* Branding */}
      <View style={styles.brand}>
        <View style={styles.logoWrap}>
          <View style={styles.logoGlow} />
          <View style={styles.logoBox}>
            <Ionicons name="school" size={38} color="#fff" />
          </View>
        </View>
        <Text style={styles.eyebrow}>University of Gondar</Text>
      </View>

      {/* Headline */}
      <View style={styles.center}>
        <Text style={styles.headline}>Student Clearance{"\n"}Portal</Text>
        <Text style={styles.subtitle}>
          Track your clearance, pay liabilities, and get your QR certificate — without visiting offices.
        </Text>
      </View>

      {/* CTA */}
      <View style={styles.bottom}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
          onPress={onGetStarted}
        >
          <Text style={styles.ctaText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </Pressable>

        {/* Dots */}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 52,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "#0f766e",
    opacity: 0.32,
  },
  brand: { alignItems: "center", gap: 14, zIndex: 1 },
  logoWrap: { alignItems: "center", justifyContent: "center" },
  logoGlow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  center: { alignItems: "center", gap: 18, paddingHorizontal: 8, zIndex: 1 },
  headline: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 23,
    fontWeight: "400",
  },
  bottom: { width: "100%", alignItems: "center", gap: 24, zIndex: 1 },
  cta: {
    width: "100%",
    height: 64,
    backgroundColor: "#0f766e",
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 6, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)" },
  dotActive: { width: 28, backgroundColor: "#fff" },
});
