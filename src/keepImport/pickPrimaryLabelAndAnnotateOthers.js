export function pickPrimaryLabelAndAnnotateOthers(labels, content) {
  const [primaryLabel, ...otherLabels] = labels;
  if (otherLabels.length === 0) {
    return { primaryLabel, content };
  }
  return {
    primaryLabel,
    content: `〔原標籤：${otherLabels.join(', ')}〕\n${content}`,
  };
}
