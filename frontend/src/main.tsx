import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter } from 'react-router-dom'
import { store } from './store'
import { ColorModeProvider } from './theme/ColorModeProvider'
import App from './App'
import { apiErrorStatus } from './api/client'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Retry only transient failures (network, 5xx); a 4xx will not fix itself.
      retry: (failureCount, error) => {
        const status = apiErrorStatus(error)
        return failureCount < 2 && (status === undefined || status >= 500)
      },
      staleTime: 15000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ColorModeProvider>
          <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            autoHideDuration={3200}
          >
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SnackbarProvider>
        </ColorModeProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
)
