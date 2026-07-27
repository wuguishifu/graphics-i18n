declare module '*.lpkg' {
  // Metro bundles .lpkg files as assets; require() yields an asset id.
  const assetId: number;
  export default assetId;
}
