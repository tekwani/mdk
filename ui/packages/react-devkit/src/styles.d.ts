// Components import their stylesheet for its side effect; Vite compiles the
// SCSS separately (`build:scss`) and `strip-style-imports.mjs` drops these
// imports from the emitted JS. TypeScript 7 checks side-effect imports by
// default, so it needs to know they resolve.
declare module '*.scss'
