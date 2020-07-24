import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

const IndexPage = () => (
  <Layout>
    <SEO title="Home" />
    <h1>Home</h1>
    <Link to="/demo/" style={{display: 'inline-block', fontSize: '32px', marginBottom: '40px' }}>Go to demo</Link>
  </Layout>
)

export default IndexPage
