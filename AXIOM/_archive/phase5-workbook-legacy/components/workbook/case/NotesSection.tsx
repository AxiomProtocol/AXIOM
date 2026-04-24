import React, { useState, useEffect } from 'react';

interface NotesSectionProps {
  caseId: string;
}

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function NotesSection({ caseId }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState({ title: '', content: '' });

  useEffect(() => {
    if (!caseId) return;
    fetchNotes();
  }, [caseId]);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/workbook/notes?caseId=${caseId}`);
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    try {
      const res = await fetch(`/api/workbook/notes?caseId=${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Note', content: '' }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes([data.note, ...notes]);
        setSelectedNote(data.note);
        setIsEditing(true);
        setEditContent({ title: data.note.title, content: data.note.content });
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const saveNote = async () => {
    if (!selectedNote) return;

    try {
      const res = await fetch(`/api/workbook/notes?caseId=${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedNote.id, ...editContent }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes(notes.map(n => n.id === selectedNote.id ? data.note : n));
        setSelectedNote(data.note);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const deleteNote = async (noteId: number) => {
    if (!confirm('Delete this note?')) return;

    try {
      await fetch(`/api/workbook/notes?caseId=${caseId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId }),
      });

      setNotes(notes.filter(n => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl border p-4 sticky top-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Notes</h2>
            <button
              onClick={createNote}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              + New
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-3xl block mb-2">📝</span>
              <p className="text-sm">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => {
                    setSelectedNote(note);
                    setIsEditing(false);
                    setEditContent({ title: note.title, content: note.content });
                  }}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedNote?.id === note.id
                      ? 'bg-amber-100 border-amber-300 border'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-gray-900 truncate">{note.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedNote ? (
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              {isEditing ? (
                <input
                  type="text"
                  value={editContent.title}
                  onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
                  className="text-xl font-semibold bg-transparent border-b border-amber-300 focus:outline-none focus:border-amber-500 flex-1 mr-4"
                />
              ) : (
                <h2 className="text-xl font-semibold text-gray-900">{selectedNote.title}</h2>
              )}
              
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveNote}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNote(selectedNote.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={editContent.content}
                onChange={(e) => setEditContent({ ...editContent, content: e.target.value })}
                className="w-full h-96 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Write your research notes here..."
              />
            ) : (
              <div className="prose max-w-none">
                {selectedNote.content ? (
                  <pre className="whitespace-pre-wrap font-sans text-gray-700">{selectedNote.content}</pre>
                ) : (
                  <p className="text-gray-400 italic">No content. Click Edit to add notes.</p>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t text-sm text-gray-500">
              Last updated: {new Date(selectedNote.updated_at).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border p-12 text-center">
            <span className="text-4xl block mb-4">📝</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Select or Create a Note</h3>
            <p className="text-gray-600 mb-4">Document your research findings, sources, and insights</p>
            <button
              onClick={createNote}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Create First Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
