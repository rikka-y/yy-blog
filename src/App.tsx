import { HashRouter, Routes, Route } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PostsProvider } from '@/data/PostsContext';
import { ProfileProvider } from '@/data/ProfileContext';
import { LandingPage } from '@/pages/LandingPage';
import { HomePage } from '@/pages/HomePage';
import { PostPage } from '@/pages/PostPage';
import { AboutPage } from '@/pages/AboutPage';
import { AdminPage } from '@/pages/AdminPage';

function App() {
  return (
    <HashRouter>
      <PostsProvider>
        <ProfileProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/posts" element={<HomePage />} />
                <Route path="/post/:id" element={<PostPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ProfileProvider>
      </PostsProvider>
    </HashRouter>
  );
}

export default App;
