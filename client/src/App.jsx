import { Routes, Route, Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          English Flashcard & Quiz
        </h1>
        <p className="text-gray-600 mb-8">
          Tạo bộ từ vựng, học bằng flashcard, làm quiz để ghi nhớ từ mới.
        </p>
        <Link
          to="/decks"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Bắt đầu học
        </Link>
      </div>
    </div>
  );
}

function DecksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-gray-900">
            Flashcard & Quiz
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Bộ từ vựng của bạn
        </h2>
        <p className="text-gray-500">
          Chưa có bộ từ nào. Tính năng sẽ được thêm ở Phase 1.
        </p>
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/decks" element={<DecksPage />} />
    </Routes>
  );
}

export default App;
