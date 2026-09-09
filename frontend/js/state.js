/**
 * Global State Management
 */
window.SatState = {
  selectedMode: 'single', // 'single' | 'bitemporal' | 'crossmodal'
  uploadedFiles: {
    single: null,
    date1: null,
    date2: null,
    optical: null,
    sar: null
  },
  previews: {},
  queryText: '',
  isProcessing: false,
  activeLayer: 'annotated',
  latestResult: null
};