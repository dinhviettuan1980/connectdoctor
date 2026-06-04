import { createContext, useContext, useState } from 'react';

const HeaderSlotContext = createContext(null);

export function HeaderSlotProvider({ children }) {
  const [slot, setSlot] = useState(null);
  return (
    <HeaderSlotContext.Provider value={{ slot, setSlot }}>
      {children}
    </HeaderSlotContext.Provider>
  );
}

export function useHeaderSlot() {
  return useContext(HeaderSlotContext);
}
