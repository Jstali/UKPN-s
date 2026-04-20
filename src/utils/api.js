// Backward-compatible re-export layer.
// All real logic has moved to src/services/apiService.js.
// Existing imports (AppContext, DtcFilterDropdown, etc.) continue to work unchanged.

export { fetchDropdownValues, fetchFlows, fetchDtcSubscriptions } from '../services/apiService';
export { default } from '../services/apiService';
