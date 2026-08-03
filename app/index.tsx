import { Redirect } from "expo-router";

// Root redirect; AuthGate in _layout will send the user to the right place
// once Firebase auth state resolves. The (hub) screen (other tuandv.id.vn
// apps) is reachable from the user menu, not the landing route.
export default function Index() {
  return <Redirect href="/(auth)/role-select" />;
}
