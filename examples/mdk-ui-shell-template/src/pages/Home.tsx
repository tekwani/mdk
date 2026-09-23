import { PageLayout } from '../components/PageLayout'
import { APP_NAME } from '../constants/env'

/**
 * The bare shell's landing page. A fresh app has no feature pages yet — this
 * placeholder confirms auth + the app frame work and points at how real pages
 * get added. Replace or remove it once you have wired your own.
 */
const Home = () => (
  <PageLayout title="Home" className="mdk-ui-shell-home">
    <section className="mdk-ui-shell-home__card">
      <h2 className="mdk-ui-shell-home__title">Welcome to {APP_NAME}</h2>
      <p className="mdk-ui-shell-home__lead">
        You are signed in and the app frame is running. This shell ships as a bare
        backbone — authentication, the header, and the sidebar — with no feature
        pages yet.
      </p>
      <p className="mdk-ui-shell-home__lead">Add a page in three steps:</p>
      <pre className="mdk-ui-shell-home__code">
        <code>
          1. add the component to src/pages/{'\n'}
          2. add a one-line entry to src/routes.ts{'\n'}
          3. add its icon to src/constants/navigation.tsx
        </code>
      </pre>
      <p className="mdk-ui-shell-home__hint">
        The reference pages ship under
        {' '}
        <code>_managed/pages/</code>
        {' '}
        — copy one into
        {' '}
        <code>src/pages/</code>
        {' '}
        to start from a working example.
      </p>
    </section>
  </PageLayout>
)

export default Home
