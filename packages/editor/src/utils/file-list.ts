/**
 * Build a FileList from an array of File objects.
 * PlaceholderPlugin.insert.media expects FileList (e.g. from input or drag), not File[].
 */
export function fileListFromFiles(files: File[]): FileList {
  const dt = new DataTransfer()
  for (const f of files) dt.items.add(f)
  return dt.files
}
