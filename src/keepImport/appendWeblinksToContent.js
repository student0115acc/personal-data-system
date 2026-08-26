export function appendWeblinksToContent(content, annotations) {
  if (annotations.length === 0) {
    return content;
  }
  const links = annotations
    .map((a) => `<a href="${a.url}">${a.title}</a>`)
    .join('\n');
  return `${content}\n${links}`;
}
