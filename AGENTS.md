# Architecture decisions

- Retry failed lazy page imports and wrap route rendering in a shared error boundary, so transient module fetch failures recover without leaving users on a blank screen.