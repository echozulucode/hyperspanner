import { PrimitiveGallery } from './pages/PrimitiveGallery';
import { AppShell } from './shell';
import { useHashRoute } from './hooks/useHashRoute';

/**
 * App root.
 *
 * Routes (hash-based — replaced by a real router once deep-links matter):
 *   #/gallery  → PrimitiveGallery (dev / design review)
 *   everything else → AppShell
 *
 * The Top Rail's GALLERY pill calls `onOpenGallery` which navigates to
 * "#/gallery"; the Gallery page links back to "#/" to return to the shell.
 */
export const App = () => {
  const [route, navigate] = useHashRoute();

  if (route === 'gallery') {
    return <PrimitiveGallery onBack={() => navigate('/')} />;
  }

  return <AppShell onOpenGallery={() => navigate('/gallery')} />;
};
