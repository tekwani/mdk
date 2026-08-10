import { PageLayout } from '../components/PageLayout'
import { APP_NAME } from '../constants/env'

/**
 * The bare shell's landing page. A fresh app has no feature pages yet — this
 * placeholder confirms auth + the app frame work and points at the command that
 * adds real pages. Replace or remove it once you have wired your own.
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
      <p className="mdk-ui-shell-home__lead">Add a page from the command line:</p>
      <pre className="mdk-ui-shell-home__code">
        <code>
          mdk-ui add page Dashboard{'\n'}
          mdk-ui add page &lt;Component&gt;
        </code>
      </pre>
      <p className="mdk-ui-shell-home__hint">
        Each added page registers its own route and sidebar entry. Run
        {' '}
        <code>mdk-ui add page --help</code>
        {' '}
        to see the options.
      </p>
    </section>
  </PageLayout>
)

export default Home
