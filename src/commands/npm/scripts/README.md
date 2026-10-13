# npm Scripts

Adds missing `start` and `dev` scripts to `package.json`, based on the detected framework.

```bash
hlpr npm scripts [projectPath]
hlpr npm scripts --force
```

Existing scripts are kept unless `--force` is passed. Detected frameworks: Angular (`ng serve`), Create React App (`react-scripts start`), Vite (`vite`, `vite preview`). Anything else gets `node .`.
