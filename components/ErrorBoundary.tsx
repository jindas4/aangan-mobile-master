// App-wide error boundary — a render crash anywhere below shows a branded
// recovery screen instead of a white screen, and the error reaches Sentry.
import * as Sentry from "@sentry/react-native";
import { Component, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, Fonts } from "@/constants/Colors";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.sub}>
          Our team has been notified. Your bookings and payments are safe.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.reset} activeOpacity={0.85}>
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
    padding: 32,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: "800",
    color: Colors.charcoal,
    marginBottom: 10,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    color: Colors.charcoal2,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: Colors.terra,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
