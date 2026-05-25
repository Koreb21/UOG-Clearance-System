import type { ReactNode } from "react";
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "../modules/theme/ThemeContext";

type ScreenContainerProps = {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function ScreenContainer({ children, refreshing, onRefresh }: ScreenContainerProps) {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const isTabletLike = width >= 768;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={tokens.secondary} />
          ) : undefined
        }
      >
        <View style={[styles.inner, isTabletLike && styles.innerWide]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  inner: {
    padding: 18,
    gap: 16,
  },
  innerWide: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
});
