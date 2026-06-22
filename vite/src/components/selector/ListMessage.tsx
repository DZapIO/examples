/** Centered status line shown inside a selector list (loading / empty / error). */
const ListMessage = ({ children }: { children: string }) => (
  <p className="px-3 py-8 text-center text-sm text-gray-400">{children}</p>
);

export default ListMessage;
