import { useRef } from "react";

// Unlike useRef(factory()), this does not repeat initialization work on renders.
// The inner ref can still be updated normally by the owning feature.
export function useLazyRef(factory) {
  const holder = useRef(null);
  if (holder.current === null) holder.current = { current: factory() };
  return holder.current;
}
