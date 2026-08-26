export function splitLabel(label) {
  const dashIndex = label.indexOf('-');
  if (dashIndex === -1) {
    return { subTag1: label, subTag2: '' };
  }
  return {
    subTag1: label.slice(0, dashIndex),
    subTag2: label.slice(dashIndex + 1),
  };
}
