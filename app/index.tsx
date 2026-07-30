import { Redirect } from "expo-router";

// Root redirect — lands on the app hub (6 tiles incl. ConnectDoctor) which
// doesn't require auth; AuthGate in _layout only gates the ConnectDoctor tile.
export default function Index() {
  return <Redirect href="/(hub)" />;
}
