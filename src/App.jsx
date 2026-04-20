import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import PostListing from './pages/PostListing'
import ListingDetail from './pages/ListingDetail'
import MyListings from './pages/MyListings'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex flex-col h-screen bg-white dark:bg-black">
            <Navbar />
            <div className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/post" element={<div className="h-full overflow-y-auto"><PostListing /></div>} />
                <Route path="/listing/:id" element={<div className="h-full overflow-y-auto"><ListingDetail /></div>} />
                <Route path="/my-listings" element={<div className="h-full overflow-y-auto"><MyListings /></div>} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
