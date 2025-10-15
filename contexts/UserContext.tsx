// Re-export the canonical UserContext from `src/contexts/UserContext` to avoid
// duplicate context definitions (some files import from `../contexts/UserContext`
// while others import from `../src/contexts/UserContext`). Having two different
// context modules causes `useUser` to be called outside the provider. Forward
// everything from the single source-of-truth implementation to ensure all
// imports resolve to the same context/provider.

export * from '../src/contexts/UserContext';

