import { Pressable, View, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";

interface Props {
  provider: "google" | "facebook";
  onPress: () => void;
  loading?: boolean;
  size?: number;
}

function GoogleIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.5 4.2-5.5 7.2-10.3 7.2-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.1-5.1C34.4 7.5 29.4 5.5 24 5.5 13.8 5.5 5.5 13.8 5.5 24S13.8 42.5 24 42.5 42.5 34.2 42.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <Path fill="#FF3D00" d="M7.7 14.7l5.9 4.3c1.6-3.8 5.4-6.5 9.8-6.5 2.8 0 5.4 1.1 7.3 2.8l5.1-5.1C34.4 7.5 29.4 5.5 24 5.5 16.4 5.5 9.8 9.7 7.7 14.7z"/>
      <Path fill="#4CAF50" d="M24 42.5c5.3 0 10.2-2 13.9-5.4l-6.4-5.3c-2 1.4-4.5 2.3-7.5 2.3-4.7 0-8.7-3-10.2-7.2l-5.9 4.5c2.1 5.1 8.8 11.1 16.1 11.1z"/>
      <Path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.7 2-2 3.7-3.7 4.9l6.4 5.3c-.4.4 6.5-4.7 6.5-13.8 0-1.2-.1-2.4-.4-3.5z"/>
    </Svg>
  );
}

function FacebookIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#1877F2" d="M24 4C12.95 4 4 12.95 4 24c0 9.98 7.31 18.25 16.86 19.75V29.78h-5.07V24h5.07v-4.4c0-5 2.98-7.78 7.55-7.78 2.18 0 4.46.39 4.46.39v4.92h-2.51c-2.48 0-3.25 1.54-3.25 3.12V24h5.53l-.88 5.78h-4.65V43.75C36.69 42.25 44 33.98 44 24c0-11.05-8.95-20-20-20z"/>
    </Svg>
  );
}

export function SocialIconButton({ provider, onPress, loading, size = 56 }: Props) {
  const isGoogle = provider === "google";
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e3e3e0",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {loading
        ? <ActivityIndicator color={isGoogle ? "#1976D2" : "#1877F2"} />
        : (
          <View style={{ width: size * 0.55, height: size * 0.55, alignItems: "center", justifyContent: "center" }}>
            {isGoogle ? <GoogleIcon size={size * 0.55} /> : <FacebookIcon size={size * 0.55} />}
          </View>
        )}
    </Pressable>
  );
}
