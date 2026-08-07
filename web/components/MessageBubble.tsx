export function MessageBubble({ text }: { text: string }) {
  return (
    <div className="rounded-lg bg-white px-4 py-3 text-gray-900 shadow-sm ring-1 ring-gray-200">
      {text}
    </div>
  );
}