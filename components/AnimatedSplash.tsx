import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { Colors, Fonts } from "@/constants/Colors";

const { width } = Dimensions.get("window");

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.6)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(15)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Phase 1: Logo appears with spring bounce
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      // Phase 2: Rings pulse outward
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1.8, duration: 800, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(ring2Opacity, { toValue: 0.2, duration: 300, useNativeDriver: true }),
          Animated.timing(ring2Scale, { toValue: 2.4, duration: 600, useNativeDriver: true }),
        ]),
      ]),

      // Phase 3: Brand name slides in
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(nameY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(ring2Opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),

      // Phase 4: Tagline appears
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(taglineY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),

      // Hold for a moment
      Animated.delay(600),

      // Phase 5: Everything fades out
      Animated.timing(fadeOut, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-10deg", "0deg"],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      {/* Animated rings */}
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          styles.ring2,
          {
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={{
          transform: [{ scale: logoScale }, { rotate: spin }],
        }}
      >
        <Image
          source={require("@/assets/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Brand name */}
      <Animated.Text
        style={[
          styles.brandName,
          {
            opacity: nameOpacity,
            transform: [{ translateY: nameY }],
          },
        ]}
      >
        Aangan
      </Animated.Text>

      {/* Tagline */}
      <Animated.View
        style={{
          opacity: taglineOpacity,
          transform: [{ translateY: taglineY }],
        }}
      >
        <Text style={styles.taglineHindi}>हर दरवाज़ा खुला, हर अतिथि अपना</Text>
        <Text style={styles.taglineEn}>Every door open, every guest our own</Text>
      </Animated.View>
    </Animated.View>
  );
}

const RING_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.cream,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  ring: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.terra,
  },
  ring2: {
    borderColor: Colors.gold,
  },
  logo: {
    width: 148,
    height: 148,
  },
  brandName: {
    fontFamily: Fonts.display,
    fontSize: 36,
    fontWeight: "800",
    color: Colors.charcoal,
    letterSpacing: -0.5,
    marginTop: 16,
  },
  taglineHindi: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.terra,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
  },
  taglineEn: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.charcoal2,
    textAlign: "center",
    marginTop: 4,
  },
});
