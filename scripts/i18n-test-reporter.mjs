export default async function* report(source) {
  for await (const event of source) {
    if (event.type === 'test:fail') yield `FAIL ${event.data.file ?? ''} :: ${event.data.name} :: ${String(event.data.details?.error?.message ?? '').split('\n')[0]}\n`;
    if (event.type === 'test:summary' && event.data.file === undefined) yield JSON.stringify(event.data) + '\n';
  }
}
