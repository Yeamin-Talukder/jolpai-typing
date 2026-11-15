// Which kind of device a test is typed on, so phone and computer results
// are kept apart: a phone's on-screen keyboard is a different skill.
export type Device = 'desktop' | 'mobile';

export function deviceKind(): Device {
  const uaMobile = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile;
  if (uaMobile === true) return 'mobile';
  // tablets report mobile: false, but have a touch screen and no mouse
  return matchMedia('(pointer: coarse) and (hover: none)').matches ? 'mobile' : 'desktop';
}

/** Results saved before devices were recorded were typed on computers. */
export const deviceOf = (e: { dev?: Device }): Device => e.dev ?? 'desktop';

export const DEVICE_NAME: Record<Device, string> = { desktop: 'computer', mobile: 'mobile' };
