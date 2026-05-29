import { useEffect, useMemo, useRef, useState } from "react";
import { createNote, deleteNote, listNotes, updateNote } from "../api/notesApi";

const topicPresets = ["DSA", "DBMS", "OS", "CN", "Aptitude"];

const NotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [editor, setEditor] = useState({
    id: null,
    title: "",
    content: "",
    topic: "General",
    tags: "",
    isPinned: false,
  });
  const textareaRef = useRef(null);

  const loadNotes = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listNotes({ q: search || undefined, topic: topicFilter || undefined, sort });
      setNotes(data.notes || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [search, topicFilter, sort]);

  const pinnedNotes = useMemo(() => notes.filter((note) => note.isPinned), [notes]);
  const recentNotes = useMemo(() => notes.slice(0, 5), [notes]);

  const insertSyntax = (syntax) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = editor.content;
    const nextValue = value.slice(0, start) + syntax + value.slice(end);
    setEditor((current) => ({ ...current, content: nextValue }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + syntax.length;
    }, 0);
  };

  const handleSave = async () => {
    setError("");
    const payload = {
      title: editor.title,
      content: editor.content,
      topic: editor.topic,
      tags: editor.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      isPinned: editor.isPinned,
    };

    try {
      if (editor.id) {
        await updateNote(editor.id, payload);
      } else {
        await createNote(payload);
      }
      setEditor({ id: null, title: "", content: "", topic: "General", tags: "", isPinned: false });
      await loadNotes();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save note");
    }
  };

  const handleEdit = (note) => {
    setEditor({
      id: note._id,
      title: note.title,
      content: note.content,
      topic: note.topic,
      tags: (note.tags || []).join(", "),
      isPinned: note.isPinned,
    });
  };

  const handleDelete = async (id) => {
    setError("");
    try {
      await deleteNote(id);
      await loadNotes();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete note");
    }
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Notes</p>
          <h1>Study notes</h1>
          <p className="subcopy">Capture key ideas, snippets, and references.</p>
        </div>
      </header>

      {error ? <div className="dashboard-alert">{error}</div> : null}

      <section className="dashboard-grid two-col">
        <div className="dashboard-card notes-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">Notes list</p>
              <h2>All notes</h2>
            </div>
          </div>
          <div className="notes-controls">
            <input type="search" placeholder="Search notes" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
              <option value="">All topics</option>
              {topicPresets.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="updatedAt">Recently updated</option>
              <option value="createdAt">Recently created</option>
            </select>
          </div>
          {loading ? <div>Loading notes...</div> : null}
          {!loading ? (
            <ul className="notes-list">
              {notes.map((note) => (
                <li key={note._id} className="note-item">
                  <div>
                    <strong>{note.title}</strong>
                    <span>{note.topic}</span>
                  </div>
                  <div className="note-actions">
                    <button type="button" className="secondary-button" onClick={() => handleEdit(note)}>
                      Edit
                    </button>
                    <button type="button" className="secondary-button" onClick={() => handleDelete(note._id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="dashboard-card notes-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">Editor</p>
              <h2>{editor.id ? "Edit note" : "Create note"}</h2>
            </div>
          </div>
          <div className="editor-toolbar">
            <button type="button" onClick={() => insertSyntax("# ")}>H1</button>
            <button type="button" onClick={() => insertSyntax("## ")}>H2</button>
            <button type="button" onClick={() => insertSyntax("- ")}>List</button>
            <button type="button" onClick={() => insertSyntax("``\ncode\n``")}>Code</button>
            <button type="button" onClick={() => insertSyntax("[text](url)")}>Link</button>
          </div>
          <label>
            Title
            <input value={editor.title} onChange={(event) => setEditor((c) => ({ ...c, title: event.target.value }))} />
          </label>
          <label>
            Topic
            <input value={editor.topic} onChange={(event) => setEditor((c) => ({ ...c, topic: event.target.value }))} />
          </label>
          <label>
            Tags (comma separated)
            <input value={editor.tags} onChange={(event) => setEditor((c) => ({ ...c, tags: event.target.value }))} />
          </label>
          <label>
            Content
            <textarea ref={textareaRef} value={editor.content} onChange={(event) => setEditor((c) => ({ ...c, content: event.target.value }))} rows={10} />
          </label>
          <label className="inline-toggle">
            <input type="checkbox" checked={editor.isPinned} onChange={(event) => setEditor((c) => ({ ...c, isPinned: event.target.checked }))} />
            Pin note
          </label>
          <button type="button" className="primary-button" onClick={handleSave}>
            {editor.id ? "Update note" : "Save note"}
          </button>
        </div>
      </section>

      <section className="dashboard-grid two-col">
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Pinned notes</p>
              <h2>Quick access</h2>
            </div>
          </div>
          {pinnedNotes.length === 0 ? (
            <p className="subcopy">Pin important notes to keep them here.</p>
          ) : (
            <ul className="notes-list compact">
              {pinnedNotes.map((note) => (
                <li key={note._id}>{note.title}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Recent notes</p>
              <h2>Latest additions</h2>
            </div>
          </div>
          {recentNotes.length === 0 ? (
            <p className="subcopy">Start writing notes to build your library.</p>
          ) : (
            <ul className="notes-list compact">
              {recentNotes.map((note) => (
                <li key={note._id}>{note.title}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default NotesPage;
