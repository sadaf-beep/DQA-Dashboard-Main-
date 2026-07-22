// Date.now().toString() (or `${prefix}-${Date.now()}`) collides whenever two
// IDs get generated in the same millisecond - easy to hit with batch actions
// (e.g. parsing hundreds of inventory rows in a loop) or two people acting
// at once. crypto.randomUUID() is globally unique regardless of timing.
export const generateId = (prefix?: string): string => {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
};
