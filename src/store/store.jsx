import { configureStore } from '@reduxjs/toolkit'
import { boardApi } from './api'


export const store = configureStore({
  reducer: {
    [boardApi.reducerPath]: boardApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(boardApi.middleware),
})