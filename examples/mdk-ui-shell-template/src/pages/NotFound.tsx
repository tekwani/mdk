import { Link } from 'react-router'

import { ROUTE_PATHS } from '../constants/routes'

const NotFound = () => (
  <div style={{ padding: '4rem', textAlign: 'center' }}>
    <h1>404</h1>
    <p>This page does not exist.</p>
    <Link to={ROUTE_PATHS.HOME}>Back home</Link>
  </div>
)

export default NotFound
