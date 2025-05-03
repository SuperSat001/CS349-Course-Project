import React, { createContext, useContext, useEffect, useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, StarOutline } from 'lucide-react';

// Context to hold history and favorites
const QueryHistoryContext = createContext();

export function QueryHistoryProvider({ children }) {
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('queryHistory') || '[]');
    const savedFavorites = JSON.parse(localStorage.getItem('queryFavorites') || '[]');
    setHistory(savedHistory);
    setFavorites(savedFavorites);
  }, []);

  // Persist on change
  useEffect(() => {
    localStorage.setItem('queryHistory', JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    localStorage.setItem('queryFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const addQuery = sql => {
    const timestamp = new Date().toISOString();
    setHistory(prev => [{ sql, timestamp }, ...prev]);
  };

  const toggleFavorite = sql => {
    setFavorites(prev =>
      prev.includes(sql) ? prev.filter(q => q !== sql) : [sql, ...prev]
    );
  };

  return (
    <QueryHistoryContext.Provider value={{ history, favorites, addQuery, toggleFavorite }}>
      {children}
    </QueryHistoryContext.Provider>
  );
}

// Hook to use the context
export function useQueryHistory() {
  return useContext(QueryHistoryContext);
}

// Sidebar component
export function QueryHistorySidebar({ onSelect }) {
  const { history, favorites, toggleFavorite } = useQueryHistory();

  return (
    <div className="w-64 bg-gray-50 p-4 overflow-y-auto">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Favorites</CardTitle>
        </CardHeader>
        <CardContent>
          {favorites.length ? (
            favorites.map(sql => (
              <div key={sql} className="flex items-center mb-2">
                <Button
                  variant="link"
                  className="flex-1 text-sm truncate text-left"
                  onClick={() => onSelect(sql)}
                >
                  {sql}
                </Button>
                <Star
                  className="w-4 h-4 cursor-pointer"
                  onClick={() => toggleFavorite(sql)}
                />
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">No favorites yet.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length ? (
            history.map(({ sql, timestamp }) => (
              <div key={timestamp + sql} className="flex items-center mb-2">
                <Button
                  variant="link"
                  className="flex-1 text-xs truncate text-left"
                  onClick={() => onSelect(sql)}
                >
                  {sql}
                </Button>
                {favorites.includes(sql) ? (
                  <Star
                    className="w-4 h-4 cursor-pointer text-yellow-500"
                    onClick={() => toggleFavorite(sql)}
                  />
                ) : (
                  <StarOutline
                    className="w-4 h-4 cursor-pointer"
                    onClick={() => toggleFavorite(sql)}
                  />
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">No queries run yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
