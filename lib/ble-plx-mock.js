// Web mock for react-native-ble-plx — BLE not available on web
export const BleManager = class {
  state() { return Promise.resolve("PoweredOff"); }
  startDeviceScan() {}
  stopDeviceScan() {}
  connectedDevices() { return Promise.resolve([]); }
  destroy() {}
};
export const State = { PoweredOn: "PoweredOn", PoweredOff: "PoweredOff" };
