import { Redirect } from "expo-router";

// Root redirect; AuthGate in _layout will send the user to the right place
// once Firebase auth state resolves.
export default function Index() {
  return <Redirect href="/(auth)/role-select" />;
}
