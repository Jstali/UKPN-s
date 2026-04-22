import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// React.StrictMode double-invokes every effect in dev, which doubles the
// memory pressure and fetch volume on a data-heavy app like this one.
// With 10k+ audit records and a 60s auto-refresh, that's enough to OOM
// the browser tab. StrictMode is a dev-only guard; production builds
// already ignore it, so nothing is lost in prod by removing it here.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
