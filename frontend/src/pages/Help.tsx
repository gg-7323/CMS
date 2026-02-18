export default function Help(){
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-lg border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 text-lg font-semibold">Help</h2>
        <ul className="list-disc pl-6 text-sm leading-6 text-gray-700 dark:text-neutral-300">
          <li>Use the Tab Bar for quick actions (Save, Save As, Save Secured).</li>
          <li>Drag-and-drop images into the editor to upload and insert.</li>
          <li>Press Ctrl+K to insert a link, Ctrl+B for bold, Ctrl+I for italic.</li>
          <li>When offline, edits are stored locally and sync when back online.</li>
        </ul>
      </section>
    </div>
  )
}
