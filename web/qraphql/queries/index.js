// segment(id: "gid://shopify/Segment/123") {
//     id
//     name
//     query
//   }
// , query: "query=name:everflow_linked"
export const CUSTOMER_SEGMENTS_GET_QUERY = `
  segments(first: $first, query: $query) {
    edges {
      cursor
      node {
        id
        name
        query
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
`
// gid://shopify/Segment/498139660578
// query {
//   segment(id: "gid://shopify/Segment/498139660578") {
//     id
//     name
//     query
//   }
// }
export const CUSTOMER_SEGMENT_GET_QUERY = `
query ($id: ID!) {
    segment(id: $id) {
      id
      name
      query
    }
  }
`